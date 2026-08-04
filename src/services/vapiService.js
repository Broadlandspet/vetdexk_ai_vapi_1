// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');
// const logger = require('../utils/logger');
// const {
//     VAPI_API_KEY,
//     VAPI_API_BASE_URL,
//     MAIN_ASSISTANT_STATIC_TOOL_IDS,
//     FEEDBACK_ASSISTANT_STATIC_TOOL_IDS
// } = require('../config/vapiConfig');

// const vapiClient = axios.create({
//     baseURL: VAPI_API_BASE_URL,
//     headers: {
//         Authorization: `Bearer ${VAPI_API_KEY}`,
//         'Content-Type': 'application/json'
//     },
//     timeout: 30000
// });

// function readPromptFile(filename) {
//     return fs.readFileSync(path.join(__dirname, '../prompts', filename), 'utf8');
// }

// /**
//  * Loads the main assistant prompt template and substitutes:
//  *   - "hospital_id": "1"        -> "hospital_id": "<hospitalId>"
//  *   - the literal word transfer_call_tool -> <transferToolName>
//  */
// function renderMainAssistantPrompt(hospitalId, transferToolName) {
//     let prompt = readPromptFile('mainAssistantPrompt.txt');

//     prompt = prompt.replace(/"hospital_id":\s*"1"/g, `"hospital_id": "${hospitalId}"`);
//     prompt = prompt.replace(/\btransfer_call_tool\b/g, transferToolName);

//     return prompt;
// }

// /**
//  * Loads the feedback assistant prompt template and substitutes:
//  *   - "hospital_id": "1" -> "hospital_id": "<hospitalId>"
//  */
// function renderFeedbackAssistantPrompt(hospitalId) {
//     let prompt = readPromptFile('feedbackAssistantPrompt.txt');
//     prompt = prompt.replace(/"hospital_id":\s*"1"/g, `"hospital_id": "${hospitalId}"`);
//     return prompt;
// }

// // ─── STEP 1: Import phone number into Vapi ───────────────────────────────
// async function createPhoneNumber({ provider, number, twilioAccountSid, twilioAuthToken, name }) {
//     try {
//         const { data } = await vapiClient.post('/phone-number', {
//             provider,
//             number,
//             twilioAccountSid,
//             twilioAuthToken,
//             name
//         });
//         return data; // contains data.id, data.name, etc.
//     } catch (error) {
//         logger.error('Vapi createPhoneNumber failed:', error.response?.data || error.message);
//         throw new Error(`Failed to import phone number to Vapi: ${error.response?.data?.message || error.message}`);
//     }
// }

// // ─── STEP 2: Create the transfer-call tool ───────────────────────────────
// async function createTransferCallTool({ toolName, forwardNumber }) {
//     try {
//         const { data } = await vapiClient.post('/tool', {
//             type: 'transferCall',
//             function: {
//                 name: toolName
//             },
//             messages: [
//                 { type: 'request-start', blocking: false }
//             ],
//             async: false,
//             destinations: [
//                 {
//                     type: 'number',
//                     number: forwardNumber,
//                     transferPlan: {
//                         mode: 'blind-transfer',
//                         sipVerb: 'refer'
//                     },
//                     numberE164CheckEnabled: true
//                 }
//             ]
//         });
//         return data; // contains data.id, data.function.name
//     } catch (error) {
//         logger.error('Vapi createTransferCallTool failed:', error.response?.data || error.message);
//         throw new Error(`Failed to create transfer-call tool: ${error.response?.data?.message || error.message}`);
//     }
// }

// // ─── STEP 3: Create the MAIN calling assistant ───────────────────────────
// async function createMainAssistant({ name, hospitalId, transferToolId, transferToolName }) {
//     try {
//         const promptContent = renderMainAssistantPrompt(hospitalId, transferToolName);

//         const { data } = await vapiClient.post('/assistant', {
//             name,
//             voice: {
//                 speed: 1.15,
//                 version: '2',
//                 voiceId: 'Emma',
//                 language: 'en',
//                 provider: 'vapi'
//             },
//             model: {
//                 model: 'gpt-4.1',
//                 toolIds: [...MAIN_ASSISTANT_STATIC_TOOL_IDS, transferToolId],
//                 messages: [
//                     { role: 'system', content: promptContent }
//                 ],
//                 provider: 'openai'
//             },
//             firstMessage: 'Hello, and thank you you for calling Broadlands Pet Hospital. How may I assist you today?',
//             endCallFunctionEnabled: true,
//             endCallMessage: 'Have a wonderful day!',
//             transcriber: {
//                 model: 'stt-rt-v5',
//                 language: 'en',
//                 provider: 'soniox',
//                 languages: ['en'],
//                 maxEndpointDelayMs: 500,
//                 languageHintsStrict: true
//             },
//             silenceTimeoutSeconds: 45,
//             serverMessages: ['end-of-call-report'],
//             dialKeypadFunctionEnabled: true,
//             endCallPhrases: [
//                 'goodbye',
//                 'thanks for calling',
//                 'have a great day',
//                 'have a wonderful day',
//                 'I did not get any response from your side'
//             ],
//             server: {
//                 url: 'https://broadlands-pet-api.eastus2.cloudapp.azure.com/api/vapi',
//                 timeoutSeconds: 20,
//                 headers: {
//                     'Content-Type': 'application/json',
//                     Authorization: 'thiskeyisfortheaiagentforacessofthisapi@2026'
//                 }
//             },
//             hooks: [
//                 {
//                     do: [{ type: 'say', exact: 'I did not get any response. Please give me your answer to my question.' }],
//                     on: 'customer.speech.timeout',
//                     name: 'no_response_first',
//                     options: { timeoutSeconds: 10, triggerMaxCount: 1, triggerResetMode: 'onUserSpeech' }
//                 },
//                 {
//                     do: [{ type: 'say', exact: 'I did not get any response. Please give me your answer to my question.' }],
//                     on: 'customer.speech.timeout',
//                     name: 'no_response_second',
//                     options: { timeoutSeconds: 20, triggerMaxCount: 1, triggerResetMode: 'onUserSpeech' }
//                 },
//                 {
//                     do: [
//                         { type: 'say', exact: 'I did not get any response from your side. Please call again or visit our website to book an appointment online.' },
//                         { tool: { type: 'endCall' }, type: 'tool' }
//                     ],
//                     on: 'customer.speech.timeout',
//                     name: 'no_response_final',
//                     options: { timeoutSeconds: 30, triggerMaxCount: 1, triggerResetMode: 'onUserSpeech' }
//                 }
//             ],
//             compliancePlan: { hipaaEnabled: false, pciEnabled: false, zdrEnabled: false },
//             keypadInputPlan: { enabled: true, timeoutSeconds: 2, delimiters: ['#', '*'] }
//         });

//         return data; // contains data.id -> mainAssistantId
//     } catch (error) {
//         logger.error('Vapi createMainAssistant failed:', error.response?.data || error.message);
//         throw new Error(`Failed to create main assistant: ${error.response?.data?.message || error.message}`);
//     }
// }

// // ─── STEP 4: Link phone number to the main assistant ─────────────────────
// async function linkPhoneNumberToAssistant(phoneNumberId, assistantId) {
//     try {
//         const { data } = await vapiClient.patch(`/phone-number/${phoneNumberId}`, {
//             assistantId
//         });
//         return data;
//     } catch (error) {
//         logger.error('Vapi linkPhoneNumberToAssistant failed:', error.response?.data || error.message);
//         throw new Error(`Failed to link phone number to assistant: ${error.response?.data?.message || error.message}`);
//     }
// }




// // ─── STEP 5: Create the FEEDBACK calling assistant ───────────────────────
// async function createFeedbackAssistant({ name, hospitalId }) {
//     try {
//         const promptContent = renderFeedbackAssistantPrompt(hospitalId);

//         const { data } = await vapiClient.post('/assistant', {
//             name,
//             voice: {
//                 version: '2',
//                 voiceId: 'Elliot',
//                 provider: 'vapi'
//             },
//             model: {
//                 model: 'gpt-4.1',
//                 toolIds: [...FEEDBACK_ASSISTANT_STATIC_TOOL_IDS],
//                 messages: [
//                     { role: 'system', content: promptContent }
//                 ],
//                 provider: 'openai'
//             },
//             firstMessage: 'Hello {{patient_name}}, this is a follow-up call from Broadlands Pet Hospital about your recent appointment for {{pet_name}}. How are you both doing today?',
//             voicemailMessage: "Hello, this is Cameron from QualityMetrics Research. I'm calling to invite you to participate in a brief customer satisfaction survey. I'll try again later, or you can call us back at your convenience.",
//             endCallFunctionEnabled: true,
//             endCallMessage: 'Thank you for taking the time to complete our survey. Your feedback is invaluable and will help us improve our services. Have a great day!',
//             transcriber: {
//                 model: 'stt-rt-v5',
//                 language: 'en',
//                 provider: 'soniox',
//                 languages: ['en'],
//                 fallbackPlan: { autoFallback: { enabled: true } },
//                 maxEndpointDelayMs: 500,
//                 languageHintsStrict: true
//             },
//             endCallPhrases: ['Have a great day!'],
//             analysisPlan: {
//                 summaryPlan: { enabled: false },
//                 successEvaluationPlan: { enabled: false }
//             },
//             backgroundDenoisingEnabled: true,
//             compliancePlan: { hipaaEnabled: false, pciEnabled: false, zdrEnabled: false }
//         });

//         return data; // contains data.id -> feedbackAssistantId
//     } catch (error) {
//         logger.error('Vapi createFeedbackAssistant failed:', error.response?.data || error.message);
//         throw new Error(`Failed to create feedback assistant: ${error.response?.data?.message || error.message}`);
//     }
// }



// // ─── DELETE: phone number ─────────────────────────────────────────────────
// async function deletePhoneNumber(phoneNumberId) {
//     try {
//         const { data } = await vapiClient.delete(`/phone-number/${phoneNumberId}`);
//         return data;
//     } catch (error) {
//         logger.error('Vapi deletePhoneNumber failed:', error.response?.data || error.message);
//         throw new Error(`Failed to delete phone number ${phoneNumberId}: ${error.response?.data?.message || error.message}`);
//     }
// }

// // ─── DELETE: assistant (works for both main + feedback assistants) ───────
// async function deleteAssistant(assistantId) {
//     try {
//         const { data } = await vapiClient.delete(`/assistant/${assistantId}`);
//         return data;
//     } catch (error) {
//         logger.error('Vapi deleteAssistant failed:', error.response?.data || error.message);
//         throw new Error(`Failed to delete assistant ${assistantId}: ${error.response?.data?.message || error.message}`);
//     }
// }

// // ─── DELETE: tool (not called yet — tool id isn't persisted in the DB) ───
// async function deleteTool(toolId) {
//     try {
//         const { data } = await vapiClient.delete(`/tool/${toolId}`);
//         return data;
//     } catch (error) {
//         logger.error('Vapi deleteTool failed:', error.response?.data || error.message);
//         throw new Error(`Failed to delete tool ${toolId}: ${error.response?.data?.message || error.message}`);
//     }
// }


// module.exports = {
//     createPhoneNumber,
//     createTransferCallTool,
//     createMainAssistant,
//     linkPhoneNumberToAssistant,
//     createFeedbackAssistant,
//         deletePhoneNumber,
//     deleteAssistant,
//     deleteTool
// };









const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const {
    VAPI_API_KEY,
    VAPI_API_BASE_URL,
    MAIN_ASSISTANT_STATIC_TOOL_IDS,
    FEEDBACK_ASSISTANT_STATIC_TOOL_IDS
} = require('../config/vapiConfig');

const vapiClient = axios.create({
    baseURL: VAPI_API_BASE_URL,
    headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 30000
});

function readPromptFile(filename) {
    return fs.readFileSync(path.join(__dirname, '../prompts', filename), 'utf8');
}

/**
 * Loads the main assistant prompt template and substitutes:
 *   - "hospital_id": "1"           -> "hospital_id": "<hospitalId>"
 *   - the literal word transfer_call_tool -> <transferToolName>
 *   - the literal phrase "Broadlands Pet Hospital" -> "<hospitalName> Hospital"
 */
function renderMainAssistantPrompt(hospitalId, transferToolName, hospitalName) {
    let prompt = readPromptFile('mainAssistantPrompt.txt');

    prompt = prompt.replace(/"hospital_id":\s*"1"/g, `"hospital_id": "${hospitalId}"`);
    prompt = prompt.replace(/\btransfer_call_tool\b/g, transferToolName);
    prompt = prompt.replace(/Broadlands Pet Hospital/g, `${hospitalName} Hospital`);

    return prompt;
}

/**
 * Loads the feedback assistant prompt template and substitutes:
 *   - "hospital_id": "1" -> "hospital_id": "<hospitalId>"
 *   - the literal phrase "Broadlands Pet Hospital" -> "<hospitalName> Hospital"
 */
function renderFeedbackAssistantPrompt(hospitalId, hospitalName) {
    let prompt = readPromptFile('feedbackAssistantPrompt.txt');
    prompt = prompt.replace(/"hospital_id":\s*"1"/g, `"hospital_id": "${hospitalId}"`);
    prompt = prompt.replace(/Broadlands Pet Hospital/g, `${hospitalName} Hospital`);
    return prompt;
}

// ─── STEP 1: Import phone number into Vapi ───────────────────────────────
async function createPhoneNumber({ provider, number, twilioAccountSid, twilioAuthToken, name }) {
    try {
        const { data } = await vapiClient.post('/phone-number', {
            provider,
            number,
            twilioAccountSid,
            twilioAuthToken,
            name
        });
        return data;
    } catch (error) {
        logger.error('Vapi createPhoneNumber failed:', error.response?.data || error.message);
        throw new Error(`Failed to import phone number to Vapi: ${error.response?.data?.message || error.message}`);
    }
}

// ─── STEP 2: Create the transfer-call tool ───────────────────────────────
async function createTransferCallTool({ toolName, forwardNumber }) {
    try {
        const { data } = await vapiClient.post('/tool', {
            type: 'transferCall',
            function: {
                name: toolName
            },
            messages: [
                { type: 'request-start', blocking: false }
            ],
            async: false,
            destinations: [
                {
                    type: 'number',
                    number: forwardNumber,
                    transferPlan: {
                        mode: 'blind-transfer',
                        sipVerb: 'refer'
                    },
                    numberE164CheckEnabled: true
                }
            ]
        });
        return data;
    } catch (error) {
        logger.error('Vapi createTransferCallTool failed:', error.response?.data || error.message);
        throw new Error(`Failed to create transfer-call tool: ${error.response?.data?.message || error.message}`);
    }
}

// ─── STEP 3: Create the MAIN calling assistant ───────────────────────────
async function createMainAssistant({ name, hospitalId, hospitalName, transferToolId, transferToolName }) {
    try {
        const promptContent = renderMainAssistantPrompt(hospitalId, transferToolName, hospitalName);
        const firstMessage = `Hello, and thank you you for calling ${hospitalName} Hospital. How may I assist you today?`;

        const { data } = await vapiClient.post('/assistant', {
            name,
            voice: {
                speed: 1.15,
                version: '2',
                voiceId: 'Emma',
                language: 'en',
                provider: 'vapi'
            },
            model: {
                model: 'gpt-4.1',
                toolIds: [...MAIN_ASSISTANT_STATIC_TOOL_IDS, transferToolId],
                messages: [
                    { role: 'system', content: promptContent }
                ],
                provider: 'openai'
            },
            firstMessage,
            endCallFunctionEnabled: true,
            endCallMessage: 'Have a wonderful day!',
            transcriber: {
                model: 'stt-rt-v5',
                language: 'en',
                provider: 'soniox',
                languages: ['en'],
                maxEndpointDelayMs: 500,
                languageHintsStrict: true
            },
            silenceTimeoutSeconds: 45,
            serverMessages: ['end-of-call-report'],
            dialKeypadFunctionEnabled: true,
            endCallPhrases: [
                'goodbye',
                'thanks for calling',
                'have a great day',
                'have a wonderful day',
                'I did not get any response from your side'
            ],
            server: {
                url: 'https://broadlands-pet-api.eastus2.cloudapp.azure.com/api/vapi',
                timeoutSeconds: 20,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'thiskeyisfortheaiagentforacessofthisapi@2026'
                }
            },
            hooks: [
                {
                    do: [{ type: 'say', exact: 'I did not get any response. Please give me your answer to my question.' }],
                    on: 'customer.speech.timeout',
                    name: 'no_response_first',
                    options: { timeoutSeconds: 10, triggerMaxCount: 1, triggerResetMode: 'onUserSpeech' }
                },
                {
                    do: [{ type: 'say', exact: 'I did not get any response. Please give me your answer to my question.' }],
                    on: 'customer.speech.timeout',
                    name: 'no_response_second',
                    options: { timeoutSeconds: 20, triggerMaxCount: 1, triggerResetMode: 'onUserSpeech' }
                },
                {
                    do: [
                        { type: 'say', exact: 'I did not get any response from your side. Please call again or visit our website to book an appointment online.' },
                        { tool: { type: 'endCall' }, type: 'tool' }
                    ],
                    on: 'customer.speech.timeout',
                    name: 'no_response_final',
                    options: { timeoutSeconds: 30, triggerMaxCount: 1, triggerResetMode: 'onUserSpeech' }
                }
            ],
            compliancePlan: { hipaaEnabled: false, pciEnabled: false, zdrEnabled: false },
            keypadInputPlan: { enabled: true, timeoutSeconds: 2, delimiters: ['#', '*'] }
        });

        return data;
    } catch (error) {
        logger.error('Vapi createMainAssistant failed:', error.response?.data || error.message);
        throw new Error(`Failed to create main assistant: ${error.response?.data?.message || error.message}`);
    }
}

// ─── STEP 4: Link phone number to the main assistant ─────────────────────
async function linkPhoneNumberToAssistant(phoneNumberId, assistantId) {
    try {
        const { data } = await vapiClient.patch(`/phone-number/${phoneNumberId}`, {
            assistantId
        });
        return data;
    } catch (error) {
        logger.error('Vapi linkPhoneNumberToAssistant failed:', error.response?.data || error.message);
        throw new Error(`Failed to link phone number to assistant: ${error.response?.data?.message || error.message}`);
    }
}

// ─── STEP 5: Create the FEEDBACK calling assistant ───────────────────────
async function createFeedbackAssistant({ name, hospitalId, hospitalName }) {
    try {
        const promptContent = renderFeedbackAssistantPrompt(hospitalId, hospitalName);
        const firstMessage = `Hello {{patient_name}}, this is a follow-up call from ${hospitalName} Hospital about your recent appointment for {{pet_name}}. How are you both doing today?`;

        const { data } = await vapiClient.post('/assistant', {
            name,
            voice: {
                version: '2',
                voiceId: 'Elliot',
                provider: 'vapi'
            },
            model: {
                model: 'gpt-4.1',
                toolIds: [...FEEDBACK_ASSISTANT_STATIC_TOOL_IDS],
                messages: [
                    { role: 'system', content: promptContent }
                ],
                provider: 'openai'
            },
            firstMessage,
            voicemailMessage: "Hello, this is Cameron from QualityMetrics Research. I'm calling to invite you to participate in a brief customer satisfaction survey. I'll try again later, or you can call us back at your convenience.",
            endCallFunctionEnabled: true,
            endCallMessage: 'Thank you for taking the time to complete our survey. Your feedback is invaluable and will help us improve our services. Have a great day!',
            transcriber: {
                model: 'stt-rt-v5',
                language: 'en',
                provider: 'soniox',
                languages: ['en'],
                fallbackPlan: { autoFallback: { enabled: true } },
                maxEndpointDelayMs: 500,
                languageHintsStrict: true
            },
            endCallPhrases: ['Have a great day!'],
            analysisPlan: {
                summaryPlan: { enabled: false },
                successEvaluationPlan: { enabled: false }
            },
            backgroundDenoisingEnabled: true,
            compliancePlan: { hipaaEnabled: false, pciEnabled: false, zdrEnabled: false }
        });

        return data;
    } catch (error) {
        logger.error('Vapi createFeedbackAssistant failed:', error.response?.data || error.message);
        throw new Error(`Failed to create feedback assistant: ${error.response?.data?.message || error.message}`);
    }
}

// ─── DELETE: phone number ─────────────────────────────────────────────────
async function deletePhoneNumber(phoneNumberId) {
    try {
        const { data } = await vapiClient.delete(`/phone-number/${phoneNumberId}`);
        return data;
    } catch (error) {
        logger.error('Vapi deletePhoneNumber failed:', error.response?.data || error.message);
        throw new Error(`Failed to delete phone number ${phoneNumberId}: ${error.response?.data?.message || error.message}`);
    }
}

// ─── DELETE: assistant (works for both main + feedback assistants) ───────
async function deleteAssistant(assistantId) {
    try {
        const { data } = await vapiClient.delete(`/assistant/${assistantId}`);
        return data;
    } catch (error) {
        logger.error('Vapi deleteAssistant failed:', error.response?.data || error.message);
        throw new Error(`Failed to delete assistant ${assistantId}: ${error.response?.data?.message || error.message}`);
    }
}

// ─── DELETE: tool (not called yet — tool id isn't persisted in the DB) ───
async function deleteTool(toolId) {
    try {
        const { data } = await vapiClient.delete(`/tool/${toolId}`);
        return data;
    } catch (error) {
        logger.error('Vapi deleteTool failed:', error.response?.data || error.message);
        throw new Error(`Failed to delete tool ${toolId}: ${error.response?.data?.message || error.message}`);
    }
}

module.exports = {
    createPhoneNumber,
    createTransferCallTool,
    createMainAssistant,
    linkPhoneNumberToAssistant,
    createFeedbackAssistant,
    deletePhoneNumber,
    deleteAssistant,
    deleteTool
};