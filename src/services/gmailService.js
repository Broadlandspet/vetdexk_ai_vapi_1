const { gmail } = require('../config/google');
const env = require('../config/env');

class GmailService {

    /**
     * Send appointment confirmation email
     */
    async sendConfirmationEmail(appointmentData) {
        try {
            const { patient_name, pet_name, pet_species, pet_breed, appointment_type, date, time } = appointmentData;

            const toEmail = env.ADMIN_EMAIL || 'abs@gmail.com';
            const fromEmail = env.GOOGLE_EMAIL || env.ADMIN_EMAIL || 'abs@gmail.com';

            const subject = `✅ Appointment Confirmed - ${pet_name} - ${date} at ${time}`;

            const htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="margin: 0;">✅ Appointment Confirmed</h2>
                    </div>
                    
                    <div style="padding: 20px;">
                        <h3>Broadlands Pet Hospital</h3>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Patient Name:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${patient_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Pet Name:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${pet_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Species:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${pet_species}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Breed:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${pet_breed}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Appointment Type:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${appointment_type.charAt(0).toUpperCase() + appointment_type.slice(1)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${time}</td>
                            </tr>
                        </table>
                        
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>📍 Address:</strong> 43150 Broadlands Center Plaza, Suite 184, Ashburn, Virginia 20148</p>
                            <p style="margin: 5px 0;"><strong>📞 Phone:</strong> 571-707-8844</p>
                        </div>
                        
                        <p style="color: #666;">Please arrive 10 minutes before your appointment time.</p>
                        
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">
                            This is an automated confirmation from Broadlands Pet Hospital.
                        </p>
                    </div>
                </div>
            `;

            const message = this._createMessage(fromEmail, toEmail, subject, htmlBody);
            const encodedMessage = this._encodeMessage(message);

            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage
                }
            });

            console.log(`Confirmation email sent: ${response.data.id}`);
            return {
                success: true,
                messageId: response.data.id,
                threadId: response.data.threadId
            };

        } catch (error) {
            console.error('Error sending confirmation email:', error.message);
            if (error.response) {
                console.error('Gmail API Error:', error.response.data);
            }
            throw new Error(`Failed to send confirmation email: ${error.message}`);
        }
    }

    /**
     * Send cancellation email
     */
    async sendCancellationEmail(appointmentData) {
        try {
            const { patient_name, pet_name, date, time } = appointmentData;

            const toEmail = env.ADMIN_EMAIL || 'abs@gmail.com';
            const fromEmail = env.GOOGLE_EMAIL || env.ADMIN_EMAIL || 'abs@gmail.com';

            const subject = `❌ Appointment Cancelled - ${pet_name} - ${date} at ${time}`;

            const htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="margin: 0;">❌ Appointment Cancelled</h2>
                    </div>
                    
                    <div style="padding: 20px;">
                        <h3>Broadlands Pet Hospital</h3>
                        <p>The following appointment has been <strong>cancelled</strong>:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Patient:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${patient_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Pet:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${pet_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${time}</td>
                            </tr>
                        </table>
                        
                        <p style="color: #666;">To reschedule, please call us or book online.</p>
                        <p style="color: #666;"><strong>📞</strong> 571-707-8844</p>
                    </div>
                </div>
            `;

            const message = this._createMessage(fromEmail, toEmail, subject, htmlBody);
            const encodedMessage = this._encodeMessage(message);

            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage
                }
            });

            console.log(`Cancellation email sent: ${response.data.id}`);
            return { success: true, messageId: response.data.id };

        } catch (error) {
            console.error('Error sending cancellation email:', error.message);
            throw new Error(`Failed to send cancellation email: ${error.message}`);
        }
    }

    /**
     * Create email message in RFC 2822 format
     */
    _createMessage(from, to, subject, htmlBody) {
        const message = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
            'Content-Type: text/html; charset=UTF-8',
            'MIME-Version: 1.0',
            '',
            htmlBody
        ].join('\r\n');

        return message;
    }

    /**
     * Encode message to base64 URL-safe format
     */
    _encodeMessage(message) {
        return Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
}

module.exports = new GmailService();