// const { executeQuery } = require('../config/database');
// const BookDemoEmailService = require('../services/bookDemoEmailService');
// const FeedbackService = require('../services/feedbackService'); // Add this
// const logger = require('../utils/logger');
// const axios = require("axios");
// const env = require("../config/env");

// class BookDemoService {

//     // Create a new demo booking
//     static async createBooking(data) {
//         const {
//             fullName,
//             email,
//             hospitalName,
//             hospitalAddress,
//             hospitalEmail,
//             hospitalPhone,
//             notes = null
//         } = data;

//         try {
//             // Insert into database
//             const result = await executeQuery(
//                 `INSERT INTO book_demo (
//                     full_name,
//                     email,
//                     hospital_name,
//                     hospital_address,
//                     hospital_email,
//                     hospital_phone,
//                     notes,
//                     status,
//                     created_at
//                 )
//                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
//                 RETURNING id, created_at`,
//                 [
//                     fullName,
//                     email,
//                     hospitalName,
//                     hospitalAddress,
//                     hospitalEmail,
//                     hospitalPhone,
//                     notes || null,
//                     'new'
//                 ]
//             );

//             const booking = result.rows[0];

//             // Notify Super Admin
//             try {
//                 await BookDemoEmailService.sendSuperAdminNotification({
//                     fullName,
//                     email,
//                     hospitalName,
//                     hospitalAddress,
//                     hospitalEmail,
//                     hospitalPhone,
//                     notes,
//                     bookingId: booking.id
//                 });
//             } catch (error) {
//                 logger.error('Failed to send Super Admin notification:', error);
//             }

//             try {
//                 await BookDemoEmailService.sendCustomerConfirmation({
//                     fullName,
//                     email,
//                     hospitalName,
//                     bookingId: booking.id
//                 });
//             } catch (error) {
//                 logger.error('Failed to send customer confirmation:', error);
//             }

//             return {
//                 success: true,
//                 data: {
//                     id: booking.id,
//                     status: 'new',
//                     created_at: booking.created_at,
//                     ...data
//                 }
//             };

//         } catch (error) {
//             logger.error('Error creating demo booking:', error);
//             throw error;
//         }
//     }

//     // Mark a booking as scheduled after Calendly booking
//     static async markAsScheduled(email) {
//         try {
//             const result = await executeQuery(
//                 `
//                 UPDATE book_demo
//                 SET
//                     status = 'scheduled',
//                     updated_at = NOW()
//                 WHERE LOWER(email) = LOWER($1)
//                 RETURNING *;
//                 `,
//                 [email]
//             );

//             if (result.rowCount === 0) {
//                 logger.warn(`No demo booking found for email: ${email}`);
//                 return {
//                     success: false,
//                     message: "Booking not found"
//                 };
//             }

//             logger.info(`Demo booking marked as scheduled for ${email}`);
//             return {
//                 success: true,
//                 booking: result.rows[0]
//             };

//         } catch (error) {
//             logger.error("Error updating booking status:", error);
//             throw error;
//         }
//     }

//     // Process Calendly Webhook
//     static async processCalendlyWebhook(payload) {
//         try {
//             logger.info("Processing Calendly webhook");

//             // Only process invitee.created events
//             if (payload.event !== "invitee.created") {
//                 logger.info(`Ignoring event: ${payload.event}`);
//                 return;
//             }

//             const invitee = payload.payload;

//             // Validate required data
//             if (!invitee?.email || !invitee?.scheduled_event) {
//                 logger.warn("Invalid webhook payload - missing required fields");
//                 return;
//             }

//             const email = invitee.email;
//             const scheduledEvent = invitee.scheduled_event;
            
//             const meetingStart = scheduledEvent.start_time;
//             const meetingEnd = scheduledEvent.end_time;
//             const meetingUrl = scheduledEvent.location?.join_url || null;
//             const eventUri = scheduledEvent.uri;
//             const inviteeUri = invitee.uri;

//             logger.info(`Calendly booking received for ${email}`);
//             logger.info(`Meeting starts at ${meetingStart}`);
//             logger.info(`Meeting URL: ${meetingUrl || 'NOT PROVIDED'}`);

//             const updateResult = await executeQuery(
//                 `
//                 UPDATE book_demo
//                 SET
//                     status = 'scheduled',
//                     scheduled_at = $1,
//                     calendly_event_uri = $2,
//                     calendly_invitee_uri = $3,
//                     meeting_url = $4,
//                     updated_at = NOW()
//                 WHERE LOWER(email) = LOWER($5)
//                 RETURNING id, full_name, email, hospital_name, hospital_phone
//                 `,
//                 [
//                     meetingStart,
//                     eventUri,
//                     inviteeUri,
//                     meetingUrl,
//                     email
//                 ]
//             );

//             if (updateResult.rowCount === 0) {
//                 logger.warn(`No demo booking found for email: ${email}`);
//                 return {
//                     success: false,
//                     message: "No booking found for this email"
//                 };
//             }

//             const booking = updateResult.rows[0];
//             logger.info(`✅ Booking #${booking.id} marked as scheduled successfully`);

//             // Send notifications
//             try {
//                 await BookDemoEmailService.sendScheduledMeetingNotification({
//                     fullName: booking.full_name,
//                     email: booking.email,
//                     hospitalName: booking.hospital_name,
//                     hospitalPhone: booking.hospital_phone,
//                     bookingId: booking.id,
//                     meetingTime: meetingStart,
//                     meetingEnd: meetingEnd,
//                     meetingUrl: meetingUrl
//                 });
//                 logger.info(`✅ Admin notification sent for booking #${booking.id}`);
//             } catch (emailError) {
//                 logger.error('Failed to send admin notification:', emailError);
//             }

//             try {
//                 await BookDemoEmailService.sendCustomerMeetingConfirmation({
//                     fullName: booking.full_name,
//                     email: booking.email,
//                     hospitalName: booking.hospital_name,
//                     bookingId: booking.id,
//                     meetingTime: meetingStart,
//                     meetingUrl: meetingUrl
//                 });
//                 logger.info(`✅ Customer confirmation sent to ${booking.email}`);
//             } catch (emailError) {
//                 logger.error('Failed to send customer confirmation:', emailError);
//             }

//             return {
//                 success: true,
//                 booking: {
//                     id: booking.id,
//                     fullName: booking.full_name,
//                     email: booking.email,
//                     hospitalName: booking.hospital_name,
//                     meetingTime: meetingStart,
//                     meetingEnd: meetingEnd,
//                     meetingUrl: meetingUrl,
//                     status: 'scheduled'
//                 }
//             };

//         } catch (error) {
//             logger.error("Error processing Calendly webhook:", error);
//             throw error;
//         }
//     }

//     // Get Calendly Event Details (optional)
//     static async getScheduledEventDetails(eventUri) {
//         try {
//             if (!env.CALENDLY_PAT || env.CALENDLY_PAT === 'your_pat_token_here') {
//                 logger.warn('No valid Calendly PAT token found - skipping API call');
//                 return null;
//             }

//             const response = await axios.get(eventUri, {
//                 headers: {
//                     Authorization: `Bearer ${env.CALENDLY_PAT}`,
//                     "Content-Type": "application/json"
//                 }
//             });

//             return response.data.resource;
//         } catch (error) {
//             logger.error("Failed to fetch Calendly scheduled event:", 
//                 error.response?.data || error.message
//             );
//             return null;
//         }
//     }

//     // ✅ UPDATED: Update booking status - Now triggers feedback email when status is 'completed'
//    // In BookDemoService.updateBookingStatus - This already triggers feedback email
// static async updateBookingStatus(id, status) {
//     try {
//         const validStatuses = ['new', 'contacted', 'scheduled', 'completed'];
//         if (!validStatuses.includes(status)) {
//             throw new Error('Invalid status');
//         }

//         // Get current booking
//         const currentBooking = await this.getBookingById(id);
//         if (!currentBooking) {
//             throw new Error('Booking not found');
//         }

//         // Update status
//         const result = await executeQuery(
//             `UPDATE book_demo 
//              SET status = $1, updated_at = NOW() 
//              WHERE id = $2 
//              RETURNING *`,
//             [status, id]
//         );
        
//         const updatedBooking = result.rows[0];
        
//         // If status changed to 'completed' AND feedback not sent yet
//         if (status === 'completed' && 
//             currentBooking.status !== 'completed' && 
//             !currentBooking.feedback_sent) {
            
//             logger.info(`📝 Booking #${id} marked as completed - triggering feedback email`);
            
//             try {
//                 await FeedbackService.sendFeedbackEmail(updatedBooking);
//                 logger.info(`📧 Feedback email sent for booking #${id}`);
//             } catch (emailError) {
//                 logger.error(`Failed to send feedback email for booking #${id}:`, emailError);
               
//             }
//         }
//         return updatedBooking;
        
//     } catch (error) {
//         logger.error('Error updating booking status:', error);
//         throw error;
//     }
// }

   


// static async getAllBookings() {
//     try {
//         const result = await executeQuery(
//             `SELECT 
//                 bd.id,
//                 bd.full_name,
//                 bd.email,
//                 bd.hospital_name,
//                 bd.hospital_address,
//                 bd.hospital_email,
//                 bd.hospital_phone,
//                 bd.status,
//                 bd.payment_status,
//                 bd.notes,
//                 bd.staff_notes,
//                 bd.calendly_event_uri,
//                 bd.calendly_invitee_uri,
//                 bd.scheduled_at,
//                 bd.meeting_url,
//                 bd.feedback_sent,
//                 bd.feedback_sent_at,
//                 bd.feedback_received,
//                 bd.feedback_received_at,
//                 bd.created_at,
//                 bd.updated_at,
//                 df.id as feedback_id,
//                 df.rating,
//                 df.would_recommend,
//                 df.interested_in_service,
//                 df.feedback_text,
//                 df.additional_comments,
//                 df.submitted_at as feedback_submitted_at
//             FROM book_demo bd
//             LEFT JOIN demo_feedback df ON bd.id = df.booking_id
//             ORDER BY 
//                 CASE 
//                     WHEN bd.status = 'new' THEN 1
//                     WHEN bd.status = 'scheduled' THEN 2
//                     WHEN bd.status = 'contacted' THEN 3
//                     WHEN bd.status = 'completed' THEN 4
//                     WHEN bd.status = 'payment_completed' THEN 5
//                     ELSE 6
//                 END,
//                 bd.created_at DESC
//             `
//         );
        
//         // Group feedbacks by booking_id
//         const bookingsMap = new Map();
        
//         result.rows.forEach(row => {
//             const bookingId = row.id;
            
//             if (!bookingsMap.has(bookingId)) {
//                 bookingsMap.set(bookingId, {
//                     id: row.id,
//                     full_name: row.full_name,
//                     email: row.email,
//                     hospital_name: row.hospital_name,
//                     hospital_address: row.hospital_address,
//                     hospital_email: row.hospital_email,
//                     hospital_phone: row.hospital_phone,
//                     status: row.status,
//                     payment_status: row.payment_status,
//                     notes: row.notes,
//                     staff_notes: row.staff_notes,
//                     calendly_event_uri: row.calendly_event_uri,
//                     calendly_invitee_uri: row.calendly_invitee_uri,
//                     scheduled_at: row.scheduled_at,
//                     meeting_url: row.meeting_url,
//                     feedback_sent: row.feedback_sent,
//                     feedback_sent_at: row.feedback_sent_at,
//                     feedback_received: row.feedback_received,
//                     feedback_received_at: row.feedback_received_at,
//                     created_at: row.created_at,
//                     updated_at: row.updated_at,
//                     feedbacks: []
//                 });
//             }
            
//             // If feedback exists, add it to the feedbacks array
//             if (row.feedback_id !== null) {
//                 bookingsMap.get(bookingId).feedbacks.push({
//                     id: row.feedback_id,
//                     rating: row.rating,
//                     would_recommend: row.would_recommend,
//                     interested_in_service: row.interested_in_service,
//                     feedback_text: row.feedback_text,
//                     additional_comments: row.additional_comments,
//                     submitted_at: row.feedback_submitted_at
//                 });
//             }
//         });
        
//         // Convert map to array
//         const bookings = Array.from(bookingsMap.values());
        
//         return bookings;
        
//     } catch (error) {
//         logger.error('Error fetching bookings:', error);
//         return [];
//     }
// }



//  static async getBookingById(id) {
//     try {
//         const result = await executeQuery(
//             `SELECT 
//                 id,
//                 full_name,
//                 email,
//                 hospital_name,
//                 hospital_address,
//                 hospital_email,
//                 hospital_phone,
//                 status,
//                 payment_status,
//                 notes,
//                 staff_notes,
//                 calendly_event_uri,
//                 calendly_invitee_uri,
//                 scheduled_at,
//                 meeting_url,
//                 feedback_sent,
//                 feedback_sent_at,
//                 feedback_received,
//                 feedback_received_at,
//                 created_at,
//                 updated_at
//             FROM book_demo 
//             WHERE id = $1`,
//             [id]
//         );
//         return result.rows[0] || null;
//     } catch (error) {
//         logger.error('Error fetching booking:', error);
//         return null;
//     }
// }


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
//                     COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
//                     COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
//                     COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
//                     COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
//                 FROM book_demo`
//             );
//             return result.rows[0] || { total: 0, new_count: 0, scheduled: 0, contacted: 0, completed: 0 };
//         } catch (error) {
//             logger.error('Error fetching booking stats:', error);
//             return { total: 0, new_count: 0, scheduled: 0, contacted: 0, completed: 0 };
//         }
//     }
// }

// module.exports = BookDemoService;












const { executeQuery } = require('../config/database');
const BookDemoEmailService = require('../services/bookDemoEmailService');
const FeedbackService = require('../services/feedbackService');
const logger = require('../utils/logger');
const axios = require("axios");
const env = require("../config/env");

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Create a new demo booking
 */
exports.createBooking = async (data) => {
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
};

/**
 * Mark a booking as scheduled after Calendly booking
 */
exports.markAsScheduled = async (email) => {
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
};

/**
 * Process Calendly Webhook
 */
exports.processCalendlyWebhook = async (payload) => {
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
};

/**
 * Get Calendly Event Details (optional helper)
 */
exports.getScheduledEventDetails = async (eventUri) => {
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
};

/**
 * Update booking status – triggers feedback email when status becomes 'completed'
 */
exports.updateBookingStatus = async (id, status) => {
    try {
        const validStatuses = ['new', 'contacted', 'scheduled', 'completed'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        // Get current booking (using exported function from the same module)
        const currentBooking = await exports.getBookingById(id);
        if (!currentBooking) {
            throw new Error('Booking not found');
        }

        // Update status
        const result = await executeQuery(
            `UPDATE book_demo 
             SET status = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING *`,
            [status, id]
        );
        
        const updatedBooking = result.rows[0];
        
        // If status changed to 'completed' AND feedback not sent yet
        if (status === 'completed' && 
            currentBooking.status !== 'completed' && 
            !currentBooking.feedback_sent) {
            
            logger.info(`📝 Booking #${id} marked as completed - triggering feedback email`);
            
            try {
                await FeedbackService.sendFeedbackEmail(updatedBooking);
                logger.info(`📧 Feedback email sent for booking #${id}`);
            } catch (emailError) {
                logger.error(`Failed to send feedback email for booking #${id}:`, emailError);
                // non‑critical, just log
            }
        }
        return updatedBooking;
        
    } catch (error) {
        logger.error('Error updating booking status:', error);
        throw error;
    }
};

/**
 * Get all bookings with feedback data
 */
exports.getAllBookings = async () => {
    try {
        const result = await executeQuery(
            `SELECT 
                bd.id,
                bd.full_name,
                bd.email,
                bd.hospital_name,
                bd.hospital_address,
                bd.hospital_email,
                bd.hospital_phone,
                bd.status,
                bd.payment_status,
                bd.notes,
                bd.staff_notes,
                bd.calendly_event_uri,
                bd.calendly_invitee_uri,
                bd.scheduled_at,
                bd.meeting_url,
                bd.feedback_sent,
                bd.feedback_sent_at,
                bd.feedback_received,
                bd.feedback_received_at,
                bd.created_at,
                bd.updated_at,
                df.id as feedback_id,
                df.rating,
                df.would_recommend,
                df.interested_in_service,
                df.feedback_text,
                df.additional_comments,
                df.submitted_at as feedback_submitted_at
            FROM book_demo bd
            LEFT JOIN demo_feedback df ON bd.id = df.booking_id
            ORDER BY 
                CASE 
                    WHEN bd.status = 'new' THEN 1
                    WHEN bd.status = 'scheduled' THEN 2
                    WHEN bd.status = 'contacted' THEN 3
                    WHEN bd.status = 'completed' THEN 4
                    WHEN bd.status = 'payment_completed' THEN 5
                    ELSE 6
                END,
                bd.created_at DESC
            `
        );
        
        // Group feedbacks by booking_id
        const bookingsMap = new Map();
        
        result.rows.forEach(row => {
            const bookingId = row.id;
            
            if (!bookingsMap.has(bookingId)) {
                bookingsMap.set(bookingId, {
                    id: row.id,
                    full_name: row.full_name,
                    email: row.email,
                    hospital_name: row.hospital_name,
                    hospital_address: row.hospital_address,
                    hospital_email: row.hospital_email,
                    hospital_phone: row.hospital_phone,
                    status: row.status,
                    payment_status: row.payment_status,
                    notes: row.notes,
                    staff_notes: row.staff_notes,
                    calendly_event_uri: row.calendly_event_uri,
                    calendly_invitee_uri: row.calendly_invitee_uri,
                    scheduled_at: row.scheduled_at,
                    meeting_url: row.meeting_url,
                    feedback_sent: row.feedback_sent,
                    feedback_sent_at: row.feedback_sent_at,
                    feedback_received: row.feedback_received,
                    feedback_received_at: row.feedback_received_at,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    feedbacks: []
                });
            }
            
            // If feedback exists, add it to the feedbacks array
            if (row.feedback_id !== null) {
                bookingsMap.get(bookingId).feedbacks.push({
                    id: row.feedback_id,
                    rating: row.rating,
                    would_recommend: row.would_recommend,
                    interested_in_service: row.interested_in_service,
                    feedback_text: row.feedback_text,
                    additional_comments: row.additional_comments,
                    submitted_at: row.feedback_submitted_at
                });
            }
        });
        
        // Convert map to array
        const bookings = Array.from(bookingsMap.values());
        
        return bookings;
        
    } catch (error) {
        logger.error('Error fetching bookings:', error);
        return [];
    }
};

/**
 * Get a single booking by ID
 */
exports.getBookingById = async (id) => {
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
                payment_status,
                notes,
                staff_notes,
                calendly_event_uri,
                calendly_invitee_uri,
                scheduled_at,
                meeting_url,
                feedback_sent,
                feedback_sent_at,
                feedback_received,
                feedback_received_at,
                created_at,
                updated_at
            FROM book_demo 
            WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Error fetching booking:', error);
        return null;
    }
};

/**
 * Delete a booking
 */
exports.deleteBooking = async (id) => {
    try {
        await executeQuery(`DELETE FROM book_demo WHERE id = $1`, [id]);
        return true;
    } catch (error) {
        logger.error('Error deleting booking:', error);
        throw error;
    }
};

/**
 * Get bookings by email
 */
exports.getBookingsByEmail = async (email) => {
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
};

/**
 * Get booking statistics
 */
exports.getBookingStats = async () => {
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
};