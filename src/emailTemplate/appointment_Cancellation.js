// appointment_Cancellation.js
function buildAppointmentCancellationEmail(data) {
    const { patientName, petName, appointmentDate, appointmentTime, appointmentType, location = "43150 Broadlands Center Plaza, Suite 184, Ashburn, VA 20148", phone = "571-707-8844" } = data;

    if (!patientName || !petName || !appointmentDate || !appointmentTime || !appointmentType) {
        throw new Error("Missing required fields for appointment cancellation email");
    }

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

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Cancelled - Broadlands Pet Hospital</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; line-height: 1.5; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .email-header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 32px 24px; text-align: center; }
        .hospital-icon { font-size: 48px; margin-bottom: 12px; }
        .email-header h1 { color: white; font-size: 28px; margin: 0 0 8px; font-weight: 600; }
        .email-header p { color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; }
        .email-body { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; }
        .message-box { background: #fef9f7; border-left: 4px solid #e74c3c; padding: 20px; border-radius: 12px; margin-bottom: 28px; }
        .appointment-card { background: #f8f9fc; border-radius: 16px; padding: 20px; margin-bottom: 28px; border: 1px solid #e9ecef; }
        .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { width: 110px; font-weight: 600; color: #555; font-size: 14px; }
        .detail-value { flex: 1; color: #2c3e50; font-size: 14px; font-weight: 500; }
        .footer { background: #f8f9fc; padding: 24px 28px; text-align: center; border-top: 1px solid #e9ecef; }
        .footer-text { color: #7f8c8d; font-size: 12px; line-height: 1.5; }
        .button { display: inline-block; background: #2ecc71; color: white; padding: 10px 20px; border-radius: 30px; text-decoration: none; font-weight: 500; margin-top: 16px; font-size: 14px; }
        @media (max-width: 500px) { .detail-row { flex-direction: column; gap: 4px; } .detail-label { width: auto; } }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="hospital-icon">❌</div>
            <h1>Appointment Cancelled</h1>
            <p>Broadlands Pet Hospital</p>
        </div>
        <div class="email-body">
            <div class="greeting">Hello ${escapeHtml(patientName)},</div>
            <div class="message-box">
                <p>We have successfully cancelled the following appointment:</p>
            </div>
            <div class="appointment-card">
                <div class="detail-row"><div class="detail-label">📅 Date & Time</div><div class="detail-value">${escapeHtml(appointmentDate)} at ${escapeHtml(appointmentTime)}</div></div>
                <div class="detail-row"><div class="detail-label">🐾 Pet</div><div class="detail-value">${escapeHtml(petName)}</div></div>
                <div class="detail-row"><div class="detail-label">📋 Type</div><div class="detail-value">${escapeHtml(appointmentType)}</div></div>
                <div class="detail-row"><div class="detail-label">📍 Location</div><div class="detail-value">${escapeHtml(location)}</div></div>
                <div class="detail-row"><div class="detail-label">📞 Phone</div><div class="detail-value">${escapeHtml(phone)}</div></div>
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <p>If you didn't request this cancellation, please contact us immediately.</p>
                <a href="tel:${escapeHtml(phone)}" class="button">Call us</a>
            </div>
        </div>
        <div class="footer">
            <div class="footer-text"><strong>Broadlands Pet Hospital</strong><br>Compassionate care for your pets.<br>This is an automated notification.</div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = { buildAppointmentCancellationEmail };