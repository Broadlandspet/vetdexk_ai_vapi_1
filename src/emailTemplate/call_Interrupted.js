// call_Interrupted.js
function buildCallInterruptedEmail(data) {
    const { patientName, petName, reason = "system error", location = "43150 Broadlands Center Plaza, Suite 184, Ashburn, VA 20148", phone = "571-707-8844" } = data;

    if (!patientName) {
        throw new Error("Missing required fields for call interrupted email");
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
    <title>Call Interrupted - Broadlands Pet Hospital</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; line-height: 1.5; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .email-header { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 32px 24px; text-align: center; }
        .hospital-icon { font-size: 48px; margin-bottom: 12px; }
        .email-header h1 { color: white; font-size: 28px; margin: 0 0 8px; font-weight: 600; }
        .email-header p { color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; }
        .email-body { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; }
        .message-box { background: #fef9e7; border-left: 4px solid #f39c12; padding: 20px; border-radius: 12px; margin-bottom: 28px; }
        .footer { background: #f8f9fc; padding: 24px 28px; text-align: center; border-top: 1px solid #e9ecef; }
        .footer-text { color: #7f8c8d; font-size: 12px; line-height: 1.5; }
        .button { display: inline-block; background: #2ecc71; color: white; padding: 10px 20px; border-radius: 30px; text-decoration: none; font-weight: 500; margin-top: 16px; font-size: 14px; }
        @media (max-width: 500px) { .detail-row { flex-direction: column; gap: 4px; } .detail-label { width: auto; } }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="hospital-icon">⚠️</div>
            <h1>Call Interrupted</h1>
            <p>Broadlands Pet Hospital</p>
        </div>
        <div class="email-body">
            <div class="greeting">Hello ${escapeHtml(patientName)},</div>
            <div class="message-box">
                <p>We apologize, but your recent call was interrupted due to a ${escapeHtml(reason)}.</p>
                <p>Please try calling us again at <strong>${escapeHtml(phone)}</strong> or visit our website to complete your request.</p>
                ${petName ? `<p>We were assisting you with your pet, ${escapeHtml(petName)}.</p>` : ''}
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <a href="tel:${escapeHtml(phone)}" class="button">Call us again</a>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <p><strong>📍 Location:</strong> ${escapeHtml(location)}</p>
            </div>
        </div>
        <div class="footer">
            <div class="footer-text"><strong>Broadlands Pet Hospital</strong><br>We're here to help.</div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = { buildCallInterruptedEmail };