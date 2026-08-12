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
const env = require('../config/env');
// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Send feedback email to customer after demo
 */
// exports.sendFeedbackEmail = async (booking) => {
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
// };




// ─── HELPERS: Escaping ──────────────────────────────────────────────────────────

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const escapeMultilineHtml = (value) =>
    escapeHtml(value).replace(/\r?\n/g, '<br>');

// ─── EMAIL TEMPLATE HELPERS ────────────────────────────────────────────────────

const LOGO_URL =
    'https://dodiovomtwngjvxvfmki.supabase.co/storage/v1/object/public/site_logo/logo2.png';

const emailHead = (title) => `
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
  >

  <meta name="x-apple-disable-message-reformatting">

  <meta
    name="format-detection"
    content="telephone=no,date=no,address=no,email=no"
  >

  <title>${title}</title>

  <!--[if mso]>
  <style type="text/css">
    table, td, div, p, a, h1 {
      font-family: Arial, Helvetica, sans-serif !important;
    }
  </style>
  <![endif]-->

  <style type="text/css">
    html, body {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    body {
      background-color: #f0f4f8;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table {
      border-spacing: 0;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    img {
      display: block;
      height: auto;
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    a { text-decoration: none; }

    .cell-label {
      margin: 0 0 6px;
      color: #94a3b8;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5px;
      font-weight: 700;
      line-height: 15px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    .cell-value {
      margin: 0;
      color: #14181f;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      font-weight: 500;
      line-height: 21px;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .cell-value a { color: #0c8ce0; text-decoration: none; }

    @media only screen and (max-width: 640px) {
      .outer-padding { padding: 18px 10px !important; }
      .header-padding { padding: 20px !important; }
      .body-padding { padding: 30px 20px !important; }
      .footer-padding { padding: 22px 20px !important; }
      .title { font-size: 23px !important; line-height: 30px !important; }

      .summary-item {
        display: block !important;
        width: 100% !important;
        border-right: 0 !important;
        border-bottom: 1px solid #e7ebef !important;
      }
      .summary-item:last-child { border-bottom: 0 !important; }

      .details-cell {
        display: block !important;
        width: 100% !important;
        border-right: 0 !important;
        border-bottom: 1px solid #e7ebef !important;
      }
      .last-details-row .details-cell:last-child { border-bottom: 0 !important; }
      .details-cell-full { display: table-cell !important; }
    }

    @media only screen and (max-width: 420px) {
      .header-logo-cell, .header-badge-cell {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }
      .header-badge-cell { padding-top: 14px !important; }
      .header-logo { width: 100% !important; max-width: 300px !important; }
      .cta-button { display: block !important; }
    }
  </style>
</head>
`;

const emailHeader = (badgeText, badgeColor = '#ff7a1a', badgeBg = '#fff3ea', badgeBorder = '#ffd4bc') => `
<tr>
  <td
    class="header-padding"
    style="
      padding:24px 40px;
      border-bottom:1px solid #e7ebef;
      border-radius:14px 14px 0 0;
      background:#ffffff;
    "
  >
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td class="header-logo-cell" width="70%" valign="middle" style="width:70%;vertical-align:middle;">
          <img
            class="header-logo"
            src="${LOGO_URL}"
            alt="VetDesk.ai"
            width="360"
            style="display:block;width:100%;max-width:360px;height:auto;border:0;"
          >
        </td>

        <td class="header-badge-cell" width="30%" align="right" valign="middle" style="width:30%;text-align:right;vertical-align:middle;">
          <span
            style="
              display:inline-block;
              padding:8px 14px;
              border:1px solid ${badgeBorder};
              border-radius:6px;
              background:${badgeBg};
              color:${badgeColor};
              font-family:Arial,Helvetica,sans-serif;
              font-size:11.5px;
              font-weight:700;
              line-height:15px;
              letter-spacing:0.6px;
              text-transform:uppercase;
              white-space:nowrap;
            "
          >
            ${badgeText}
          </span>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

const emailFooter = (subLine, submittedAt) => `
<tr>
  <td
    class="footer-padding"
    align="center"
    style="
      padding:26px 40px;
      border-top:1px solid #e7ebef;
      border-radius:0 0 14px 14px;
      background:#f8fafc;
      text-align:center;
    "
  >
    <div style="color:#14181f;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:19px;">
      VetDesk<span style="color:#ff7a1a;">.ai</span>
    </div>

    <div style="margin-top:6px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:21px;">
      ${subLine}
    </div>

    <div
      style="
        margin-top:12px;
        padding-top:12px;
        border-top:1px solid #e7ebef;
        color:#94a3b8;
        font-family:Arial,Helvetica,sans-serif;
        font-size:10.5px;
        line-height:17px;
      "
    >
      Please do not reply to this email &nbsp;&bull;&nbsp; Sent at ${submittedAt}
    </div>
  </td>
</tr>
`;

const emailShellOpen = () => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
`;

const bodyOpen = () => `
<body style="width:100%;margin:0;padding:0;background:#f0f4f8;">
  <center style="width:100%;background:#f0f4f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f0f4f8;border-collapse:collapse;">
      <tr>
        <td class="outer-padding" align="center" style="padding:40px 16px;">
          <table
            role="presentation"
            class="email-shell"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:100%;
              max-width:640px;
              border:1px solid #e7ebef;
              border-radius:14px;
              background:#ffffff;
              border-collapse:separate;
              border-spacing:0;
              overflow:hidden;
            "
          >
`;

const bodyClose = () => `
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;

// ─── MAIN FEEDBACK FUNCTION ────────────────────────────────────────────────────

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

        const feedbackUrl = process.env.FEEDBACK_URL || 'https://vetdesk.ai/feedback';
        const subject = "How was your VetDesk demo?";

        const safeFullName = escapeMultilineHtml(full_name || 'Valued Customer');
        const safeHospitalName = escapeMultilineHtml(hospital_name || 'N/A');
        const safeBookingId = escapeHtml(id);
        const demoDate = scheduled_at ? new Date(scheduled_at).toLocaleDateString() : 'N/A';
        const submittedAt = escapeHtml(new Date().toLocaleString());
        const ctaUrl = escapeHtml(`${feedbackUrl}/feedbackform/${token}`);

        const html = `${emailShellOpen()}
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
${emailHead('Demo Feedback - VetDesk.ai')}
${bodyOpen()}
            ${emailHeader('Feedback Request', '#2e7d32', '#e8f5e9', '#a5d6a7')}

            <tr>
              <td class="body-padding" style="padding:44px 40px;background:#ffffff;">
                <div
                  style="
                    margin:0 0 12px;
                    color:#0c8ce0;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:11px;
                    font-weight:700;
                    line-height:15px;
                    letter-spacing:1.6px;
                    text-transform:uppercase;
                  "
                >
                  Demo Feedback
                </div>

                <h1
                  class="title"
                  style="
                    margin:0 0 14px;
                    color:#14181f;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:28px;
                    font-weight:700;
                    line-height:36px;
                  "
                >
                  We'd Love Your Feedback, ${safeFullName}
                </h1>

                <p
                  style="
                    margin:0 0 28px;
                    color:#4b5563;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:15px;
                    line-height:27px;
                  "
                >
                  Thank you for attending the VetDesk demo! We'd love to hear about your experience. Your feedback helps us improve and serve you better.
                </p>

                <!-- SUMMARY STRIP -->

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    margin:0 0 28px;
                    border:1px solid #e7ebef;
                    border-radius:10px;
                    border-collapse:separate;
                    border-spacing:0;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td
                      class="summary-item"
                      width="50%"
                      valign="top"
                      style="
                        width:50%;
                        padding:16px 20px;
                        background:#f8fafc;
                        border-right:1px solid #e7ebef;
                      "
                    >
                      <div class="cell-label">Hospital</div>
                      <div class="cell-value" style="font-weight:700;">${safeHospitalName}</div>
                    </td>

                    <td
                      class="summary-item"
                      width="50%"
                      valign="top"
                      style="
                        width:50%;
                        padding:16px 20px;
                        background:#f8fafc;
                      "
                    >
                      <div class="cell-label">Demo Date</div>
                      <div class="cell-value" style="font-weight:700;color:#ff7a1a;">${demoDate}</div>
                    </td>
                  </tr>
                </table>

                <!-- FEEDBACK CTA -->

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    margin:0 0 28px;
                    border:1px solid #e7ebef;
                    border-radius:12px;
                    background:#fafbfc;
                    border-collapse:collapse;
                  "
                >
                  <tr>
                    <td align="center" style="padding:32px 30px;text-align:center;">
                      <div style="margin:0 0 8px;color:#14181f;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;">
                        Share Your Experience
                      </div>

                      <div style="margin:0 0 24px;color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:23px;">
                        It takes less than 2 minutes and helps us serve you better.
                      </div>

                      <table
                        role="presentation"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        align="center"
                        style="margin:0 auto;border-collapse:separate;"
                      >
                        <tr>
                          <td
                            align="center"
                            bgcolor="#0c8ce0"
                            style="border-radius:8px;background:#0c8ce0;text-align:center;"
                          >
                            <a
                              class="cta-button"
                              href="${ctaUrl}"
                              style="
                                display:inline-block;
                                padding:14px 36px;
                                border:1px solid #0c8ce0;
                                border-radius:8px;
                                background:#0c8ce0;
                                color:#ffffff;
                                font-family:Arial,Helvetica,sans-serif;
                                font-size:15px;
                                font-weight:700;
                                line-height:19px;
                                text-align:center;
                                text-decoration:none;
                              "
                            >
                              Give Feedback
                            </a>
                          </td>
                        </tr>
                      </table>

                    
                    </td>
                  </tr>
                </table>     

            ${emailFooter('Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification', submittedAt)}
${bodyClose()}`;

        // Send email via Gmail API
        const result = await BookDemoEmailService.sendEmailViaGmailAPI({
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
                status: result.messageId ? 'sent' : 'fallback'
            });
        } catch (logError) {
            logger.warn('Failed to save email log:', logError);
        }

        logger.info(`📧 Feedback email sent to ${email} for booking #${id}`);
        return { success: true };

    } catch (error) {
        logger.error('Error sending feedback email:', error);
        throw error;
    }
};

/**
 * Save feedback submission from customer
 */
exports.saveFeedback = async (bookingId, feedbackData) => {
    try {
        const {
            rating,
            wouldRecommend,
            interestedInService,
            feedbackText,
            additionalComments
        } = feedbackData;

        const result = await executeQuery(
            `
            INSERT INTO demo_feedback (
                booking_id,
                rating,
                would_recommend,
                interested_in_service,
                feedback_text,
                additional_comments,
                submitted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
            `,
            [
                bookingId,
                rating,
                wouldRecommend,
                interestedInService,
                feedbackText,
                additionalComments
            ]
        );

        // Update booking to mark feedback as received
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

        logger.info(`📝 Feedback saved for booking #${bookingId}`);
        return {
            success: true,
            data: result.rows[0]
        };

    } catch (error) {
        logger.error('Error saving feedback:', error);
        throw error;
    }
};

/**
 * Get feedback for a booking
 */
exports.getFeedbackByBookingId = async (bookingId) => {
    try {
        const result = await executeQuery(
            `
            SELECT *
            FROM demo_feedback
            WHERE booking_id = $1
            ORDER BY submitted_at DESC
            LIMIT 1
            `,
            [bookingId]
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Error fetching feedback:', error);
        return null;
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