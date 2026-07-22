// // // const slotService = require('../services/slotService');
// // // const logger = require('../utils/logger');

// // // // Helper to extract hospital_id from request (set by verifyToken middleware OR from body/query)
// // // const getHospitalId = (req) => {
// // //     // Priority: 1. From token/session, 2. From body, 3. From query
// // //     const fromToken = req.hospitalId || (req.user && req.user.hospital_id);
// // //     if (fromToken) return fromToken;
    
// // //     const fromBody = req.body?.hospital_id;
// // //     if (fromBody) return parseInt(fromBody) || null;
    
// // //     const fromQuery = req.query?.hospital_id;
// // //     if (fromQuery) return parseInt(fromQuery) || null;
    
// // //     return null;
// // // };

// // // class SlotController {

// // //     /**
// // //      * Get working hours (supports optional hospital_id for admin)
// // //      * GET /api/slots/working-hours?type=consultation
// // //      */
// // //     async getWorkingHours(req, res, next) {
// // //         try {
// // //             const type = (req.query.type || '').trim() || null;
// // //             const hospitalId = getHospitalId(req) || null;

// // //             const workingHours = await slotService.getWorkingHours(type, hospitalId);

// // //             return res.json({
// // //                 success: true,
// // //                 data: workingHours
// // //             });

// // //         } catch (error) {
// // //             logger.error('Error in getWorkingHours:', error);
// // //             next(error);
// // //         }
// // //     }

// // //     /**
// // //      * Get available slots for a date
// // //      * POST /api/slots - Body: { date, type, hospital_id? }
// // //      * GET /api/slots?date=2026-06-03&type=consultation&hospital_id=1
// // //      */
// // //     async getAvailableSlots(req, res, next) {
// // //         try {
// // //             const date = (req.body.date || req.query.date || '').trim();
// // //             const type = (req.body.type || req.query.type || '').trim();
// // //             const hospitalId = getHospitalId(req) || null;

// // //             if (!date) {
// // //                 return res.status(400).json({
// // //                     success: false,
// // //                     message: 'Date is required (YYYY-MM-DD)'
// // //                 });
// // //             }

// // //             if (!type) {
// // //                 return res.status(400).json({
// // //                     success: false,
// // //                     message: 'Appointment type is required'
// // //                 });
// // //             }

// // //             const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
// // //             if (!dateRegex.test(date)) {
// // //                 return res.status(400).json({
// // //                     success: false,
// // //                     message: `Invalid date format received: "${date}". Expected YYYY-MM-DD`
// // //                 });
// // //             }

// // //             const validTypes = ['vaccination', 'consultation', 'follow-up', 'surgery'];
// // //             const normalizedType = type.toLowerCase();

// // //             if (!validTypes.includes(normalizedType)) {
// // //                 return res.status(400).json({
// // //                     success: false,
// // //                     message: `Invalid appointment type. Valid types: ${validTypes.join(', ')}`
// // //                 });
// // //             }

// // //             const result = await slotService.getAvailableSlots(date, normalizedType, hospitalId);

// // //             // Remove spaces from time strings
// // //             if (result && result.available_slots && Array.isArray(result.available_slots)) {
// // //                 result.available_slots = result.available_slots.map(time => time.replace(/:\s+/g, ':'));
// // //                 console.log(`   ✅ Fixed ${result.available_slots.length} time slots (removed spaces)`);
// // //             }

// // //             if (result && result.working_hours) {
// // //                 if (result.working_hours.open) {
// // //                     result.working_hours.open = result.working_hours.open.replace(/:\s+/g, ':');
// // //                 }
// // //                 if (result.working_hours.close) {
// // //                     result.working_hours.close = result.working_hours.close.replace(/:\s+/g, ':');
// // //                 }
// // //             }

// // //             return res.json({
// // //                 success: true,
// // //                 data: result
// // //             });

// // //         } catch (error) {
// // //             logger.error('Error in getAvailableSlots:', error);
// // //             next(error);
// // //         }
// // //     }

// // //     /**
// // //      * Check if a specific slot is available
// // //      * POST /api/slots/check - Body: { date, time, type, hospital_id? }
// // //      * GET /api/slots/check?date=2026-06-03&time=2:30 PM&type=consultation&hospital_id=1
// // //      */
// // //     async checkSlot(req, res, next) {
// // //         try {
// // //             const date = (req.body.date || req.query.date || '').trim();
// // //             let time = (req.body.time || req.query.time || '').trim();
// // //             const type = (req.body.type || req.query.type || '').trim();
// // //             const hospitalId = getHospitalId(req) || null;

// // //             if (!date || !time || !type) {
// // //                 return res.status(400).json({
// // //                     success: false,
// // //                     message: 'Date, time, and type are required'
// // //                 });
// // //             }

// // //             time = time.replace(/:\s+/g, ':');

// // //             const isAvailable = await slotService.isSlotAvailable(
// // //                 date,
// // //                 time,
// // //                 type.toLowerCase(),
// // //                 hospitalId
// // //             );

// // //             return res.json({
// // //                 success: true,
// // //                 data: {
// // //                     date,
// // //                     time,
// // //                     type,
// // //                     available: isAvailable
// // //                 }
// // //             });

// // //         } catch (error) {
// // //             logger.error('Error in checkSlot:', error);
// // //             next(error);
// // //         }
// // //     }

// // //     /**
// // //      * Get available days for an appointment type
// // //      * GET /api/slots/available-days?type=consultation&hospital_id=1
// // //      */
// // //     async getAvailableDays(req, res, next) {
// // //         try {
// // //             const type = (req.query.type || '').trim() || null;
// // //             const hospitalId = getHospitalId(req) || null;

// // //             const workingHours = await slotService.getWorkingHours(type, hospitalId);

// // //             const availableDays = [];

// // //             for (const [day, hours] of Object.entries(workingHours)) {
// // //                 if (!hours.closed) {
// // //                     let openTime = hours.open;
// // //                     let closeTime = hours.close;
                    
// // //                     if (openTime) {
// // //                         openTime = openTime.replace(/:\s+/g, ':');
// // //                     }
// // //                     if (closeTime) {
// // //                         closeTime = closeTime.replace(/:\s+/g, ':');
// // //                     }
                    
// // //                     availableDays.push({
// // //                         day: day.charAt(0).toUpperCase() + day.slice(1),
// // //                         open: openTime,
// // //                         close: closeTime
// // //                     });
// // //                 }
// // //             }

// // //             return res.json({
// // //                 success: true,
// // //                 data: {
// // //                     appointment_type: type || 'all',
// // //                     available_days: availableDays,
// // //                     total_days: availableDays.length
// // //                 }
// // //             });

// // //         } catch (error) {
// // //             logger.error('Error in getAvailableDays:', error);
// // //             next(error);
// // //         }
// // //     }
// // // }

// // // module.exports = new SlotController();







// // const slotService = require('../services/slotService');
// // const logger = require('../utils/logger');

// // // Helper to extract hospital_id from request (set by verifyToken middleware OR from body/query)
// // const getHospitalId = (req) => {
// //     // Priority: 1. From token/session, 2. From body, 3. From query
// //     const fromToken = req.hospitalId || (req.user && req.user.hospital_id);
// //     if (fromToken) return fromToken;

// //     const fromBody = req.body?.hospital_id;
// //     if (fromBody) return parseInt(fromBody) || null;

// //     const fromQuery = req.query?.hospital_id;
// //     if (fromQuery) return parseInt(fromQuery) || null;

// //     return null;
// // };

// // // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// // /**
// //  * Get working hours (supports optional hospital_id for admin)
// //  * GET /api/slots/working-hours?type=consultation
// //  */
// // exports.getWorkingHours = async (req, res, next) => {
// //     try {
// //         const type = (req.query.type || '').trim() || null;
// //         const hospitalId = getHospitalId(req) || null;

// //         const workingHours = await slotService.getWorkingHours(type, hospitalId);

// //         return res.json({
// //             success: true,
// //             data: workingHours
// //         });

// //     } catch (error) {
// //         logger.error('Error in getWorkingHours:', error);
// //         next(error);
// //     }
// // };

// // /**
// //  * Get available slots for a date
// //  * POST /api/slots - Body: { date, type, hospital_id? }
// //  * GET /api/slots?date=2026-06-03&type=consultation&hospital_id=1
// //  */
// // exports.getAvailableSlots = async (req, res, next) => {
// //     try {
// //         const date = (req.body.date || req.query.date || '').trim();
// //         const type = (req.body.type || req.query.type || '').trim();
// //         const hospitalId = getHospitalId(req) || null;

// //         if (!date) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Date is required (YYYY-MM-DD)'
// //             });
// //         }

// //         if (!type) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Appointment type is required'
// //             });
// //         }

// //         const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
// //         if (!dateRegex.test(date)) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: `Invalid date format received: "${date}". Expected YYYY-MM-DD`
// //             });
// //         }

// //         const validTypes = ['vaccination', 'consultation', 'follow-up', 'surgery'];
// //         const normalizedType = type.toLowerCase();

// //         if (!validTypes.includes(normalizedType)) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: `Invalid appointment type. Valid types: ${validTypes.join(', ')}`
// //             });
// //         }

// //         const result = await slotService.getAvailableSlots(date, normalizedType, hospitalId);

// //         // Remove spaces from time strings
// //         if (result && result.available_slots && Array.isArray(result.available_slots)) {
// //             result.available_slots = result.available_slots.map(time => time.replace(/:\s+/g, ':'));
// //             console.log(`   ✅ Fixed ${result.available_slots.length} time slots (removed spaces)`);
// //         }

// //         if (result && result.working_hours) {
// //             if (result.working_hours.open) {
// //                 result.working_hours.open = result.working_hours.open.replace(/:\s+/g, ':');
// //             }
// //             if (result.working_hours.close) {
// //                 result.working_hours.close = result.working_hours.close.replace(/:\s+/g, ':');
// //             }
// //         }

// //         return res.json({
// //             success: true,
// //             data: result
// //         });

// //     } catch (error) {
// //         logger.error('Error in getAvailableSlots:', error);
// //         next(error);
// //     }
// // };

// // /**
// //  * Check if a specific slot is available
// //  * POST /api/slots/check - Body: { date, time, type, hospital_id? }
// //  * GET /api/slots/check?date=2026-06-03&time=2:30 PM&type=consultation&hospital_id=1
// //  */
// // exports.checkSlot = async (req, res, next) => {
// //     try {
// //         const date = (req.body.date || req.query.date || '').trim();
// //         let time = (req.body.time || req.query.time || '').trim();
// //         const type = (req.body.type || req.query.type || '').trim();
// //         const hospitalId = getHospitalId(req) || null;

// //         if (!date || !time || !type) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Date, time, and type are required'
// //             });
// //         }

// //         time = time.replace(/:\s+/g, ':');

// //         const isAvailable = await slotService.isSlotAvailable(
// //             date,
// //             time,
// //             type.toLowerCase(),
// //             hospitalId
// //         );

// //         return res.json({
// //             success: true,
// //             data: {
// //                 date,
// //                 time,
// //                 type,
// //                 available: isAvailable
// //             }
// //         });

// //     } catch (error) {
// //         logger.error('Error in checkSlot:', error);
// //         next(error);
// //     }
// // };

// // /**
// //  * Get available days for an appointment type
// //  * GET /api/slots/available-days?type=consultation&hospital_id=1
// //  */
// // exports.getAvailableDays = async (req, res, next) => {
// //     try {
// //         const type = (req.query.type || '').trim() || null;
// //         const hospitalId = getHospitalId(req) || null;

// //         const workingHours = await slotService.getWorkingHours(type, hospitalId);

// //         const availableDays = [];

// //         for (const [day, hours] of Object.entries(workingHours)) {
// //             if (!hours.closed) {
// //                 let openTime = hours.open;
// //                 let closeTime = hours.close;

// //                 if (openTime) {
// //                     openTime = openTime.replace(/:\s+/g, ':');
// //                 }
// //                 if (closeTime) {
// //                     closeTime = closeTime.replace(/:\s+/g, ':');
// //                 }

// //                 availableDays.push({
// //                     day: day.charAt(0).toUpperCase() + day.slice(1),
// //                     open: openTime,
// //                     close: closeTime
// //                 });
// //             }
// //         }

// //         return res.json({
// //             success: true,
// //             data: {
// //                 appointment_type: type || 'all',
// //                 available_days: availableDays,
// //                 total_days: availableDays.length
// //             }
// //         });

// //     } catch (error) {
// //         logger.error('Error in getAvailableDays:', error);
// //         next(error);
// //     }
// // };




// const slotService = require('../services/slotService');
// const logger = require('../utils/logger');

// // Helper to extract hospital_id from request (set by verifyToken middleware OR from body/query)
// const getHospitalId = (req) => {
//     // Priority: 1. From token/session, 2. From body, 3. From query
//     const fromToken = req.hospitalId || (req.user && req.user.hospital_id);
//     if (fromToken) return fromToken;

//     const fromBody = req.body?.hospital_id;
//     if (fromBody) return parseInt(fromBody) || null;

//     const fromQuery = req.query?.hospital_id;
//     if (fromQuery) return parseInt(fromQuery) || null;

//     return null;
// };

// // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// /**
//  * Get working hours (supports optional hospital_id for admin)
//  * GET /api/slots/working-hours?type=consultation
//  */
// exports.getWorkingHours = async (req, res, next) => {
//     try {
//         const type = (req.query.type || '').trim() || null;
//         const hospitalId = getHospitalId(req) || null;

//         const workingHours = await slotService.getWorkingHours(type, hospitalId);

//         return res.json({
//             success: true,
//             data: workingHours
//         });

//     } catch (error) {
//         logger.error('Error in getWorkingHours:', error);
//         next(error);
//     }
// };

// /**
//  * Get available slots for a date
//  * POST /api/slots - Body: { date, type, hospital_id? }
//  * GET /api/slots?date=2026-06-03&type=consultation&hospital_id=1
//  */
// exports.getAvailableSlots = async (req, res, next) => {
//     try {
//         const date = (req.body.date || req.query.date || '').trim();
//         const type = (req.body.type || req.query.type || '').trim();
//         const hospitalId = getHospitalId(req) || null;

//         if (!date) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Date is required (YYYY-MM-DD)'
//             });
//         }

//         if (!type) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Appointment type is required'
//             });
//         }

//         const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
//         if (!dateRegex.test(date)) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Invalid date format received: "${date}". Expected YYYY-MM-DD`
//             });
//         }

//         const validTypes = ['vaccination', 'consultation', 'follow-up', 'surgery'];
//         const normalizedType = type.toLowerCase();

//         if (!validTypes.includes(normalizedType)) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Invalid appointment type. Valid types: ${validTypes.join(', ')}`
//             });
//         }

//         const result = await slotService.getAvailableSlots(date, normalizedType, hospitalId);

//         // Remove spaces from time strings
//         if (result && result.available_slots && Array.isArray(result.available_slots)) {
//             result.available_slots = result.available_slots.map(time => time.replace(/:\s+/g, ':'));
//             console.log(`   ✅ Fixed ${result.available_slots.length} time slots (removed spaces)`);
//         }

//         if (result && result.working_hours) {
//             if (result.working_hours.open) {
//                 result.working_hours.open = result.working_hours.open.replace(/:\s+/g, ':');
//             }
//             if (result.working_hours.close) {
//                 result.working_hours.close = result.working_hours.close.replace(/:\s+/g, ':');
//             }
//         }

//         return res.json({
//             success: true,
//             data: result
//         });

//     } catch (error) {
//         logger.error('Error in getAvailableSlots:', error);
//         next(error);
//     }
// };

// /**
//  * Check if a specific slot is available
//  * POST /api/slots/check - Body: { date, time, type, hospital_id? }
//  * GET /api/slots/check?date=2026-06-03&time=2:30 PM&type=consultation&hospital_id=1
//  */
// exports.checkSlot = async (req, res, next) => {
//     try {
//         const date = (req.body.date || req.query.date || '').trim();
//         let time = (req.body.time || req.query.time || '').trim();
//         const type = (req.body.type || req.query.type || '').trim();
//         const hospitalId = getHospitalId(req) || null;

//         if (!date || !time || !type) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Date, time, and type are required'
//             });
//         }

//         time = time.replace(/:\s+/g, ':');

//         const isAvailable = await slotService.isSlotAvailable(
//             date,
//             time,
//             type.toLowerCase(),
//             hospitalId
//         );

//         return res.json({
//             success: true,
//             data: {
//                 date,
//                 time,
//                 type,
//                 available: isAvailable
//             }
//         });

//     } catch (error) {
//         logger.error('Error in checkSlot:', error);
//         next(error);
//     }
// };

// /**
//  * Get available days for an appointment type
//  * GET /api/slots/available-days?type=consultation&hospital_id=1
//  */
// exports.getAvailableDays = async (req, res, next) => {
//     try {
//         const type = (req.query.type || '').trim() || null;
//         const hospitalId = getHospitalId(req) || null;

//         const workingHours = await slotService.getWorkingHours(type, hospitalId);

//         const availableDays = [];

//         for (const [day, hours] of Object.entries(workingHours)) {
//             if (!hours.closed) {
//                 let openTime = hours.open;
//                 let closeTime = hours.close;

//                 if (openTime) {
//                     openTime = openTime.replace(/:\s+/g, ':');
//                 }
//                 if (closeTime) {
//                     closeTime = closeTime.replace(/:\s+/g, ':');
//                 }

//                 availableDays.push({
//                     day: day.charAt(0).toUpperCase() + day.slice(1),
//                     open: openTime,
//                     close: closeTime
//                 });
//             }
//         }

//         return res.json({
//             success: true,
//             data: {
//                 appointment_type: type || 'all',
//                 available_days: availableDays,
//                 total_days: availableDays.length
//             }
//         });

//     } catch (error) {
//         logger.error('Error in getAvailableDays:', error);
//         next(error);
//     }
// };




const slotService = require('../services/slotService');
const logger = require('../utils/logger');

// Helper to extract hospital_id from request (set by verifyToken middleware OR from body/query)
const getHospitalId = (req) => {
    // Priority: 1. From token/session, 2. From body, 3. From query
    const fromToken = req.hospitalId || (req.user && req.user.hospital_id);
    if (fromToken) return fromToken;

    const fromBody = req.body?.hospital_id;
    if (fromBody) return parseInt(fromBody) || null;

    const fromQuery = req.query?.hospital_id;
    if (fromQuery) return parseInt(fromQuery) || null;

    return null;
};

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get working hours (supports optional hospital_id for admin)
 * GET /api/slots/working-hours?type=consultation
 */
exports.getWorkingHours = async (req, res, next) => {
    try {
        const type = (req.query.type || '').trim() || null;
        const hospitalId = getHospitalId(req) || null;

        const workingHours = await slotService.getWorkingHours(type, hospitalId);

        return res.json({
            success: true,
            data: workingHours
        });

    } catch (error) {
        logger.error('Error in getWorkingHours:', error);
        next(error);
    }
};

/**
 * Get available slots for a date
 * POST /api/slots - Body: { date, type, hospital_id? }
 * GET /api/slots?date=2026-06-03&type=consultation&hospital_id=1
 */
exports.getAvailableSlots = async (req, res, next) => {
    try {
        const date = (req.body.date || req.query.date || '').trim();
        const type = (req.body.type || req.query.type || '').trim();
        const hospitalId = getHospitalId(req) || null;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date is required (YYYY-MM-DD)'
            });
        }

        if (!type) {
            return res.status(400).json({
                success: false,
                message: 'Appointment type is required'
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: `Invalid date format received: "${date}". Expected YYYY-MM-DD`
            });
        }

        const validTypes = ['vaccination', 'consultation', 'follow-up', 'surgery'];
        const normalizedType = type.toLowerCase();

        if (!validTypes.includes(normalizedType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid appointment type. Valid types: ${validTypes.join(', ')}`
            });
        }

        const result = await slotService.getAvailableSlots(date, normalizedType, hospitalId);

        // Remove spaces from time strings
        if (result && result.available_slots && Array.isArray(result.available_slots)) {
            result.available_slots = result.available_slots.map(time => time.replace(/:\s+/g, ':'));
            console.log(`   ✅ Fixed ${result.available_slots.length} time slots (removed spaces)`);
        }

        if (result && result.working_hours) {
            if (result.working_hours.open) {
                result.working_hours.open = result.working_hours.open.replace(/:\s+/g, ':');
            }
            if (result.working_hours.close) {
                result.working_hours.close = result.working_hours.close.replace(/:\s+/g, ':');
            }
        }

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Error in getAvailableSlots:', error);
        next(error);
    }
};

/**
 * Check if a specific slot is available
 * POST /api/slots/check - Body: { date, time, type, hospital_id? }
 * GET /api/slots/check?date=2026-06-03&time=2:30 PM&type=consultation&hospital_id=1
 */
exports.checkSlot = async (req, res, next) => {
    try {
        const date = (req.body.date || req.query.date || '').trim();
        let time = (req.body.time || req.query.time || '').trim();
        const type = (req.body.type || req.query.type || '').trim();
        const hospitalId = getHospitalId(req) || null;

        if (!date || !time || !type) {
            return res.status(400).json({
                success: false,
                message: 'Date, time, and type are required'
            });
        }

        time = time.replace(/:\s+/g, ':');

        const isAvailable = await slotService.isSlotAvailable(
            date,
            time,
            type.toLowerCase(),
            hospitalId
        );

        return res.json({
            success: true,
            data: {
                date,
                time,
                type,
                available: isAvailable
            }
        });

    } catch (error) {
        logger.error('Error in checkSlot:', error);
        next(error);
    }
};

/**
 * Get available days for an appointment type
 * GET /api/slots/available-days?type=consultation&hospital_id=1
 */
exports.getAvailableDays = async (req, res, next) => {
    try {
        const type = (req.query.type || '').trim() || null;
        const hospitalId = getHospitalId(req) || null;

        const workingHours = await slotService.getWorkingHours(type, hospitalId);

        const availableDays = [];

        for (const [day, hours] of Object.entries(workingHours)) {
            if (!hours.closed) {
                let openTime = hours.open;
                let closeTime = hours.close;

                if (openTime) {
                    openTime = openTime.replace(/:\s+/g, ':');
                }
                if (closeTime) {
                    closeTime = closeTime.replace(/:\s+/g, ':');
                }

                availableDays.push({
                    day: day.charAt(0).toUpperCase() + day.slice(1),
                    open: openTime,
                    close: closeTime
                });
            }
        }

        return res.json({
            success: true,
            data: {
                appointment_type: type || 'all',
                available_days: availableDays,
                total_days: availableDays.length
            }
        });

    } catch (error) {
        logger.error('Error in getAvailableDays:', error);
        next(error);
    }
};