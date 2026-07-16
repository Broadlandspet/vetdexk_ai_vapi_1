
// appointment_Confirmation.js
// Email template for sending appointment confirmation to the patient — no static defaults

/**
 * Builds an HTML email to confirm an appointment booking for a patient.
 * @param {Object} data - Dynamic appointment data
 * @param {string} data.patientName - Name of the patient (owner) — required
 * @param {string} data.petName - Name of the pet — required
 * @param {string} data.appointmentDate - Date of appointment (e.g., "Monday, June 15, 2026") — required
 * @param {string} data.appointmentTime - Time of appointment (e.g., "10:30 AM") — required
 * @param {string} data.appointmentType - Type of appointment — required
 * @param {string} [data.additionalNotes] - Optional notes (only shown if provided)
 * @param {string} [data.vetName] - Optional vet name (only shown if provided)
 * @param {string} [data.location] - Hospital address (defaults to standard address but you can override)
 * @param {string} [data.phone] - Contact phone (defaults to standard phone but you can override)
 * @returns {string} HTML email content
 */
function buildAppointmentConfirmationEmail(data) {
    // No fallback person names or dummy values except for clinic address/phone (those are business constants)
    // If you want to remove even those, pass location and phone explicitly.
    const {
        patientName,
        petName,
        appointmentDate,
        appointmentTime,
        appointmentType,
        additionalNotes = "",
        vetName,
        location = "43150 Broadlands Center Plaza, Suite 184, Ashburn, VA 20148",
        phone = "571-707-8844"
    } = data;

    // If required fields are missing, throw an error (or handle gracefully)
    if (!patientName || !petName || !appointmentDate || !appointmentTime || !appointmentType) {
        throw new Error("Missing required fields for appointment confirmation email");
    }

    const fullDateTime = `${appointmentDate} at ${appointmentTime}`;

    const escapeHtml = (str) => {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
    };

    const safePatient = escapeHtml(patientName);
    const safePet = escapeHtml(petName);
    const safeDateTime = escapeHtml(fullDateTime);
    const safeType = escapeHtml(appointmentType);
    const safeNotes = additionalNotes ? escapeHtml(additionalNotes) : null;
    const safeVet = vetName ? escapeHtml(vetName) : null;
    const safeLocation = escapeHtml(location);
    const safePhone = escapeHtml(phone);

    // Optional vet row only if vetName provided
    const vetRow = safeVet ? `
        <div class="detail-row">
            <div class="detail-label">👨‍⚕️ Veterinarian</div>
            <div class="detail-value">${safeVet}</div>
        </div>
    ` : '';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Confirmation - Broadlands Pet Hospital</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f0f4f8;
            margin: 0;
            padding: 20px;
            line-height: 1.5;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        .email-header {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            padding: 32px 24px;
            text-align: center;
        }
        .hospital-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }
        .email-header h1 {
            color: white;
            font-size: 28px;
            margin: 0 0 8px;
            font-weight: 600;
        }
        .email-header p {
            color: rgba(255,255,255,0.9);
            font-size: 14px;
            margin: 0;
        }
        .email-body {
            padding: 32px 28px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .confirmation-box {
            background: #f0fff4;
            border-left: 4px solid #2ecc71;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 28px;
        }
        .confirmation-text {
            font-size: 16px;
            color: #2c3e50;
            margin-bottom: 16px;
        }
        .appointment-card {
            background: #f8f9fc;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 28px;
            border: 1px solid #e9ecef;
        }
        .detail-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            width: 110px;
            font-weight: 600;
            color: #555;
            font-size: 14px;
        }
        .detail-value {
            flex: 1;
            color: #2c3e50;
            font-size: 14px;
            font-weight: 500;
        }
        .notes-box {
            background: #fff9e6;
            border-radius: 12px;
            padding: 16px;
            margin: 20px 0;
            border-left: 3px solid #f39c12;
            font-size: 14px;
            color: #7f8c8d;
        }
        .footer {
            background: #f8f9fc;
            padding: 24px 28px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer-text {
            color: #7f8c8d;
            font-size: 12px;
            line-height: 1.5;
        }
        .footer a {
            color: #2ecc71;
            text-decoration: none;
        }
        .button {
            display: inline-block;
            background: #2ecc71;
            color: white;
            padding: 10px 20px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 16px;
            font-size: 14px;
        }
        @media (max-width: 500px) {
            .email-body { padding: 20px; }
            .detail-row { flex-direction: column; gap: 4px; }
            .detail-label { width: auto; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="hospital-icon">🐾❤️</div>
            <h1>Appointment Confirmed!</h1>
            <p>Broadlands Pet Hospital</p>
        </div>

        <div class="email-body">
            <div class="greeting">
                Hello ${safePatient},
            </div>

            <div class="confirmation-box">
                <div class="confirmation-text">
                    ✅ Great news! Your appointment has been successfully booked for 
                    <strong>${safePet}</strong>.
                </div>
                <div class="confirmation-text">
                    We look forward to seeing you and your furry companion.
                </div>
            </div>

            <div class="appointment-card">
                <div class="detail-row">
                    <div class="detail-label">📅 Date & Time</div>
                    <div class="detail-value">${safeDateTime}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">📋 Appointment Type</div>
                    <div class="detail-value">${safeType}</div>
                </div>
                ${vetRow}
                <div class="detail-row">
                    <div class="detail-label">📍 Location</div>
                    <div class="detail-value">${safeLocation}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">📞 Phone</div>
                    <div class="detail-value">${safePhone}</div>
                </div>
            </div>

            ${safeNotes ? `<div class="notes-box">📌 Note: ${safeNotes}</div>` : ''}

            <div style="text-align: center; margin-top: 24px;">
                <a href="tel:${safePhone}" class="button">Call us</a>
            </div>
        </div>

        <div class="footer">
            <div class="footer-text">
                <strong>Broadlands Pet Hospital</strong><br>
                Compassionate care for your pets.<br>
                If you need to reschedule, please call us at least 24 hours in advance.
            </div>
            <div class="footer-text" style="margin-top: 12px; font-size: 11px;">
                This is an automated confirmation. Please do not reply to this email.
            </div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = { buildAppointmentConfirmationEmail };