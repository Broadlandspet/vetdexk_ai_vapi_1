// const { google } = require('googleapis');
// const { executeQuery } = require('../config/database');
// const logger = require('../utils/logger');
// const env = require('../config/env');

// class BookDemoEmailService {


//   static async getActiveConfig() {
//     try {
//       const result = await executeQuery(
//         `SELECT * FROM email_config WHERE is_active = true LIMIT 1`
//       );
//       return result.rows[0] || null;
//     } catch (error) {
//       logger.error('Error fetching email config:', error);
//       return null;
//     }
//   }


//   static getOAuth2Client() {
//     const clientId = env.GOOGLE_CLIENT_ID;
//     const clientSecret = env.GOOGLE_CLIENT_SECRET;
//     const refreshToken = env.GOOGLE_GMAIL_REFRESH_TOKEN || env.GMAIL_REFRESH_TOKEN;

//     console.log('🔐 OAuth2 Configuration Check:');
//     console.log(`   Client ID: ${clientId ? '✅ Present' : '❌ Missing'}`);
//     console.log(`   Client Secret: ${clientSecret ? '✅ Present' : '❌ Missing'}`);
//     console.log(`   Refresh Token: ${refreshToken ? '✅ Present' : '❌ Missing'}`);

//     if (!clientId || !clientSecret || !refreshToken) {
//       logger.warn('⚠️ Missing Gmail OAuth2 credentials - email will not be sent');
//       return null;
//     }

//     const oAuth2Client = new google.auth.OAuth2(
//       clientId,
//       clientSecret,
//       env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
//     );

//     oAuth2Client.setCredentials({
//       refresh_token: refreshToken
//     });

//     return oAuth2Client;
//   }


//   static async sendEmailViaGmailAPI({ to, subject, html }) {
//     try {
//       if (!to || to === 'undefined' || to === 'null' || to.trim() === '') {
//         logger.error('❌ Invalid recipient email:', to);
//         throw new Error(`Invalid recipient email: "${to}"`);
//       }

//       const oAuth2Client = this.getOAuth2Client();

//       if (!oAuth2Client) {
//         logger.warn('📧 OAuth2 not configured - Email logged to console:');
//         logger.warn(`   To: ${to}`);
//         logger.warn(`   Subject: ${subject}`);
//         logger.warn(`   Body preview: ${html.substring(0, 300)}...`);
//         return { messageId: `fallback-${Date.now()}`, note: 'Email logged to console' };
//       }

//       const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
//       const fromEmail = await this.getSenderEmail();

//       if (!fromEmail || fromEmail === 'undefined' || fromEmail === 'null' || fromEmail.trim() === '') {
//         logger.error('❌ Invalid sender email:', fromEmail);
//         throw new Error(`Invalid sender email: "${fromEmail}"`);
//       }

//       logger.info(`📧 Sending email FROM: ${fromEmail} TO: ${to}`);

//       const emailLines = [
//         `From: "VetDesk.ai" <${fromEmail}>`,
//         `To: ${to}`,
//         `Subject: ${subject}`,
//         'Content-Type: text/html; charset=UTF-8',
//         '',
//         html
//       ];

//       const email = emailLines.join('\r\n');

//       const raw = Buffer.from(email)
//         .toString('base64')
//         .replace(/\+/g, '-')
//         .replace(/\//g, '_')
//         .replace(/=+$/, '');

//       const result = await gmail.users.messages.send({
//         userId: 'me',
//         requestBody: { raw }
//       });

//       logger.info(`✅ Email sent via Gmail API: ${result.data.id}`);
//       return { messageId: result.data.id };

//     } catch (error) {
//       logger.error('❌ Error sending email via Gmail API:', error.message);

//       logger.warn('📧 Email failed - Content logged to console:');
//       logger.warn(`   To: ${to}`);
//       logger.warn(`   Subject: ${subject}`);
//       logger.warn(`   Error: ${error.message}`);

//       return { messageId: `fallback-${Date.now()}`, note: `Email failed: ${error.message}` };
//     }
//   }


//   static async getSenderEmail() {
//     const config = await this.getActiveConfig();
//     if (config && config.from_email) {
//       return config.from_email;
//     }
//     return env.GOOGLE_EMAIL || env.GMAIL_FROM_EMAIL || 'anilkumarr0180@gmail.com';
//   }


//   static async getRecipientEmail() {
//     const config = await this.getActiveConfig();
//     if (config && config.to_email) {
//       return config.to_email;
//     }
//     return env.SUPERADMIN_EMAIL || 'rajdevfree@gmail.com';
//   }






// static async sendSuperAdminNotification(data) {
//   const {
//     fullName,
//     email,
//     hospitalName,
//     hospitalAddress,
//     hospitalEmail,
//     hospitalPhone,
//     notes,
//     bookingId
//   } = data;
 
//   const subject = `New Demo Request by ${hospitalName}`;
 
//   const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <title>New Demo Request</title>
// <style>
// *{margin:0;padding:0;box-sizing:border-box;}
// body{
//   background:#f0f4f8;
//   font-family:Arial,Helvetica,sans-serif;
//   color:#14181f;
//   padding:40px 16px;
// }
// .email-wrapper{max-width:640px;margin:0 auto;}
// .email-container{
//   background:#ffffff;
//   border-radius:14px;
//   overflow:hidden;
//   border:1px solid #e7ebef;
// }
// .email-header{
//   background:#0c1a2e;
//   padding:32px 40px;
//   border-bottom:3px solid #ff7a1a;
// }
// .brand-name{
//   font-family:Arial,Helvetica,sans-serif;
//   font-size:20px;
//   font-weight:700;
//   color:#ffffff;
//   margin:0;
//   line-height:1.2;
// }
// .brand-sub{
//   font-size:11px;
//   color:rgba(255,255,255,.55);
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   display:block;
//   margin-top:3px;
// }
// .header-badge{
//   display:inline-block;
//   background:rgba(255,122,26,.14);
//   color:#ff9c4d;
//   padding:8px 16px;
//   border-radius:6px;
//   font-size:11.5px;
//   font-weight:700;
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   border:1px solid rgba(255,122,26,.3);
// }
// .email-body{padding:44px 40px;}
// .eyebrow{
//   font-size:11px;
//   letter-spacing:1.6px;
//   font-weight:700;
//   color:#ff7a1a;
//   text-transform:uppercase;
//   margin-bottom:12px;
// }
// .title{
//   font-size:28px;
//   font-weight:700;
//   line-height:1.3;
//   color:#14181f;
//   margin-bottom:14px;
// }
// .subtitle{
//   font-size:15px;
//   line-height:1.8;
//   color:#4b5563;
//   margin-bottom:32px;
// }
// .summary{
//   display:table;
//   width:100%;
//   border-radius:10px;
//   overflow:hidden;
//   margin-bottom:32px;
//   border:1px solid #e7ebef;
// }
// .summary-row{display:table-row;}
// .summary-item{
//   display:table-cell;
//   width:33.33%;
//   padding:16px 20px;
//   background:#f8fafc;
//   border-right:1px solid #e7ebef;
//   vertical-align:top;
// }
// .summary-item:last-child{border-right:none;}
// .summary-label{
//   font-size:10.5px;
//   color:#94a3b8;
//   text-transform:uppercase;
//   letter-spacing:.7px;
//   font-weight:700;
//   margin-bottom:6px;
// }
// .summary-value{
//   font-size:15px;
//   font-weight:700;
//   color:#14181f;
// }
// .summary-value.orange{color:#ff7a1a;}
// .summary-value.blue{color:#0c8ce0;}
// .section{margin-bottom:28px;}
// .section-title{
//   font-size:14px;
//   font-weight:700;
//   color:#14181f;
//   margin-bottom:14px;
//   padding-bottom:10px;
//   border-bottom:2px solid #0c8ce0;
//   display:inline-block;
// }
// .details{
//   border:1px solid #e7ebef;
//   border-radius:10px;
//   overflow:hidden;
// }
// .det-row{
//   display:flex;
//   border-bottom:1px solid #e7ebef;
// }
// .det-row:last-child{border-bottom:none;}
// .cell{
//   width:50%;
//   padding:16px 18px;
//   border-right:1px solid #e7ebef;
// }
// .cell:last-child{border-right:none;}
// .cell-full{width:100%;padding:16px 18px;}
// .cell-label{
//   font-size:10.5px;
//   color:#94a3b8;
//   text-transform:uppercase;
//   letter-spacing:.6px;
//   font-weight:700;
//   margin-bottom:6px;
// }
// .cell-value{
//   font-size:14px;
//   font-weight:500;
//   color:#14181f;
//   word-break:break-word;
//   line-height:1.5;
// }
// .cell-value a{color:#0c8ce0;text-decoration:none;}
// .status-pill{
//   display:inline-block;
//   padding:4px 12px;
//   border-radius:6px;
//   background:#fff3ea;
//   color:#ff7a1a;
//   font-weight:700;
//   font-size:12px;
//   border:1px solid #ffd4bc;
// }
// .notes-box{
//   background:#f8fafc;
//   padding:20px;
//   border-radius:10px;
//   border:1px solid #e7ebef;
//   font-size:14px;
//   line-height:1.8;
//   color:#374151;
// }
// .cta{
//   text-align:center;
//   margin-top:32px;
//   padding-top:28px;
//   border-top:1px solid #e7ebef;
// }
// .cta-button{
//   display:inline-block;
//   padding:14px 36px;
//   background:#0c8ce0;
//   color:#ffffff !important;
//   text-decoration:none;
//   font-weight:700;
//   font-size:15px;
//   border-radius:8px;
// }
// .email-footer{
//   padding:26px 40px;
//   text-align:center;
//   background:#f8fafc;
//   border-top:1px solid #e7ebef;
// }
// .footer-brand{
//   font-size:14px;
//   font-weight:700;
//   color:#14181f;
// }
// .footer-brand span{color:#ff7a1a;}
// .footer-sub{
//   font-size:11.5px;
//   color:#94a3b8;
//   line-height:1.8;
//   margin-top:6px;
// }
// @media(max-width:600px){
//   .email-body{padding:28px 22px;}
//   .email-header{padding:24px 22px;}
//   .email-footer{padding:22px;}
//   .title{font-size:23px;}
//   .summary{display:block;}
//   .summary-row{display:block;}
//   .summary-item{display:block;width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
//   .summary-item:last-child{border-bottom:none;}
//   .det-row{flex-direction:column;}
//   .cell{width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
//   .cell:last-child{border-bottom:none;}
// }
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">
//   <div class="email-header">
//     <table width="100%" cellpadding="0" cellspacing="0" border="0">
//       <tr>
//         <td valign="middle" style="padding:0;">
//           <p class="brand-name">VetDesk<span style="color:#ff7a1a;">.ai</span></p>
//           <span class="brand-sub">Veterinary Care Platform</span>
//         </td>
//         <td valign="middle" align="right" style="padding:0;">
//           <div class="header-badge">New Demo Request</div>
//         </td>
//       </tr>
//     </table>
//   </div>
//   <div class="email-body">
//     <div class="eyebrow">Demo Request</div>
//     <div class="title">A new demo request has arrived.</div>
//     <div class="subtitle">
//       A hospital administrator has completed the VetDesk demo request form.
//       Review the details below and follow up with the customer promptly.
//     </div>
//     <div class="summary">
//       <div class="summary-row">
//         <div class="summary-item">
//           <div class="summary-label">Request ID</div>
//           <div class="summary-value orange">#${bookingId}</div>
//         </div>
//         <div class="summary-item">
//           <div class="summary-label">Status</div>
//           <div class="summary-value blue">New</div>
//         </div>
//         <div class="summary-item">
//           <div class="summary-label">Submitted</div>
//           <div class="summary-value" style="font-size:13px;">${new Date().toLocaleString()}</div>
//         </div>
//       </div>
//     </div>
//     <div class="section">
//       <div class="section-title">Requester Information</div>
//       <div class="details">
//         <div class="det-row">
//           <div class="cell">
//             <div class="cell-label">Contact Name</div>
//             <div class="cell-value">${fullName}</div>
//           </div>
//           <div class="cell">
//             <div class="cell-label">Email Address</div>
//             <div class="cell-value"><a href="mailto:${email}">${email}</a></div>
//           </div>
//         </div>
//         <div class="det-row">
//           <div class="cell">
//             <div class="cell-label">Hospital Name</div>
//             <div class="cell-value">${hospitalName}</div>
//           </div>
//           <div class="cell">
//             <div class="cell-label">Hospital Email</div>
//             <div class="cell-value"><a href="mailto:${hospitalEmail}">${hospitalEmail}</a></div>
//           </div>
//         </div>
//         <div class="det-row">
//           <div class="cell">
//             <div class="cell-label">Hospital Phone</div>
//             <div class="cell-value">${hospitalPhone}</div>
//           </div>
//           <div class="cell">
//             <div class="cell-label">Current Status</div>
//             <div class="cell-value">
//               <span class="status-pill">New</span>
//             </div>
//           </div>
//         </div>
//         <div class="det-row">
//           <div class="cell-full">
//             <div class="cell-label">Hospital Address</div>
//             <div class="cell-value">${hospitalAddress}</div>
//           </div>
//         </div>
//       </div>
//     </div>
//     <div class="section">
//       <div class="section-title">Additional Notes</div>
//       <div class="notes-box">
//         ${notes
//         ? `${notes}`
//         : `<span style="color:#9ca3af;font-style:italic;">No additional notes were provided.</span>`
//       }
//       </div>
//     </div>
//     <div class="cta">
//       <a href="${env.FRONTEND_URL || '#'}" class="cta-button">View All Bookings &rarr;</a>
//     </div>
//   </div>
//   <div class="email-footer">
//     <div class="footer-brand">VetDesk<span>.ai</span></div>
//     <div class="footer-sub">
//       Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification<br>
//       Please do not reply to this email &nbsp;&bull;&nbsp; Sent at ${new Date().toLocaleString()}
//     </div>
//   </div>
// </div>
// </div>
// </body>
// </html>`;
 
//   const toEmail = await this.getRecipientEmail();
//   const fromEmail = await this.getSenderEmail();
 
//   logger.info(`Email configuration: FROM: ${fromEmail} TO: ${toEmail}`);
 
//   try {
//     const result = await this.sendEmailViaGmailAPI({
//       to: toEmail,
//       subject: subject,
//       html: html
//     });
 
//     await this.saveEmailLog({
//       toEmail: toEmail,
//       fromEmail: fromEmail,
//       subject: subject,
//       bodyHtml: html,
//       fullName: fullName,
//       hospitalName: hospitalName,
//       hospitalPhone: hospitalPhone,
//       bookingId: bookingId,
//       status: result.messageId ? 'sent' : 'fallback'
//     });
 
//     logger.info(`Super Admin notification sent to: ${toEmail}`);
//     return { success: true, result };
 
//   } catch (error) {
//     logger.error('Error sending Super Admin notification:', error.message);
 
//     await this.saveEmailLog({
//       toEmail: toEmail,
//       fromEmail: fromEmail,
//       subject: subject,
//       bodyHtml: html,
//       fullName: fullName,
//       hospitalName: hospitalName,
//       hospitalPhone: hospitalPhone,
//       bookingId: bookingId,
//       status: 'failed',
//       errorMessage: error.message
//     });
 
//     return { success: false, error: error.message };
//   }
// }







// static async sendCustomerConfirmation(data) {
//   const { fullName, email, hospitalName, bookingId } = data;
//   const subject = "Thanks for requesting a VetDesk demo";
//   const calendlyUrl = env.CALENDLY_URL || 'https://calendly.com/anilkumarr0180/30min';
 
//   const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <title>Demo Confirmed</title>
// <style>
// *{margin:0;padding:0;box-sizing:border-box;}
// body{
//   background:#f0f4f8;
//   font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//   color:#1e293b;
//   padding:40px 16px;
// }
// .email-wrapper{max-width:620px;margin:0 auto;}
// .email-container{background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;}
// .header{
//   background:#0c1a2e;
//   padding:28px 40px;
//   display:flex;
//   align-items:center;
//   justify-content:space-between;
// }
// .logo-main{display:block;font-weight:700;font-size:18px;color:#ffffff;line-height:1.2;}
// .logo-main span{color:#ff7a1a;}
// .logo-sub{display:block;font-size:10.5px;color:rgba(255,255,255,0.55);letter-spacing:0.5px;text-transform:uppercase;font-weight:500;margin-top:3px;}
// .badge{
//   background:rgba(255,122,26,0.12);
//   color:#ff9c4d;
//   padding:8px 18px;
//   border-radius:6px;
//   font-size:12px;
//   font-weight:700;
//   letter-spacing:0.4px;
//   text-transform:uppercase;
//   border:1px solid rgba(255,122,26,0.35);
// }
// .body{padding:44px 40px 36px;}
// .eyebrow{font-size:11px;letter-spacing:1.6px;font-weight:700;color:#ff7a1a;text-transform:uppercase;margin-bottom:12px;}
// .title{font-size:26px;font-weight:700;line-height:1.35;color:#0f172a;margin-bottom:14px;}
// .title span{color:#ff7a1a;}
// .subtitle{font-size:15px;line-height:1.7;color:#4b5563;margin-bottom:32px;}
// .summary{display:table;width:100%;border-radius:10px;overflow:hidden;margin-bottom:32px;border:1px solid #e7ebef;}
// .summary-row{display:table-row;}
// .summary-item{display:table-cell;width:50%;padding:16px 20px;background:#f8fafc;border-right:1px solid #e7ebef;vertical-align:top;}
// .summary-item:last-child{border-right:none;}
// .summary-label{font-size:10.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;font-weight:700;margin-bottom:6px;}
// .summary-value{font-size:15px;font-weight:700;color:#0f172a;}
// .summary-value.orange{color:#ff7a1a;}
// .section-title{font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e7ebef;}
// .cta-box{background:#fafbfc;border:1px solid #e7ebef;border-radius:12px;padding:32px 30px;text-align:center;margin-bottom:32px;}
// .cta-title{font-weight:700;font-size:18px;color:#0f172a;margin-bottom:8px;}
// .cta-sub{font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;}
// .cta-btn{display:inline-block;padding:14px 36px;background:#ff7a1a;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;}
// .cta-hint{font-size:12px;color:#94a3b8;margin-top:14px;}
// .steps{border:1px solid #e7ebef;border-radius:10px;overflow:hidden;margin-bottom:28px;}
// .step-row{padding:16px 20px;border-bottom:1px solid #e7ebef;font-size:14px;color:#374151;line-height:1.6;}
// .step-row:last-child{border-bottom:none;}
// .step-row strong{color:#0f172a;}
// .signoff{font-size:14px;color:#64748b;line-height:1.8;}
// .signoff-name{font-weight:700;color:#0f172a;margin-top:4px;display:block;}
// .footer{background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e7ebef;}
// .footer-brand{font-weight:700;font-size:14px;color:#0f172a;}
// .footer-brand span{color:#ff7a1a;}
// .footer-sub{font-size:12px;color:#94a3b8;line-height:1.6;margin-top:6px;}
// @media(max-width:600px){
//   .header, .body, .footer{padding:22px;}
//   .title{font-size:22px;}
//   .summary{display:block;}
//   .summary-row{display:block;}
//   .summary-item{display:block;width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
//   .summary-item:last-child{border-bottom:none;}
// }
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">
//   <div class="header">
//     <div>
//       <span class="logo-main">VetDesk<span>.ai</span></span>
//       <span class="logo-sub">Veterinary Care Platform</span>
//     </div>
//     <div class="badge">Confirmed</div>
//   </div>
 
//   <div class="body">
//     <div class="eyebrow">Demo Request</div>
//     <div class="title">You're all set, <span>${fullName}</span></div>
//     <div class="subtitle">
//       Your VetDesk demo request has been received. Select a time that works best for you, and we'll handle the rest.
//     </div>
 
//     <div class="summary">
//       <div class="summary-row">
//         <div class="summary-item">
//           <div class="summary-label">Request ID</div>
//           <div class="summary-value orange">#${bookingId}</div>
//         </div>
//         <div class="summary-item">
//           <div class="summary-label">Hospital</div>
//           <div class="summary-value">${hospitalName}</div>
//         </div>
//       </div>
//     </div>
 
//     <div class="cta-box">
//       <div class="cta-title">Schedule Your Demo</div>
//       <div class="cta-sub">Pick a date and time that suits you. It takes less than 2 minutes.</div>
//       <a href="${calendlyUrl}" class="cta-btn">Book My Demo</a>
//       <div class="cta-hint">Opens Calendly &bull; No account required</div>
//     </div>
 
//     <div class="section-title">What happens next?</div>
//     <div class="steps">
//       <div class="step-row">Click <strong>Book My Demo</strong> and select your preferred time.</div>
//       <div class="step-row">Calendly sends you a calendar invite with a meeting link.</div>
//       <div class="step-row">Our VetDesk team meets with you online for a complete walkthrough.</div>
//       <div class="step-row">Need help? Just reply to this email &mdash; we're happy to assist.</div>
//     </div>
 
//     <div class="signoff">
//       We look forward to showing you what VetDesk can do for your practice.
//       <span class="signoff-name">Kind regards, The VetDesk Team</span>
//     </div>
//   </div>
 
//   <div class="footer">
//     <div class="footer-brand">VetDesk<span>.ai</span></div>
//     <div class="footer-sub">Automated notification &bull; Questions? Reply to this email.</div>
//   </div>
// </div>
// </div>
// </body>
// </html>`;
 
//   try {
//     const result = await this.sendEmailViaGmailAPI({ to: email, subject, html });
//     await this.saveEmailLog({ toEmail: email, fromEmail: await this.getSenderEmail(), subject, bodyHtml: html, fullName, hospitalName, hospitalPhone: "", bookingId, status: result.messageId ? "sent" : "fallback" });
//     return { success: true, result };
//   } catch (error) { return { success: false, error: error.message }; }
// }




//   static async sendScheduledMeetingNotification(data) {
//     const {
//       fullName,
//       email,
//       hospitalName,
//       bookingId,
//       meetingTime,
//       meetingUrl,
//       meetingEnd
//     } = data;

//     const subject = ` Demo Meeting Scheduled for ${hospitalName}`;

//     const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <title>Meeting Scheduled</title>
// <style>
// *{margin:0;padding:0;box-sizing:border-box;}
// body{
//   background:#f0f4f8;
//   font-family:Arial,Helvetica,sans-serif;
//   color:#14181f;
//   padding:40px 16px;
// }
// .email-wrapper{max-width:640px;margin:0 auto;}
// .email-container{
//   background:#ffffff;
//   border-radius:18px;
//   overflow:hidden;
//   border:1px solid rgba(20,24,31,.09);
//   box-shadow:0 4px 8px rgba(0,0,0,.04),0 24px 56px rgba(0,0,0,.10);
// }
// .email-header{
//   background:#14181f;
//   padding:32px 40px;
//   border-bottom:3px solid #ff7a1a;
// }
// .logo-box{
//   width:46px;
//   height:46px;
//   background:#1fa8f0;
//   border-radius:12px;
//   display:inline-block;
//   text-align:center;
//   line-height:46px;
//   font-size:22px;
//   font-weight:700;
//   color:#ffffff;
//   vertical-align:middle;
// }
// .brand-name{
//   font-size:20px;
//   font-weight:700;
//   color:#ffffff;
//   margin:0;
//   line-height:1.2;
// }
// .brand-sub{
//   font-size:11px;
//   color:rgba(255,255,255,.55);
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   display:block;
//   margin-top:2px;
// }
// .header-badge{
//   display:inline-block;
//   background:#e8f5e9;
//   color:#2e7d32;
//   padding:9px 18px;
//   border-radius:999px;
//   font-size:12px;
//   font-weight:700;
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   border:1px solid #a5d6a7;
// }
// .email-body{padding:44px 40px 36px;}
// .hero{
//   text-align:center;
//   margin-bottom:32px;
// }
// .hero-icon{
//   font-size:48px;
//   margin-bottom:16px;
// }
// .hero-title{
//   font-size:28px;
//   font-weight:700;
//   color:#14181f;
//   margin-bottom:8px;
// }
// .hero-sub{
//   font-size:16px;
//   color:#6b7280;
// }
// .card{
//   border:1px solid #e7ebef;
//   border-radius:14px;
//   overflow:hidden;
//   margin-bottom:28px;
// }
// .card-header{
//   background:#f8fafc;
//   padding:14px 20px;
//   border-bottom:1px solid #e7ebef;
// }
// .card-header-title{
//   font-size:11px;
//   font-weight:700;
//   color:#9ca3af;
//   text-transform:uppercase;
//   letter-spacing:.7px;
// }
// .card-row{
//   display:flex;
//   border-bottom:1px solid rgba(20,24,31,.07);
// }
// .card-row:last-child{border-bottom:none;}
// .card-cell{
//   width:50%;
//   padding:16px 20px;
//   border-right:1px solid rgba(20,24,31,.07);
// }
// .card-cell:last-child{border-right:none;}
// .card-cell-full{width:100%;padding:16px 20px;}
// .card-label{
//   font-size:10.5px;
//   color:#9ca3af;
//   text-transform:uppercase;
//   letter-spacing:.6px;
//   font-weight:700;
//   margin-bottom:6px;
// }
// .card-value{
//   font-size:14px;
//   font-weight:600;
//   color:#14181f;
// }
// .card-value a{
//   color:#0c8ce0;
//   text-decoration:none;
// }
// .meeting-link-box{
//   background:#f0f7ff;
//   border:1px solid #b8d8f8;
//   border-radius:10px;
//   padding:16px 20px;
//   margin:12px 0;
//   word-break:break-all;
// }
// .meeting-link-box a{
//   color:#0c8ce0;
//   font-weight:600;
//   text-decoration:none;
// }
// .cta-button{
//   display:inline-block;
//   padding:15px 38px;
//   background:#0c8ce0;
//   color:#ffffff !important;
//   text-decoration:none;
//   font-weight:700;
//   font-size:15px;
//   border-radius:10px;
// }
// .cta{
//   text-align:center;
//   margin-top:28px;
//   padding-top:28px;
//   border-top:1px solid rgba(20,24,31,.07);
// }
// .email-footer{
//   padding:26px 40px;
//   text-align:center;
//   background:#f8fafc;
//   border-top:1px solid rgba(20,24,31,.07);
// }
// .footer-brand{
//   font-size:14px;
//   font-weight:700;
//   color:#14181f;
// }
// .footer-brand span{color:#ff7a1a;}
// .footer-sub{
//   font-size:11.5px;
//   color:#9ca3af;
//   line-height:1.8;
//   margin-top:6px;
// }
// @media(max-width:600px){
//   .email-body{padding:28px 22px;}
//   .email-header{padding:24px 22px;}
//   .email-footer{padding:22px;}
//   .card-row{flex-direction:column;}
//   .card-cell{width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.07);}
//   .card-cell:last-child{border-bottom:none;}
// }
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">
//   <div class="email-header">
//     <table width="100%" cellpadding="0" cellspacing="0" border="0">
//       <tr>
//         <td valign="middle">
//           <table cellpadding="0" cellspacing="0" border="0">
//             <tr>
//               <td valign="middle" style="padding-right:14px;">
//                 <div class="logo-box">V</div>
//               </td>
//               <td valign="middle">
//                 <p class="brand-name">VetDesk<span style="color:#ff7a1a;">.ai</span></p>
//                 <span class="brand-sub">Veterinary Care Platform</span>
//               </td>
//             </tr>
//           </table>
//         </td>
//         <td valign="middle" align="right">
//           <div class="header-badge">✅ Meeting Scheduled</div>
//         </td>
//       </tr>
//     </table>
//   </div>
//   <div class="email-body">
//     <div class="hero">
//       <div class="hero-icon">📅</div>
//       <div class="hero-title">Demo Meeting Scheduled!</div>
//       <div class="hero-sub">A customer has booked their demo meeting.</div>
//     </div>

//     <div class="card">
//       <div class="card-header">
//         <div class="card-header-title">Meeting Details</div>
//       </div>
//       <div class="card-row">
//         <div class="card-cell">
//           <div class="card-label">Customer</div>
//           <div class="card-value">${fullName}</div>
//         </div>
//         <div class="card-cell">
//           <div class="card-label">Email</div>
//           <div class="card-value"><a href="mailto:${email}">${email}</a></div>
//         </div>
//       </div>
//       <div class="card-row">
//         <div class="card-cell-full">
//           <div class="card-label">Hospital</div>
//           <div class="card-value">${hospitalName}</div>
//         </div>
//       </div>
//       <div class="card-row">
//         <div class="card-cell">
//           <div class="card-label">Date & Time</div>
//           <div class="card-value">${new Date(meetingTime).toLocaleString()}</div>
//         </div>
//         <div class="card-cell">
//           <div class="card-label">Booking ID</div>
//           <div class="card-value">#${bookingId}</div>
//         </div>
//       </div>
//       ${meetingEnd ? `
//       <div class="card-row">
//         <div class="card-cell-full">
//           <div class="card-label">End Time</div>
//           <div class="card-value">${new Date(meetingEnd).toLocaleString()}</div>
//         </div>
//       </div>
//       ` : ''}
//       <div class="card-row">
//         <div class="card-cell-full">
//           <div class="card-label">Meeting Link</div>
//           <div class="meeting-link-box">
//             <a href="${meetingUrl}" target="_blank">${meetingUrl}</a>
//           </div>
//         </div>
//       </div>
//     </div>

//     <div class="cta">
//       <a href="${env.CURRENT_URL || '#'}" class="cta-button">View All Bookings &rarr;</a>
//     </div>
//   </div>
//   <div class="email-footer">
//     <div class="footer-brand">VetDesk<span>.ai</span></div>
//     <div class="footer-sub">
//       Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification<br>
//       Please do not reply to this email &nbsp;&bull;&nbsp; Sent at ${new Date().toLocaleString()}
//     </div>
//   </div>
// </div>
// </div>
// </body>
// </html>`;

//     try {
//       const toEmail = await this.getRecipientEmail();
//       const result = await this.sendEmailViaGmailAPI({
//         to: toEmail,
//         subject: subject,
//         html: html
//       });

//       await this.saveEmailLog({
//         toEmail: toEmail,
//         fromEmail: await this.getSenderEmail(),
//         subject: subject,
//         bodyHtml: html,
//         fullName: fullName,
//         hospitalName: hospitalName,
//         hospitalPhone: "",
//         bookingId: bookingId,
//         status: result.messageId ? 'sent' : 'fallback'
//       });

//       logger.info(`Scheduled meeting notification sent to admin for ${email}`);
//       return { success: true, result };

//     } catch (error) {
//       logger.error('Failed to send scheduled meeting notification:', error);
//       return { success: false, error: error.message };
//     }
//   }

//   /**
//    * Save email log to database
//    */
//   static async saveEmailLog(data) {
//     try {
//       const {
//         toEmail,
//         fromEmail,
//         subject,
//         bodyHtml,
//         fullName,
//         hospitalName,
//         hospitalPhone,
//         bookingId,
//         status = 'sent',
//         errorMessage = null
//       } = data;

//       await executeQuery(
//         `INSERT INTO email_logs (
//                     to_email, from_email, subject, body_html,
//                     caller_name, caller_number, reason_for_call,
//                     call_summary, status, error_message, created_at
//                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
//         [
//           toEmail,
//           fromEmail,
//           subject,
//           bodyHtml,
//           fullName || 'Unknown',
//           hospitalPhone || 'N/A',
//           'Demo Booking Request - Super Admin',
//           `Demo booking request from ${hospitalName} (Booking #${bookingId})`,
//           status,
//           errorMessage
//         ]
//       );

//       logger.info(`📧 Email log saved for ${toEmail} (Status: ${status})`);
//       return true;

//     } catch (error) {
//       logger.error('Error saving email log:', error);
//       return false;
//     }
//   }
// }

// module.exports = BookDemoEmailService;








const { google } = require('googleapis');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const env = require('../config/env');

// ─── Helper: reference to exports for internal calls ──────────────────────────
const self = exports;

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get active email configuration from database
 */
exports.getActiveConfig = async () => {
    try {
        const result = await executeQuery(
            `SELECT * FROM email_config WHERE is_active = true LIMIT 1`
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Error fetching email config:', error);
        return null;
    }
};

/**
 * Get OAuth2 client for Gmail API
 */
exports.getOAuth2Client = () => {
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const refreshToken = env.GOOGLE_GMAIL_REFRESH_TOKEN || env.GMAIL_REFRESH_TOKEN;

    console.log('🔐 OAuth2 Configuration Check:');
    console.log(`   Client ID: ${clientId ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Client Secret: ${clientSecret ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Refresh Token: ${refreshToken ? '✅ Present' : '❌ Missing'}`);

    if (!clientId || !clientSecret || !refreshToken) {
        logger.warn('⚠️ Missing Gmail OAuth2 credentials - email will not be sent');
        return null;
    }

    const oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
    );

    oAuth2Client.setCredentials({
        refresh_token: refreshToken
    });

    return oAuth2Client;
};

/**
 * Send email via Gmail API (with fallback logging)
 */
exports.sendEmailViaGmailAPI = async ({ to, subject, html }) => {
    try {
        if (!to || to === 'undefined' || to === 'null' || to.trim() === '') {
            logger.error('❌ Invalid recipient email:', to);
            throw new Error(`Invalid recipient email: "${to}"`);
        }

        const oAuth2Client = self.getOAuth2Client();

        if (!oAuth2Client) {
            logger.warn('📧 OAuth2 not configured - Email logged to console:');
            logger.warn(`   To: ${to}`);
            logger.warn(`   Subject: ${subject}`);
            logger.warn(`   Body preview: ${html.substring(0, 300)}...`);
            return { messageId: `fallback-${Date.now()}`, note: 'Email logged to console' };
        }

        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        const fromEmail = await self.getSenderEmail();

        if (!fromEmail || fromEmail === 'undefined' || fromEmail === 'null' || fromEmail.trim() === '') {
            logger.error('❌ Invalid sender email:', fromEmail);
            throw new Error(`Invalid sender email: "${fromEmail}"`);
        }

        logger.info(`📧 Sending email FROM: ${fromEmail} TO: ${to}`);

        const emailLines = [
            `From: "VetDesk.ai" <${fromEmail}>`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/html; charset=UTF-8',
            '',
            html
        ];

        const email = emailLines.join('\r\n');

        const raw = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw }
        });

        logger.info(`✅ Email sent via Gmail API: ${result.data.id}`);
        return { messageId: result.data.id };

    } catch (error) {
        logger.error('❌ Error sending email via Gmail API:', error.message);

        logger.warn('📧 Email failed - Content logged to console:');
        logger.warn(`   To: ${to}`);
        logger.warn(`   Subject: ${subject}`);
        logger.warn(`   Error: ${error.message}`);

        return { messageId: `fallback-${Date.now()}`, note: `Email failed: ${error.message}` };
    }
};

/**
 * Get sender email from config or fallback
 */
exports.getSenderEmail = async () => {
    const config = await self.getActiveConfig();
    if (config && config.from_email) {
        return config.from_email;
    }
    return env.GOOGLE_EMAIL || env.GMAIL_FROM_EMAIL || 'anilkumarr0180@gmail.com';
};

/**
 * Get recipient email (Super Admin) from config or fallback
 */
exports.getRecipientEmail = async () => {
    const config = await self.getActiveConfig();
    if (config && config.to_email) {
        return config.to_email;
    }
    return env.SUPERADMIN_EMAIL || 'rajdevfree@gmail.com';
};

// ─── Email: Super Admin Notification ────────────────────────────────────────────

// exports.sendSuperAdminNotification = async (data) => {
//     const {
//         fullName,
//         email,
//         hospitalName,
//         hospitalAddress,
//         hospitalEmail,
//         hospitalPhone,
//         notes,
//         bookingId
//     } = data;

//     const subject = `New Demo Request by ${hospitalName}`;

//     const html = `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <title>New Demo Request</title>
// <style>
// *{margin:0;padding:0;box-sizing:border-box;}
// body{
//   background:#f0f4f8;
//   font-family:Arial,Helvetica,sans-serif;
//   color:#14181f;
//   padding:40px 16px;
// }
// .email-wrapper{max-width:640px;margin:0 auto;}
// .email-container{
//   background:#ffffff;
//   border-radius:14px;
//   overflow:hidden;
//   border:1px solid #e7ebef;
// }
// .email-header{
//   background:#0c1a2e;
//   padding:32px 40px;
//   border-bottom:3px solid #ff7a1a;
// }
// .brand-name{
//   font-family:Arial,Helvetica,sans-serif;
//   font-size:20px;
//   font-weight:700;
//   color:#ffffff;
//   margin:0;
//   line-height:1.2;
// }
// .brand-sub{
//   font-size:11px;
//   color:rgba(255,255,255,.55);
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   display:block;
//   margin-top:3px;
// }
// .header-badge{
//   display:inline-block;
//   background:rgba(255,122,26,.14);
//   color:#ff9c4d;
//   padding:8px 16px;
//   border-radius:6px;
//   font-size:11.5px;
//   font-weight:700;
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   border:1px solid rgba(255,122,26,.3);
// }
// .email-body{padding:44px 40px;}
// .eyebrow{
//   font-size:11px;
//   letter-spacing:1.6px;
//   font-weight:700;
//   color:#ff7a1a;
//   text-transform:uppercase;
//   margin-bottom:12px;
// }
// .title{
//   font-size:28px;
//   font-weight:700;
//   line-height:1.3;
//   color:#14181f;
//   margin-bottom:14px;
// }
// .subtitle{
//   font-size:15px;
//   line-height:1.8;
//   color:#4b5563;
//   margin-bottom:32px;
// }
// .summary{
//   display:table;
//   width:100%;
//   border-radius:10px;
//   overflow:hidden;
//   margin-bottom:32px;
//   border:1px solid #e7ebef;
// }
// .summary-row{display:table-row;}
// .summary-item{
//   display:table-cell;
//   width:33.33%;
//   padding:16px 20px;
//   background:#f8fafc;
//   border-right:1px solid #e7ebef;
//   vertical-align:top;
// }
// .summary-item:last-child{border-right:none;}
// .summary-label{
//   font-size:10.5px;
//   color:#94a3b8;
//   text-transform:uppercase;
//   letter-spacing:.7px;
//   font-weight:700;
//   margin-bottom:6px;
// }
// .summary-value{
//   font-size:15px;
//   font-weight:700;
//   color:#14181f;
// }
// .summary-value.orange{color:#ff7a1a;}
// .summary-value.blue{color:#0c8ce0;}
// .section{margin-bottom:28px;}
// .section-title{
//   font-size:14px;
//   font-weight:700;
//   color:#14181f;
//   margin-bottom:14px;
//   padding-bottom:10px;
//   border-bottom:2px solid #0c8ce0;
//   display:inline-block;
// }
// .details{
//   border:1px solid #e7ebef;
//   border-radius:10px;
//   overflow:hidden;
// }
// .det-row{
//   display:flex;
//   border-bottom:1px solid #e7ebef;
// }
// .det-row:last-child{border-bottom:none;}
// .cell{
//   width:50%;
//   padding:16px 18px;
//   border-right:1px solid #e7ebef;
// }
// .cell:last-child{border-right:none;}
// .cell-full{width:100%;padding:16px 18px;}
// .cell-label{
//   font-size:10.5px;
//   color:#94a3b8;
//   text-transform:uppercase;
//   letter-spacing:.6px;
//   font-weight:700;
//   margin-bottom:6px;
// }
// .cell-value{
//   font-size:14px;
//   font-weight:500;
//   color:#14181f;
//   word-break:break-word;
//   line-height:1.5;
// }
// .cell-value a{color:#0c8ce0;text-decoration:none;}
// .status-pill{
//   display:inline-block;
//   padding:4px 12px;
//   border-radius:6px;
//   background:#fff3ea;
//   color:#ff7a1a;
//   font-weight:700;
//   font-size:12px;
//   border:1px solid #ffd4bc;
// }
// .notes-box{
//   background:#f8fafc;
//   padding:20px;
//   border-radius:10px;
//   border:1px solid #e7ebef;
//   font-size:14px;
//   line-height:1.8;
//   color:#374151;
// }
// .cta{
//   text-align:center;
//   margin-top:32px;
//   padding-top:28px;
//   border-top:1px solid #e7ebef;
// }
// .cta-button{
//   display:inline-block;
//   padding:14px 36px;
//   background:#0c8ce0;
//   color:#ffffff !important;
//   text-decoration:none;
//   font-weight:700;
//   font-size:15px;
//   border-radius:8px;
// }
// .email-footer{
//   padding:26px 40px;
//   text-align:center;
//   background:#f8fafc;
//   border-top:1px solid #e7ebef;
// }
// .footer-brand{
//   font-size:14px;
//   font-weight:700;
//   color:#14181f;
// }
// .footer-brand span{color:#ff7a1a;}
// .footer-sub{
//   font-size:11.5px;
//   color:#94a3b8;
//   line-height:1.8;
//   margin-top:6px;
// }
// @media(max-width:600px){
//   .email-body{padding:28px 22px;}
//   .email-header{padding:24px 22px;}
//   .email-footer{padding:22px;}
//   .title{font-size:23px;}
//   .summary{display:block;}
//   .summary-row{display:block;}
//   .summary-item{display:block;width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
//   .summary-item:last-child{border-bottom:none;}
//   .det-row{flex-direction:column;}
//   .cell{width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
//   .cell:last-child{border-bottom:none;}
// }
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">
//   <div class="email-header">
//     <table width="100%" cellpadding="0" cellspacing="0" border="0">
//       <tr>
//         <td valign="middle" style="padding:0;">
//           <p class="brand-name">VetDesk<span style="color:#ff7a1a;">.ai</span></p>
//           <span class="brand-sub">Veterinary Care Platform</span>
//         </td>
//         <td valign="middle" align="right" style="padding:0;">
//           <div class="header-badge">New Demo Request</div>
//         </td>
//       </tr>
//     </table>
//   </div>
//   <div class="email-body">
//     <div class="eyebrow">Demo Request</div>
//     <div class="title">A new demo request has arrived.</div>
//     <div class="subtitle">
//       A hospital administrator has completed the VetDesk demo request form.
//       Review the details below and follow up with the customer promptly.
//     </div>
//     <div class="summary">
//       <div class="summary-row">
//         <div class="summary-item">
//           <div class="summary-label">Request ID</div>
//           <div class="summary-value orange">#${bookingId}</div>
//         </div>
//         <div class="summary-item">
//           <div class="summary-label">Status</div>
//           <div class="summary-value blue">New</div>
//         </div>
//         <div class="summary-item">
//           <div class="summary-label">Submitted</div>
//           <div class="summary-value" style="font-size:13px;">${new Date().toLocaleString()}</div>
//         </div>
//       </div>
//     </div>
//     <div class="section">
//       <div class="section-title">Requester Information</div>
//       <div class="details">
//         <div class="det-row">
//           <div class="cell">
//             <div class="cell-label">Contact Name</div>
//             <div class="cell-value">${fullName}</div>
//           </div>
//           <div class="cell">
//             <div class="cell-label">Email Address</div>
//             <div class="cell-value"><a href="mailto:${email}">${email}</a></div>
//           </div>
//         </div>
//         <div class="det-row">
//           <div class="cell">
//             <div class="cell-label">Hospital Name</div>
//             <div class="cell-value">${hospitalName}</div>
//           </div>
//           <div class="cell">
//             <div class="cell-label">Hospital Email</div>
//             <div class="cell-value"><a href="mailto:${hospitalEmail}">${hospitalEmail}</a></div>
//           </div>
//         </div>
//         <div class="det-row">
//           <div class="cell">
//             <div class="cell-label">Hospital Phone</div>
//             <div class="cell-value">${hospitalPhone}</div>
//           </div>
//           <div class="cell">
//             <div class="cell-label">Current Status</div>
//             <div class="cell-value">
//               <span class="status-pill">New</span>
//             </div>
//           </div>
//         </div>
//         <div class="det-row">
//           <div class="cell-full">
//             <div class="cell-label">Hospital Address</div>
//             <div class="cell-value">${hospitalAddress}</div>
//           </div>
//         </div>
//       </div>
//     </div>
//     <div class="section">
//       <div class="section-title">Additional Notes</div>
//       <div class="notes-box">
//         ${notes
//         ? `${notes}`
//         : `<span style="color:#9ca3af;font-style:italic;">No additional notes were provided.</span>`
//       }
//       </div>
//     </div>
//     <div class="cta">
//       <a href="${env.FRONTEND_URL || '#'}" class="cta-button">View All Bookings &rarr;</a>
//     </div>
//   </div>
//   <div class="email-footer">
//     <div class="footer-brand">VetDesk<span>.ai</span></div>
//     <div class="footer-sub">
//       Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification<br>
//       Please do not reply to this email &nbsp;&bull;&nbsp; Sent at ${new Date().toLocaleString()}
//     </div>
//   </div>
// </div>
// </div>
// </body>
// </html>`;

//     const toEmail = await self.getRecipientEmail();
//     const fromEmail = await self.getSenderEmail();

//     logger.info(`Email configuration: FROM: ${fromEmail} TO: ${toEmail}`);

//     try {
//         const result = await self.sendEmailViaGmailAPI({
//             to: toEmail,
//             subject: subject,
//             html: html
//         });

//         await self.saveEmailLog({
//             toEmail: toEmail,
//             fromEmail: fromEmail,
//             subject: subject,
//             bodyHtml: html,
//             fullName: fullName,
//             hospitalName: hospitalName,
//             hospitalPhone: hospitalPhone,
//             bookingId: bookingId,
//             status: result.messageId ? 'sent' : 'fallback'
//         });

//         logger.info(`Super Admin notification sent to: ${toEmail}`);
//         return { success: true, result };

//     } catch (error) {
//         logger.error('Error sending Super Admin notification:', error.message);

//         await self.saveEmailLog({
//             toEmail: toEmail,
//             fromEmail: fromEmail,
//             subject: subject,
//             bodyHtml: html,
//             fullName: fullName,
//             hospitalName: hospitalName,
//             hospitalPhone: hospitalPhone,
//             bookingId: bookingId,
//             status: 'failed',
//             errorMessage: error.message
//         });

//         return { success: false, error: error.message };
//     }
// };

// // ─── Email: Customer Confirmation ───────────────────────────────────────────────

// exports.sendCustomerConfirmation = async (data) => {
//     const { fullName, email, hospitalName, bookingId } = data;
//     const subject = "Thanks for requesting a VetDesk demo";
//     const calendlyUrl = env.CALENDLY_URL || 'https://calendly.com/anilkumarr0180/30min';

//     const html = `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <title>Demo Confirmed</title>
// <style>
// *{margin:0;padding:0;box-sizing:border-box;}
// body{
//   background:#f0f4f8;
//   font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//   color:#1e293b;
//   padding:40px 16px;
// }
// .email-wrapper{max-width:620px;margin:0 auto;}
// .email-container{background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;}
// .header{
//   background:#0c1a2e;
//   padding:28px 40px;
//   display:flex;
//   align-items:center;
//   justify-content:space-between;
// }
// .logo-main{display:block;font-weight:700;font-size:18px;color:#ffffff;line-height:1.2;}
// .logo-main span{color:#ff7a1a;}
// .logo-sub{display:block;font-size:10.5px;color:rgba(255,255,255,0.55);letter-spacing:0.5px;text-transform:uppercase;font-weight:500;margin-top:3px;}
// .badge{
//   background:rgba(255,122,26,0.12);
//   color:#ff9c4d;
//   padding:8px 18px;
//   border-radius:6px;
//   font-size:12px;
//   font-weight:700;
//   letter-spacing:0.4px;
//   text-transform:uppercase;
//   border:1px solid rgba(255,122,26,0.35);
// }
// .body{padding:44px 40px 36px;}
// .eyebrow{font-size:11px;letter-spacing:1.6px;font-weight:700;color:#ff7a1a;text-transform:uppercase;margin-bottom:12px;}
// .title{font-size:26px;font-weight:700;line-height:1.35;color:#0f172a;margin-bottom:14px;}
// .title span{color:#ff7a1a;}
// .subtitle{font-size:15px;line-height:1.7;color:#4b5563;margin-bottom:32px;}
// .summary{display:table;width:100%;border-radius:10px;overflow:hidden;margin-bottom:32px;border:1px solid #e7ebef;}
// .summary-row{display:table-row;}
// .summary-item{display:table-cell;width:50%;padding:16px 20px;background:#f8fafc;border-right:1px solid #e7ebef;vertical-align:top;}
// .summary-item:last-child{border-right:none;}
// .summary-label{font-size:10.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;font-weight:700;margin-bottom:6px;}
// .summary-value{font-size:15px;font-weight:700;color:#0f172a;}
// .summary-value.orange{color:#ff7a1a;}
// .section-title{font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e7ebef;}
// .cta-box{background:#fafbfc;border:1px solid #e7ebef;border-radius:12px;padding:32px 30px;text-align:center;margin-bottom:32px;}
// .cta-title{font-weight:700;font-size:18px;color:#0f172a;margin-bottom:8px;}
// .cta-sub{font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;}
// .cta-btn{display:inline-block;padding:14px 36px;background:#ff7a1a;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;}
// .cta-hint{font-size:12px;color:#94a3b8;margin-top:14px;}
// .steps{border:1px solid #e7ebef;border-radius:10px;overflow:hidden;margin-bottom:28px;}
// .step-row{padding:16px 20px;border-bottom:1px solid #e7ebef;font-size:14px;color:#374151;line-height:1.6;}
// .step-row:last-child{border-bottom:none;}
// .step-row strong{color:#0f172a;}
// .signoff{font-size:14px;color:#64748b;line-height:1.8;}
// .signoff-name{font-weight:700;color:#0f172a;margin-top:4px;display:block;}
// .footer{background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e7ebef;}
// .footer-brand{font-weight:700;font-size:14px;color:#0f172a;}
// .footer-brand span{color:#ff7a1a;}
// .footer-sub{font-size:12px;color:#94a3b8;line-height:1.6;margin-top:6px;}
// @media(max-width:600px){
//   .header, .body, .footer{padding:22px;}
//   .title{font-size:22px;}
//   .summary{display:block;}
//   .summary-row{display:block;}
//   .summary-item{display:block;width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
//   .summary-item:last-child{border-bottom:none;}
// }
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">
//   <div class="header">
//     <div>
//       <span class="logo-main">VetDesk<span>.ai</span></span>
//       <span class="logo-sub">Veterinary Care Platform</span>
//     </div>
//     <div class="badge">Confirmed</div>
//   </div>

//   <div class="body">
//     <div class="eyebrow">Demo Request</div>
//     <div class="title">You're all set, <span>${fullName}</span></div>
//     <div class="subtitle">
//       Your VetDesk demo request has been received. Select a time that works best for you, and we'll handle the rest.
//     </div>

//     <div class="summary">
//       <div class="summary-row">
//         <div class="summary-item">
//           <div class="summary-label">Request ID</div>
//           <div class="summary-value orange">#${bookingId}</div>
//         </div>
//         <div class="summary-item">
//           <div class="summary-label">Hospital</div>
//           <div class="summary-value">${hospitalName}</div>
//         </div>
//       </div>
//     </div>

//     <div class="cta-box">
//       <div class="cta-title">Schedule Your Demo</div>
//       <div class="cta-sub">Pick a date and time that suits you. It takes less than 2 minutes.</div>
//       <a href="${calendlyUrl}" class="cta-btn">Book My Demo</a>
//       <div class="cta-hint">Opens Calendly &bull; No account required</div>
//     </div>

//     <div class="section-title">What happens next?</div>
//     <div class="steps">
//       <div class="step-row">Click <strong>Book My Demo</strong> and select your preferred time.</div>
//       <div class="step-row">Calendly sends you a calendar invite with a meeting link.</div>
//       <div class="step-row">Our VetDesk team meets with you online for a complete walkthrough.</div>
//       <div class="step-row">Need help? Just reply to this email &mdash; we're happy to assist.</div>
//     </div>

//     <div class="signoff">
//       We look forward to showing you what VetDesk can do for your practice.
//       <span class="signoff-name">Kind regards, The VetDesk Team</span>
//     </div>
//   </div>

//   <div class="footer">
//     <div class="footer-brand">VetDesk<span>.ai</span></div>
//     <div class="footer-sub">Automated notification &bull; Questions? Reply to this email.</div>
//   </div>
// </div>
// </div>
// </body>
// </html>`;

//     try {
//         const result = await self.sendEmailViaGmailAPI({ to: email, subject, html });
//         await self.saveEmailLog({
//             toEmail: email,
//             fromEmail: await self.getSenderEmail(),
//             subject,
//             bodyHtml: html,
//             fullName,
//             hospitalName,
//             hospitalPhone: "",
//             bookingId,
//             status: result.messageId ? "sent" : "fallback"
//         });
//         return { success: true, result };
//     } catch (error) {
//         return { success: false, error: error.message };
//     }
// };

// // ─── Email: Scheduled Meeting Notification (Admin) ─────────────────────────────

// exports.sendScheduledMeetingNotification = async (data) => {
//     const {
//         fullName,
//         email,
//         hospitalName,
//         bookingId,
//         meetingTime,
//         meetingUrl,
//         meetingEnd
//     } = data;

//     const subject = `Demo Meeting Scheduled for ${hospitalName}`;

//     const html = `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <title>Meeting Scheduled</title>
// <style>
// *{margin:0;padding:0;box-sizing:border-box;}
// body{
//   background:#f0f4f8;
//   font-family:Arial,Helvetica,sans-serif;
//   color:#14181f;
//   padding:40px 16px;
// }
// .email-wrapper{max-width:640px;margin:0 auto;}
// .email-container{
//   background:#ffffff;
//   border-radius:18px;
//   overflow:hidden;
//   border:1px solid rgba(20,24,31,.09);
//   box-shadow:0 4px 8px rgba(0,0,0,.04),0 24px 56px rgba(0,0,0,.10);
// }
// .email-header{
//   background:#14181f;
//   padding:32px 40px;
//   border-bottom:3px solid #ff7a1a;
// }
// .logo-box{
//   width:46px;
//   height:46px;
//   background:#1fa8f0;
//   border-radius:12px;
//   display:inline-block;
//   text-align:center;
//   line-height:46px;
//   font-size:22px;
//   font-weight:700;
//   color:#ffffff;
//   vertical-align:middle;
// }
// .brand-name{
//   font-size:20px;
//   font-weight:700;
//   color:#ffffff;
//   margin:0;
//   line-height:1.2;
// }
// .brand-sub{
//   font-size:11px;
//   color:rgba(255,255,255,.55);
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   display:block;
//   margin-top:2px;
// }
// .header-badge{
//   display:inline-block;
//   background:#e8f5e9;
//   color:#2e7d32;
//   padding:9px 18px;
//   border-radius:999px;
//   font-size:12px;
//   font-weight:700;
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   border:1px solid #a5d6a7;
// }
// .email-body{padding:44px 40px 36px;}
// .hero{
//   text-align:center;
//   margin-bottom:32px;
// }
// .hero-icon{
//   font-size:48px;
//   margin-bottom:16px;
// }
// .hero-title{
//   font-size:28px;
//   font-weight:700;
//   color:#14181f;
//   margin-bottom:8px;
// }
// .hero-sub{
//   font-size:16px;
//   color:#6b7280;
// }
// .card{
//   border:1px solid #e7ebef;
//   border-radius:14px;
//   overflow:hidden;
//   margin-bottom:28px;
// }
// .card-header{
//   background:#f8fafc;
//   padding:14px 20px;
//   border-bottom:1px solid #e7ebef;
// }
// .card-header-title{
//   font-size:11px;
//   font-weight:700;
//   color:#9ca3af;
//   text-transform:uppercase;
//   letter-spacing:.7px;
// }
// .card-row{
//   display:flex;
//   border-bottom:1px solid rgba(20,24,31,.07);
// }
// .card-row:last-child{border-bottom:none;}
// .card-cell{
//   width:50%;
//   padding:16px 20px;
//   border-right:1px solid rgba(20,24,31,.07);
// }
// .card-cell:last-child{border-right:none;}
// .card-cell-full{width:100%;padding:16px 20px;}
// .card-label{
//   font-size:10.5px;
//   color:#9ca3af;
//   text-transform:uppercase;
//   letter-spacing:.6px;
//   font-weight:700;
//   margin-bottom:6px;
// }
// .card-value{
//   font-size:14px;
//   font-weight:600;
//   color:#14181f;
// }
// .card-value a{
//   color:#0c8ce0;
//   text-decoration:none;
// }
// .meeting-link-box{
//   background:#f0f7ff;
//   border:1px solid #b8d8f8;
//   border-radius:10px;
//   padding:16px 20px;
//   margin:12px 0;
//   word-break:break-all;
// }
// .meeting-link-box a{
//   color:#0c8ce0;
//   font-weight:600;
//   text-decoration:none;
// }
// .cta-button{
//   display:inline-block;
//   padding:15px 38px;
//   background:#0c8ce0;
//   color:#ffffff !important;
//   text-decoration:none;
//   font-weight:700;
//   font-size:15px;
//   border-radius:10px;
// }
// .cta{
//   text-align:center;
//   margin-top:28px;
//   padding-top:28px;
//   border-top:1px solid rgba(20,24,31,.07);
// }
// .email-footer{
//   padding:26px 40px;
//   text-align:center;
//   background:#f8fafc;
//   border-top:1px solid rgba(20,24,31,.07);
// }
// .footer-brand{
//   font-size:14px;
//   font-weight:700;
//   color:#14181f;
// }
// .footer-brand span{color:#ff7a1a;}
// .footer-sub{
//   font-size:11.5px;
//   color:#9ca3af;
//   line-height:1.8;
//   margin-top:6px;
// }
// @media(max-width:600px){
//   .email-body{padding:28px 22px;}
//   .email-header{padding:24px 22px;}
//   .email-footer{padding:22px;}
//   .card-row{flex-direction:column;}
//   .card-cell{width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.07);}
//   .card-cell:last-child{border-bottom:none;}
// }
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">
//   <div class="email-header">
//     <table width="100%" cellpadding="0" cellspacing="0" border="0">
//       <tr>
//         <td valign="middle">
//           <table cellpadding="0" cellspacing="0" border="0">
//             <tr>
//               <td valign="middle" style="padding-right:14px;">
//                 <div class="logo-box">V</div>
//               </td>
//               <td valign="middle">
//                 <p class="brand-name">VetDesk<span style="color:#ff7a1a;">.ai</span></p>
//                 <span class="brand-sub">Veterinary Care Platform</span>
//               </td>
//             </tr>
//           </table>
//         </td>
//         <td valign="middle" align="right">
//           <div class="header-badge">✅ Meeting Scheduled</div>
//         </td>
//       </tr>
//     </table>
//   </div>
//   <div class="email-body">
//     <div class="hero">
//       <div class="hero-icon">📅</div>
//       <div class="hero-title">Demo Meeting Scheduled!</div>
//       <div class="hero-sub">A customer has booked their demo meeting.</div>
//     </div>

//     <div class="card">
//       <div class="card-header">
//         <div class="card-header-title">Meeting Details</div>
//       </div>
//       <div class="card-row">
//         <div class="card-cell">
//           <div class="card-label">Customer</div>
//           <div class="card-value">${fullName}</div>
//         </div>
//         <div class="card-cell">
//           <div class="card-label">Email</div>
//           <div class="card-value"><a href="mailto:${email}">${email}</a></div>
//         </div>
//       </div>
//       <div class="card-row">
//         <div class="card-cell-full">
//           <div class="card-label">Hospital</div>
//           <div class="card-value">${hospitalName}</div>
//         </div>
//       </div>
//       <div class="card-row">
//         <div class="card-cell">
//           <div class="card-label">Date & Time</div>
//           <div class="card-value">${new Date(meetingTime).toLocaleString()}</div>
//         </div>
//         <div class="card-cell">
//           <div class="card-label">Booking ID</div>
//           <div class="card-value">#${bookingId}</div>
//         </div>
//       </div>
//       ${meetingEnd ? `
//       <div class="card-row">
//         <div class="card-cell-full">
//           <div class="card-label">End Time</div>
//           <div class="card-value">${new Date(meetingEnd).toLocaleString()}</div>
//         </div>
//       </div>
//       ` : ''}
//       <div class="card-row">
//         <div class="card-cell-full">
//           <div class="card-label">Meeting Link</div>
//           <div class="meeting-link-box">
//             <a href="${meetingUrl}" target="_blank">${meetingUrl}</a>
//           </div>
//         </div>
//       </div>
//     </div>

//     <div class="cta">
//       <a href="${env.CURRENT_URL || '#'}" class="cta-button">View All Bookings &rarr;</a>
//     </div>
//   </div>
//   <div class="email-footer">
//     <div class="footer-brand">VetDesk<span>.ai</span></div>
//     <div class="footer-sub">
//       Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification<br>
//       Please do not reply to this email &nbsp;&bull;&nbsp; Sent at ${new Date().toLocaleString()}
//     </div>
//   </div>
// </div>
// </div>
// </body>
// </html>`;

//     try {
//         const toEmail = await self.getRecipientEmail();
//         const result = await self.sendEmailViaGmailAPI({
//             to: toEmail,
//             subject: subject,
//             html: html
//         });

//         await self.saveEmailLog({
//             toEmail: toEmail,
//             fromEmail: await self.getSenderEmail(),
//             subject: subject,
//             bodyHtml: html,
//             fullName: fullName,
//             hospitalName: hospitalName,
//             hospitalPhone: "",
//             bookingId: bookingId,
//             status: result.messageId ? 'sent' : 'fallback'
//         });

//         logger.info(`Scheduled meeting notification sent to admin for ${email}`);
//         return { success: true, result };

//     } catch (error) {
//         logger.error('Failed to send scheduled meeting notification:', error);
//         return { success: false, error: error.message };
//     }
// };


'use strict';



const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeMultilineHtml = (value) =>
  escapeHtml(value).replace(/\r?\n/g, '<br>');

exports.sendSuperAdminNotification = async (data) => {
  const {
    fullName,
    email,
    hospitalName,
    hospitalAddress,
    hospitalEmail,
    hospitalPhone,
    notes,
    bookingId
  } = data;

  const subject = `New Demo Request by ${hospitalName}`;

  const safeFullName = escapeMultilineHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeHospitalName = escapeMultilineHtml(hospitalName);
  const safeHospitalAddress = escapeMultilineHtml(hospitalAddress);
  const safeHospitalEmail = escapeHtml(hospitalEmail);
  const safeHospitalPhone = escapeMultilineHtml(hospitalPhone);
  const safeBookingId = escapeHtml(bookingId);
  const safeNotes = String(notes ?? '').trim()
    ? escapeMultilineHtml(notes)
    : '';

  const submittedAt = escapeHtml(new Date().toLocaleString());
  const ctaUrl = escapeHtml(env.FRONTEND_URL || '#');

  const notesHtml = safeNotes
    ? safeNotes
    : `<span style="color:#9ca3af;font-style:italic;">No additional notes were provided.</span>`;

  const html = `
<!DOCTYPE html>
<html
  lang="en"
  xmlns="http://www.w3.org/1999/xhtml"
>
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
  >

  <meta
    name="x-apple-disable-message-reformatting"
  >

  <meta
    name="format-detection"
    content="telephone=no,date=no,address=no,email=no"
  >

  <title>New Demo Request - VetDesk.ai</title>

  <!--[if mso]>
  <style type="text/css">
    table,
    td,
    div,
    p,
    a,
    h1 {
      font-family: Arial, Helvetica, sans-serif !important;
    }
  </style>
  <![endif]-->

  <style type="text/css">
    html,
    body {
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

    a {
      text-decoration: none;
    }

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

    .cell-value a {
      color: #0c8ce0;
      text-decoration: none;
    }

    @media only screen and (max-width: 640px) {
      .outer-padding {
        padding: 18px 10px !important;
      }

      .header-padding {
        padding: 20px !important;
      }

      .body-padding {
        padding: 30px 20px !important;
      }

      .footer-padding {
        padding: 22px 20px !important;
      }

      .title {
        font-size: 23px !important;
        line-height: 30px !important;
      }

      .summary-item {
        display: block !important;
        width: 100% !important;
        border-right: 0 !important;
        border-bottom: 1px solid #e7ebef !important;
      }

      .summary-item:last-child {
        border-bottom: 0 !important;
      }

      .details-cell {
        display: block !important;
        width: 100% !important;
        border-right: 0 !important;
        border-bottom: 1px solid #e7ebef !important;
      }

      .last-details-row .details-cell:last-child {
        border-bottom: 0 !important;
      }

      .details-cell-full {
        display: table-cell !important;
      }
    }

    @media only screen and (max-width: 420px) {
      .header-logo-cell,
      .header-badge-cell {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }

      .header-badge-cell {
        padding-top: 14px !important;
      }

      .header-logo {
        width: 100% !important;
        max-width: 300px !important;
      }

      .cta-button {
        display: block !important;
      }
    }
  </style>
</head>

<body
  style="
    width:100%;
    margin:0;
    padding:0;
    background:#f0f4f8;
  "
>
  <center
    style="
      width:100%;
      background:#f0f4f8;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        background:#f0f4f8;
        border-collapse:collapse;
      "
    >
      <tr>
        <td
          class="outer-padding"
          align="center"
          style="padding:40px 16px;"
        >
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
            <!-- HEADER -->

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
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    border-collapse:collapse;
                  "
                >
                  <tr>
                    <td
                      class="header-logo-cell"
                      width="70%"
                      valign="middle"
                      style="
                        width:70%;
                        vertical-align:middle;
                      "
                    >
                      <img
                        class="header-logo"
                        src="https://dodiovomtwngjvxvfmki.supabase.co/storage/v1/object/public/site_logo/logo2.png"
                        alt="VetDesk.ai"
                        width="360"
                        style="
                          display:block;
                          width:100%;
                          max-width:360px;
                          height:auto;
                          border:0;
                        "
                      >
                    </td>

                    <td
                      class="header-badge-cell"
                      width="30%"
                      align="right"
                      valign="middle"
                      style="
                        width:30%;
                        text-align:right;
                        vertical-align:middle;
                      "
                    >
                      <span
                        style="
                          display:inline-block;
                          padding:8px 14px;
                          border:1px solid #ffd4bc;
                          border-radius:6px;
                          background:#fff3ea;
                          color:#ff7a1a;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:11.5px;
                          font-weight:700;
                          line-height:15px;
                          letter-spacing:0.6px;
                          text-transform:uppercase;
                          white-space:nowrap;
                        "
                      >
                        New Demo Request
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- BODY -->

            <tr>
              <td
                class="body-padding"
                style="
                  padding:44px 40px;
                  background:#ffffff;
                "
              >
                <div
                  style="
                    margin:0 0 12px;
                    color:#ff7a1a;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:11px;
                    font-weight:700;
                    line-height:15px;
                    letter-spacing:1.6px;
                    text-transform:uppercase;
                  "
                >
                  Demo Request
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
                  A New Demo Request Has Arrived
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
                  A hospital administrator has completed the VetDesk demo
                  request form. Review the details below and follow up with
                  the customer promptly.
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
                      width="34%"
                      valign="top"
                      style="
                        width:34%;
                        padding:16px 20px;
                        background:#f8fafc;
                        border-right:1px solid #e7ebef;
                      "
                    >
                      <div class="cell-label">Request ID</div>
                      <div
                        class="cell-value"
                        style="font-weight:700;color:#ff7a1a;"
                      >
                        #${safeBookingId}
                      </div>
                    </td>

                    <td
                      class="summary-item"
                      width="33%"
                      valign="top"
                      style="
                        width:33%;
                        padding:16px 20px;
                        background:#f8fafc;
                        border-right:1px solid #e7ebef;
                      "
                    >
                      <div class="cell-label">Status</div>
                      <div
                        class="cell-value"
                        style="font-weight:700;color:#0c8ce0;"
                      >
                        New
                      </div>
                    </td>

                    <td
                      class="summary-item"
                      width="33%"
                      valign="top"
                      style="
                        width:33%;
                        padding:16px 20px;
                        background:#f8fafc;
                      "
                    >
                      <div class="cell-label">Submitted</div>
                      <div
                        class="cell-value"
                        style="font-size:13px;font-weight:700;"
                      >
                        ${submittedAt}
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- REQUESTER INFORMATION -->

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    margin:0 0 28px;
                    border-collapse:collapse;
                  "
                >
                  <tr>
                    <td style="padding:0 0 14px;">
                      <span
                        style="
                          display:inline-block;
                          padding:0 0 10px;
                          border-bottom:2px solid #0c8ce0;
                          color:#14181f;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:14px;
                          font-weight:700;
                          line-height:19px;
                        "
                      >
                        Requester Information
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <table
                        role="presentation"
                        class="details-table"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          width:100%;
                          border:1px solid #e7ebef;
                          border-radius:10px;
                          border-collapse:separate;
                          border-spacing:0;
                          overflow:hidden;
                        "
                      >
                        <tr>
                          <td
                            class="details-cell"
                            width="50%"
                            valign="top"
                            style="
                              width:50%;
                              padding:16px 18px;
                              border-right:1px solid #e7ebef;
                              border-bottom:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">Contact Name</div>
                            <div class="cell-value">${safeFullName}</div>
                          </td>

                          <td
                            class="details-cell"
                            width="50%"
                            valign="top"
                            style="
                              width:50%;
                              padding:16px 18px;
                              border-bottom:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">Email Address</div>
                            <div class="cell-value">
                              <a href="mailto:${safeEmail}">${safeEmail}</a>
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td
                            class="details-cell"
                            width="50%"
                            valign="top"
                            style="
                              width:50%;
                              padding:16px 18px;
                              border-right:1px solid #e7ebef;
                              border-bottom:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">Hospital Name</div>
                            <div class="cell-value">${safeHospitalName}</div>
                          </td>

                          <td
                            class="details-cell"
                            width="50%"
                            valign="top"
                            style="
                              width:50%;
                              padding:16px 18px;
                              border-bottom:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">Hospital Email</div>
                            <div class="cell-value">
                              <a href="mailto:${safeHospitalEmail}">${safeHospitalEmail}</a>
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td
                            class="details-cell"
                            width="50%"
                            valign="top"
                            style="
                              width:50%;
                              padding:16px 18px;
                              border-right:1px solid #e7ebef;
                              border-bottom:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">Hospital Phone</div>
                            <div class="cell-value">${safeHospitalPhone}</div>
                          </td>

                          <td
                            class="details-cell"
                            width="50%"
                            valign="top"
                            style="
                              width:50%;
                              padding:16px 18px;
                              border-bottom:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">Current Status</div>
                            <div class="cell-value">
                              <span
                                style="
                                  display:inline-block;
                                  padding:4px 12px;
                                  border-radius:6px;
                                  background:#fff3ea;
                                  color:#ff7a1a;
                                  font-weight:700;
                                  font-size:12px;
                                  border:1px solid #ffd4bc;
                                "
                              >
                                New
                              </span>
                            </div>
                          </td>
                        </tr>

                        <tr class="last-details-row">
                          <td
                            class="details-cell details-cell-full"
                            colspan="2"
                            width="100%"
                            valign="top"
                            style="
                              width:100%;
                              padding:16px 18px;
                            "
                          >
                            <div class="cell-label">Hospital Address</div>
                            <div class="cell-value">${safeHospitalAddress}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- ADDITIONAL NOTES -->

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    margin:0 0 8px;
                    border-collapse:collapse;
                  "
                >
                  <tr>
                    <td style="padding:0 0 14px;">
                      <span
                        style="
                          display:inline-block;
                          padding:0 0 10px;
                          border-bottom:2px solid #0c8ce0;
                          color:#14181f;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:14px;
                          font-weight:700;
                          line-height:19px;
                        "
                      >
                        Additional Notes
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:18px 20px;
                        border:1px solid #ffd4bc;
                        border-left:4px solid #ff7a1a;
                        border-radius:10px;
                        background:#fff8f2;
                        color:#374151;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:14px;
                        line-height:24px;
                        white-space:normal;
                        overflow-wrap:anywhere;
                        word-break:break-word;
                      "
                    >
                      ${notesHtml}
                    </td>
                  </tr>
                </table>

                <!-- CTA -->

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    margin-top:28px;
                    padding-top:28px;
                    border-top:1px solid #e7ebef;
                    border-collapse:collapse;
                  "
                >
                  <tr>
                    <td align="center" style="text-align:center;">
                      <table
                        role="presentation"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        align="center"
                        style="
                          margin:0 auto;
                          border-collapse:separate;
                        "
                      >
                        <tr>
                          <td
                            align="center"
                            bgcolor="#0c8ce0"
                            style="
                              border-radius:8px;
                              background:#0c8ce0;
                              text-align:center;
                            "
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
                              View All Bookings &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- FOOTER -->

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
                <div
                  style="
                    color:#14181f;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:14px;
                    font-weight:700;
                    line-height:19px;
                  "
                >
                  VetDesk
                  <span style="color:#ff7a1a;">.ai</span>
                </div>

                <div
                  style="
                    margin-top:6px;
                    color:#94a3b8;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:11.5px;
                    line-height:21px;
                  "
                >
                  Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification
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
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `;

  const toEmail = await self.getRecipientEmail();
  const fromEmail = await self.getSenderEmail();

  logger.info(`Email configuration: FROM: ${fromEmail} TO: ${toEmail}`);

  try {
    const result = await self.sendEmailViaGmailAPI({
      to: toEmail,
      subject: subject,
      html: html
    });

    await self.saveEmailLog({
      toEmail: toEmail,
      fromEmail: fromEmail,
      subject: subject,
      bodyHtml: html,
      fullName: fullName,
      hospitalName: hospitalName,
      hospitalPhone: hospitalPhone,
      bookingId: bookingId,
      status: result.messageId ? 'sent' : 'fallback'
    });

    logger.info(`Super Admin notification sent to: ${toEmail}`);
    return { success: true, result };
  } catch (error) {
    logger.error('Error sending Super Admin notification:', error.message);

    await self.saveEmailLog({
      toEmail: toEmail,
      fromEmail: fromEmail,
      subject: subject,
      bodyHtml: html,
      fullName: fullName,
      hospitalName: hospitalName,
      hospitalPhone: hospitalPhone,
      bookingId: bookingId,
      status: 'failed',
      errorMessage: error.message
    });

    return { success: false, error: error.message };
  }
};


'use strict';


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

// ─── Email: Demo Request Confirmation (Customer) ────────────────────────────

exports.sendCustomerConfirmation = async (data) => {
  const { fullName, email, hospitalName, bookingId } = data;
  const subject = 'Thanks for requesting a VetDesk demo';
  const calendlyUrl = escapeHtml(
    env.CALENDLY_URL || 'https://calendly.com/anilkumarr0180/30min'
  );

  const safeFullName = escapeMultilineHtml(fullName);
  const safeHospitalName = escapeMultilineHtml(hospitalName);
  const safeBookingId = escapeHtml(bookingId);

  const html = `${emailShellOpen()}
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
${emailHead('Demo Request Confirmed - VetDesk.ai')}
${bodyOpen()}
            ${emailHeader('Confirmed')}

            <tr>
              <td class="body-padding" style="padding:44px 40px;background:#ffffff;">
                <div
                  style="
                    margin:0 0 12px;
                    color:#ff7a1a;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:11px;
                    font-weight:700;
                    line-height:15px;
                    letter-spacing:1.6px;
                    text-transform:uppercase;
                  "
                >
                  Demo Request
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
                  You're All Set, ${safeFullName}
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
                  Your VetDesk demo request has been received. Select a time
                  that works best for you, and we'll handle the rest.
                </p>

                <!-- SUMMARY STRIP -->

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 28px;border:1px solid #e7ebef;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">
                  <tr>
                    <td class="summary-item" width="50%" valign="top" style="width:50%;padding:16px 20px;background:#f8fafc;border-right:1px solid #e7ebef;">
                      <div class="cell-label">Request ID</div>
                      <div class="cell-value" style="font-weight:700;color:#ff7a1a;">#${safeBookingId}</div>
                    </td>

                    <td class="summary-item" width="50%" valign="top" style="width:50%;padding:16px 20px;background:#f8fafc;">
                      <div class="cell-label">Hospital</div>
                      <div class="cell-value" style="font-weight:700;">${safeHospitalName}</div>
                    </td>
                  </tr>
                </table>

                <!-- SCHEDULE CTA -->

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 28px;border:1px solid #e7ebef;border-radius:12px;background:#fafbfc;border-collapse:collapse;">
                  <tr>
                    <td align="center" style="padding:32px 30px;text-align:center;">
                      <div style="margin:0 0 8px;color:#14181f;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;">
                        Schedule Your Demo
                      </div>

                      <div style="margin:0 0 24px;color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:23px;">
                        Pick a date and time that suits you. It takes less than 2 minutes.
                      </div>

                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;border-collapse:separate;">
                        <tr>
                          <td align="center" bgcolor="#ff7a1a" style="border-radius:8px;background:#ff7a1a;text-align:center;">
                            <a
                              class="cta-button"
                              href="${calendlyUrl}"
                              style="
                                display:inline-block;
                                padding:14px 36px;
                                border:1px solid #ff7a1a;
                                border-radius:8px;
                                background:#ff7a1a;
                                color:#ffffff;
                                font-family:Arial,Helvetica,sans-serif;
                                font-size:14px;
                                font-weight:700;
                                line-height:18px;
                                text-align:center;
                                text-decoration:none;
                              "
                            >
                              Book My Demo
                            </a>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top:14px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:12px;">
                        Opens Calendly &bull; No account required
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- WHAT HAPPENS NEXT -->

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 28px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <span
                        style="
                          display:inline-block;
                          padding:0 0 10px;
                          border-bottom:2px solid #0c8ce0;
                          color:#14181f;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:14px;
                          font-weight:700;
                          line-height:19px;
                        "
                      >
                        What Happens Next?
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e7ebef;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">
                        <tr>
                          <td style="padding:16px 20px;border-bottom:1px solid #e7ebef;color:#374151;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:23px;">
                            <strong style="color:#14181f;">Click Book My Demo</strong> and select your preferred time.
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 20px;border-bottom:1px solid #e7ebef;color:#374151;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:23px;">
                            Calendly sends you a calendar invite with a meeting link.
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 20px;border-bottom:1px solid #e7ebef;color:#374151;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:23px;">
                            Our VetDesk team meets with you online for a complete walkthrough.
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 20px;color:#374151;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:23px;">
                            Need help? Just reply to this email &mdash; we're happy to assist.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:25px;">
                  We look forward to showing you what VetDesk can do for your practice.
                  <strong style="display:block;margin-top:6px;color:#14181f;">Kind regards, The VetDesk Team</strong>
                </p>
              </td>
            </tr>

            ${emailFooter('Automated notification &bull; Questions? Reply to this email.', escapeHtml(new Date().toLocaleString()))}
${bodyClose()}`;

  try {
    const result = await self.sendEmailViaGmailAPI({ to: email, subject, html });
    await self.saveEmailLog({
      toEmail: email,
      fromEmail: await self.getSenderEmail(),
      subject,
      bodyHtml: html,
      fullName,
      hospitalName,
      hospitalPhone: '',
      bookingId,
      status: result.messageId ? 'sent' : 'fallback'
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Email: Scheduled Meeting Notification (Admin) ──────────────────────────

exports.sendScheduledMeetingNotification = async (data) => {
  const {
    fullName,
    email,
    hospitalName,
    bookingId,
    meetingTime,
    meetingUrl,
    meetingEnd
  } = data;

  const subject = `Demo Meeting Scheduled for ${hospitalName}`;

  const safeFullName = escapeMultilineHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeHospitalName = escapeMultilineHtml(hospitalName);
  const safeBookingId = escapeHtml(bookingId);
  const safeMeetingUrl = escapeHtml(meetingUrl);
  const meetingStart = escapeHtml(new Date(meetingTime).toLocaleString());
  const meetingEndFormatted = meetingEnd
    ? escapeHtml(new Date(meetingEnd).toLocaleString())
    : '';
  const submittedAt = escapeHtml(new Date().toLocaleString());
  const ctaUrl = escapeHtml(env.CURRENT_URL || '#');

  const meetingEndRow = meetingEndFormatted
    ? `
      <tr class="last-details-row">
        <td class="details-cell details-cell-full" colspan="2" width="100%" valign="top" style="width:100%;padding:16px 18px;border-bottom:1px solid #e7ebef;">
          <div class="cell-label">End Time</div>
          <div class="cell-value">${meetingEndFormatted}</div>
        </td>
      </tr>
    `
    : '';

  const html = `${emailShellOpen()}
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
${emailHead('Meeting Scheduled - VetDesk.ai')}
${bodyOpen()}
            ${emailHeader('Meeting Scheduled', '#2e7d32', '#e8f5e9', '#a5d6a7')}

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
                  Demo Meeting
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
                  Demo Meeting Scheduled
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
                  A customer has booked their demo meeting. Details are below.
                </p>

                <!-- MEETING DETAILS -->

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 28px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <span
                        style="
                          display:inline-block;
                          padding:0 0 10px;
                          border-bottom:2px solid #0c8ce0;
                          color:#14181f;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:14px;
                          font-weight:700;
                          line-height:19px;
                        "
                      >
                        Meeting Details
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <table role="presentation" class="details-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e7ebef;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">
                        <tr>
                          <td class="details-cell" width="50%" valign="top" style="width:50%;padding:16px 18px;border-right:1px solid #e7ebef;border-bottom:1px solid #e7ebef;">
                            <div class="cell-label">Customer</div>
                            <div class="cell-value">${safeFullName}</div>
                          </td>

                          <td class="details-cell" width="50%" valign="top" style="width:50%;padding:16px 18px;border-bottom:1px solid #e7ebef;">
                            <div class="cell-label">Email</div>
                            <div class="cell-value"><a href="mailto:${safeEmail}">${safeEmail}</a></div>
                          </td>
                        </tr>

                        <tr>
                          <td class="details-cell details-cell-full" colspan="2" width="100%" valign="top" style="width:100%;padding:16px 18px;border-bottom:1px solid #e7ebef;">
                            <div class="cell-label">Hospital</div>
                            <div class="cell-value">${safeHospitalName}</div>
                          </td>
                        </tr>

                        <tr>
                          <td class="details-cell" width="50%" valign="top" style="width:50%;padding:16px 18px;border-right:1px solid #e7ebef;border-bottom:1px solid #e7ebef;">
                            <div class="cell-label">Date &amp; Time</div>
                            <div class="cell-value">${meetingStart}</div>
                          </td>

                          <td class="details-cell" width="50%" valign="top" style="width:50%;padding:16px 18px;border-bottom:1px solid #e7ebef;">
                            <div class="cell-label">Booking ID</div>
                            <div class="cell-value">#${safeBookingId}</div>
                          </td>
                        </tr>

                        ${meetingEndRow}

                        <tr class="last-details-row">
                          <td class="details-cell details-cell-full" colspan="2" width="100%" valign="top" style="width:100%;padding:16px 18px;">
                            <div class="cell-label">Meeting Link</div>
                            <div class="cell-value">
                              <div
                                style="
                                  margin-top:6px;
                                  padding:14px 16px;
                                  border:1px solid #b8d8f8;
                                  border-radius:8px;
                                  background:#f0f7ff;
                                  word-break:break-all;
                                "
                              >
                                <a href="${safeMeetingUrl}" target="_blank" style="color:#0c8ce0;font-weight:700;">${safeMeetingUrl}</a>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:28px;padding-top:28px;border-top:1px solid #e7ebef;border-collapse:collapse;">
                  <tr>
                    <td align="center" style="text-align:center;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;border-collapse:separate;">
                        <tr>
                          <td align="center" bgcolor="#0c8ce0" style="border-radius:8px;background:#0c8ce0;text-align:center;">
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
                              View All Bookings &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${emailFooter('Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification', submittedAt)}
${bodyClose()}`;

  try {
    const toEmail = await self.getRecipientEmail();
    const result = await self.sendEmailViaGmailAPI({
      to: toEmail,
      subject: subject,
      html: html
    });

    await self.saveEmailLog({
      toEmail: toEmail,
      fromEmail: await self.getSenderEmail(),
      subject: subject,
      bodyHtml: html,
      fullName: fullName,
      hospitalName: hospitalName,
      hospitalPhone: '',
      bookingId: bookingId,
      status: result.messageId ? 'sent' : 'fallback'
    });

    logger.info(`Scheduled meeting notification sent to admin for ${email}`);
    return { success: true, result };
  } catch (error) {
    logger.error('Failed to send scheduled meeting notification:', error);
    return { success: false, error: error.message };
  }
};

// ─── Email: Save Log ─────────────────────────────────────────────────────────────

exports.saveEmailLog = async (data) => {
    try {
        const {
            toEmail,
            fromEmail,
            subject,
            bodyHtml,
            fullName,
            hospitalName,
            hospitalPhone,
            bookingId,
            status = 'sent',
            errorMessage = null
        } = data;

        await executeQuery(
            `INSERT INTO email_logs (
                to_email, from_email, subject, body_html,
                caller_name, caller_number, reason_for_call,
                call_summary, status, error_message, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
                toEmail,
                fromEmail,
                subject,
                bodyHtml,
                fullName || 'Unknown',
                hospitalPhone || 'N/A',
                'Demo Booking Request - Super Admin',
                `Demo booking request from ${hospitalName} (Booking #${bookingId})`,
                status,
                errorMessage
            ]
        );

        logger.info(`📧 Email log saved for ${toEmail} (Status: ${status})`);
        return true;

    } catch (error) {
        logger.error('Error saving email log:', error);
        return false;
    }
};