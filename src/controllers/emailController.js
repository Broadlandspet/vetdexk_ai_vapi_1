const EmailService = require('../services/emailService');
const logger = require('../utils/logger');

class EmailController {

    // Get all email logs
    static async getEmailLogs(req, res) {
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
    }

    // Get email configuration
    static async getEmailConfig(req, res) {
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
    }

    // Save new email configuration
    static async saveEmailConfig(req, res) {
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
    }

    // Update email configuration
    static async updateEmailConfig(req, res) {
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
    }

    // Delete email configuration
    static async deleteEmailConfig(req, res) {
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
    }

    // Test email configuration
    static async testEmailConfig(req, res) {
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
    }
}

module.exports = EmailController;