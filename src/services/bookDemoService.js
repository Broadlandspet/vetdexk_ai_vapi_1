
const { executeQuery } = require('../config/database');
const BookDemoEmailService = require('../services/bookDemoEmailService');
const FeedbackService = require('../services/feedbackService');
const logger = require('../utils/logger');
const axios = require("axios");
const env = require("../config/env");
const crypto = require('crypto');

// ─── HELPERS ──────────────────────────────────────────────────────────────────────

/**
 * Verify Calendly webhook signature for security
 */
exports.verifyCalendlyWebhook = (payload, signature, webhookSecret) => {
    if (!webhookSecret) {
        logger.warn('⚠️ No Calendly webhook secret configured - skipping signature verification');
        return true;
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(signature || ''),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        logger.error('Webhook signature verification failed:', error);
        return false;
    }
};

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// /**
//  * Create a new demo booking with unique schedule token (7-day expiry)
//  */
// exports.createBooking = async (data) => {
//     const {
//         fullName,
//         email,
//         hospitalName,
//         hospitalAddress,
//         hospitalEmail,
//         hospitalPhone,
//         notes = null
//     } = data;

//     try {
//         // Insert into database with auto-generated schedule_token
//         const result = await executeQuery(
//             `INSERT INTO book_demo (
//                 full_name,
//                 email,
//                 hospital_name,
//                 hospital_address,
//                 hospital_email,
//                 hospital_phone,
//                 notes,
//                 status,
//                 schedule_token,
//                 token_expires_at,
//                 created_at
//             )
//             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, gen_random_uuid(), NOW() + INTERVAL '7 days', NOW())
//             RETURNING id, created_at, schedule_token, token_expires_at`,
//             [
//                 fullName,
//                 email,
//                 hospitalName,
//                 hospitalAddress,
//                 hospitalEmail,
//                 hospitalPhone,
//                 notes || null,
//                 'new'
//             ]
//         );

//         const booking = result.rows[0];

//         // Send emails in background (non-blocking)
//         const emailPromises = [
//             BookDemoEmailService.sendSuperAdminNotification({
//                 fullName,
//                 email,
//                 hospitalName,
//                 hospitalAddress,
//                 hospitalEmail,
//                 hospitalPhone,
//                 notes,
//                 bookingId: booking.id
//             }).catch(err => logger.error('SuperAdmin email failed:', err)),
            
//             BookDemoEmailService.sendCustomerConfirmation({
//                 fullName,
//                 email,
//                 hospitalName,
//                 bookingId: booking.id,
//                 scheduleToken: booking.schedule_token
//             }).catch(err => logger.error('Customer email failed:', err))
//         ];

//         // Don't await emails - let them run in background
//         Promise.allSettled(emailPromises);

//         return {
//             success: true,
//             data: {
//                 id: booking.id,
//                 status: 'new',
//                 created_at: booking.created_at,
//                 schedule_token: booking.schedule_token,
//                 token_expires_at: booking.token_expires_at,
//                 ...data
//             }
//         };

//     } catch (error) {
//         logger.error('Error creating demo booking:', error);
//         throw error;
//     }
// };



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
        // Check if this email already has a booking
        const existing = await executeQuery(
            `SELECT id FROM book_demo WHERE email = $1 LIMIT 1`,
            [email]
        );
 
        if (existing.rows.length > 0) {
            return {
                success: false,
                alreadyExists: true,
                error: 'A demo has already been booked with this email address'
            };
        }
 
        // Insert into database with auto-generated schedule_token
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
                schedule_token,
                token_expires_at,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, gen_random_uuid(), NOW() + INTERVAL '7 days', NOW())
            RETURNING id, created_at, schedule_token, token_expires_at`,
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
 
        // Send emails in background (non-blocking)
        const emailPromises = [
            BookDemoEmailService.sendSuperAdminNotification({
                fullName,
                email,
                hospitalName,
                hospitalAddress,
                hospitalEmail,
                hospitalPhone,
                notes,
                bookingId: booking.id
            }).catch(err => logger.error('SuperAdmin email failed:', err)),
 
            BookDemoEmailService.sendCustomerConfirmation({
                fullName,
                email,
                hospitalName,
                bookingId: booking.id,
                scheduleToken: booking.schedule_token
            }).catch(err => logger.error('Customer email failed:', err))
        ];
 
        // Don't await emails - let them run in background
        Promise.allSettled(emailPromises);
 
        return {
            success: true,
            data: {
                id: booking.id,
                status: 'new',
                created_at: booking.created_at,
                schedule_token: booking.schedule_token,
                token_expires_at: booking.token_expires_at,
                ...data
            }
        };
 
    } catch (error) {
        logger.error('Error creating demo booking:', error);
        throw error;
    }
};

/**
 * Get booking by schedule token with status validation
 */
exports.getBookingByToken = async (token) => {
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
                scheduled_at,
                meeting_url,
                schedule_token,
                token_expires_at,
                token_used_at,
                created_at
            FROM book_demo 
            WHERE schedule_token = $1
            AND token_expires_at > NOW()
            AND token_used_at IS NULL`,
            [token]
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Error fetching booking by token:', error);
        return null;
    }
};


/**
 * Check whether a users row already exists for this demo booking.
 * Used to detect "link already used" — once a user has registered,
 * the feedback link must never route back into the registration flow.
 */
exports.getUserByDemoRequestId = async (bookingId) => {
    try {
        const result = await executeQuery(
            `SELECT id, registration_status FROM users WHERE demo_request_id = $1 LIMIT 1`,
            [bookingId]
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Error checking existing user for demo request:', error);
        return null;
    }
};

/**
 * Atomic claim of a token (prevents double-booking race conditions)
 */
exports.claimToken = async (token) => {
    try {
        // Atomic update: only claim if status is 'new' and token not used
        const result = await executeQuery(
            `UPDATE book_demo 
            SET 
                status = 'contacted',
                token_used_at = NOW(),
                updated_at = NOW()
            WHERE schedule_token = $1
            AND status = 'new'
            AND token_used_at IS NULL
            AND token_expires_at > NOW()
            RETURNING id, full_name, email, hospital_name, hospital_phone`,
            [token]
        );

        if (result.rowCount === 0) {
            // Check if token exists but is already used/expired
            const checkResult = await executeQuery(
                `SELECT status, token_used_at, token_expires_at 
                 FROM book_demo 
                 WHERE schedule_token = $1`,
                [token]
            );

            if (checkResult.rowCount === 0) {
                return { success: false, reason: 'not_found' };
            }

            const booking = checkResult.rows[0];
            if (booking.status === 'scheduled' || booking.status === 'completed') {
                return { success: false, reason: 'already_scheduled' };
            }
            if (booking.token_used_at) {
                return { success: false, reason: 'already_used' };
            }
            if (new Date(booking.token_expires_at) <= new Date()) {
                return { success: false, reason: 'expired' };
            }

            return { success: false, reason: 'unknown' };
        }

        logger.info(`✅ Token claimed for booking #${result.rows[0].id}`);
        return { 
            success: true, 
            booking: result.rows[0] 
        };

    } catch (error) {
        logger.error('Error claiming token:', error);
        throw error;
    }
};

/**
 * Mark a booking as scheduled AFTER Calendly webhook verification
 */
exports.markAsScheduled = async (email, calendlyData) => {
    try {
        const { meetingStart, meetingEnd, meetingUrl, eventUri, inviteeUri } = calendlyData;

        const result = await executeQuery(
            `UPDATE book_demo
            SET
                status = 'scheduled',
                scheduled_at = $1,
                calendly_event_uri = $2,
                calendly_invitee_uri = $3,
                meeting_url = $4,
                updated_at = NOW()
            WHERE LOWER(email) = LOWER($5)
            AND status IN ('new', 'contacted')
            AND token_used_at IS NOT NULL
            RETURNING id, full_name, email, hospital_name, hospital_phone`,
            [
                meetingStart,
                eventUri,
                inviteeUri,
                meetingUrl,
                email
            ]
        );

        if (result.rowCount === 0) {
            logger.warn(`No eligible demo booking found for email: ${email}`);
            return {
                success: false,
                message: "Booking not found or already scheduled"
            };
        }

        const booking = result.rows[0];
        logger.info(`✅ Booking #${booking.id} marked as scheduled for ${email}`);

        // Send notifications in background
        const notificationPromises = [
            BookDemoEmailService.sendScheduledMeetingNotification({
                fullName: booking.full_name,
                email: booking.email,
                hospitalName: booking.hospital_name,
                hospitalPhone: booking.hospital_phone,
                bookingId: booking.id,
                meetingTime: calendlyData.meetingStart,
                meetingEnd: calendlyData.meetingEnd,
                meetingUrl: booking.meeting_url
            }).catch(err => logger.error('Admin notification failed:', err)),

            BookDemoEmailService.sendCustomerMeetingConfirmation({
                fullName: booking.full_name,
                email: booking.email,
                hospitalName: booking.hospital_name,
                bookingId: booking.id,
                meetingTime: calendlyData.meetingStart,
                meetingUrl: booking.meeting_url
            }).catch(err => logger.error('Customer confirmation failed:', err))
        ];

        Promise.allSettled(notificationPromises);

        return {
            success: true,
            booking: {
                id: booking.id,
                fullName: booking.full_name,
                email: booking.email,
                hospitalName: booking.hospital_name,
                meetingTime: calendlyData.meetingStart,
                meetingEnd: calendlyData.meetingEnd,
                meetingUrl: booking.meeting_url,
                status: 'scheduled'
            }
        };

    } catch (error) {
        logger.error("Error updating booking status:", error);
        throw error;
    }
};

/**
 * Process Calendly Webhook with security verification
 */
exports.processCalendlyWebhook = async (payload, signature) => {
    try {
        logger.info("Processing Calendly webhook");

        // 1. Verify webhook authenticity (if secret configured)
        const webhookSecret = env.CALENDLY_WEBHOOK_SECRET;
        if (webhookSecret) {
            const isValid = exports.verifyCalendlyWebhook(payload, signature, webhookSecret);
            if (!isValid) {
                logger.error('❌ Invalid webhook signature - rejecting');
                throw new Error('Invalid webhook signature');
            }
            logger.info('✅ Webhook signature verified');
        }

        // 2. Only process invitee.created events
        if (payload.event !== "invitee.created") {
            logger.info(`Ignoring event: ${payload.event}`);
            return { success: true, ignored: true };
        }

        const invitee = payload.payload;

        // 3. Validate required data
        if (!invitee?.email || !invitee?.scheduled_event) {
            logger.warn("Invalid webhook payload - missing required fields");
            return { success: false, error: "Invalid payload" };
        }

        const email = invitee.email;
        const scheduledEvent = invitee.scheduled_event;
        
        const meetingStart = scheduledEvent.start_time;
        const meetingEnd = scheduledEvent.end_time;
        const meetingUrl = scheduledEvent.location?.join_url || null;
        const eventUri = scheduledEvent.uri;
        const inviteeUri = invitee.uri;

        logger.info(`📅 Calendly booking for ${email} at ${meetingStart}`);
        logger.info(`Meeting URL: ${meetingUrl || 'NOT PROVIDED'}`);

        // 4. Update booking (atomic, with status check)
        const result = await exports.markAsScheduled(email, {
            meetingStart,
            meetingEnd,
            meetingUrl,
            eventUri,
            inviteeUri
        });

        if (result.success) {
            logger.info(`✅ Booking #${result.booking.id} scheduled successfully`);
        } else {
            logger.warn(`⚠️ Could not schedule booking for ${email}: ${result.message}`);
        }

        return result;

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
        // First get all bookings
        const allResult = await executeQuery(
            `SELECT 
                bd.id,
                bd.full_name,
                bd.email,
                bd.status,
                u.id as user_id,
                u.registration_status
            FROM book_demo bd
            LEFT JOIN users u ON bd.id = u.demo_request_id
            ORDER BY bd.id DESC
            `
        );
        console.log('📊 All bookings before filter:', JSON.stringify(allResult.rows, null, 2));
        
        // Now get filtered bookings with all fields
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
                df.submitted_at as feedback_submitted_at,
                u.id as user_id,
                u.registration_status as user_registration_status
            FROM book_demo bd
            LEFT JOIN demo_feedback df ON bd.id = df.booking_id
            LEFT JOIN users u ON bd.id = u.demo_request_id
            WHERE 
                (u.id IS NULL OR u.registration_status != 'approved')
                AND bd.status != 'payment_completed'
            ORDER BY 
                CASE 
                    WHEN bd.status = 'new' THEN 1
                    WHEN bd.status = 'scheduled' THEN 2
                    WHEN bd.status = 'contacted' THEN 3
                    WHEN bd.status = 'completed' THEN 4
                    ELSE 5
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
                    user_id: row.user_id,
                    user_registration_status: row.user_registration_status,
                    feedbacks: []
                });
            }
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
        
        const bookings = Array.from(bookingsMap.values());
        console.log(`✅ Filtered bookings count: ${bookings.length}`);
        console.log('📊 Filtered bookings:', JSON.stringify(bookings.map(b => ({ 
            id: b.id, 
            status: b.status, 
            user_registration_status: b.user_registration_status 
        })), null, 2));
        return bookings;
        
    } catch (error) {
        console.error('Error fetching bookings:', error);
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
        plan_id,
        plan_price,
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
        feedback_token,
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
        return result.rows[0] || { 
            total: 0, 
            new_count: 0, 
            scheduled: 0, 
            contacted: 0, 
            completed: 0 
        };
    } catch (error) {
        logger.error('Error fetching booking stats:', error);
        return { 
            total: 0, 
            new_count: 0, 
            scheduled: 0, 
            contacted: 0, 
            completed: 0 
        };
    }
};

/**
 * Resend confirmation email for an existing booking
 */
exports.resendConfirmationEmail = async (bookingId) => {
    try {
        // Get booking with token
        const result = await executeQuery(
            `SELECT 
                id,
                full_name,
                email,
                hospital_name,
                schedule_token,
                status,
                token_expires_at
            FROM book_demo 
            WHERE id = $1`,
            [bookingId]
        );

        if (result.rowCount === 0) {
            return { success: false, error: 'Booking not found' };
        }

        const booking = result.rows[0];

        // Only resend if status is new or contacted
        if (booking.status === 'scheduled' || booking.status === 'completed') {
            return { success: false, error: 'Booking is already scheduled or completed' };
        }

        // Regenerate token if expired or missing
        let token = booking.schedule_token;
        let tokenExpires = booking.token_expires_at;

        if (!token || new Date(tokenExpires) <= new Date()) {
            const tokenResult = await executeQuery(
                `UPDATE book_demo 
                 SET 
                     schedule_token = gen_random_uuid(),
                     token_expires_at = NOW() + INTERVAL '7 days',
                     updated_at = NOW()
                 WHERE id = $1
                 RETURNING schedule_token, token_expires_at`,
                [bookingId]
            );
            
            if (tokenResult.rowCount > 0) {
                token = tokenResult.rows[0].schedule_token;
                tokenExpires = tokenResult.rows[0].token_expires_at;
            }
        }

        // Send new confirmation email
        await BookDemoEmailService.sendCustomerConfirmation({
            fullName: booking.full_name,
            email: booking.email,
            hospitalName: booking.hospital_name,
            bookingId: booking.id,
            scheduleToken: token
        });

        logger.info(`📧 Confirmation email resent for booking #${bookingId}`);
        return { success: true };

    } catch (error) {
        logger.error('Error resending confirmation email:', error);
        return { success: false, error: error.message };
    }
};