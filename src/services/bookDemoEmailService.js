



// ////////////
// const { google } = require('googleapis');
// const { executeQuery } = require('../config/database');
// const logger = require('../utils/logger');
// const env = require('../config/env');

// class BookDemoEmailService {

//     /**
//      * Get active email configuration from database
//      */
//     static async getActiveConfig() {
//         try {
//             const result = await executeQuery(
//                 `SELECT * FROM email_config WHERE is_active = true LIMIT 1`
//             );
//             return result.rows[0] || null;
//         } catch (error) {
//             logger.error('Error fetching email config:', error);
//             return null;
//         }
//     }

//     /**
//      * Get OAuth2 Client for Gmail
//      */
//     static getOAuth2Client() {
//         // ✅ Use the correct environment variable names
//         const clientId = env.GOOGLE_CLIENT_ID;
//         const clientSecret = env.GOOGLE_CLIENT_SECRET;
//         const refreshToken = env.GOOGLE_GMAIL_REFRESH_TOKEN || env.GMAIL_REFRESH_TOKEN;

//         console.log('🔐 OAuth2 Configuration Check:');
//         console.log(`   Client ID: ${clientId ? '✅ Present' : '❌ Missing'}`);
//         console.log(`   Client Secret: ${clientSecret ? '✅ Present' : '❌ Missing'}`);
//         console.log(`   Refresh Token: ${refreshToken ? '✅ Present' : '❌ Missing'}`);

//         if (!clientId || !clientSecret || !refreshToken) {
//             logger.warn('⚠️ Missing Gmail OAuth2 credentials - email will not be sent');
//             return null;
//         }

//         const oAuth2Client = new google.auth.OAuth2(
//             clientId,
//             clientSecret,
//             env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
//         );

//         oAuth2Client.setCredentials({
//             refresh_token: refreshToken
//         });

//         return oAuth2Client;
//     }

//     /**
//      * Send email via Gmail API
//      */
//     static async sendEmailViaGmailAPI({ to, subject, html }) {
//         try {
//             // ✅ Validate recipient email
//             if (!to || to === 'undefined' || to === 'null' || to.trim() === '') {
//                 logger.error('❌ Invalid recipient email:', to);
//                 throw new Error(`Invalid recipient email: "${to}". Please configure SUPERADMIN_EMAIL in .env`);
//             }

//             const oAuth2Client = this.getOAuth2Client();

//             if (!oAuth2Client) {
//                 // ✅ Log the email instead of failing
//                 logger.warn('📧 OAuth2 not configured - Email logged to console:');
//                 logger.warn(`   To: ${to}`);
//                 logger.warn(`   Subject: ${subject}`);
//                 logger.warn(`   Body preview: ${html.substring(0, 300)}...`);
//                 return { messageId: `fallback-${Date.now()}`, note: 'Email logged to console' };
//             }

//             const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
//             const fromEmail = await this.getSenderEmail();

//             // ✅ Validate sender email
//             if (!fromEmail || fromEmail === 'undefined' || fromEmail === 'null' || fromEmail.trim() === '') {
//                 logger.error('❌ Invalid sender email:', fromEmail);
//                 throw new Error(`Invalid sender email: "${fromEmail}". Please configure GOOGLE_EMAIL in .env`);
//             }

//             logger.info(`📧 Sending email FROM: ${fromEmail} TO: ${to}`);

//             // Build raw email
//             const emailLines = [
//                 `From: "VetDesk.ai" <${fromEmail}>`,
//                 `To: ${to}`,
//                 `Subject: ${subject}`,
//                 'Content-Type: text/html; charset=UTF-8',
//                 '',
//                 html
//             ];

//             const email = emailLines.join('\r\n');

//             const raw = Buffer.from(email)
//                 .toString('base64')
//                 .replace(/\+/g, '-')
//                 .replace(/\//g, '_')
//                 .replace(/=+$/, '');

//             const result = await gmail.users.messages.send({
//                 userId: 'me',
//                 requestBody: { raw }
//             });

//             logger.info(`✅ Book Demo email sent via Gmail API: ${result.data.id}`);
//             return { messageId: result.data.id };

//         } catch (error) {
//             logger.error('❌ Error sending email via Gmail API:', error.message);
            
//             // ✅ Log the email as fallback instead of throwing
//             logger.warn('📧 Email failed - Content logged to console:');
//             logger.warn(`   To: ${to}`);
//             logger.warn(`   Subject: ${subject}`);
//             logger.warn(`   Error: ${error.message}`);
            
//             return { messageId: `fallback-${Date.now()}`, note: `Email failed: ${error.message}` };
//         }
//     }

//     /**
//      * Get sender email address (from config or .env)
//      */
//     static async getSenderEmail() {
//         const config = await this.getActiveConfig();
//         if (config && config.from_email) {
//             return config.from_email;
//         }
//         return env.GOOGLE_EMAIL || env.GMAIL_FROM_EMAIL || 'anilkumarr0180@gmail.com';
//     }

//     /**
//      * Get recipient email address (Super Admin)
//      */
//     static async getRecipientEmail() {
//         const config = await this.getActiveConfig();
//         if (config && config.to_email) {
//             return config.to_email;
//         }
//         return env.SUPERADMIN_EMAIL || 'rajdevfree@gmail.com';
//     }



// static async sendSuperAdminNotification(data) {
//    const {
//     fullName,
//     email,
//     hospitalName,
//     hospitalAddress,
//     hospitalEmail,
//     hospitalPhone,
//     notes,
//     bookingId
// } = data;


//    const subject = `New Demo Request by ${hospitalName}`;

// //     const html = `
// // <!DOCTYPE html>
// // <html>
// // <head>
// // <meta charset="UTF-8">
// // <meta name="viewport" content="width=device-width,initial-scale=1.0">

// // <title>New Demo Request</title>

// // <style>

// // @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

// // :root{

// // --orange:#ff7a1a;
// // --orange-deep:#f25c00;
// // --orange-pale:#ffece0;

// // --sky:#1fa8f0;
// // --sky-deep:#0c8ce0;
// // --sky-pale:#eaf6ff;

// // --ink:#14181f;
// // --slate:#6b7280;
// // --line:rgba(20,24,31,.08);

// // }

// // *{
// // margin:0;
// // padding:0;
// // box-sizing:border-box;
// // }

// // body{

// // background:#f5f8fb;
// // font-family:'Inter',sans-serif;
// // color:var(--ink);
// // padding:40px 20px;

// // }

// // .email-container{

// // max-width:640px;
// // margin:auto;

// // background:#fff;

// // border-radius:18px;

// // overflow:hidden;

// // border:1px solid var(--line);

// // box-shadow:

// // 0 2px 6px rgba(0,0,0,.04),

// // 0 28px 60px rgba(0,0,0,.08);

// // }

// // /* HEADER */

// // .email-header{

// // background:var(--ink);

// // padding:34px 40px;

// // border-bottom:4px solid var(--orange);

// // }

// // .header-content{

// // display:flex;

// // justify-content:space-between;

// // align-items:center;

// // gap:20px;

// // }

// // .header-left{

// // display:flex;

// // align-items:center;

// // gap:16px;

// // }

// // .brand-text h2{

// // font-family:'Space Grotesk',sans-serif;

// // font-size:22px;

// // font-weight:700;

// // color:#fff;

// // margin:0;

// // }

// // .brand-text span{

// // font-size:11px;

// // color:rgba(255,255,255,.65);

// // letter-spacing:.5px;

// // text-transform:uppercase;

// // }

// // .header-badge{

// // display:inline-block;

// // background:#fff3ea;

// // color:#f25c00;

// // padding:9px 18px;

// // border-radius:999px;

// // font-size:12px;

// // font-weight:700;

// // letter-spacing:.5px;

// // border:1px solid #ffd4bc;

// // }

// // /* BODY */

// // .email-body{

// // padding:40px;

// // }

// // .eyebrow{

// // font-size:11px;

// // letter-spacing:1.4px;

// // font-weight:700;

// // color:var(--orange);

// // text-transform:uppercase;

// // margin-bottom:10px;

// // }

// // .title{

// // font-size:36px;

// // font-weight:700;

// // line-height:1.2;

// // color:#14181f;

// // margin-bottom:12px;

// // }
// // .subtitle{



// // font-size:15px;

// // line-height:1.8;

// // color:#4b5563;


// // margin-bottom:35px;

// // }

// // /* SUMMARY */

// // .summary{

// // display:grid;

// // grid-template-columns:repeat(3,1fr);


// // border-radius:12px;

// // overflow:hidden;

// // margin-bottom:35px;



// // border:1px solid #e7ebef;

// // box-shadow:0 2px 6px rgba(0,0,0,.03);

// // }

// // .summary-item{

// // padding:18px;

// // background:#ffffff;

// // border-right:1px solid var(--line);

// // }

// // .summary-item:last-child{

// // border-right:none;

// // }

// // .summary-label{

// // font-size:11px;

// // color:#8b95a5;

// // text-transform:uppercase;

// // margin-bottom:6px;

// // font-weight:600;

// // }

// // .summary-value{

// // font-size:15px;

// // font-weight:700;

// // color:var(--ink);

// // }

// // .orange{

// // color:var(--orange);

// // }

// // /* SECTION */

// // .section{

// // margin-bottom:30px;

// // }

// // .section-title{

// // font-family:'Space Grotesk',sans-serif;

// // font-size:16px;

// // margin-bottom:16px;

// // padding-bottom:10px;

// // border-bottom:1px solid var(--line);

// // }

// // /* DETAILS */

// // .details{

// // border:1px solid var(--line);

// // border-radius:12px;

// // overflow:hidden;

// // }

// // .row{

// // display:flex;

// // border-bottom:1px solid var(--line);

// // }

// // .row:last-child{

// // border-bottom:none;

// // }

// // .cell{

// // width:50%;

// // padding:16px 18px;

// // border-right:1px solid var(--line);

// // }

// // .cell:last-child{

// // border-right:none;

// // }

// // .label{

// // font-size:11px;

// // color:#9ca3af;

// // text-transform:uppercase;

// // font-weight:600;

// // margin-bottom:6px;

// // }

// // .value{

// // font-size:14px;

// // font-weight:500;

// // color:var(--ink);

// // word-break:break-word;

// // }

// // .value a{

// // color:var(--sky-deep);

// // text-decoration:none;

// // }

// // /* NOTES */

// // .notes{

// // background:#fafafa;

// // padding:20px;

// // border-radius:12px;

// // border:1px solid var(--line);

// // font-size:14px;

// // line-height:1.8;

// // }

// // /* NEXT STEPS */

// // .steps{

// // padding-left:20px;

// // margin-top:10px;

// // }

// // .steps li{

// // margin-bottom:12px;

// // font-size:14px;

// // color:#555;

// // }

// // /* CTA */

// // .cta{

// // text-align:center;

// // margin-top:40px;

// // }

// // .button{

// // display:inline-block;

// // padding:15px 34px;

// // background:var(--sky-deep);

// // color:#fff!important;

// // text-decoration:none;

// // font-weight:600;

// // border-radius:10px;

// // }

// // /* FOOTER */

// // .email-footer{

// // padding:30px;

// // text-align:center;

// // background:#fafafa;

// // border-top:1px solid var(--line);

// // }

// // .email-footer p{

// // font-size:12px;

// // color:#7a8594;

// // line-height:1.8;

// // }

// // .email-footer strong{

// // font-family:'Space Grotesk',sans-serif;

// // color:var(--ink);

// // }

// // @media(max-width:640px){

// // .header-content{

// // flex-direction:column;

// // align-items:flex-start;

// // }

// // .summary{

// // grid-template-columns:1fr;

// // }

// // .summary-item{

// // border-right:none;

// // border-bottom:1px solid var(--line);

// // }

// // .summary-item:last-child{

// // border-bottom:none;

// // }

// // .row{

// // display:block;

// // }

// // .cell{

// // width:100%;

// // border-right:none;

// // border-bottom:1px solid var(--line);

// // }

// // .cell:last-child{

// // border-bottom:none;

// // }

// // .email-body{

// // padding:26px;

// // }

// // .email-header{

// // padding:26px;

// // }

// // }

// // </style>

// // </head>
// // <body>
// //     <div class="email-container">
// //         <!-- ─── HEADER ─── -->
// //       <div class="email-header">

// //     <div class="header-content">

// //         <div class="header-left">

// //             <!-- VetDesk Logo -->
// //             <svg
// //                 width="46"
// //                 height="46"
// //                 viewBox="0 0 40 40"
// //                 xmlns="http://www.w3.org/2000/svg">

// //                 <defs>
// //                     <linearGradient
// //                         id="logoGrad"
// //                         x1="0"
// //                         y1="0"
// //                         x2="40"
// //                         y2="40">

// //                         <stop stop-color="#2BB7FF"/>
// //                         <stop offset="1" stop-color="#0C8CE0"/>

// //                     </linearGradient>
// //                 </defs>

// //                 <rect
// //                     width="40"
// //                     height="40"
// //                     rx="12"
// //                     fill="url(#logoGrad)"
// //                 />

// //                 <path
// //                     d="M20 11C16.5 7 9 8.5 9 15.5C9 21.5 16 26 20 30C24 26 31 21.5 31 15.5C31 8.5 23.5 7 20 11Z"
// //                     fill="white"
// //                     fill-opacity="0.95"
// //                 />

// //                 <path
// //                     d="M14 19.5H17L18.5 16L21 23L22.5 19.5H26"
// //                     stroke="#0C8CE0"
// //                     stroke-width="1.8"
// //                     stroke-linecap="round"
// //                     stroke-linejoin="round"
// //                 />

// //             </svg>

// //             <div class="brand-text">

// //                 <h2>Vet Desk</h2>

// //                 <span>Veterinary Care Platform</span>

// //             </div>

// //         </div>

// //         <div class="header-badge">

// //             NEW DEMO REQUEST

// //         </div>

// //     </div>

// // </div>
               

// //         <!-- ─── BODY ─── -->
// //       <div class="email-body">

// //     <div class="eyebrow">

// //         DEMO REQUEST

// //     </div>

// //     <div class="title">

// //         A new demo request has been submitted.

// //     </div>

// //     <div class="subtitle">

// //         A hospital administrator has completed the Vet Desk demo request form.
// //         Review the request below and follow up with the customer.
// //     </div>

// //     <div class="summary">

// //         <div class="summary-item">

// //             <div class="summary-label">

// //                 Request ID

// //             </div>

// //             <div class="summary-value orange">

// //                 #${bookingId}

// //             </div>

// //         </div>

// //         <div class="summary-item">

// //             <div class="summary-label">

// //                 Status

// //             </div>

// //             <div class="summary-value">

// //                 New

// //             </div>

// //         </div>

// //         <div class="summary-item">

// //             <div class="summary-label">

// //                 Submitted

// //             </div>

// //             <div class="summary-value">

// //                 ${new Date().toLocaleString()}

// //             </div>

// //         </div>

// //     </div>
// //     <!-- ========================= -->
// // <!-- REQUESTER INFORMATION -->
// // <!-- ========================= -->

// // <div class="section">

// //     <div class="section-title">

// //         Requester Information

// //     </div>

// //     <div class="details">

// //         <div class="row">

// //             <div class="cell">

// //                 <div class="label">

// //                     Contact Name

// //                 </div>

// //                 <div class="value">

// //                     ${fullName}

// //                 </div>

// //             </div>

// //             <div class="cell">

// //                 <div class="label">

// //                     Email Address

// //                 </div>

// //                 <div class="value">

// //                     <a href="mailto:${email}">
// //                         ${email}
// //                     </a>

// //                 </div>

// //             </div>

// //         </div>

// //         <div class="row">

// //             <div class="cell">

// //                 <div class="label">

// //                     Hospital Name

// //                 </div>

// //                 <div class="value">

// //                     ${hospitalName}

// //                 </div>

// //             </div>

// //             <div class="cell">

// //                 <div class="label">

// //                     Hospital Email

// //                 </div>

// //                 <div class="value">

// //                     <a href="mailto:${hospitalEmail}">
// //                         ${hospitalEmail}
// //                     </a>

// //                 </div>

// //             </div>

// //         </div>

// //         <div class="row">

// //             <div class="cell">

// //                 <div class="label">

// //                     Hospital Phone

// //                 </div>

// //                 <div class="value">

// //                     ${hospitalPhone}

// //                 </div>

// //             </div>

// //             <div class="cell">

// //                 <div class="label">

// //                     Current Status

// //                 </div>

// //                 <div class="value">

// //                     <span
// //                     style="
// //                     display:inline-block;
// //                     padding:6px 12px;
// //                     border-radius:999px;
// //                     background:#fff3ea;
// //                     color:#ff7a1a;
// //                     font-weight:600;
// //                     font-size:13px;
// //                     ">
// //                     New
// //                     </span>

// //                 </div>

// //             </div>

// //         </div>

// //         <div class="row">

// //             <div class="cell" style="width:100%;border-right:none;">

// //                 <div class="label">

// //                     Hospital Address

// //                 </div>

// //                 <div class="value">

// //                     ${hospitalAddress}

// //                 </div>

// //             </div>

// //         </div>

// //     </div>

// // </div>

// // <!-- ========================= -->
// // <!-- NOTES -->
// // <!-- ========================= -->

// // ${
// // notes
// // ?

// // `
// // <div class="section">

// //     <div class="section-title">

// //         Additional Notes

// //     </div>

// //     <div class="notes">

// //         ${notes}

// //     </div>

// // </div>
// // `

// // :

// // `
// // <div class="section">

// //     <div class="section-title">

// //         Additional Notes

// //     </div>

// //     <div class="notes">

// //         No additional notes were provided by the requester.

// //     </div>

// // </div>
// // `

// // }

// //            <ul class="step-list">
// // <li>Review the demo request.</li>
// // <li>Open the Super Admin dashboard.</li>
// // <li>Contact the requester if needed.</li>
// // <li>Wait for the customer to book a meeting via Calendly.</li>
// // </ul>

// //             <!-- CTA -->
// //             <div class="action-section">
// //                 <a href="${env.FRONTEND_URL}" class="action-button">View All Bookings</a>
// //             </div>
// //         </div>

// //         <!-- ─── FOOTER ─── -->
// //         <div class="email-footer">
// //             <p><span class="brand">VetDesk.ai</span> — Veterinary Care Platform</p>
// //             <p class="small">This is an automated notification. Please do not reply to this email.</p>
// //             <p class="small" style="margin-top: 3px;">Sent at: ${new Date().toLocaleString()}</p>
// //         </div>
// //     </div>
// // </body>
// // </html>`;
// const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <meta http-equiv="X-UA-Compatible" content="IE=edge">
// <title>New Demo Request</title>
// <style>
// /* No CSS variables — Gmail strips them. No @import — Gmail strips it.
//    All colors and fonts are hardcoded so nothing goes invisible. */

// *{margin:0;padding:0;box-sizing:border-box;}

// body{
//   background:#f0f4f8;
//   font-family:Arial,Helvetica,sans-serif;
//   color:#14181f;
//   padding:40px 16px;
//   -webkit-font-smoothing:antialiased;
// }

// .email-wrapper{
//   max-width:640px;
//   margin:0 auto;
// }

// .email-container{
//   background:#ffffff;
//   border-radius:18px;
//   overflow:hidden;
//   border:1px solid rgba(20,24,31,.09);
//   box-shadow:0 4px 8px rgba(0,0,0,.04),0 24px 56px rgba(0,0,0,.10);
// }

// /* ── HEADER ── */
// .email-header{
//   background:#14181f;
//   padding:32px 40px;
//   border-bottom:3px solid #ff7a1a;
// }


// /* Logo rendered as a table so it works in all clients */
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
//   flex-shrink:0;
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
//   white-space:nowrap;
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
//   white-space:nowrap;
//   flex-shrink:0;
// }

// /* ── BODY ── */
// .email-body{
//   padding:44px 40px;
// }

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

// /* ── SUMMARY STRIP ── */
// .summary{
//   display:table;
//   width:100%;
//   border-radius:12px;
//   overflow:hidden;
//   margin-bottom:36px;
//   border:1px solid #e7ebef;
//   box-shadow:0 2px 6px rgba(0,0,0,.03);
// }

// .summary-row{
//   display:table-row;
// }

// .summary-item{
//   display:table-cell;
//   width:33.33%;
//   padding:18px 20px;
//   background:#ffffff;
//   border-right:1px solid rgba(20,24,31,.08);
//   vertical-align:top;
// }

// .summary-item:last-child{
//   border-right:none;
// }

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

// .summary-value.orange{
//   color:#ff7a1a;
// }

// /* ── SECTION ── */
// .section{
//   margin-bottom:32px;
// }

// .section-title{
//   font-family:Arial,Helvetica,sans-serif;
//   font-size:15px;
//   font-weight:700;
//   color:#14181f;
//   margin-bottom:14px;
//   padding-bottom:10px;
//   border-bottom:1px solid rgba(20,24,31,.08);
// }

// /* ── DETAILS TABLE ── */
// .details{
//   border:1px solid rgba(20,24,31,.08);
//   border-radius:12px;
//   overflow:hidden;
// }

// .det-row{
//   display:flex;
//   border-bottom:1px solid rgba(20,24,31,.08);
// }

// .det-row:last-child{
//   border-bottom:none;
// }

// .cell{
//   width:50%;
//   padding:16px 18px;
//   border-right:1px solid rgba(20,24,31,.08);
// }

// .cell:last-child{
//   border-right:none;
// }

// .cell-full{
//   width:100%;
//   padding:16px 18px;
// }

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

// .cell-value a{
//   color:#0c8ce0;
//   text-decoration:none;
// }

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

// /* ── NOTES ── */
// .notes-box{
//   background:#fafbfc;
//   padding:20px;
//   border-radius:12px;
//   border:1px solid rgba(20,24,31,.08);
//   font-size:14px;
//   line-height:1.8;
//   color:#374151;
// }

// /* ── NEXT STEPS ── */
// .steps-box{
//   background:#f6faff;
//   border:1px solid #d4e9ff;
//   border-radius:12px;
//   padding:20px 20px 20px 22px;
// }

// .steps-box-title{
//   font-size:13px;
//   font-weight:700;
//   color:#0c8ce0;
//   text-transform:uppercase;
//   letter-spacing:.7px;
//   margin-bottom:14px;
// }

// .step-list{
//   padding-left:18px;
//   margin:0;
// }

// .step-list li{
//   margin-bottom:10px;
//   font-size:14px;
//   color:#374151;
//   line-height:1.55;
// }

// .step-list li:last-child{
//   margin-bottom:0;
// }

// /* ── CTA ── */
// .cta{
//   text-align:center;
//   margin-top:36px;
//   padding-top:32px;
//   border-top:1px solid rgba(20,24,31,.07);
// }

// .cta-label{
//   font-size:13px;
//   color:#9ca3af;
//   margin-bottom:16px;
//   font-weight:500;
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
//   letter-spacing:.2px;
// }

// /* ── FOOTER ── */
// .email-footer{
//   padding:28px 40px;
//   text-align:center;
//   background:#f8fafc;
//   border-top:1px solid rgba(20,24,31,.07);
// }

// .footer-brand{
//   font-family:Arial,Helvetica,sans-serif;
//   font-size:14px;
//   font-weight:700;
//   color:#14181f;
// }

// .footer-brand span{
//   color:#ff7a1a;
// }

// .footer-sub{
//   font-size:11.5px;
//   color:#9ca3af;
//   line-height:1.8;
//   margin-top:6px;
// }

// /* ── MOBILE ── */
// @media(max-width:600px){
//   .email-body{padding:28px 22px;}
//   .email-header{padding:24px 22px;}
//   .email-footer{padding:22px;}
//   .header-content{flex-direction:column;align-items:flex-start;}
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

//   <!-- ══ HEADER ══ -->
//   <div class="email-header">
//     <table width="100%" cellpadding="0" cellspacing="0" border="0">
//   <tr>
//     <td valign="middle" style="padding:0;">
//       <table cellpadding="0" cellspacing="0" border="0">
//         <tr>
//           <td valign="middle" style="padding-right:14px;">
//             <div class="logo-box">V</div>
//           </td>
//           <td valign="middle">
//             <p class="brand-name">VetDesk<span style="color:#ff7a1a;">.ai</span></p>
//             <span class="brand-sub">Veterinary Care Platform</span>
//           </td>
//         </tr>
//       </table>
//     </td>
//     <td valign="middle" align="right" style="padding:0;">
//       <div class="header-badge">&#9679; New Demo Request</div>
//     </td>
//   </tr>
// </table>
//   </div>

//   <!-- ══ BODY ══ -->
//   <div class="email-body">

//     <div class="eyebrow">Demo Request</div>

//     <div class="title">A new demo<br>request has arrived.</div>

//     <div class="subtitle">
//       A hospital administrator has completed the VetDesk demo request form.
//       Review the details below and follow up with the customer promptly.
//     </div>

//     <!-- SUMMARY STRIP -->
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

//     <!-- REQUESTER INFORMATION -->
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

//     <!-- NOTES -->
//     <div class="section">
//       <div class="section-title">Additional Notes</div>
//       <div class="notes-box">
//         ${notes
//           ? `${notes}`
//           : `<span style="color:#9ca3af;font-style:italic;">No additional notes were provided by the requester.</span>`
//         }
//       </div>
//     </div>

//     <!-- NEXT STEPS -->
//     <div class="section">
//       <div class="section-title">Next Steps</div>
//       <div class="steps-box">
//         <div class="steps-box-title">&#10003; Action Required</div>
//         <ul class="step-list">
//           <li>Review the demo request details above.</li>
//           <li>Open the Super Admin dashboard to manage this booking.</li>
//           <li>Contact the requester directly if any clarification is needed.</li>
//           <li>Wait for the customer to book a meeting via Calendly.</li>
//         </ul>
//       </div>
//     </div>

//     <!-- CTA -->
//     <div class="cta">
//       <div class="cta-label">Ready to take action?</div>
//       <a href="${env.FRONTEND_URL}" class="cta-button">View All Bookings &rarr;</a>
//     </div>

//   </div>

//   <!-- ══ FOOTER ══ -->
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
// </html>
// `;
//     const toEmail = await this.getRecipientEmail();
//     const fromEmail = await this.getSenderEmail();

//     logger.info(`Email configuration: FROM: ${fromEmail} TO: ${toEmail}`);

//     try {
//         const result = await this.sendEmailViaGmailAPI({
//             to: toEmail,
//             subject: subject,
//             html: html
//         });

//         await this.saveEmailLog({
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

//         logger.info(`Book Demo email processed for Super Admin: ${toEmail}`);
//         return { success: true, result };

//     } catch (error) {
//         logger.error('Error sending Book Demo email:', error.message);

//         await this.saveEmailLog({
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

//         return { success: true, note: 'Booking saved, email failed' };
//     }
// }


// /**
//  * Send confirmation email to customer with Calendly link
//  */
// static async sendCustomerConfirmation(data) {
//     const {
//         fullName,
//         email,
//         hospitalName,
//         bookingId
//     } = data;

//     const subject = "Thanks for requesting a VetDesk demo";

//     const calendlyUrl =
//         env.CALENDLY_URL || 'https://calendly.com/anilkumarr0180/30min' ;

//     const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width,initial-scale=1.0">
// <meta http-equiv="X-UA-Compatible" content="IE=edge">
// <title>Demo Request Confirmed</title>
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

// /* ── HEADER ── */
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
//   white-space:nowrap;
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
//   white-space:nowrap;
// }

// /* ── HERO BANNER ── */
// .hero{
//   background:#14181f;
//   padding:40px 40px 48px;
//   text-align:center;
//   position:relative;
// }

// .hero-icon{
//   width:72px;
//   height:72px;
//   background:#1a2030;
//   border:2px solid rgba(255,122,26,.35);
//   border-radius:50%;
//   margin:0 auto 22px;
//   display:table;
//   text-align:center;
// }

// .hero-icon-inner{
//   display:table-cell;
//   vertical-align:middle;
//   font-size:30px;
// }

// .hero-title{
//   font-size:32px;
//   font-weight:700;
//   color:#ffffff;
//   line-height:1.18;
//   margin-bottom:12px;
// }

// .hero-title span{color:#ff7a1a;}

// .hero-sub{
//   font-size:15px;
//   color:rgba(255,255,255,.60);
//   line-height:1.7;
//   max-width:420px;
//   margin:0 auto;
// }

// /* ── BODY ── */
// .email-body{padding:44px 40px 36px;}

// .section-label{
//   font-size:10.5px;
//   letter-spacing:1.6px;
//   font-weight:700;
//   color:#ff7a1a;
//   text-transform:uppercase;
//   margin-bottom:14px;
// }

// /* ── BOOKING CARD ── */
// .booking-card{
//   border:1px solid #e7ebef;
//   border-radius:14px;
//   overflow:hidden;
//   margin-bottom:36px;
//   box-shadow:0 2px 8px rgba(0,0,0,.04);
// }

// .booking-card-header{
//   background:#f8fafc;
//   padding:14px 20px;
//   border-bottom:1px solid #e7ebef;
// }

// .booking-card-header-title{
//   font-size:11px;
//   font-weight:700;
//   color:#9ca3af;
//   text-transform:uppercase;
//   letter-spacing:.7px;
// }

// .booking-row{
//   display:flex;
//   border-bottom:1px solid rgba(20,24,31,.07);
// }

// .booking-row:last-child{border-bottom:none;}

// .booking-cell{
//   width:50%;
//   padding:16px 20px;
//   border-right:1px solid rgba(20,24,31,.07);
// }

// .booking-cell:last-child{border-right:none;}

// .booking-cell-full{
//   width:100%;
//   padding:16px 20px;
// }

// .booking-label{
//   font-size:10.5px;
//   color:#9ca3af;
//   text-transform:uppercase;
//   letter-spacing:.6px;
//   font-weight:700;
//   margin-bottom:6px;
// }

// .booking-value{
//   font-size:14px;
//   font-weight:600;
//   color:#14181f;
// }

// .booking-value.orange{color:#ff7a1a;font-size:15px;}

// .status-pill{
//   display:inline-block;
//   padding:4px 12px;
//   border-radius:999px;
//   background:#fff3ea;
//   color:#ff7a1a;
//   font-weight:700;
//   font-size:12px;
//   border:1px solid #ffd4bc;
// }

// /* ── CTA ── */
// .cta-section{
//   text-align:center;
//   background:#f8fafc;
//   border:1px solid #e7ebef;
//   border-radius:14px;
//   padding:36px 30px;
//   margin-bottom:36px;
// }

// .cta-heading{
//   font-size:20px;
//   font-weight:700;
//   color:#14181f;
//   margin-bottom:10px;
// }

// .cta-sub{
//   font-size:14px;
//   color:#6b7280;
//   line-height:1.7;
//   margin-bottom:28px;
// }

// .cta-button{
//   display:inline-block;
//   background:#0c8ce0;
//   color:#ffffff !important;
//   text-decoration:none;
//   padding:16px 40px;
//   border-radius:10px;
//   font-size:15px;
//   font-weight:700;
//   letter-spacing:.2px;
// }

// .cta-hint{
//   font-size:12px;
//   color:#9ca3af;
//   margin-top:16px;
// }

// /* ── STEPS ── */
// .steps-section{margin-bottom:36px;}

// .steps-title{
//   font-size:15px;
//   font-weight:700;
//   color:#14181f;
//   margin-bottom:16px;
//   padding-bottom:10px;
//   border-bottom:1px solid rgba(20,24,31,.08);
// }

// .step-item{
//   display:flex;
//   gap:16px;
//   margin-bottom:16px;
//   align-items:flex-start;
// }

// .step-item:last-child{margin-bottom:0;}

// .step-num{
//   width:28px;
//   height:28px;
//   border-radius:50%;
//   background:#fff3ea;
//   border:1px solid #ffd4bc;
//   color:#f25c00;
//   font-size:12px;
//   font-weight:700;
//   text-align:center;
//   line-height:26px;
//   flex-shrink:0;
//   display:inline-block;
// }

// .step-text{
//   font-size:14px;
//   color:#374151;
//   line-height:1.6;
//   padding-top:4px;
// }

// /* ── SIGN-OFF ── */
// .signoff{
//   font-size:15px;
//   line-height:1.8;
//   color:#4b5563;
//   margin-bottom:8px;
// }

// .signoff-name{
//   font-size:15px;
//   font-weight:700;
//   color:#14181f;
// }

// /* ── FOOTER ── */
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
//   .email-header,.email-body,.email-footer{padding-left:22px;padding-right:22px;}
//   .hero{padding:32px 22px 40px;}
//   .hero-title{font-size:26px;}
//   .booking-row{flex-direction:column;}
//   .booking-cell{width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.07);}
//   .booking-cell:last-child{border-bottom:none;}
// }
// </style>
// </head>
// <body>
// <div class="email-wrapper">
// <div class="email-container">

//   <!-- ══ HEADER ══ -->
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
//           <div class="header-badge">&#10003; Request Confirmed</div>
//         </td>
//       </tr>
//     </table>
//   </div>

//   <!-- ══ HERO ══ -->
//   <div class="hero">
//     <div class="hero-icon">
//       <div class="hero-icon-inner">&#128076;</div>
//     </div>
//     <div class="hero-title">You're all set,<br><span>${fullName}!</span></div>
//     <div class="hero-sub">
//       Your VetDesk demo request has been received. Book a time that works for you and we'll take care of the rest.
//     </div>
//   </div>

//   <!-- ══ BODY ══ -->
//   <div class="email-body">

//     <!-- BOOKING DETAILS -->
//     <div class="section-label">Your Request Details</div>
//     <div class="booking-card">
//       <div class="booking-card-header">
//         <div class="booking-card-header-title">Booking Summary</div>
//       </div>

//       <div class="booking-row">
//         <div class="booking-cell">
//           <div class="booking-label">Request ID</div>
//           <div class="booking-value orange">#${bookingId}</div>
//         </div>
//         <div class="booking-cell">
//           <div class="booking-label">Status</div>
//           <div class="booking-value">
//             <span class="status-pill">&#9679; Confirmed</span>
//           </div>
//         </div>
//       </div>

//       <div class="booking-row">
//         <div class="booking-cell-full">
//           <div class="booking-label">Hospital</div>
//           <div class="booking-value">${hospitalName}</div>
//         </div>
//       </div>
//     </div>

//     <!-- CTA -->
//     <div class="cta-section">
//       <div class="cta-heading">Schedule Your Demo</div>
//       <div class="cta-sub">
//         Pick a date and time that suits you. The whole process<br>takes less than 2 minutes.
//       </div>
//       <a href="${calendlyUrl}" class="cta-button">Book My Demo &rarr;</a>
//       <div class="cta-hint">Opens Calendly &nbsp;&bull;&nbsp; No account needed</div>
//     </div>

//     <!-- NEXT STEPS -->
//     <div class="steps-section">
//       <div class="steps-title">What happens next?</div>

//       <div class="step-item">
//         <div class="step-num">1</div>
//         <div class="step-text">Click <strong>Book My Demo</strong> and select a date and time that works for you.</div>
//       </div>

//       <div class="step-item">
//         <div class="step-num">2</div>
//         <div class="step-text">Calendly will instantly send you a calendar invite with a meeting link.</div>
//       </div>

//       <div class="step-item">
//         <div class="step-num">3</div>
//         <div class="step-text">Our VetDesk team will meet with you online and walk you through everything.</div>
//       </div>

//       <div class="step-item">
//         <div class="step-num">4</div>
//         <div class="step-text">Need help before then? Just reply to this email — we're happy to assist.</div>
//       </div>
//     </div>

//     <!-- SIGN OFF -->
//     <div class="signoff">
//       We look forward to showing you what VetDesk can do for your practice.<br><br>
//       Kind regards,
//     </div>
//     <div class="signoff-name">The VetDesk Team</div>

//   </div>

//   <!-- ══ FOOTER ══ -->
//   <div class="email-footer">
//     <div class="footer-brand">VetDesk<span>.ai</span></div>
//     <div class="footer-sub">
//       Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification<br>
//       Questions? Reply to this email and we'll get back to you.
//     </div>
//   </div>

// </div>
// </div>
// </body>
// </html>
// `;

//     try {

//         const result = await this.sendEmailViaGmailAPI({
//             to: email,
//             subject,
//             html
//         });

//         await this.saveEmailLog({
//             toEmail: email,
//             fromEmail: await this.getSenderEmail(),
//             subject,
//             bodyHtml: html,
//             fullName,
//             hospitalName,
//             hospitalPhone: "",
//             bookingId,
//             status: result.messageId ? "sent" : "fallback"
//         });

//         logger.info(`Customer confirmation email sent to ${email}`);

//         return {
//             success: true,
//             result
//         };

//     } catch (error) {

//         logger.error("Customer confirmation email failed:", error);

//         await this.saveEmailLog({
//             toEmail: email,
//             fromEmail: await this.getSenderEmail(),
//             subject,
//             bodyHtml: html,
//             fullName,
//             hospitalName,
//             hospitalPhone: "",
//             bookingId,
//             status: "failed",
//             errorMessage: error.message
//         });

//         return {
//             success: false,
//             error: error.message
//         };
//     }
// }




 
//     static async saveEmailLog(data) {
//         try {
//             const {
//                 toEmail,
//                 fromEmail,
//                 subject,
//                 bodyHtml,
//                 fullName,
//                 hospitalName,
//                 hospitalPhone,
//                 bookingId,
//                 status = 'sent',
//                 errorMessage = null
//             } = data;

//             await executeQuery(
//                 `INSERT INTO email_logs (
//                     to_email, from_email, subject, body_html,
//                     caller_name, caller_number, reason_for_call,
//                     call_summary, status, error_message, created_at
//                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
//                 [
//                     toEmail,
//                     fromEmail,
//                     subject,
//                     bodyHtml,
//                     fullName || 'Unknown',
//                     hospitalPhone || 'N/A',
//                     'Demo Booking Request - Super Admin',
//                     `Demo booking request from ${hospitalName} (Booking #${bookingId})`,
//                     status,
//                     errorMessage
//                 ]
//             );

//             logger.info(`📧 Email log saved for ${toEmail} (Status: ${status})`);
//             return true;

//         } catch (error) {
//             logger.error('Error saving email log:', error);
//             return false;
//         }
//     }
// }

// module.exports = BookDemoEmailService;


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
  font-family:Arial,sans-serif;
  font-size:22px;
  font-weight:700;
  color:#ffffff;
  vertical-align:middle;
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
  color:rgba(255,255,255,.60);
  letter-spacing:.6px;
  text-transform:uppercase;
  display:block;
  margin-top:2px;
}
.header-badge{
  display:inline-block;
  background:#fff3ea;
  color:#f25c00;
  padding:9px 18px;
  border-radius:999px;
  font-size:12px;
  font-weight:700;
  letter-spacing:.6px;
  text-transform:uppercase;
  border:1px solid #ffd4bc;
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
  font-size:34px;
  font-weight:700;
  line-height:1.18;
  color:#14181f;
  margin-bottom:14px;
}
.subtitle{
  font-size:15px;
  line-height:1.8;
  color:#4b5563;
  margin-bottom:36px;
}
.summary{
  display:table;
  width:100%;
  border-radius:12px;
  overflow:hidden;
  margin-bottom:36px;
  border:1px solid #e7ebef;
}
.summary-row{display:table-row;}
.summary-item{
  display:table-cell;
  width:33.33%;
  padding:18px 20px;
  background:#ffffff;
  border-right:1px solid rgba(20,24,31,.08);
  vertical-align:top;
}
.summary-item:last-child{border-right:none;}
.summary-label{
  font-size:10.5px;
  color:#9ca3af;
  text-transform:uppercase;
  letter-spacing:.7px;
  font-weight:700;
  margin-bottom:7px;
}
.summary-value{
  font-size:15px;
  font-weight:700;
  color:#14181f;
}
.summary-value.orange{color:#ff7a1a;}
.section{margin-bottom:32px;}
.section-title{
  font-size:15px;
  font-weight:700;
  color:#14181f;
  margin-bottom:14px;
  padding-bottom:10px;
  border-bottom:1px solid rgba(20,24,31,.08);
}
.details{
  border:1px solid rgba(20,24,31,.08);
  border-radius:12px;
  overflow:hidden;
}
.det-row{
  display:flex;
  border-bottom:1px solid rgba(20,24,31,.08);
}
.det-row:last-child{border-bottom:none;}
.cell{
  width:50%;
  padding:16px 18px;
  border-right:1px solid rgba(20,24,31,.08);
}
.cell:last-child{border-right:none;}
.cell-full{width:100%;padding:16px 18px;}
.cell-label{
  font-size:10.5px;
  color:#9ca3af;
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
  padding:5px 13px;
  border-radius:999px;
  background:#fff3ea;
  color:#ff7a1a;
  font-weight:700;
  font-size:12px;
  border:1px solid #ffd4bc;
}
.notes-box{
  background:#fafbfc;
  padding:20px;
  border-radius:12px;
  border:1px solid rgba(20,24,31,.08);
  font-size:14px;
  line-height:1.8;
  color:#374151;
}
.cta{
  text-align:center;
  margin-top:36px;
  padding-top:32px;
  border-top:1px solid rgba(20,24,31,.07);
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
.email-footer{
  padding:28px 40px;
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
  .title{font-size:26px;}
  .summary{display:block;}
  .summary-row{display:block;}
  .summary-item{display:block;width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.08);}
  .summary-item:last-child{border-bottom:none;}
  .det-row{flex-direction:column;}
  .cell{width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.08);}
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
        <td valign="middle" align="right" style="padding:0;">
          <div class="header-badge">&#9679; New Demo Request</div>
        </td>
      </tr>
    </table>
  </div>
  <div class="email-body">
    <div class="eyebrow">Demo Request</div>
    <div class="title">A new demo<br>request has arrived.</div>
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
          <div class="summary-value">&#9679;&nbsp;New</div>
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


    static async sendCustomerConfirmation(data) {
        const {
            fullName,
            email,
            hospitalName,
            bookingId
        } = data;

        const subject = "Thanks for requesting a VetDesk demo";
        const calendlyUrl = env.CALENDLY_URL || 'https://calendly.com/anilkumarr0180/30min';

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Demo Request Confirmed</title>
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
  background:#fff3ea;
  color:#f25c00;
  padding:9px 18px;
  border-radius:999px;
  font-size:12px;
  font-weight:700;
  letter-spacing:.6px;
  text-transform:uppercase;
  border:1px solid #ffd4bc;
}
.hero{
  background:#14181f;
  padding:40px 40px 48px;
  text-align:center;
}
.hero-icon{
  width:72px;
  height:72px;
  background:#1a2030;
  border:2px solid rgba(255,122,26,.35);
  border-radius:50%;
  margin:0 auto 22px;
  display:table;
  text-align:center;
}
.hero-icon-inner{
  display:table-cell;
  vertical-align:middle;
  font-size:30px;
}
.hero-title{
  font-size:32px;
  font-weight:700;
  color:#ffffff;
  line-height:1.18;
  margin-bottom:12px;
}
.hero-title span{color:#ff7a1a;}
.hero-sub{
  font-size:15px;
  color:rgba(255,255,255,.60);
  line-height:1.7;
  max-width:420px;
  margin:0 auto;
}
.email-body{padding:44px 40px 36px;}
.section-label{
  font-size:10.5px;
  letter-spacing:1.6px;
  font-weight:700;
  color:#ff7a1a;
  text-transform:uppercase;
  margin-bottom:14px;
}
.booking-card{
  border:1px solid #e7ebef;
  border-radius:14px;
  overflow:hidden;
  margin-bottom:36px;
}
.booking-card-header{
  background:#f8fafc;
  padding:14px 20px;
  border-bottom:1px solid #e7ebef;
}
.booking-card-header-title{
  font-size:11px;
  font-weight:700;
  color:#9ca3af;
  text-transform:uppercase;
  letter-spacing:.7px;
}
.booking-row{
  display:flex;
  border-bottom:1px solid rgba(20,24,31,.07);
}
.booking-row:last-child{border-bottom:none;}
.booking-cell{
  width:50%;
  padding:16px 20px;
  border-right:1px solid rgba(20,24,31,.07);
}
.booking-cell:last-child{border-right:none;}
.booking-cell-full{width:100%;padding:16px 20px;}
.booking-label{
  font-size:10.5px;
  color:#9ca3af;
  text-transform:uppercase;
  letter-spacing:.6px;
  font-weight:700;
  margin-bottom:6px;
}
.booking-value{
  font-size:14px;
  font-weight:600;
  color:#14181f;
}
.booking-value.orange{color:#ff7a1a;font-size:15px;}
.status-pill{
  display:inline-block;
  padding:4px 12px;
  border-radius:999px;
  background:#fff3ea;
  color:#ff7a1a;
  font-weight:700;
  font-size:12px;
  border:1px solid #ffd4bc;
}
.cta-section{
  text-align:center;
  background:#f8fafc;
  border:1px solid #e7ebef;
  border-radius:14px;
  padding:36px 30px;
  margin-bottom:36px;
}
.cta-heading{
  font-size:20px;
  font-weight:700;
  color:#14181f;
  margin-bottom:10px;
}
.cta-sub{
  font-size:14px;
  color:#6b7280;
  line-height:1.7;
  margin-bottom:28px;
}
.cta-button{
  display:inline-block;
  background:#0c8ce0;
  color:#ffffff !important;
  text-decoration:none;
  padding:16px 40px;
  border-radius:10px;
  font-size:15px;
  font-weight:700;
}
.cta-hint{
  font-size:12px;
  color:#9ca3af;
  margin-top:16px;
}
.steps-section{margin-bottom:36px;}
.steps-title{
  font-size:15px;
  font-weight:700;
  color:#14181f;
  margin-bottom:16px;
  padding-bottom:10px;
  border-bottom:1px solid rgba(20,24,31,.08);
}
.step-item{
  display:flex;
  gap:16px;
  margin-bottom:16px;
  align-items:flex-start;
}
.step-item:last-child{margin-bottom:0;}
.step-num{
  width:28px;
  height:28px;
  border-radius:50%;
  background:#fff3ea;
  border:1px solid #ffd4bc;
  color:#f25c00;
  font-size:12px;
  font-weight:700;
  text-align:center;
  line-height:26px;
  flex-shrink:0;
  display:inline-block;
}
.step-text{
  font-size:14px;
  color:#374151;
  line-height:1.6;
  padding-top:4px;
}
.signoff{
  font-size:15px;
  line-height:1.8;
  color:#4b5563;
  margin-bottom:8px;
}
.signoff-name{
  font-size:15px;
  font-weight:700;
  color:#14181f;
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
  .email-header,.email-body,.email-footer{padding-left:22px;padding-right:22px;}
  .hero{padding:32px 22px 40px;}
  .hero-title{font-size:26px;}
  .booking-row{flex-direction:column;}
  .booking-cell{width:100%;border-right:none;border-bottom:1px solid rgba(20,24,31,.07);}
  .booking-cell:last-child{border-bottom:none;}
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
          <div class="header-badge">&#10003; Request Confirmed</div>
        </td>
      </tr>
    </table>
  </div>
  <div class="hero">
    <div class="hero-icon">
      <div class="hero-icon-inner">&#128076;</div>
    </div>
    <div class="hero-title">You're all set,<br><span>${fullName}!</span></div>
    <div class="hero-sub">
      Your VetDesk demo request has been received. Book a time that works for you and we'll take care of the rest.
    </div>
  </div>
  <div class="email-body">
    <div class="section-label">Your Request Details</div>
    <div class="booking-card">
      <div class="booking-card-header">
        <div class="booking-card-header-title">Booking Summary</div>
      </div>
      <div class="booking-row">
        <div class="booking-cell">
          <div class="booking-label">Request ID</div>
          <div class="booking-value orange">#${bookingId}</div>
        </div>
        <div class="booking-cell">
          <div class="booking-label">Status</div>
          <div class="booking-value">
            <span class="status-pill">&#9679; Confirmed</span>
          </div>
        </div>
      </div>
      <div class="booking-row">
        <div class="booking-cell-full">
          <div class="booking-label">Hospital</div>
          <div class="booking-value">${hospitalName}</div>
        </div>
      </div>
    </div>
    <div class="cta-section">
      <div class="cta-heading">Schedule Your Demo</div>
      <div class="cta-sub">
        Pick a date and time that suits you. The whole process<br>takes less than 2 minutes.
      </div>
      <a href="${calendlyUrl}" class="cta-button">Book My Demo &rarr;</a>
      <div class="cta-hint">Opens Calendly &nbsp;&bull;&nbsp; No account needed</div>
    </div>
    <div class="steps-section">
      <div class="steps-title">What happens next?</div>
      <div class="step-item">
        <div class="step-num">1</div>
        <div class="step-text">Click <strong>Book My Demo</strong> and select a date and time that works for you.</div>
      </div>
      <div class="step-item">
        <div class="step-num">2</div>
        <div class="step-text">Calendly will instantly send you a calendar invite with a meeting link.</div>
      </div>
      <div class="step-item">
        <div class="step-num">3</div>
        <div class="step-text">Our VetDesk team will meet with you online and walk you through everything.</div>
      </div>
      <div class="step-item">
        <div class="step-num">4</div>
        <div class="step-text">Need help before then? Just reply to this email — we're happy to assist.</div>
      </div>
    </div>
    <div class="signoff">
      We look forward to showing you what VetDesk can do for your practice.<br><br>
      Kind regards,
    </div>
    <div class="signoff-name">The VetDesk Team</div>
  </div>
  <div class="email-footer">
    <div class="footer-brand">VetDesk<span>.ai</span></div>
    <div class="footer-sub">
      Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification<br>
      Questions? Reply to this email and we'll get back to you.
    </div>
  </div>
</div>
</div>
</body>
</html>`;

        try {
            const result = await this.sendEmailViaGmailAPI({
                to: email,
                subject,
                html
            });

            await this.saveEmailLog({
                toEmail: email,
                fromEmail: await this.getSenderEmail(),
                subject,
                bodyHtml: html,
                fullName,
                hospitalName,
                hospitalPhone: "",
                bookingId,
                status: result.messageId ? "sent" : "fallback"
            });

            logger.info(`Customer confirmation email sent to ${email}`);
            return { success: true, result };

        } catch (error) {
            logger.error("Customer confirmation email failed:", error);

            await this.saveEmailLog({
                toEmail: email,
                fromEmail: await this.getSenderEmail(),
                subject,
                bodyHtml: html,
                fullName,
                hospitalName,
                hospitalPhone: "",
                bookingId,
                status: "failed",
                errorMessage: error.message
            });

            return { success: false, error: error.message };
        }
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