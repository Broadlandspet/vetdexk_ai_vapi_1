// const { executeQuery } = require('../config/database');
// const BookDemoEmailService = require('./bookDemoEmailService');
// const logger = require('../utils/logger');

// class FeedbackService {


// static async sendFeedbackEmail(booking) {
//     try {
//         const { id, full_name, email, hospital_name, scheduled_at } = booking;
 
//         // Generate unique feedback token
//         const token = Buffer.from(`${id}-${Date.now()}`).toString('base64');
 
//         // Mark feedback as sent
//         await executeQuery(
//             `
//             UPDATE book_demo 
//             SET 
//                 feedback_sent = true,
//                 feedback_sent_at = NOW(),
//                 updated_at = NOW()
//             WHERE id = $1
//             `,
//             [id]
//         );
 
//         const feedbackUrl = process.env.FEEDBACK_URL || 'http://localhost:3000';
//         const subject = "How was your VetDesk demo?";
 
//         const html = `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width, initial-scale=1.0">
// <title>Demo Feedback</title>
// <style>
// *{margin:0;padding:0;box-sizing:border-box;}
// body{
//   background:#f0f4f8;
//   font-family:Arial,Helvetica,sans-serif;
//   color:#1e293b;
//   padding:40px 16px;
// }
// .email-wrapper{max-width:600px;margin:0 auto;}
// .email-container{background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;}
// .header{
//   background:#0c1a2e;
//   padding:30px 36px;
//   border-bottom:3px solid #ff7a1a;
// }
// .header h1{color:#ffffff;font-size:20px;font-weight:700;margin:0;}
// .header p{color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.5px;text-transform:uppercase;margin-top:4px;}
// .body{padding:40px 36px;}
// .greeting{font-size:16px;color:#0f172a;margin-bottom:16px;font-weight:600;}
// .text{color:#4b5563;line-height:1.7;margin-bottom:24px;font-size:15px;}
// .info-card{border:1px solid #e7ebef;border-radius:10px;overflow:hidden;margin-bottom:28px;}
// .info-row{display:flex;border-bottom:1px solid #e7ebef;}
// .info-row:last-child{border-bottom:none;}
// .info-cell{width:50%;padding:14px 18px;border-right:1px solid #e7ebef;}
// .info-cell:last-child{border-right:none;}
// .info-label{font-size:10.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;margin-bottom:5px;}
// .info-value{font-size:14px;font-weight:600;color:#0f172a;}
// .info-value.orange{color:#ff7a1a;}
// .cta{text-align:center;margin:32px 0 8px;}
// .btn{
//   display:inline-block;
//   background:#0c8ce0;
//   color:#ffffff !important;
//   padding:14px 40px;
//   border-radius:8px;
//   text-decoration:none;
//   font-weight:700;
//   font-size:15px;
// }
// .expiry{font-size:12.5px;color:#94a3b8;text-align:center;margin-top:16px;}
// .footer{border-top:1px solid #e7ebef;background:#f8fafc;padding:22px 36px;text-align:center;}
// .footer p{font-size:12px;color:#94a3b8;margin:0;}
// .footer p strong{color:#0f172a;}
// .footer p span{color:#ff7a1a;}
// @media(max-width:520px){
//   .body{padding:26px;}
//   .header{padding:22px 24px;}
//   .header h1{font-size:18px;}
//   .info-row{flex-direction:column;}
//   .info-cell{width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
//   .info-cell:last-child{border-bottom:none;}
//   .btn{display:block;padding:14px 20px;font-size:14px;}
// }
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">
// <div class="header">
// <h1>We'd Love Your Feedback</h1>
// <p>VetDesk.ai &bull; Veterinary Care Platform</p>
// </div>
// <div class="body">
// <p class="greeting">Hi ${full_name},</p>
// <p class="text">
//       Thank you for attending the VetDesk demo! We'd love to hear about your experience.
// </p>
 
//     <div class="info-card">
// <div class="info-row">
// <div class="info-cell">
// <div class="info-label">Hospital</div>
// <div class="info-value">${hospital_name}</div>
// </div>
// <div class="info-cell">
// <div class="info-label">Demo Date</div>
// <div class="info-value orange">${scheduled_at ? new Date(scheduled_at).toLocaleDateString() : 'N/A'}</div>
// </div>
// </div>
// </div>
 
//     <p class="text">
//       Your feedback helps us improve and serve you better. It will only take 2 minutes.
// </p>
 
//     <div class="cta">
// <a href="${feedbackUrl}/feedbackform/${token}" class="btn">Give Feedback</a>
// </div>
 
//     <p class="expiry">This link expires in 7 days.</p>
// </div>
// <div class="footer">
// <p><strong>VetDesk</strong><span>.ai</span> &bull; Veterinary Care Platform</p>
// <p style="margin-top:4px;">Questions? Reply to this email.</p>
// </div>
// </div>
// </div>
// </body>
// </html>`;
 
//         // Send email
//         await BookDemoEmailService.sendEmailViaGmailAPI({
//             to: email,
//             subject: subject,
//             html: html
//         });
 
//         // Log email
//         try {
//             await BookDemoEmailService.saveEmailLog({
//                 toEmail: email,
//                 fromEmail: await BookDemoEmailService.getSenderEmail(),
//                 subject: subject,
//                 bodyHtml: html,
//                 fullName: full_name,
//                 hospitalName: hospital_name,
//                 bookingId: id,
//                 status: 'sent'
//             });
//         } catch (logError) {
//             logger.warn('Failed to save email log:', logError);
//         }
 
//         return { success: true };
 
//     } catch (error) {
//         logger.error('Error sending feedback email:', error);
//         throw error;
//     }
// }








//     // Mark meeting as completed (legacy - kept for backward compatibility)
//     static async markMeetingAsCompleted(bookingId) {
//         try {
//             logger.info(`📝 Marking booking #${bookingId} as completed via legacy method`);
            
//             const bookingResult = await executeQuery(
//                 `SELECT * FROM book_demo WHERE id = $1`,
//                 [bookingId]
//             );
            
//             if (bookingResult.rows.length === 0) {
//                 throw new Error('Booking not found');
//             }
            
//             const booking = bookingResult.rows[0];
            
//             if (booking.feedback_sent) {
//                 logger.info(`Feedback already sent for booking #${bookingId}`);
//                 return { success: true, message: 'Feedback already sent', booking };
//             }
            
//             // Use the updated status method to maintain consistency
//             const BookDemoService = require('./bookDemoService');
//             const updatedBooking = await BookDemoService.updateBookingStatus(bookingId, 'completed');
            
//             return { success: true, booking: updatedBooking };
            
//         } catch (error) {
//             logger.error('Error marking meeting as completed:', error);
//             throw error;
//         }
//     }

//     // ✅ UPDATED: Submit feedback - Now stores interested_in_service
//     static async submitFeedback(data) {
//         try {
//             const {
//                 bookingId,
//                 rating,
//                 wouldRecommend,
//                 interestedInService,
//                 feedbackText,
//                 additionalComments,
//                 ipAddress,
//                 userAgent
//             } = data;
            
//             // Check if booking exists and get details
//             const bookingResult = await executeQuery(
//                 `SELECT id, full_name, email, hospital_name, feedback_received FROM book_demo WHERE id = $1`,
//                 [bookingId]
//             );
            
//             if (bookingResult.rows.length === 0) {
//                 throw new Error('Booking not found');
//             }
            
//             const booking = bookingResult.rows[0];
            
//             // Check if feedback already submitted
//             if (booking.feedback_received) {
//                 throw new Error('Feedback already submitted');
//             }
            
//             // Start transaction
//             await executeQuery('BEGIN');
            
//             try {
//                 // Insert feedback
//                 const result = await executeQuery(
//                     `
//                     INSERT INTO demo_feedback (
//                         booking_id,
//                         rating,
//                         would_recommend,
//                         interested_in_service,
//                         feedback_text,
//                         additional_comments,
//                         ip_address,
//                         user_agent,
//                         submitted_at
//                     )
//                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
//                     RETURNING id
//                     `,
//                     [
//                         bookingId,
//                         rating,
//                         wouldRecommend,
//                         interestedInService,
//                         feedbackText,
//                         additionalComments,
//                         ipAddress,
//                         userAgent
//                     ]
//                 );
                
//                 // ✅ UPDATED: Update booking with feedback received and interest status
//                 await executeQuery(
//                     `
//                     UPDATE book_demo 
//                     SET 
//                         feedback_received = true,
//                         feedback_received_at = NOW(),
//                         updated_at = NOW()
//                     WHERE id = $1
//                     `,
//                     [bookingId]
//                 );
                
//                 await executeQuery('COMMIT');
                
//                 return {
//                     success: true,
//                     feedbackId: result.rows[0].id,
//                     bookingId: bookingId,
//                     interestedInService: interestedInService
//                 };
                
//             } catch (error) {
//                 await executeQuery('ROLLBACK');
//                 throw error;
//             }
            
//         } catch (error) {
//             logger.error('Error submitting feedback:', error);
//             throw error;
//         }
//     }

//     // ✅ NEW: Check if user can view pricing
//     static async canViewPricing(bookingId) {
//         try {
//             // Get booking details
//             const bookingResult = await executeQuery(
//                 `SELECT feedback_received FROM book_demo WHERE id = $1`,
//                 [bookingId]
//             );
            
//             if (bookingResult.rows.length === 0) {
//                 return { canView: false, message: 'Booking not found' };
//             }
            
//             const booking = bookingResult.rows[0];
            
//             // Check if feedback was submitted
//             if (!booking.feedback_received) {
//                 return { 
//                     canView: false, 
//                     message: 'Please submit feedback first' 
//                 };
//             }
            
//             // Check if user is interested in service
//             const feedbackResult = await executeQuery(
//                 `
//                 SELECT interested_in_service 
//                 FROM demo_feedback 
//                 WHERE booking_id = $1 
//                 ORDER BY submitted_at DESC 
//                 LIMIT 1
//                 `,
//                 [bookingId]
//             );
            
//             const isInterested = feedbackResult.rows[0]?.interested_in_service || false;
            
//             if (!isInterested) {
//                 return { 
//                     canView: false, 
//                     message: 'You indicated you are not interested in our services' 
//                 };
//             }
            
//             return { 
//                 canView: true, 
//                 message: 'You can view pricing plans' 
//             };
            
//         } catch (error) {
//             logger.error('Error checking pricing access:', error);
//             return { canView: false, message: 'Error checking access' };
//         }
//     }

//     // Get feedback by booking ID
//     static async getFeedbackByBookingId(bookingId) {
//         try {
//             const result = await executeQuery(
//                 `SELECT * FROM demo_feedback WHERE booking_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
//                 [bookingId]
//             );
//             return result.rows[0] || null;
//         } catch (error) {
//             logger.error('Error fetching feedback:', error);
//             return null;
//         }
//     }

//     // Get all feedback (for admin dashboard)
//     static async getAllFeedback(limit = 100, offset = 0) {
//         try {
//             const result = await executeQuery(
//                 `
//                 SELECT 
//                     df.*,
//                     bd.full_name,
//                     bd.email,
//                     bd.hospital_name,
//                     bd.scheduled_at,
//                     bd.status
//                 FROM demo_feedback df
//                 JOIN book_demo bd ON df.booking_id = bd.id
//                 ORDER BY df.submitted_at DESC
//                 LIMIT $1 OFFSET $2
//                 `,
//                 [limit, offset]
//             );
//             return result.rows;
//         } catch (error) {
//             logger.error('Error fetching all feedback:', error);
//             return [];
//         }
//     }

//     // Get feedback statistics
//     static async getFeedbackStats() {
//         try {
//             const result = await executeQuery(
//                 `
//                 SELECT 
//                     COUNT(*) as total_feedback,
//                     AVG(rating) as average_rating,
//                     COUNT(CASE WHEN would_recommend = true THEN 1 END) as recommend_count,
//                     COUNT(CASE WHEN would_recommend = false THEN 1 END) as not_recommend_count,
//                     COUNT(CASE WHEN interested_in_service = true THEN 1 END) as interested_count,
//                     COUNT(CASE WHEN interested_in_service = false THEN 1 END) as not_interested_count
//                 FROM demo_feedback
//                 `
//             );
//             return result.rows[0];
//         } catch (error) {
//             logger.error('Error fetching feedback stats:', error);
//             return null;
//         }
//     }
// }

// module.exports = FeedbackService;















const { executeQuery } = require('../config/database');
const BookDemoEmailService = require('./bookDemoEmailService');
const logger = require('../utils/logger');
const BookDemoService = require('./bookDemoService'); // Added for use in markMeetingAsCompleted

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Send feedback email to customer after demo
 */
exports.sendFeedbackEmail = async (booking) => {
    try {
        const { id, full_name, email, hospital_name, scheduled_at } = booking;

        // Generate unique feedback token
        const token = Buffer.from(`${id}-${Date.now()}`).toString('base64');

        // Mark feedback as sent
        await executeQuery(
            `
            UPDATE book_demo 
            SET 
                feedback_sent = true,
                feedback_sent_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            `,
            [id]
        );

        const feedbackUrl = process.env.FEEDBACK_URL || 'http://localhost:3000';
        const subject = "How was your VetDesk demo?";

        const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demo Feedback</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
  background:#f0f4f8;
  font-family:Arial,Helvetica,sans-serif;
  color:#1e293b;
  padding:40px 16px;
}
.email-wrapper{max-width:600px;margin:0 auto;}
.email-container{background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;}
.header{
  background:#0c1a2e;
  padding:30px 36px;
  border-bottom:3px solid #ff7a1a;
}
.header h1{color:#ffffff;font-size:20px;font-weight:700;margin:0;}
.header p{color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.5px;text-transform:uppercase;margin-top:4px;}
.body{padding:40px 36px;}
.greeting{font-size:16px;color:#0f172a;margin-bottom:16px;font-weight:600;}
.text{color:#4b5563;line-height:1.7;margin-bottom:24px;font-size:15px;}
.info-card{border:1px solid #e7ebef;border-radius:10px;overflow:hidden;margin-bottom:28px;}
.info-row{display:flex;border-bottom:1px solid #e7ebef;}
.info-row:last-child{border-bottom:none;}
.info-cell{width:50%;padding:14px 18px;border-right:1px solid #e7ebef;}
.info-cell:last-child{border-right:none;}
.info-label{font-size:10.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;margin-bottom:5px;}
.info-value{font-size:14px;font-weight:600;color:#0f172a;}
.info-value.orange{color:#ff7a1a;}
.cta{text-align:center;margin:32px 0 8px;}
.btn{
  display:inline-block;
  background:#0c8ce0;
  color:#ffffff !important;
  padding:14px 40px;
  border-radius:8px;
  text-decoration:none;
  font-weight:700;
  font-size:15px;
}
.expiry{font-size:12.5px;color:#94a3b8;text-align:center;margin-top:16px;}
.footer{border-top:1px solid #e7ebef;background:#f8fafc;padding:22px 36px;text-align:center;}
.footer p{font-size:12px;color:#94a3b8;margin:0;}
.footer p strong{color:#0f172a;}
.footer p span{color:#ff7a1a;}
@media(max-width:520px){
  .body{padding:26px;}
  .header{padding:22px 24px;}
  .header h1{font-size:18px;}
  .info-row{flex-direction:column;}
  .info-cell{width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
  .info-cell:last-child{border-bottom:none;}
  .btn{display:block;padding:14px 20px;font-size:14px;}
}
</style>
</head>
<body>
<div class="email-wrapper">
<div class="email-container">
<div class="header">
<h1>We'd Love Your Feedback</h1>
<p>VetDesk.ai &bull; Veterinary Care Platform</p>
</div>
<div class="body">
<p class="greeting">Hi ${full_name},</p>
<p class="text">
      Thank you for attending the VetDesk demo! We'd love to hear about your experience.
</p>

    <div class="info-card">
<div class="info-row">
<div class="info-cell">
<div class="info-label">Hospital</div>
<div class="info-value">${hospital_name}</div>
</div>
<div class="info-cell">
<div class="info-label">Demo Date</div>
<div class="info-value orange">${scheduled_at ? new Date(scheduled_at).toLocaleDateString() : 'N/A'}</div>
</div>
</div>
</div>

    <p class="text">
      Your feedback helps us improve and serve you better. It will only take 2 minutes.
</p>

    <div class="cta">
<a href="${feedbackUrl}/feedbackform/${token}" class="btn">Give Feedback</a>
</div>

    <p class="expiry">This link expires in 7 days.</p>
</div>
<div class="footer">
<p><strong>VetDesk</strong><span>.ai</span> &bull; Veterinary Care Platform</p>
<p style="margin-top:4px;">Questions? Reply to this email.</p>
</div>
</div>
</div>
</body>
</html>`;

        // Send email
        await BookDemoEmailService.sendEmailViaGmailAPI({
            to: email,
            subject: subject,
            html: html
        });

        // Log email
        try {
            await BookDemoEmailService.saveEmailLog({
                toEmail: email,
                fromEmail: await BookDemoEmailService.getSenderEmail(),
                subject: subject,
                bodyHtml: html,
                fullName: full_name,
                hospitalName: hospital_name,
                bookingId: id,
                status: 'sent'
            });
        } catch (logError) {
            logger.warn('Failed to save email log:', logError);
        }

        return { success: true };

    } catch (error) {
        logger.error('Error sending feedback email:', error);
        throw error;
    }
};

/**
 * Mark meeting as completed (legacy - kept for backward compatibility)
 */
exports.markMeetingAsCompleted = async (bookingId) => {
    try {
        logger.info(`📝 Marking booking #${bookingId} as completed via legacy method`);

        const bookingResult = await executeQuery(
            `SELECT * FROM book_demo WHERE id = $1`,
            [bookingId]
        );

        if (bookingResult.rows.length === 0) {
            throw new Error('Booking not found');
        }

        const booking = bookingResult.rows[0];

        if (booking.feedback_sent) {
            logger.info(`Feedback already sent for booking #${bookingId}`);
            return { success: true, message: 'Feedback already sent', booking };
        }

        // Use the updated status method to maintain consistency
        const updatedBooking = await BookDemoService.updateBookingStatus(bookingId, 'completed');

        return { success: true, booking: updatedBooking };

    } catch (error) {
        logger.error('Error marking meeting as completed:', error);
        throw error;
    }
};

/**
 * Submit feedback – stores interested_in_service
 */
exports.submitFeedback = async (data) => {
    try {
        const {
            bookingId,
            rating,
            wouldRecommend,
            interestedInService,
            feedbackText,
            additionalComments,
            ipAddress,
            userAgent
        } = data;

        // Check if booking exists and get details
        const bookingResult = await executeQuery(
            `SELECT id, full_name, email, hospital_name, feedback_received FROM book_demo WHERE id = $1`,
            [bookingId]
        );

        if (bookingResult.rows.length === 0) {
            throw new Error('Booking not found');
        }

        const booking = bookingResult.rows[0];

        // Check if feedback already submitted
        if (booking.feedback_received) {
            throw new Error('Feedback already submitted');
        }

        // Start transaction
        await executeQuery('BEGIN');

        try {
            // Insert feedback
            const result = await executeQuery(
                `
                INSERT INTO demo_feedback (
                    booking_id,
                    rating,
                    would_recommend,
                    interested_in_service,
                    feedback_text,
                    additional_comments,
                    ip_address,
                    user_agent,
                    submitted_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING id
                `,
                [
                    bookingId,
                    rating,
                    wouldRecommend,
                    interestedInService,
                    feedbackText,
                    additionalComments,
                    ipAddress,
                    userAgent
                ]
            );

            // Update booking with feedback received and interest status
            await executeQuery(
                `
                UPDATE book_demo 
                SET 
                    feedback_received = true,
                    feedback_received_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                `,
                [bookingId]
            );

            await executeQuery('COMMIT');

            return {
                success: true,
                feedbackId: result.rows[0].id,
                bookingId: bookingId,
                interestedInService: interestedInService
            };

        } catch (error) {
            await executeQuery('ROLLBACK');
            throw error;
        }

    } catch (error) {
        logger.error('Error submitting feedback:', error);
        throw error;
    }
};

/**
 * Check if user can view pricing
 */
exports.canViewPricing = async (bookingId) => {
    try {
        // Get booking details
        const bookingResult = await executeQuery(
            `SELECT feedback_received FROM book_demo WHERE id = $1`,
            [bookingId]
        );

        if (bookingResult.rows.length === 0) {
            return { canView: false, message: 'Booking not found' };
        }

        const booking = bookingResult.rows[0];

        // Check if feedback was submitted
        if (!booking.feedback_received) {
            return {
                canView: false,
                message: 'Please submit feedback first'
            };
        }

        // Check if user is interested in service
        const feedbackResult = await executeQuery(
            `
            SELECT interested_in_service 
            FROM demo_feedback 
            WHERE booking_id = $1 
            ORDER BY submitted_at DESC 
            LIMIT 1
            `,
            [bookingId]
        );

        const isInterested = feedbackResult.rows[0]?.interested_in_service || false;

        if (!isInterested) {
            return {
                canView: false,
                message: 'You indicated you are not interested in our services'
            };
        }

        return {
            canView: true,
            message: 'You can view pricing plans'
        };

    } catch (error) {
        logger.error('Error checking pricing access:', error);
        return { canView: false, message: 'Error checking access' };
    }
};

/**
 * Get feedback by booking ID
 */
exports.getFeedbackByBookingId = async (bookingId) => {
    try {
        const result = await executeQuery(
            `SELECT * FROM demo_feedback WHERE booking_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
            [bookingId]
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Error fetching feedback:', error);
        return null;
    }
};

/**
 * Get all feedback (for admin dashboard)
 */
exports.getAllFeedback = async (limit = 100, offset = 0) => {
    try {
        const result = await executeQuery(
            `
            SELECT 
                df.*,
                bd.full_name,
                bd.email,
                bd.hospital_name,
                bd.scheduled_at,
                bd.status
            FROM demo_feedback df
            JOIN book_demo bd ON df.booking_id = bd.id
            ORDER BY df.submitted_at DESC
            LIMIT $1 OFFSET $2
            `,
            [limit, offset]
        );
        return result.rows;
    } catch (error) {
        logger.error('Error fetching all feedback:', error);
        return [];
    }
};

/**
 * Get feedback statistics
 */
exports.getFeedbackStats = async () => {
    try {
        const result = await executeQuery(
            `
            SELECT 
                COUNT(*) as total_feedback,
                AVG(rating) as average_rating,
                COUNT(CASE WHEN would_recommend = true THEN 1 END) as recommend_count,
                COUNT(CASE WHEN would_recommend = false THEN 1 END) as not_recommend_count,
                COUNT(CASE WHEN interested_in_service = true THEN 1 END) as interested_count,
                COUNT(CASE WHEN interested_in_service = false THEN 1 END) as not_interested_count
            FROM demo_feedback
            `
        );
        return result.rows[0];
    } catch (error) {
        logger.error('Error fetching feedback stats:', error);
        return null;
    }
};