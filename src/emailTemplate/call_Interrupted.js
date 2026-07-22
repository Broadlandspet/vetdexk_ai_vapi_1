// // call_Interrupted.js
// function buildCallInterruptedEmail(data) {
//     const { patientName, petName, reason = "system error", location = "43150 Broadlands Center Plaza, Suite 184, Ashburn, VA 20148", phone = "571-707-8844" } = data;

//     if (!patientName) {
//         throw new Error("Missing required fields for call interrupted email");
//     }

//     const escapeHtml = (str) => {
//         if (!str) return '';
//         return str
//             .replace(/&/g, '&amp;')
//             .replace(/</g, '&lt;')
//             .replace(/>/g, '&gt;')
//             .replace(/"/g, '&quot;')
//             .replace(/'/g, '&#39;')
//             .replace(/\n/g, '<br>');
//     };

//     return `<!DOCTYPE html>
// <html>
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Call Interrupted - Broadlands Pet Hospital</title>
//     <style>
//         * { margin: 0; padding: 0; box-sizing: border-box; }
//         body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; line-height: 1.5; }
//         .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
//         .email-header { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 32px 24px; text-align: center; }
//         .hospital-icon { font-size: 48px; margin-bottom: 12px; }
//         .email-header h1 { color: white; font-size: 28px; margin: 0 0 8px; font-weight: 600; }
//         .email-header p { color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; }
//         .email-body { padding: 32px 28px; }
//         .greeting { font-size: 18px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; }
//         .message-box { background: #fef9e7; border-left: 4px solid #f39c12; padding: 20px; border-radius: 12px; margin-bottom: 28px; }
//         .footer { background: #f8f9fc; padding: 24px 28px; text-align: center; border-top: 1px solid #e9ecef; }
//         .footer-text { color: #7f8c8d; font-size: 12px; line-height: 1.5; }
//         .button { display: inline-block; background: #2ecc71; color: white; padding: 10px 20px; border-radius: 30px; text-decoration: none; font-weight: 500; margin-top: 16px; font-size: 14px; }
//         @media (max-width: 500px) { .detail-row { flex-direction: column; gap: 4px; } .detail-label { width: auto; } }
//     </style>
// </head>
// <body>
//     <div class="email-container">
//         <div class="email-header">
//             <div class="hospital-icon">⚠️</div>
//             <h1>Call Interrupted</h1>
//             <p>Broadlands Pet Hospital</p>
//         </div>
//         <div class="email-body">
//             <div class="greeting">Hello ${escapeHtml(patientName)},</div>
//             <div class="message-box">
//                 <p>We apologize, but your recent call was interrupted due to a ${escapeHtml(reason)}.</p>
//                 <p>Please try calling us again at <strong>${escapeHtml(phone)}</strong> or visit our website to complete your request.</p>
//                 ${petName ? `<p>We were assisting you with your pet, ${escapeHtml(petName)}.</p>` : ''}
//             </div>
//             <div style="text-align: center; margin-top: 24px;">
//                 <a href="tel:${escapeHtml(phone)}" class="button">Call us again</a>
//             </div>
//             <div style="text-align: center; margin-top: 10px;">
//                 <p><strong>📍 Location:</strong> ${escapeHtml(location)}</p>
//             </div>
//         </div>
//         <div class="footer">
//             <div class="footer-text"><strong>Broadlands Pet Hospital</strong><br>We're here to help.</div>
//         </div>
//     </div>
// </body>
// </html>`;
// }

// module.exports = { buildCallInterruptedEmail };







'use strict';

/**
 * Builds the Broadlands Pet Hospital interrupted-call email.
 * All patient and call information is supplied dynamically.
 *
 * @param {Object} data
 * @param {string} data.patientName
 * @param {string} [data.petName]
 * @param {string} [data.reason]
 * @param {string} [data.location]
 * @param {string} [data.phone]
 * @param {string} [data.websiteUrl]
 * @returns {string} Complete HTML email.
 */
function buildCallInterruptedEmail(data = {}) {
  const {
    patientName,
    petName = '',
    reason = 'system error',
    location =
      '43150 Broadlands Center Plaza, Suite 184, Ashburn, VA 20148',
    phone = '571-707-8844',
    websiteUrl = ''
  } = data || {};

  if (
    patientName === null ||
    patientName === undefined ||
    String(patientName).trim() === ''
  ) {
    throw new Error(
      'Missing required field for call interrupted email: patientName'
    );
  }

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const escapeMultilineHtml = (value) =>
    escapeHtml(value).replace(/\r?\n/g, '<br>');

  const safeTelephoneHref = (value) => {
    const cleanedNumber = String(value ?? '').replace(
      /[^\d+*#,;]/g,
      ''
    );

    return cleanedNumber
      ? `tel:${cleanedNumber}`
      : '';
  };

  const safeHttpUrl = (value) => {
    if (!value || !String(value).trim()) {
      return '';
    }

    try {
      const url = new URL(String(value).trim());

      return ['http:', 'https:'].includes(url.protocol)
        ? url.toString()
        : '';
    } catch (_error) {
      return '';
    }
  };

  const safePatientName =
    escapeMultilineHtml(patientName);

  const safePetName = String(petName ?? '').trim()
    ? escapeMultilineHtml(petName)
    : '';

  const safeReason =
    escapeMultilineHtml(reason || 'system error');

  const safeLocation =
    escapeMultilineHtml(location);

  const safePhone =
    escapeHtml(phone);

  const telephoneHref =
    safeTelephoneHref(phone);

  const validatedWebsiteUrl =
    safeHttpUrl(websiteUrl);

  const phoneHtml = telephoneHref
    ? `
      <a
        href="${escapeHtml(telephoneHref)}"
        style="
          color:#0c8ce0;
          text-decoration:none;
        "
      >
        ${safePhone}
      </a>
    `
    : safePhone;

  const petRow = safePetName
    ? `
      <tr>
        <td
          class="details-cell details-cell-full"
          colspan="2"
          width="100%"
          valign="top"
          style="
            width:100%;
            padding:16px 18px;
            border-bottom:1px solid #e7ebef;
          "
        >
          <div class="cell-label">
            Pet
          </div>

          <div class="cell-value">
            ${safePetName}
          </div>
        </td>
      </tr>
    `
    : '';

  const petMessage = safePetName
    ? `
      We were assisting you with
      <strong style="color:#14181f;">
        ${safePetName}
      </strong>
      when the call ended.
    `
    : '';

  const callButton = telephoneHref
    ? `
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
            bgcolor="#ff7a1a"
            style="
              border-radius:8px;
              background:#ff7a1a;
              text-align:center;
            "
          >
            <a
              class="action-button"
              href="${escapeHtml(telephoneHref)}"
              style="
                display:inline-block;
                padding:12px 24px;
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
              Call Us Again
            </a>
          </td>
        </tr>
      </table>
    `
    : '';

  const websiteButton = validatedWebsiteUrl
    ? `
      <table
        role="presentation"
        cellpadding="0"
        cellspacing="0"
        border="0"
        align="center"
        style="
          margin:12px auto 0;
          border-collapse:separate;
        "
      >
        <tr>
          <td
            align="center"
            style="
              border-radius:8px;
              text-align:center;
            "
          >
            <a
              class="action-button"
              href="${escapeHtml(validatedWebsiteUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display:inline-block;
                padding:12px 24px;
                border:1px solid #0c8ce0;
                border-radius:8px;
                background:#ffffff;
                color:#0c8ce0;
                font-family:Arial,Helvetica,sans-serif;
                font-size:14px;
                font-weight:700;
                line-height:18px;
                text-align:center;
                text-decoration:none;
              "
            >
              Continue Online
            </a>
          </td>
        </tr>
      </table>
    `
    : '';

  return `
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

  <title>
    Call Interrupted - Broadlands Pet Hospital
  </title>

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
        font-size: 24px !important;
        line-height: 31px !important;
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

      .action-button {
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
                        alt="Broadlands Pet Hospital"
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
                        Call Interrupted
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
                  Call follow-up
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
                  We’re Sorry the Call Was Interrupted
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
                  Hello
                  <strong style="color:#14181f;">
                    ${safePatientName}
                  </strong>,
                  we were unable to complete your recent call
                  with Broadlands Pet Hospital.
                  ${petMessage}
                </p>

                <!-- INTERRUPTION MESSAGE -->

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    margin:0 0 28px;
                    border:1px solid #ffd4bc;
                    border-radius:10px;
                    background:#fff8f2;
                    border-collapse:separate;
                    border-spacing:0;
                  "
                >
                  <tr>
                    <td
                      width="58"
                      align="center"
                      valign="middle"
                      style="
                        width:58px;
                        padding:20px 0 20px 20px;
                        text-align:center;
                        vertical-align:middle;
                      "
                    >
                      <table
                        role="presentation"
                        width="38"
                        height="38"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          width:38px;
                          height:38px;
                          border-radius:999px;
                          background:#ff7a1a;
                          border-collapse:separate;
                        "
                      >
                        <tr>
                          <td
                            align="center"
                            valign="middle"
                            style="
                              color:#ffffff;
                              font-family:Arial,Helvetica,sans-serif;
                              font-size:22px;
                              font-weight:700;
                              line-height:22px;
                              text-align:center;
                              vertical-align:middle;
                            "
                          >
                            !
                          </td>
                        </tr>
                      </table>
                    </td>

                    <td
                      valign="middle"
                      style="
                        padding:20px;
                        color:#374151;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:14px;
                        line-height:23px;
                        vertical-align:middle;
                      "
                    >
                      <strong
                        style="
                          display:block;
                          margin-bottom:3px;
                          color:#14181f;
                          font-size:15px;
                          line-height:21px;
                        "
                      >
                        Your call ended unexpectedly
                      </strong>

                      We apologize for the interruption.
                      Please call us again so we can continue
                      helping you.
                    </td>
                  </tr>
                </table>

                <!-- CALL INFORMATION -->

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
                        Call Information
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
                            class="details-cell details-cell-full"
                            colspan="2"
                            width="100%"
                            valign="top"
                            style="
                              width:100%;
                              padding:16px 18px;
                              border-bottom:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">
                              Interruption Reason
                            </div>

                            <div class="cell-value">
                              ${safeReason}
                            </div>
                          </td>
                        </tr>

                        ${petRow}

                        <tr>
                          <td
                            class="details-cell details-cell-full"
                            colspan="2"
                            width="100%"
                            valign="top"
                            style="
                              width:100%;
                              padding:16px 18px;
                              border-bottom:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">
                              Location
                            </div>

                            <div class="cell-value">
                              ${safeLocation}
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
                            <div class="cell-label">
                              Phone
                            </div>

                            <div class="cell-value">
                              ${phoneHtml}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- ACTIONS -->

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
                      align="center"
                      style="
                        padding:18px 20px;
                        border:1px solid #e7ebef;
                        border-radius:10px;
                        background:#f8fafc;
                        text-align:center;
                      "
                    >
                      <p
                        style="
                          margin:0 0 16px;
                          color:#374151;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:13.5px;
                          line-height:23px;
                        "
                      >
                        We’re ready to help you complete
                        your request.
                      </p>

                      ${callButton}
                      ${websiteButton}
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
                  Broadlands Pet
                  <span style="color:#ff7a1a;">
                    Hospital
                  </span>
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
                  ${safeLocation}
                  <br>

                  Phone: ${phoneHtml}
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
                  This automated email was sent because your
                  call ended before your request was completed.
                  Please do not reply.
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
}

module.exports = {
  buildCallInterruptedEmail
};