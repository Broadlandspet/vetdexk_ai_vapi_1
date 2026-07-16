
// // src/controllers/smsController.js
// const SmsService = require('../services/smsService');
// const logger = require('../utils/logger');

// /**
//  * POST /api/sms/send
//  * Body: { to, type, message, hospital_id }
//  */
// exports.sendSms = async (req, res) => {
//     try {
//         const { to, type, message, hospital_id } = req.body;

//         // ─── Validate required fields ──────────────────────────────
//         if (!to) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'recipient phone number (to) is required'
//             });
//         }
//         if (!type) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'type is required (e.g., appointment_booked, call_interrupted, ai_not_assisting)'
//             });
//         }
//         if (!message) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'message text is required'
//             });
//         }
//         if (!hospital_id) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'hospital_id is required'
//             });
//         }

//         const hospitalId = parseInt(hospital_id, 10);
//         if (isNaN(hospitalId)) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'hospital_id must be a valid number'
//             });
//         }

//         // ─── Send SMS via service ──────────────────────────────────
//         const result = await SmsService.sendSms({
//             hospitalId: hospitalId,
//             to: to,
//             message: message,
//             transportType: 'twilio.sms',
//             useLLMGenerated: false
//         });

//         if (!result.success) {
//             return res.status(500).json({
//                 success: false,
//                 error: result.error
//             });
//         }

//         logger.info(`SMS sent for hospital ${hospitalId}, type: ${type}, to: ${to}`);

//         return res.status(200).json({
//             success: true,
//             data: {
//                 to: to,
//                 type: type,
//                 message: message,
//                 hospital_id: hospitalId,
//                 vapi_response: result.data
//             }
//         });

//     } catch (error) {
//         logger.error(`Error in sendSms: ${error.message}`);
//         return res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// };





// // ─── 1. Appointment Booked ─────────────────────────────────────────────
// exports.sendAppointmentBooked = async (req, res) => {
//     try {
//         const { to, type, patientName, pet_name, appointment_date, appointment_time, hospital_id } = req.body;

//         if (!to) return res.status(400).json({ success: false, error: 'recipient phone (to) is required' });
//         if (!patientName) return res.status(400).json({ success: false, error: 'patientName is required' });
//         if (!pet_name) return res.status(400).json({ success: false, error: 'pet_name is required' });
//         if (!appointment_date) return res.status(400).json({ success: false, error: 'appointment_date is required' });
//         if (!appointment_time) return res.status(400).json({ success: false, error: 'appointment_time is required' });
//         if (!hospital_id) return res.status(400).json({ success: false, error: 'hospital_id is required' });

//         const hospitalId = parseInt(hospital_id, 10);
//         if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'hospital_id must be a valid number' });

//         const message = `Hi ${patientName},

// Thanks for scheduling an appointment at Broadlands Animal Hospital for ${pet_name} on ${appointment_date} at ${appointment_time}.

// If you have any questions in the meantime, please call us at 571-707-8844 or visit us on https://broadlandsvethospital.com.

// We look forward to seeing you soon,
// Broadlands Animal Hospital`;

//         const result = await SmsService.sendSms({
//             hospitalId,
//             to,
//             message,
//             transportType: 'twilio.sms',
//             useLLMGenerated: false
//         });

//         if (!result.success) {
//             return res.status(500).json({ success: false, error: result.error });
//         }

//         logger.info(`Appointment booked SMS sent to ${to} for hospital ${hospitalId}`);
//         return res.status(200).json({
//             success: true,
//             data: {
//                 to,
//                 type: 'appointment_booked',
//                 hospital_id: hospitalId,
//                 vapi_response: result.data
//             }
//         });

//     } catch (error) {
//         logger.error(`Error in sendAppointmentBooked: ${error.message}`);
//         return res.status(500).json({ success: false, error: error.message });
//     }
// };

// // ─── 2. Appointment Cancelled ──────────────────────────────────────────
// exports.sendAppointmentCancelled = async (req, res) => {
//     try {
//         const { to, type, patientName, pet_name, appointment_date, appointment_time, hospital_id } = req.body;

//         if (!to) return res.status(400).json({ success: false, error: 'recipient phone (to) is required' });
//         if (!patientName) return res.status(400).json({ success: false, error: 'patientName is required' });
//         if (!pet_name) return res.status(400).json({ success: false, error: 'pet_name is required' });
//         if (!appointment_date) return res.status(400).json({ success: false, error: 'appointment_date is required' });
//         if (!appointment_time) return res.status(400).json({ success: false, error: 'appointment_time is required' });
//         if (!hospital_id) return res.status(400).json({ success: false, error: 'hospital_id is required' });

//         const hospitalId = parseInt(hospital_id, 10);
//         if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'hospital_id must be a valid number' });

//         const message = `Hi ${patientName},

// This is a confirmation that your appointment for ${pet_name} on ${appointment_date} at ${appointment_time} at Broadlands Animal Hospital has been cancelled.

// If you'd like to reschedule or have any questions, please call us at 571-707-8844 or visit us at https://broadlandsvethospital.com.

// Thank you,
// Broadlands Animal Hospital`;

//         const result = await SmsService.sendSms({
//             hospitalId,
//             to,
//             message,
//             transportType: 'twilio.sms',
//             useLLMGenerated: false
//         });

//         if (!result.success) {
//             return res.status(500).json({ success: false, error: result.error });
//         }

//         logger.info(`Appointment cancelled SMS sent to ${to} for hospital ${hospitalId}`);
//         return res.status(200).json({
//             success: true,
//             data: {
//                 to,
//                 type: 'appointment_cancelled',
//                 hospital_id: hospitalId,
//                 vapi_response: result.data
//             }
//         });

//     } catch (error) {
//         logger.error(`Error in sendAppointmentCancelled: ${error.message}`);
//         return res.status(500).json({ success: false, error: error.message });
//     }
// };

// // ─── 3. Technical Error ─────────────────────────────────────────────────
// exports.sendTechnicalError = async (req, res) => {
//     try {
//         const { to, type, hospital_id } = req.body;

//         if (!to) return res.status(400).json({ success: false, error: 'recipient phone (to) is required' });
//         if (!hospital_id) return res.status(400).json({ success: false, error: 'hospital_id is required' });

//         const hospitalId = parseInt(hospital_id, 10);
//         if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'hospital_id must be a valid number' });

//         const message = `Hi there,

// Your call to Broadlands Animal Hospital was interrupted due to a technical error. Please call us again after some time at 571-707-8844 or visit us on https://broadlandsvethospital.com.

// Thank you,
// Broadlands Animal Hospital`;

//         const result = await SmsService.sendSms({
//             hospitalId,
//             to,
//             message,
//             transportType: 'twilio.sms',
//             useLLMGenerated: false
//         });

//         if (!result.success) {
//             return res.status(500).json({ success: false, error: result.error });
//         }

//         logger.info(`Technical error SMS sent to ${to} for hospital ${hospitalId}`);
//         return res.status(200).json({
//             success: true,
//             data: {
//                 to,
//                 type: 'technical_error',
//                 hospital_id: hospitalId,
//                 vapi_response: result.data
//             }
//         });

//     } catch (error) {
//         logger.error(`Error in sendTechnicalError: ${error.message}`);
//         return res.status(500).json({ success: false, error: error.message });
//     }
// };

// // ─── 4. Query Submitted ─────────────────────────────────────────────────
// exports.sendQuerySubmitted = async (req, res) => {
//     try {
//         const { to, type, hospital_id } = req.body;

//         if (!to) return res.status(400).json({ success: false, error: 'recipient phone (to) is required' });
//         if (!hospital_id) return res.status(400).json({ success: false, error: 'hospital_id is required' });

//         const hospitalId = parseInt(hospital_id, 10);
//         if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'hospital_id must be a valid number' });

//         const message = `Hi there,

// Your query has been submitted successfully in our records. Our help desk team will assist you soon.

// For any urgent concerns, please call us at 571-707-8844 or visit us on https://broadlandsvethospital.com.

// Thank you,
// Broadlands Animal Hospital`;

//         const result = await SmsService.sendSms({
//             hospitalId,
//             to,
//             message,
//             transportType: 'twilio.sms',
//             useLLMGenerated: false
//         });

//         if (!result.success) {
//             return res.status(500).json({ success: false, error: result.error });
//         }

//         logger.info(`Query submitted SMS sent to ${to} for hospital ${hospitalId}`);
//         return res.status(200).json({
//             success: true,
//             data: {
//                 to,
//                 type: 'query_submitted',
//                 hospital_id: hospitalId,
//                 vapi_response: result.data
//             }
//         });

//     } catch (error) {
//         logger.error(`Error in sendQuerySubmitted: ${error.message}`);
//         return res.status(500).json({ success: false, error: error.message });
//     }
// };






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

// ─── 2. Appointment Cancelled (Single or Multiple) ────────────────────
// exports.sendAppointmentCancelled = async (req, res) => {
//     try {
//         const { to, patientName, hospital_id, appointments } = req.body;

//         if (!to || !patientName || !hospital_id) {
//             return res.status(400).json({ success: false, error: 'Missing required fields: to, patientName, hospital_id' });
//         }

//         // appointments can be an array of objects: [{ pet_name, date, time }, ...]
//         // If only one appointment, you can also send single fields directly for backward compatibility
//         let appointmentList = appointments;
//         if (!appointmentList || !Array.isArray(appointmentList) || appointmentList.length === 0) {
//             // Fallback: accept single appointment via separate fields
//             const { pet_name, appointment_date, appointment_time } = req.body;
//             if (!pet_name || !appointment_date || !appointment_time) {
//                 return res.status(400).json({ success: false, error: 'Either provide appointments array or single pet_name, appointment_date, appointment_time' });
//             }
//             appointmentList = [{ pet_name, date: appointment_date, time: appointment_time }];
//         }

//         const hospitalId = parseInt(hospital_id, 10);
//         if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'Invalid hospital_id' });

//         // Build message based on number of appointments
//         let message;
//         if (appointmentList.length === 1) {
//             const { pet_name, date, time } = appointmentList[0];
//             message = `Hi ${patientName},

// This is a confirmation that your appointment for ${pet_name} on ${date} at ${time} at Broadlands Animal Hospital has been cancelled.

// If you'd like to reschedule or have any questions, please call us at 571-707-8844 or visit us at https://broadlandsvethospital.com.

// Thank you,
// Broadlands Animal Hospital`;
//         } else {
//             // Multiple appointments
//             const petNames = appointmentList.map(a => a.pet_name).join(', ');
//             const dates = appointmentList.map(a => a.date).join(', ');
//             const times = appointmentList.map(a => a.time).join(', ');
//             // Alternative: list each appointment line by line
//             const details = appointmentList.map(a => `${a.pet_name} on ${a.date} at ${a.time}`).join('\n');

//             message = `Hi ${patientName},

// This is a confirmation that the following appointment(s) have been cancelled:

// ${details}

// If you'd like to reschedule or have any questions, please call us at 571-707-8844 or visit us at https://broadlandsvethospital.com.

// Thank you,
// Broadlands Animal Hospital`;
//         }

//         const result = await SmsService.sendSms({ hospitalId, to, message });

//         if (!result.success) return res.status(500).json({ success: false, error: result.error });

//         logger.info(`Appointment cancellation SMS sent to ${to} (${appointmentList.length} appointment(s))`);
//         return res.status(200).json({ success: true, data: { to, type: 'appointment_cancelled', hospital_id: hospitalId, sent: true } });

//     } catch (error) {
//         logger.error(`Error in sendAppointmentCancelled: ${error.message}`);
//         return res.status(500).json({ success: false, error: error.message });
//     }
// };




// exports.sendAppointmentCancelled = async (req, res) => {
//     try {
//         const { to, patientName, hospital_id, ...rest } = req.body;

//         if (!to || !patientName || !hospital_id) {
//             return res.status(400).json({ success: false, error: 'Missing required fields: to, patientName, hospital_id' });
//         }

//         const hospitalId = parseInt(hospital_id, 10);
//         if (isNaN(hospitalId)) return res.status(400).json({ success: false, error: 'Invalid hospital_id' });

//         // ─── Build appointment list from flat fields ──────────────────
//         const appointments = [];
//         let index = 1;
//         let petNameKey = 'pet_name';
//         let dateKey = 'appointment_date';
//         let timeKey = 'appointment_time';

//         while (rest[petNameKey] && rest[dateKey] && rest[timeKey]) {
//             appointments.push({
//                 pet_name: rest[petNameKey],
//                 date: rest[dateKey],
//                 time: rest[timeKey]
//             });
//             index++;
//             petNameKey = `pet_name${index}`;
//             dateKey = `appointment_date${index}`;
//             timeKey = `appointment_time${index}`;
//         }

//         if (appointments.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'At least one appointment is required. Provide pet_name, appointment_date, appointment_time.'
//             });
//         }

//         // ─── Build message ──────────────────────────────────────────────
//         let message;
//         if (appointments.length === 1) {
//             const { pet_name, date, time } = appointments[0];
//             message = `Hi ${patientName},

// This is a confirmation that your appointment for ${pet_name} on ${date} at ${time} at Broadlands Animal Hospital has been cancelled.

// If you'd like to reschedule or have any questions, please call us at 571-707-8844 or visit us at https://broadlandsvethospital.com.

// Thank you,
// Broadlands Animal Hospital`;
//         } else {
//             // ─── Multiple appointments – simplified message (no details) ───
//             message = `Hi ${patientName},

// This is a confirmation that all of your pet appointments have been cancelled.

// If you'd like to reschedule or have any questions, please call us at 571-707-8844 or visit us at https://broadlandsvethospital.com.

// Thank you,
// Broadlands Animal Hospital`;
//         }

//         // ─── Send SMS ──────────────────────────────────────────────────
//         const result = await SmsService.sendSms({ hospitalId, to, message });

//         if (!result.success) return res.status(500).json({ success: false, error: result.error });

//         logger.info(`Appointment cancellation SMS sent to ${to} (${appointments.length} appointment(s))`);
//         return res.status(200).json({ success: true, data: { to, type: 'appointment_cancelled', hospital_id: hospitalId, sent: true } });

//     } catch (error) {
//         logger.error(`Error in sendAppointmentCancelled: ${error.message}`);
//         return res.status(500).json({ success: false, error: error.message });
//     }
// };




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