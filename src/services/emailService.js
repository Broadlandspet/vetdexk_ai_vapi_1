// const { google } = require('googleapis');
// const { executeQuery } = require('../config/database');
// const logger = require('../utils/logger');
// const env = require('../config/env');
// const { buildAppointmentConfirmationEmail } = require('../emailTemplate/appointment_Confirmation');
// const { buildAdminCallTranscriptionEmail } = require('../emailTemplate/admin_call_transcription');

// class EmailService {

//     // Get active email configuration from database
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

//     // Get OAuth2 Client
//     static getOAuth2Client() {
//         const env = require('../config/env');

//         const clientId = env.GMAIL_CLIENT_ID;
//         const clientSecret = env.GMAIL_CLIENT_SECRET;
//         const refreshToken = env.GMAIL_REFRESH_TOKEN;

//         if (!clientId || !clientSecret || !refreshToken) {
//             logger.warn('Missing Gmail OAuth2 credentials - email will not be sent');
//             return null;
//         }

//         const oAuth2Client = new google.auth.OAuth2(
//             clientId,
//             clientSecret,
//             'https://developers.google.com/oauthplayground'
//         );

//         oAuth2Client.setCredentials({
//             refresh_token: refreshToken
//         });

//         return oAuth2Client;
//     }

//     // Send email using Gmail API
//     static async sendEmailViaGmailAPI({ to, subject, html }) {
//         try {
//             const oAuth2Client = this.getOAuth2Client();

//             if (!oAuth2Client) {
//                 throw new Error('OAuth2 client not configured');
//             }

//             const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
//             const fromEmail = env.GMAIL_FROM_EMAIL || env.GOOGLE_EMAIL || 'noreply@broadlandspet.com';

//             // Build raw email
//             const emailLines = [
//                 `From: "Broadlands Pet Hospital" <${fromEmail}>`,
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

//             logger.info(`Email sent via Gmail API: ${result.data.id}`);
//             return { messageId: result.data.id };

//         } catch (error) {
//             logger.error('Error sending email via Gmail API:', error);
//             throw error;
//         }
//     }

//     // Simple email sender (fallback)
//     static async sendSimpleEmail({ to, subject, html, text }) {
//         try {
//             const oAuth2Client = this.getOAuth2Client();

//             if (oAuth2Client) {
//                 try {
//                     const result = await this.sendEmailViaGmailAPI({ to, subject, html });
//                     return { success: true, messageId: result.messageId };
//                 } catch (gmailError) {
//                     logger.warn(`Gmail API failed: ${gmailError.message}`);
//                 }
//             }

//             logger.info(`[EMAIL FALLBACK] To: ${to}, Subject: ${subject}`);
//             return {
//                 success: true,
//                 messageId: `fallback-${Date.now()}`,
//                 note: 'Email logged to console'
//             };

//         } catch (error) {
//             logger.error('Error sending simple email:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     // Get recipient email (admin)
//     static async getRecipientEmail() {
//         const config = await this.getActiveConfig();
//         if (config && config.to_email) {
//             return config.to_email;
//         }
//         return env.ADMIN_EMAIL || 'admin@broadlandspet.com';
//     }

//     // Get sender email
//     static async getSenderEmail() {
//         const config = await this.getActiveConfig();
//         if (config && config.from_email) {
//             return config.from_email;
//         }
//         return env.GMAIL_FROM_EMAIL || env.GOOGLE_EMAIL || 'noreply@broadlandspet.com';
//     }

//     // Extract caller name from transcript (fallback only – now rarely used because controller provides name)
//     static extractCallerName(transcript) {
//         if (!transcript) return 'Unknown';

//         const namePatterns = [
//             /Welcome back[, ]+([A-Za-z]+ [A-Za-z]+)/i,
//             /Patient name[, ]+([A-Za-z]+ [A-Za-z]+)/i,
//             /my name is (\w+)/i,
//             /I am (\w+)/i,
//             /I'm (\w+)/i,
//             /this is (\w+)/i,
//             /Welcome back[,\s]+(\w+)/i
//         ];

//         for (const pattern of namePatterns) {
//             const match = transcript.match(pattern);
//             if (match && match[1]) {
//                 return match[1].trim();
//             }
//         }
//         return 'Unknown';
//     }

//     // Extract reason for call from transcript (fallback only)
//     static extractReasonForCall(transcript) {
//         if (!transcript) return 'Query Purpose';

//         const lowerTranscript = transcript.toLowerCase();

//         if (lowerTranscript.includes('surgery')) return 'Surgery';
//         if (lowerTranscript.includes('vaccination')) return 'Vaccination';
//         if (lowerTranscript.includes('consultation')) return 'Consultation';
//         if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
//         if (lowerTranscript.includes('appointment') || lowerTranscript.includes('book')) return 'Appointment Booking';

//         return 'Query Purpose';
//     }

//     // Extract appointment type from transcript (subject line helper) – deprecated in favor of direct flag
//     static extractAppointmentType(transcript) {
//         if (!transcript) return null;
//         const lowerTranscript = transcript.toLowerCase();
//         if (lowerTranscript.includes('surgery')) return 'Surgery';
//         if (lowerTranscript.includes('vaccination')) return 'Vaccination';
//         if (lowerTranscript.includes('consultation')) return 'Consultation';
//         if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
//         return null;
//     }

//     // Check if appointment was actually booked (fallback) – replaced by direct flag
//     static wasAppointmentBooked(transcript) {
//         if (!transcript) return false;
//         const lowerTranscript = transcript.toLowerCase();
//         if (lowerTranscript.includes('appointment booked successfully') ||
//             lowerTranscript.includes('you\'re all set') ||
//             lowerTranscript.includes('your appointment has been booked') ||
//             lowerTranscript.includes('excellent! you\'re all set')) {
//             return true;
//         }
//         return false;
//     }

//     // Extract booked appointment type from transcript – deprecated
//     static extractBookedAppointmentType(transcript) {
//         if (!transcript) return null;
//         const lowerTranscript = transcript.toLowerCase();
//         if (lowerTranscript.includes('consultation')) return 'Consultation';
//         if (lowerTranscript.includes('vaccination')) return 'Vaccination';
//         if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
//         if (lowerTranscript.includes('surgery')) return 'Surgery';
//         return null;
//     }

//     // Generate dynamic subject line based on appointmentBooked flag
//     // If appointmentBooked is true, use booking subject, else general.
//     static generateSubjectLine(appointmentBooked, appointmentType = null) {
//         console.log('✅✅✅ NEW EMAIL TEMPLATE IS BEING USED! ✅✅✅');
//         console.log(`   Subject generated at: ${new Date().toISOString()}`);

//         if (appointmentBooked) {
//             const type = appointmentType ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1) : 'Appointment';
//             console.log(`   Appointment Booked: YES - Type: ${type}`);
//             return `Call Logs for Appointment Booking | Broadlands Pet Hospital`;
//         }

//         console.log(`   Appointment Booked: NO - Using general subject`);
//         return `Call Logs for User Query Summary | Broadlands Pet Hospital`;
//     }

//     // Generate call summary
//     static generateSummary(transcript, reasonForCall, callerName) {
//         if (!transcript) return 'No transcript available for summary.';

//         const summaries = {
//             'Surgery': `${callerName} called to inquire about surgery services. Surgery appointments cannot be booked over the phone and require an in-person visit or call to the main office.`,
//             'Vaccination': `${callerName} called to book a vaccination appointment for their pet.`,
//             'Consultation': `${callerName} called regarding a consultation appointment.`,
//             'Follow-Up': `${callerName} called for a follow-up appointment.`,
//             'Appointment Booking': `${callerName} called to book an appointment.`,
//             'Query Purpose': `${callerName} called Broadlands Pet Hospital for a general inquiry.`
//         };
//         return summaries[reasonForCall] || summaries['Query Purpose'];
//     }

//     // ============================================
//     // ✅ UPDATED: Save email log WITH hospital_id
//     // ============================================
//     static async saveEmailLog(data) {
//         console.log(`🔍🔍🔍 DEBUG - patientId received in saveEmailLog: ${data.patientId}`);
//         console.log(`🔍🔍🔍 DEBUG - hospitalId received in saveEmailLog: ${data.hospitalId || 'NULL'}`);
//         console.log(`🔍🔍🔍 DEBUG - Full data:`, JSON.stringify({
//             callSid: data.callSid,
//             callId: data.callId,
//             patientId: data.patientId,
//             hospitalId: data.hospitalId
//         }));
//         try {
//             const result = await executeQuery(
//                 `INSERT INTO email_logs (
//                 call_sid, call_id, patient_id, to_email, from_email, subject,
//                 body_html, caller_name, caller_number, reason_for_call,
//                 call_summary, call_transcription, call_date, call_duration,
//                 status, sent_at, hospital_id
//             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
//             RETURNING id`,
//                 [
//                     data.callSid || null,
//                     data.callId || null,
//                     data.patientId || null,
//                     data.toEmail,
//                     data.fromEmail,
//                     data.subject,
//                     data.bodyHtml,
//                     data.callerName || 'Unknown',
//                     data.callerNumber || 'Unknown',
//                     data.reasonForCall || 'Query Purpose',
//                     data.callSummary || '',
//                     data.callTranscription || '',
//                     data.callDate || new Date(),
//                     Math.round(data.callDuration || 0),
//                     'sent',
//                     new Date(),
//                     data.hospitalId || null   // ✅ Added hospital_id
//                 ]
//             );

//             logger.info(`Email log saved: ${result.rows[0].id} (hospital_id: ${data.hospitalId || 'NULL'})`);
//             return result.rows[0].id;

//         } catch (error) {
//             logger.error('Error saving email log:', error);
//             return null;
//         }
//     }

//     // ============================================
//     // ✅ UPDATED: Save failed email log WITH hospital_id
//     // ============================================
//     static async saveFailedEmailLog(data, errorMessage) {
//         try {
//             await executeQuery(
//                 `INSERT INTO email_logs (
//                 call_sid, call_id, patient_id, to_email, from_email, subject,
//                 caller_name, caller_number, reason_for_call,
//                 status, error_message, created_at, hospital_id
//             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)`,
//                 [
//                     data.callSid || null,
//                     data.callId || null,
//                     data.patientId || null,
//                     data.toEmail,
//                     data.fromEmail,
//                     data.subject || 'Call Summary',
//                     data.callerName || 'Unknown',
//                     data.callerNumber || 'Unknown',
//                     data.reasonForCall || 'Query Purpose',
//                     'failed',
//                     errorMessage,
//                     data.hospitalId || null   // ✅ Added hospital_id
//                 ]
//             );
//             logger.info(`Failed email log saved with hospital_id: ${data.hospitalId || 'NULL'}`);
//         } catch (error) {
//             logger.error('Error saving failed email log:', error);
//         }
//     }

//     // ============================================
//     // ✅ UPDATED: Main function - sendCallSummaryEmail WITH hospital_id + appointment detection
//     // ============================================
//     static async sendCallSummaryEmail(callData) {
//         console.log('✅✅✅ sendCallSummaryEmail() - NEW TEMPLATE IS BEING USED! ✅✅✅');

//         const {
//             callSid,
//             callId,
//             callerNumber,
//             transcription,
//             callDuration,
//             callDate,
//             recordingUrl,
//             patientId,
//             registeredNumber,
//             appointmentType,
//             callerName: providedCallerName,
//             reasonForCall: providedReasonForCall,
//             hospitalId,
//             // ─── NEW FIELDS ──────────────────────────────
//             appointmentBooked = false,
//             appointmentDetails = null,
//             callerEmail = null
//         } = callData;

//         try {
//             const callerName = providedCallerName ||
//                 (transcription ? this.extractCallerName(transcription) : 'Unknown');

//             let reasonForCall = providedReasonForCall;
//             if (!reasonForCall) {
//                 if (appointmentType && appointmentType !== 'null') {
//                     reasonForCall = appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1);
//                 } else {
//                     reasonForCall = transcription ? this.extractReasonForCall(transcription) : 'Query Purpose';
//                 }
//             }

//             const callSummary = this.generateSummary(transcription, reasonForCall, callerName);
            
//             // ─── Generate subject based on appointmentBooked flag ───
//             const subject = this.generateSubjectLine(appointmentBooked, appointmentDetails?.appointmentType || appointmentType);

//             const toEmail = await this.getRecipientEmail();
//             const fromEmail = await this.getSenderEmail();

//             console.log(`   Email Subject: ${subject}`);
//             console.log(`   Sending to: ${toEmail}`);
//             console.log(`   Hospital ID: ${hospitalId || 'NULL'}`);
//             console.log(`   Appointment Booked: ${appointmentBooked ? 'YES' : 'NO'}`);

//             // ─── Build admin email template using the extracted template function ──
//             const bodyHtml = buildAdminCallTranscriptionEmail({
//                 callerName,
//                 callerNumber: callerNumber || 'Unknown',
//                 registeredNumber: registeredNumber || null,
//                 reasonForCall,
//                 callDate: callDate || new Date(),
//                 callDuration: callDuration || 0,
//                 callSummary,
//                 callTranscription: transcription || 'No transcription available.',
//                 callId: callId || callSid,
//                 subject: subject,
//                 appointmentBooked: appointmentBooked,
//                 appointmentDetails: appointmentDetails
//             });

//             // ─── Send admin email ─────────────────────────────────────
//             const result = await this.sendEmailViaGmailAPI({
//                 to: toEmail,
//                 subject: subject,
//                 html: bodyHtml
//             });

//             // ─── Save admin email log ───────────────────────────────
//             await this.saveEmailLog({
//                 callSid,
//                 callId,
//                 toEmail,
//                 fromEmail,
//                 subject,
//                 bodyHtml,
//                 callerName,
//                 callerNumber: callerNumber || 'Unknown',
//                 reasonForCall,
//                 callSummary,
//                 callTranscription: transcription || '',
//                 callDate: callDate || new Date(),
//                 callDuration: callDuration || 0,
//                 patientId: patientId || null,
//                 hospitalId: hospitalId || null
//             });

//             console.log(`   ✅ Admin email sent successfully!`);

//             // ─── If appointment was booked and caller has email, send confirmation ───
//             if (appointmentBooked && callerEmail) {
//                 console.log(`   📧 Attempting to send appointment confirmation to caller: ${callerEmail}`);
//                 try {
//                     const confirmResult = await this.sendAppointmentConfirmationEmail({
//                         toEmail: callerEmail,
//                         patientName: callerName,
//                         petName: appointmentDetails?.petName || 'Your pet',
//                         appointmentType: appointmentDetails?.appointmentType || 'Consultation',
//                         appointmentDate: appointmentDetails?.date || new Date().toISOString().split('T')[0],
//                         appointmentTime: appointmentDetails?.time || '09:00 AM',
//                         callSid: callSid,
//                         appointmentId: appointmentDetails?.appointmentId || null,
//                         hospitalId: hospitalId
//                     });
//                     console.log(`   ✅ Appointment confirmation email sent to caller (${callerEmail})`);
//                 } catch (confirmErr) {
//                     console.error(`   ❌ Failed to send appointment confirmation to caller: ${confirmErr.message}`);
//                 }
//             } else {
//                 console.log(`   ℹ️ No caller email or no appointment booked - skipping patient confirmation.`);
//             }

//             return { success: true, messageId: result.messageId };

//         } catch (error) {
//             logger.error('Error sending email:', error);

//             // Save failed email log
//             await this.saveFailedEmailLog({
//                 callSid,
//                 callId,
//                 toEmail: await this.getRecipientEmail(),
//                 fromEmail: await this.getSenderEmail(),
//                 callerName: providedCallerName || 'Unknown',
//                 callerNumber: callerNumber || 'Unknown',
//                 reasonForCall: providedReasonForCall || 'Query Purpose',
//                 patientId: patientId || null,
//                 hospitalId: hospitalId || null
//             }, error.message);

//             return { success: false, error: error.message };
//         }
//     }

//     // ============================================
//     // UPDATED: Send appointment confirmation email WITH hospital_id
//     // ✅ FIX: callId set to null (UUID error fix)
//     // ============================================
//     static async sendAppointmentConfirmationEmail({ toEmail, patientName, petName, appointmentType, appointmentDate, appointmentTime, callSid, appointmentId, hospitalId }) {
//         try {
//             const subject = `Appointment Confirmation | Broadlands Pet Hospita`;
            
//             const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
//                 weekday: 'long',
//                 year: 'numeric',
//                 month: 'long',
//                 day: 'numeric'
//             });

//             const html = buildAppointmentConfirmationEmail({
//                 patientName: patientName,
//                 petName: petName,
//                 appointmentDate: formattedDate,
//                 appointmentTime: appointmentTime,
//                 appointmentType: appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1),
//                 vetName: null,
//                 additionalNotes: null
//             });

//             const fromEmail = await this.getSenderEmail();

//             const result = await this.sendEmailViaGmailAPI({
//                 to: toEmail,
//                 subject: subject,
//                 html: html
//             });

//             // ✅ Save log with hospital_id
//             // 🔥 FIX: callId must be null (UUID column, numeric appointment ID is invalid)
//             await this.saveEmailLog({
//                 callSid: callSid || null,
//                 callId: null,  // ← FIXED: was String(appointmentId) causing UUID error
//                 toEmail: toEmail,
//                 fromEmail: fromEmail,
//                 subject: subject,
//                 bodyHtml: html,
//                 callerName: patientName,
//                 callerNumber: null,
//                 reasonForCall: 'Appointment Confirmation',
//                 callSummary: `Appointment confirmation for ${petName} on ${appointmentDate} at ${appointmentTime}`,
//                 callTranscription: null,
//                 callDate: new Date(),
//                 callDuration: 0,
//                 patientId: null,
//                 hospitalId: hospitalId || null
//             });

//             console.log(`✅ Appointment confirmation email sent to patient: ${toEmail} (hospital_id: ${hospitalId || 'NULL'})`);
//             return { success: true, messageId: result.messageId };

//         } catch (error) {
//             logger.error('Error sending appointment confirmation email:', error);

//             // ✅ Fix: callId null in failed log as well
//             await this.saveFailedEmailLog({
//                 callSid: callSid || null,
//                 callId: null,  // ← FIXED: was String(appointmentId)
//                 toEmail: toEmail,
//                 fromEmail: await this.getSenderEmail(),
//                 subject: `Appointment Confirmation | Broadlands Pet Hospita`,
//                 callerName: patientName,
//                 callerNumber: null,
//                 reasonForCall: 'Appointment Confirmation',
//                 patientId: null,
//                 hospitalId: hospitalId || null
//             }, error.message);

//             throw error;
//         }
//     }

//     // Get all email logs
//     static async getEmailLogs() {
//         try {
//             const result = await executeQuery(
//                 `SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100`
//             );
//             return result.rows || [];
//         } catch (error) {
//             logger.error('Error fetching email logs:', error);
//             return [];
//         }
//     }

//     // Get email config
//     static async getEmailConfig() {
//         try {
//             const result = await executeQuery(
//                 `SELECT * FROM email_config ORDER BY created_at DESC`
//             );
//             return result.rows || [];
//         } catch (error) {
//             logger.error('Error fetching email config:', error);
//             return [];
//         }
//     }

//     // Save email config
//     static async saveEmailConfig(configData) {
//         try {
//             await executeQuery(`UPDATE email_config SET is_active = false`);

//             const result = await executeQuery(
//                 `INSERT INTO email_config (
//                     smtp_host, smtp_port, smtp_username, smtp_password,
//                     from_email, to_email, is_active
//                 ) VALUES ($1, $2, $3, $4, $5, $6, true)
//                 RETURNING *`,
//                 [
//                     configData.smtp_host,
//                     configData.smtp_port,
//                     configData.smtp_username,
//                     configData.smtp_password,
//                     configData.from_email,
//                     configData.to_email
//                 ]
//             );

//             return result.rows[0];
//         } catch (error) {
//             logger.error('Error saving email config:', error);
//             throw error;
//         }
//     }

//     // Update email config
//     static async updateEmailConfig(id, configData) {
//         try {
//             const result = await executeQuery(
//                 `UPDATE email_config SET
//                     smtp_host = $1, smtp_port = $2, smtp_username = $3,
//                     smtp_password = $4, from_email = $5, to_email = $6,
//                     is_active = $7, updated_at = NOW()
//                 WHERE id = $8
//                 RETURNING *`,
//                 [
//                     configData.smtp_host,
//                     configData.smtp_port,
//                     configData.smtp_username,
//                     configData.smtp_password,
//                     configData.from_email,
//                     configData.to_email,
//                     configData.is_active !== undefined ? configData.is_active : true,
//                     id
//                 ]
//             );

//             return result.rows[0];
//         } catch (error) {
//             logger.error('Error updating email config:', error);
//             throw error;
//         }
//     }

//     // Delete email config
//     static async deleteEmailConfig(id) {
//         try {
//             await executeQuery(`DELETE FROM email_config WHERE id = $1`, [id]);
//             return true;
//         } catch (error) {
//             logger.error('Error deleting email config:', error);
//             throw error;
//         }
//     }
// }

// module.exports = EmailService;











const { google } = require('googleapis');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const env = require('../config/env');
const { buildAppointmentConfirmationEmail } = require('../emailTemplate/appointment_Confirmation');
const { buildAdminCallTranscriptionEmail } = require('../emailTemplate/admin_call_transcription');

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get active email configuration from database
 */
exports.getActiveConfig = async () => {
    try {
        const result = await executeQuery(
            `SELECT * FROM email_config WHERE is_active = true LIMIT 1`
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Error fetching email config:', error);
        return null;
    }
};

/**
 * Get OAuth2 Client
 */
exports.getOAuth2Client = () => {
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
};

/**
 * Send email using Gmail API
 */
exports.sendEmailViaGmailAPI = async ({ to, subject, html }) => {
    try {
        const oAuth2Client = exports.getOAuth2Client();

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
};

/**
 * Simple email sender (fallback)
 */
exports.sendSimpleEmail = async ({ to, subject, html, text }) => {
    try {
        const oAuth2Client = exports.getOAuth2Client();

        if (oAuth2Client) {
            try {
                const result = await exports.sendEmailViaGmailAPI({ to, subject, html });
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
};

/**
 * Get recipient email (admin)
 */
exports.getRecipientEmail = async () => {
    const config = await exports.getActiveConfig();
    if (config && config.to_email) {
        return config.to_email;
    }
    return env.ADMIN_EMAIL || 'admin@broadlandspet.com';
};

/**
 * Get sender email
 */
exports.getSenderEmail = async () => {
    const config = await exports.getActiveConfig();
    if (config && config.from_email) {
        return config.from_email;
    }
    return env.GMAIL_FROM_EMAIL || env.GOOGLE_EMAIL || 'noreply@broadlandspet.com';
};

/**
 * Extract caller name from transcript (fallback)
 */
exports.extractCallerName = (transcript) => {
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
};

/**
 * Extract reason for call from transcript (fallback)
 */
exports.extractReasonForCall = (transcript) => {
    if (!transcript) return 'Query Purpose';

    const lowerTranscript = transcript.toLowerCase();

    if (lowerTranscript.includes('surgery')) return 'Surgery';
    if (lowerTranscript.includes('vaccination')) return 'Vaccination';
    if (lowerTranscript.includes('consultation')) return 'Consultation';
    if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
    if (lowerTranscript.includes('appointment') || lowerTranscript.includes('book')) return 'Appointment Booking';

    return 'Query Purpose';
};

/**
 * Extract appointment type from transcript (deprecated – kept for compatibility)
 */
exports.extractAppointmentType = (transcript) => {
    if (!transcript) return null;
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes('surgery')) return 'Surgery';
    if (lowerTranscript.includes('vaccination')) return 'Vaccination';
    if (lowerTranscript.includes('consultation')) return 'Consultation';
    if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
    return null;
};

/**
 * Check if appointment was booked (fallback)
 */
exports.wasAppointmentBooked = (transcript) => {
    if (!transcript) return false;
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes('appointment booked successfully') ||
        lowerTranscript.includes('you\'re all set') ||
        lowerTranscript.includes('your appointment has been booked') ||
        lowerTranscript.includes('excellent! you\'re all set')) {
        return true;
    }
    return false;
};

/**
 * Extract booked appointment type from transcript (deprecated)
 */
exports.extractBookedAppointmentType = (transcript) => {
    if (!transcript) return null;
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes('consultation')) return 'Consultation';
    if (lowerTranscript.includes('vaccination')) return 'Vaccination';
    if (lowerTranscript.includes('follow-up')) return 'Follow-Up';
    if (lowerTranscript.includes('surgery')) return 'Surgery';
    return null;
};

/**
 * Generate dynamic subject line based on appointmentBooked flag
 */
exports.generateSubjectLine = (appointmentBooked, appointmentType = null) => {
    console.log('✅✅✅ NEW EMAIL TEMPLATE IS BEING USED! ✅✅✅');
    console.log(`   Subject generated at: ${new Date().toISOString()}`);

    if (appointmentBooked) {
        const type = appointmentType ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1) : 'Appointment';
        console.log(`   Appointment Booked: YES - Type: ${type}`);
        return `Call Logs for Appointment Booking | Broadlands Pet Hospital`;
    }

    console.log(`   Appointment Booked: NO - Using general subject`);
    return `Call Logs for User Query Summary | Broadlands Pet Hospital`;
};

/**
 * Generate call summary
 */
exports.generateSummary = (transcript, reasonForCall, callerName) => {
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
};

/**
 * Save email log WITH hospital_id
 */
exports.saveEmailLog = async (data) => {
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
                data.hospitalId || null
            ]
        );

        logger.info(`Email log saved: ${result.rows[0].id} (hospital_id: ${data.hospitalId || 'NULL'})`);
        return result.rows[0].id;

    } catch (error) {
        logger.error('Error saving email log:', error);
        return null;
    }
};

/**
 * Save failed email log WITH hospital_id
 */
exports.saveFailedEmailLog = async (data, errorMessage) => {
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
                data.hospitalId || null
            ]
        );
        logger.info(`Failed email log saved with hospital_id: ${data.hospitalId || 'NULL'}`);
    } catch (error) {
        logger.error('Error saving failed email log:', error);
    }
};

/**
 * Main function – sendCallSummaryEmail WITH hospital_id + appointment detection
 */
exports.sendCallSummaryEmail = async (callData) => {
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
        appointmentBooked = false,
        appointmentDetails = null,
        callerEmail = null
    } = callData;

    try {
        const callerName = providedCallerName ||
            (transcription ? exports.extractCallerName(transcription) : 'Unknown');

        let reasonForCall = providedReasonForCall;
        if (!reasonForCall) {
            if (appointmentType && appointmentType !== 'null') {
                reasonForCall = appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1);
            } else {
                reasonForCall = transcription ? exports.extractReasonForCall(transcription) : 'Query Purpose';
            }
        }

        const callSummary = exports.generateSummary(transcription, reasonForCall, callerName);
        
        const subject = exports.generateSubjectLine(appointmentBooked, appointmentDetails?.appointmentType || appointmentType);

        const toEmail = await exports.getRecipientEmail();
        const fromEmail = await exports.getSenderEmail();

        console.log(`   Email Subject: ${subject}`);
        console.log(`   Sending to: ${toEmail}`);
        console.log(`   Hospital ID: ${hospitalId || 'NULL'}`);
        console.log(`   Appointment Booked: ${appointmentBooked ? 'YES' : 'NO'}`);

        const bodyHtml = buildAdminCallTranscriptionEmail({
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

        const result = await exports.sendEmailViaGmailAPI({
            to: toEmail,
            subject: subject,
            html: bodyHtml
        });

        await exports.saveEmailLog({
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

        if (appointmentBooked && callerEmail) {
            console.log(`   📧 Attempting to send appointment confirmation to caller: ${callerEmail}`);
            try {
                const confirmResult = await exports.sendAppointmentConfirmationEmail({
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
            } catch (confirmErr) {
                console.error(`   ❌ Failed to send appointment confirmation to caller: ${confirmErr.message}`);
            }
        } else {
            console.log(`   ℹ️ No caller email or no appointment booked - skipping patient confirmation.`);
        }

        return { success: true, messageId: result.messageId };

    } catch (error) {
        logger.error('Error sending email:', error);

        await exports.saveFailedEmailLog({
            callSid,
            callId,
            toEmail: await exports.getRecipientEmail(),
            fromEmail: await exports.getSenderEmail(),
            callerName: providedCallerName || 'Unknown',
            callerNumber: callerNumber || 'Unknown',
            reasonForCall: providedReasonForCall || 'Query Purpose',
            patientId: patientId || null,
            hospitalId: hospitalId || null
        }, error.message);

        return { success: false, error: error.message };
    }
};

/**
 * Send appointment confirmation email WITH hospital_id
 */
exports.sendAppointmentConfirmationEmail = async ({ toEmail, patientName, petName, appointmentType, appointmentDate, appointmentTime, callSid, appointmentId, hospitalId }) => {
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

        const fromEmail = await exports.getSenderEmail();

        const result = await exports.sendEmailViaGmailAPI({
            to: toEmail,
            subject: subject,
            html: html
        });

        await exports.saveEmailLog({
            callSid: callSid || null,
            callId: null,
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

        await exports.saveFailedEmailLog({
            callSid: callSid || null,
            callId: null,
            toEmail: toEmail,
            fromEmail: await exports.getSenderEmail(),
            subject: `Appointment Confirmation | Broadlands Pet Hospita`,
            callerName: patientName,
            callerNumber: null,
            reasonForCall: 'Appointment Confirmation',
            patientId: null,
            hospitalId: hospitalId || null
        }, error.message);

        throw error;
    }
};

/**
 * Get all email logs
 */
exports.getEmailLogs = async () => {
    try {
        const result = await executeQuery(
            `SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100`
        );
        return result.rows || [];
    } catch (error) {
        logger.error('Error fetching email logs:', error);
        return [];
    }
};

/**
 * Get email config
 */
exports.getEmailConfig = async () => {
    try {
        const result = await executeQuery(
            `SELECT * FROM email_config ORDER BY created_at DESC`
        );
        return result.rows || [];
    } catch (error) {
        logger.error('Error fetching email config:', error);
        return [];
    }
};

/**
 * Save email config
 */
exports.saveEmailConfig = async (configData) => {
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
};

/**
 * Update email config
 */
exports.updateEmailConfig = async (id, configData) => {
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
};

/**
 * Delete email config
 */
exports.deleteEmailConfig = async (id) => {
    try {
        await executeQuery(`DELETE FROM email_config WHERE id = $1`, [id]);
        return true;
    } catch (error) {
        logger.error('Error deleting email config:', error);
        throw error;
    }
};