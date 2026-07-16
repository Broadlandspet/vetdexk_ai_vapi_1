
const { google } = require('googleapis');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const env = require('../config/env');
const { buildAppointmentConfirmationEmail } = require('../emailTemplate/appointment_Confirmation');

class EmailService {

    // Get active email configuration from database
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

    // Get OAuth2 Client
    static getOAuth2Client() {
        const env = require('../config/env');

        const clientId = env.GMAIL_CLIENT_ID;
        const clientSecret = env.GMAIL_CLIENT_SECRET;
        const refreshToken = env.GMAIL_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            logger.warn('Missing Gmail OAuth2 credentials - email will not be sent');
            return null;
        }

        const oAuth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'https://developers.google.com/oauthplayground'
        );

        oAuth2Client.setCredentials({
            refresh_token: refreshToken
        });

        return oAuth2Client;
    }

    // Send email using Gmail API
    static async sendEmailViaGmailAPI({ to, subject, html }) {
        try {
            const oAuth2Client = this.getOAuth2Client();

            if (!oAuth2Client) {
                throw new Error('OAuth2 client not configured');
            }

            const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
            const fromEmail = env.GMAIL_FROM_EMAIL || env.GOOGLE_EMAIL || 'noreply@broadlandspet.com';

            // Build raw email
            const emailLines = [
                `From: "Broadlands Pet Hospital" <${fromEmail}>`,
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

            logger.info(`Email sent via Gmail API: ${result.data.id}`);
            return { messageId: result.data.id };

        } catch (error) {
            logger.error('Error sending email via Gmail API:', error);
            throw error;
        }
    }

    // Simple email sender (fallback)
    static async sendSimpleEmail({ to, subject, html, text }) {
        try {
            const oAuth2Client = this.getOAuth2Client();

            if (oAuth2Client) {
                try {
                    const result = await this.sendEmailViaGmailAPI({ to, subject, html });
                    return { success: true, messageId: result.messageId };
                } catch (gmailError) {
                    logger.warn(`Gmail API failed: ${gmailError.message}`);
                }
            }

            logger.info(`[EMAIL FALLBACK] To: ${to}, Subject: ${subject}`);
            return {
                success: true,
                messageId: `fallback-${Date.now()}`,
                note: 'Email logged to console'
            };

        } catch (error) {
            logger.error('Error sending simple email:', error);
            return { success: false, error: error.message };
        }
    }

    // Get recipient email (admin)
    static async getRecipientEmail() {
        const config = await this.getActiveConfig();
        if (config && config.to_email) {
            return config.to_email;
        }
        return env.ADMIN_EMAIL || 'admin@broadlandspet.com';
    }

    // Get sender email
    static async getSenderEmail() {
        const config = await this.getActiveConfig();
        if (config && config.from_email) {
            return config.from_email;
        }
        return env.GMAIL_FROM_EMAIL || env.GOOGLE_EMAIL || 'noreply@broadlandspet.com';
    }

    // Extract caller name from transcript (fallback only – now rarely used because controller provides name)
    static extractCallerName(transcript) {
        if (!transcript) return 'Unknown';

        const namePatterns = [
            /Welcome back[, ]+([A-Za-z]+ [A-Za-z]+)/i,
            /Patient name[, ]+([A-Za-z]+ [A-Za-z]+)/i,
            /my name is (\w+)/i,
            /I am (\w+)/i,
            /I'm (\w+)/i,
            /this is (\w+)/i,
            /Welcome back[,\s]+(\w+)/i
        ];

        for (const pattern of namePatterns) {
            const match = transcript.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return 'Unknown';
    }

    // Extract reason for call from transcript (fallback only)
    static extractReasonForCall(transcript) {
        if (!transcript) return 'Query Purpose';

        const lowerTranscript = transcript.toLowerCase();

        if (lowerTranscript.includes('surgery')) return 'Surgery';
        if (lowerTranscript.includes('vaccination')) return 'Vaccination';
        if (lowerTranscript.includes('consultation')) return 'Consultation';
        if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
        if (lowerTranscript.includes('appointment') || lowerTranscript.includes('book')) return 'Appointment Booking';

        return 'Query Purpose';
    }

    // Extract appointment type from transcript (subject line helper) – deprecated in favor of direct flag
    static extractAppointmentType(transcript) {
        if (!transcript) return null;
        const lowerTranscript = transcript.toLowerCase();
        if (lowerTranscript.includes('surgery')) return 'Surgery';
        if (lowerTranscript.includes('vaccination')) return 'Vaccination';
        if (lowerTranscript.includes('consultation')) return 'Consultation';
        if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
        return null;
    }

    // Check if appointment was actually booked (fallback) – replaced by direct flag
    static wasAppointmentBooked(transcript) {
        if (!transcript) return false;
        const lowerTranscript = transcript.toLowerCase();
        if (lowerTranscript.includes('appointment booked successfully') ||
            lowerTranscript.includes('you\'re all set') ||
            lowerTranscript.includes('your appointment has been booked') ||
            lowerTranscript.includes('excellent! you\'re all set')) {
            return true;
        }
        return false;
    }

    // Extract booked appointment type from transcript – deprecated
    static extractBookedAppointmentType(transcript) {
        if (!transcript) return null;
        const lowerTranscript = transcript.toLowerCase();
        if (lowerTranscript.includes('consultation')) return 'Consultation';
        if (lowerTranscript.includes('vaccination')) return 'Vaccination';
        if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
        if (lowerTranscript.includes('surgery')) return 'Surgery';
        return null;
    }

    // Generate dynamic subject line based on appointmentBooked flag
    // If appointmentBooked is true, use booking subject, else general.
    static generateSubjectLine(appointmentBooked, appointmentType = null) {
        console.log('✅✅✅ NEW EMAIL TEMPLATE IS BEING USED! ✅✅✅');
        console.log(`   Subject generated at: ${new Date().toISOString()}`);

        if (appointmentBooked) {
            const type = appointmentType ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1) : 'Appointment';
            console.log(`   Appointment Booked: YES - Type: ${type}`);
            return `Call Logs for Appointment Booking | Broadlands Pet Hospital`;
        }

        console.log(`   Appointment Booked: NO - Using general subject`);
        return `Call Logs for User Query Summary | Broadlands Pet Hospital`;
    }

    // Generate call summary
    static generateSummary(transcript, reasonForCall, callerName) {
        if (!transcript) return 'No transcript available for summary.';

        const summaries = {
            'Surgery': `${callerName} called to inquire about surgery services. Surgery appointments cannot be booked over the phone and require an in-person visit or call to the main office.`,
            'Vaccination': `${callerName} called to book a vaccination appointment for their pet.`,
            'Consultation': `${callerName} called regarding a consultation appointment.`,
            'Follow-Up': `${callerName} called for a follow-up appointment.`,
            'Appointment Booking': `${callerName} called to book an appointment.`,
            'Query Purpose': `${callerName} called Broadlands Pet Hospital for a general inquiry.`
        };
        return summaries[reasonForCall] || summaries['Query Purpose'];
    }

    // Format transcript with proper roles (Assistant/User)
    static formatTranscript(transcript) {
        if (!transcript) return 'No transcript available.';

        const lines = transcript.split('\n');
        let formattedHtml = '';

        for (const line of lines) {
            if (line.trim() === '') continue;

            if (line.startsWith('AI:') || line.startsWith('Assistant:')) {
                const message = line.replace(/^(AI:|Assistant:)/, '').trim();
                formattedHtml += `
                    <div class="message-bubble assistant">
                        <div class="message-role assistant-role">
                            <span class="role-icon">🏥</span> Assistant
                        </div>
                        <div class="message-text">${this.escapeHtml(message)}</div>
                    </div>
                `;
            } else if (line.startsWith('User:')) {
                const message = line.replace(/^User:/, '').trim();
                formattedHtml += `
                    <div class="message-bubble user">
                        <div class="message-role user-role">
                            <span class="role-icon">👤</span> User
                        </div>
                        <div class="message-text">${this.escapeHtml(message)}</div>
                    </div>
                `;
            } else if (line.trim().length > 0) {
                formattedHtml += `
                    <div class="message-bubble system">
                        <div class="message-text">${this.escapeHtml(line)}</div>
                    </div>
                `;
            }
        }
        return formattedHtml || '<p>No transcript available.</p>';
    }

    // Helper to escape HTML
    static escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
    }

    // Format duration
    static formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        if (mins === 0) return `${secs} seconds`;
        return `${mins} minute${mins !== 1 ? 's' : ''} ${secs} seconds`;
    }

    // Build HTML email template (Professional)
    static buildEmailTemplate(data) {
        console.log('✅ Building professional email template with gradient design');

        const {
            callerName,
            callerNumber,
            registeredNumber,
            reasonForCall,
            callDate,
            callDuration,
            callSummary,
            callTranscription,
            callId,
            appointmentBooked,
            appointmentDetails
        } = data;

        const formattedDate = callDate ? new Date(callDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) : new Date().toLocaleString();

        const formattedDuration = this.formatDuration(callDuration || 0);
        const formattedTranscript = this.formatTranscript(callTranscription);

        // Determine if this is an appointment booking email
        const isAppointmentBooking = appointmentBooked === true;

        // Build appointment details section if applicable
        let appointmentDetailsHtml = '';
        if (isAppointmentBooking && appointmentDetails) {
            appointmentDetailsHtml = `
                <div class="appointment-details" style="background: #e8f5e9; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; border-left: 4px solid #2ecc71;">
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📅 Appointment Details</h4>
                    <div class="detail-grid" style="grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        <div class="detail-item"><span class="detail-label">Pet:</span><span class="detail-value">${this.escapeHtml(appointmentDetails.petName || 'Unknown')}</span></div>
                        <div class="detail-item"><span class="detail-label">Date:</span><span class="detail-value">${this.escapeHtml(appointmentDetails.date || '')}</span></div>
                        <div class="detail-item"><span class="detail-label">Time:</span><span class="detail-value">${this.escapeHtml(appointmentDetails.time || '')}</span></div>
                        <div class="detail-item"><span class="detail-label">Type:</span><span class="detail-value">${this.escapeHtml(appointmentDetails.appointmentType || 'Consultation')}</span></div>
                        ${appointmentDetails.doctorName ? `<div class="detail-item"><span class="detail-label">Doctor:</span><span class="detail-value">${this.escapeHtml(appointmentDetails.doctorName)}</span></div>` : ''}
                    </div>
                </div>
            `;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Call Summary - Broadlands Pet Hospital</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f6fa; margin: 0; padding: 20px; line-height: 1.5; }
        .email-container { max-width: 750px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); }
        .email-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center; }
        .email-header h1 { color: white; font-size: 28px; margin: 0 0 8px 0; font-weight: 600; }
        .email-header p { color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 0; }
        .hospital-icon { font-size: 48px; margin-bottom: 12px; }
        .email-body { padding: 32px 40px; }
        .call-details { background: #f8f9fc; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; border: 1px solid #e9ecef; }
        .section-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        .section-title .icon { font-size: 22px; }
        .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .detail-item { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
        .detail-label { font-weight: 600; color: #555; min-width: 100px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { color: #2c3e50; font-size: 14px; font-weight: 500; word-break: break-all; }
        .detail-value a { color: #667eea; text-decoration: none; }
        .summary-box { background: linear-gradient(135deg, #f0f4ff 0%, #e8edf8 100%); border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; border-left: 4px solid #2ecc71; }
        .summary-text { color: #2c3e50; font-size: 14px; line-height: 1.6; }
        .transcript-container { background: #f8f9fc; border-radius: 12px; overflow: hidden; border: 1px solid #e9ecef; margin-bottom: 28px; }
        .transcript-header { background: #e9ecef; padding: 14px 20px; font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; }
        .transcript-body { padding: 20px; max-height: 500px; overflow-y: auto; }
        .message-bubble { margin-bottom: 16px; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message-role { font-size: 12px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .role-icon { font-size: 14px; }
        .assistant-role { color: #764ba2; }
        .user-role { color: #667eea; }
        .message-text { background: white; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; color: #333; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border: 1px solid #e9ecef; }
        .assistant .message-text { border-left: 3px solid #764ba2; background: #faf5ff; }
        .user .message-text { border-left: 3px solid #667eea; background: #f0f4ff; }
        .system .message-text { background: #f8f9fa; color: #666; font-style: italic; }
        .email-footer { background: #f8f9fc; padding: 24px 40px; text-align: center; border-top: 1px solid #e9ecef; }
        .footer-text { color: #888; font-size: 12px; line-height: 1.6; }
        .footer-text strong { color: #667eea; }
        .footer-note { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e9ecef; color: #e74c3c; font-size: 11px; }
        .appointment-details .detail-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 600px) {
            .email-body { padding: 20px; }
            .email-header { padding: 24px 20px; }
            .detail-grid { grid-template-columns: 1fr; gap: 12px; }
            .detail-item { flex-direction: column; gap: 4px; }
            .detail-label { min-width: auto; }
            .appointment-details .detail-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="hospital-icon">🐾</div>
            <h1>${isAppointmentBooking ? 'Appointment Booking Confirmation' : 'Call Summary Report'}</h1>
            <p>Broadlands Pet Hospital - AI Voice Assistant</p>
        </div>
        
        <div class="email-body">
            <div class="call-details">
                <div class="section-title">
                    <span class="icon">📞</span>
                    <span>Call Information</span>
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Call ID:</span>
                        <span class="detail-value">${this.escapeHtml(callId || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Caller Name:</span>
                        <span class="detail-value">${this.escapeHtml(callerName || 'Unknown')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Caller Number:</span>
                        <span class="detail-value">${this.escapeHtml(callerNumber || 'Unknown')}</span>
                    </div>
                ${isAppointmentBooking && registeredNumber ? `
                <div class="detail-item">
                    <span class="detail-label">Number used to book:</span>
                    <span class="detail-value">${this.escapeHtml(registeredNumber)}</span>
                </div>
                ` : ''}
                    <div class="detail-item">
                        <span class="detail-label">Reason for Call:</span>
                        <span class="detail-value"><strong>${this.escapeHtml(reasonForCall || 'Query Purpose')}</strong></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date & Time:</span>
                        <span class="detail-value">${this.escapeHtml(formattedDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">${this.escapeHtml(formattedDuration)}</span>
                    </div>
                </div>
            </div>
            
            ${isAppointmentBooking ? appointmentDetailsHtml : ''}
            
            <div class="summary-box">
                <div class="section-title" style="border-bottom-color: #2ecc71; margin-bottom: 12px;">
                    <span class="icon">📝</span>
                    <span>Call Summary</span>
                </div>
                <div class="summary-text">
                    ${this.escapeHtml(callSummary || 'No summary available.')}
                </div>
            </div>
            
            <div class="transcript-container">
                <div class="transcript-header">
                    <span>💬</span> Full Conversation Transcript
                </div>
                <div class="transcript-body">
                    ${formattedTranscript}
                </div>
            </div>
        </div>
        
        <div class="email-footer">
            <div class="footer-text">
                <strong>Broadlands Pet Hospital</strong><br>
                43150 Broadlands Center Plaza, Suite 184, Ashburn, VA 20148<br>
                Phone: <a href="tel:571-707-8844" style="color:#667eea;">571-707-8844</a>
            </div>
            <div class="footer-note">
                ⚠️ This is an automated email from the AI Voice Assistant. Please do not reply.
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    // ============================================
    // ✅ UPDATED: Save email log WITH hospital_id
    // ============================================
    static async saveEmailLog(data) {
        console.log(`🔍🔍🔍 DEBUG - patientId received in saveEmailLog: ${data.patientId}`);
        console.log(`🔍🔍🔍 DEBUG - hospitalId received in saveEmailLog: ${data.hospitalId || 'NULL'}`);
        console.log(`🔍🔍🔍 DEBUG - Full data:`, JSON.stringify({
            callSid: data.callSid,
            callId: data.callId,
            patientId: data.patientId,
            hospitalId: data.hospitalId
        }));
        try {
            const result = await executeQuery(
                `INSERT INTO email_logs (
                call_sid, call_id, patient_id, to_email, from_email, subject,
                body_html, caller_name, caller_number, reason_for_call,
                call_summary, call_transcription, call_date, call_duration,
                status, sent_at, hospital_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id`,
                [
                    data.callSid || null,
                    data.callId || null,
                    data.patientId || null,
                    data.toEmail,
                    data.fromEmail,
                    data.subject,
                    data.bodyHtml,
                    data.callerName || 'Unknown',
                    data.callerNumber || 'Unknown',
                    data.reasonForCall || 'Query Purpose',
                    data.callSummary || '',
                    data.callTranscription || '',
                    data.callDate || new Date(),
                    Math.round(data.callDuration || 0),
                    'sent',
                    new Date(),
                    data.hospitalId || null   // ✅ Added hospital_id
                ]
            );

            logger.info(`Email log saved: ${result.rows[0].id} (hospital_id: ${data.hospitalId || 'NULL'})`);
            return result.rows[0].id;

        } catch (error) {
            logger.error('Error saving email log:', error);
            return null;
        }
    }

    // ============================================
    // ✅ UPDATED: Save failed email log WITH hospital_id
    // ============================================
    static async saveFailedEmailLog(data, errorMessage) {
        try {
            await executeQuery(
                `INSERT INTO email_logs (
                call_sid, call_id, patient_id, to_email, from_email, subject,
                caller_name, caller_number, reason_for_call,
                status, error_message, created_at, hospital_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)`,
                [
                    data.callSid || null,
                    data.callId || null,
                    data.patientId || null,
                    data.toEmail,
                    data.fromEmail,
                    data.subject || 'Call Summary',
                    data.callerName || 'Unknown',
                    data.callerNumber || 'Unknown',
                    data.reasonForCall || 'Query Purpose',
                    'failed',
                    errorMessage,
                    data.hospitalId || null   // ✅ Added hospital_id
                ]
            );
            logger.info(`Failed email log saved with hospital_id: ${data.hospitalId || 'NULL'}`);
        } catch (error) {
            logger.error('Error saving failed email log:', error);
        }
    }

    // ============================================
    // ✅ UPDATED: Main function - sendCallSummaryEmail WITH hospital_id + appointment detection
    // ============================================
    static async sendCallSummaryEmail(callData) {
        console.log('✅✅✅ sendCallSummaryEmail() - NEW TEMPLATE IS BEING USED! ✅✅✅');

        const {
            callSid,
            callId,
            callerNumber,
            transcription,
            callDuration,
            callDate,
            recordingUrl,
            patientId,
            registeredNumber,
            appointmentType,
            callerName: providedCallerName,
            reasonForCall: providedReasonForCall,
            hospitalId,
            // ─── NEW FIELDS ──────────────────────────────
            appointmentBooked = false,
            appointmentDetails = null,
            callerEmail = null
        } = callData;

        try {
            const callerName = providedCallerName ||
                (transcription ? this.extractCallerName(transcription) : 'Unknown');

            let reasonForCall = providedReasonForCall;
            if (!reasonForCall) {
                if (appointmentType && appointmentType !== 'null') {
                    reasonForCall = appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1);
                } else {
                    reasonForCall = transcription ? this.extractReasonForCall(transcription) : 'Query Purpose';
                }
            }

            const callSummary = this.generateSummary(transcription, reasonForCall, callerName);
            
            // ─── Generate subject based on appointmentBooked flag ───
            const subject = this.generateSubjectLine(appointmentBooked, appointmentDetails?.appointmentType || appointmentType);

            const toEmail = await this.getRecipientEmail();
            const fromEmail = await this.getSenderEmail();

            console.log(`   Email Subject: ${subject}`);
            console.log(`   Sending to: ${toEmail}`);
            console.log(`   Hospital ID: ${hospitalId || 'NULL'}`);
            console.log(`   Appointment Booked: ${appointmentBooked ? 'YES' : 'NO'}`);

            // ─── Build admin email template ──────────────────────────
            const bodyHtml = this.buildEmailTemplate({
                callerName,
                callerNumber: callerNumber || 'Unknown',
                registeredNumber: registeredNumber || null,
                reasonForCall,
                callDate: callDate || new Date(),
                callDuration: callDuration || 0,
                callSummary,
                callTranscription: transcription || 'No transcription available.',
                callId: callId || callSid,
                subject: subject,
                appointmentBooked: appointmentBooked,
                appointmentDetails: appointmentDetails
            });

            // ─── Send admin email ─────────────────────────────────────
            const result = await this.sendEmailViaGmailAPI({
                to: toEmail,
                subject: subject,
                html: bodyHtml
            });

            // ─── Save admin email log ───────────────────────────────
            await this.saveEmailLog({
                callSid,
                callId,
                toEmail,
                fromEmail,
                subject,
                bodyHtml,
                callerName,
                callerNumber: callerNumber || 'Unknown',
                reasonForCall,
                callSummary,
                callTranscription: transcription || '',
                callDate: callDate || new Date(),
                callDuration: callDuration || 0,
                patientId: patientId || null,
                hospitalId: hospitalId || null
            });

            console.log(`   ✅ Admin email sent successfully!`);

            // ─── If appointment was booked and caller has email, send confirmation ───
            if (appointmentBooked && callerEmail) {
                console.log(`   📧 Attempting to send appointment confirmation to caller: ${callerEmail}`);
                try {
                    const confirmResult = await this.sendAppointmentConfirmationEmail({
                        toEmail: callerEmail,
                        patientName: callerName,
                        petName: appointmentDetails?.petName || 'Your pet',
                        appointmentType: appointmentDetails?.appointmentType || 'Consultation',
                        appointmentDate: appointmentDetails?.date || new Date().toISOString().split('T')[0],
                        appointmentTime: appointmentDetails?.time || '09:00 AM',
                        callSid: callSid,
                        appointmentId: appointmentDetails?.appointmentId || null,
                        hospitalId: hospitalId
                    });
                    console.log(`   ✅ Appointment confirmation email sent to caller (${callerEmail})`);
                    // You could log a separate record for the patient email if needed.
                } catch (confirmErr) {
                    console.error(`   ❌ Failed to send appointment confirmation to caller: ${confirmErr.message}`);
                    // Log the error but don't fail the whole process.
                }
            } else {
                console.log(`   ℹ️ No caller email or no appointment booked - skipping patient confirmation.`);
            }

            return { success: true, messageId: result.messageId };

        } catch (error) {
            logger.error('Error sending email:', error);

            // Save failed email log
            await this.saveFailedEmailLog({
                callSid,
                callId,
                toEmail: await this.getRecipientEmail(),
                fromEmail: await this.getSenderEmail(),
                callerName: providedCallerName || 'Unknown',
                callerNumber: callerNumber || 'Unknown',
                reasonForCall: providedReasonForCall || 'Query Purpose',
                patientId: patientId || null,
                hospitalId: hospitalId || null
            }, error.message);

            return { success: false, error: error.message };
        }
    }

    // ============================================
    // UPDATED: Send appointment confirmation email WITH hospital_id
    // ✅ FIX: callId set to null (UUID error fix)
    // ============================================
    static async sendAppointmentConfirmationEmail({ toEmail, patientName, petName, appointmentType, appointmentDate, appointmentTime, callSid, appointmentId, hospitalId }) {
        try {
            const subject = `Appointment Confirmation | Broadlands Pet Hospita`;
            
            const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const html = buildAppointmentConfirmationEmail({
                patientName: patientName,
                petName: petName,
                appointmentDate: formattedDate,
                appointmentTime: appointmentTime,
                appointmentType: appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1),
                vetName: null,
                additionalNotes: null
            });

            const fromEmail = await this.getSenderEmail();

            const result = await this.sendEmailViaGmailAPI({
                to: toEmail,
                subject: subject,
                html: html
            });

            // ✅ Save log with hospital_id
            // 🔥 FIX: callId must be null (UUID column, numeric appointment ID is invalid)
            await this.saveEmailLog({
                callSid: callSid || null,
                callId: null,  // ← FIXED: was String(appointmentId) causing UUID error
                toEmail: toEmail,
                fromEmail: fromEmail,
                subject: subject,
                bodyHtml: html,
                callerName: patientName,
                callerNumber: null,
                reasonForCall: 'Appointment Confirmation',
                callSummary: `Appointment confirmation for ${petName} on ${appointmentDate} at ${appointmentTime}`,
                callTranscription: null,
                callDate: new Date(),
                callDuration: 0,
                patientId: null,
                hospitalId: hospitalId || null
            });

            console.log(`✅ Appointment confirmation email sent to patient: ${toEmail} (hospital_id: ${hospitalId || 'NULL'})`);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            logger.error('Error sending appointment confirmation email:', error);

            // ✅ Fix: callId null in failed log as well
            await this.saveFailedEmailLog({
                callSid: callSid || null,
                callId: null,  // ← FIXED: was String(appointmentId)
                toEmail: toEmail,
                fromEmail: await this.getSenderEmail(),
                subject: `Appointment Confirmation | Broadlands Pet Hospita`,
                callerName: patientName,
                callerNumber: null,
                reasonForCall: 'Appointment Confirmation',
                patientId: null,
                hospitalId: hospitalId || null
            }, error.message);

            throw error;
        }
    }

    // Get all email logs
    static async getEmailLogs() {
        try {
            const result = await executeQuery(
                `SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100`
            );
            return result.rows || [];
        } catch (error) {
            logger.error('Error fetching email logs:', error);
            return [];
        }
    }

    // Get email config
    static async getEmailConfig() {
        try {
            const result = await executeQuery(
                `SELECT * FROM email_config ORDER BY created_at DESC`
            );
            return result.rows || [];
        } catch (error) {
            logger.error('Error fetching email config:', error);
            return [];
        }
    }

    // Save email config
    static async saveEmailConfig(configData) {
        try {
            await executeQuery(`UPDATE email_config SET is_active = false`);

            const result = await executeQuery(
                `INSERT INTO email_config (
                    smtp_host, smtp_port, smtp_username, smtp_password,
                    from_email, to_email, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, true)
                RETURNING *`,
                [
                    configData.smtp_host,
                    configData.smtp_port,
                    configData.smtp_username,
                    configData.smtp_password,
                    configData.from_email,
                    configData.to_email
                ]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('Error saving email config:', error);
            throw error;
        }
    }

    // Update email config
    static async updateEmailConfig(id, configData) {
        try {
            const result = await executeQuery(
                `UPDATE email_config SET
                    smtp_host = $1, smtp_port = $2, smtp_username = $3,
                    smtp_password = $4, from_email = $5, to_email = $6,
                    is_active = $7, updated_at = NOW()
                WHERE id = $8
                RETURNING *`,
                [
                    configData.smtp_host,
                    configData.smtp_port,
                    configData.smtp_username,
                    configData.smtp_password,
                    configData.from_email,
                    configData.to_email,
                    configData.is_active !== undefined ? configData.is_active : true,
                    id
                ]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating email config:', error);
            throw error;
        }
    }

    // Delete email config
    static async deleteEmailConfig(id) {
        try {
            await executeQuery(`DELETE FROM email_config WHERE id = $1`, [id]);
            return true;
        } catch (error) {
            logger.error('Error deleting email config:', error);
            throw error;
        }
    }
}

module.exports = EmailService;