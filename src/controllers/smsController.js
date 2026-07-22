
// src/controllers/smsController.js
const SmsService = require('../services/smsService');
const logger = require('../utils/logger');

// ─── Generic send (kept for flexibility) ──────────────────────────────
exports.sendSms = async (req, res) => {
    // ... (existing code unchanged)
};

// ─── 1. Appointment Booked ─────────────────────────────────────────────
exports.sendAppointmentBooked = async (req, res) => {
    try {
        const { to, patientName, pet_name, appointment_date, appointment_time, hospital_id } = req.body;

        if (!to || !patientName || !pet_name || !appointment_date || !appointment_time || !hospital_id) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const hospitalId = parseInt(hospital_id, 10);
        if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'Invalid hospital_id' });

        const message = `Hi ${patientName},

Thanks for scheduling an appointment at Broadlands Animal Hospital for ${pet_name} on ${appointment_date} at ${appointment_time}.

If you have any questions in the meantime, please call us at 571-707-8844 or visit us on https://broadlandsvethospital.com.

We look forward to seeing you soon,
Broadlands Animal Hospital`;

        const result = await SmsService.sendSms({ hospitalId, to, message });

        if (!result.success) return res.status(500).json({ success: false, error: result.error });

        logger.info(`Appointment booked SMS sent to ${to}`);
        return res.status(200).json({ success: true, data: { to, type: 'appointment_booked', hospital_id: hospitalId, sent: true } });

    } catch (error) {
        logger.error(`Error in sendAppointmentBooked: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
    }
};



// ─── 2. Appointment Cancelled (Single) ────────────────────────────────
exports.sendAppointmentCancelled = async (req, res) => {
    try {
        const { to, patientName, pet_name, appointment_date, appointment_time, hospital_id } = req.body;

        if (!to || !patientName || !pet_name || !appointment_date || !appointment_time || !hospital_id) {
            return res.status(400).json({ success: false, error: 'Missing required fields: to, patientName, pet_name, appointment_date, appointment_time, hospital_id' });
        }

        const hospitalId = parseInt(hospital_id, 10);
        if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'Invalid hospital_id' });

        const message = `Hi ${patientName},

This is a confirmation that your appointment for ${pet_name} on ${appointment_date} at ${appointment_time} at Broadlands Animal Hospital has been cancelled.

If you'd like to reschedule or have any questions, please call us at 571-707-8844 or visit us at https://broadlandsvethospital.com.

Thank you,
Broadlands Animal Hospital`;

        const result = await SmsService.sendSms({ hospitalId, to, message });

        if (!result.success) return res.status(500).json({ success: false, error: result.error });

        logger.info(`Single appointment cancellation SMS sent to ${to}`);
        return res.status(200).json({ success: true, data: { to, type: 'appointment_cancelled', hospital_id: hospitalId, sent: true } });

    } catch (error) {
        logger.error(`Error in sendAppointmentCancelled: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// ─── 3. Appointment Cancelled (Multiple) ──────────────────────────────
exports.sendMultiAppointmentCancelled = async (req, res) => {
    try {
        const { to, patientName, hospital_id, ...rest } = req.body;

        if (!to || !patientName || !hospital_id) {
            return res.status(400).json({ success: false, error: 'Missing required fields: to, patientName, hospital_id' });
        }

        const hospitalId = parseInt(hospital_id, 10);
        if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'Invalid hospital_id' });

        // ─── Validate at least two appointments ──────────────────────
        // Expect fields like pet_name, appointment_date, appointment_time
        // and pet_name2, appointment_date2, appointment_time2
        if (!rest.pet_name || !rest.appointment_date || !rest.appointment_time) {
            return res.status(400).json({ success: false, error: 'First appointment details required: pet_name, appointment_date, appointment_time' });
        }
        if (!rest.pet_name2 || !rest.appointment_date2 || !rest.appointment_time2) {
            return res.status(400).json({ success: false, error: 'Second appointment details required: pet_name2, appointment_date2, appointment_time2' });
        }

        // ─── Build generic "all cancelled" message ────────────────────
        const message = `Hi ${patientName},

This is a confirmation that all of your pet appointments have been cancelled.

If you'd like to reschedule or have any questions, please call us at 571-707-8844 or visit us at https://broadlandsvethospital.com.

Thank you,
Broadlands Animal Hospital`;

        const result = await SmsService.sendSms({ hospitalId, to, message });

        if (!result.success) return res.status(500).json({ success: false, error: result.error });

        logger.info(`Multiple appointment cancellation SMS sent to ${to}`);
        return res.status(200).json({ success: true, data: { to, type: 'multi_appointment_cancelled', hospital_id: hospitalId, sent: true } });

    } catch (error) {
        logger.error(`Error in sendMultiAppointmentCancelled: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
    }
};








// ─── 3. Technical Error ─────────────────────────────────────────────────
exports.sendTechnicalError = async (req, res) => {
    try {
        const { to, hospital_id } = req.body;
        if (!to || !hospital_id) return res.status(400).json({ success: false, error: 'Missing required fields' });

        const hospitalId = parseInt(hospital_id, 10);
        if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'Invalid hospital_id' });

        const message = `Hi there,

Your call to Broadlands Animal Hospital was interrupted due to a technical error. Please call us again after some time at 571-707-8844 or visit us on https://broadlandsvethospital.com.

Thank you,
Broadlands Animal Hospital`;

        const result = await SmsService.sendSms({ hospitalId, to, message });

        if (!result.success) return res.status(500).json({ success: false, error: result.error });

        logger.info(`Technical error SMS sent to ${to}`);
        return res.status(200).json({ success: true, data: { to, type: 'technical_error', hospital_id: hospitalId, sent: true } });

    } catch (error) {
        logger.error(`Error in sendTechnicalError: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// ─── 4. Query Submitted ─────────────────────────────────────────────────
exports.sendQuerySubmitted = async (req, res) => {
    try {
        const { to, hospital_id } = req.body;
        if (!to || !hospital_id) return res.status(400).json({ success: false, error: 'Missing required fields' });

        const hospitalId = parseInt(hospital_id, 10);
        if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'Invalid hospital_id' });

        const message = `Hi there,

Your query has been submitted successfully in our records. Our help desk team will assist you soon.

For any urgent concerns, please call us at 571-707-8844 or visit us on https://broadlandsvethospital.com.

Thank you,
Broadlands Animal Hospital`;

        const result = await SmsService.sendSms({ hospitalId, to, message });

        if (!result.success) return res.status(500).json({ success: false, error: result.error });

        logger.info(`Query submitted SMS sent to ${to}`);
        return res.status(200).json({ success: true, data: { to, type: 'query_submitted', hospital_id: hospitalId, sent: true } });

    } catch (error) {
        logger.error(`Error in sendQuerySubmitted: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
    }
};