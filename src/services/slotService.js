
// // const db = require('../config/database');
// // const calendarService = require('./calendarService');
// // const logger = require('../utils/logger');

// // class SlotService {

// //     /**
// //      * Get working hours for a specific appointment type and hospital
// //      * @param {string|null} appointmentType - 'consultation', 'vaccination', etc.
// //      * @param {number|null} hospitalId - optional hospital ID (admin scope)
// //      */
// //     async getWorkingHours(appointmentType = null, hospitalId = null) {
// //         try {
// //             const pgPool = db.getPgPool();
            
// //             let query = 'SELECT * FROM working_hours WHERE is_open = true';
// //             const params = [];

// //             if (appointmentType) {
// //                 query += ' AND (appointment_type = $1 OR appointment_type = $2)';
// //                 params.push(appointmentType, 'all');
// //             }

// //             if (hospitalId) {
// //                 query += ` AND hospital_id = $${params.length + 1}`;
// //                 params.push(hospitalId);
// //             }

// //             query += ` ORDER BY 
// //                 CASE day_of_week
// //                     WHEN 'Monday' THEN 1
// //                     WHEN 'Tuesday' THEN 2
// //                     WHEN 'Wednesday' THEN 3
// //                     WHEN 'Thursday' THEN 4
// //                     WHEN 'Friday' THEN 5
// //                     WHEN 'Saturday' THEN 6
// //                     WHEN 'Sunday' THEN 7
// //                 END`;

// //             const result = await pgPool.query(query, params);
// //             const rows = result.rows;

// //             // Format the response
// //             const workingHours = {
// //                 monday: { closed: true, open: null, close: null },
// //                 tuesday: { closed: true, open: null, close: null },
// //                 wednesday: { closed: true, open: null, close: null },
// //                 thursday: { closed: true, open: null, close: null },
// //                 friday: { closed: true, open: null, close: null },
// //                 saturday: { closed: true, open: null, close: null },
// //                 sunday: { closed: true, open: null, close: null }
// //             };

// //             for (const row of rows) {
// //                 const day = row.day_of_week.toLowerCase();
// //                 workingHours[day] = {
// //                     closed: false,
// //                     open: row.open_time ? row.open_time.substring(0, 5) : null,
// //                     close: row.close_time ? row.close_time.substring(0, 5) : null
// //                 };
// //             }

// //             return workingHours;

// //         } catch (error) {
// //             logger.error('Error getting working hours:', error);
// //             throw new Error(`Failed to get working hours: ${error.message}`);
// //         }
// //     }

// //     /**
// //      * Get available time slots for a specific date and appointment type
// //      * @param {string} date - YYYY-MM-DD
// //      * @param {string} appointmentType - 'consultation', 'vaccination', etc.
// //      * @param {number|null} hospitalId - optional hospital ID (admin scope)
// //      */
    

// // async getAvailableSlots(date, appointmentType, hospitalId = null) {
// //     try {
// //         const dayOfWeek = this._getDayOfWeek(date);
// //         const workingHours = await this._getWorkingHoursForDay(dayOfWeek, appointmentType, hospitalId);
        
// //         if (!workingHours || workingHours.closed) {
// //             return {
// //                 date: date,
// //                 day_of_week: dayOfWeek,
// //                 available_slots: [],
// //                 message: 'Clinic is closed on this day'
// //             };
// //         }

// //         const allSlots = this._generateTimeSlots(workingHours.open, workingHours.close);
// //         const dbBookedSlots = await this._getDbBookedSlots(date, hospitalId);
        
// //         let calendarBusySlots = [];
// //         try {
// //             // ✅ PASS hospitalId
// //             calendarBusySlots = await calendarService.checkFreeBusy(date, hospitalId);
// //         } catch (error) {
// //             logger.warn('Could not check Google Calendar, proceeding with DB only');
// //         }

// //         const allBusySlots = this._mergeBusySlots(dbBookedSlots, calendarBusySlots, date);
        
// //         const availableSlots = allSlots.filter(slot => {
// //             return !this._isSlotBusy(slot, allBusySlots, date);
// //         });

// //         const formattedSlots = availableSlots.map(slot => 
// //             this._formatTime(slot)
// //         );

// //         return {
// //             date: date,
// //             day_of_week: dayOfWeek,
// //             available_slots: formattedSlots,
// //             total_available: formattedSlots.length,
// //             working_hours: {
// //                 open: workingHours.open,
// //                 close: workingHours.close
// //             }
// //         };

// //     } catch (error) {
// //         logger.error('Error getting available slots:', error);
// //         throw new Error(`Failed to get available slots: ${error.message}`);
// //     }
// // }


// //     /**
// //      * Check if a specific slot is available
// //      * @param {string} date - YYYY-MM-DD
// //      * @param {string} time - e.g. "2:30 PM"
// //      * @param {string} appointmentType
// //      * @param {number|null} hospitalId - optional
// //      */
// //     async isSlotAvailable(date, time, appointmentType, hospitalId = null) {
// //         try {
// //             const result = await this.getAvailableSlots(date, appointmentType, hospitalId);
// //             return result.available_slots.includes(time);
// //         } catch (error) {
// //             logger.error('Error checking slot availability:', error);
// //             return false;
// //         }
// //     }

// //     /**
// //      * Get working hours for a specific day
// //      * @param {string} dayOfWeek - e.g. 'Monday'
// //      * @param {string} appointmentType
// //      * @param {number|null} hospitalId - optional
// //      */
// //     async _getWorkingHoursForDay(dayOfWeek, appointmentType, hospitalId = null) {
// //         try {
// //             const pgPool = db.getPgPool();
            
// //             let query = `SELECT * FROM working_hours 
// //                          WHERE day_of_week = $1 
// //                          AND is_open = true 
// //                          AND (appointment_type = $2 OR appointment_type = 'all')`;
// //             const params = [dayOfWeek, appointmentType];

// //             if (hospitalId) {
// //                 query += ` AND hospital_id = $3`;
// //                 params.push(hospitalId);
// //             }

// //             query += ` LIMIT 1`;

// //             const result = await pgPool.query(query, params);

// //             if (result.rows.length === 0) {
// //                 return null;
// //             }

// //             const row = result.rows[0];
// //             return {
// //                 closed: false,
// //                 open: row.open_time ? row.open_time.substring(0, 5) : null,
// //                 close: row.close_time ? row.close_time.substring(0, 5) : null,
// //                 slot_duration: row.slot_duration || 30
// //             };

// //         } catch (error) {
// //             logger.error('Error getting working hours for day:', error);
// //             return null;
// //         }
// //     }

// //     /**
// //      * Generate all possible time slots between open and close
// //      */
// //     _generateTimeSlots(openTime, closeTime, durationMinutes = 30) {
// //         const slots = [];
        
// //         const [openHour, openMin] = openTime.split(':').map(Number);
// //         const [closeHour, closeMin] = closeTime.split(':').map(Number);
        
// //         let currentHour = openHour;
// //         let currentMin = openMin;
        
// //         const closeTotalMinutes = closeHour * 60 + closeMin;
        
// //         while ((currentHour * 60 + currentMin + durationMinutes) <= closeTotalMinutes) {
// //             slots.push({
// //                 hours: currentHour,
// //                 minutes: currentMin
// //             });
            
// //             currentMin += durationMinutes;
// //             if (currentMin >= 60) {
// //                 currentHour += Math.floor(currentMin / 60);
// //                 currentMin = currentMin % 60;
// //             }
// //         }
        
// //         return slots;
// //     }

// //     /**
// //      * Get booked slots from database (filtered by hospital if provided)
// //      * @param {string} date
// //      * @param {number|null} hospitalId - optional
// //      */
// //     async _getDbBookedSlots(date, hospitalId = null) {
// //         try {
// //             const pgPool = db.getPgPool();
            
// //             let query = `SELECT time, appointment_type FROM appointments 
// //                          WHERE date = $1 AND status = 'confirmed'`;
// //             const params = [date];

// //             if (hospitalId) {
// //                 query += ` AND hospital_id = $2`;
// //                 params.push(hospitalId);
// //             }

// //             const result = await pgPool.query(query, params);

// //             return result.rows.map(row => {
// //                 const timeParts = row.time.match(/(\d+):(\d+)/);
// //                 if (timeParts) {
// //                     return {
// //                         hours: parseInt(timeParts[1]),
// //                         minutes: parseInt(timeParts[2]),
// //                         appointment_type: row.appointment_type
// //                     };
// //                 }
// //                 return null;
// //             }).filter(Boolean);

// //         } catch (error) {
// //             logger.error('Error getting DB booked slots:', error);
// //             return [];
// //         }
// //     }

// //     /**
// //      * Merge busy slots from DB and Google Calendar
// //      */
// //     _mergeBusySlots(dbSlots, calendarSlots, date) {
// //         const busySet = new Set();
        
// //         for (const slot of dbSlots) {
// //             busySet.add(`${slot.hours}:${slot.minutes}`);
// //         }
        
// //         for (const busySlot of calendarSlots) {
// //             const startDate = new Date(busySlot.start);
// //             const endDate = new Date(busySlot.end);
            
// //             const slotDate = startDate.toISOString().split('T')[0];
// //             if (slotDate === date) {
// //                 const startHour = startDate.getHours();
// //                 const startMin = startDate.getMinutes();
// //                 const endHour = endDate.getHours();
// //                 const endMin = endDate.getMinutes();
                
// //                 let hour = startHour;
// //                 let min = startMin;
// //                 const endTotal = endHour * 60 + endMin;
                
// //                 while ((hour * 60 + min) < endTotal) {
// //                     busySet.add(`${hour}:${min}`);
// //                     min += 30;
// //                     if (min >= 60) {
// //                         hour += 1;
// //                         min = 0;
// //                     }
// //                 }
// //             }
// //         }
        
// //         const busySlots = [];
// //         for (const slotKey of busySet) {
// //             const [h, m] = slotKey.split(':').map(Number);
// //             busySlots.push({ hours: h, minutes: m });
// //         }
        
// //         return busySlots;
// //     }

// //     /**
// //      * Check if a specific slot is busy
// //      */
// //     _isSlotBusy(slot, busySlots, date) {
// //         return busySlots.some(busy => 
// //             busy.hours === slot.hours && busy.minutes === slot.minutes
// //         );
// //     }

// //     /**
// //      * Format time for display
// //      * FIXED: Removes extra spaces in time formatting
// //      */
// //     _formatTime(slot) {
// //         const { hours, minutes } = slot;
// //         const period = hours >= 12 ? 'PM' : 'AM';
// //         let displayHour = hours % 12;
// //         displayHour = displayHour === 0 ? 12 : displayHour;
// //         const displayMin = String(minutes).padStart(2, '0');
// //         return `${displayHour}:${displayMin} ${period}`;
// //     }

// //     /**
// //      * Get day of week from date string
// //      */
// //     _getDayOfWeek(dateStr) {
// //         const date = new Date(dateStr);
// //         const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// //         return days[date.getDay()];
// //     }
// // }

// // module.exports = new SlotService();








// const db = require('../config/database');
// const calendarService = require('./calendarService');
// const logger = require('../utils/logger');

// // ─── Internal helper functions ──────────────────────────────────────────────────

// function _getDayOfWeek(dateStr) {
//     const date = new Date(dateStr);
//     const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//     return days[date.getDay()];
// }

// function _generateTimeSlots(openTime, closeTime, durationMinutes = 30) {
//     const slots = [];
//     const [openHour, openMin] = openTime.split(':').map(Number);
//     const [closeHour, closeMin] = closeTime.split(':').map(Number);
//     let currentHour = openHour;
//     let currentMin = openMin;
//     const closeTotalMinutes = closeHour * 60 + closeMin;
//     while ((currentHour * 60 + currentMin + durationMinutes) <= closeTotalMinutes) {
//         slots.push({ hours: currentHour, minutes: currentMin });
//         currentMin += durationMinutes;
//         if (currentMin >= 60) {
//             currentHour += Math.floor(currentMin / 60);
//             currentMin = currentMin % 60;
//         }
//     }
//     return slots;
// }

// function _formatTime(slot) {
//     const { hours, minutes } = slot;
//     const period = hours >= 12 ? 'PM' : 'AM';
//     let displayHour = hours % 12;
//     displayHour = displayHour === 0 ? 12 : displayHour;
//     const displayMin = String(minutes).padStart(2, '0');
//     return `${displayHour}:${displayMin} ${period}`;
// }

// function _isSlotBusy(slot, busySlots) {
//     return busySlots.some(busy => busy.hours === slot.hours && busy.minutes === slot.minutes);
// }

// function _mergeBusySlots(dbSlots, calendarSlots, date) {
//     const busySet = new Set();
//     for (const slot of dbSlots) {
//         busySet.add(`${slot.hours}:${slot.minutes}`);
//     }
//     for (const busySlot of calendarSlots) {
//         const startDate = new Date(busySlot.start);
//         const endDate = new Date(busySlot.end);
//         const slotDate = startDate.toISOString().split('T')[0];
//         if (slotDate === date) {
//             const startHour = startDate.getHours();
//             const startMin = startDate.getMinutes();
//             const endHour = endDate.getHours();
//             const endMin = endDate.getMinutes();
//             let hour = startHour;
//             let min = startMin;
//             const endTotal = endHour * 60 + endMin;
//             while ((hour * 60 + min) < endTotal) {
//                 busySet.add(`${hour}:${min}`);
//                 min += 30;
//                 if (min >= 60) {
//                     hour += 1;
//                     min = 0;
//                 }
//             }
//         }
//     }
//     const busySlots = [];
//     for (const slotKey of busySet) {
//         const [h, m] = slotKey.split(':').map(Number);
//         busySlots.push({ hours: h, minutes: m });
//     }
//     return busySlots;
// }

// async function _getWorkingHoursForDay(dayOfWeek, appointmentType, hospitalId = null) {
//     try {
//         const pgPool = db.getPgPool();
//         let query = `SELECT * FROM working_hours 
//                      WHERE day_of_week = $1 
//                      AND is_open = true 
//                      AND (appointment_type = $2 OR appointment_type = 'all')`;
//         const params = [dayOfWeek, appointmentType];
//         if (hospitalId) {
//             query += ` AND hospital_id = $3`;
//             params.push(hospitalId);
//         }
//         query += ` LIMIT 1`;
//         const result = await pgPool.query(query, params);
//         if (result.rows.length === 0) return null;
//         const row = result.rows[0];
//         return {
//             closed: false,
//             open: row.open_time ? row.open_time.substring(0, 5) : null,
//             close: row.close_time ? row.close_time.substring(0, 5) : null,
//             slot_duration: row.slot_duration || 30
//         };
//     } catch (error) {
//         logger.error('Error getting working hours for day:', error);
//         return null;
//     }
// }

// async function _getDbBookedSlots(date, hospitalId = null) {
//     try {
//         const pgPool = db.getPgPool();
//         // let query = `SELECT time, appointment_type FROM appointments 
//         //              WHERE date = $1 AND status = 'confirmed'`;

//         let query = `SELECT time, appointment_type FROM ezy_vet_appointments   -- 👈 Updated
//              WHERE date = $1 AND status = 'confirmed'`;
//         const params = [date];
//         if (hospitalId) {
//             query += ` AND hospital_id = $2`;
//             params.push(hospitalId);
//         }
//         const result = await pgPool.query(query, params);
//         return result.rows.map(row => {
//             const timeParts = row.time.match(/(\d+):(\d+)/);
//             if (timeParts) {
//                 return {
//                     hours: parseInt(timeParts[1]),
//                     minutes: parseInt(timeParts[2]),
//                     appointment_type: row.appointment_type
//                 };
//             }
//             return null;
//         }).filter(Boolean);
//     } catch (error) {
//         logger.error('Error getting DB booked slots:', error);
//         return [];
//     }
// }

// // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// /**
//  * Get working hours for a specific appointment type and hospital
//  * @param {string|null} appointmentType - 'consultation', 'vaccination', etc.
//  * @param {number|null} hospitalId - optional hospital ID (admin scope)
//  */
// exports.getWorkingHours = async (appointmentType = null, hospitalId = null) => {
//     try {
//         const pgPool = db.getPgPool();
        
//         let query = 'SELECT * FROM working_hours WHERE is_open = true';
//         const params = [];

//         if (appointmentType) {
//             query += ' AND (appointment_type = $1 OR appointment_type = $2)';
//             params.push(appointmentType, 'all');
//         }

//         if (hospitalId) {
//             query += ` AND hospital_id = $${params.length + 1}`;
//             params.push(hospitalId);
//         }

//         query += ` ORDER BY 
//             CASE day_of_week
//                 WHEN 'Monday' THEN 1
//                 WHEN 'Tuesday' THEN 2
//                 WHEN 'Wednesday' THEN 3
//                 WHEN 'Thursday' THEN 4
//                 WHEN 'Friday' THEN 5
//                 WHEN 'Saturday' THEN 6
//                 WHEN 'Sunday' THEN 7
//             END`;

//         const result = await pgPool.query(query, params);
//         const rows = result.rows;

//         const workingHours = {
//             monday: { closed: true, open: null, close: null },
//             tuesday: { closed: true, open: null, close: null },
//             wednesday: { closed: true, open: null, close: null },
//             thursday: { closed: true, open: null, close: null },
//             friday: { closed: true, open: null, close: null },
//             saturday: { closed: true, open: null, close: null },
//             sunday: { closed: true, open: null, close: null }
//         };

//         for (const row of rows) {
//             const day = row.day_of_week.toLowerCase();
//             workingHours[day] = {
//                 closed: false,
//                 open: row.open_time ? row.open_time.substring(0, 5) : null,
//                 close: row.close_time ? row.close_time.substring(0, 5) : null
//             };
//         }

//         return workingHours;

//     } catch (error) {
//         logger.error('Error getting working hours:', error);
//         throw new Error(`Failed to get working hours: ${error.message}`);
//     }
// };

// /**
//  * Get available time slots for a specific date and appointment type
//  * @param {string} date - YYYY-MM-DD
//  * @param {string} appointmentType - 'consultation', 'vaccination', etc.
//  * @param {number|null} hospitalId - optional hospital ID (admin scope)
//  */
// exports.getAvailableSlots = async (date, appointmentType, hospitalId = null) => {
//     try {
//         const dayOfWeek = _getDayOfWeek(date);
//         const workingHours = await _getWorkingHoursForDay(dayOfWeek, appointmentType, hospitalId);
        
//         if (!workingHours || workingHours.closed) {
//             return {
//                 date: date,
//                 day_of_week: dayOfWeek,
//                 available_slots: [],
//                 message: 'Clinic is closed on this day'
//             };
//         }

//         const allSlots = _generateTimeSlots(workingHours.open, workingHours.close);
//         const dbBookedSlots = await _getDbBookedSlots(date, hospitalId);
        
//         let calendarBusySlots = [];
//         try {
//             calendarBusySlots = await calendarService.checkFreeBusy(date, hospitalId);
//         } catch (error) {
//             logger.warn('Could not check Google Calendar, proceeding with DB only');
//         }

//         const allBusySlots = _mergeBusySlots(dbBookedSlots, calendarBusySlots, date);
        
//         const availableSlots = allSlots.filter(slot => {
//             return !_isSlotBusy(slot, allBusySlots);
//         });

//         const formattedSlots = availableSlots.map(slot => _formatTime(slot));

//         return {
//             date: date,
//             day_of_week: dayOfWeek,
//             available_slots: formattedSlots,
//             total_available: formattedSlots.length,
//             working_hours: {
//                 open: workingHours.open,
//                 close: workingHours.close
//             }
//         };

//     } catch (error) {
//         logger.error('Error getting available slots:', error);
//         throw new Error(`Failed to get available slots: ${error.message}`);
//     }
// };

// /**
//  * Check if a specific slot is available
//  * @param {string} date - YYYY-MM-DD
//  * @param {string} time - e.g. "2:30 PM"
//  * @param {string} appointmentType
//  * @param {number|null} hospitalId - optional
//  */
// exports.isSlotAvailable = async (date, time, appointmentType, hospitalId = null) => {
//     try {
//         const result = await exports.getAvailableSlots(date, appointmentType, hospitalId);
//         return result.available_slots.includes(time);
//     } catch (error) {
//         logger.error('Error checking slot availability:', error);
//         return false;
//     }
// };





const db = require('../config/database');
const calendarService = require('./calendarService');
const logger = require('../utils/logger');

// ─── Internal helper functions ──────────────────────────────────────────────────

function _getDayOfWeek(dateStr) {
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

function _generateTimeSlots(openTime, closeTime, durationMinutes = 30) {
    const slots = [];
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    let currentHour = openHour;
    let currentMin = openMin;
    const closeTotalMinutes = closeHour * 60 + closeMin;
    while ((currentHour * 60 + currentMin + durationMinutes) <= closeTotalMinutes) {
        slots.push({ hours: currentHour, minutes: currentMin });
        currentMin += durationMinutes;
        if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
        }
    }
    return slots;
}

function _formatTime(slot) {
    const { hours, minutes } = slot;
    const period = hours >= 12 ? 'PM' : 'AM';
    let displayHour = hours % 12;
    displayHour = displayHour === 0 ? 12 : displayHour;
    const displayMin = String(minutes).padStart(2, '0');
    return `${displayHour}:${displayMin} ${period}`;
}

function _isSlotBusy(slot, busySlots) {
    return busySlots.some(busy => busy.hours === slot.hours && busy.minutes === slot.minutes);
}

function _mergeBusySlots(dbSlots, calendarSlots, date) {
    const busySet = new Set();
    for (const slot of dbSlots) {
        busySet.add(`${slot.hours}:${slot.minutes}`);
    }
    for (const busySlot of calendarSlots) {
        const startDate = new Date(busySlot.start);
        const endDate = new Date(busySlot.end);
        const slotDate = startDate.toISOString().split('T')[0];
        if (slotDate === date) {
            const startHour = startDate.getHours();
            const startMin = startDate.getMinutes();
            const endHour = endDate.getHours();
            const endMin = endDate.getMinutes();
            let hour = startHour;
            let min = startMin;
            const endTotal = endHour * 60 + endMin;
            while ((hour * 60 + min) < endTotal) {
                busySet.add(`${hour}:${min}`);
                min += 30;
                if (min >= 60) {
                    hour += 1;
                    min = 0;
                }
            }
        }
    }
    const busySlots = [];
    for (const slotKey of busySet) {
        const [h, m] = slotKey.split(':').map(Number);
        busySlots.push({ hours: h, minutes: m });
    }
    return busySlots;
}

async function _getWorkingHoursForDay(dayOfWeek, appointmentType, hospitalId = null) {
    try {
        const pgPool = db.getPgPool();
        let query = `SELECT * FROM working_hours 
                     WHERE day_of_week = $1 
                     AND is_open = true 
                     AND (appointment_type = $2 OR appointment_type = 'all')`;
        const params = [dayOfWeek, appointmentType];
        if (hospitalId) {
            query += ` AND hospital_id = $3`;
            params.push(hospitalId);
        }
        query += ` LIMIT 1`;
        const result = await pgPool.query(query, params);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            closed: false,
            open: row.open_time ? row.open_time.substring(0, 5) : null,
            close: row.close_time ? row.close_time.substring(0, 5) : null,
            slot_duration: row.slot_duration || 30
        };
    } catch (error) {
        logger.error('Error getting working hours for day:', error);
        return null;
    }
}

async function _getDbBookedSlots(date, hospitalId = null) {
    try {
        const pgPool = db.getPgPool();
        let query = `SELECT time, appointment_type FROM ezy_vet_appointments
                     WHERE date = $1 AND status = 'confirmed'`;
        const params = [date];
        if (hospitalId) {
            query += ` AND hospital_id = $2`;
            params.push(hospitalId);
        }
        const result = await pgPool.query(query, params);
        return result.rows.map(row => {
            const timeParts = row.time.match(/(\d+):(\d+)/);
            if (timeParts) {
                return {
                    hours: parseInt(timeParts[1]),
                    minutes: parseInt(timeParts[2]),
                    appointment_type: row.appointment_type
                };
            }
            return null;
        }).filter(Boolean);
    } catch (error) {
        logger.error('Error getting DB booked slots:', error);
        return [];
    }
}

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get working hours for a specific appointment type and hospital
 * @param {string|null} appointmentType - 'consultation', 'vaccination', etc.
 * @param {number|null} hospitalId - optional hospital ID (admin scope)
 */
exports.getWorkingHours = async (appointmentType = null, hospitalId = null) => {
    try {
        const pgPool = db.getPgPool();
        
        let query = 'SELECT * FROM working_hours WHERE is_open = true';
        const params = [];

        if (appointmentType) {
            query += ' AND (appointment_type = $1 OR appointment_type = $2)';
            params.push(appointmentType, 'all');
        }

        if (hospitalId) {
            query += ` AND hospital_id = $${params.length + 1}`;
            params.push(hospitalId);
        }

        query += ` ORDER BY 
            CASE day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
                WHEN 'Sunday' THEN 7
            END`;

        const result = await pgPool.query(query, params);
        const rows = result.rows;

        const workingHours = {
            monday: { closed: true, open: null, close: null },
            tuesday: { closed: true, open: null, close: null },
            wednesday: { closed: true, open: null, close: null },
            thursday: { closed: true, open: null, close: null },
            friday: { closed: true, open: null, close: null },
            saturday: { closed: true, open: null, close: null },
            sunday: { closed: true, open: null, close: null }
        };

        for (const row of rows) {
            const day = row.day_of_week.toLowerCase();
            workingHours[day] = {
                closed: false,
                open: row.open_time ? row.open_time.substring(0, 5) : null,
                close: row.close_time ? row.close_time.substring(0, 5) : null
            };
        }

        return workingHours;

    } catch (error) {
        logger.error('Error getting working hours:', error);
        throw new Error(`Failed to get working hours: ${error.message}`);
    }
};

/**
 * Get available time slots for a specific date and appointment type
 * @param {string} date - YYYY-MM-DD
 * @param {string} appointmentType - 'consultation', 'vaccination', etc.
 * @param {number|null} hospitalId - optional hospital ID (admin scope)
 */
exports.getAvailableSlots = async (date, appointmentType, hospitalId = null) => {
    try {
        const dayOfWeek = _getDayOfWeek(date);
        const workingHours = await _getWorkingHoursForDay(dayOfWeek, appointmentType, hospitalId);
        
        if (!workingHours || workingHours.closed) {
            return {
                date: date,
                day_of_week: dayOfWeek,
                available_slots: [],
                message: 'Clinic is closed on this day'
            };
        }

        const allSlots = _generateTimeSlots(workingHours.open, workingHours.close);
        const dbBookedSlots = await _getDbBookedSlots(date, hospitalId);
        
        let calendarBusySlots = [];
        try {
            calendarBusySlots = await calendarService.checkFreeBusy(date, hospitalId);
        } catch (error) {
            logger.warn('Could not check Google Calendar, proceeding with DB only');
        }

        const allBusySlots = _mergeBusySlots(dbBookedSlots, calendarBusySlots, date);
        
        const availableSlots = allSlots.filter(slot => {
            return !_isSlotBusy(slot, allBusySlots);
        });

        const formattedSlots = availableSlots.map(slot => _formatTime(slot));

        return {
            date: date,
            day_of_week: dayOfWeek,
            available_slots: formattedSlots,
            total_available: formattedSlots.length,
            working_hours: {
                open: workingHours.open,
                close: workingHours.close
            }
        };

    } catch (error) {
        logger.error('Error getting available slots:', error);
        throw new Error(`Failed to get available slots: ${error.message}`);
    }
};

/**
 * Check if a specific slot is available
 * @param {string} date - YYYY-MM-DD
 * @param {string} time - e.g. "2:30 PM"
 * @param {string} appointmentType
 * @param {number|null} hospitalId - optional
 */
exports.isSlotAvailable = async (date, time, appointmentType, hospitalId = null) => {
    try {
        const result = await exports.getAvailableSlots(date, appointmentType, hospitalId);
        return result.available_slots.includes(time);
    } catch (error) {
        logger.error('Error checking slot availability:', error);
        return false;
    }
};