// const logger = require('../utils/logger');
// const vapiService = require('./vapiService');
// const credentialService = require('./credentialService');
// const { VAPI_API_KEY, VAPI_API_BASE_URL } = require('../config/vapiConfig');

// /**
//  * Full onboarding flow:
//  *  1. Import phone number to Vapi
//  *  2. Create transfer-call tool
//  *  3. Create main calling assistant (uses tool from step 2)
//  *  4. Link phone number (step 1) to main assistant (step 3)
//  *  5. Create feedback assistant
//  *  6. Save everything to our own DB via credentialService
//  */
// exports.createCredentialsResources = async function (payload) {
//     const {
//         hospital_id,
//         provider,
//         number,
//         twilioAccountSid,
//         twilioAuthToken,
//         'Phone Lable': phoneLabel,
//         forwordphonecallnumber,
//         nametoolforwardcallname,
//         MainCallingAiAgentName,
//         FeedBackCllingAgentName
//     } = payload;

//     // ── Basic validation ──
//     const required = {
//         hospital_id, provider, number, twilioAccountSid, twilioAuthToken,
//         phoneLabel, forwordphonecallnumber, nametoolforwardcallname,
//         MainCallingAiAgentName, FeedBackCllingAgentName
//     };
//     for (const [key, value] of Object.entries(required)) {
//         if (!value) {
//             throw new Error(`Missing required field: ${key}`);
//         }
//     }

//     // ── STEP 1: Import phone number ──
//     logger.info(`[credentials-resources] Step 1: importing phone number for hospital ${hospital_id}`);
//     const phoneNumberResult = await vapiService.createPhoneNumber({
//         provider,
//         number,
//         twilioAccountSid,
//         twilioAuthToken,
//         name: phoneLabel
//     });
//     const vapiPhoneNumberId = phoneNumberResult.id;

//     // ── STEP 2: Create transfer-call tool ──
//     logger.info(`[credentials-resources] Step 2: creating transfer tool "${nametoolforwardcallname}"`);
//     const transferToolResult = await vapiService.createTransferCallTool({
//         toolName: nametoolforwardcallname,
//         forwardNumber: forwordphonecallnumber
//     });
//     const transferToolId = transferToolResult.id;
//     const transferToolName = transferToolResult.function.name;

//     // ── STEP 3: Create main assistant ──
//     logger.info(`[credentials-resources] Step 3: creating main assistant "${MainCallingAiAgentName}"`);
//     const mainAssistantResult = await vapiService.createMainAssistant({
//         name: MainCallingAiAgentName,
//         hospitalId: hospital_id,
//         transferToolId,
//         transferToolName
//     });
//     const vapiAssistantId = mainAssistantResult.id;

//     // ── STEP 4: Link phone number to main assistant ──
//     logger.info(`[credentials-resources] Step 4: linking phone number ${vapiPhoneNumberId} to assistant ${vapiAssistantId}`);
//     await vapiService.linkPhoneNumberToAssistant(vapiPhoneNumberId, vapiAssistantId);

//     // ── STEP 5: Create feedback assistant ──
//     logger.info(`[credentials-resources] Step 5: creating feedback assistant "${FeedBackCllingAgentName}"`);
//     const feedbackAssistantResult = await vapiService.createFeedbackAssistant({
//         name: FeedBackCllingAgentName,
//         hospitalId: hospital_id
//     });
//     const vapiFeedbackAssistantId = feedbackAssistantResult.id;

//     // ── STEP 6: Save everything to our own DB ──
//     logger.info(`[credentials-resources] Step 6: saving credentials for hospital ${hospital_id}`);

//     const credentialsPayload = {
//         hospital_id,

//         // Static, always the same
//         vapi_api_key: VAPI_API_KEY,
//         vapi_private_api_key: VAPI_API_KEY,
//         vapi_api_base_url: VAPI_API_BASE_URL,

//         // Dynamically produced in this flow
//         vapi_assistant_id: vapiAssistantId,
//         vapi_phone_number_id: vapiPhoneNumberId,
//         vapi_feedback_assistant_id: vapiFeedbackAssistantId,

//         // Pass-through fields supplied by the caller
//         google_client_id: payload.google_client_id,
//         google_client_secret: payload.google_client_secret,
//         google_calendar_refresh_token: payload.google_calendar_refresh_token,
//         google_gmail_refresh_token: payload.google_gmail_refresh_token,
//         google_calendar_id: payload.google_calendar_id,
//         admin_email: payload.admin_email,
//         google_email: payload.google_email,
//         default_slot_duration: payload.default_slot_duration,
//         max_booking_days: payload.max_booking_days,
//         min_booking_hours: payload.min_booking_hours,
//         hospital_api_key: payload.hospital_api_key,
//         feedback_call_delay_minutes: payload.feedback_call_delay_minutes,
//         superadmin_email: payload.superadmin_email,
//         calendly_pat: payload.calendly_pat,
//         ezy_vet_partner_id: payload.ezy_vet_partner_id,
//         ezy_vet_client_id: payload.ezy_vet_client_id,
//         ezy_vet_client_secret: payload.ezy_vet_client_secret,
//         ezy_vet_grant_type: payload.ezy_vet_grant_type,
//         ezy_vet_scope: payload.ezy_vet_scope,
//         ezy_vet_site_uid: payload.ezy_vet_site_uid
//     };

//     await credentialService.saveCredentials(credentialsPayload);

//     // ── Final summary returned to the caller ──
//     return {
//         hospital_id,
//         phone_number: {
//             id: vapiPhoneNumberId,
//             number: phoneNumberResult.number,
//             name: phoneNumberResult.name
//         },
//         transfer_tool: {
//             id: transferToolId,
//             name: transferToolName
//         },
//         main_assistant: {
//             id: vapiAssistantId,
//             name: mainAssistantResult.name
//         },
//         feedback_assistant: {
//             id: vapiFeedbackAssistantId,
//             name: feedbackAssistantResult.name
//         },
//         credentials_saved: true
//     };
// };



// /**
//  * Full teardown flow for a hospital's AI calling resources:
//  *  1. Look up the saved credentials row (to get the Vapi resource IDs)
//  *  2. Delete phone number from Vapi (best-effort)
//  *  3. Delete main assistant from Vapi (best-effort)
//  *  4. Delete feedback assistant from Vapi (best-effort)
//  *  5. Delete the DB row regardless of how steps 2–4 went
//  *
//  * Returns a summary of what succeeded/failed rather than throwing on a
//  * partial Vapi failure, so a resource already removed manually in the
//  * Vapi dashboard doesn't block cleanup of the rest.
//  */
// exports.deleteCredentialsResources = async function (hospitalId) {
//     if (!hospitalId) {
//         throw new Error('hospital_id is required');
//     }

//     // ── STEP 1: fetch the existing credentials row for this hospital ──
//     let credentials;
//     try {
//         credentials = await credentialService.getCredentials(hospitalId); // returns UPPERCASE keys
//     } catch (error) {
//         throw new Error(`No credentials found for hospital_id: ${hospitalId}`);
//     }

//     const vapiAssistantId = credentials.VAPI_ASSISTANT_ID;
//     const vapiPhoneNumberId = credentials.VAPI_PHONE_NUMBER_ID;
//     const vapiFeedbackAssistantId = credentials.VAPI_FEEDBACK_ASSISTANT_ID;

//     const results = {
//         phone_number_deleted: false,
//         main_assistant_deleted: false,
//         feedback_assistant_deleted: false,
//         db_record_deleted: false,
//         errors: []
//     };

//     // ── STEP 2: delete phone number from Vapi (best-effort) ──
//     if (vapiPhoneNumberId) {
//         try {
//             logger.info(`[credentials-resources/delete] deleting phone number ${vapiPhoneNumberId}`);
//             await vapiService.deletePhoneNumber(vapiPhoneNumberId);
//             results.phone_number_deleted = true;
//         } catch (error) {
//             logger.error(error.message);
//             results.errors.push(error.message);
//         }
//     } else {
//         results.errors.push('No vapi_phone_number_id stored for this hospital — nothing to delete on Vapi.');
//     }

//     // ── STEP 3: delete main assistant from Vapi (best-effort) ──
//     if (vapiAssistantId) {
//         try {
//             logger.info(`[credentials-resources/delete] deleting main assistant ${vapiAssistantId}`);
//             await vapiService.deleteAssistant(vapiAssistantId);
//             results.main_assistant_deleted = true;
//         } catch (error) {
//             logger.error(error.message);
//             results.errors.push(error.message);
//         }
//     } else {
//         results.errors.push('No vapi_assistant_id stored for this hospital — nothing to delete on Vapi.');
//     }

//     // ── STEP 4: delete feedback assistant from Vapi (best-effort) ──
//     if (vapiFeedbackAssistantId) {
//         try {
//             logger.info(`[credentials-resources/delete] deleting feedback assistant ${vapiFeedbackAssistantId}`);
//             await vapiService.deleteAssistant(vapiFeedbackAssistantId);
//             results.feedback_assistant_deleted = true;
//         } catch (error) {
//             logger.error(error.message);
//             results.errors.push(error.message);
//         }
//     } else {
//         results.errors.push('No vapi_feedback_assistant_id stored for this hospital — nothing to delete on Vapi.');
//     }

//     // ── STEP 5: delete the DB row regardless of the Vapi outcomes above ──
//     try {
//         logger.info(`[credentials-resources/delete] deleting DB record for hospital ${hospitalId}`);
//         const deletedRow = await credentialService.deleteCredentials(hospitalId);
//         results.db_record_deleted = !!deletedRow;
//     } catch (error) {
//         logger.error('Failed to delete DB record:', error.message);
//         results.errors.push(`Failed to delete DB record: ${error.message}`);
//         throw Object.assign(
//             new Error('Failed to fully delete credentials resources — see partial results.'),
//             { partialResults: { hospital_id: hospitalId, ...results } }
//         );
//     }

//     return {
//         hospital_id: hospitalId,
//         ...results
//     };
// };






















const logger = require('../utils/logger');
const vapiService = require('./vapiService');
const credentialService = require('./credentialService');
const { VAPI_API_KEY, VAPI_API_BASE_URL } = require('../config/vapiConfig');

/**
 * Full onboarding flow:
 *  1. Import phone number to Vapi
 *  2. Create transfer-call tool
 *  3. Create main calling assistant (uses tool from step 2, uses hospital_name dynamically)
 *  4. Link phone number (step 1) to main assistant (step 3)
 *  5. Create feedback assistant (uses hospital_name dynamically)
 *  6. Save everything to our own DB via credentialService, including both assistant names
 */
exports.createCredentialsResources = async function (payload) {
    const {
        hospital_id,
        hospital_name,
        provider,
        number,
        twilioAccountSid,
        twilioAuthToken,
        'Phone Lable': phoneLabel,
        forwordphonecallnumber,
        nametoolforwardcallname,
        MainCallingAiAgentName,
        FeedBackCllingAgentName
    } = payload;

    // ── Basic validation ──
    const required = {
        hospital_id, hospital_name, provider, number, twilioAccountSid, twilioAuthToken,
        phoneLabel, forwordphonecallnumber, nametoolforwardcallname,
        MainCallingAiAgentName, FeedBackCllingAgentName
    };
    for (const [key, value] of Object.entries(required)) {
        if (!value) {
            throw new Error(`Missing required field: ${key}`);
        }
    }

    // ── STEP 1: Import phone number ──
    logger.info(`[credentials-resources] Step 1: importing phone number for hospital ${hospital_id}`);
    const phoneNumberResult = await vapiService.createPhoneNumber({
        provider,
        number,
        twilioAccountSid,
        twilioAuthToken,
        name: phoneLabel
    });
    const vapiPhoneNumberId = phoneNumberResult.id;

    // ── STEP 2: Create transfer-call tool ──
    logger.info(`[credentials-resources] Step 2: creating transfer tool "${nametoolforwardcallname}"`);
    const transferToolResult = await vapiService.createTransferCallTool({
        toolName: nametoolforwardcallname,
        forwardNumber: forwordphonecallnumber
    });
    const transferToolId = transferToolResult.id;
    const transferToolName = transferToolResult.function.name;

    // ── STEP 3: Create main assistant (hospital_name passed in dynamically) ──
    logger.info(`[credentials-resources] Step 3: creating main assistant "${MainCallingAiAgentName}" for "${hospital_name}"`);
    const mainAssistantResult = await vapiService.createMainAssistant({
        name: MainCallingAiAgentName,
        hospitalId: hospital_id,
        hospitalName: hospital_name,
        transferToolId,
        transferToolName
    });
    const vapiAssistantId = mainAssistantResult.id;

    // ── STEP 4: Link phone number to main assistant ──
    logger.info(`[credentials-resources] Step 4: linking phone number ${vapiPhoneNumberId} to assistant ${vapiAssistantId}`);
    await vapiService.linkPhoneNumberToAssistant(vapiPhoneNumberId, vapiAssistantId);

    // ── STEP 5: Create feedback assistant (hospital_name passed in dynamically) ──
    logger.info(`[credentials-resources] Step 5: creating feedback assistant "${FeedBackCllingAgentName}" for "${hospital_name}"`);
    const feedbackAssistantResult = await vapiService.createFeedbackAssistant({
        name: FeedBackCllingAgentName,
        hospitalId: hospital_id,
        hospitalName: hospital_name
    });
    const vapiFeedbackAssistantId = feedbackAssistantResult.id;

    // ── STEP 6: Save everything to our own DB ──
    logger.info(`[credentials-resources] Step 6: saving credentials for hospital ${hospital_id}`);

    const credentialsPayload = {
        hospital_id,
        hospital_name,

        // Static, always the same
        vapi_api_key: VAPI_API_KEY,
        vapi_private_api_key: VAPI_API_KEY,
        vapi_api_base_url: VAPI_API_BASE_URL,

        // Dynamically produced in this flow
        vapi_assistant_id: vapiAssistantId,
        vapi_phone_number_id: vapiPhoneNumberId,
        vapi_feedback_assistant_id: vapiFeedbackAssistantId,

        // The Vapi-confirmed names (returned from Vapi, not just echoed from the request)
        main_vapi_assistant_name: mainAssistantResult.name,
        feedback_vapi_assistant_name: feedbackAssistantResult.name,

        // Pass-through fields supplied by the caller
        google_client_id: payload.google_client_id,
        google_client_secret: payload.google_client_secret,
        google_calendar_refresh_token: payload.google_calendar_refresh_token,
        google_gmail_refresh_token: payload.google_gmail_refresh_token,
        google_calendar_id: payload.google_calendar_id,
        admin_email: payload.admin_email,
        google_email: payload.google_email,
        default_slot_duration: payload.default_slot_duration,
        max_booking_days: payload.max_booking_days,
        min_booking_hours: payload.min_booking_hours,
        hospital_api_key: payload.hospital_api_key,
        feedback_call_delay_minutes: payload.feedback_call_delay_minutes,
        superadmin_email: payload.superadmin_email,
        calendly_pat: payload.calendly_pat,
        ezy_vet_partner_id: payload.ezy_vet_partner_id,
        ezy_vet_client_id: payload.ezy_vet_client_id,
        ezy_vet_client_secret: payload.ezy_vet_client_secret,
        ezy_vet_grant_type: payload.ezy_vet_grant_type,
        ezy_vet_scope: payload.ezy_vet_scope,
        ezy_vet_site_uid: payload.ezy_vet_site_uid
    };

    await credentialService.saveCredentials(credentialsPayload);

    // ── Final summary returned to the caller ──
    return {
        hospital_id,
        hospital_name,
        phone_number: {
            id: vapiPhoneNumberId,
            number: phoneNumberResult.number,
            name: phoneNumberResult.name
        },
        transfer_tool: {
            id: transferToolId,
            name: transferToolName
        },
        main_assistant: {
            id: vapiAssistantId,
            name: mainAssistantResult.name
        },
        feedback_assistant: {
            id: vapiFeedbackAssistantId,
            name: feedbackAssistantResult.name
        },
        credentials_saved: true
    };
};

// /**
//  * Full teardown flow for a hospital's AI calling resources (unchanged from before —
//  * included here so this file stays complete/copy-pasteable).
//  */
// exports.deleteCredentialsResources = async function (hospitalId) {
//     if (!hospitalId) {
//         throw new Error('hospital_id is required');
//     }

//     let credentials;
//     try {
//         credentials = await credentialService.getCredentials(hospitalId); // returns UPPERCASE keys
//     } catch (error) {
//         throw new Error(`No credentials found for hospital_id: ${hospitalId}`);
//     }

//     const vapiAssistantId = credentials.VAPI_ASSISTANT_ID;
//     const vapiPhoneNumberId = credentials.VAPI_PHONE_NUMBER_ID;
//     const vapiFeedbackAssistantId = credentials.VAPI_FEEDBACK_ASSISTANT_ID;

//     const results = {
//         phone_number_deleted: false,
//         main_assistant_deleted: false,
//         feedback_assistant_deleted: false,
//         db_record_deleted: false,
//         errors: []
//     };

//     if (vapiPhoneNumberId) {
//         try {
//             logger.info(`[credentials-resources/delete] deleting phone number ${vapiPhoneNumberId}`);
//             await vapiService.deletePhoneNumber(vapiPhoneNumberId);
//             results.phone_number_deleted = true;
//         } catch (error) {
//             logger.error(error.message);
//             results.errors.push(error.message);
//         }
//     } else {
//         results.errors.push('No vapi_phone_number_id stored for this hospital — nothing to delete on Vapi.');
//     }

//     if (vapiAssistantId) {
//         try {
//             logger.info(`[credentials-resources/delete] deleting main assistant ${vapiAssistantId}`);
//             await vapiService.deleteAssistant(vapiAssistantId);
//             results.main_assistant_deleted = true;
//         } catch (error) {
//             logger.error(error.message);
//             results.errors.push(error.message);
//         }
//     } else {
//         results.errors.push('No vapi_assistant_id stored for this hospital — nothing to delete on Vapi.');
//     }

//     if (vapiFeedbackAssistantId) {
//         try {
//             logger.info(`[credentials-resources/delete] deleting feedback assistant ${vapiFeedbackAssistantId}`);
//             await vapiService.deleteAssistant(vapiFeedbackAssistantId);
//             results.feedback_assistant_deleted = true;
//         } catch (error) {
//             logger.error(error.message);
//             results.errors.push(error.message);
//         }
//     } else {
//         results.errors.push('No vapi_feedback_assistant_id stored for this hospital — nothing to delete on Vapi.');
//     }

//     try {
//         logger.info(`[credentials-resources/delete] deleting DB record for hospital ${hospitalId}`);
//         const deletedRow = await credentialService.deleteCredentials(hospitalId);
//         results.db_record_deleted = !!deletedRow;
//     } catch (error) {
//         logger.error('Failed to delete DB record:', error.message);
//         results.errors.push(`Failed to delete DB record: ${error.message}`);
//         throw Object.assign(
//             new Error('Failed to fully delete credentials resources — see partial results.'),
//             { partialResults: { hospital_id: hospitalId, ...results } }
//         );
//     }

//     return {
//         hospital_id: hospitalId,
//         ...results
//     };
// };


/**
 * Full teardown flow for a hospital's AI calling resources.
 */
exports.deleteCredentialsResources = async function (hospitalId) {
    if (!hospitalId) {
        throw new Error('hospital_id is required');
    }

    // ── STEP 0: cheap existence check first (only touches hospital_id column,
    // so it can never fail due to a missing/renamed column elsewhere) ──
    const exists = await credentialService.credentialsExist(hospitalId);
    if (!exists) {
        throw new Error(`No credentials found for hospital_id: ${hospitalId}`);
    }

    // ── STEP 1: fetch the full credentials row — let REAL errors bubble up
    // with their actual message instead of being masked as "not found" ──
    const credentials = await credentialService.getCredentials(hospitalId); // UPPERCASE keys

    const vapiAssistantId = credentials.VAPI_ASSISTANT_ID;
    const vapiPhoneNumberId = credentials.VAPI_PHONE_NUMBER_ID;
    const vapiFeedbackAssistantId = credentials.VAPI_FEEDBACK_ASSISTANT_ID;

    const results = {
        phone_number_deleted: false,
        main_assistant_deleted: false,
        feedback_assistant_deleted: false,
        db_record_deleted: false,
        errors: []
    };

    if (vapiPhoneNumberId) {
        try {
            logger.info(`[credentials-resources/delete] deleting phone number ${vapiPhoneNumberId}`);
            await vapiService.deletePhoneNumber(vapiPhoneNumberId);
            results.phone_number_deleted = true;
        } catch (error) {
            logger.error(error.message);
            results.errors.push(error.message);
        }
    } else {
        results.errors.push('No vapi_phone_number_id stored for this hospital — nothing to delete on Vapi.');
    }

    if (vapiAssistantId) {
        try {
            logger.info(`[credentials-resources/delete] deleting main assistant ${vapiAssistantId}`);
            await vapiService.deleteAssistant(vapiAssistantId);
            results.main_assistant_deleted = true;
        } catch (error) {
            logger.error(error.message);
            results.errors.push(error.message);
        }
    } else {
        results.errors.push('No vapi_assistant_id stored for this hospital — nothing to delete on Vapi.');
    }

    if (vapiFeedbackAssistantId) {
        try {
            logger.info(`[credentials-resources/delete] deleting feedback assistant ${vapiFeedbackAssistantId}`);
            await vapiService.deleteAssistant(vapiFeedbackAssistantId);
            results.feedback_assistant_deleted = true;
        } catch (error) {
            logger.error(error.message);
            results.errors.push(error.message);
        }
    } else {
        results.errors.push('No vapi_feedback_assistant_id stored for this hospital — nothing to delete on Vapi.');
    }

    try {
        logger.info(`[credentials-resources/delete] deleting DB record for hospital ${hospitalId}`);
        const deletedRow = await credentialService.deleteCredentials(hospitalId);
        results.db_record_deleted = !!deletedRow;
    } catch (error) {
        logger.error('Failed to delete DB record:', error.message);
        results.errors.push(`Failed to delete DB record: ${error.message}`);
        throw Object.assign(
            new Error('Failed to fully delete credentials resources — see partial results.'),
            { partialResults: { hospital_id: hospitalId, ...results } }
        );
    }

    return {
        hospital_id: hospitalId,
        ...results
    };
};