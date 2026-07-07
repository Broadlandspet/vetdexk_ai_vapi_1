const { executeQuery } = require('../config/database');
const BookDemoEmailService = require('./bookDemoEmailService');

const logger = require('../utils/logger');

class FeedbackService {

    // Mark meeting as completed and send feedback email
    static async markMeetingAsCompleted(bookingId) {
        try {
            logger.info(`📝 Marking booking #${bookingId} as completed`);
            
            // Get booking details
            const bookingResult = await executeQuery(
                `SELECT * FROM book_demo WHERE id = $1`,
                [bookingId]
            );
            
            if (bookingResult.rows.length === 0) {
                throw new Error('Booking not found');
            }
            
            const booking = bookingResult.rows[0];
            
            // Check if feedback already sent
            if (booking.feedback_sent) {
                logger.info(`Feedback already sent for booking #${bookingId}`);
                return { success: true, message: 'Feedback already sent' };
            }
            
            // Send feedback email
            try {
                await this.sendFeedbackEmail(booking);
                logger.info(`📧 Feedback email sent to ${booking.email}`);
            } catch (emailError) {
                logger.error('Failed to send feedback email:', emailError);
                throw emailError;
            }
            
            return { success: true, booking };
            
        } catch (error) {
            logger.error('Error marking meeting as completed:', error);
            throw error;
        }
    }

    // Send feedback email to user
    static async sendFeedbackEmail(booking) {
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
                    feedback_sent_at = NOW()
                WHERE id = $1
                `,
                [id]
            );
            
            const subject = " How was your VetDesk demo?";
            
            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demo Feedback</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;padding:40px 16px;}
        .email-wrapper{max-width:600px;margin:0 auto;}
        .email-container{background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6f0f7;box-shadow:0 4px 12px rgba(0,0,0,0.06);}
        .header{background:#0f1923;padding:30px 36px;border-bottom:3px solid #ff7a1a;}
        .header h1{color:#ffffff;font-size:22px;font-weight:700;margin:0;}
        .body{padding:36px;}
        .info-box{background:#f8fbfe;border-radius:10px;padding:14px 18px;margin-bottom:24px;border-left:4px solid #2BB7FF;}
        .info-box p{margin:4px 0;color:#1a2e3f;font-size:14px;}
        .info-box p strong{color:#0f1923;}
        .feedback-text{color:#374151;line-height:1.7;margin-bottom:24px;}
        .btn{display:inline-block;background:#0c8ce0;color:#ffffff !important;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;text-align:center;}
        .btn:hover{background:#0a78c4;}
        .footer{border-top:1px solid #e6f0f7;padding:20px 36px;text-align:center;}
        .footer p{font-size:12px;color:#9ca3af;margin:0;}
        @media(max-width:520px){.body{padding:24px;}.header{padding:20px 24px;}.header h1{font-size:18px;}.btn{display:block;padding:14px 20px;font-size:15px;}}
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1>📝 We'd Love Your Feedback!</h1>
            </div>
            <div class="body">
                <p style="font-size:16px;color:#0f1923;margin-bottom:16px;">Hi ${full_name},</p>
                <p style="color:#374151;line-height:1.7;margin-bottom:20px;">
                    Thank you for attending the VetDesk demo! We'd love to hear about your experience.
                </p>
                
                <div class="info-box">
                    <p><strong>Hospital:</strong> ${hospital_name}</p>
                    <p><strong>Demo Date:</strong> ${new Date(scheduled_at).toLocaleDateString()}</p>
                </div>
                
                <p style="color:#374151;line-height:1.7;margin-bottom:28px;">
                    Your feedback helps us improve and serve you better. It will only take 2 minutes!
                </p>
                
                <div style="text-align:center;margin:30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/feedback/${token}" class="btn">
                        Give Feedback
                    </a>
                </div>
                
                <p style="font-size:13px;color:#9ca3af;text-align:center;margin-top:20px;">
                    ⏰ This link expires in 7 days
                </p>
            </div>
            <div class="footer">
                <p>VetDesk — Veterinary Care Platform</p>
                <p style="margin-top:4px;">Questions? Reply to this email</p>
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
            
            return { success: true };
            
        } catch (error) {
            logger.error('Error sending feedback email:', error);
            throw error;
        }
    }

    // Submit feedback
    static async submitFeedback(data) {
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
            
            // Get booking details
            const bookingResult = await executeQuery(
                `SELECT id, full_name, email, hospital_name FROM book_demo WHERE id = $1`,
                [bookingId]
            );
            
            if (bookingResult.rows.length === 0) {
                throw new Error('Booking not found');
            }
            
            const booking = bookingResult.rows[0];
            
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
                    user_agent
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
            
            // Update booking
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
            
            return {
                success: true,
                feedbackId: result.rows[0].id,
                interestedInService: interestedInService
            };
            
        } catch (error) {
            logger.error('Error submitting feedback:', error);
            throw error;
        }
    }

    // Get feedback by booking ID
    static async getFeedbackByBookingId(bookingId) {
        try {
            const result = await executeQuery(
                `SELECT * FROM demo_feedback WHERE booking_id = $1`,
                [bookingId]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error fetching feedback:', error);
            return null;
        }
    }
}

module.exports = FeedbackService;