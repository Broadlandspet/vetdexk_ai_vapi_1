


const logger = require('../utils/logger');
const vapiService = require('./vapiService');
const credentialService = require('./credentialService');
const { VAPI_API_KEY, VAPI_API_BASE_URL } = require('../config/vapiConfig');

// Import your Supabase/PostgreSQL query executor
const { executeQuery } = require('../config/database');

/**
 * Full onboarding flow:
 *  1. Import phone number to Vapi
 *  2. Create transfer-call tool
 *  3. Create main calling assistant
 *  4. Link phone number to main assistant
 *  5. Create feedback assistant
 *  6. Save everything to our own DB via credentialService
 *  6.5 Update vet_desk_ai_crendatials with agent_calling_phone_number and call_transfer_phone_number
 *  7. Update the hospitals table with same phone numbers
 *
 * If ANY step fails, Vapi resources are rolled back.
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

    // ── Track everything created on Vapi ──
    const created = {
        vapiPhoneNumberId: null,
        transferToolId: null,
        vapiAssistantId: null,
        vapiFeedbackAssistantId: null
    };

    // ── Rollback helper ──
    async function rollback() {
        logger.warn(`[credentials-resources] Rolling back partially created Vapi resources for hospital ${hospital_id}`);

        if (created.vapiFeedbackAssistantId) {
            try {
                logger.info(`[credentials-resources] Rollback: deleting feedback assistant ${created.vapiFeedbackAssistantId}`);
                await vapiService.deleteAssistant(created.vapiFeedbackAssistantId);
            } catch (cleanupErr) {
                logger.error(`[credentials-resources] Rollback failed for feedback assistant ${created.vapiFeedbackAssistantId}: ${cleanupErr.message}`);
            }
        }

        if (created.vapiAssistantId) {
            try {
                logger.info(`[credentials-resources] Rollback: deleting main assistant ${created.vapiAssistantId}`);
                await vapiService.deleteAssistant(created.vapiAssistantId);
            } catch (cleanupErr) {
                logger.error(`[credentials-resources] Rollback failed for main assistant ${created.vapiAssistantId}: ${cleanupErr.message}`);
            }
        }

        if (created.transferToolId) {
            try {
                logger.info(`[credentials-resources] Rollback: deleting transfer tool ${created.transferToolId}`);
                await vapiService.deleteTool(created.transferToolId);
            } catch (cleanupErr) {
                logger.error(`[credentials-resources] Rollback failed for transfer tool ${created.transferToolId}: ${cleanupErr.message}`);
            }
        }

        if (created.vapiPhoneNumberId) {
            try {
                logger.info(`[credentials-resources] Rollback: deleting phone number ${created.vapiPhoneNumberId}`);
                await vapiService.deletePhoneNumber(created.vapiPhoneNumberId);
            } catch (cleanupErr) {
                logger.error(`[credentials-resources] Rollback failed for phone number ${created.vapiPhoneNumberId}: ${cleanupErr.message}`);
            }
        }
    }

    try {
        // ── STEP 1: Import phone number ──
        logger.info(`[credentials-resources] Step 1: importing phone number for hospital ${hospital_id}`);
        const phoneNumberResult = await vapiService.createPhoneNumber({
            provider,
            number,
            twilioAccountSid,
            twilioAuthToken,
            name: phoneLabel
        });
        created.vapiPhoneNumberId = phoneNumberResult.id;

        // ── STEP 2: Create transfer-call tool ──
        logger.info(`[credentials-resources] Step 2: creating transfer tool "${nametoolforwardcallname}"`);
        const transferToolResult = await vapiService.createTransferCallTool({
            toolName: nametoolforwardcallname,
            forwardNumber: forwordphonecallnumber
        });
        created.transferToolId = transferToolResult.id;
        const transferToolName = transferToolResult.function.name;

        // ── STEP 3: Create main assistant ──
        logger.info(`[credentials-resources] Step 3: creating main assistant "${MainCallingAiAgentName}" for "${hospital_name}"`);
        const mainAssistantResult = await vapiService.createMainAssistant({
            name: MainCallingAiAgentName,
            hospitalId: hospital_id,
            hospitalName: hospital_name,
            transferToolId: created.transferToolId,
            transferToolName
        });
        created.vapiAssistantId = mainAssistantResult.id;

        // ── STEP 4: Link phone number to main assistant ──
        logger.info(`[credentials-resources] Step 4: linking phone number ${created.vapiPhoneNumberId} to assistant ${created.vapiAssistantId}`);
        await vapiService.linkPhoneNumberToAssistant(created.vapiPhoneNumberId, created.vapiAssistantId);

        // ── STEP 5: Create feedback assistant ──
        logger.info(`[credentials-resources] Step 5: creating feedback assistant "${FeedBackCllingAgentName}" for "${hospital_name}"`);
        const feedbackAssistantResult = await vapiService.createFeedbackAssistant({
            name: FeedBackCllingAgentName,
            hospitalId: hospital_id,
            hospitalName: hospital_name
        });
        created.vapiFeedbackAssistantId = feedbackAssistantResult.id;

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
            vapi_assistant_id: created.vapiAssistantId,
            vapi_phone_number_id: created.vapiPhoneNumberId,
            vapi_feedback_assistant_id: created.vapiFeedbackAssistantId,

            // The Vapi-confirmed names
            main_vapi_assistant_name: mainAssistantResult.name,
            feedback_vapi_assistant_name: feedbackAssistantResult.name,

            // Pass-through fields
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
            ezy_vet_site_uid: payload.ezy_vet_site_uid,
        };

        try {
            await credentialService.saveCredentials(credentialsPayload);
        } catch (dbErr) {
            await rollback();
            throw new Error(`Failed to save credentials to database: ${dbErr.message}`);
        }

        // ── STEP 6.5: Update vet_desk_ai_crendatials with phone numbers ──
        logger.info(`[credentials-resources] Step 6.5: updating vet_desk_ai_crendatials for hospital ${hospital_id} with phone numbers`);
        try {
            const updateCredQuery = `
                UPDATE vet_desk_ai_crendatials
                SET agent_calling_phone_number = $1,
                    call_transfer_phone_number = $2
                WHERE hospital_id = $3
            `;
            await executeQuery(updateCredQuery, [number, forwordphonecallnumber, hospital_id]);
        } catch (credUpdateErr) {
            await rollback();
            throw new Error(`Failed to update vet_desk_ai_crendatials with phone numbers: ${credUpdateErr.message}`);
        }

        // ── STEP 7: Update the hospitals table with the same phone numbers ──
        logger.info(`[credentials-resources] Step 7: updating hospital ${hospital_id} with phone numbers`);
        try {
            const updateHospitalQuery = `
                UPDATE hospitals
                SET agent_calling_phone_number = $1,
                    call_transfer_phone_number = $2
                WHERE id = $3
            `;
            await executeQuery(updateHospitalQuery, [number, forwordphonecallnumber, hospital_id]);
        } catch (hospitalErr) {
            await rollback();
            throw new Error(`Failed to update hospital with phone numbers: ${hospitalErr.message}`);
        }

        // ── Final summary ──
        return {
            hospital_id,
            hospital_name,
            phone_number: {
                id: created.vapiPhoneNumberId,
                number: phoneNumberResult.number,
                name: phoneNumberResult.name
            },
            transfer_tool: {
                id: created.transferToolId,
                name: transferToolName
            },
            main_assistant: {
                id: created.vapiAssistantId,
                name: mainAssistantResult.name
            },
            feedback_assistant: {
                id: created.vapiFeedbackAssistantId,
                name: feedbackAssistantResult.name
            },
            credentials_saved: true,
            hospital_updated: true,
            credentials_updated: true
        };

    } catch (err) {
        await rollback();
        throw err;
    }
};










exports.deleteCredentialsResources = async function (hospitalId) {
    if (!hospitalId) {
        throw new Error('hospital_id is required');
    }

    // ── STEP 0: cheap existence check ──
    const exists = await credentialService.credentialsExist(hospitalId);
    if (!exists) {
        throw new Error(`No credentials found for hospital_id: ${hospitalId}`);
    }

    // ── STEP 1: fetch the full credentials row ──
    const credentials = await credentialService.getCredentials(hospitalId); // UPPERCASE keys

    const vapiAssistantId = credentials.VAPI_ASSISTANT_ID;
    const vapiPhoneNumberId = credentials.VAPI_PHONE_NUMBER_ID;
    const vapiFeedbackAssistantId = credentials.VAPI_FEEDBACK_ASSISTANT_ID;

    const results = {
        phone_number_deleted: false,
        main_assistant_deleted: false,
        feedback_assistant_deleted: false,
        db_record_deleted: false,
        hospital_phone_numbers_reset: false,  // NEW
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

    // ── NEW STEP: Reset agent_calling_phone_number and call_transfer_phone_number in hospitals table ──
    try {
        logger.info(`[credentials-resources/delete] resetting hospital phone numbers for hospital ${hospitalId}`);
        const updateQuery = `
            UPDATE hospitals
            SET agent_calling_phone_number = NULL,
                call_transfer_phone_number = NULL
            WHERE id = $1
        `;
        await executeQuery(updateQuery, [hospitalId]);
        results.hospital_phone_numbers_reset = true;
    } catch (error) {
        logger.error('Failed to reset hospital phone numbers:', error.message);
        results.errors.push(`Failed to reset hospital phone numbers: ${error.message}`);
        // Do not throw – the critical deletion (DB record + Vapi) already succeeded.
    }

    return {
        hospital_id: hospitalId,
        ...results
    };
};