
const EmailService = require('../services/emailService');
const logger = require('../utils/logger');

const { buildAppointmentConfirmationEmail } = require('../emailTemplate/appointment_Confirmation');
const { buildAppointmentCancellationEmail } = require('../emailTemplate/appointment_Cancellation');
const { buildCallInterruptedEmail } = require('../emailTemplate/call_Interrupted');
const { buildQuerySubmittedEmail } = require('../emailTemplate/query_Submitted');

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get all email logs (Admin only)
 * GET /api/email/logs
 */
exports.getEmailLogs = async (req, res) => {
    try {
        const logs = await EmailService.getEmailLogs();
        
        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
        
    } catch (error) {
        logger.error('Error fetching email logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch email logs'
        });
    }
};

/**
 * Get email configuration (Admin only)
 * GET /api/email/config
 */
exports.getEmailConfig = async (req, res) => {
    try {
        const configs = await EmailService.getEmailConfig();
        
        res.json({
            success: true,
            data: configs,
            count: configs.length
        });
        
    } catch (error) {
        logger.error('Error fetching email config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch email configuration'
        });
    }
};

/**
 * Save new email configuration (Admin only)
 * POST /api/email/config
 */
exports.saveEmailConfig = async (req, res) => {
    try {
        const configData = req.body;
        
        if (!configData.smtp_host || !configData.smtp_port || 
            !configData.smtp_username || !configData.smtp_password ||
            !configData.from_email || !configData.to_email) {
            return res.status(400).json({
                success: false,
                error: 'All SMTP fields are required'
            });
        }
        
        const config = await EmailService.saveEmailConfig(configData);
        
        res.json({
            success: true,
            data: config,
            message: 'Email configuration saved successfully'
        });
        
    } catch (error) {
        logger.error('Error saving email config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save email configuration'
        });
    }
};

/**
 * Update email configuration (Admin only)
 * PUT /api/email/config/:id
 */
exports.updateEmailConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const configData = req.body;
        
        const config = await EmailService.updateEmailConfig(id, configData);
        
        res.json({
            success: true,
            data: config,
            message: 'Email configuration updated successfully'
        });
        
    } catch (error) {
        logger.error('Error updating email config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update email configuration'
        });
    }
};

/**
 * Delete email configuration (Admin only)
 * DELETE /api/email/config/:id
 */
exports.deleteEmailConfig = async (req, res) => {
    try {
        const { id } = req.params;
        
        await EmailService.deleteEmailConfig(id);
        
        res.json({
            success: true,
            message: 'Email configuration deleted successfully'
        });
        
    } catch (error) {
        logger.error('Error deleting email config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete email configuration'
        });
    }
};

/**
 * Test email configuration (Admin only)
 * POST /api/email/test
 */
exports.testEmailConfig = async (req, res) => {
    try {
        const transporter = await EmailService.createTransporter();
        const toEmail = await EmailService.getRecipientEmail();
        const fromEmail = await EmailService.getSenderEmail();
        
        await transporter.sendMail({
            from: fromEmail,
            to: toEmail,
            subject: 'Test Email - Broadlands Pet Hospital',
            html: `
                <h2>✅ Email Configuration Test</h2>
                <p>This is a test email from Broadlands Pet Hospital calling system.</p>
                <p>If you received this, your SMTP configuration is working correctly!</p>
                <br>
                <p><strong>Configuration Details:</strong></p>
                <ul>
                    <li>SMTP Host: ${transporter.options.host}</li>
                    <li>SMTP Port: ${transporter.options.port}</li>
                    <li>From: ${fromEmail}</li>
                    <li>To: ${toEmail}</li>
                </ul>
                <br>
                <p><em>Sent at: ${new Date().toLocaleString()}</em></p>
            `
        });
        
        res.json({
            success: true,
            message: 'Test email sent successfully'
        });
        
    } catch (error) {
        logger.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            error: `Failed to send test email: ${error.message}`
        });
    }
};

/**
 * Send email tool (API key only – used by AI/VAPI)
 * POST /api/email/sendEmailTool
 */
// exports.sendEmailTool = async (req, res) => {
//     try {
//         // Extract all fields from body
//         const { to, subject, type, hospital_id, ...data } = req.body;

//         // Validate required top-level fields
//         if (!to) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Recipient email (to) is required'
//             });
//         }

//         if (!type) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Type is required (e.g., appointment_booked, appointment_cancel, call_interrupted, query_submitted)'
//             });
//         }

//         // Validate hospital_id if provided
//         let hospitalId = null;
//         if (hospital_id !== undefined) {
//             hospitalId = parseInt(hospital_id, 10);
//             if (isNaN(hospitalId)) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'hospital_id must be a valid number'
//                 });
//             }
//         }

//         // Build HTML based on type, passing the extracted data object
//         let html;
//         let generatedSubject = subject;

//         switch (type) {
//             case 'appointment_booked':
//                 html = buildAppointmentConfirmationEmail(data);
//                 generatedSubject = generatedSubject || 'Appointment Confirmation | Broadlands Pet Hospital';
//                 break;
//             case 'appointment_cancel':
//                 html = buildAppointmentCancellationEmail(data);
//                 generatedSubject = generatedSubject || 'Appointment Cancellation | Broadlands Pet Hospital';
//                 break;
//             case 'call_interrupted':
//                 html = buildCallInterruptedEmail(data);
//                 generatedSubject = generatedSubject || 'Call Interrupted | Broadlands Pet Hospital';
//                 break;
//             case 'query_submitted':
//                 html = buildQuerySubmittedEmail(data);
//                 generatedSubject = generatedSubject || 'Query Received | Broadlands Pet Hospital';
//                 break;
//             default:
//                 return res.status(400).json({
//                     success: false,
//                     error: `Invalid type: ${type}. Allowed: appointment_booked, appointment_cancel, call_interrupted, query_submitted`
//                 });
//         }

//         const finalSubject = generatedSubject || 'Message from Broadlands Pet Hospital';

//         // Send email
//         const result = await EmailService.sendEmailViaGmailAPI({
//             to,
//             subject: finalSubject,
//             html,
//             hospitalId: hospitalId 
//         });

//         // Save log with hospital_id if provided
//         await EmailService.saveEmailLog({
//             callSid: null,
//             callId: null,
//             toEmail: to,
//             fromEmail: await EmailService.getSenderEmail(),
//             subject: finalSubject,
//             bodyHtml: html,
//             callerName: data?.patientName || 'Unknown',
//             callerNumber: null,
//             reasonForCall: type.replace('_', ' ').toUpperCase(),
//             callSummary: `Automated email for ${type}`,
//             callTranscription: null,
//             callDate: new Date(),
//             callDuration: 0,
//             patientId: null,
//             hospitalId: hospitalId
//         });

//         return res.status(200).json({
//             success: true,
//             message: 'Email sent successfully',
//             data: {
//                 to,
//                 subject: finalSubject,
//                 type,
//                 hospital_id: hospitalId,
//                 messageId: result.messageId
//             }
//         });

//     } catch (error) {
//         logger.error('Error in sendEmailTool:', error);
//         return res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// };




exports.sendEmailTool = async (req, res) => {
    try {
        // Extract all fields from body
        const { to, subject, type, hospital_id, ...data } = req.body;

        // Validate required top-level fields
        if (!to) {
            return res.status(400).json({
                success: false,
                error: 'Recipient email (to) is required'
            });
        }

        if (!type) {
            return res.status(400).json({
                success: false,
                error: 'Type is required (e.g., appointment_booked, appointment_cancel, call_interrupted, query_submitted)'
            });
        }

        // ✅ hospital_id is now REQUIRED
        if (hospital_id === undefined || hospital_id === null) {
            return res.status(400).json({
                success: false,
                error: 'hospital_id is required'
            });
        }

        // Validate hospital_id is a valid number
        let hospitalId = parseInt(hospital_id, 10);
        if (isNaN(hospitalId)) {
            return res.status(400).json({
                success: false,
                error: 'hospital_id must be a valid number'
            });
        }

        // Build HTML based on type, passing the extracted data object
        let html;
        let generatedSubject = subject;

        switch (type) {
            case 'appointment_booked':
                html = buildAppointmentConfirmationEmail(data);
                generatedSubject = generatedSubject || 'Appointment Confirmation | Broadlands Pet Hospital';
                break;
            case 'appointment_cancel':
                html = buildAppointmentCancellationEmail(data);
                generatedSubject = generatedSubject || 'Appointment Cancellation | Broadlands Pet Hospital';
                break;
            case 'call_interrupted':
                html = buildCallInterruptedEmail(data);
                generatedSubject = generatedSubject || 'Call Interrupted | Broadlands Pet Hospital';
                break;
            case 'query_submitted':
                html = buildQuerySubmittedEmail(data);
                generatedSubject = generatedSubject || 'Query Received | Broadlands Pet Hospital';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: `Invalid type: ${type}. Allowed: appointment_booked, appointment_cancel, call_interrupted, query_submitted`
                });
        }

        const finalSubject = generatedSubject || 'Message from Broadlands Pet Hospital';

        // Send email – pass hospitalId
        const result = await EmailService.sendEmailViaGmailAPI({
            to,
            subject: finalSubject,
            html,
            hospitalId: hospitalId
        });

        // Save log with hospital_id
        await EmailService.saveEmailLog({
            callSid: null,
            callId: null,
            toEmail: to,
            fromEmail: await EmailService.getSenderEmail(hospitalId),
            subject: finalSubject,
            bodyHtml: html,
            callerName: data?.patientName || 'Unknown',
            callerNumber: null,
            reasonForCall: type.replace('_', ' ').toUpperCase(),
            callSummary: `Automated email for ${type}`,
            callTranscription: null,
            callDate: new Date(),
            callDuration: 0,
            patientId: null,
            hospitalId: hospitalId
        });

        return res.status(200).json({
            success: true,
            message: 'Email sent successfully',
            data: {
                to,
                subject: finalSubject,
                type,
                hospital_id: hospitalId,
                messageId: result.messageId
            }
        });

    } catch (error) {
        logger.error('Error in sendEmailTool:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};