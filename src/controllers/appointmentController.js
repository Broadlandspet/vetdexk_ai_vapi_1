
// // //////////////////////////////////-----------------edit---------




// // const db = require('../config/database');
// // const calendarService = require('../services/calendarService');
// // const patientService = require('../services/patientService');
// // const slotService = require('../services/slotService');
// // const logger = require('../utils/logger');
// // const EmailService = require('../services/emailService');

// // class AppointmentController {

// //     /**
// //      * Book a new appointment
// //      * POST /api/appointments
// //      */
// //     async bookAppointment(req, res, next) {
// //         let connection;
// //         try {
// //             const {
// //                 patient_name,
// //                 phone,
// //                 email,
// //                 is_new_patient,
// //                 patient_id,
// //                 pet_name,
// //                 pet_species,
// //                 pet_breed,
// //                 pet_gender,
// //                 pet_age,
// //                 appointment_type,
// //                 date,
// //                 time,
// //                 call_sid
// //             } = req.body;

// //             // Validate required fields
// //             if (!patient_name || !phone || !appointment_type || !date || !time) {
// //                 return res.status(400).json({
// //                     success: false,
// //                     message: 'Missing required fields: patient_name, phone, appointment_type, date, time'
// //                 });
// //             }

// //             // Validate appointment type
// //             const validTypes = ['vaccination', 'consultation', 'follow-up', 'surgery'];
// //             if (!validTypes.includes(appointment_type.toLowerCase())) {
// //                 return res.status(400).json({
// //                     success: false,
// //                     message: `Invalid appointment type. Valid types: ${validTypes.join(', ')}`
// //                 });
// //             }

// //             // Check if slot is available
// //             const isAvailable = await slotService.isSlotAvailable(date, time, appointment_type.toLowerCase());
// //             if (!isAvailable) {
// //                 return res.status(409).json({
// //                     success: false,
// //                     message: 'This time slot is no longer available. Please choose another time.'
// //                 });
// //             }

// //             connection = await db.getConnection();
// //             await connection.beginTransaction();

// //             // Step 1: Handle patient record
// //             let finalPatientId = patient_id;

// //             if (is_new_patient || !finalPatientId) {
// //                 // Check if patient already exists by phone
// //                 const existingPatient = await patientService.findByPhone(phone);

// //                 if (existingPatient.found) {
// //                     // Use existing patient
// //                     finalPatientId = existingPatient.patient.id;
// //                     logger.info(`Using existing patient: ID ${finalPatientId}`);
// //                 } else {
// //                     // Create new patient
// //                     const [patientResult] = await connection.execute(
// //                         `INSERT INTO patients (name, phone, email, pet_name, pet_species, pet_breed, pet_gender, pet_age, is_returning, created_at, updated_at)
// //                          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())`,
// //                         [patient_name, phone, email || null, pet_name, pet_species, pet_breed, pet_gender, pet_age]
// //                     );
// //                     finalPatientId = patientResult.insertId || patientResult.rows?.[0]?.id;
// //                     logger.info(`New patient created: ID ${finalPatientId}`);
// //                 }
// //             } else {
// //                 // Update existing patient info
// //                 await connection.execute(
// //                     `UPDATE patients SET 
// //                         name = $1, 
// //                         email = COALESCE($2, email),
// //                         pet_name = COALESCE($3, pet_name),
// //                         pet_species = COALESCE($4, pet_species),
// //                         pet_breed = COALESCE($5, pet_breed),
// //                         pet_gender = COALESCE($6, pet_gender),
// //                         pet_age = COALESCE($7, pet_age),
// //                         is_returning = true,
// //                         updated_at = NOW()
// //                      WHERE id = $8`,
// //                     [patient_name, email, pet_name, pet_species, pet_breed, pet_gender, pet_age, finalPatientId]
// //                 );
// //                 logger.info(`Patient updated: ID ${finalPatientId}`);
// //             }

// //             // Step 2: Create Google Calendar event
// //             let googleEventId = null;
// //             try {
// //                 const calendarResult = await calendarService.createEvent({
// //                     patient_name,
// //                     phone,
// //                     pet_name: pet_name || 'N/A',
// //                     pet_species: pet_species || 'N/A',
// //                     pet_breed: pet_breed || 'N/A',
// //                     appointment_type,
// //                     date,
// //                     time
// //                 });
// //                 googleEventId = calendarResult.eventId;
// //                 logger.info(`Google Calendar event created: ${googleEventId}`);
// //             } catch (calendarError) {
// //                 logger.error('Google Calendar error:', calendarError);
// //             }

// //             ///            // Step 3: Save appointment to database


// //             const [appointmentResult] = await connection.execute(
// //                 `INSERT INTO appointments (patient_id, google_event_id, appointment_type, date, time, status, notes, call_sid, created_at, updated_at)
// //      VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, NOW(), NOW())`,
// //                 [
// //                     finalPatientId,
// //                     googleEventId,
// //                     appointment_type.toLowerCase(),
// //                     date,
// //                     time,
// //                     `Booked via VAPI AI Assistant - ${pet_name || 'N/A'}`,
// //                     call_sid || null   // ← ADD THIS LINE
// //                 ]
// //             );

// //             const appointmentId = appointmentResult.insertId || appointmentResult.rows?.[0]?.id;
// //             logger.info(`Appointment created: ID ${appointmentId}`);

// //             await connection.commit();

// //             // Send confirmation email to patient if email is available
// // try {
// //     let patientEmail = email; // from req.body
// //     if (!patientEmail && finalPatientId) {
// //         // If email wasn't provided in request, try to fetch from patient record
// //         const [patientRows] = await connection.execute(
// //             `SELECT email FROM patients WHERE id = $1`,
// //             [finalPatientId]
// //         );
// //         patientEmail = patientRows[0]?.email;
// //     }
// //     if (patientEmail) {
// //         await EmailService.sendAppointmentConfirmationEmail({
// //             toEmail: patientEmail,
// //             patientName: patient_name,
// //             petName: pet_name,
// //             appointmentType: appointment_type,
// //             appointmentDate: date,
// //             appointmentTime: time,
// //             callSid: call_sid,
// //             appointmentId: appointmentId
// //         });
// //         logger.info(`Confirmation email sent to patient: ${patientEmail}`);
// //     } else {
// //         logger.info(`No email address for patient ID ${finalPatientId}, skipping confirmation email`);
// //     }
// // } catch (emailErr) {
// //     // Non‑blocking – do not fail the appointment booking
// //     logger.error('Error sending confirmation email to patient:', emailErr);
// // }

// //             return res.status(201).json({
// //                 success: true,
// //                 message: 'Appointment booked successfully',
// //                 data: {
// //                     appointment_id: appointmentId,
// //                     patient_id: finalPatientId,
// //                     google_event_id: googleEventId,
// //                     appointment: {
// //                         patient_name,
// //                         pet_name: pet_name || 'N/A',
// //                         appointment_type: appointment_type.toLowerCase(),
// //                         date,
// //                         time
// //                     }
// //                 }
// //             });

// //         } catch (error) {
// //             if (connection) {
// //                 await connection.rollback();
// //             }
// //             logger.error('Error booking appointment:', error);
// //             next(error);
// //         } finally {
// //             if (connection) {
// //                 connection.release();
// //             }
// //         }
// //     }

// //     /**
// //      * Get patient's upcoming appointments
// //      * POST /api/appointments/lookup - Body: { phone }
// //      * GET /api/appointments?phone=+12125551234
// //      */
// //     async getPatientAppointments(req, res, next) {
// //         try {
// //             const phone = (req.body.phone || req.query.phone || '').trim();

// //             if (!phone) {
// //                 return res.status(400).json({
// //                     success: false,
// //                     message: 'Phone number is required'
// //                 });
// //             }

// //             const [rows] = await db.execute(
// //                 `SELECT a.*, p.name as patient_name, p.pet_name, p.pet_species, p.pet_breed
// //                  FROM appointments a
// //                  JOIN patients p ON a.patient_id = p.id
// //                  WHERE p.phone = $1 
// //                  AND a.status = 'confirmed' 
// //                  AND a.date >= CURRENT_DATE
// //                  ORDER BY a.date ASC, a.time ASC`,
// //                 [phone]
// //             );

// //             return res.json({
// //                 success: true,
// //                 data: {
// //                     upcoming_appointments: rows,
// //                     total: rows.length
// //                 }
// //             });

// //         } catch (error) {
// //             logger.error('Error getting patient appointments:', error);
// //             next(error);
// //         }
// //     }

// //     /**
// //      * Cancel an appointment
// //      * POST /api/appointments/cancel - Body: { appointment_id }
// //      * DELETE /api/appointments/:id
// //      */
// //     async cancelAppointment(req, res, next) {
// //         let connection;
// //         try {
// //             const appointmentId = req.body.appointment_id || req.params.id;

// //             if (!appointmentId) {
// //                 return res.status(400).json({
// //                     success: false,
// //                     message: 'Appointment ID is required'
// //                 });
// //             }

// //             const [appointments] = await db.execute(
// //                 `SELECT a.*, p.name as patient_name, p.pet_name, p.phone
// //                  FROM appointments a
// //                  JOIN patients p ON a.patient_id = p.id
// //                  WHERE a.id = $1`,
// //                 [appointmentId]
// //             );

// //             if (appointments.length === 0) {
// //                 return res.status(404).json({
// //                     success: false,
// //                     message: 'Appointment not found'
// //                 });
// //             }

// //             const appointment = appointments[0];

// //             if (appointment.status === 'cancelled') {
// //                 return res.status(400).json({
// //                     success: false,
// //                     message: 'Appointment is already cancelled'
// //                 });
// //             }

// //             connection = await db.getConnection();
// //             await connection.beginTransaction();

// //             await connection.execute(
// //                 `UPDATE appointments SET status = 'cancelled', appointment_status = 'cancelled', updated_at = NOW() WHERE id = $1`,
// //                 [appointmentId]
// //             );

// //             if (appointment.google_event_id) {
// //                 try {
// //                     await calendarService.cancelEvent(appointment.google_event_id);
// //                     logger.info(`Google Calendar event cancelled: ${appointment.google_event_id}`);
// //                 } catch (calendarError) {
// //                     logger.error('Error cancelling Google Calendar event:', calendarError);
// //                 }
// //             }

// //             await connection.commit();

// //             return res.json({
// //                 success: true,
// //                 message: 'Appointment cancelled successfully',
// //                 data: {
// //                     appointment_id: parseInt(appointmentId),
// //                     patient_name: appointment.patient_name,
// //                     pet_name: appointment.pet_name,
// //                     date: appointment.date,
// //                     time: appointment.time
// //                 }
// //             });

// //         } catch (error) {
// //             if (connection) {
// //                 await connection.rollback();
// //             }
// //             logger.error('Error cancelling appointment:', error);
// //             next(error);
// //         } finally {
// //             if (connection) {
// //                 connection.release();
// //             }
// //         }
// //     }

// //     /**
// //      * Get all appointments (admin)
// //      * GET /api/appointments/all?date=2026-06-03&status=confirmed
// //      */
// //     async getAllAppointments(req, res, next) {
// //         try {
// //             const { date, status, type, page = 1, limit = 50 } = req.query;
// //             const offset = (page - 1) * limit;

// //             let query = `
// //                 SELECT a.*, p.name as patient_name, p.phone, p.pet_name, p.pet_species, p.pet_breed
// //                 FROM appointments a
// //                 JOIN patients p ON a.patient_id = p.id
// //                 WHERE 1=1
// //             `;
// //             const params = [];
// //             let paramCount = 0;

// //             if (date) {
// //                 paramCount++;
// //                 query += ` AND a.date = $${paramCount}`;
// //                 params.push(date);
// //             }

// //             if (status) {
// //                 paramCount++;
// //                 query += ` AND a.status = $${paramCount}`;
// //                 params.push(status);
// //             }

// //             if (type) {
// //                 paramCount++;
// //                 query += ` AND a.appointment_type = $${paramCount}`;
// //                 params.push(type);
// //             }

// //             paramCount++;
// //             query += ` ORDER BY a.date DESC, a.time DESC LIMIT $${paramCount}`;
// //             params.push(parseInt(limit));

// //             paramCount++;
// //             query += ` OFFSET $${paramCount}`;
// //             params.push(parseInt(offset));

// //             const [rows] = await db.execute(query, params);

// //             // Count query
// //             let countQuery = `SELECT COUNT(*) as total FROM appointments a WHERE 1=1`;
// //             const countParams = [];
// //             let countParamNum = 0;

// //             if (date) {
// //                 countParamNum++;
// //                 countQuery += ` AND a.date = $${countParamNum}`;
// //                 countParams.push(date);
// //             }
// //             if (status) {
// //                 countParamNum++;
// //                 countQuery += ` AND a.status = $${countParamNum}`;
// //                 countParams.push(status);
// //             }
// //             if (type) {
// //                 countParamNum++;
// //                 countQuery += ` AND a.appointment_type = $${countParamNum}`;
// //                 countParams.push(type);
// //             }

// //             const [countResult] = await db.execute(countQuery, countParams);

// //             return res.json({
// //                 success: true,
// //                 data: {
// //                     appointments: rows,
// //                     total: countResult[0].total,
// //                     page: parseInt(page),
// //                     totalPages: Math.ceil(countResult[0].total / limit)
// //                 }
// //             });

// //         } catch (error) {
// //             logger.error('Error getting all appointments:', error);
// //             next(error);
// //         }
// //     }





// //     /**
// //  * Reschedule an appointment
// //  * POST /api/appointments/reschedule
// //  */
// //     async rescheduleAppointment(req, res, next) {
// //         let connection;

// //         try {
// //             const {
// //                 appointment_id,
// //                 date,
// //                 time
// //             } = req.body;

// //             if (!appointment_id || !date || !time) {
// //                 return res.status(400).json({
// //                     success: false,
// //                     message: 'appointment_id, date and time are required'
// //                 });
// //             }

// //             const [appointments] = await db.execute(
// //                 `SELECT
// //                 a.*,
// //                 p.name as patient_name,
// //                 p.pet_name
// //              FROM appointments a
// //              JOIN patients p ON a.patient_id = p.id
// //              WHERE a.id = $1`,
// //                 [appointment_id]
// //             );

// //             if (appointments.length === 0) {
// //                 return res.status(404).json({
// //                     success: false,
// //                     message: 'Appointment not found'
// //                 });
// //             }

// //             const appointment = appointments[0];

// //             if (appointment.status === 'cancelled') {
// //                 return res.status(400).json({
// //                     success: false,
// //                     message: 'Cannot reschedule a cancelled appointment'
// //                 });
// //             }

// //             const isAvailable = await slotService.isSlotAvailable(
// //                 date,
// //                 time,
// //                 appointment.appointment_type
// //             );

// //             if (!isAvailable) {
// //                 return res.status(409).json({
// //                     success: false,
// //                     message: 'Selected time slot is not available'
// //                 });
// //             }

// //             connection = await db.getConnection();
// //             await connection.beginTransaction();

// //             await connection.execute(
// //                 `UPDATE appointments
// //              SET date = $1,
// //                  time = $2,
// //                  appointment_status = 'rescheduled',
// //                  updated_at = NOW()
// //              WHERE id = $3`,
// //                 [
// //                     date,
// //                     time,
// //                     appointment_id
// //                 ]
// //             );

// //             if (appointment.google_event_id) {
// //                 try {
// //                     await calendarService.updateEvent(
// //                         appointment.google_event_id,
// //                         {
// //                             patient_name: appointment.patient_name,
// //                             pet_name: appointment.pet_name || 'N/A',
// //                             appointment_type: appointment.appointment_type,
// //                             date,
// //                             time
// //                         }
// //                     );

// //                     logger.info(
// //                         `Google Calendar event rescheduled: ${appointment.google_event_id}`
// //                     );

// //                 } catch (calendarError) {
// //                     logger.error(
// //                         'Error rescheduling Google Calendar event:',
// //                         calendarError
// //                     );
// //                 }
// //             }

// //             await connection.commit();

// //             return res.json({
// //                 success: true,
// //                 message: 'Appointment rescheduled successfully',
// //                 data: {
// //                     appointment_id,
// //                     date,
// //                     time
// //                 }
// //             });

// //         } catch (error) {

// //             if (connection) {
// //                 await connection.rollback();
// //             }

// //             logger.error(
// //                 'Error rescheduling appointment:',
// //                 error
// //             );

// //             next(error);

// //         } finally {

// //             if (connection) {
// //                 connection.release();
// //             }

// //         }
// //     }


// //     // /**
// //     //  * Complete an appointment
// //     //  * POST /api/appointments/complete
// //     //  */




// //     async completeAppointment(req, res, next) {
// //     let connection;

// //     try {
// //         const {
// //             appointment_id,
// //             notes = ''
// //         } = req.body;

// //         if (!appointment_id) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'appointment_id is required'
// //             });
// //         }

// //         // SELECT includes patient phone, appointment_type, date, time from a.*
// //         const [appointments] = await db.execute(
// //             `SELECT a.*, p.name as patient_name, p.pet_name, p.phone as patient_phone
// //              FROM appointments a
// //              JOIN patients p ON a.patient_id = p.id
// //              WHERE a.id = $1`,
// //             [appointment_id]
// //         );

// //         if (appointments.length === 0) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: 'Appointment not found'
// //             });
// //         }

// //         const appointment = appointments[0];

// //         if (appointment.status === 'completed') {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Appointment already completed'
// //             });
// //         }

// //         connection = await db.getConnection();
// //         await connection.beginTransaction();

// //         await connection.execute(
// //             `UPDATE appointments
// //              SET status = 'completed',
// //                  appointment_status = 'completed',
// //                  notes = COALESCE($1, notes),
// //                  updated_at = NOW()
// //              WHERE id = $2`,
// //             [notes, appointment_id]
// //         );

// //         if (appointment.google_event_id) {
// //             try {
// //                 await calendarService.markCompleted(appointment.google_event_id, notes);
// //                 logger.info(`Google Calendar event completed: ${appointment.google_event_id}`);
// //             } catch (calendarError) {
// //                 logger.error('Error completing Google Calendar event:', calendarError);
// //             }
// //         }

// //         await connection.commit();

// //         // Return all data needed for outbound feedback call
// //         return res.json({
// //             success: true,
// //             message: 'Appointment marked as completed',
// //             data: {
// //                 appointment_id: appointment.id,
// //                 patient_name: appointment.patient_name,
// //                 pet_name: appointment.pet_name,
// //                 notes: notes,
// //                 phoneNumber: appointment.patient_phone,
// //                 appointmentType: appointment.appointment_type,
// //                 appointmentDate: appointment.date,
// //                 appointmentTime: appointment.time
// //             }
// //         });

// //     } catch (error) {
// //         if (connection) {
// //             await connection.rollback();
// //         }
// //         logger.error('Error completing appointment:', error);
// //         next(error);
// //     } finally {
// //         if (connection) {
// //             connection.release();
// //         }
// //     }
// // }



// //     /**
// //  * Update appointment feedback fields
// //  * POST /api/appointments/feedback
// //  * Body: { appointment_id, feedback_call_initiated, feedback_call_picked, feedback_given, feedback_recording_url }
// //  */
// // async appointmentFeedback(req, res, next) {
// //     let connection;
// //     try {
// //         const {
// //             appointment_id,
// //             feedback_call_initiated,
// //             feedback_call_picked,
// //             feedback_given,
// //             feedback_recording_url
// //         } = req.body;

// //         if (!appointment_id) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'appointment_id is required'
// //             });
// //         }

// //         // Check if appointment exists
// //         const [existing] = await db.execute(
// //             `SELECT id FROM appointments WHERE id = $1`,
// //             [appointment_id]
// //         );
// //         if (existing.length === 0) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: 'Appointment not found'
// //             });
// //         }

// //         // Build dynamic update query
// //         const updates = [];
// //         const values = [];
// //         let paramIndex = 1;

// //         if (feedback_call_initiated !== undefined) {
// //             updates.push(`feedback_call_initiated = $${paramIndex++}`);
// //             values.push(feedback_call_initiated);
// //         }
// //         if (feedback_call_picked !== undefined) {
// //             updates.push(`feedback_call_picked = $${paramIndex++}`);
// //             values.push(feedback_call_picked);
// //         }
// //         if (feedback_given !== undefined) {
// //             updates.push(`feedback_given = $${paramIndex++}`);
// //             values.push(feedback_given);
// //         }
// //         if (feedback_recording_url !== undefined) {
// //             updates.push(`feedback_recording_url = $${paramIndex++}`);
// //             values.push(feedback_recording_url);
// //         }

// //         if (updates.length === 0) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'At least one feedback field is required'
// //             });
// //         }

// //         updates.push(`updated_at = NOW()`);
// //         values.push(appointment_id);

// //         connection = await db.getConnection();
// //         await connection.beginTransaction();

// //         await connection.execute(
// //             `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
// //             values
// //         );

// //         await connection.commit();

// //         return res.json({
// //             success: true,
// //             message: 'Appointment feedback updated successfully',
// //             data: {
// //                 appointment_id,
// //                 updates: {
// //                     ...(feedback_call_initiated !== undefined && { feedback_call_initiated }),
// //                     ...(feedback_call_picked !== undefined && { feedback_call_picked }),
// //                     ...(feedback_given !== undefined && { feedback_given }),
// //                     ...(feedback_recording_url !== undefined && { feedback_recording_url })
// //                 }
// //             }
// //         });

// //     } catch (error) {
// //         if (connection) await connection.rollback();
// //         logger.error('Error updating appointment feedback:', error);
// //         next(error);
// //     } finally {
// //         if (connection) connection.release();
// //     }
// // }





// // //////testing for the calling-----------------///////


// // /**
// //  * Initiate an outbound feedback call using direct data (no DB fetch)
// //  * POST /api/appointments/feedback-call
// //  * Body: { phoneNumber, patientName, petName, appointmentType, appointmentDate, appointmentTime, appointmentId }
// //  */
// // async initiateFeedbackCallDirect(req, res, next) {
// //     try {
// //         const {
// //             phoneNumber,
// //             patientName,
// //             petName,
// //             appointmentType,
// //             appointmentDate,
// //             appointmentTime,
// //             appointmentId
// //         } = req.body;

// //         // Validate required fields
// //         if (!phoneNumber || !patientName || !petName || !appointmentType || !appointmentDate || !appointmentTime || !appointmentId) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Missing required fields: phoneNumber, patientName, petName, appointmentType, appointmentDate, appointmentTime, appointmentId'
// //             });
// //         }

// //         // Prepare the Vapi API request
// //         const vapiPayload = {
// //             assistantId: process.env.VAPI_FEEDBACK_ASSISTANT_ID,
// //             phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
// //             customer: { number: phoneNumber },
// //             assistantOverrides: {
// //                 variableValues: {
// //                     appointment_id: String(appointmentId),
// //                     patient_name: patientName,
// //                     pet_name: petName,
// //                     appointment_type: appointmentType,
// //                     appointment_date: appointmentDate,
// //                     appointment_time: appointmentTime
// //                 }
// //             }
// //         };

// //         const vapiResponse = await fetch(`${process.env.VAPI_API_BASE_URL}/call/phone`, {
// //             method: 'POST',
// //             headers: {
// //                 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
// //                 'Content-Type': 'application/json'
// //             },
// //             body: JSON.stringify(vapiPayload)
// //         });

// //         if (!vapiResponse.ok) {
// //             const errorText = await vapiResponse.text();
// //             console.error('Vapi API error:', errorText);
// //             return res.status(vapiResponse.status).json({
// //                 success: false,
// //                 message: 'Failed to initiate outbound call',
// //                 error: errorText
// //             });
// //         }

// //         const vapiResult = await vapiResponse.json();

// //         return res.status(200).json({
// //             success: true,
// //             message: 'Outbound feedback call initiated',
// //             data: vapiResult
// //         });

// //     } catch (error) {
// //         console.error('Error in initiateFeedbackCallDirect:', error);
// //         next(error);
// //     }
// // }




// // /**
// //  * Cron job: Process pending feedback calls
// //  * Runs every 2 minutes, finds completed appointments that need feedback calls
// //  */
// // async processPendingFeedbackCalls() {
// //     try {
// //         console.log('🕒 Running feedback call cron job...');
        
// //         // // Find appointments that are:
// //         // // - status = 'completed'
// //         // // - appointment_status = 'completed' 
// //         // // - feedback_call_attempted = false
// //         // // - updated_at is at least 2 minutes ago (optional gap)
// //         // const [rows] = await db.execute(`
// //         //     SELECT a.id as appointment_id, 
// //         //            a.appointment_type, 
// //         //            a.date, 
// //         //            a.time,
// //         //            a.patient_id,
// //         //            a.updated_at,
// //         //            p.name as patient_name,
// //         //            p.pet_name,
// //         //            p.phone
// //         //     FROM appointments a
// //         //     JOIN patients p ON a.patient_id = p.id
// //         //     WHERE a.status = 'completed' 
// //         //       AND a.appointment_status = 'completed'
// //         //       AND (a.feedback_call_attempted IS NULL OR a.feedback_call_attempted = false)
// //         //       AND a.updated_at <= NOW() - INTERVAL '2 minutes'
// //         //     ORDER BY a.updated_at ASC
// //         //     LIMIT 10
// //         // `);
        

// //         // Get delay from environment (default 2 minutes)
// // const delayMinutes = process.env.FEEDBACK_CALL_DELAY_MINUTES || '2';

// // const [rows] = await db.execute(`
// //     SELECT a.id as appointment_id, 
// //            a.appointment_type, 
// //            a.date, 
// //            a.time,
// //            a.patient_id,
// //            a.updated_at,
// //            p.name as patient_name,
// //            p.pet_name,
// //            p.phone
// //     FROM appointments a
// //     JOIN patients p ON a.patient_id = p.id
// //     WHERE a.status = 'completed' 
// //       AND a.appointment_status = 'completed'
// //       AND (a.feedback_call_attempted IS NULL OR a.feedback_call_attempted = false)
// //       AND a.updated_at <= NOW() - INTERVAL '${delayMinutes} minutes'
// //     ORDER BY a.updated_at ASC
// //     LIMIT 10
// // `);



// //         if (rows.length === 0) {
// //             console.log('   No pending feedback calls to process');
// //             return;
// //         }
        
// //         console.log(`   Found ${rows.length} appointment(s) ready for feedback call`);
        
// //         for (const apt of rows) {
// //             console.log(`\n📞 Processing appointment ID ${apt.appointment_id}`);
            
// //             // Check time gap
// //             const updatedAt = new Date(apt.updated_at);
// //             const now = new Date();
// //             const diffMinutes = (now - updatedAt) / (1000 * 60);
// //             if (diffMinutes < 2) {
// //                 console.log(`   ⏳ Gap time (${diffMinutes.toFixed(1)} min) < 2 min, skipping`);
// //                 continue;
// //             }
// //             console.log(`   ✅ Gap time (${diffMinutes.toFixed(1)} min) >= 2 min, initiating call`);
            
// //             // Prepare data for outbound call
// //             const callData = {
// //                 phoneNumber: apt.phone,
// //                 patientName: apt.patient_name,
// //                 petName: apt.pet_name,
// //                 appointmentType: apt.appointment_type,
// //                 appointmentDate: apt.date,
// //                 appointmentTime: apt.time,
// //                 appointmentId: String(apt.appointment_id)
// //             };
            
// //             // Call Vapi outbound API (reuse initiateFeedbackCallDirect logic)
// //             try {
// //                 const result = await this._triggerOutboundCall(callData);
// //                 if (result.success) {
// //                     // Mark as attempted
// //                     await db.execute(`
// //                         UPDATE appointments 
// //                         SET feedback_call_attempted = true, 
// //                             feedback_call_attempted_at = NOW()
// //                         WHERE id = $1
// //                     `, [apt.appointment_id]);
// //                     console.log(`   ✅ Feedback call initiated successfully for appointment ${apt.appointment_id}`);
// //                 } else {
// //                     console.log(`   ❌ Failed to initiate call: ${result.error}`);
// //                     // Optionally mark as attempted anyway to avoid retry spam, or leave false
// //                 }
// //             } catch (err) {
// //                 console.error(`   ❌ Error initiating call: ${err.message}`);
// //             }
// //         }
        
// //     } catch (error) {
// //         console.error('Error in processPendingFeedbackCalls:', error);
// //     }
// // }

// // /**
// //  * Internal method to call Vapi API (shared logic)
// //  */
// // async _triggerOutboundCall(callData) {
// //     const vapiPayload = {
// //         assistantId: process.env.VAPI_FEEDBACK_ASSISTANT_ID,
// //         phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
// //         customer: { number: callData.phoneNumber },
// //         assistantOverrides: {
// //             variableValues: {
// //                 appointment_id: callData.appointmentId,
// //                 patient_name: callData.patientName,
// //                 pet_name: callData.petName,
// //                 appointment_type: callData.appointmentType,
// //                 appointment_date: callData.appointmentDate,
// //                 appointment_time: callData.appointmentTime
// //             }
// //         }
// //     };

// //     const response = await fetch(`${process.env.VAPI_API_BASE_URL}/call/phone`, {
// //         method: 'POST',
// //         headers: {
// //             'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
// //             'Content-Type': 'application/json'
// //         },
// //         body: JSON.stringify(vapiPayload)
// //     });

// //     if (!response.ok) {
// //         const errorText = await response.text();
// //         return { success: false, error: errorText };
// //     }

// //     const result = await response.json();
// //     return { success: true, data: result };
// // }




// // }













// // module.exports = new AppointmentController();















// const db = require('../config/database');
// const calendarService = require('../services/calendarService');
// const patientService = require('../services/patientService');
// const slotService = require('../services/slotService');
// const logger = require('../utils/logger');
// const EmailService = require('../services/emailService');

// // Helper to extract hospital_id from request (set by verifyToken middleware)
// const getHospitalId = (req) => {
//     return req.hospitalId || (req.user && req.user.hospital_id) || null;
// };

// class AppointmentController {

//     /**
//      * Book a new appointment (admin only)
//      * POST /api/admin/appointments
//      */
//     async bookAppointment(req, res, next) {
//         let connection;
//         try {
//             const hospitalId = getHospitalId(req);
//             if (!hospitalId) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'No hospital associated with this admin'
//                 });
//             }

//             const {
//                 patient_name,
//                 phone,
//                 email,
//                 is_new_patient,
//                 patient_id,
//                 pet_name,
//                 pet_species,
//                 pet_breed,
//                 pet_gender,
//                 pet_age,
//                 appointment_type,
//                 date,
//                 time,
//                 call_sid
//             } = req.body;

//             // Validate required fields
//             if (!patient_name || !phone || !appointment_type || !date || !time) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Missing required fields: patient_name, phone, appointment_type, date, time'
//                 });
//             }

//             // Validate appointment type
//             const validTypes = ['vaccination', 'consultation', 'follow-up', 'surgery'];
//             if (!validTypes.includes(appointment_type.toLowerCase())) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Invalid appointment type. Valid types: ${validTypes.join(', ')}`
//                 });
//             }

//             // Check if slot is available (slotService should be hospital‑aware? We'll assume it checks globally)
//             const isAvailable = await slotService.isSlotAvailable(date, time, appointment_type.toLowerCase());
//             if (!isAvailable) {
//                 return res.status(409).json({
//                     success: false,
//                     message: 'This time slot is no longer available. Please choose another time.'
//                 });
//             }

//             connection = await db.getConnection();
//             await connection.beginTransaction();

//             // Step 1: Handle patient record
//             let finalPatientId = patient_id;

//             if (is_new_patient || !finalPatientId) {
//                 const existingPatient = await patientService.findByPhone(phone);

//                 if (existingPatient.found) {
//                     finalPatientId = existingPatient.patient.id;
//                     logger.info(`Using existing patient: ID ${finalPatientId}`);
//                 } else {
//                     const [patientResult] = await connection.execute(
//                         `INSERT INTO patients (name, phone, email, pet_name, pet_species, pet_breed, pet_gender, pet_age, is_returning, created_at, updated_at)
//                          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())`,
//                         [patient_name, phone, email || null, pet_name, pet_species, pet_breed, pet_gender, pet_age]
//                     );
//                     finalPatientId = patientResult.insertId || patientResult.rows?.[0]?.id;
//                     logger.info(`New patient created: ID ${finalPatientId}`);
//                 }
//             } else {
//                 await connection.execute(
//                     `UPDATE patients SET 
//                         name = $1, 
//                         email = COALESCE($2, email),
//                         pet_name = COALESCE($3, pet_name),
//                         pet_species = COALESCE($4, pet_species),
//                         pet_breed = COALESCE($5, pet_breed),
//                         pet_gender = COALESCE($6, pet_gender),
//                         pet_age = COALESCE($7, pet_age),
//                         is_returning = true,
//                         updated_at = NOW()
//                      WHERE id = $8`,
//                     [patient_name, email, pet_name, pet_species, pet_breed, pet_gender, pet_age, finalPatientId]
//                 );
//                 logger.info(`Patient updated: ID ${finalPatientId}`);
//             }

//             // Step 2: Create Google Calendar event
//             let googleEventId = null;
//             try {
//                 const calendarResult = await calendarService.createEvent({
//                     patient_name,
//                     phone,
//                     pet_name: pet_name || 'N/A',
//                     pet_species: pet_species || 'N/A',
//                     pet_breed: pet_breed || 'N/A',
//                     appointment_type,
//                     date,
//                     time
//                 });
//                 googleEventId = calendarResult.eventId;
//                 logger.info(`Google Calendar event created: ${googleEventId}`);
//             } catch (calendarError) {
//                 logger.error('Google Calendar error:', calendarError);
//             }

//             // Step 3: Save appointment to database with hospital_id
//             const [appointmentResult] = await connection.execute(
//                 `INSERT INTO appointments (patient_id, google_event_id, appointment_type, date, time, status, notes, call_sid, hospital_id, created_at, updated_at)
//                  VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, $8, NOW(), NOW())`,
//                 [
//                     finalPatientId,
//                     googleEventId,
//                     appointment_type.toLowerCase(),
//                     date,
//                     time,
//                     `Booked via VAPI AI Assistant - ${pet_name || 'N/A'}`,
//                     call_sid || null,
//                     hospitalId   // ← set hospital_id from admin
//                 ]
//             );

//             const appointmentId = appointmentResult.insertId || appointmentResult.rows?.[0]?.id;
//             logger.info(`Appointment created: ID ${appointmentId}`);

//             await connection.commit();

//             // Send confirmation email (if email exists)
//             try {
//                 let patientEmail = email;
//                 if (!patientEmail && finalPatientId) {
//                     const [patientRows] = await connection.execute(
//                         `SELECT email FROM patients WHERE id = $1`,
//                         [finalPatientId]
//                     );
//                     patientEmail = patientRows[0]?.email;
//                 }
//                 if (patientEmail) {
//                     await EmailService.sendAppointmentConfirmationEmail({
//                         toEmail: patientEmail,
//                         patientName: patient_name,
//                         petName: pet_name,
//                         appointmentType: appointment_type,
//                         appointmentDate: date,
//                         appointmentTime: time,
//                         callSid: call_sid,
//                         appointmentId: appointmentId
//                     });
//                     logger.info(`Confirmation email sent to patient: ${patientEmail}`);
//                 } else {
//                     logger.info(`No email address for patient ID ${finalPatientId}, skipping confirmation email`);
//                 }
//             } catch (emailErr) {
//                 logger.error('Error sending confirmation email to patient:', emailErr);
//             }

//             return res.status(201).json({
//                 success: true,
//                 message: 'Appointment booked successfully',
//                 data: {
//                     appointment_id: appointmentId,
//                     patient_id: finalPatientId,
//                     google_event_id: googleEventId,
//                     appointment: {
//                         patient_name,
//                         pet_name: pet_name || 'N/A',
//                         appointment_type: appointment_type.toLowerCase(),
//                         date,
//                         time
//                     }
//                 }
//             });

//         } catch (error) {
//             if (connection) {
//                 await connection.rollback();
//             }
//             logger.error('Error booking appointment:', error);
//             next(error);
//         } finally {
//             if (connection) {
//                 connection.release();
//             }
//         }
//     }

//     /**
//      * Get patient's upcoming appointments (public, no admin filter needed)
//      * POST /api/appointments/lookup - Body: { phone }
//      * GET /api/appointments?phone=+12125551234
//      */
//     async getPatientAppointments(req, res, next) {
//         try {
//             const phone = (req.body.phone || req.query.phone || '').trim();

//             if (!phone) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Phone number is required'
//                 });
//             }

//             const [rows] = await db.execute(
//                 `SELECT a.*, p.name as patient_name, p.pet_name, p.pet_species, p.pet_breed
//                  FROM appointments a
//                  JOIN patients p ON a.patient_id = p.id
//                  WHERE p.phone = $1 
//                  AND a.status = 'confirmed' 
//                  AND a.date >= CURRENT_DATE
//                  ORDER BY a.date ASC, a.time ASC`,
//                 [phone]
//             );

//             return res.json({
//                 success: true,
//                 data: {
//                     upcoming_appointments: rows,
//                     total: rows.length
//                 }
//             });

//         } catch (error) {
//             logger.error('Error getting patient appointments:', error);
//             next(error);
//         }
//     }

//     /**
//      * Cancel an appointment (admin only)
//      * POST /api/admin/cancel - Body: { appointment_id }
//      * DELETE /api/admin/:id
//      */
//     async cancelAppointment(req, res, next) {
//         let connection;
//         try {
//             const hospitalId = getHospitalId(req);
//             if (!hospitalId) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'No hospital associated with this admin'
//                 });
//             }

//             const appointmentId = req.body.appointment_id || req.params.id;

//             if (!appointmentId) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Appointment ID is required'
//                 });
//             }

//             // Check appointment exists and belongs to this hospital
//             const [appointments] = await db.execute(
//                 `SELECT a.*, p.name as patient_name, p.pet_name, p.phone
//                  FROM appointments a
//                  JOIN patients p ON a.patient_id = p.id
//                  WHERE a.id = $1 AND a.hospital_id = $2`,
//                 [appointmentId, hospitalId]
//             );

//             if (appointments.length === 0) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Appointment not found or does not belong to your hospital'
//                 });
//             }

//             const appointment = appointments[0];

//             if (appointment.status === 'cancelled') {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Appointment is already cancelled'
//                 });
//             }

//             connection = await db.getConnection();
//             await connection.beginTransaction();

//             await connection.execute(
//                 `UPDATE appointments SET status = 'cancelled', appointment_status = 'cancelled', updated_at = NOW() WHERE id = $1`,
//                 [appointmentId]
//             );

//             if (appointment.google_event_id) {
//                 try {
//                     await calendarService.cancelEvent(appointment.google_event_id);
//                     logger.info(`Google Calendar event cancelled: ${appointment.google_event_id}`);
//                 } catch (calendarError) {
//                     logger.error('Error cancelling Google Calendar event:', calendarError);
//                 }
//             }

//             await connection.commit();

//             return res.json({
//                 success: true,
//                 message: 'Appointment cancelled successfully',
//                 data: {
//                     appointment_id: parseInt(appointmentId),
//                     patient_name: appointment.patient_name,
//                     pet_name: appointment.pet_name,
//                     date: appointment.date,
//                     time: appointment.time
//                 }
//             });

//         } catch (error) {
//             if (connection) {
//                 await connection.rollback();
//             }
//             logger.error('Error cancelling appointment:', error);
//             next(error);
//         } finally {
//             if (connection) {
//                 connection.release();
//             }
//         }
//     }

//     /**
//      * Get all appointments (admin only) - filtered by hospital_id
//      * GET /api/admin/all?date=2026-06-03&status=confirmed
//      */
//     async getAllAppointments(req, res, next) {
//         try {
//             const hospitalId = getHospitalId(req);
//             if (!hospitalId) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'No hospital associated with this admin'
//                 });
//             }

//             const { date, status, type, page = 1, limit = 50 } = req.query;
//             const offset = (page - 1) * limit;

//             let query = `
//                 SELECT a.*, p.name as patient_name, p.phone, p.pet_name, p.pet_species, p.pet_breed
//                 FROM appointments a
//                 JOIN patients p ON a.patient_id = p.id
//                 WHERE a.hospital_id = $1
//             `;
//             const params = [hospitalId];
//             let paramCount = 1;

//             if (date) {
//                 paramCount++;
//                 query += ` AND a.date = $${paramCount}`;
//                 params.push(date);
//             }

//             if (status) {
//                 paramCount++;
//                 query += ` AND a.status = $${paramCount}`;
//                 params.push(status);
//             }

//             if (type) {
//                 paramCount++;
//                 query += ` AND a.appointment_type = $${paramCount}`;
//                 params.push(type);
//             }

//             paramCount++;
//             query += ` ORDER BY a.date DESC, a.time DESC LIMIT $${paramCount}`;
//             params.push(parseInt(limit));

//             paramCount++;
//             query += ` OFFSET $${paramCount}`;
//             params.push(parseInt(offset));

//             const [rows] = await db.execute(query, params);

//             // Count query (same filters)
//             let countQuery = `SELECT COUNT(*) as total FROM appointments a WHERE a.hospital_id = $1`;
//             const countParams = [hospitalId];
//             let countParamNum = 1;

//             if (date) {
//                 countParamNum++;
//                 countQuery += ` AND a.date = $${countParamNum}`;
//                 countParams.push(date);
//             }
//             if (status) {
//                 countParamNum++;
//                 countQuery += ` AND a.status = $${countParamNum}`;
//                 countParams.push(status);
//             }
//             if (type) {
//                 countParamNum++;
//                 countQuery += ` AND a.appointment_type = $${countParamNum}`;
//                 countParams.push(type);
//             }

//             const [countResult] = await db.execute(countQuery, countParams);

//             return res.json({
//                 success: true,
//                 data: {
//                     appointments: rows,
//                     total: countResult[0].total,
//                     page: parseInt(page),
//                     totalPages: Math.ceil(countResult[0].total / limit)
//                 }
//             });

//         } catch (error) {
//             logger.error('Error getting all appointments:', error);
//             next(error);
//         }
//     }

//     /**
//      * Reschedule an appointment (admin only)
//      * POST /api/admin/reschedule
//      */
//     async rescheduleAppointment(req, res, next) {
//         let connection;

//         try {
//             const hospitalId = getHospitalId(req);
//             if (!hospitalId) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'No hospital associated with this admin'
//                 });
//             }

//             const {
//                 appointment_id,
//                 date,
//                 time
//             } = req.body;

//             if (!appointment_id || !date || !time) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'appointment_id, date and time are required'
//                 });
//             }

//             // Check appointment exists and belongs to this hospital
//             const [appointments] = await db.execute(
//                 `SELECT a.*, p.name as patient_name, p.pet_name
//                  FROM appointments a
//                  JOIN patients p ON a.patient_id = p.id
//                  WHERE a.id = $1 AND a.hospital_id = $2`,
//                 [appointment_id, hospitalId]
//             );

//             if (appointments.length === 0) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Appointment not found or does not belong to your hospital'
//                 });
//             }

//             const appointment = appointments[0];

//             if (appointment.status === 'cancelled') {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Cannot reschedule a cancelled appointment'
//                 });
//             }

//             const isAvailable = await slotService.isSlotAvailable(
//                 date,
//                 time,
//                 appointment.appointment_type
//             );

//             if (!isAvailable) {
//                 return res.status(409).json({
//                     success: false,
//                     message: 'Selected time slot is not available'
//                 });
//             }

//             connection = await db.getConnection();
//             await connection.beginTransaction();

//             await connection.execute(
//                 `UPDATE appointments
//                  SET date = $1,
//                      time = $2,
//                      appointment_status = 'rescheduled',
//                      updated_at = NOW()
//                  WHERE id = $3`,
//                 [date, time, appointment_id]
//             );

//             if (appointment.google_event_id) {
//                 try {
//                     await calendarService.updateEvent(
//                         appointment.google_event_id,
//                         {
//                             patient_name: appointment.patient_name,
//                             pet_name: appointment.pet_name || 'N/A',
//                             appointment_type: appointment.appointment_type,
//                             date,
//                             time
//                         }
//                     );
//                     logger.info(`Google Calendar event rescheduled: ${appointment.google_event_id}`);
//                 } catch (calendarError) {
//                     logger.error('Error rescheduling Google Calendar event:', calendarError);
//                 }
//             }

//             await connection.commit();

//             return res.json({
//                 success: true,
//                 message: 'Appointment rescheduled successfully',
//                 data: {
//                     appointment_id,
//                     date,
//                     time
//                 }
//             });

//         } catch (error) {
//             if (connection) {
//                 await connection.rollback();
//             }
//             logger.error('Error rescheduling appointment:', error);
//             next(error);
//         } finally {
//             if (connection) {
//                 connection.release();
//             }
//         }
//     }

//     /**
//      * Complete an appointment (admin only)
//      * POST /api/admin/complete
//      */
//     async completeAppointment(req, res, next) {
//         let connection;

//         try {
//             const hospitalId = getHospitalId(req);
//             if (!hospitalId) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'No hospital associated with this admin'
//                 });
//             }

//             const {
//                 appointment_id,
//                 notes = ''
//             } = req.body;

//             if (!appointment_id) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'appointment_id is required'
//                 });
//             }

//             // Check appointment exists and belongs to this hospital
//             const [appointments] = await db.execute(
//                 `SELECT a.*, p.name as patient_name, p.pet_name, p.phone as patient_phone
//                  FROM appointments a
//                  JOIN patients p ON a.patient_id = p.id
//                  WHERE a.id = $1 AND a.hospital_id = $2`,
//                 [appointment_id, hospitalId]
//             );

//             if (appointments.length === 0) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Appointment not found or does not belong to your hospital'
//                 });
//             }

//             const appointment = appointments[0];

//             if (appointment.status === 'completed') {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Appointment already completed'
//                 });
//             }

//             connection = await db.getConnection();
//             await connection.beginTransaction();

//             await connection.execute(
//                 `UPDATE appointments
//                  SET status = 'completed',
//                      appointment_status = 'completed',
//                      notes = COALESCE($1, notes),
//                      updated_at = NOW()
//                  WHERE id = $2`,
//                 [notes, appointment_id]
//             );

//             if (appointment.google_event_id) {
//                 try {
//                     await calendarService.markCompleted(appointment.google_event_id, notes);
//                     logger.info(`Google Calendar event completed: ${appointment.google_event_id}`);
//                 } catch (calendarError) {
//                     logger.error('Error completing Google Calendar event:', calendarError);
//                 }
//             }

//             await connection.commit();

//             return res.json({
//                 success: true,
//                 message: 'Appointment marked as completed',
//                 data: {
//                     appointment_id: appointment.id,
//                     patient_name: appointment.patient_name,
//                     pet_name: appointment.pet_name,
//                     notes: notes,
//                     phoneNumber: appointment.patient_phone,
//                     appointmentType: appointment.appointment_type,
//                     appointmentDate: appointment.date,
//                     appointmentTime: appointment.time
//                 }
//             });

//         } catch (error) {
//             if (connection) {
//                 await connection.rollback();
//             }
//             logger.error('Error completing appointment:', error);
//             next(error);
//         } finally {
//             if (connection) {
//                 connection.release();
//             }
//         }
//     }

//     /**
//      * Update appointment feedback fields (admin only)
//      * POST /api/admin/feedback
//      */
//     async appointmentFeedback(req, res, next) {
//         let connection;
//         try {
//             const hospitalId = getHospitalId(req);
//             if (!hospitalId) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'No hospital associated with this admin'
//                 });
//             }

//             const {
//                 appointment_id,
//                 feedback_call_initiated,
//                 feedback_call_picked,
//                 feedback_given,
//                 feedback_recording_url
//             } = req.body;

//             if (!appointment_id) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'appointment_id is required'
//                 });
//             }

//             // Verify appointment belongs to this hospital
//             const [existing] = await db.execute(
//                 `SELECT id FROM appointments WHERE id = $1 AND hospital_id = $2`,
//                 [appointment_id, hospitalId]
//             );
//             if (existing.length === 0) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Appointment not found or does not belong to your hospital'
//                 });
//             }

//             // Build dynamic update query
//             const updates = [];
//             const values = [];
//             let paramIndex = 1;

//             if (feedback_call_initiated !== undefined) {
//                 updates.push(`feedback_call_initiated = $${paramIndex++}`);
//                 values.push(feedback_call_initiated);
//             }
//             if (feedback_call_picked !== undefined) {
//                 updates.push(`feedback_call_picked = $${paramIndex++}`);
//                 values.push(feedback_call_picked);
//             }
//             if (feedback_given !== undefined) {
//                 updates.push(`feedback_given = $${paramIndex++}`);
//                 values.push(feedback_given);
//             }
//             if (feedback_recording_url !== undefined) {
//                 updates.push(`feedback_recording_url = $${paramIndex++}`);
//                 values.push(feedback_recording_url);
//             }

//             if (updates.length === 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'At least one feedback field is required'
//                 });
//             }

//             updates.push(`updated_at = NOW()`);
//             values.push(appointment_id);

//             connection = await db.getConnection();
//             await connection.beginTransaction();

//             await connection.execute(
//                 `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
//                 values
//             );

//             await connection.commit();

//             return res.json({
//                 success: true,
//                 message: 'Appointment feedback updated successfully',
//                 data: {
//                     appointment_id,
//                     updates: {
//                         ...(feedback_call_initiated !== undefined && { feedback_call_initiated }),
//                         ...(feedback_call_picked !== undefined && { feedback_call_picked }),
//                         ...(feedback_given !== undefined && { feedback_given }),
//                         ...(feedback_recording_url !== undefined && { feedback_recording_url })
//                     }
//                 }
//             });

//         } catch (error) {
//             if (connection) await connection.rollback();
//             logger.error('Error updating appointment feedback:', error);
//             next(error);
//         } finally {
//             if (connection) connection.release();
//         }
//     }

//     /**
//      * Initiate an outbound feedback call (admin only)
//      * POST /api/admin/feedback-call
//      */
//     async initiateFeedbackCallDirect(req, res, next) {
//         try {
//             const hospitalId = getHospitalId(req);
//             if (!hospitalId) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'No hospital associated with this admin'
//                 });
//             }

//             const {
//                 phoneNumber,
//                 patientName,
//                 petName,
//                 appointmentType,
//                 appointmentDate,
//                 appointmentTime,
//                 appointmentId
//             } = req.body;

//             // Validate required fields
//             if (!phoneNumber || !patientName || !petName || !appointmentType || !appointmentDate || !appointmentTime || !appointmentId) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Missing required fields: phoneNumber, patientName, petName, appointmentType, appointmentDate, appointmentTime, appointmentId'
//                 });
//             }

//             // Optionally verify appointment belongs to this hospital
//             const [appt] = await db.execute(
//                 `SELECT id FROM appointments WHERE id = $1 AND hospital_id = $2`,
//                 [appointmentId, hospitalId]
//             );
//             if (appt.length === 0) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Appointment not found or does not belong to your hospital'
//                 });
//             }

//             // Prepare Vapi API request
//             const vapiPayload = {
//                 assistantId: process.env.VAPI_FEEDBACK_ASSISTANT_ID,
//                 phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
//                 customer: { number: phoneNumber },
//                 assistantOverrides: {
//                     variableValues: {
//                         appointment_id: String(appointmentId),
//                         patient_name: patientName,
//                         pet_name: petName,
//                         appointment_type: appointmentType,
//                         appointment_date: appointmentDate,
//                         appointment_time: appointmentTime
//                     }
//                 }
//             };

//             const vapiResponse = await fetch(`${process.env.VAPI_API_BASE_URL}/call/phone`, {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify(vapiPayload)
//             });

//             if (!vapiResponse.ok) {
//                 const errorText = await vapiResponse.text();
//                 console.error('Vapi API error:', errorText);
//                 return res.status(vapiResponse.status).json({
//                     success: false,
//                     message: 'Failed to initiate outbound call',
//                     error: errorText
//                 });
//             }

//             const vapiResult = await vapiResponse.json();

//             return res.status(200).json({
//                 success: true,
//                 message: 'Outbound feedback call initiated',
//                 data: vapiResult
//             });

//         } catch (error) {
//             console.error('Error in initiateFeedbackCallDirect:', error);
//             next(error);
//         }
//     }

//     /**
//      * Cron job: Process pending feedback calls (no admin context, runs globally)
//      */
//     async processPendingFeedbackCalls() {
//         try {
//             console.log('🕒 Running feedback call cron job...');

//             const delayMinutes = process.env.FEEDBACK_CALL_DELAY_MINUTES || '2';

//             const [rows] = await db.execute(`
//                 SELECT a.id as appointment_id, 
//                        a.appointment_type, 
//                        a.date, 
//                        a.time,
//                        a.patient_id,
//                        a.updated_at,
//                        p.name as patient_name,
//                        p.pet_name,
//                        p.phone
//                 FROM appointments a
//                 JOIN patients p ON a.patient_id = p.id
//                 WHERE a.status = 'completed' 
//                   AND a.appointment_status = 'completed'
//                   AND (a.feedback_call_attempted IS NULL OR a.feedback_call_attempted = false)
//                   AND a.updated_at <= NOW() - INTERVAL '${delayMinutes} minutes'
//                 ORDER BY a.updated_at ASC
//                 LIMIT 10
//             `);

//             if (rows.length === 0) {
//                 console.log('   No pending feedback calls to process');
//                 return;
//             }

//             console.log(`   Found ${rows.length} appointment(s) ready for feedback call`);

//             for (const apt of rows) {
//                 console.log(`\n📞 Processing appointment ID ${apt.appointment_id}`);

//                 const updatedAt = new Date(apt.updated_at);
//                 const now = new Date();
//                 const diffMinutes = (now - updatedAt) / (1000 * 60);
//                 if (diffMinutes < 2) {
//                     console.log(`   ⏳ Gap time (${diffMinutes.toFixed(1)} min) < 2 min, skipping`);
//                     continue;
//                 }
//                 console.log(`   ✅ Gap time (${diffMinutes.toFixed(1)} min) >= 2 min, initiating call`);

//                 const callData = {
//                     phoneNumber: apt.phone,
//                     patientName: apt.patient_name,
//                     petName: apt.pet_name,
//                     appointmentType: apt.appointment_type,
//                     appointmentDate: apt.date,
//                     appointmentTime: apt.time,
//                     appointmentId: String(apt.appointment_id)
//                 };

//                 try {
//                     const result = await this._triggerOutboundCall(callData);
//                     if (result.success) {
//                         await db.execute(`
//                             UPDATE appointments 
//                             SET feedback_call_attempted = true, 
//                                 feedback_call_attempted_at = NOW()
//                             WHERE id = $1
//                         `, [apt.appointment_id]);
//                         console.log(`   ✅ Feedback call initiated successfully for appointment ${apt.appointment_id}`);
//                     } else {
//                         console.log(`   ❌ Failed to initiate call: ${result.error}`);
//                     }
//                 } catch (err) {
//                     console.error(`   ❌ Error initiating call: ${err.message}`);
//                 }
//             }

//         } catch (error) {
//             console.error('Error in processPendingFeedbackCalls:', error);
//         }
//     }

//     /**
//      * Internal method to call Vapi API (shared logic)
//      */
//     async _triggerOutboundCall(callData) {
//         const vapiPayload = {
//             assistantId: process.env.VAPI_FEEDBACK_ASSISTANT_ID,
//             phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
//             customer: { number: callData.phoneNumber },
//             assistantOverrides: {
//                 variableValues: {
//                     appointment_id: callData.appointmentId,
//                     patient_name: callData.patientName,
//                     pet_name: callData.petName,
//                     appointment_type: callData.appointmentType,
//                     appointment_date: callData.appointmentDate,
//                     appointment_time: callData.appointmentTime
//                 }
//             }
//         };

//         const response = await fetch(`${process.env.VAPI_API_BASE_URL}/call/phone`, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(vapiPayload)
//         });

//         if (!response.ok) {
//             const errorText = await response.text();
//             return { success: false, error: errorText };
//         }

//         const result = await response.json();
//         return { success: true, data: result };
//     }
// }

// module.exports = new AppointmentController();













const db = require('../config/database');
const calendarService = require('../services/calendarService');
const patientService = require('../services/patientService');
const slotService = require('../services/slotService');
const logger = require('../utils/logger');
const EmailService = require('../services/emailService');

// Helper to extract hospital_id from request (priority: token -> body -> query)
const getHospitalId = (req) => {
    // 1. From JWT token / user object
    const fromToken = req.hospitalId || (req.user && req.user.hospital_id);
    if (fromToken) return fromToken;

    // 2. From request body (for public API key calls)
    const fromBody = req.body?.hospital_id;
    if (fromBody) return parseInt(fromBody) || null;

    // 3. From query params
    const fromQuery = req.query?.hospital_id;
    if (fromQuery) return parseInt(fromQuery) || null;

    return null;
};

class AppointmentController {

    /**
     * Book a new appointment (admin or AI with API key)
     * POST /api/admin/appointments
     */
    async bookAppointment(req, res, next) {
        let connection;
        try {
            // Get hospital_id from request (body or token)
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
                patient_id,
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

            // Validate required fields
            if (!patient_name || !phone || !appointment_type || !date || !time) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: patient_name, phone, appointment_type, date, time'
                });
            }

            // Validate appointment type
            const validTypes = ['vaccination', 'consultation', 'follow-up', 'surgery'];
            if (!validTypes.includes(appointment_type.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid appointment type. Valid types: ${validTypes.join(', ')}`
                });
            }

            // Check if slot is available (hospital-aware)
            const isAvailable = await slotService.isSlotAvailable(
                date,
                time,
                appointment_type.toLowerCase(),
                hospitalId   // pass hospitalId to filter by hospital
            );
            if (!isAvailable) {
                return res.status(409).json({
                    success: false,
                    message: 'This time slot is no longer available. Please choose another time.'
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            // Step 1: Handle patient record
            let finalPatientId = patient_id;

            if (is_new_patient || !finalPatientId) {
                const existingPatient = await patientService.findByPhone(phone);

                if (existingPatient.found) {
                    finalPatientId = existingPatient.patient.id;
                    logger.info(`Using existing patient: ID ${finalPatientId}`);
                } else {
                    const [patientResult] = await connection.execute(
                        `INSERT INTO patients (name, phone, email, pet_name, pet_species, pet_breed, pet_gender, pet_age, is_returning, created_at, updated_at, hospital_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW(), $9)
                         RETURNING id`,
                        [patient_name, phone, email || null, pet_name, pet_species, pet_breed, pet_gender, pet_age, hospitalId]
                    );
                    finalPatientId = patientResult[0]?.id || patientResult.insertId;
                    logger.info(`New patient created: ID ${finalPatientId}`);
                }
            } else {
                await connection.execute(
                    `UPDATE patients SET 
                        name = $1, 
                        email = COALESCE($2, email),
                        pet_name = COALESCE($3, pet_name),
                        pet_species = COALESCE($4, pet_species),
                        pet_breed = COALESCE($5, pet_breed),
                        pet_gender = COALESCE($6, pet_gender),
                        pet_age = COALESCE($7, pet_age),
                        is_returning = true,
                        updated_at = NOW()
                     WHERE id = $8`,
                    [patient_name, email, pet_name, pet_species, pet_breed, pet_gender, pet_age, finalPatientId]
                );
                logger.info(`Patient updated: ID ${finalPatientId}`);
            }

            // Step 2: Create Google Calendar event (pass hospitalId)
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
                }, hospitalId);   // ← pass hospitalId
                googleEventId = calendarResult.eventId;
                logger.info(`Google Calendar event created: ${googleEventId}`);
            } catch (calendarError) {
                logger.error('Google Calendar error:', calendarError);
            }

            // Step 3: Save appointment to database with hospital_id
            const [appointmentResult] = await connection.execute(
                `INSERT INTO appointments (patient_id, google_event_id, appointment_type, date, time, status, notes, call_sid, hospital_id, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, $8, NOW(), NOW())
                 RETURNING id`,
                [
                    finalPatientId,
                    googleEventId,
                    appointment_type.toLowerCase(),
                    date,
                    time,
                    `Booked via VAPI AI Assistant - ${pet_name || 'N/A'}`,
                    call_sid || null,
                    hospitalId
                ]
            );

            const appointmentId = appointmentResult[0]?.id || appointmentResult.insertId;
            logger.info(`Appointment created: ID ${appointmentId}`);

            await connection.commit();

            // Send confirmation email (if email exists)
            try {
                let patientEmail = email;
                if (!patientEmail && finalPatientId) {
                    const [patientRows] = await connection.execute(
                        `SELECT email FROM patients WHERE id = $1`,
                        [finalPatientId]
                    );
                    patientEmail = patientRows[0]?.email;
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
                    logger.info(`No email address for patient ID ${finalPatientId}, skipping confirmation email`);
                }
            } catch (emailErr) {
                logger.error('Error sending confirmation email to patient:', emailErr);
            }

            return res.status(201).json({
                success: true,
                message: 'Appointment booked successfully',
                data: {
                    appointment_id: appointmentId,
                    patient_id: finalPatientId,
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
    }

    /**
     * Get patient's upcoming appointments (public, no admin filter needed)
     * POST /api/appointments/lookup - Body: { phone }
     * GET /api/appointments?phone=+12125551234
     */
    // async getPatientAppointments(req, res, next) {
    //     try {
    //         const phone = (req.body.phone || req.query.phone || '').trim();

    //         if (!phone) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Phone number is required'
    //             });
    //         }

    //         // Optional: filter by hospital if provided
    //         const hospitalId = getHospitalId(req);
    //         let query = `
    //             SELECT a.*, p.name as patient_name, p.pet_name, p.pet_species, p.pet_breed
    //             FROM appointments a
    //             JOIN patients p ON a.patient_id = p.id
    //             WHERE p.phone = $1 
    //             AND a.status = 'confirmed' 
    //             AND a.date >= CURRENT_DATE
    //         `;
    //         const params = [phone];
    //         if (hospitalId) {
    //             query += ` AND a.hospital_id = $${params.length + 1}`;
    //             params.push(hospitalId);
    //         }
    //         query += ` ORDER BY a.date ASC, a.time ASC`;

    //         const [rows] = await db.execute(query, params);

    //         return res.json({
    //             success: true,
    //             data: {
    //                 upcoming_appointments: rows,
    //                 total: rows.length
    //             }
    //         });

    //     } catch (error) {
    //         logger.error('Error getting patient appointments:', error);
    //         next(error);
    //     }
    // }


  async getPatientAppointments(req, res, next) {
    try {
        const phone = (req.body.phone || req.query.phone || '').trim();
        const hospitalId = getHospitalId(req);

        // Validate required fields
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

        // Build query – always filter by both phone AND hospital_id
        const query = `
            SELECT a.*, p.name as patient_name, p.pet_name, p.pet_species, p.pet_breed
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE p.phone = $1 
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
}



    /**
     * Cancel an appointment (admin or AI with API key)
     * POST /api/admin/cancel - Body: { appointment_id }
     * DELETE /api/admin/:id
     */
    async cancelAppointment(req, res, next) {
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

            // Check appointment exists and belongs to this hospital
            const [appointments] = await db.execute(
                `SELECT a.*, p.name as patient_name, p.pet_name, p.phone
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
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
                `UPDATE appointments SET status = 'cancelled', appointment_status = 'cancelled', updated_at = NOW() WHERE id = $1`,
                [appointmentId]
            );

            if (appointment.google_event_id) {
                try {
                    await calendarService.cancelEvent(appointment.google_event_id, hospitalId);  // ← pass hospitalId
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
    }

    /**
     * Get all appointments (admin only) - filtered by hospital_id
     * GET /api/admin/all?date=2026-06-03&status=confirmed
     */
    async getAllAppointments(req, res, next) {
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
                SELECT a.*, p.name as patient_name, p.phone, p.pet_name, p.pet_species, p.pet_breed
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
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

            // Count query (same filters)
            let countQuery = `SELECT COUNT(*) as total FROM appointments a WHERE a.hospital_id = $1`;
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
    }

    /**
     * Reschedule an appointment (admin or AI with API key)
     * POST /api/admin/reschedule
     */
    async rescheduleAppointment(req, res, next) {
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
                date,
                time
            } = req.body;

            if (!appointment_id || !date || !time) {
                return res.status(400).json({
                    success: false,
                    message: 'appointment_id, date and time are required'
                });
            }

            // Check appointment exists and belongs to this hospital
            const [appointments] = await db.execute(
                `SELECT a.*, p.name as patient_name, p.pet_name
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
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

            // Check availability for the new slot (hospital-aware)
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
                `UPDATE appointments
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
                        hospitalId   // ← pass hospitalId
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
                data: {
                    appointment_id,
                    date,
                    time
                }
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
    }

    /**
     * Complete an appointment (admin only)
     * POST /api/admin/complete
     */
    async completeAppointment(req, res, next) {
        let connection;

        try {
            const hospitalId = getHospitalId(req);
            if (!hospitalId) {
                return res.status(403).json({
                    success: false,
                    message: 'No hospital associated with this admin'
                });
            }

            const {
                appointment_id,
                notes = ''
            } = req.body;

            if (!appointment_id) {
                return res.status(400).json({
                    success: false,
                    message: 'appointment_id is required'
                });
            }

            // Check appointment exists and belongs to this hospital
            const [appointments] = await db.execute(
                `SELECT a.*, p.name as patient_name, p.pet_name, p.phone as patient_phone
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
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
                `UPDATE appointments
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
                        hospitalId   // ← pass hospitalId
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
    }

    // The following methods remain unchanged (no hospital_id needed, or they already use it)
    /**
     * Update appointment feedback fields (admin only)
     * POST /api/admin/feedback
     */

    async appointmentFeedback(req, res, next) {
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

        // Verify appointment exists and belongs to this hospital
        const [existing] = await db.execute(
            `SELECT id FROM appointments WHERE id = $1 AND hospital_id = $2`,
            [appointment_id, hospitalId]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to your hospital'
            });
        }

        // Build dynamic update query
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
            `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
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
}

    /**
     * Initiate an outbound feedback call (admin only)
     * POST /api/admin/feedback-call
     */
    async initiateFeedbackCallDirect(req, res, next) {
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

            // Validate required fields
            if (!phoneNumber || !patientName || !petName || !appointmentType || !appointmentDate || !appointmentTime || !appointmentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: phoneNumber, patientName, petName, appointmentType, appointmentDate, appointmentTime, appointmentId'
                });
            }

            // Optionally verify appointment belongs to this hospital
            const [appt] = await db.execute(
                `SELECT id FROM appointments WHERE id = $1 AND hospital_id = $2`,
                [appointmentId, hospitalId]
            );
            if (appt.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found or does not belong to your hospital'
                });
            }

            // Prepare Vapi API request
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
    }

    /**
     * Cron job: Process pending feedback calls (no admin context, runs globally)
     */
    async processPendingFeedbackCalls() {
        try {
            console.log('🕒 Running feedback call cron job...');

            const delayMinutes = process.env.FEEDBACK_CALL_DELAY_MINUTES || '2';

            const [rows] = await db.execute(`
                SELECT a.id as appointment_id, 
                       a.appointment_type, 
                       a.date, 
                       a.time,
                       a.patient_id,
                       a.updated_at,
                       p.name as patient_name,
                       p.pet_name,
                       p.phone
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                WHERE a.status = 'completed' 
                  AND a.appointment_status = 'completed'
                  AND (a.feedback_call_attempted IS NULL OR a.feedback_call_attempted = false)
                  AND a.updated_at <= NOW() - INTERVAL '${delayMinutes} minutes'
                ORDER BY a.updated_at ASC
                LIMIT 10
            `);

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
                    petName: apt.pet_name,
                    appointmentType: apt.appointment_type,
                    appointmentDate: apt.date,
                    appointmentTime: apt.time,
                    appointmentId: String(apt.appointment_id)
                };

                try {
                    const result = await this._triggerOutboundCall(callData);
                    if (result.success) {
                        await db.execute(`
                            UPDATE appointments 
                            SET feedback_call_attempted = true, 
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
    }

    /**
     * Internal method to call Vapi API (shared logic)
     */
    async _triggerOutboundCall(callData) {
        const vapiPayload = {
            assistantId: process.env.VAPI_FEEDBACK_ASSISTANT_ID,
            phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
            customer: { number: callData.phoneNumber },
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
}

module.exports = new AppointmentController();