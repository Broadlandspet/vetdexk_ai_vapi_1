
// // appointment_Confirmation.js
// // Email template for sending appointment confirmation to the patient — no static defaults

// /**
//  * Builds an HTML email to confirm an appointment booking for a patient.
//  * @param {Object} data - Dynamic appointment data
//  * @param {string} data.patientName - Name of the patient (owner) — required
//  * @param {string} data.petName - Name of the pet — required
//  * @param {string} data.appointmentDate - Date of appointment (e.g., "Monday, June 15, 2026") — required
//  * @param {string} data.appointmentTime - Time of appointment (e.g., "10:30 AM") — required
//  * @param {string} data.appointmentType - Type of appointment — required
//  * @param {string} [data.additionalNotes] - Optional notes (only shown if provided)
//  * @param {string} [data.vetName] - Optional vet name (only shown if provided)
//  * @param {string} [data.location] - Hospital address (defaults to standard address but you can override)
//  * @param {string} [data.phone] - Contact phone (defaults to standard phone but you can override)
//  * @returns {string} HTML email content
//  */
// function buildAppointmentConfirmationEmail(data) {
//     // No fallback person names or dummy values except for clinic address/phone (those are business constants)
//     // If you want to remove even those, pass location and phone explicitly.
//     const {
//         patientName,
//         petName,
//         appointmentDate,
//         appointmentTime,
//         appointmentType,
//         additionalNotes = "",
//         vetName,
//         location = "43150 Broadlands Center Plaza, Suite 184, Ashburn, VA 20148",
//         phone = "571-707-8844"
//     } = data;

//     // If required fields are missing, throw an error (or handle gracefully)
//     if (!patientName || !petName || !appointmentDate || !appointmentTime || !appointmentType) {
//         throw new Error("Missing required fields for appointment confirmation email");
//     }

//     const fullDateTime = `${appointmentDate} at ${appointmentTime}`;

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

//     const safePatient = escapeHtml(patientName);
//     const safePet = escapeHtml(petName);
//     const safeDateTime = escapeHtml(fullDateTime);
//     const safeType = escapeHtml(appointmentType);
//     const safeNotes = additionalNotes ? escapeHtml(additionalNotes) : null;
//     const safeVet = vetName ? escapeHtml(vetName) : null;
//     const safeLocation = escapeHtml(location);
//     const safePhone = escapeHtml(phone);

//     // Optional vet row only if vetName provided
//     const vetRow = safeVet ? `
//         <div class="detail-row">
//             <div class="detail-label">👨‍⚕️ Veterinarian</div>
//             <div class="detail-value">${safeVet}</div>
//         </div>
//     ` : '';

//     return `<!DOCTYPE html>
// <html>
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Appointment Confirmation - Broadlands Pet Hospital</title>
//     <style>
//         * { margin: 0; padding: 0; box-sizing: border-box; }
//         body {
//             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
//             background: #f0f4f8;
//             margin: 0;
//             padding: 20px;
//             line-height: 1.5;
//         }
//         .email-container {
//             max-width: 600px;
//             margin: 0 auto;
//             background: #ffffff;
//             border-radius: 20px;
//             overflow: hidden;
//             box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
//         }
//         .email-header {
//             background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
//             padding: 32px 24px;
//             text-align: center;
//         }
//         .hospital-icon {
//             font-size: 48px;
//             margin-bottom: 12px;
//         }
//         .email-header h1 {
//             color: white;
//             font-size: 28px;
//             margin: 0 0 8px;
//             font-weight: 600;
//         }
//         .email-header p {
//             color: rgba(255,255,255,0.9);
//             font-size: 14px;
//             margin: 0;
//         }
//         .email-body {
//             padding: 32px 28px;
//         }
//         .greeting {
//             font-size: 18px;
//             font-weight: 600;
//             color: #2c3e50;
//             margin-bottom: 20px;
//         }
//         .confirmation-box {
//             background: #f0fff4;
//             border-left: 4px solid #2ecc71;
//             padding: 20px;
//             border-radius: 12px;
//             margin-bottom: 28px;
//         }
//         .confirmation-text {
//             font-size: 16px;
//             color: #2c3e50;
//             margin-bottom: 16px;
//         }
//         .appointment-card {
//             background: #f8f9fc;
//             border-radius: 16px;
//             padding: 20px;
//             margin-bottom: 28px;
//             border: 1px solid #e9ecef;
//         }
//         .detail-row {
//             display: flex;
//             padding: 10px 0;
//             border-bottom: 1px solid #e9ecef;
//         }
//         .detail-row:last-child {
//             border-bottom: none;
//         }
//         .detail-label {
//             width: 110px;
//             font-weight: 600;
//             color: #555;
//             font-size: 14px;
//         }
//         .detail-value {
//             flex: 1;
//             color: #2c3e50;
//             font-size: 14px;
//             font-weight: 500;
//         }
//         .notes-box {
//             background: #fff9e6;
//             border-radius: 12px;
//             padding: 16px;
//             margin: 20px 0;
//             border-left: 3px solid #f39c12;
//             font-size: 14px;
//             color: #7f8c8d;
//         }
//         .footer {
//             background: #f8f9fc;
//             padding: 24px 28px;
//             text-align: center;
//             border-top: 1px solid #e9ecef;
//         }
//         .footer-text {
//             color: #7f8c8d;
//             font-size: 12px;
//             line-height: 1.5;
//         }
//         .footer a {
//             color: #2ecc71;
//             text-decoration: none;
//         }
//         .button {
//             display: inline-block;
//             background: #2ecc71;
//             color: white;
//             padding: 10px 20px;
//             border-radius: 30px;
//             text-decoration: none;
//             font-weight: 500;
//             margin-top: 16px;
//             font-size: 14px;
//         }
//         @media (max-width: 500px) {
//             .email-body { padding: 20px; }
//             .detail-row { flex-direction: column; gap: 4px; }
//             .detail-label { width: auto; }
//         }
//     </style>
// </head>
// <body>
//     <div class="email-container">
//         <div class="email-header">
//             <div class="hospital-icon">🐾❤️</div>
//             <h1>Appointment Confirmed!</h1>
//             <p>Broadlands Pet Hospital</p>
//         </div>

//         <div class="email-body">
//             <div class="greeting">
//                 Hello ${safePatient},
//             </div>

//             <div class="confirmation-box">
//                 <div class="confirmation-text">
//                     ✅ Great news! Your appointment has been successfully booked for 
//                     <strong>${safePet}</strong>.
//                 </div>
//                 <div class="confirmation-text">
//                     We look forward to seeing you and your furry companion.
//                 </div>
//             </div>

//             <div class="appointment-card">
//                 <div class="detail-row">
//                     <div class="detail-label">📅 Date & Time</div>
//                     <div class="detail-value">${safeDateTime}</div>
//                 </div>
//                 <div class="detail-row">
//                     <div class="detail-label">📋 Appointment Type</div>
//                     <div class="detail-value">${safeType}</div>
//                 </div>
//                 ${vetRow}
//                 <div class="detail-row">
//                     <div class="detail-label">📍 Location</div>
//                     <div class="detail-value">${safeLocation}</div>
//                 </div>
//                 <div class="detail-row">
//                     <div class="detail-label">📞 Phone</div>
//                     <div class="detail-value">${safePhone}</div>
//                 </div>
//             </div>

//             ${safeNotes ? `<div class="notes-box">📌 Note: ${safeNotes}</div>` : ''}

//             <div style="text-align: center; margin-top: 24px;">
//                 <a href="tel:${safePhone}" class="button">Call us</a>
//             </div>
//         </div>

//         <div class="footer">
//             <div class="footer-text">
//                 <strong>Broadlands Pet Hospital</strong><br>
//                 Compassionate care for your pets.<br>
//                 If you need to reschedule, please call us at least 24 hours in advance.
//             </div>
//             <div class="footer-text" style="margin-top: 12px; font-size: 11px;">
//                 This is an automated confirmation. Please do not reply to this email.
//             </div>
//         </div>
//     </div>
// </body>
// </html>`;
// }

// module.exports = { buildAppointmentConfirmationEmail };





'use strict';

/**
 * Builds the Broadlands Pet Hospital appointment-confirmation email.
 * All patient and appointment information is supplied dynamically.
 *
 * @param {Object} data
 * @param {string} data.patientName
 * @param {string} data.petName
 * @param {string} data.appointmentDate
 * @param {string} data.appointmentTime
 * @param {string} data.appointmentType
 * @param {string} [data.additionalNotes]
 * @param {string} [data.vetName]
 * @param {string} [data.location]
 * @param {string} [data.phone]
 * @returns {string} Complete HTML email.
 */
function buildAppointmentConfirmationEmail(data = {}) {
  const {
    patientName,
    petName,
    appointmentDate,
    appointmentTime,
    appointmentType,
    additionalNotes = '',
    vetName = '',
    location =
      '43150 Broadlands Center Plaza, Suite 184, Ashburn, VA 20148',
    phone = '571-707-8844'
  } = data || {};

  const requiredFields = {
    patientName,
    petName,
    appointmentDate,
    appointmentTime,
    appointmentType
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => (
      value === null ||
      value === undefined ||
      String(value).trim() === ''
    ))
    .map(([fieldName]) => fieldName);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields for appointment confirmation email: ${missingFields.join(', ')}`
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

  const safePatientName =
    escapeMultilineHtml(patientName);

  const safePetName =
    escapeMultilineHtml(petName);

  const safeAppointmentDate =
    escapeMultilineHtml(appointmentDate);

  const safeAppointmentTime =
    escapeMultilineHtml(appointmentTime);

  const safeAppointmentType =
    escapeMultilineHtml(appointmentType);

  const safeVetName = String(vetName ?? '').trim()
    ? escapeMultilineHtml(vetName)
    : '';

  const safeAdditionalNotes =
    String(additionalNotes ?? '').trim()
      ? escapeMultilineHtml(additionalNotes)
      : '';

  const safeLocation =
    escapeMultilineHtml(location);

  const safePhone =
    escapeHtml(phone);

  const telephoneHref =
    safeTelephoneHref(phone);

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

  const veterinarianRow = safeVetName
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
            Veterinarian
          </div>

          <div class="cell-value">
            ${safeVetName}
          </div>
        </td>
      </tr>
    `
    : '';

  const notesSection = safeAdditionalNotes
    ? `
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
            ${safeAdditionalNotes}
          </td>
        </tr>
      </table>
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
              class="call-button"
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
              Call the Hospital
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
    Appointment Confirmation - Broadlands Pet Hospital
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

      .call-button {
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
                        Confirmed
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
                  Appointment confirmation
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
                  Your Appointment Is Confirmed
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
                  your appointment for
                  <strong style="color:#14181f;">
                    ${safePetName}
                  </strong>
                  has been successfully booked.
                </p>

                <!-- CONFIRMATION MESSAGE -->

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
                              font-size:20px;
                              font-weight:700;
                              line-height:20px;
                              text-align:center;
                              vertical-align:middle;
                            "
                          >
                            &#10003;
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
                        Booking successful
                      </strong>

                      We look forward to seeing you and
                      ${safePetName} at Broadlands Pet Hospital.
                    </td>
                  </tr>
                </table>

                <!-- APPOINTMENT DETAILS -->

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
                    <td
                      valign="top"
                      style="padding:0 0 14px;"
                    >
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
                        Appointment Details
                      </span>
                    </td>

                    <td
                      align="right"
                      valign="top"
                      style="
                        padding:0 0 14px;
                        text-align:right;
                      "
                    >
                      <span
                        style="
                          display:inline-block;
                          padding:7px 14px;
                          border:1px solid #ffc39f;
                          border-radius:999px;
                          background:#fff3ea;
                          color:#ff7a1a;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:12px;
                          font-weight:700;
                          line-height:15px;
                          white-space:nowrap;
                        "
                      >
                        Confirmed
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td colspan="2">
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
                            <div class="cell-label">
                              Pet
                            </div>

                            <div class="cell-value">
                              ${safePetName}
                            </div>
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
                            <div class="cell-label">
                              Appointment Type
                            </div>

                            <div class="cell-value">
                              ${safeAppointmentType}
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
                            <div class="cell-label">
                              Appointment Date
                            </div>

                            <div class="cell-value">
                              ${safeAppointmentDate}
                            </div>
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
                            <div class="cell-label">
                              Appointment Time
                            </div>

                            <div class="cell-value">
                              ${safeAppointmentTime}
                            </div>
                          </td>
                        </tr>

                        ${veterinarianRow}

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

                ${notesSection}

                <!-- CONTACT ACTION -->

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
                        padding:0;
                        text-align:center;
                      "
                    >
                      <p
                        style="
                          margin:0 0 16px;
                          color:#4b5563;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:13px;
                          line-height:22px;
                        "
                      >
                        Need to make a change? Please call us
                        at least 24 hours before your appointment.
                      </p>

                      ${callButton}
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
                  This automated email confirms your
                  appointment. Please do not reply.
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
  buildAppointmentConfirmationEmail
};