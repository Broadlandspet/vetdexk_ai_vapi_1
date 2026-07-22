
// // src/services/smsService.js
// const axios = require('axios');
// const logger = require('../utils/logger');
// const { executeQuery } = require('../config/database');

// class SmsService {

//     /**
//      * Format phone number to E.164 standard (+1xxxxxxxxxx for US)
//      */
//     static formatPhoneNumber(phone) {
//         if (!phone) return phone;
//         // Remove all non-digit characters
//         let cleaned = phone.replace(/\D/g, '');
//         // If it's 10 digits, prepend +1 (US/Canada)
//         if (cleaned.length === 10) {
//             return '+1' + cleaned;
//         }
//         // If it's 11 digits and starts with 1, prepend + and use as is
//         if (cleaned.length === 11 && cleaned.startsWith('1')) {
//             return '+' + cleaned;
//         }
//         // If it already starts with +, return as is
//         if (phone.startsWith('+')) {
//             return phone;
//         }
//         // Fallback: return original (might cause error but better than nothing)
//         return phone;
//     }

//     /**
//      * Send an SMS via Vapi's chat endpoint
//      * @param {Object} params
//      * @param {number} params.hospitalId - Hospital ID (fetches Vapi credentials from DB)
//      * @param {string} params.to - Recipient phone number (will be auto-formatted to E.164)
//      * @param {string} params.message - Text message to send
//      * @param {string} [params.transportType='twilio.sms'] - Transport type
//      * @param {boolean} [params.useLLMGenerated=false] - Whether to use LLM generation
//      * @returns {Promise<Object>} Vapi API response
//      */
//     static async sendSms({ hospitalId, to, message, transportType = 'twilio.sms', useLLMGenerated = false }) {
//         try {
//             if (!hospitalId) {
//                 throw new Error('hospitalId is required');
//             }
//             if (!to) {
//                 throw new Error('recipient phone number (to) is required');
//             }
//             if (!message) {
//                 throw new Error('message text is required');
//             }

//             // ─── Format phone number to E.164 ──────────────────────────
//             const formattedTo = this.formatPhoneNumber(to);
//             logger.info(`Phone number formatted: ${to} -> ${formattedTo}`);

//             // ─── Fetch Vapi credentials from hospitals table ────────────
//             const hospitalResult = await executeQuery(
//                 `SELECT 
//                     "VAPI_API_KEY",
//                     "Call_Assistant" as assistant_id,
//                     "VAPI_PHONE_NUMBER_ID"
//                  FROM hospitals 
//                  WHERE id = $1 AND is_active = true`,
//                 [hospitalId]
//             );

//             if (hospitalResult.rows.length === 0) {
//                 throw new Error(`Hospital ${hospitalId} not found or inactive`);
//             }

//             const config = hospitalResult.rows[0];
//             const vapiApiKey = config.VAPI_API_KEY;
//             const assistantId = config.assistant_id;
//             const phoneNumberId = config.VAPI_PHONE_NUMBER_ID;

//             if (!vapiApiKey) {
//                 throw new Error('Vapi API key not configured for this hospital');
//             }
//             if (!assistantId) {
//                 throw new Error('Vapi assistant ID not configured for this hospital');
//             }
//             if (!phoneNumberId) {
//                 throw new Error('Vapi phone number ID not configured for this hospital');
//             }

//             // ─── Build and send SMS ────────────────────────────────────
//             const payload = {
//                 assistantId,
//                 input: message,
//                 transport: {
//                     type: transportType,
//                     phoneNumberId,
//                     customer: {
//                         number: formattedTo   // ← Use formatted number
//                     },
//                     useLLMGeneratedMessageForOutbound: useLLMGenerated
//                 }
//             };

//             const response = await axios.post('https://api.vapi.ai/chat', payload, {
//                 headers: {
//                     'Authorization': `Bearer ${vapiApiKey}`,
//                     'Content-Type': 'application/json'
//                 }
//             });

//             logger.info(`SMS sent successfully to ${formattedTo}, Vapi chat ID: ${response.data.id}`);
//             return {
//                 success: true,
//                 data: response.data
//             };

//         } catch (error) {
//             let errorMsg = error.message;
//             if (error.response) {
//                 errorMsg = error.response.data ? JSON.stringify(error.response.data) : error.message;
//             } else if (error.request) {
//                 errorMsg = 'No response received from Vapi';
//             }
//             logger.error(`SMS sending failed: ${errorMsg}`);
//             return {
//                 success: false,
//                 error: errorMsg
//             };
//         }
//     }
// }

// module.exports = SmsService;











// src/services/smsService.js
const axios = require('axios');
const logger = require('../utils/logger');
const { executeQuery } = require('../config/database');

// ─── Internal helper functions ──────────────────────────────────────────────────

/**
 * Format phone number to E.164 standard (+1xxxxxxxxxx for US)
 */
function formatPhoneNumber(phone) {
    if (!phone) return phone;
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    // If it's 10 digits, prepend +1 (US/Canada)
    if (cleaned.length === 10) {
        return '+1' + cleaned;
    }
    // If it's 11 digits and starts with 1, prepend + and use as is
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return '+' + cleaned;
    }
    // If it already starts with +, return as is
    if (phone.startsWith('+')) {
        return phone;
    }
    // Fallback: return original (might cause error but better than nothing)
    return phone;
}

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Send an SMS via Vapi's chat endpoint
 * @param {Object} params
 * @param {number} params.hospitalId - Hospital ID (fetches Vapi credentials from DB)
 * @param {string} params.to - Recipient phone number (will be auto-formatted to E.164)
 * @param {string} params.message - Text message to send
 * @param {string} [params.transportType='twilio.sms'] - Transport type
 * @param {boolean} [params.useLLMGenerated=false] - Whether to use LLM generation
 * @returns {Promise<Object>} Vapi API response
 */
exports.sendSms = async function({ hospitalId, to, message, transportType = 'twilio.sms', useLLMGenerated = false }) {
    try {
        if (!hospitalId) {
            throw new Error('hospitalId is required');
        }
        if (!to) {
            throw new Error('recipient phone number (to) is required');
        }
        if (!message) {
            throw new Error('message text is required');
        }

        // ─── Format phone number to E.164 ──────────────────────────
        const formattedTo = formatPhoneNumber(to);
        logger.info(`Phone number formatted: ${to} -> ${formattedTo}`);

        // ─── Fetch Vapi credentials from hospitals table ────────────
        const hospitalResult = await executeQuery(
            `SELECT 
                "VAPI_API_KEY",
                "Call_Assistant" as assistant_id,
                "VAPI_PHONE_NUMBER_ID"
             FROM hospitals 
             WHERE id = $1 AND is_active = true`,
            [hospitalId]
        );

        if (hospitalResult.rows.length === 0) {
            throw new Error(`Hospital ${hospitalId} not found or inactive`);
        }

        const config = hospitalResult.rows[0];
        const vapiApiKey = config.VAPI_API_KEY;
        const assistantId = config.assistant_id;
        const phoneNumberId = config.VAPI_PHONE_NUMBER_ID;

        if (!vapiApiKey) {
            throw new Error('Vapi API key not configured for this hospital');
        }
        if (!assistantId) {
            throw new Error('Vapi assistant ID not configured for this hospital');
        }
        if (!phoneNumberId) {
            throw new Error('Vapi phone number ID not configured for this hospital');
        }

        // ─── Build and send SMS ────────────────────────────────────
        const payload = {
            assistantId,
            input: message,
            transport: {
                type: transportType,
                phoneNumberId,
                customer: {
                    number: formattedTo   // ← Use formatted number
                },
                useLLMGeneratedMessageForOutbound: useLLMGenerated
            }
        };

        const response = await axios.post('https://api.vapi.ai/chat', payload, {
            headers: {
                'Authorization': `Bearer ${vapiApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`SMS sent successfully to ${formattedTo}, Vapi chat ID: ${response.data.id}`);
        return {
            success: true,
            data: response.data
        };

    } catch (error) {
        let errorMsg = error.message;
        if (error.response) {
            errorMsg = error.response.data ? JSON.stringify(error.response.data) : error.message;
        } else if (error.request) {
            errorMsg = 'No response received from Vapi';
        }
        logger.error(`SMS sending failed: ${errorMsg}`);
        return {
            success: false,
            error: errorMsg
        };
    }
};

// ─── Export helper so it can be used externally if needed ──────────────────────
exports.formatPhoneNumber = formatPhoneNumber;