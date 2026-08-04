// src/services/approvalEmailService.js
'use strict';

const emailService = require('./emailService');
const logger       = require('../utils/logger');
const env          = require('../config/env');

/**
 * Send account approval email to the approved user
 * @param {{ name: string, email: string }} data
 */
exports.sendApprovalEmail = async ({ name, email }) => {
  try {
    if (!email || !name) {
      logger.error('sendApprovalEmail: missing name or email');
      return { success: false };
    }

    const subject  = 'Your VetDesk Account Has Been Approved!';
    const loginUrl = `${env.FEEDBACK_URL || 'https://vetdeskuiv2.vercel.app'}/login`;
    const html     = buildApprovalEmail({ name, email, loginUrl });

    const result = await emailService.sendEmailViaGmailAPI({
      to: email,          // ← sends ONLY to the approved user
      subject,
      html
    });

    // Log it
    const fromEmail = await emailService.getSenderEmail();
    await emailService.saveEmailLog({
      toEmail:       email,
      fromEmail,
      subject,
      bodyHtml:      html,
      fullName:      name,
      hospitalName:  'N/A',
      hospitalPhone: 'N/A',
      bookingId:     'approval',
      status:        result.messageId ? 'sent' : 'fallback'
    });

    logger.info(`✅ Approval email sent to ${email}`);
    return { success: true };

  } catch (error) {
    logger.error(`❌ sendApprovalEmail error for ${email}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildApprovalEmail({ name, email, loginUrl }) {
  const LOGO_URL =
    'https://dodiovomtwngjvxvfmki.supabase.co/storage/v1/object/public/site_logo/logo2.png';

  const escapeHtml = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const safeName     = escapeHtml(name);
  const safeEmail    = escapeHtml(email);
  const safeLoginUrl = escapeHtml(loginUrl);
  const sentAt       = escapeHtml(new Date().toLocaleString());

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <title>Account Approved - VetDesk.ai</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p, a, h1 { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    html, body { width:100%!important; margin:0!important; padding:0!important; }
    body { background-color:#f0f4f8; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { display:block; height:auto; border:0; outline:none; text-decoration:none; }
    a { text-decoration:none; }
    .cell-label {
      margin:0 0 6px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;
      font-size:10.5px; font-weight:700; line-height:15px;
      letter-spacing:0.6px; text-transform:uppercase;
    }
    .cell-value {
      margin:0; color:#14181f; font-family:Arial,Helvetica,sans-serif;
      font-size:14px; font-weight:500; line-height:21px;
      overflow-wrap:anywhere; word-break:break-word;
    }
    @media only screen and (max-width:640px) {
      .outer-padding  { padding:18px 10px!important; }
      .header-padding { padding:20px!important; }
      .body-padding   { padding:30px 20px!important; }
      .footer-padding { padding:22px 20px!important; }
      .title          { font-size:23px!important; line-height:30px!important; }
      .summary-item   {
        display:block!important; width:100%!important;
        border-right:0!important; border-bottom:1px solid #e7ebef!important;
      }
      .summary-item:last-child { border-bottom:0!important; }
    }
    @media only screen and (max-width:420px) {
      .header-logo-cell, .header-badge-cell {
        display:block!important; width:100%!important; text-align:left!important;
      }
      .header-badge-cell { padding-top:14px!important; }
      .header-logo       { width:100%!important; max-width:300px!important; }
      .cta-button        { display:block!important; }
    }
  </style>
</head>
<body style="width:100%;margin:0;padding:0;background:#f0f4f8;">
  <center style="width:100%;background:#f0f4f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="width:100%;background:#f0f4f8;border-collapse:collapse;">
      <tr>
        <td class="outer-padding" align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            style="width:100%;max-width:640px;border:1px solid #e7ebef;border-radius:14px;
                   background:#ffffff;border-collapse:separate;border-spacing:0;overflow:hidden;">

            <!-- HEADER -->
            <tr>
              <td class="header-padding"
                style="padding:24px 40px;border-bottom:1px solid #e7ebef;
                       border-radius:14px 14px 0 0;background:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td class="header-logo-cell" width="70%" valign="middle"
                      style="width:70%;vertical-align:middle;">
                      <img class="header-logo" src="${LOGO_URL}" alt="VetDesk.ai" width="360"
                        style="display:block;width:100%;max-width:360px;height:auto;border:0;">
                    </td>
                    <td class="header-badge-cell" width="30%" align="right" valign="middle"
                      style="width:30%;text-align:right;vertical-align:middle;">
                      <span style="display:inline-block;padding:8px 14px;
                        border:1px solid #bbf7d0;border-radius:6px;background:#f0fdf4;
                        color:#16a34a;font-family:Arial,Helvetica,sans-serif;
                        font-size:11.5px;font-weight:700;line-height:15px;
                        letter-spacing:0.6px;text-transform:uppercase;white-space:nowrap;">
                        Account Approved
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td class="body-padding" style="padding:44px 40px;background:#ffffff;">

                <!-- Eyebrow -->
                <div style="margin:0 0 12px;color:#16a34a;font-family:Arial,Helvetica,sans-serif;
                  font-size:11px;font-weight:700;line-height:15px;
                  letter-spacing:1.6px;text-transform:uppercase;">
                  Welcome to VetDesk
                </div>

                <!-- Heading -->
                <h1 class="title" style="margin:0 0 14px;color:#14181f;
                  font-family:Arial,Helvetica,sans-serif;font-size:28px;
                  font-weight:700;line-height:36px;">
                  Your Account is Approved, ${safeName}!
                </h1>

                <!-- Lead -->
                <p style="margin:0 0 28px;color:#4b5563;font-family:Arial,Helvetica,sans-serif;
                  font-size:15px;line-height:27px;">
                  Great news — your VetDesk account has been reviewed and approved
                  by our team. You can now log in and start using the platform.
                </p>

                <!-- Account info strip -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="width:100%;margin:0 0 28px;border:1px solid #e7ebef;border-radius:10px;
                         border-collapse:separate;border-spacing:0;overflow:hidden;">
                  <tr>
                    <td class="summary-item" width="50%" valign="top"
                      style="width:50%;padding:16px 20px;background:#f8fafc;border-right:1px solid #e7ebef;">
                      <div class="cell-label">Account Name</div>
                      <div class="cell-value" style="font-weight:700;">${safeName}</div>
                    </td>
                    <td class="summary-item" width="50%" valign="top"
                      style="width:50%;padding:16px 20px;background:#f8fafc;">
                      <div class="cell-label">Email</div>
                      <div class="cell-value">${safeEmail}</div>
                    </td>
                  </tr>
                </table>

                <!-- What you can do -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="width:100%;margin:0 0 28px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <span style="display:inline-block;padding:0 0 10px;
                        border-bottom:2px solid #16a34a;color:#14181f;
                        font-family:Arial,Helvetica,sans-serif;font-size:14px;
                        font-weight:700;line-height:19px;">
                        What You Can Do Now
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="width:100%;border:1px solid #e7ebef;border-radius:10px;
                               border-collapse:separate;border-spacing:0;overflow:hidden;">
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e7ebef;
                            color:#374151;font-family:Arial,Helvetica,sans-serif;
                            font-size:14px;line-height:23px;">
                            ✅ &nbsp;<strong style="color:#14181f;">Log in</strong> using your registered email and password.
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e7ebef;
                            color:#374151;font-family:Arial,Helvetica,sans-serif;
                            font-size:14px;line-height:23px;">
                            📅 &nbsp;<strong style="color:#14181f;">Manage appointments</strong> and patient records from your dashboard.
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;color:#374151;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:14px;line-height:23px;">
                            🤖 &nbsp;<strong style="color:#14181f;">Use the AI assistant</strong> to handle calls and automate front-desk tasks.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="width:100%;margin-top:28px;padding-top:28px;
                         border-top:1px solid #e7ebef;border-collapse:collapse;">
                  <tr>
                    <td align="center" style="text-align:center;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                        align="center" style="margin:0 auto;border-collapse:separate;">
                        <tr>
                          <td align="center" bgcolor="#16a34a"
                            style="border-radius:8px;background:#16a34a;text-align:center;">
                            <a class="cta-button" href="${safeLoginUrl}"
                              style="display:inline-block;padding:14px 40px;
                                border:1px solid #16a34a;border-radius:8px;
                                background:#16a34a;color:#ffffff;
                                font-family:Arial,Helvetica,sans-serif;
                                font-size:15px;font-weight:700;line-height:19px;
                                text-align:center;text-decoration:none;">
                              Log In to VetDesk &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:14px 0 0;color:#94a3b8;
                        font-family:Arial,Helvetica,sans-serif;font-size:12px;">
                        Or copy this link: 
                        <a href="${safeLoginUrl}" style="color:#16a34a;">${safeLoginUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td class="footer-padding" align="center"
                style="padding:26px 40px;border-top:1px solid #e7ebef;
                       border-radius:0 0 14px 14px;background:#f8fafc;text-align:center;">
                <div style="color:#14181f;font-family:Arial,Helvetica,sans-serif;
                  font-size:14px;font-weight:700;line-height:19px;">
                  VetDesk<span style="color:#ff7a1a;">.ai</span>
                </div>
                <div style="margin-top:6px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;
                  font-size:11.5px;line-height:21px;">
                  Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification
                </div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e7ebef;
                  color:#94a3b8;font-family:Arial,Helvetica,sans-serif;
                  font-size:10.5px;line-height:17px;">
                  Please do not reply to this email &nbsp;&bull;&nbsp; Sent at ${sentAt}
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}