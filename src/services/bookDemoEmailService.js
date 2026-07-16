
////////
const { google } = require('googleapis');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const env = require('../config/env');

class BookDemoEmailService {


  static async getActiveConfig() {
    try {
      const result = await executeQuery(
        `SELECT * FROM email_config WHERE is_active = true LIMIT 1`
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching email config:', error);
      return null;
    }
  }


  static getOAuth2Client() {
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
  }


  static async sendEmailViaGmailAPI({ to, subject, html }) {
    try {
      if (!to || to === 'undefined' || to === 'null' || to.trim() === '') {
        logger.error('❌ Invalid recipient email:', to);
        throw new Error(`Invalid recipient email: "${to}"`);
      }

      const oAuth2Client = this.getOAuth2Client();

      if (!oAuth2Client) {
        logger.warn('📧 OAuth2 not configured - Email logged to console:');
        logger.warn(`   To: ${to}`);
        logger.warn(`   Subject: ${subject}`);
        logger.warn(`   Body preview: ${html.substring(0, 300)}...`);
        return { messageId: `fallback-${Date.now()}`, note: 'Email logged to console' };
      }

      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
      const fromEmail = await this.getSenderEmail();

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
  }


  static async getSenderEmail() {
    const config = await this.getActiveConfig();
    if (config && config.from_email) {
      return config.from_email;
    }
    return env.GOOGLE_EMAIL || env.GMAIL_FROM_EMAIL || 'anilkumarr0180@gmail.com';
  }


  static async getRecipientEmail() {
    const config = await this.getActiveConfig();
    if (config && config.to_email) {
      return config.to_email;
    }
    return env.SUPERADMIN_EMAIL || 'rajdevfree@gmail.com';
  }


//   static async sendSuperAdminNotification(data) {
//     const {
//       fullName,
//       email,
//       hospitalName,
//       hospitalAddress,
//       hospitalEmail,
//       hospitalPhone,
//       notes,
//       bookingId
//     } = data;

//     const subject = `New Demo Request by ${hospitalName}`;

//     const html = `
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
//   font-family:Arial,sans-serif;
//   font-size:22px;
//   font-weight:700;
//   color:#ffffff;
//   vertical-align:middle;
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
//   color:rgba(255,255,255,.60);
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   display:block;
//   margin-top:2px;
// }
// .header-badge{
//   display:inline-block;
//   background:#fff3ea;
//   color:#f25c00;
//   padding:9px 18px;
//   border-radius:999px;
//   font-size:12px;
//   font-weight:700;
//   letter-spacing:.6px;
//   text-transform:uppercase;
//   border:1px solid #ffd4bc;
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
//   font-size:34px;
//   font-weight:700;
//   line-height:1.18;
//   color:#14181f;
//   margin-bottom:14px;
// }
// .subtitle{
//   font-size:15px;
//   line-height:1.8;
//   color:#4b5563;
//   margin-bottom:36px;
// }
// .summary{
//   display:table;
//   width:100%;
//   border-radius:12px;
//   overflow:hidden;
//   margin-bottom:36px;
//   border:1px solid #e7ebef;
// }
// .summary-row{display:table-row;}
// .summary-item{
//   display:table-cell;
//   width:33.33%;
//   padding:18px 20px;
//   background:#ffffff;
//   border-right:1px solid rgba(20,24,31,.08);
//   vertical-align:top;
// }
// .summary-item:last-child{border-right:none;}
// .summary-label{
//   font-size:10.5px;
//   color:#9ca3af;
//   text-transform:uppercase;
//   letter-spacing:.7px;
//   font-weight:700;
//   margin-bottom:7px;
// }
// .summary-value{
//   font-size:15px;
//   font-weight:700;
//   color:#14181f;
// }
// .summary-value.orange{color:#ff7a1a;}
// .section{margin-bottom:32px;}
// .section-title{
//   font-size:15px;
//   font-weight:700;
//   color:#14181f;
//   margin-bottom:14px;
//   padding-bottom:10px;
//   border-bottom:1px solid rgba(20,24,31,.08);
// }
// .details{
//   border:1px solid rgba(20,24,31,.08);
//   border-radius:12px;
//   overflow:hidden;
// }
// .det-row{
//   display:flex;
//   border-bottom:1px solid rgba(20,24,31,.08);
// }
// .det-row:last-child{border-bottom:none;}
// .cell{
//   width:50%;
//   padding:16px 18px;
//   border-right:1px solid rgba(20,24,31,.08);
// }
// .cell:last-child{border-right:none;}
// .cell-full{width:100%;padding:16px 18px;}
// .cell-label{
//   font-size:10.5px;
//   color:#9ca3af;
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
//   padding:5px 13px;
//   border-radius:999px;
//   background:#fff3ea;
//   color:#ff7a1a;
//   font-weight:700;
//   font-size:12px;
//   border:1px solid #ffd4bc;
// }
// .notes-box{
//   background:#fafbfc;
//   padding:20px;
//   border-radius:12px;
//   border:1px solid rgba(20,24,31,.08);
//   font-size:14px;
//   line-height:1.8;
//   color:#374151;
// }
// .cta{
//   text-align:center;
//   margin-top:36px;
//   padding-top:32px;
//   border-top:1px solid rgba(20,24,31,.07);
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
// .email-footer{
//   padding:28px 40px;
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
//   .title{font-size:26px;}
//   .summary{display:block;}
//   .summary-row{display:block;}
//   .summary-item{display:block;width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.08);}
//   .summary-item:last-child{border-bottom:none;}
//   .det-row{flex-direction:column;}
//   .cell{width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.08);}
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
//         <td valign="middle" align="right" style="padding:0;">
//           <div class="header-badge">&#9679; New Demo Request</div>
//         </td>
//       </tr>
//     </table>
//   </div>
//   <div class="email-body">
//     <div class="eyebrow">Demo Request</div>
//     <div class="title">A new demo<br>request has arrived.</div>
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
//           <div class="summary-value">&#9679;&nbsp;New</div>
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

//     const toEmail = await this.getRecipientEmail();
//     const fromEmail = await this.getSenderEmail();

//     logger.info(`Email configuration: FROM: ${fromEmail} TO: ${toEmail}`);

//     try {
//       const result = await this.sendEmailViaGmailAPI({
//         to: toEmail,
//         subject: subject,
//         html: html
//       });

//       await this.saveEmailLog({
//         toEmail: toEmail,
//         fromEmail: fromEmail,
//         subject: subject,
//         bodyHtml: html,
//         fullName: fullName,
//         hospitalName: hospitalName,
//         hospitalPhone: hospitalPhone,
//         bookingId: bookingId,
//         status: result.messageId ? 'sent' : 'fallback'
//       });

//       logger.info(`Super Admin notification sent to: ${toEmail}`);
//       return { success: true, result };

//     } catch (error) {
//       logger.error('Error sending Super Admin notification:', error.message);

//       await this.saveEmailLog({
//         toEmail: toEmail,
//         fromEmail: fromEmail,
//         subject: subject,
//         bodyHtml: html,
//         fullName: fullName,
//         hospitalName: hospitalName,
//         hospitalPhone: hospitalPhone,
//         bookingId: bookingId,
//         status: 'failed',
//         errorMessage: error.message
//       });

//       return { success: false, error: error.message };
//     }
//   }





static async sendSuperAdminNotification(data) {
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
 
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>New Demo Request</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
  background:#f0f4f8;
  font-family:Arial,Helvetica,sans-serif;
  color:#14181f;
  padding:40px 16px;
}
.email-wrapper{max-width:640px;margin:0 auto;}
.email-container{
  background:#ffffff;
  border-radius:14px;
  overflow:hidden;
  border:1px solid #e7ebef;
}
.email-header{
  background:#0c1a2e;
  padding:32px 40px;
  border-bottom:3px solid #ff7a1a;
}
.brand-name{
  font-family:Arial,Helvetica,sans-serif;
  font-size:20px;
  font-weight:700;
  color:#ffffff;
  margin:0;
  line-height:1.2;
}
.brand-sub{
  font-size:11px;
  color:rgba(255,255,255,.55);
  letter-spacing:.6px;
  text-transform:uppercase;
  display:block;
  margin-top:3px;
}
.header-badge{
  display:inline-block;
  background:rgba(255,122,26,.14);
  color:#ff9c4d;
  padding:8px 16px;
  border-radius:6px;
  font-size:11.5px;
  font-weight:700;
  letter-spacing:.6px;
  text-transform:uppercase;
  border:1px solid rgba(255,122,26,.3);
}
.email-body{padding:44px 40px;}
.eyebrow{
  font-size:11px;
  letter-spacing:1.6px;
  font-weight:700;
  color:#ff7a1a;
  text-transform:uppercase;
  margin-bottom:12px;
}
.title{
  font-size:28px;
  font-weight:700;
  line-height:1.3;
  color:#14181f;
  margin-bottom:14px;
}
.subtitle{
  font-size:15px;
  line-height:1.8;
  color:#4b5563;
  margin-bottom:32px;
}
.summary{
  display:table;
  width:100%;
  border-radius:10px;
  overflow:hidden;
  margin-bottom:32px;
  border:1px solid #e7ebef;
}
.summary-row{display:table-row;}
.summary-item{
  display:table-cell;
  width:33.33%;
  padding:16px 20px;
  background:#f8fafc;
  border-right:1px solid #e7ebef;
  vertical-align:top;
}
.summary-item:last-child{border-right:none;}
.summary-label{
  font-size:10.5px;
  color:#94a3b8;
  text-transform:uppercase;
  letter-spacing:.7px;
  font-weight:700;
  margin-bottom:6px;
}
.summary-value{
  font-size:15px;
  font-weight:700;
  color:#14181f;
}
.summary-value.orange{color:#ff7a1a;}
.summary-value.blue{color:#0c8ce0;}
.section{margin-bottom:28px;}
.section-title{
  font-size:14px;
  font-weight:700;
  color:#14181f;
  margin-bottom:14px;
  padding-bottom:10px;
  border-bottom:2px solid #0c8ce0;
  display:inline-block;
}
.details{
  border:1px solid #e7ebef;
  border-radius:10px;
  overflow:hidden;
}
.det-row{
  display:flex;
  border-bottom:1px solid #e7ebef;
}
.det-row:last-child{border-bottom:none;}
.cell{
  width:50%;
  padding:16px 18px;
  border-right:1px solid #e7ebef;
}
.cell:last-child{border-right:none;}
.cell-full{width:100%;padding:16px 18px;}
.cell-label{
  font-size:10.5px;
  color:#94a3b8;
  text-transform:uppercase;
  letter-spacing:.6px;
  font-weight:700;
  margin-bottom:6px;
}
.cell-value{
  font-size:14px;
  font-weight:500;
  color:#14181f;
  word-break:break-word;
  line-height:1.5;
}
.cell-value a{color:#0c8ce0;text-decoration:none;}
.status-pill{
  display:inline-block;
  padding:4px 12px;
  border-radius:6px;
  background:#fff3ea;
  color:#ff7a1a;
  font-weight:700;
  font-size:12px;
  border:1px solid #ffd4bc;
}
.notes-box{
  background:#f8fafc;
  padding:20px;
  border-radius:10px;
  border:1px solid #e7ebef;
  font-size:14px;
  line-height:1.8;
  color:#374151;
}
.cta{
  text-align:center;
  margin-top:32px;
  padding-top:28px;
  border-top:1px solid #e7ebef;
}
.cta-button{
  display:inline-block;
  padding:14px 36px;
  background:#0c8ce0;
  color:#ffffff !important;
  text-decoration:none;
  font-weight:700;
  font-size:15px;
  border-radius:8px;
}
.email-footer{
  padding:26px 40px;
  text-align:center;
  background:#f8fafc;
  border-top:1px solid #e7ebef;
}
.footer-brand{
  font-size:14px;
  font-weight:700;
  color:#14181f;
}
.footer-brand span{color:#ff7a1a;}
.footer-sub{
  font-size:11.5px;
  color:#94a3b8;
  line-height:1.8;
  margin-top:6px;
}
@media(max-width:600px){
  .email-body{padding:28px 22px;}
  .email-header{padding:24px 22px;}
  .email-footer{padding:22px;}
  .title{font-size:23px;}
  .summary{display:block;}
  .summary-row{display:block;}
  .summary-item{display:block;width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
  .summary-item:last-child{border-bottom:none;}
  .det-row{flex-direction:column;}
  .cell{width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
  .cell:last-child{border-bottom:none;}
}
</style>
</head>
<body>
<div class="email-wrapper">
<div class="email-container">
  <div class="email-header">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle" style="padding:0;">
          <p class="brand-name">VetDesk<span style="color:#ff7a1a;">.ai</span></p>
          <span class="brand-sub">Veterinary Care Platform</span>
        </td>
        <td valign="middle" align="right" style="padding:0;">
          <div class="header-badge">New Demo Request</div>
        </td>
      </tr>
    </table>
  </div>
  <div class="email-body">
    <div class="eyebrow">Demo Request</div>
    <div class="title">A new demo request has arrived.</div>
    <div class="subtitle">
      A hospital administrator has completed the VetDesk demo request form.
      Review the details below and follow up with the customer promptly.
    </div>
    <div class="summary">
      <div class="summary-row">
        <div class="summary-item">
          <div class="summary-label">Request ID</div>
          <div class="summary-value orange">#${bookingId}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Status</div>
          <div class="summary-value blue">New</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Submitted</div>
          <div class="summary-value" style="font-size:13px;">${new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Requester Information</div>
      <div class="details">
        <div class="det-row">
          <div class="cell">
            <div class="cell-label">Contact Name</div>
            <div class="cell-value">${fullName}</div>
          </div>
          <div class="cell">
            <div class="cell-label">Email Address</div>
            <div class="cell-value"><a href="mailto:${email}">${email}</a></div>
          </div>
        </div>
        <div class="det-row">
          <div class="cell">
            <div class="cell-label">Hospital Name</div>
            <div class="cell-value">${hospitalName}</div>
          </div>
          <div class="cell">
            <div class="cell-label">Hospital Email</div>
            <div class="cell-value"><a href="mailto:${hospitalEmail}">${hospitalEmail}</a></div>
          </div>
        </div>
        <div class="det-row">
          <div class="cell">
            <div class="cell-label">Hospital Phone</div>
            <div class="cell-value">${hospitalPhone}</div>
          </div>
          <div class="cell">
            <div class="cell-label">Current Status</div>
            <div class="cell-value">
              <span class="status-pill">New</span>
            </div>
          </div>
        </div>
        <div class="det-row">
          <div class="cell-full">
            <div class="cell-label">Hospital Address</div>
            <div class="cell-value">${hospitalAddress}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Additional Notes</div>
      <div class="notes-box">
        ${notes
        ? `${notes}`
        : `<span style="color:#9ca3af;font-style:italic;">No additional notes were provided.</span>`
      }
      </div>
    </div>
    <div class="cta">
      <a href="${env.FRONTEND_URL || '#'}" class="cta-button">View All Bookings &rarr;</a>
    </div>
  </div>
  <div class="email-footer">
    <div class="footer-brand">VetDesk<span>.ai</span></div>
    <div class="footer-sub">
      Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification<br>
      Please do not reply to this email &nbsp;&bull;&nbsp; Sent at ${new Date().toLocaleString()}
    </div>
  </div>
</div>
</div>
</body>
</html>`;
 
  const toEmail = await this.getRecipientEmail();
  const fromEmail = await this.getSenderEmail();
 
  logger.info(`Email configuration: FROM: ${fromEmail} TO: ${toEmail}`);
 
  try {
    const result = await this.sendEmailViaGmailAPI({
      to: toEmail,
      subject: subject,
      html: html
    });
 
    await this.saveEmailLog({
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
 
    await this.saveEmailLog({
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
}


//   static async sendCustomerConfirmation(data) {
//     const { fullName, email, hospitalName, bookingId } = data;
//     const subject = "Thanks for requesting a VetDesk demo";
//     const calendlyUrl = env.CALENDLY_URL || 'https://calendly.com/anilkumarr0180/30min';

//     const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <title>Demo Confirmed</title>
// <style>
// @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap%22);
// *{margin:0;padding:0;box-sizing:border-box;}
// body{background:#f4f6f9;font-family:'Inter',sans-serif;color:#14181f;padding:40px 16px;}
// .email-wrapper{max-width:620px;margin:0 auto;}
// .email-container{background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);}
// .header{padding:24px 40px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;}
// .logo-wrap{display:flex;align-items:center;gap:12px;}
// .logo-icon{width:38px;height:38px;background:#1fa8f0;border-radius:10px;color:#fff;font-size:18px;line-height:38px;text-align:center;}
// .logo-text-group{display:block;}
// .logo-main{display:block;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:18px;color:#14181f;letter-spacing:-0.5px;line-height:1.2;}
// .logo-main span{color:#ff7a1a;}
// .logo-sub{display:block;font-size:10px;color:#6b7280;letter-spacing:0.4px;text-transform:uppercase;font-weight:500;margin-top:2px;}
// .badge{background:#e6f7ed;border:1px solid #b2ebd4;color:#0c8c4a;padding:5px 14px;border-radius:999px;font-size:11px;font-weight:600;}
// .hero{background:linear-gradient(145deg, #14181f 0%, #1f2937 100%);padding:48px 40px;text-align:center;position:relative;overflow:hidden;}
// .hero::after{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 50% 100%, rgba(255,122,26,0.08), transparent 60%);pointer-events:none;}
// .hero-icon{margin:0 auto 20px;width:68px;height:68px;background:rgba(255,122,26,0.15);border:1px solid rgba(255,122,26,0.2);border-radius:50%;text-align:center;position:relative;z-index:1;font-size:32px;line-height:66px;color:#ff7a1a;font-weight:700;}
// .hero-title{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:34px;color:#ffffff;letter-spacing:-1px;line-height:1.15;position:relative;z-index:1;margin-bottom:12px;}
// .hero-title span{color:#ff7a1a;}
// .hero-sub{font-size:16px;color:rgba(255,255,255,0.7);line-height:1.6;max-width:440px;margin:0 auto;position:relative;z-index:1;}
// .body{padding:44px 40px 36px;}
// .section-title{font-size:13px;font-weight:700;color:#1fa8f0;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px;}
// .info-card{border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;margin-bottom:32px;}
// .card-row{display:flex;border-bottom:1px solid #e5e7eb;}
// .card-row:last-child{border-bottom:none;}
// .card-cell{width:50%;padding:16px 20px;border-right:1px solid #e5e7eb;}
// .card-cell:last-child{border-right:none;}
// .card-label{font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;}
// .card-value{font-size:14px;font-weight:600;color:#14181f;}
// .card-value.orange{color:#ff7a1a;}
// .cta-box{background:#fafbfc;border:1px solid #e5e7eb;border-radius:16px;padding:32px 30px;text-align:center;margin-bottom:32px;}
// .cta-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:20px;color:#14181f;margin-bottom:8px;}
// .cta-sub{font-size:14px;color:#6b7280;line-height:1.6;margin-bottom:24px;}
// .cta-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 36px;background:#1fa8f0;color:#ffffff !important;text-decoration:none;font-weight:600;font-size:14px;border-radius:999px;box-shadow:0 4px 12px rgba(31,168,240,0.25);}
// .cta-hint{font-size:12px;color:#9ca3af;margin-top:14px;}
// .steps-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;}
// .step-item{background:#fafbfc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;display:flex;align-items:flex-start;gap:20px;}
// .step-num{width:8px;height:8px;background:#14181f;border-radius:50%;flex-shrink:0;margin-top:6px;}
// .step-text{font-size:13px;color:#374151;line-height:1.5;}
// .step-text strong{color:#14181f;}
// .signoff{font-size:14px;color:#6b7280;line-height:1.8;padding-top:8px;}
// .signoff-name{font-weight:700;color:#14181f;margin-top:4px;display:block;}
// .footer{background:#fafbfc;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;}
// .footer-brand{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;color:#14181f;}
// .footer-brand span{color:#ff7a1a;}
// .footer-sub{font-size:12px;color:#9ca3af;line-height:1.6;margin-top:6px;}
// @media(max-width:600px){.header{flex-direction:row;}.header, .body, .footer{padding:20px;}.hero{padding:36px 20px;}.hero-title{font-size:28px;}.card-row{flex-direction:column;}.card-cell{width:100%;border-right:none;border-bottom:1px solid #e5e7eb;}.steps-grid{grid-template-columns:1fr;}}
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">
//   <div class="header">
//     <div class="logo-wrap">
//       <div class="logo-icon">🐾</div>
//       <div class="logo-text-group">
//         <span class="logo-main"> VetDesk<span>.ai</span></span>
//         <span class="logo-sub"> Veterinary Care Platform </span>
//       </div>
//     </div>
//     <div class="badge">✓ Confirmed</div>
//   </div>
 
//   <div class="hero">
//     <div class="hero-icon">✓</div>
//     <div class="hero-title">You're all set,<br><span>${fullName}!</span></div>
//     <div class="hero-sub">Your VetDesk demo request has been received. Select a time that works best for you, and we'll handle the rest.</div>
//   </div>
 
//   <div class="body">
//     <div class="section-title">Request Summary</div>
//     <div class="info-card">
//       <div class="card-row">
//         <div class="card-cell">
//           <div class="card-label">Request ID</div>
//           <div class="card-value orange">#${bookingId}</div>
//         </div>
//         <div class="card-cell">
//           <div class="card-label">Status</div>
//           <div class="card-value" style="color:#0c8c4a;">● Confirmed</div>
//         </div>
//       </div>
//       <div class="card-row">
//         <div class="card-cell" style="width:100%;border-right:none;">
//           <div class="card-label">Hospital</div>
//           <div class="card-value">${hospitalName}</div>
//         </div>
//       </div>
//     </div>
 
//     <div class="cta-box">
//       <div class="cta-title">Schedule Your Demo</div>
//       <div class="cta-sub">Pick a date and time that suits you. It takes less than 2 minutes.</div>
//       <a href="${calendlyUrl}" class="cta-btn">
//         Book My Demo
//       </a>
//       <div class="cta-hint">Opens Calendly • No account required</div>
//     </div>
 
//     <div class="section-title" style="color:#14181f;text-transform:none;font-size:16px;">What happens next?</div>
//     <div class="steps-grid">
//       <div class="step-item"><div class="step-num"></div><div class="step-text"> Click <strong>Book My Demo</strong> and select your preferred time.</div></div>
//       <div class="step-item"><div class="step-num"></div><div class="step-text"> Calendly sends you a calendar invite with a meeting link.</div></div>
//       <div class="step-item"><div class="step-num"></div><div class="step-text"> Our VetDesk team meets with you online for a complete walkthrough.</div></div>
//       <div class="step-item"><div class="step-num"></div><div class="step-text"> Need help? Just reply to this email — we're happy to assist.</div></div>
//     </div>
 
//     <div class="signoff">
//       We look forward to showing you what VetDesk can do for your practice.<br>
//       <span class="signoff-name">Kind regards, The VetDesk Team</span>
//     </div>
//   </div>
 
//   <div class="footer">
//     <div class="footer-brand">VetDesk<span>.ai</span></div>
//     <div class="footer-sub">Automated notification • Questions? Reply to this email.</div>
//   </div>
// </div>
// </div>
// </body>
// </html>`;

//     try {
//       const result = await this.sendEmailViaGmailAPI({ to: email, subject, html });
//       await this.saveEmailLog({ toEmail: email, fromEmail: await this.getSenderEmail(), subject, bodyHtml: html, fullName, hospitalName, hospitalPhone: "", bookingId, status: result.messageId ? "sent" : "fallback" });
//       return { success: true, result };
//     } catch (error) { return { success: false, error: error.message }; }
//   }






static async sendCustomerConfirmation(data) {
  const { fullName, email, hospitalName, bookingId } = data;
  const subject = "Thanks for requesting a VetDesk demo";
  const calendlyUrl = env.CALENDLY_URL || 'https://calendly.com/anilkumarr0180/30min';
 
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Demo Confirmed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
  background:#f0f4f8;
  font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color:#1e293b;
  padding:40px 16px;
}
.email-wrapper{max-width:620px;margin:0 auto;}
.email-container{background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;}
.header{
  background:#0c1a2e;
  padding:28px 40px;
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.logo-main{display:block;font-weight:700;font-size:18px;color:#ffffff;line-height:1.2;}
.logo-main span{color:#ff7a1a;}
.logo-sub{display:block;font-size:10.5px;color:rgba(255,255,255,0.55);letter-spacing:0.5px;text-transform:uppercase;font-weight:500;margin-top:3px;}
.badge{
  background:rgba(255,122,26,0.12);
  color:#ff9c4d;
  padding:8px 18px;
  border-radius:6px;
  font-size:12px;
  font-weight:700;
  letter-spacing:0.4px;
  text-transform:uppercase;
  border:1px solid rgba(255,122,26,0.35);
}
.body{padding:44px 40px 36px;}
.eyebrow{font-size:11px;letter-spacing:1.6px;font-weight:700;color:#ff7a1a;text-transform:uppercase;margin-bottom:12px;}
.title{font-size:26px;font-weight:700;line-height:1.35;color:#0f172a;margin-bottom:14px;}
.title span{color:#ff7a1a;}
.subtitle{font-size:15px;line-height:1.7;color:#4b5563;margin-bottom:32px;}
.summary{display:table;width:100%;border-radius:10px;overflow:hidden;margin-bottom:32px;border:1px solid #e7ebef;}
.summary-row{display:table-row;}
.summary-item{display:table-cell;width:50%;padding:16px 20px;background:#f8fafc;border-right:1px solid #e7ebef;vertical-align:top;}
.summary-item:last-child{border-right:none;}
.summary-label{font-size:10.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;font-weight:700;margin-bottom:6px;}
.summary-value{font-size:15px;font-weight:700;color:#0f172a;}
.summary-value.orange{color:#ff7a1a;}
.section-title{font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e7ebef;}
.cta-box{background:#fafbfc;border:1px solid #e7ebef;border-radius:12px;padding:32px 30px;text-align:center;margin-bottom:32px;}
.cta-title{font-weight:700;font-size:18px;color:#0f172a;margin-bottom:8px;}
.cta-sub{font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;}
.cta-btn{display:inline-block;padding:14px 36px;background:#ff7a1a;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;}
.cta-hint{font-size:12px;color:#94a3b8;margin-top:14px;}
.steps{border:1px solid #e7ebef;border-radius:10px;overflow:hidden;margin-bottom:28px;}
.step-row{padding:16px 20px;border-bottom:1px solid #e7ebef;font-size:14px;color:#374151;line-height:1.6;}
.step-row:last-child{border-bottom:none;}
.step-row strong{color:#0f172a;}
.signoff{font-size:14px;color:#64748b;line-height:1.8;}
.signoff-name{font-weight:700;color:#0f172a;margin-top:4px;display:block;}
.footer{background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e7ebef;}
.footer-brand{font-weight:700;font-size:14px;color:#0f172a;}
.footer-brand span{color:#ff7a1a;}
.footer-sub{font-size:12px;color:#94a3b8;line-height:1.6;margin-top:6px;}
@media(max-width:600px){
  .header, .body, .footer{padding:22px;}
  .title{font-size:22px;}
  .summary{display:block;}
  .summary-row{display:block;}
  .summary-item{display:block;width:100%;border-right:none;border-bottom:1px solid #e7ebef;}
  .summary-item:last-child{border-bottom:none;}
}
</style>
</head>
<body>
<div class="email-wrapper">
<div class="email-container">
  <div class="header">
    <div>
      <span class="logo-main">VetDesk<span>.ai</span></span>
      <span class="logo-sub">Veterinary Care Platform</span>
    </div>
    <div class="badge">Confirmed</div>
  </div>
 
  <div class="body">
    <div class="eyebrow">Demo Request</div>
    <div class="title">You're all set, <span>${fullName}</span></div>
    <div class="subtitle">
      Your VetDesk demo request has been received. Select a time that works best for you, and we'll handle the rest.
    </div>
 
    <div class="summary">
      <div class="summary-row">
        <div class="summary-item">
          <div class="summary-label">Request ID</div>
          <div class="summary-value orange">#${bookingId}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Hospital</div>
          <div class="summary-value">${hospitalName}</div>
        </div>
      </div>
    </div>
 
    <div class="cta-box">
      <div class="cta-title">Schedule Your Demo</div>
      <div class="cta-sub">Pick a date and time that suits you. It takes less than 2 minutes.</div>
      <a href="${calendlyUrl}" class="cta-btn">Book My Demo</a>
      <div class="cta-hint">Opens Calendly &bull; No account required</div>
    </div>
 
    <div class="section-title">What happens next?</div>
    <div class="steps">
      <div class="step-row">Click <strong>Book My Demo</strong> and select your preferred time.</div>
      <div class="step-row">Calendly sends you a calendar invite with a meeting link.</div>
      <div class="step-row">Our VetDesk team meets with you online for a complete walkthrough.</div>
      <div class="step-row">Need help? Just reply to this email &mdash; we're happy to assist.</div>
    </div>
 
    <div class="signoff">
      We look forward to showing you what VetDesk can do for your practice.
      <span class="signoff-name">Kind regards, The VetDesk Team</span>
    </div>
  </div>
 
  <div class="footer">
    <div class="footer-brand">VetDesk<span>.ai</span></div>
    <div class="footer-sub">Automated notification &bull; Questions? Reply to this email.</div>
  </div>
</div>
</div>
</body>
</html>`;
 
  try {
    const result = await this.sendEmailViaGmailAPI({ to: email, subject, html });
    await this.saveEmailLog({ toEmail: email, fromEmail: await this.getSenderEmail(), subject, bodyHtml: html, fullName, hospitalName, hospitalPhone: "", bookingId, status: result.messageId ? "sent" : "fallback" });
    return { success: true, result };
  } catch (error) { return { success: false, error: error.message }; }
}




  static async sendScheduledMeetingNotification(data) {
    const {
      fullName,
      email,
      hospitalName,
      bookingId,
      meetingTime,
      meetingUrl,
      meetingEnd
    } = data;

    const subject = ` Demo Meeting Scheduled for ${hospitalName}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Meeting Scheduled</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
  background:#f0f4f8;
  font-family:Arial,Helvetica,sans-serif;
  color:#14181f;
  padding:40px 16px;
}
.email-wrapper{max-width:640px;margin:0 auto;}
.email-container{
  background:#ffffff;
  border-radius:18px;
  overflow:hidden;
  border:1px solid rgba(20,24,31,.09);
  box-shadow:0 4px 8px rgba(0,0,0,.04),0 24px 56px rgba(0,0,0,.10);
}
.email-header{
  background:#14181f;
  padding:32px 40px;
  border-bottom:3px solid #ff7a1a;
}
.logo-box{
  width:46px;
  height:46px;
  background:#1fa8f0;
  border-radius:12px;
  display:inline-block;
  text-align:center;
  line-height:46px;
  font-size:22px;
  font-weight:700;
  color:#ffffff;
  vertical-align:middle;
}
.brand-name{
  font-size:20px;
  font-weight:700;
  color:#ffffff;
  margin:0;
  line-height:1.2;
}
.brand-sub{
  font-size:11px;
  color:rgba(255,255,255,.55);
  letter-spacing:.6px;
  text-transform:uppercase;
  display:block;
  margin-top:2px;
}
.header-badge{
  display:inline-block;
  background:#e8f5e9;
  color:#2e7d32;
  padding:9px 18px;
  border-radius:999px;
  font-size:12px;
  font-weight:700;
  letter-spacing:.6px;
  text-transform:uppercase;
  border:1px solid #a5d6a7;
}
.email-body{padding:44px 40px 36px;}
.hero{
  text-align:center;
  margin-bottom:32px;
}
.hero-icon{
  font-size:48px;
  margin-bottom:16px;
}
.hero-title{
  font-size:28px;
  font-weight:700;
  color:#14181f;
  margin-bottom:8px;
}
.hero-sub{
  font-size:16px;
  color:#6b7280;
}
.card{
  border:1px solid #e7ebef;
  border-radius:14px;
  overflow:hidden;
  margin-bottom:28px;
}
.card-header{
  background:#f8fafc;
  padding:14px 20px;
  border-bottom:1px solid #e7ebef;
}
.card-header-title{
  font-size:11px;
  font-weight:700;
  color:#9ca3af;
  text-transform:uppercase;
  letter-spacing:.7px;
}
.card-row{
  display:flex;
  border-bottom:1px solid rgba(20,24,31,.07);
}
.card-row:last-child{border-bottom:none;}
.card-cell{
  width:50%;
  padding:16px 20px;
  border-right:1px solid rgba(20,24,31,.07);
}
.card-cell:last-child{border-right:none;}
.card-cell-full{width:100%;padding:16px 20px;}
.card-label{
  font-size:10.5px;
  color:#9ca3af;
  text-transform:uppercase;
  letter-spacing:.6px;
  font-weight:700;
  margin-bottom:6px;
}
.card-value{
  font-size:14px;
  font-weight:600;
  color:#14181f;
}
.card-value a{
  color:#0c8ce0;
  text-decoration:none;
}
.meeting-link-box{
  background:#f0f7ff;
  border:1px solid #b8d8f8;
  border-radius:10px;
  padding:16px 20px;
  margin:12px 0;
  word-break:break-all;
}
.meeting-link-box a{
  color:#0c8ce0;
  font-weight:600;
  text-decoration:none;
}
.cta-button{
  display:inline-block;
  padding:15px 38px;
  background:#0c8ce0;
  color:#ffffff !important;
  text-decoration:none;
  font-weight:700;
  font-size:15px;
  border-radius:10px;
}
.cta{
  text-align:center;
  margin-top:28px;
  padding-top:28px;
  border-top:1px solid rgba(20,24,31,.07);
}
.email-footer{
  padding:26px 40px;
  text-align:center;
  background:#f8fafc;
  border-top:1px solid rgba(20,24,31,.07);
}
.footer-brand{
  font-size:14px;
  font-weight:700;
  color:#14181f;
}
.footer-brand span{color:#ff7a1a;}
.footer-sub{
  font-size:11.5px;
  color:#9ca3af;
  line-height:1.8;
  margin-top:6px;
}
@media(max-width:600px){
  .email-body{padding:28px 22px;}
  .email-header{padding:24px 22px;}
  .email-footer{padding:22px;}
  .card-row{flex-direction:column;}
  .card-cell{width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.07);}
  .card-cell:last-child{border-bottom:none;}
}
</style>
</head>
<body>
<div class="email-wrapper">
<div class="email-container">
  <div class="email-header">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="padding-right:14px;">
                <div class="logo-box">V</div>
              </td>
              <td valign="middle">
                <p class="brand-name">VetDesk<span style="color:#ff7a1a;">.ai</span></p>
                <span class="brand-sub">Veterinary Care Platform</span>
              </td>
            </tr>
          </table>
        </td>
        <td valign="middle" align="right">
          <div class="header-badge">✅ Meeting Scheduled</div>
        </td>
      </tr>
    </table>
  </div>
  <div class="email-body">
    <div class="hero">
      <div class="hero-icon">📅</div>
      <div class="hero-title">Demo Meeting Scheduled!</div>
      <div class="hero-sub">A customer has booked their demo meeting.</div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-header-title">Meeting Details</div>
      </div>
      <div class="card-row">
        <div class="card-cell">
          <div class="card-label">Customer</div>
          <div class="card-value">${fullName}</div>
        </div>
        <div class="card-cell">
          <div class="card-label">Email</div>
          <div class="card-value"><a href="mailto:${email}">${email}</a></div>
        </div>
      </div>
      <div class="card-row">
        <div class="card-cell-full">
          <div class="card-label">Hospital</div>
          <div class="card-value">${hospitalName}</div>
        </div>
      </div>
      <div class="card-row">
        <div class="card-cell">
          <div class="card-label">Date & Time</div>
          <div class="card-value">${new Date(meetingTime).toLocaleString()}</div>
        </div>
        <div class="card-cell">
          <div class="card-label">Booking ID</div>
          <div class="card-value">#${bookingId}</div>
        </div>
      </div>
      ${meetingEnd ? `
      <div class="card-row">
        <div class="card-cell-full">
          <div class="card-label">End Time</div>
          <div class="card-value">${new Date(meetingEnd).toLocaleString()}</div>
        </div>
      </div>
      ` : ''}
      <div class="card-row">
        <div class="card-cell-full">
          <div class="card-label">Meeting Link</div>
          <div class="meeting-link-box">
            <a href="${meetingUrl}" target="_blank">${meetingUrl}</a>
          </div>
        </div>
      </div>
    </div>

    <div class="cta">
      <a href="${env.CURRENT_URL || '#'}" class="cta-button">View All Bookings &rarr;</a>
    </div>
  </div>
  <div class="email-footer">
    <div class="footer-brand">VetDesk<span>.ai</span></div>
    <div class="footer-sub">
      Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification<br>
      Please do not reply to this email &nbsp;&bull;&nbsp; Sent at ${new Date().toLocaleString()}
    </div>
  </div>
</div>
</div>
</body>
</html>`;

    try {
      const toEmail = await this.getRecipientEmail();
      const result = await this.sendEmailViaGmailAPI({
        to: toEmail,
        subject: subject,
        html: html
      });

      await this.saveEmailLog({
        toEmail: toEmail,
        fromEmail: await this.getSenderEmail(),
        subject: subject,
        bodyHtml: html,
        fullName: fullName,
        hospitalName: hospitalName,
        hospitalPhone: "",
        bookingId: bookingId,
        status: result.messageId ? 'sent' : 'fallback'
      });

      logger.info(`Scheduled meeting notification sent to admin for ${email}`);
      return { success: true, result };

    } catch (error) {
      logger.error('Failed to send scheduled meeting notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save email log to database
   */
  static async saveEmailLog(data) {
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
  }
}

module.exports = BookDemoEmailService;