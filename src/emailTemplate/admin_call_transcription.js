'use strict';

/**
 * Builds the Broadlands Pet Hospital admin call-summary email.
 * Uses email-safe presentation tables for reliable alignment.
 *
 * @param {Object} data
 * @param {string} [data.callerName]
 * @param {string} [data.callerNumber]
 * @param {string|null} [data.registeredNumber]
 * @param {string} [data.reasonForCall]
 * @param {Date|string|number} [data.callDate]
 * @param {number} [data.callDuration]
 * @param {string} [data.callSummary]
 * @param {string|Array<Object>|Object} [data.callTranscription]
 * @param {string} [data.callId]
 * @param {boolean|string|number} [data.appointmentBooked]
 * @param {Object|null} [data.appointmentDetails]
 * @param {string} [data.timeZone='America/New_York']
 * @returns {string} Complete HTML email.
 */
function buildAdminCallTranscriptionEmail(data = {}) {
  const {
    callerName = 'Unknown',
    callerNumber = 'Unknown',
    registeredNumber = null,
    reasonForCall = 'Query Purpose',
    callDate = new Date(),
    callDuration = 0,
    callSummary = 'No summary available.',
    callTranscription = '',
    callId = 'N/A',
    appointmentBooked = false,
    appointmentDetails = null,
    timeZone = 'America/New_York'
  } = data || {};

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const escapeMultilineHtml = (value) =>
    escapeHtml(value).replace(/\r?\n/g, '<br>');

  const formatDate = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 'Not available';
    }

    const parsedDate =
      value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Not available';
    }

    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    try {
      return parsedDate.toLocaleString('en-US', {
        ...options,
        timeZone
      });
    } catch (_error) {
      return parsedDate.toLocaleString('en-US', options);
    }
  };

  const formatDuration = (value) => {
    const numericValue = Number(value);

    const totalSeconds = Number.isFinite(numericValue)
      ? Math.max(0, Math.floor(numericValue))
      : 0;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return minutes > 0
      ? `${minutes}m ${seconds}s`
      : `${seconds}s`;
  };

  const normalizeBoolean = (value) => {
    if (value === true || value === 1) {
      return true;
    }

    if (typeof value !== 'string') {
      return false;
    }

    return [
      'true',
      '1',
      'yes',
      'booked',
      'confirmed'
    ].includes(value.trim().toLowerCase());
  };

  const normalizeRole = (role) => {
    const normalizedRole = String(role ?? '')
      .trim()
      .toLowerCase();

    if (
      [
        'ai',
        'assistant',
        'ai assistant',
        'bot',
        'agent'
      ].includes(normalizedRole)
    ) {
      return 'assistant';
    }

    if (
      [
        'user',
        'caller',
        'customer',
        'human'
      ].includes(normalizedRole)
    ) {
      return 'user';
    }

    return 'system';
  };

  const extractMessageText = (entry) => {
    const content =
      entry?.message ??
      entry?.content ??
      entry?.text ??
      entry?.transcript ??
      '';

    if (!Array.isArray(content)) {
      return String(content).trim();
    }

    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (!part || typeof part !== 'object') {
          return '';
        }

        if (typeof part.text === 'string') {
          return part.text;
        }

        if (typeof part.text?.value === 'string') {
          return part.text.value;
        }

        if (typeof part.content === 'string') {
          return part.content;
        }

        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  };

  const normalizeTranscript = (transcript) => {
    if (!transcript) {
      return [];
    }

    if (
      !Array.isArray(transcript) &&
      typeof transcript === 'object'
    ) {
      if (Array.isArray(transcript.messages)) {
        return normalizeTranscript(transcript.messages);
      }

      transcript = [transcript];
    }

    if (Array.isArray(transcript)) {
      return transcript
        .map((entry) => {
          if (typeof entry === 'string') {
            return {
              role: 'system',
              message: entry.trim()
            };
          }

          if (!entry || typeof entry !== 'object') {
            return null;
          }

          return {
            role: normalizeRole(
              entry.role ??
              entry.speaker ??
              entry.type
            ),
            message: extractMessageText(entry)
          };
        })
        .filter((entry) => entry && entry.message);
    }

    const messages = [];

    const rolePattern =
      /^(AI\s*Assistant|Assistant|AI|Bot|Agent|User|Caller|Customer|Human|System)\s*:\s*(.*)$/i;

    const transcriptText = String(transcript)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    for (const rawLine of transcriptText.split('\n')) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      const match = line.match(rolePattern);

      if (match) {
        messages.push({
          role: normalizeRole(match[1]),
          message: match[2].trim()
        });

        continue;
      }

      if (messages.length > 0) {
        messages[messages.length - 1].message +=
          `\n${line}`;
      } else {
        messages.push({
          role: 'system',
          message: line
        });
      }
    }

    return messages.filter((entry) => entry.message);
  };

  const icons = {
    assistant: `
      <svg
        class="role-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="13"
        height="13"
        aria-hidden="true"
        style="
          display:inline-block;
          width:13px;
          height:13px;
          margin-right:5px;
          vertical-align:-2px;
          fill:none;
          stroke:currentColor;
          stroke-width:2;
          stroke-linecap:round;
          stroke-linejoin:round;
        "
      >
        <path d="M12 8V4H8"></path>

        <rect
          width="16"
          height="12"
          x="4"
          y="8"
          rx="2"
        ></rect>

        <path d="M2 14h2"></path>
        <path d="M20 14h2"></path>
        <path d="M9 13v2"></path>
        <path d="M15 13v2"></path>
      </svg>
    `,

    user: `
      <svg
        class="role-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="13"
        height="13"
        aria-hidden="true"
        style="
          display:inline-block;
          width:13px;
          height:13px;
          margin-right:5px;
          vertical-align:-2px;
          fill:none;
          stroke:currentColor;
          stroke-width:2;
          stroke-linecap:round;
          stroke-linejoin:round;
        "
      >
        <path
          d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
        ></path>

        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    `,

    system: `
      <svg
        class="role-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="13"
        height="13"
        aria-hidden="true"
        style="
          display:inline-block;
          width:13px;
          height:13px;
          margin-right:5px;
          vertical-align:-2px;
          fill:none;
          stroke:currentColor;
          stroke-width:2;
          stroke-linecap:round;
          stroke-linejoin:round;
        "
      >
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 8v4"></path>
        <path d="M12 16h.01"></path>
      </svg>
    `
  };

  const formatTranscript = (transcript) => {
    const messages = normalizeTranscript(transcript);

    if (messages.length === 0) {
      return `
        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
        >
          <tr>
            <td
              align="center"
              style="
                padding:16px;
                border:1px dashed #d8dee6;
                border-radius:8px;
                background:#f8fafc;
                color:#64748b;
                font-family:Arial,Helvetica,sans-serif;
                font-size:13px;
                line-height:21px;
                text-align:center;
              "
            >
              No transcript available.
            </td>
          </tr>
        </table>
      `;
    }

    return messages
      .map(({ role, message }, index) => {
        const messageRole = normalizeRole(role);
        const isUser = messageRole === 'user';

        const alignment = isUser ? 'right' : 'left';

        const roleLabel =
          messageRole === 'assistant'
            ? 'Assistant'
            : isUser
              ? 'User'
              : 'System';

        const roleColor = isUser
          ? '#ff7a1a'
          : messageRole === 'assistant'
            ? '#0c1a2e'
            : '#64748b';

        const bubbleBackground = isUser
          ? '#ff7a1a'
          : '#f8fafc';

        const bubbleBorder = isUser
          ? '#ff7a1a'
          : '#e7ebef';

        const bubbleColor = isUser
          ? '#ffffff'
          : '#14181f';

        const bubbleRadius = isUser
          ? '12px 4px 12px 12px'
          : '4px 12px 12px 12px';

        const bottomPadding =
          index === messages.length - 1
            ? '0'
            : '15px';

        return `
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
                align="${alignment}"
                style="
                  padding:0 0 ${bottomPadding};
                  text-align:${alignment};
                "
              >
                <table
                  role="presentation"
                  class="message-table"
                  align="${alignment}"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    display:inline-table;
                    width:auto;
                    max-width:82%;
                    border-collapse:separate;
                    border-spacing:0;
                    text-align:left;
                  "
                >
                  <tr>
                    <td
                      align="${alignment}"
                      style="
                        padding:0 0 6px;
                        color:${roleColor};
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:10px;
                        font-weight:700;
                        line-height:14px;
                        letter-spacing:0.55px;
                        text-align:${alignment};
                        text-transform:uppercase;
                        white-space:nowrap;
                      "
                    >
                      ${icons[messageRole]}${roleLabel}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:11px 15px;
                        border:1px solid ${bubbleBorder};
                        border-radius:${bubbleRadius};
                        background:${bubbleBackground};
                        color:${bubbleColor};
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:13.5px;
                        font-weight:500;
                        line-height:21px;
                        text-align:left;
                        white-space:normal;
                        overflow-wrap:anywhere;
                        word-break:break-word;
                      "
                    >
                      ${escapeMultilineHtml(message)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
      })
      .join('');
  };

  const safeTelephoneHref = (value) => {
    const cleanedNumber = String(value ?? '').replace(
      /[^\d+*#,;]/g,
      ''
    );

    return cleanedNumber
      ? `tel:${cleanedNumber}`
      : '';
  };

  const renderPhone = (
    value,
    fallback = 'Not provided'
  ) => {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ''
    ) {
      return escapeHtml(fallback);
    }

    const displayNumber = escapeHtml(value);
    const telephoneHref = safeTelephoneHref(value);

    return telephoneHref
      ? `
        <a
          href="${escapeHtml(telephoneHref)}"
          style="
            color:#0c8ce0;
            text-decoration:none;
          "
        >
          ${displayNumber}
        </a>
      `
      : displayNumber;
  };

  const isAppointmentBooked =
    normalizeBoolean(appointmentBooked);

  const renderAppointmentDetails = () => {
    if (
      !isAppointmentBooked ||
      !appointmentDetails
    ) {
      return '';
    }

    const {
      petName = 'Unknown',
      date = 'Not provided',
      time = 'Not provided',
      appointmentType = 'Consult',
      doctorName = ''
    } = appointmentDetails;

    return `
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
                    ${escapeMultilineHtml(petName)}
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
                    ${escapeMultilineHtml(
                      appointmentType
                    )}
                  </div>
                </td>
              </tr>

              <tr
                class="${
                  doctorName ? '' : 'last-details-row'
                }"
              >
                <td
                  class="details-cell"
                  width="50%"
                  valign="top"
                  style="
                    width:50%;
                    padding:16px 18px;
                    border-right:1px solid #e7ebef;
                    ${
                      doctorName
                        ? 'border-bottom:1px solid #e7ebef;'
                        : ''
                    }
                  "
                >
                  <div class="cell-label">
                    Appointment Date
                  </div>

                  <div class="cell-value">
                    ${escapeMultilineHtml(date)}
                  </div>
                </td>

                <td
                  class="details-cell"
                  width="50%"
                  valign="top"
                  style="
                    width:50%;
                    padding:16px 18px;
                    ${
                      doctorName
                        ? 'border-bottom:1px solid #e7ebef;'
                        : ''
                    }
                  "
                >
                  <div class="cell-label">
                    Appointment Time
                  </div>

                  <div class="cell-value">
                    ${escapeMultilineHtml(time)}
                  </div>
                </td>
              </tr>

              ${
                doctorName
                  ? `
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
                          Doctor
                        </div>

                        <div class="cell-value">
                          ${escapeMultilineHtml(
                            doctorName
                          )}
                        </div>
                      </td>
                    </tr>
                  `
                  : ''
              }
            </table>
          </td>
        </tr>
      </table>
    `;
  };

  const formattedDuration =
    formatDuration(callDuration);

  const statusText = isAppointmentBooked
    ? 'Booked'
    : 'Not Booked';

  const statusColor = isAppointmentBooked
    ? '#ff7a1a'
    : '#94a3b8';

  const appointmentDetailsHtml =
    renderAppointmentDetails();

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
    Call Summary - Broadlands Pet Hospital
  </title>

  <!--[if mso]>
  <style type="text/css">
    table,
    td,
    div,
    p,
    a {
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

    .transcript-body-cell {
      background-color: #ffffff;

      background-image:
        radial-gradient(
          circle at 8% 7%,
          rgba(255, 122, 26, 0.06),
          transparent 26%
        ),
        radial-gradient(
          circle at 94% 92%,
          rgba(255, 122, 26, 0.06),
          transparent 28%
        ),
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='88' viewBox='0 0 110 88'%3E%3Cg fill='none' stroke='%23e9eef3' stroke-width='1' opacity='.72'%3E%3Cpath d='M7 12c8-5 15 2 8 8s2 10 8 5M30 8l5 5-6 5-5-5zM55 7c-5 4-4 10 2 11 5 1 8-3 6-7M82 9l8 8-8 8-8-8zM101 8c-6 2-7 9-1 11M5 45c6-2 11 5 6 9m12-13c7-6 15 2 10 8-4 5-10 2-8-3m22-7 6 5-5 6-6-5zM66 39c2 6 8 8 12 3s0-10-5-9M91 43c6-5 14 2 9 8M10 70l6-6 6 6-6 6zM38 64c-2 8 5 14 11 8 4-4 0-9-5-7m21 2 9-5 4 8-9 4zM91 65c7-4 14 4 9 10'/%3E%3Ccircle cx='36' cy='27' r='3'/%3E%3Ccircle cx='81' cy='33' r='3'/%3E%3C/g%3E%3C/svg%3E");

      background-repeat:
        no-repeat,
        no-repeat,
        repeat;
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

      .summary-cell {
        display: block !important;
        width: 100% !important;
        border-right: 0 !important;
        border-bottom: 1px solid #e7ebef !important;
      }

      .summary-cell-last {
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

      .message-table {
        max-width: 90% !important;
      }

      .transcript-body-cell {
        padding: 22px 16px 24px !important;
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

      .section-status-cell {
        width: auto !important;
      }

      .message-table {
        max-width: 94% !important;
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
                        alt="Broadlands Pet Hospital - AI Voice Assistant"
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
                        Call Summary
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
                  Automated call report
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
                  Call Summary Report
                </h1>

                <p
                  style="
                    margin:0 0 32px;
                    color:#4b5563;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:15px;
                    line-height:27px;
                  "
                >
                  A complete overview of the caller,
                  appointment information, call notes, and
                  the full conversation handled by the AI
                  voice assistant.
                </p>

                <!-- QUICK SUMMARY -->

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    margin:0 0 32px;
                    border:1px solid #e7ebef;
                    border-radius:10px;
                    border-collapse:separate;
                    border-spacing:0;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td
                      class="summary-cell"
                      width="33.33%"
                      valign="top"
                      style="
                        width:33.33%;
                        padding:16px 20px;
                        border-right:1px solid #e7ebef;
                        background:#f8fafc;
                      "
                    >
                      <div class="cell-label">
                        Caller
                      </div>

                      <div
                        style="
                          color:#14181f;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:15px;
                          font-weight:700;
                          line-height:21px;
                          overflow-wrap:anywhere;
                          word-break:break-word;
                        "
                      >
                        ${escapeMultilineHtml(callerName)}
                      </div>
                    </td>

                    <td
                      class="summary-cell"
                      width="33.33%"
                      valign="top"
                      style="
                        width:33.33%;
                        padding:16px 20px;
                        border-right:1px solid #e7ebef;
                        background:#f8fafc;
                      "
                    >
                      <div class="cell-label">
                        Duration
                      </div>

                      <div
                        style="
                          color:#0c8ce0;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:15px;
                          font-weight:700;
                          line-height:21px;
                        "
                      >
                        ${escapeHtml(formattedDuration)}
                      </div>
                    </td>

                    <td
                      class="summary-cell summary-cell-last"
                      width="33.33%"
                      valign="top"
                      style="
                        width:33.33%;
                        padding:16px 20px;
                        background:#f8fafc;
                      "
                    >
                      <div class="cell-label">
                        Status
                      </div>

                      <div
                        style="
                          color:${statusColor};
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:15px;
                          font-weight:700;
                          line-height:21px;
                        "
                      >
                        ${statusText}
                      </div>
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
                              Call ID
                            </div>

                            <div class="cell-value">
                              ${escapeMultilineHtml(callId)}
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
                              Date &amp; Time
                            </div>

                            <div class="cell-value">
                              ${escapeHtml(formatDate(callDate))}
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
                              Caller Name
                            </div>

                            <div class="cell-value">
                              ${escapeMultilineHtml(
                                callerName
                              )}
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
                              Caller Number
                            </div>

                            <div class="cell-value">
                              ${renderPhone(
                                callerNumber,
                                'Unknown'
                              )}
                            </div>
                          </td>
                        </tr>

                        <tr class="last-details-row">
                          <td
                            class="details-cell"
                            width="50%"
                            valign="top"
                            style="
                              width:50%;
                              padding:16px 18px;
                              border-right:1px solid #e7ebef;
                            "
                          >
                            <div class="cell-label">
                              Number Used to Book
                            </div>

                            <div class="cell-value">
                              ${renderPhone(
                                registeredNumber
                              )}
                            </div>
                          </td>

                          <td
                            class="details-cell"
                            width="50%"
                            valign="top"
                            style="
                              width:50%;
                              padding:16px 18px;
                            "
                          >
                            <div class="cell-label">
                              Reason for Call
                            </div>

                            <div class="cell-value">
                              ${escapeMultilineHtml(
                                reasonForCall
                              )}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- APPOINTMENT DETAILS -->

                ${appointmentDetailsHtml}

                <!-- CALL SUMMARY -->

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
                        Call Summary
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:20px;
                        border:1px solid #e7ebef;
                        border-radius:10px;
                        background:#f8fafc;
                        color:#374151;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:14px;
                        line-height:25px;
                        white-space:normal;
                        overflow-wrap:anywhere;
                        word-break:break-word;
                      "
                    >
                      ${escapeMultilineHtml(callSummary)}
                    </td>
                  </tr>
                </table>

                <!-- TRANSCRIPT -->

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
                        Conversation Transcript
                      </span>
                    </td>

                    <td
                      class="section-status-cell"
                      width="70"
                      align="right"
                      valign="top"
                      style="
                        width:70px;
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
                        New
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td colspan="2">
                      <table
                        role="presentation"
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
                            style="
                              padding:18px 20px;
                              border-bottom:3px solid #ff7a1a;
                              background:#0c1a2e;
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
                                  width="47"
                                  valign="middle"
                                  style="
                                    width:47px;
                                    vertical-align:middle;
                                  "
                                >
                                  <table
                                    role="presentation"
                                    width="36"
                                    height="36"
                                    cellpadding="0"
                                    cellspacing="0"
                                    border="0"
                                    style="
                                      width:36px;
                                      height:36px;
                                      border:1px solid rgba(255,122,26,0.30);
                                      border-radius:8px;
                                      background:rgba(255,122,26,0.14);
                                      border-collapse:separate;
                                    "
                                  >
                                    <tr>
                                      <td
                                        align="center"
                                        valign="middle"
                                        style="
                                          color:#ff9c4d;
                                          text-align:center;
                                          vertical-align:middle;
                                        "
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          width="18"
                                          height="18"
                                          aria-hidden="true"
                                          style="
                                            display:inline-block;
                                            width:18px;
                                            height:18px;
                                            vertical-align:middle;
                                            fill:none;
                                            stroke:currentColor;
                                            stroke-width:2;
                                            stroke-linecap:round;
                                            stroke-linejoin:round;
                                          "
                                        >
                                          <path
                                            d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
                                          ></path>
                                        </svg>
                                      </td>
                                    </tr>
                                  </table>
                                </td>

                                <td
                                  valign="middle"
                                  style="vertical-align:middle;"
                                >
                                  <div
                                    style="
                                      color:#ffffff;
                                      font-family:Arial,Helvetica,sans-serif;
                                      font-size:14px;
                                      font-weight:700;
                                      line-height:18px;
                                    "
                                  >
                                    Full Conversation
                                  </div>

                                  <div
                                    style="
                                      margin-top:3px;
                                      color:#8c96a5;
                                      font-family:Arial,Helvetica,sans-serif;
                                      font-size:9.5px;
                                      font-weight:700;
                                      line-height:13px;
                                      letter-spacing:0.55px;
                                      text-transform:uppercase;
                                    "
                                  >
                                    AI Assistant · Caller
                                  </div>
                                </td>

                                <td
                                  width="86"
                                  align="right"
                                  valign="middle"
                                  style="
                                    width:86px;
                                    text-align:right;
                                    vertical-align:middle;
                                  "
                                >
                                  <span
                                    style="
                                      display:inline-block;
                                      padding:8px 12px;
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
                                    ${escapeHtml(
                                      formattedDuration
                                    )}
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td
                            class="transcript-body-cell"
                            style="
                              padding:24px 20px 26px;
                              background-color:#ffffff;
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
                                margin:0 0 22px;
                                border-collapse:collapse;
                              "
                            >
                              <tr>
                                <td
                                  width="40%"
                                  valign="middle"
                                  style="
                                    width:40%;
                                    vertical-align:middle;
                                  "
                                >
                                  <div
                                    style="
                                      height:1px;
                                      background:#e7ebef;
                                      font-size:1px;
                                      line-height:1px;
                                    "
                                  >
                                    &nbsp;
                                  </div>
                                </td>

                                <td
                                  align="center"
                                  valign="middle"
                                  style="
                                    padding:0 12px;
                                    color:#94a3b8;
                                    font-family:Arial,Helvetica,sans-serif;
                                    font-size:10px;
                                    font-weight:700;
                                    line-height:14px;
                                    letter-spacing:0.7px;
                                    text-align:center;
                                    text-transform:uppercase;
                                    white-space:nowrap;
                                  "
                                >
                                  Call transcript
                                </td>

                                <td
                                  width="40%"
                                  valign="middle"
                                  style="
                                    width:40%;
                                    vertical-align:middle;
                                  "
                                >
                                  <div
                                    style="
                                      height:1px;
                                      background:#e7ebef;
                                      font-size:1px;
                                      line-height:1px;
                                    "
                                  >
                                    &nbsp;
                                  </div>
                                </td>
                              </tr>
                            </table>

                            ${formatTranscript(
                              callTranscription
                            )}
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
                  43150 Broadlands Center Plaza,
                  Suite 184, Ashburn, VA 20148
                  <br>

                  Phone:
                  <a
                    href="tel:5717078844"
                    style="
                      color:#0c8ce0;
                      text-decoration:none;
                    "
                  >
                    571-707-8844
                  </a>
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
                  This automated email was generated by
                  the AI Voice Assistant. Please do not reply.
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

module.exports = buildAdminCallTranscriptionEmail;

module.exports.buildAdminCallTranscriptionEmail =
  buildAdminCallTranscriptionEmail;