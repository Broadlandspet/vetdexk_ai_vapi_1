// const { executeQuery } = require('../config/database');
// const BookDemoEmailService = require('../services/bookDemoEmailService' )// 👈 NEW
// const logger = require('../utils/logger');
// const axios = require("axios");
// const env = require("../config/env");

// class BookDemoService {

//     // Create a new demo booking
//     static async createBooking(data) {
//        const {
//     fullName,
//     email,
//     hospitalName,
//     hospitalAddress,
//     hospitalEmail,
//     hospitalPhone,
//     notes = null
// } = data;

//         try {
//             // Insert into database
//             const result = await executeQuery(
//                 `INSERT INTO book_demo (
//     full_name,
//     email,
//     hospital_name,
//     hospital_address,
//     hospital_email,
//     hospital_phone,
//     notes,
//     status,
//     created_at
// )
// VALUES (
//     $1,$2,$3,$4,$5,$6,$7,$8,NOW()
// )
// RETURNING id, created_at`,
//                [
//     fullName,
//     email,
//     hospitalName,
//     hospitalAddress,
//     hospitalEmail,
//     hospitalPhone,
//     notes || null,
//     'new'
// ]
//             );

//           const booking = result.rows[0];

// // ===============================
// // Notify Super Admin
// // ===============================
// try {
//     await BookDemoEmailService.sendSuperAdminNotification({
//         fullName,
//         email,
//         hospitalName,
//         hospitalAddress,
//         hospitalEmail,
//         hospitalPhone,
//         notes,
//         bookingId: booking.id
//     });
// } catch (error) {
//     logger.error('Failed to send Super Admin notification:', error);
// }


// try {
//     await BookDemoEmailService.sendCustomerConfirmation({
//         fullName,
//         email,
//         hospitalName,
//         bookingId: booking.id
//     });
// } catch (error) {
//     logger.error('Failed to send customer confirmation:', error);
// }

// return {
//     success: true,
//     data: {
//         id: booking.id,
//         status: 'new',
//         created_at: booking.created_at,
//         ...data
//     }
// };

//         } catch (error) {
//             logger.error('Error creating demo booking:', error);
//             throw error;
//         }
//     }

// // Mark a booking as scheduled after Calendly booking
// static async markAsScheduled(email) {
//     try {

//         const result = await executeQuery(
//             `
//             UPDATE book_demo
//             SET
//                 status = 'scheduled',
//                 updated_at = NOW()
//             WHERE LOWER(email) = LOWER($1)
//             RETURNING *;
//             `,
//             [email]
//         );

//         if (result.rowCount === 0) {
//             logger.warn(`No demo booking found for email: ${email}`);

//             return {
//                 success: false,
//                 message: "Booking not found"
//             };
//         }

//         logger.info(
//             `Demo booking marked as scheduled for ${email}`
//         );

//         return {
//             success: true,
//             booking: result.rows[0]
//         };

//     } catch (error) {

//         logger.error("Error updating booking status:", error);

//         throw error;
//     }
// }


// static async processCalendlyWebhook(payload) {
//   try {
//     logger.info("Processing Calendly webhook");

//     // Only process invitee.created events
//     if (payload.event !== "invitee.created") {
//       logger.info(`Ignoring event: ${payload.event}`);
//       return;
//     }

//     const invitee = payload.payload;

//     // Validate required data
//     if (!invitee?.email || !invitee?.scheduled_event) {
//       logger.warn("Invalid webhook payload - missing required fields");
//       return;
//     }

//     const email = invitee.email;
//     const scheduledEvent = invitee.scheduled_event;
    
//     // Extract meeting details directly from webhook payload
//     const meetingStart = scheduledEvent.start_time;
//     const meetingEnd = scheduledEvent.end_time;
    
//     // ✅ Get meeting URL directly from webhook
//     const meetingUrl = scheduledEvent.location?.join_url || null;
    
//     // Get event URI for reference
//     const eventUri = scheduledEvent.uri;
//     const inviteeUri = invitee.uri;

//     logger.info(`Calendly booking received for ${email}`);
//     logger.info(`Meeting starts at ${meetingStart}`);
//     logger.info(`Meeting URL: ${meetingUrl || 'NOT PROVIDED'}`);

//     // ✅ UPDATE: Only use columns that exist in your table
//     // REMOVED: scheduled_end (doesn't exist in your table)
//     const updateResult = await executeQuery(
//       `
//       UPDATE book_demo
//       SET
//         status = 'scheduled',
//         scheduled_at = $1,
//         calendly_event_uri = $2,
//         calendly_invitee_uri = $3,
//         meeting_url = $4,
//         updated_at = NOW()
//       WHERE LOWER(email) = LOWER($5)
//       RETURNING id, full_name, email, hospital_name, hospital_phone
//       `,
//       [
//         meetingStart,
//         eventUri,
//         inviteeUri,
//         meetingUrl,
//         email
//       ]
//     );

//     if (updateResult.rowCount === 0) {
//       logger.warn(`No demo booking found for email: ${email}`);
//       return {
//         success: false,
//         message: "No booking found for this email"
//       };
//     }

//     const booking = updateResult.rows[0];
//     logger.info(`✅ Booking #${booking.id} marked as scheduled successfully`);

//     // =============================================
//     // 1. SEND NOTIFICATION TO SUPER ADMIN
//     // =============================================
//     try {
//       await BookDemoEmailService.sendScheduledMeetingNotification({
//         fullName: booking.full_name,
//         email: booking.email,
//         hospitalName: booking.hospital_name,
//         hospitalPhone: booking.hospital_phone,
//         bookingId: booking.id,
//         meetingTime: meetingStart,
//         meetingEnd: meetingEnd,
//         meetingUrl: meetingUrl
//       });
//       logger.info(`✅ Admin notification sent for booking #${booking.id}`);
//     } catch (emailError) {
//       logger.error('Failed to send admin notification:', emailError);
//       // Don't throw - webhook should still succeed even if email fails
//     }

//     // =============================================
//     // 2. SEND CONFIRMATION TO CUSTOMER
//     // =============================================
//     try {
//       await BookDemoEmailService.sendCustomerMeetingConfirmation({
//         fullName: booking.full_name,
//         email: booking.email,
//         hospitalName: booking.hospital_name,
//         bookingId: booking.id,
//         meetingTime: meetingStart,
//         meetingUrl: meetingUrl
//       });
//       logger.info(`✅ Customer confirmation sent to ${booking.email}`);
//     } catch (emailError) {
//       logger.error('Failed to send customer confirmation:', emailError);
//       // Don't throw - webhook should still succeed
//     }

//     // =============================================
//     // 3. RETURN SUCCESS RESPONSE
//     // =============================================
//     return {
//       success: true,
//       booking: {
//         id: booking.id,
//         fullName: booking.full_name,
//         email: booking.email,
//         hospitalName: booking.hospital_name,
//         meetingTime: meetingStart,
//         meetingEnd: meetingEnd,
//         meetingUrl: meetingUrl,
//         status: 'scheduled'
//       }
//     };

//   } catch (error) {
//     logger.error("Error processing Calendly webhook:", error);
//     throw error;
//   }
// }


//     // Get all bookings
    
//     static async getScheduledEventDetails(eventUri) {
//   try {
//     // Only call if you have a valid PAT token
//     if (!env.CALENDLY_PAT || env.CALENDLY_PAT === 'your_pat_token_here') {
//       logger.warn('No valid Calendly PAT token found - skipping API call');
//       return null;
//     }

//     const response = await axios.get(eventUri, {
//       headers: {
//         Authorization: `Bearer ${env.CALENDLY_PAT}`,
//         "Content-Type": "application/json"
//       }
//     });

//     return response.data.resource;
//   } catch (error) {
//     logger.error("Failed to fetch Calendly scheduled event:", 
//       error.response?.data || error.message
//     );
//     return null;
//   }
// }
    
//   // In BookDemoService.js
// static async getAllBookings() {
//     try {
//         const result = await executeQuery(
//             `
//             SELECT 
//                 id,
//                 full_name,
//                 email,
//                 hospital_name,
//                 hospital_address,
//                 hospital_email,
//                 hospital_phone,
//                 status,
//                 notes,
//                 staff_notes,
//                 calendly_event_uri,
//                 calendly_invitee_uri,
//                 scheduled_at,
//                 meeting_url,
//                 created_at,
//                 updated_at,
//                 -- Add computed fields for dashboard
//                 CASE 
//                     WHEN status = 'new' THEN 'New'
//                     WHEN status = 'scheduled' THEN 'Scheduled'
//                     WHEN status = 'completed' THEN 'Completed'
//                     WHEN status = 'contacted' THEN 'Contacted'
//                     ELSE 'Unknown'
//                 END as status_label,
//                 TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_at,
//                 TO_CHAR(scheduled_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_scheduled_at,
//                 -- Check if meeting is upcoming or past
//                 CASE 
//                     WHEN scheduled_at > NOW() THEN 'upcoming'
//                     WHEN scheduled_at < NOW() THEN 'past'
//                     ELSE 'not_scheduled'
//                 END as meeting_status
//             FROM book_demo 
//             ORDER BY 
//                 CASE 
//                     WHEN status = 'new' THEN 1
//                     WHEN status = 'scheduled' THEN 2
//                     WHEN status = 'contacted' THEN 3
//                     WHEN status = 'completed' THEN 4
//                     ELSE 5
//                 END,
//                 created_at DESC
//             `
//         );
        
//         // Format the data for better frontend consumption
//         const bookings = result.rows.map(row => ({
//             id: row.id,
//             requester: {
//                 name: row.full_name,
//                 email: row.email,
//                 phone: row.hospital_phone
//             },
//             hospital: {
//                 name: row.hospital_name,
//                 address: row.hospital_address,
//                 email: row.hospital_email,
//                 phone: row.hospital_phone
//             },
//             status: {
//                 value: row.status,
//                 label: row.status_label,
//                 meeting_status: row.meeting_status
//             },
//             meeting: {
//                 scheduled_at: row.scheduled_at,
//                 formatted_scheduled_at: row.formatted_scheduled_at,
//                 meeting_url: row.meeting_url,
//                 calendly_event_uri: row.calendly_event_uri,
//                 calendly_invitee_uri: row.calendly_invitee_uri
//             },
//             notes: {
//                 user_notes: row.notes,
//                 staff_notes: row.staff_notes
//             },
//             timestamps: {
//                 created_at: row.created_at,
//                 formatted_created_at: row.formatted_created_at,
//                 updated_at: row.updated_at
//             }
//         }));

//         // Get statistics
//         const stats = {
//             total: bookings.length,
//             new: bookings.filter(b => b.status.value === 'new').length,
//             scheduled: bookings.filter(b => b.status.value === 'scheduled').length,
//             contacted: bookings.filter(b => b.status.value === 'contacted').length,
//             completed: bookings.filter(b => b.status.value === 'completed').length,
//             upcoming_meetings: bookings.filter(b => b.meeting.meeting_status === 'upcoming').length
//         };

//         return {
//             success: true,
//             bookings: bookings,
//             stats: stats,
//             count: bookings.length
//         };

//     } catch (error) {
//         logger.error('Error fetching bookings:', error);
//         return {
//             success: false,
//             bookings: [],
//             stats: {
//                 total: 0,
//                 new: 0,
//                 scheduled: 0,
//                 contacted: 0,
//                 completed: 0,
//                 upcoming_meetings: 0
//             },
//             count: 0,
//             error: error.message
//         };
//     }
// }





//     // Get booking by ID
//     static async getBookingById(id) {
//         try {
//             const result = await executeQuery(
//                 `SELECT * FROM book_demo WHERE id = $1`,
//                 [id]
//             );
//             return result.rows[0] || null;
//         } catch (error) {
//             logger.error('Error fetching booking:', error);
//             return null;
//         }
//     }

//     // Update booking status
//     static async updateBookingStatus(id, status) {
//         try {
//            const validStatuses = [
//     'new',
//     'contacted',
//     'scheduled',
//     'completed'
// ];
//             if (!validStatuses.includes(status)) {
//                 throw new Error('Invalid status');
//             }

//             const result = await executeQuery(
//                 `UPDATE book_demo SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
//                 [status, id]
//             );
//             return result.rows[0] || null;
//         } catch (error) {
//             logger.error('Error updating booking status:', error);
//             throw error;
//         }
//     }

//     // Delete booking
//     static async deleteBooking(id) {
//         try {
//             await executeQuery(`DELETE FROM book_demo WHERE id = $1`, [id]);
//             return true;
//         } catch (error) {
//             logger.error('Error deleting booking:', error);
//             throw error;
//         }
//     }

//     // Get bookings by email
//     static async getBookingsByEmail(email) {
//         try {
//             const result = await executeQuery(
//                 `SELECT * FROM book_demo WHERE email = $1 ORDER BY created_at DESC`,
//                 [email]
//             );
//             return result.rows || [];
//         } catch (error) {
//             logger.error('Error fetching bookings by email:', error);
//             return [];
//         }
//     }

//     // Get booking statistics
//     static async getBookingStats() {
//         try {
//             const result = await executeQuery(
//                 `SELECT 
//                     COUNT(*) as total,
//                     COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
//                     COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
//                     COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
//                     COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
//                 FROM book_demo`
//             );
//             return result.rows[0] || { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
//         } catch (error) {
//             logger.error('Error fetching booking stats:', error);
//             return { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
//         }
//     }
// }

// module.exports = BookDemoService;




const { executeQuery } = require('../config/database');
const BookDemoEmailService = require('../services/bookDemoEmailService');
const logger = require('../utils/logger');
const axios = require("axios");
const env = require("../config/env");

class BookDemoService {

    // Create a new demo booking
    static async createBooking(data) {
        const {
            fullName,
            email,
            hospitalName,
            hospitalAddress,
            hospitalEmail,
            hospitalPhone,
            notes = null
        } = data;

        try {
            // Insert into database
            const result = await executeQuery(
                `INSERT INTO book_demo (
                    full_name,
                    email,
                    hospital_name,
                    hospital_address,
                    hospital_email,
                    hospital_phone,
                    notes,
                    status,
                    created_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
                RETURNING id, created_at`,
                [
                    fullName,
                    email,
                    hospitalName,
                    hospitalAddress,
                    hospitalEmail,
                    hospitalPhone,
                    notes || null,
                    'new'
                ]
            );

            const booking = result.rows[0];

            // Notify Super Admin
            try {
                await BookDemoEmailService.sendSuperAdminNotification({
                    fullName,
                    email,
                    hospitalName,
                    hospitalAddress,
                    hospitalEmail,
                    hospitalPhone,
                    notes,
                    bookingId: booking.id
                });
            } catch (error) {
                logger.error('Failed to send Super Admin notification:', error);
            }

            try {
                await BookDemoEmailService.sendCustomerConfirmation({
                    fullName,
                    email,
                    hospitalName,
                    bookingId: booking.id
                });
            } catch (error) {
                logger.error('Failed to send customer confirmation:', error);
            }

            return {
                success: true,
                data: {
                    id: booking.id,
                    status: 'new',
                    created_at: booking.created_at,
                    ...data
                }
            };

        } catch (error) {
            logger.error('Error creating demo booking:', error);
            throw error;
        }
    }

    // Mark a booking as scheduled after Calendly booking
    static async markAsScheduled(email) {
        try {
            const result = await executeQuery(
                `
                UPDATE book_demo
                SET
                    status = 'scheduled',
                    updated_at = NOW()
                WHERE LOWER(email) = LOWER($1)
                RETURNING *;
                `,
                [email]
            );

            if (result.rowCount === 0) {
                logger.warn(`No demo booking found for email: ${email}`);
                return {
                    success: false,
                    message: "Booking not found"
                };
            }

            logger.info(`Demo booking marked as scheduled for ${email}`);
            return {
                success: true,
                booking: result.rows[0]
            };

        } catch (error) {
            logger.error("Error updating booking status:", error);
            throw error;
        }
    }

    // Process Calendly Webhook
    static async processCalendlyWebhook(payload) {
        try {
            logger.info("Processing Calendly webhook");

            // Only process invitee.created events
            if (payload.event !== "invitee.created") {
                logger.info(`Ignoring event: ${payload.event}`);
                return;
            }

            const invitee = payload.payload;

            // Validate required data
            if (!invitee?.email || !invitee?.scheduled_event) {
                logger.warn("Invalid webhook payload - missing required fields");
                return;
            }

            const email = invitee.email;
            const scheduledEvent = invitee.scheduled_event;
            
            const meetingStart = scheduledEvent.start_time;
            const meetingEnd = scheduledEvent.end_time;
            const meetingUrl = scheduledEvent.location?.join_url || null;
            const eventUri = scheduledEvent.uri;
            const inviteeUri = invitee.uri;

            logger.info(`Calendly booking received for ${email}`);
            logger.info(`Meeting starts at ${meetingStart}`);
            logger.info(`Meeting URL: ${meetingUrl || 'NOT PROVIDED'}`);

            const updateResult = await executeQuery(
                `
                UPDATE book_demo
                SET
                    status = 'scheduled',
                    scheduled_at = $1,
                    calendly_event_uri = $2,
                    calendly_invitee_uri = $3,
                    meeting_url = $4,
                    updated_at = NOW()
                WHERE LOWER(email) = LOWER($5)
                RETURNING id, full_name, email, hospital_name, hospital_phone
                `,
                [
                    meetingStart,
                    eventUri,
                    inviteeUri,
                    meetingUrl,
                    email
                ]
            );

            if (updateResult.rowCount === 0) {
                logger.warn(`No demo booking found for email: ${email}`);
                return {
                    success: false,
                    message: "No booking found for this email"
                };
            }

            const booking = updateResult.rows[0];
            logger.info(`✅ Booking #${booking.id} marked as scheduled successfully`);

            // Send notifications
            try {
                await BookDemoEmailService.sendScheduledMeetingNotification({
                    fullName: booking.full_name,
                    email: booking.email,
                    hospitalName: booking.hospital_name,
                    hospitalPhone: booking.hospital_phone,
                    bookingId: booking.id,
                    meetingTime: meetingStart,
                    meetingEnd: meetingEnd,
                    meetingUrl: meetingUrl
                });
                logger.info(`✅ Admin notification sent for booking #${booking.id}`);
            } catch (emailError) {
                logger.error('Failed to send admin notification:', emailError);
            }

            try {
                await BookDemoEmailService.sendCustomerMeetingConfirmation({
                    fullName: booking.full_name,
                    email: booking.email,
                    hospitalName: booking.hospital_name,
                    bookingId: booking.id,
                    meetingTime: meetingStart,
                    meetingUrl: meetingUrl
                });
                logger.info(`✅ Customer confirmation sent to ${booking.email}`);
            } catch (emailError) {
                logger.error('Failed to send customer confirmation:', emailError);
            }

            return {
                success: true,
                booking: {
                    id: booking.id,
                    fullName: booking.full_name,
                    email: booking.email,
                    hospitalName: booking.hospital_name,
                    meetingTime: meetingStart,
                    meetingEnd: meetingEnd,
                    meetingUrl: meetingUrl,
                    status: 'scheduled'
                }
            };

        } catch (error) {
            logger.error("Error processing Calendly webhook:", error);
            throw error;
        }
    }

    // Get Calendly Event Details (optional)
    static async getScheduledEventDetails(eventUri) {
        try {
            if (!env.CALENDLY_PAT || env.CALENDLY_PAT === 'your_pat_token_here') {
                logger.warn('No valid Calendly PAT token found - skipping API call');
                return null;
            }

            const response = await axios.get(eventUri, {
                headers: {
                    Authorization: `Bearer ${env.CALENDLY_PAT}`,
                    "Content-Type": "application/json"
                }
            });

            return response.data.resource;
        } catch (error) {
            logger.error("Failed to fetch Calendly scheduled event:", 
                error.response?.data || error.message
            );
            return null;
        }
    }

    // ✅ FIXED: Get all bookings - Returns ARRAY directly
    static async getAllBookings() {
        try {
            const result = await executeQuery(
                `SELECT 
                    id,
                    full_name,
                    email,
                    hospital_name,
                    hospital_address,
                    hospital_email,
                    hospital_phone,
                    status,
                    notes,
                    staff_notes,
                    calendly_event_uri,
                    calendly_invitee_uri,
                    scheduled_at,
                    meeting_url,
                    created_at,
                    updated_at
                FROM book_demo 
                ORDER BY 
                    CASE 
                        WHEN status = 'new' THEN 1
                        WHEN status = 'scheduled' THEN 2
                        WHEN status = 'contacted' THEN 3
                        WHEN status = 'completed' THEN 4
                        ELSE 5
                    END,
                    created_at DESC
                `
            );
            return result.rows || [];
        } catch (error) {
            logger.error('Error fetching bookings:', error);
            return [];
        }
    }

    // Get booking by ID
    static async getBookingById(id) {
        try {
            const result = await executeQuery(
                `SELECT * FROM book_demo WHERE id = $1`,
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error fetching booking:', error);
            return null;
        }
    }

    // Update booking status
    static async updateBookingStatus(id, status) {
        try {
            const validStatuses = ['new', 'contacted', 'scheduled', 'completed'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const result = await executeQuery(
                `UPDATE book_demo SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [status, id]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error updating booking status:', error);
            throw error;
        }
    }

    // Delete booking
    static async deleteBooking(id) {
        try {
            await executeQuery(`DELETE FROM book_demo WHERE id = $1`, [id]);
            return true;
        } catch (error) {
            logger.error('Error deleting booking:', error);
            throw error;
        }
    }

    // Get bookings by email
    static async getBookingsByEmail(email) {
        try {
            const result = await executeQuery(
                `SELECT * FROM book_demo WHERE email = $1 ORDER BY created_at DESC`,
                [email]
            );
            return result.rows || [];
        } catch (error) {
            logger.error('Error fetching bookings by email:', error);
            return [];
        }
    }

    // Get booking statistics
    static async getBookingStats() {
        try {
            const result = await executeQuery(
                `SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
                    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
                    COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
                FROM book_demo`
            );
            return result.rows[0] || { total: 0, new_count: 0, scheduled: 0, contacted: 0, completed: 0 };
        } catch (error) {
            logger.error('Error fetching booking stats:', error);
            return { total: 0, new_count: 0, scheduled: 0, contacted: 0, completed: 0 };
        }
    }
}

module.exports = BookDemoService;