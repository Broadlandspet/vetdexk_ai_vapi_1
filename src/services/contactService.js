// src/services/contactService.js
'use strict';

const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('./emailService');

// ─── Save contact query to DB ────────────────────────────────────────────────

exports.saveContactQuery = async ({ name, email, phone, message }) => {
  try {
    const result = await executeQuery(
      `INSERT INTO contact_queries (name, email, phone, message, status)
       VALUES ($1, $2, $3, $4, 'new')
       RETURNING id, created_at`,
      [name, email, phone || null, message]
    );

    const row = result.rows[0];
    logger.info(`Contact query saved: ID ${row.id} from ${email}`);
    return { id: row.id, createdAt: row.created_at };

  } catch (error) {
    logger.error('Error saving contact query:', error.message);
    throw error;
  }
};

// ─── Send email notification to Super Admin ──────────────────────────────────

exports.sendContactQueryEmail = async ({ id, name, email, phone, message, createdAt }) => {
  try {
    const toEmail = await emailService.getRecipientEmail();
    const fromEmail = await emailService.getSenderEmail();

    const subject = `New Contact Query from ${name}`;
    const html = buildContactQueryEmail({ id, name, email, phone, message, createdAt });

    const result = await emailService.sendEmailViaGmailAPI({
      to: toEmail,
      subject,
      html
    });

    // Save to email_logs
    await emailService.saveEmailLog({
      toEmail,
      fromEmail,
      subject,
      bodyHtml: html,
      fullName: name,
      hospitalName: 'N/A',
      hospitalPhone: phone || 'N/A',
      bookingId: String(id),
      status: result.messageId ? 'sent' : 'fallback'
    });

    logger.info(`Contact query email sent to ${toEmail} for query #${id}`);
    return { success: true };

  } catch (error) {
    logger.error('Error sending contact query email:', error.message);
    return { success: false, error: error.message };
  }
};

// ─── Email HTML Builder ───────────────────────────────────────────────────────

function buildContactQueryEmail({ id, name, email, phone, message, createdAt }) {
  const LOGO_URL =
    'https://dodiovomtwngjvxvfmki.supabase.co/storage/v1/object/public/site_logo/logo2.png';

  const escapeHtml = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const escapeMultiline = (v) =>
    escapeHtml(v).replace(/\r?\n/g, '<br>');

  const safeName    = escapeHtml(name);
  const safeEmail   = escapeHtml(email);
  const safePhone   = escapeHtml(phone || 'Not provided');
  const safeMessage = escapeMultiline(message);
  const safeId      = escapeHtml(String(id));
  const submittedAt = escapeHtml(new Date(createdAt).toLocaleString());

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <title>New Contact Query - VetDesk.ai</title>
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
      white-space:normal; overflow-wrap:anywhere; word-break:break-word;
    }
    .cell-value a { color:#0c8ce0; text-decoration:none; }
    @media only screen and (max-width:640px) {
      .outer-padding { padding:18px 10px!important; }
      .header-padding { padding:20px!important; }
      .body-padding { padding:30px 20px!important; }
      .footer-padding { padding:22px 20px!important; }
      .title { font-size:23px!important; line-height:30px!important; }
      .details-cell {
        display:block!important; width:100%!important;
        border-right:0!important; border-bottom:1px solid #e7ebef!important;
      }
      .summary-item {
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
      .header-logo { width:100%!important; max-width:300px!important; }
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
                      <span style="display:inline-block;padding:8px 14px;border:1px solid #bfdbfe;
                        border-radius:6px;background:#eff6ff;color:#2563eb;
                        font-family:Arial,Helvetica,sans-serif;font-size:11.5px;font-weight:700;
                        line-height:15px;letter-spacing:0.6px;text-transform:uppercase;white-space:nowrap;">
                        New Query
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td class="body-padding" style="padding:44px 40px;background:#ffffff;">

                <div style="margin:0 0 12px;color:#2563eb;font-family:Arial,Helvetica,sans-serif;
                  font-size:11px;font-weight:700;line-height:15px;letter-spacing:1.6px;text-transform:uppercase;">
                  Contact Query
                </div>

                <h1 class="title" style="margin:0 0 14px;color:#14181f;font-family:Arial,Helvetica,sans-serif;
                  font-size:28px;font-weight:700;line-height:36px;">
                  A New Query Has Been Received
                </h1>

                <p style="margin:0 0 28px;color:#4b5563;font-family:Arial,Helvetica,sans-serif;
                  font-size:15px;line-height:27px;">
                  Someone has submitted a query via the VetDesk contact form.
                  Review the details below and follow up promptly.
                </p>

                <!-- SUMMARY STRIP -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="width:100%;margin:0 0 28px;border:1px solid #e7ebef;border-radius:10px;
                         border-collapse:separate;border-spacing:0;overflow:hidden;">
                  <tr>
                    <td class="summary-item" width="50%" valign="top"
                      style="width:50%;padding:16px 20px;background:#f8fafc;border-right:1px solid #e7ebef;">
                      <div class="cell-label">Query ID</div>
                      <div class="cell-value" style="font-weight:700;color:#2563eb;">#${safeId}</div>
                    </td>
                    <td class="summary-item" width="50%" valign="top"
                      style="width:50%;padding:16px 20px;background:#f8fafc;">
                      <div class="cell-label">Submitted</div>
                      <div class="cell-value" style="font-size:13px;font-weight:700;">${submittedAt}</div>
                    </td>
                  </tr>
                </table>

                <!-- CONTACT DETAILS -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="width:100%;margin:0 0 28px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <span style="display:inline-block;padding:0 0 10px;border-bottom:2px solid #2563eb;
                        color:#14181f;font-family:Arial,Helvetica,sans-serif;font-size:14px;
                        font-weight:700;line-height:19px;">
                        Contact Information
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="width:100%;border:1px solid #e7ebef;border-radius:10px;
                               border-collapse:separate;border-spacing:0;overflow:hidden;">
                        <tr>
                          <td class="details-cell" width="50%" valign="top"
                            style="width:50%;padding:16px 18px;border-right:1px solid #e7ebef;
                                   border-bottom:1px solid #e7ebef;">
                            <div class="cell-label">Name</div>
                            <div class="cell-value">${safeName}</div>
                          </td>
                          <td class="details-cell" width="50%" valign="top"
                            style="width:50%;padding:16px 18px;border-bottom:1px solid #e7ebef;">
                            <div class="cell-label">Email</div>
                            <div class="cell-value">
                              <a href="mailto:${safeEmail}">${safeEmail}</a>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td class="details-cell" colspan="2" width="100%" valign="top"
                            style="width:100%;padding:16px 18px;">
                            <div class="cell-label">Phone</div>
                            <div class="cell-value">${safePhone}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- MESSAGE -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="width:100%;margin:0 0 8px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <span style="display:inline-block;padding:0 0 10px;border-bottom:2px solid #2563eb;
                        color:#14181f;font-family:Arial,Helvetica,sans-serif;font-size:14px;
                        font-weight:700;line-height:19px;">
                        Message / Query
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 20px;border:1px solid #bfdbfe;border-left:4px solid #2563eb;
                      border-radius:10px;background:#eff6ff;color:#374151;
                      font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:24px;
                      white-space:normal;overflow-wrap:anywhere;word-break:break-word;">
                      ${safeMessage}
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td class="footer-padding" align="center"
                style="padding:26px 40px;border-top:1px solid #e7ebef;border-radius:0 0 14px 14px;
                       background:#f8fafc;text-align:center;">
                <div style="color:#14181f;font-family:Arial,Helvetica,sans-serif;font-size:14px;
                  font-weight:700;line-height:19px;">
                  VetDesk<span style="color:#ff7a1a;">.ai</span>
                </div>
                <div style="margin-top:6px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;
                  font-size:11.5px;line-height:21px;">
                  Veterinary Care Platform &nbsp;&bull;&nbsp; Automated Notification
                </div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e7ebef;
                  color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;line-height:17px;">
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
</html>`;
}