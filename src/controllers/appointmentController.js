
const db = require('../config/database');
const calendarService = require('../services/calendarService');
const slotService = require('../services/slotService');
const logger = require('../utils/logger');
const EmailService = require('../services/emailService');

// Helper to extract hospital_id from request (priority: token -> body -> query)
const getHospitalId = (req) => {
    const fromToken = req.hospitalId || (req.user && req.user.hospital_id);
    if (fromToken) return fromToken;
    const fromBody = req.body?.hospital_id;
    if (fromBody) return parseInt(fromBody) || null;
    const fromQuery = req.query?.hospital_id;
    if (fromQuery) return parseInt(fromQuery) || null;
    return null;
};

// ─── Internal helper for outbound calls (shared by cron and direct endpoint) ───




// ─── Phone formatter (add this somewhere above _triggerOutboundCall) ───
function formatPhoneNumber(phone) {
    if (!phone) return phone;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return '+' + cleaned;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return '+' + cleaned;
    }
    if (cleaned.length === 10) {
        // Default to US (+1) – change to '+91' if all your numbers are Indian
        return '+1' + cleaned;
    }
    if (phone.startsWith('+')) {
        return '+' + cleaned;
    }
    return '+' + cleaned; // fallback
}

// ─── Internal helper for outbound calls ──────────────────────────────────
async function _triggerOutboundCall(callData) {
    // Format the phone number to E.164 before sending to Vapi
    const formattedNumber = formatPhoneNumber(callData.phoneNumber);
    logger.info(`📞 Formatting phone: ${callData.phoneNumber} → ${formattedNumber}`);

    const vapiPayload = {
        assistantId: process.env.VAPI_FEEDBACK_ASSISTANT_ID,
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: { number: formattedNumber },
        assistantOverrides: {
            variableValues: {
                appointment_id: callData.appointmentId,
                patient_name: callData.patientName,
                pet_name: callData.petName,
                appointment_type: callData.appointmentType,
                appointment_date: callData.appointmentDate,
                appointment_time: callData.appointmentTime
            }
        }
    };

    const response = await fetch(`${process.env.VAPI_API_BASE_URL}/call/phone`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(vapiPayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
    }

    const result = await response.json();
    return { success: true, data: result };
}

// ─── EXPORTED CONTROLLER FUNCTIONS ─────────────────────────────────────────────

/**
 * Book a new appointment (admin or AI with API key)
 * POST /api/admin/appointments
 */
exports.bookAppointment = async (req, res, next) => {
    let connection;
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                message: 'No hospital associated with this request. Please provide hospital_id.'
            });
        }

        const {
            patient_name,
            phone,
            email,
            is_new_patient,
            patient_id,        // will be treated as pet_owner_id if provided
            pet_name,
            pet_species,
            pet_breed,
            pet_gender,
            pet_age,
            appointment_type,
            date,
            time,
            call_sid
        } = req.body;

        if (!patient_name || !phone || !appointment_type || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: patient_name, phone, appointment_type, date, time'
            });
        }

        const validTypes = ['vaccination', 'consultation', 'follow-up', 'surgery'];
        if (!validTypes.includes(appointment_type.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid appointment type. Valid types: ${validTypes.join(', ')}`
            });
        }

        // Check slot availability
        const isAvailable = await slotService.isSlotAvailable(
            date,
            time,
            appointment_type.toLowerCase(),
            hospitalId
        );
        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: 'This time slot is no longer available. Please choose another time.'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // ─── Step 1: Find or create pet owner ──────────────────────────────────
        let petOwnerId = patient_id || null;
        let petId = null;

        if (is_new_patient || !petOwnerId) {
            // Look up by phone
            const ownerResult = await connection.execute(
                `SELECT id FROM ezy_vet_pet_owner WHERE phone = $1 AND hospital_id = $2`,
                [phone, hospitalId]
            );
            if (ownerResult.rows && ownerResult.rows.length > 0) {
                petOwnerId = ownerResult.rows[0].id;
                logger.info(`Using existing pet owner: ID ${petOwnerId}`);
            } else {
                // Create new pet owner
                const insertOwner = await connection.execute(
                    `INSERT INTO ezy_vet_pet_owner (name, phone, email, hospital_id, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())
                     RETURNING id`,
                    [patient_name, phone, email || null, hospitalId]
                );
                petOwnerId = insertOwner.rows[0].id;
                logger.info(`New pet owner created: ID ${petOwnerId}`);
            }
        } else {
            // Update existing owner
            await connection.execute(
                `UPDATE ezy_vet_pet_owner
                 SET name = $1,
                     email = COALESCE($2, email),
                     updated_at = NOW()
                 WHERE id = $3 AND hospital_id = $4`,
                [patient_name, email, petOwnerId, hospitalId]
            );
            logger.info(`Pet owner updated: ID ${petOwnerId}`);
        }

        // ─── Step 2: Find or create pet ──────────────────────────────────────
        if (pet_name) {
            // Try to find pet by owner and name
            const petResult = await connection.execute(
                `SELECT id FROM ezy_vet_pets
                 WHERE pet_owner_id = $1 AND pet_name = $2 AND hospital_id = $3`,
                [petOwnerId, pet_name, hospitalId]
            );
            if (petResult.rows && petResult.rows.length > 0) {
                petId = petResult.rows[0].id;
                // Update pet info if needed
                await connection.execute(
                    `UPDATE ezy_vet_pets
                     SET pet_species = COALESCE($1, pet_species),
                         pet_breed = COALESCE($2, pet_breed),
                         pet_sex = COALESCE($3, pet_sex),
                         updated_at = NOW()
                     WHERE id = $4`,
                    [pet_species || null, pet_breed || null, pet_gender || null, petId]
                );
                logger.info(`Using existing pet: ID ${petId}`);
            } else {
                // Create new pet
                const insertPet = await connection.execute(
                    `INSERT INTO ezy_vet_pets
                        (pet_owner_id, pet_name, pet_species, pet_breed, pet_sex, hospital_id, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                     RETURNING id`,
                    [petOwnerId, pet_name, pet_species || null, pet_breed || null, pet_gender || null, hospitalId]
                );
                petId = insertPet.rows[0].id;
                logger.info(`New pet created: ID ${petId}`);
            }
        }

        // ─── Step 3: Create Google Calendar event ────────────────────────────
        let googleEventId = null;
        try {
            const calendarResult = await calendarService.createEvent({
                patient_name,
                phone,
                pet_name: pet_name || 'N/A',
                pet_species: pet_species || 'N/A',
                pet_breed: pet_breed || 'N/A',
                appointment_type,
                date,
                time
            }, hospitalId);
            googleEventId = calendarResult.eventId;
            logger.info(`Google Calendar event created: ${googleEventId}`);
        } catch (calendarError) {
            logger.error('Google Calendar error:', calendarError);
        }

        // ─── Step 4: Insert appointment ───────────────────────────────────────
        const [appointmentResult] = await connection.execute(
            `INSERT INTO ezy_vet_appointments
             (pet_owner_id, pet_id, google_event_id, appointment_type, date, time,
              status, notes, call_sid, hospital_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8, $9, NOW(), NOW())
             RETURNING id`,
            [
                petOwnerId,
                petId,
                googleEventId,
                appointment_type.toLowerCase(),
                date,
                time,
                `Booked via VAPI AI Assistant - ${pet_name || 'N/A'}`,
                call_sid || null,
                hospitalId
            ]
        );

        const appointmentId = appointmentResult.rows[0].id;
        logger.info(`Appointment created: ID ${appointmentId}`);

        await connection.commit();

        // ─── Send confirmation email ──────────────────────────────────────────
        try {
            let patientEmail = email;
            if (!patientEmail && petOwnerId) {
                const [ownerRows] = await connection.execute(
                    `SELECT email FROM ezy_vet_pet_owner WHERE id = $1`,
                    [petOwnerId]
                );
                patientEmail = ownerRows.rows[0]?.email;
            }
            if (patientEmail) {
                await EmailService.sendAppointmentConfirmationEmail({
                    toEmail: patientEmail,
                    patientName: patient_name,
                    petName: pet_name,
                    appointmentType: appointment_type,
                    appointmentDate: date,
                    appointmentTime: time,
                    callSid: call_sid,
                    appointmentId: appointmentId
                });
                logger.info(`Confirmation email sent to patient: ${patientEmail}`);
            } else {
                logger.info(`No email address for pet owner ID ${petOwnerId}, skipping confirmation email`);
            }
        } catch (emailErr) {
            logger.error('Error sending confirmation email to patient:', emailErr);
        }

        return res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: {
                appointment_id: appointmentId,
                pet_owner_id: petOwnerId,
                pet_id: petId,
                google_event_id: googleEventId,
                appointment: {
                    patient_name,
                    pet_name: pet_name || 'N/A',
                    appointment_type: appointment_type.toLowerCase(),
                    date,
                    time
                }
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Error booking appointment:', error);
        next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Get patient's upcoming appointments (public, no admin filter needed)
 * POST /api/appointments/lookup - Body: { phone }
 * GET /api/appointments?phone=+12125551234
 */
exports.getPatientAppointments = async (req, res, next) => {
    try {
        const phone = (req.body.phone || req.query.phone || '').trim();
        const hospitalId = getHospitalId(req);

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required'
            });
        }

        const query = `
            SELECT a.*,
                   po.name as patient_name,
                   p.pet_name,
                   p.pet_species,
                   p.pet_breed
            FROM ezy_vet_appointments a
            JOIN ezy_vet_pet_owner po ON a.pet_owner_id = po.id
            LEFT JOIN ezy_vet_pets p ON a.pet_id = p.id
            WHERE po.phone = $1
              AND a.hospital_id = $2
            ORDER BY a.date DESC, a.time DESC
        `;

        const [rows] = await db.execute(query, [phone, hospitalId]);

        return res.json({
            success: true,
            data: {
                appointments: rows,
                total: rows.length
            }
        });

    } catch (error) {
        logger.error('Error getting patient appointments:', error);
        next(error);
    }
};

/**
 * Cancel an appointment (admin or AI with API key)
 * POST /api/admin/cancel - Body: { appointment_id }
 * DELETE /api/admin/:id
 */
exports.cancelAppointment = async (req, res, next) => {
    let connection;
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                message: 'No hospital associated with this request. Please provide hospital_id.'
            });
        }

        const appointmentId = req.body.appointment_id || req.params.id;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                message: 'Appointment ID is required'
            });
        }

        const [appointments] = await db.execute(
            `SELECT a.*,
                    po.name as patient_name,
                    p.pet_name,
                    po.phone
             FROM ezy_vet_appointments a
             JOIN ezy_vet_pet_owner po ON a.pet_owner_id = po.id
             LEFT JOIN ezy_vet_pets p ON a.pet_id = p.id
             WHERE a.id = $1 AND a.hospital_id = $2`,
            [appointmentId, hospitalId]
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to your hospital'
            });
        }

        const appointment = appointments[0];

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Appointment is already cancelled'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        await connection.execute(
            `UPDATE ezy_vet_appointments
             SET status = 'cancelled', appointment_status = 'cancelled', updated_at = NOW()
             WHERE id = $1`,
            [appointmentId]
        );

        if (appointment.google_event_id) {
            try {
                await calendarService.cancelEvent(appointment.google_event_id, hospitalId);
                logger.info(`Google Calendar event cancelled: ${appointment.google_event_id}`);
            } catch (calendarError) {
                logger.error('Error cancelling Google Calendar event:', calendarError);
            }
        }

        await connection.commit();

        return res.json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: {
                appointment_id: parseInt(appointmentId),
                patient_name: appointment.patient_name,
                pet_name: appointment.pet_name,
                date: appointment.date,
                time: appointment.time
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Error cancelling appointment:', error);
        next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Get all appointments (admin only) - filtered by hospital_id
 * GET /api/admin/all?date=2026-06-03&status=confirmed
 */



exports.getAllAppointments = async (req, res, next) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                message: 'No hospital associated with this admin'
            });
        }

        const { date, status, type, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT a.*,
                   po.name as patient_name,
                   po.name as pet_owner,
                   po.phone,
                   p.pet_name,
                   p.pet_species,
                   p.pet_breed,
                   b.bread_name AS pet_breed_name
            FROM ezy_vet_appointments a
            JOIN ezy_vet_pet_owner po ON a.pet_owner_id = po.id
            LEFT JOIN ezy_vet_pets p ON a.pet_id = p.id
            LEFT JOIN ezy_vet_used_animal_breads b ON p.pet_breed = b.bread_id AND b.hospital_id = a.hospital_id
            WHERE a.hospital_id = $1
        `;
        const params = [hospitalId];
        let paramCount = 1;

        if (date) {
            paramCount++;
            query += ` AND a.date = $${paramCount}`;
            params.push(date);
        }

        if (status) {
            paramCount++;
            query += ` AND a.status = $${paramCount}`;
            params.push(status);
        }

        if (type) {
            paramCount++;
            query += ` AND a.appointment_type = $${paramCount}`;
            params.push(type);
        }

        paramCount++;
        query += ` ORDER BY a.date DESC, a.time DESC LIMIT $${paramCount}`;
        params.push(parseInt(limit));

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(parseInt(offset));

        const [rows] = await db.execute(query, params);

        // Count query (unchanged)
        let countQuery = `SELECT COUNT(*) as total FROM ezy_vet_appointments a WHERE a.hospital_id = $1`;
        const countParams = [hospitalId];
        let countParamNum = 1;

        if (date) {
            countParamNum++;
            countQuery += ` AND a.date = $${countParamNum}`;
            countParams.push(date);
        }
        if (status) {
            countParamNum++;
            countQuery += ` AND a.status = $${countParamNum}`;
            countParams.push(status);
        }
        if (type) {
            countParamNum++;
            countQuery += ` AND a.appointment_type = $${countParamNum}`;
            countParams.push(type);
        }

        const [countResult] = await db.execute(countQuery, countParams);

        return res.json({
            success: true,
            data: {
                appointments: rows,
                total: countResult[0].total,
                page: parseInt(page),
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });

    } catch (error) {
        logger.error('Error getting all appointments:', error);
        next(error);
    }
};










/**
 * Reschedule an appointment (admin or AI with API key)
 * POST /api/admin/reschedule
 */
exports.rescheduleAppointment = async (req, res, next) => {
    let connection;

    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                message: 'No hospital associated with this request. Please provide hospital_id.'
            });
        }

        const { appointment_id, date, time } = req.body;

        if (!appointment_id || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'appointment_id, date and time are required'
            });
        }

        const [appointments] = await db.execute(
            `SELECT a.*,
                    po.name as patient_name,
                    p.pet_name
             FROM ezy_vet_appointments a
             JOIN ezy_vet_pet_owner po ON a.pet_owner_id = po.id
             LEFT JOIN ezy_vet_pets p ON a.pet_id = p.id
             WHERE a.id = $1 AND a.hospital_id = $2`,
            [appointment_id, hospitalId]
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to your hospital'
            });
        }

        const appointment = appointments[0];

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot reschedule a cancelled appointment'
            });
        }

        const isAvailable = await slotService.isSlotAvailable(
            date,
            time,
            appointment.appointment_type,
            hospitalId
        );

        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: 'Selected time slot is not available'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        await connection.execute(
            `UPDATE ezy_vet_appointments
             SET date = $1,
                 time = $2,
                 appointment_status = 'rescheduled',
                 updated_at = NOW()
             WHERE id = $3`,
            [date, time, appointment_id]
        );

        if (appointment.google_event_id) {
            try {
                await calendarService.updateEvent(
                    appointment.google_event_id,
                    {
                        patient_name: appointment.patient_name,
                        pet_name: appointment.pet_name || 'N/A',
                        appointment_type: appointment.appointment_type,
                        date,
                        time
                    },
                    hospitalId
                );
                logger.info(`Google Calendar event rescheduled: ${appointment.google_event_id}`);
            } catch (calendarError) {
                logger.error('Error rescheduling Google Calendar event:', calendarError);
            }
        }

        await connection.commit();

        return res.json({
            success: true,
            message: 'Appointment rescheduled successfully',
            data: { appointment_id, date, time }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Error rescheduling appointment:', error);
        next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Complete an appointment (admin only)
 * POST /api/admin/complete
 */
exports.completeAppointment = async (req, res, next) => {
    let connection;

    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                message: 'No hospital associated with this admin'
            });
        }

        const { appointment_id, notes = '' } = req.body;

        if (!appointment_id) {
            return res.status(400).json({
                success: false,
                message: 'appointment_id is required'
            });
        }

        const [appointments] = await db.execute(
            `SELECT a.*,
                    po.name as patient_name,
                    p.pet_name,
                    po.phone as patient_phone
             FROM ezy_vet_appointments a
             JOIN ezy_vet_pet_owner po ON a.pet_owner_id = po.id
             LEFT JOIN ezy_vet_pets p ON a.pet_id = p.id
             WHERE a.id = $1 AND a.hospital_id = $2`,
            [appointment_id, hospitalId]
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to your hospital'
            });
        }

        const appointment = appointments[0];

        if (appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Appointment already completed'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        await connection.execute(
            `UPDATE ezy_vet_appointments
             SET status = 'completed',
                 appointment_status = 'completed',
                 notes = COALESCE($1, notes),
                 updated_at = NOW()
             WHERE id = $2`,
            [notes, appointment_id]
        );

        if (appointment.google_event_id) {
            try {
                await calendarService.markCompleted(
                    appointment.google_event_id,
                    notes,
                    hospitalId
                );
                logger.info(`Google Calendar event completed: ${appointment.google_event_id}`);
            } catch (calendarError) {
                logger.error('Error completing Google Calendar event:', calendarError);
            }
        }

        await connection.commit();

        return res.json({
            success: true,
            message: 'Appointment marked as completed',
            data: {
                appointment_id: appointment.id,
                patient_name: appointment.patient_name,
                pet_name: appointment.pet_name,
                notes: notes,
                phoneNumber: appointment.patient_phone,
                appointmentType: appointment.appointment_type,
                appointmentDate: appointment.date,
                appointmentTime: appointment.time
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Error completing appointment:', error);
        next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Update appointment feedback fields (admin only)
 * POST /api/admin/feedback
 */
exports.appointmentFeedback = async (req, res, next) => {
    let connection;
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                message: 'No hospital associated with this request. Please provide hospital_id.'
            });
        }

        const {
            appointment_id,
            feedback_call_initiated,
            feedback_call_picked,
            feedback_given,
            feedback_recording_url
        } = req.body;

        if (!appointment_id) {
            return res.status(400).json({
                success: false,
                message: 'appointment_id is required'
            });
        }

        const [existing] = await db.execute(
            `SELECT id FROM ezy_vet_appointments WHERE id = $1 AND hospital_id = $2`,
            [appointment_id, hospitalId]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to your hospital'
            });
        }

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (feedback_call_initiated !== undefined) {
            updates.push(`feedback_call_initiated = $${paramIndex++}`);
            values.push(feedback_call_initiated);
        }
        if (feedback_call_picked !== undefined) {
            updates.push(`feedback_call_picked = $${paramIndex++}`);
            values.push(feedback_call_picked);
        }
        if (feedback_given !== undefined) {
            updates.push(`feedback_given = $${paramIndex++}`);
            values.push(feedback_given);
        }
        if (feedback_recording_url !== undefined) {
            updates.push(`feedback_recording_url = $${paramIndex++}`);
            values.push(feedback_recording_url);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one feedback field is required'
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(appointment_id);

        connection = await db.getConnection();
        await connection.beginTransaction();

        await connection.execute(
            `UPDATE ezy_vet_appointments SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        await connection.commit();

        return res.json({
            success: true,
            message: 'Appointment feedback updated successfully',
            data: {
                appointment_id,
                updates: {
                    ...(feedback_call_initiated !== undefined && { feedback_call_initiated }),
                    ...(feedback_call_picked !== undefined && { feedback_call_picked }),
                    ...(feedback_given !== undefined && { feedback_given }),
                    ...(feedback_recording_url !== undefined && { feedback_recording_url })
                }
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Error updating appointment feedback:', error);
        next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Initiate an outbound feedback call (admin only)
 * POST /api/admin/feedback-call
 */
exports.initiateFeedbackCallDirect = async (req, res, next) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                message: 'No hospital associated with this admin'
            });
        }

        const {
            phoneNumber,
            patientName,
            petName,
            appointmentType,
            appointmentDate,
            appointmentTime,
            appointmentId
        } = req.body;

        if (!phoneNumber || !patientName || !petName || !appointmentType || !appointmentDate || !appointmentTime || !appointmentId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: phoneNumber, patientName, petName, appointmentType, appointmentDate, appointmentTime, appointmentId'
            });
        }

        const [appt] = await db.execute(
            `SELECT id FROM ezy_vet_appointments WHERE id = $1 AND hospital_id = $2`,
            [appointmentId, hospitalId]
        );
        if (appt.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to your hospital'
            });
        }

        const vapiPayload = {
            assistantId: process.env.VAPI_FEEDBACK_ASSISTANT_ID,
            phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
            customer: { number: phoneNumber },
            assistantOverrides: {
                variableValues: {
                    appointment_id: String(appointmentId),
                    patient_name: patientName,
                    pet_name: petName,
                    appointment_type: appointmentType,
                    appointment_date: appointmentDate,
                    appointment_time: appointmentTime
                }
            }
        };

        const vapiResponse = await fetch(`${process.env.VAPI_API_BASE_URL}/call/phone`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vapiPayload)
        });

        if (!vapiResponse.ok) {
            const errorText = await vapiResponse.text();
            console.error('Vapi API error:', errorText);
            return res.status(vapiResponse.status).json({
                success: false,
                message: 'Failed to initiate outbound call',
                error: errorText
            });
        }

        const vapiResult = await vapiResponse.json();

        return res.status(200).json({
            success: true,
            message: 'Outbound feedback call initiated',
            data: vapiResult
        });

    } catch (error) {
        console.error('Error in initiateFeedbackCallDirect:', error);
        next(error);
    }
};

/**
 * Cron job: Process pending feedback calls (no admin context, runs globally)
 */
// exports.processPendingFeedbackCalls = async () => {
//     try {
//         console.log('🕒 Running feedback call cron job...');

//         const delayMinutes = process.env.FEEDBACK_CALL_DELAY_MINUTES || '2';

//         const [rows] = await db.execute(`
//             SELECT
//                 a.id as appointment_id,
//                 a.appointment_type,
//                 a.date,
//                 a.time,
//                 a.pet_owner_id,
//                 a.pet_id,
//                 a.updated_at,
//                 po.name as patient_name,
//                 po.phone,
//                 p.pet_name as pet_name
//             FROM ezy_vet_appointments a
//             JOIN ezy_vet_pet_owner po ON a.pet_owner_id = po.id
//             LEFT JOIN ezy_vet_pets p ON a.pet_id = p.id
//             WHERE a.status = 'completed'
//               AND a.appointment_status = 'completed'
//              AND (a.feedback_call_attempted IS NULL OR a.feedback_call_attempted = 'false')
//               AND a.updated_at <= NOW() - INTERVAL '${delayMinutes} minutes'
//             ORDER BY a.updated_at ASC
//             LIMIT 10
//         `);

//         if (rows.length === 0) {
//             console.log('   No pending feedback calls to process');
//             return;
//         }

//         console.log(`   Found ${rows.length} appointment(s) ready for feedback call`);

//         for (const apt of rows) {
//             console.log(`\n📞 Processing appointment ID ${apt.appointment_id}`);

//             const updatedAt = new Date(apt.updated_at);
//             const now = new Date();
//             const diffMinutes = (now - updatedAt) / (1000 * 60);
//             if (diffMinutes < 2) {
//                 console.log(`   ⏳ Gap time (${diffMinutes.toFixed(1)} min) < 2 min, skipping`);
//                 continue;
//             }
//             console.log(`   ✅ Gap time (${diffMinutes.toFixed(1)} min) >= 2 min, initiating call`);

//             const callData = {
//                 phoneNumber: apt.phone,
//                 patientName: apt.patient_name,
//                 petName: apt.pet_name || 'Your pet',
//                 appointmentType: apt.appointment_type,
//                 appointmentDate: apt.date,
//                 appointmentTime: apt.time,
//                 appointmentId: String(apt.appointment_id)
//             };

//             try {
//                 const result = await _triggerOutboundCall(callData);
//                 if (result.success) {
//                     await db.execute(`
//                         UPDATE ezy_vet_appointments
//                         SET feedback_call_attempted = 'true',
//                             feedback_call_attempted_at = NOW()
//                         WHERE id = $1
//                     `, [apt.appointment_id]);
//                     console.log(`   ✅ Feedback call initiated successfully for appointment ${apt.appointment_id}`);
//                 } else {
//                     console.log(`   ❌ Failed to initiate call: ${result.error}`);
//                 }
//             } catch (err) {
//                 console.error(`   ❌ Error initiating call: ${err.message}`);
//             }
//         }

//     } catch (error) {
//         console.error('Error in processPendingFeedbackCalls:', error);
//     }
// };




exports.processPendingFeedbackCalls = async () => {
    try {
        console.log('🕒 Running feedback call cron job...');

        const delayMinutes = process.env.FEEDBACK_CALL_DELAY_MINUTES || '2';
        console.log(`   Delay (minutes): ${delayMinutes}`);

        // Build the SQL query as a template literal
        const query = `
            SELECT
                a.id as appointment_id,
                a.appointment_type,
                a.date,
                a.time,
                a.pet_owner_id,
                a.pet_id,
                a.updated_at,
                po.name as patient_name,
                po.phone,
                p.pet_name as pet_name
            FROM ezy_vet_appointments a
            JOIN ezy_vet_pet_owner po ON a.pet_owner_id = po.id
            LEFT JOIN ezy_vet_pets p ON a.pet_id = p.id
            WHERE a.status = 'completed'
              AND a.appointment_status = 'completed'
              AND (a.feedback_call_attempted IS NULL OR a.feedback_call_attempted = 'false')
              AND a.updated_at <= NOW() - INTERVAL '${delayMinutes} minutes'
            ORDER BY a.updated_at ASC
            LIMIT 10
        `;

        console.log('   SQL:', query);
        console.log('   NOW() =', new Date().toISOString());

        // Execute the query
        const [rows] = await db.execute(query);
        console.log(`   Rows returned: ${rows.length}`);

        if (rows.length === 0) {
            console.log('   No pending feedback calls to process');
            return;
        }

        console.log(`   Found ${rows.length} appointment(s) ready for feedback call`);

        for (const apt of rows) {
            console.log(`\n📞 Processing appointment ID ${apt.appointment_id}`);

            const updatedAt = new Date(apt.updated_at);
            const now = new Date();
            const diffMinutes = (now - updatedAt) / (1000 * 60);
            if (diffMinutes < 2) {
                console.log(`   ⏳ Gap time (${diffMinutes.toFixed(1)} min) < 2 min, skipping`);
                continue;
            }
            console.log(`   ✅ Gap time (${diffMinutes.toFixed(1)} min) >= 2 min, initiating call`);

            const callData = {
                phoneNumber: apt.phone,
                patientName: apt.patient_name,
                petName: apt.pet_name || 'Your pet',
                appointmentType: apt.appointment_type,
                appointmentDate: apt.date,
                appointmentTime: apt.time,
                appointmentId: String(apt.appointment_id)
            };

            try {
                const result = await _triggerOutboundCall(callData);
                if (result.success) {
                    await db.execute(`
                        UPDATE ezy_vet_appointments
                        SET feedback_call_attempted = 'true',
                            feedback_call_attempted_at = NOW()
                        WHERE id = $1
                    `, [apt.appointment_id]);
                    console.log(`   ✅ Feedback call initiated successfully for appointment ${apt.appointment_id}`);
                } else {
                    console.log(`   ❌ Failed to initiate call: ${result.error}`);
                }
            } catch (err) {
                console.error(`   ❌ Error initiating call: ${err.message}`);
            }
        }

    } catch (error) {
        console.error('Error in processPendingFeedbackCalls:', error);
    }
};