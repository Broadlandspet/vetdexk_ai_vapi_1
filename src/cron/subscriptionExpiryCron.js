


// const cron =
//     require('node-cron');

// const {
//     executeQuery
// } = require('../config/database');

// const subscriptionPauseService =
//     require('../services/subscriptionPauseService');

// const logger =
//     require('../utils/logger');


// // ============================================================================
// // INTERNAL STATE
// // ============================================================================

// let scheduledTask =
//     null;


// // ============================================================================
// // BOOLEAN ENV HELPER
// // ============================================================================

// function envBoolean(
//     value,
//     fallback = false
// ) {

//     if (
//         value === undefined ||
//         value === null ||
//         value === ''
//     ) {

//         return fallback;
//     }


//     return [
//         'true',
//         '1',
//         'yes',
//         'on'
//     ].includes(
//         String(value)
//             .toLowerCase()
//     );
// }


// // ============================================================================
// // NUMBER ENV HELPER
// // ============================================================================

// function envPositiveInteger(
//     value,
//     fallback
// ) {

//     const parsed =
//         parseInt(
//             value,
//             10
//         );


//     if (
//         !Number.isFinite(parsed)
//         ||
//         parsed <= 0
//     ) {

//         return fallback;
//     }


//     return parsed;
// }


// // ============================================================================
// // PAUSE CONFIG
// // ============================================================================

// function getPauseInput() {

//     return {

//         unused_time_from:
//             process.env
//                 .SUBSCRIPTION_PAUSE_UNUSED_TIME_FROM
//             ||
//             'none',


//         outstanding_usage_through:
//             process.env
//                 .SUBSCRIPTION_PAUSE_OUTSTANDING_USAGE_THROUGH
//             ||
//             'now',


//         invoicing_behavior:
//             process.env
//                 .SUBSCRIPTION_PAUSE_INVOICING_BEHAVIOR
//             ||
//             'pending_invoice_item'
//     };
// }


// // ============================================================================
// // RUN EXPIRY SWEEP
// //
// // You can call this function manually in tests as well.
// //
// // IMPORTANT:
// //
// // This function processes ALL expired subscriptions.
// //
// // SUBSCRIPTION_EXPIRY_CRON_BATCH_SIZE controls only how many records are
// // loaded at one time.
// //
// // Example:
// //
// // 1,200 expired subscriptions
// // batch size = 500
// //
// // Batch 1 = 500
// // Batch 2 = 500
// // Batch 3 = 200
// // Batch 4 = 0
// //
// // Then cron finishes.
// // ============================================================================

// async function runSubscriptionExpirySweep() {

//     const cronStartedAt =
//         new Date();


//     const globalLockKey =
//         'subscription-expiry-pause-cron-v1';


//     let globalLockAcquired =
//         false;


//     // ========================================================================
//     // IMPORTANT:
//     //
//     // Remember every subscription attempted during THIS cron execution.
//     //
//     // This guarantees:
//     //
//     // 1. Successfully paused records are not selected again.
//     //
//     // 2. Failed records are not selected again forever inside the same run.
//     //
//     // 3. The next scheduled cron execution starts with a fresh Set, so failed
//     //    subscriptions can be retried later.
//     // ========================================================================

//     const processedSubscriptionIds =
//         new Set();


//     const summary = {

//         startedAt:
//             cronStartedAt.toISOString(),

//         checked:
//             0,

//         paused:
//             0,

//         alreadyPaused:
//             0,

//         failed:
//             0,

//         skipped:
//             false,

//         errors:
//             []
//     };


//     try {

//         logger.info(
//             `[Subscription Expiry Cron] Starting at ${cronStartedAt.toISOString()}`
//         );


//         // ====================================================================
//         // GLOBAL ADVISORY LOCK
//         //
//         // Important if production has multiple Node replicas.
//         //
//         // Only one instance performs the expiry sweep.
//         // ====================================================================

//         const globalLock =
//             await executeQuery(
//                 `
//                 SELECT
//                     pg_try_advisory_lock(
//                         hashtext($1)
//                     ) AS locked
//                 `,
//                 [
//                     globalLockKey
//                 ]
//             );


//         globalLockAcquired =
//             Boolean(
//                 globalLock.rows[0]
//                     ?.locked
//             );


//         if (
//             !globalLockAcquired
//         ) {

//             logger.info(
//                 '[Subscription Expiry Cron] Another instance is already running the expiry sweep.'
//             );


//             summary.skipped =
//                 true;


//             return summary;
//         }


//         // ====================================================================
//         // BATCH SIZE
//         //
//         // IMPORTANT:
//         //
//         // 500 means 500 AT A TIME.
//         //
//         // It does NOT mean only 500 subscriptions total.
//         //
//         // After one batch finishes, another query loads the next batch.
//         // ====================================================================

//         const batchSize =
//             envPositiveInteger(
//                 process.env
//                     .SUBSCRIPTION_EXPIRY_CRON_BATCH_SIZE,

//                 500
//             );


//         logger.info(
//             `[Subscription Expiry Cron] Batch size=${batchSize}`
//         );


//         // ====================================================================
//         // BATCH NUMBER
//         // ====================================================================

//         let batchNumber =
//             0;


//         // ====================================================================
//         // PROCESS ALL EXPIRED SUBSCRIPTIONS
//         //
//         // Continue querying until database returns ZERO eligible rows.
//         // ====================================================================

//         while (
//             true
//         ) {

//             batchNumber +=
//                 1;


//             // =================================================================
//             // IDS ALREADY ATTEMPTED DURING THIS RUN
//             //
//             // Convert to string because SQL compares id::text.
//             // =================================================================

//             const excludedIds =
//                 Array.from(
//                     processedSubscriptionIds
//                 ).map(
//                     id =>
//                         String(id)
//                 );


//             // =================================================================
//             // FIND NEXT BATCH OF EXPIRED SUBSCRIPTIONS
//             //
//             // Example:
//             //
//             // current_period_end:
//             //
//             // 2026-09-26 12:24:41
//             //
//             //
//             // Cron:
//             //
//             // 2026-09-27 00:00:00
//             //
//             //
//             // SQL:
//             //
//             // current_period_end <= NOW()
//             //
//             // TRUE
//             //
//             //
//             // IMPORTANT:
//             //
//             // Only ACTIVE subscriptions are selected.
//             //
//             // Successfully paused subscriptions become:
//             //
//             // active -> paused
//             //
//             // Therefore they naturally disappear from this query.
//             //
//             // processedSubscriptionIds gives us an additional safety layer
//             // so failed records cannot cause an infinite loop.
//             // =================================================================

//             const expiredResult =
//                 await executeQuery(
//                     `
//                     SELECT

//                         id,

//                         stripe_subscription_id,

//                         status,

//                         current_period_start,

//                         current_period_end,

//                         cancel_at_period_end,

//                         user_id,

//                         hospital_id,

//                         subscription_plans_id

//                     FROM subscriptions

//                     WHERE

//                         stripe_subscription_id
//                             IS NOT NULL

//                         AND current_period_end
//                             IS NOT NULL

//                         AND current_period_end
//                             <= NOW()

//                         AND status =
//                             'active'

//                         AND COALESCE(
//                             cancel_at_period_end,
//                             FALSE
//                         ) = FALSE

//                         AND NOT (
//                             id::text =
//                             ANY(
//                                 $2::text[]
//                             )
//                         )

//                     ORDER BY
//                         current_period_end ASC

//                     LIMIT $1
//                     `,
//                     [
//                         batchSize,
//                         excludedIds
//                     ]
//                 );


//             const subscriptions =
//                 expiredResult.rows;


//             // =================================================================
//             // NOTHING LEFT TO PROCESS
//             // =================================================================

//             if (
//                 subscriptions.length ===
//                 0
//             ) {

//                 logger.info(
//                     `[Subscription Expiry Cron] No more expired active subscriptions found.`
//                 );


//                 logger.info(
//                     `[Subscription Expiry Cron] Completed after ${batchNumber - 1} batch(es).`
//                 );


//                 break;
//             }


//             // =================================================================
//             // ADD TO TOTAL CHECKED
//             //
//             // IMPORTANT:
//             //
//             // Previously:
//             //
//             // summary.checked = subscriptions.length
//             //
//             // would only show the current batch.
//             //
//             // Now we accumulate ALL batches.
//             // =================================================================

//             summary.checked +=
//                 subscriptions.length;


//             logger.info(
//                 `[Subscription Expiry Cron] ` +
//                 `Batch ${batchNumber}: ` +
//                 `found ${subscriptions.length} expired active subscription(s).`
//             );


//             // =================================================================
//             // PROCESS CURRENT BATCH
//             //
//             // One by one.
//             // =================================================================

//             for (
//                 const dbSubscription
//                 of subscriptions
//             ) {

//                 const stripeSubscriptionId =
//                     dbSubscription
//                         .stripe_subscription_id;


//                 // =============================================================
//                 // MARK THIS DB ROW AS ATTEMPTED
//                 //
//                 // Do this BEFORE calling Stripe.
//                 //
//                 // Even if Stripe throws an error, this row won't be picked
//                 // again during the SAME cron execution.
//                 //
//                 // It can be retried on the NEXT scheduled cron execution.
//                 // =============================================================

//                 processedSubscriptionIds.add(
//                     String(
//                         dbSubscription.id
//                     )
//                 );


//                 try {

//                     logger.info(
//                         `[Subscription Expiry Cron] ` +
//                         `Batch=${batchNumber}, ` +
//                         `DB id=${dbSubscription.id}, ` +
//                         `Stripe=${stripeSubscriptionId}, ` +
//                         `expiredAt=${dbSubscription.current_period_end}`
//                     );


//                     // =========================================================
//                     // PAUSE SAME STRIPE SUBSCRIPTION
//                     //
//                     // subscriptionPauseService handles:
//                     //
//                     // - Stripe subscription retrieval
//                     // - Stripe status validation
//                     // - test clock validation
//                     // - flexible billing mode validation
//                     // - collection method validation
//                     // - schedule validation
//                     // - Stripe pause API
//                     // - DB synchronization
//                     // - preserving current_period_start
//                     // =========================================================

//                     const result =
//                         await subscriptionPauseService
//                             .pauseSubscriptionNow(
//                                 stripeSubscriptionId,
//                                 getPauseInput()
//                             );


//                     // =========================================================
//                     // ALREADY PAUSED
//                     //
//                     // This can happen when:
//                     //
//                     // Stripe was successfully paused previously,
//                     // but DB synchronization failed.
//                     //
//                     // pauseSubscriptionNow() should detect Stripe status
//                     // and synchronize the DB.
//                     // =========================================================

//                     if (
//                         result.already_paused
//                     ) {

//                         summary.alreadyPaused +=
//                             1;


//                         logger.info(
//                             `[Subscription Expiry Cron] ` +
//                             `Stripe subscription ${stripeSubscriptionId} ` +
//                             `was already paused. Database synchronized.`
//                         );


//                     } else {

//                         summary.paused +=
//                             1;


//                         logger.info(
//                             `[Subscription Expiry Cron] ` +
//                             `Successfully paused Stripe subscription ${stripeSubscriptionId}.`
//                         );
//                     }


//                     logger.info(
//                         `[Subscription Expiry Cron] ` +
//                         `Success ${stripeSubscriptionId}, ` +
//                         `alreadyPaused=${Boolean(result.already_paused)}`
//                     );


//                 } catch (
//                     error
//                 ) {

//                     // =========================================================
//                     // FAILURE
//                     //
//                     // IMPORTANT:
//                     //
//                     // We DO NOT throw here.
//                     //
//                     // One failed subscription must not stop:
//                     //
//                     // - remaining records in this batch
//                     // - next batches
//                     //
//                     //
//                     // Also, because its ID is in processedSubscriptionIds,
//                     // it will NOT be selected repeatedly during this same
//                     // cron execution.
//                     //
//                     // The next scheduled cron execution gets a fresh Set
//                     // and can retry it.
//                     // =========================================================

//                     summary.failed +=
//                         1;


//                     summary.errors.push({

//                         subscriptionId:
//                             dbSubscription.id,


//                         stripeSubscriptionId,


//                         code:
//                             error.code ||
//                             null,


//                         message:
//                             error.message
//                     });


//                     logger.error(
//                         `[Subscription Expiry Cron] ` +
//                         `Failed ${stripeSubscriptionId}: ` +
//                         `${error.message}`
//                     );
//                 }
//             }


//             // =================================================================
//             // CURRENT BATCH FINISHED
//             // =================================================================

//             logger.info(
//                 `[Subscription Expiry Cron] ` +
//                 `Batch ${batchNumber} completed. ` +
//                 `Processed this batch=${subscriptions.length}.`
//             );


//             logger.info(
//                 `[Subscription Expiry Cron] ` +
//                 `Running totals: ` +
//                 `checked=${summary.checked}, ` +
//                 `paused=${summary.paused}, ` +
//                 `alreadyPaused=${summary.alreadyPaused}, ` +
//                 `failed=${summary.failed}`
//             );


//             // =================================================================
//             // DO NOT RETURN HERE
//             //
//             // while(true) automatically goes back to the database
//             // and retrieves the NEXT batch.
//             // =================================================================
//         }


//         // ====================================================================
//         // ALL BATCHES COMPLETED
//         // ====================================================================

//         return summary;


//     } catch (
//         error
//     ) {

//         logger.error(
//             `[Subscription Expiry Cron] Fatal error: ${error.message}`
//         );


//         throw error;


//     } finally {

//         // ====================================================================
//         // RELEASE GLOBAL LOCK
//         // ====================================================================

//         if (
//             globalLockAcquired
//         ) {

//             try {

//                 await executeQuery(
//                     `
//                     SELECT
//                         pg_advisory_unlock(
//                             hashtext($1)
//                         )
//                     `,
//                     [
//                         globalLockKey
//                     ]
//                 );


//             } catch (
//                 unlockError
//             ) {

//                 logger.error(
//                     `[Subscription Expiry Cron] Failed to release global lock: ${unlockError.message}`
//                 );
//             }
//         }


//         // ====================================================================
//         // FINAL SUMMARY
//         // ====================================================================

//         logger.info(
//             `[Subscription Expiry Cron] Finished. ` +
//             `checked=${summary.checked}, ` +
//             `paused=${summary.paused}, ` +
//             `alreadyPaused=${summary.alreadyPaused}, ` +
//             `failed=${summary.failed}`
//         );
//     }
// }


// // ============================================================================
// // START CRON
// // ============================================================================

// function startSubscriptionExpiryCron() {

//     if (
//         scheduledTask
//     ) {

//         return scheduledTask;
//     }


//     const enabled =
//         envBoolean(
//             process.env
//                 .SUBSCRIPTION_EXPIRY_CRON_ENABLED,

//             true
//         );


//     if (
//         !enabled
//     ) {

//         logger.info(
//             '[Subscription Expiry Cron] Disabled by environment configuration.'
//         );


//         return null;
//     }


//     // ------------------------------------------------------------------------
//     // CHANGE THIS THROUGH .env
//     //
//     // Default:
//     //
//     // midnight every day
//     //
//     //
//     // Examples:
//     //
//     // 0 0 * * *
//     // midnight daily
//     //
//     // */5 * * * *
//     // every 5 minutes
//     //
//     // 0 * * * *
//     // every hour
//     //
//     // ------------------------------------------------------------------------

//     const schedule =
//         process.env
//             .SUBSCRIPTION_EXPIRY_CRON_SCHEDULE
//         ||
//         // '0 0 * * *';
//         '*/2 * * * *';
        



//     const timezone =
//         process.env
//             .SUBSCRIPTION_EXPIRY_CRON_TIMEZONE
//         ||
//         'Asia/Kolkata';


//     if (
//         !cron.validate(
//             schedule
//         )
//     ) {

//         throw new Error(
//             `Invalid SUBSCRIPTION_EXPIRY_CRON_SCHEDULE: ${schedule}`
//         );
//     }


//     scheduledTask =
//         cron.schedule(
//             schedule,

//             async () => {

//                 try {

//                     await runSubscriptionExpirySweep();


//                 } catch (
//                     error
//                 ) {

//                     logger.error(
//                         `[Subscription Expiry Cron] Scheduled execution failed: ${error.message}`
//                     );
//                 }
//             },

//             {

//                 timezone,


//                 // Supported by current node-cron.
//                 //
//                 // Prevent same Node process from starting a second
//                 // expiry sweep while the first one is still running.

//                 noOverlap:
//                     true,


//                 name:
//                     'subscription-expiry-pause'
//             }
//         );


//     logger.info(
//         `[Subscription Expiry Cron] Scheduled="${schedule}" timezone="${timezone}"`
//     );


//     // ========================================================================
//     // OPTIONAL RUN AT SERVER START
//     //
//     // false:
//     //
//     // only scheduled execution
//     //
//     // true:
//     //
//     // run once immediately when backend starts
//     // AND continue normal cron schedule afterward
//     // ========================================================================

//     const runOnStartup =
//         envBoolean(
//             process.env
//                 .SUBSCRIPTION_EXPIRY_CRON_RUN_ON_STARTUP,

//             false
//         );


//     if (
//         runOnStartup
//     ) {

//         setImmediate(
//             async () => {

//                 try {

//                     await runSubscriptionExpirySweep();


//                 } catch (
//                     error
//                 ) {

//                     logger.error(
//                         `[Subscription Expiry Cron] Startup sweep failed: ${error.message}`
//                     );
//                 }
//             }
//         );
//     }


//     return scheduledTask;
// }


// // ============================================================================
// // STOP
// // ============================================================================

// function stopSubscriptionExpiryCron() {

//     if (
//         scheduledTask
//     ) {

//         scheduledTask.stop();


//         scheduledTask =
//             null;
//     }
// }


// // ============================================================================
// // EXPORTS
// // ============================================================================

// module.exports = {

//     startSubscriptionExpiryCron,

//     stopSubscriptionExpiryCron,

//     runSubscriptionExpirySweep
// };










const cron =
    require('node-cron');

const {
    executeQuery
} = require('../config/database');

const subscriptionPauseService =
    require('../services/subscriptionPauseService');

const logger =
    require('../utils/logger');


// ============================================================================
// NEW: REQUIRED FOR VAPI PHONE NUMBER RELINK
// ============================================================================

const credentialService =
    require('../services/credentialService');

const vapiService =
    require('../services/vapiService');

const {
    DEACTIVATED_STATIC_ASSISTANT_ID
} = require('../config/vapiConfig');


// ============================================================================
// INTERNAL STATE
// ============================================================================

let scheduledTask =
    null;


// ============================================================================
// BOOLEAN ENV HELPER
// ============================================================================

function envBoolean(
    value,
    fallback = false
) {

    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {

        return fallback;
    }


    return [
        'true',
        '1',
        'yes',
        'on'
    ].includes(
        String(value)
            .toLowerCase()
    );
}


// ============================================================================
// NUMBER ENV HELPER
// ============================================================================

function envPositiveInteger(
    value,
    fallback
) {

    const parsed =
        parseInt(
            value,
            10
        );


    if (
        !Number.isFinite(parsed)
        ||
        parsed <= 0
    ) {

        return fallback;
    }


    return parsed;
}


// ============================================================================
// PAUSE CONFIG
// ============================================================================

function getPauseInput() {

    return {

        unused_time_from:
            process.env
                .SUBSCRIPTION_PAUSE_UNUSED_TIME_FROM
            ||
            'none',


        outstanding_usage_through:
            process.env
                .SUBSCRIPTION_PAUSE_OUTSTANDING_USAGE_THROUGH
            ||
            'now',


        invoicing_behavior:
            process.env
                .SUBSCRIPTION_PAUSE_INVOICING_BEHAVIOR
            ||
            'pending_invoice_item'
    };
}


// ============================================================================
// NEW: RELINK HOSPITAL'S VAPI PHONE NUMBER TO STATIC DEACTIVATED ASSISTANT
//
// VAPI-ONLY OPERATION.
//
// Does NOT write anything to the database.
//
// Only reads decrypted credentials (to get vapi_phone_number_id) and then
// calls the Vapi API to relink that phone number to the static fallback
// assistant.
//
// Any failure here is caught by the caller and must NOT affect the
// subscription pause result.
// ============================================================================

async function relinkHospitalPhoneToStaticAssistant(
    hospitalId
) {

    const credentials =
        await credentialService.getCredentials(
            hospitalId
        );


    const phoneNumberId =
        credentials
            .VAPI_PHONE_NUMBER_ID;


    if (
        !phoneNumberId
    ) {

        logger.warn(
            `[Subscription Expiry Cron] ` +
            `No vapi_phone_number_id stored for hospital ${hospitalId}; ` +
            `skipped Vapi relink.`
        );


        return false;
    }


    await vapiService.linkPhoneNumberToAssistant(
        phoneNumberId,
        DEACTIVATED_STATIC_ASSISTANT_ID
    );


    logger.info(
        `[Subscription Expiry Cron] ` +
        `Relinked hospital ${hospitalId} phone number ${phoneNumberId} ` +
        `to static deactivated assistant ${DEACTIVATED_STATIC_ASSISTANT_ID}.`
    );


    return true;
}


// ============================================================================
// RUN EXPIRY SWEEP
//
// You can call this function manually in tests as well.
//
// IMPORTANT:
//
// This function processes ALL expired subscriptions.
//
// SUBSCRIPTION_EXPIRY_CRON_BATCH_SIZE controls only how many records are
// loaded at one time.
//
// Example:
//
// 1,200 expired subscriptions
// batch size = 500
//
// Batch 1 = 500
// Batch 2 = 500
// Batch 3 = 200
// Batch 4 = 0
//
// Then cron finishes.
// ============================================================================

async function runSubscriptionExpirySweep() {

    const cronStartedAt =
        new Date();


    const globalLockKey =
        'subscription-expiry-pause-cron-v1';


    let globalLockAcquired =
        false;


    // ========================================================================
    // IMPORTANT:
    //
    // Remember every subscription attempted during THIS cron execution.
    //
    // This guarantees:
    //
    // 1. Successfully paused records are not selected again.
    //
    // 2. Failed records are not selected again forever inside the same run.
    //
    // 3. The next scheduled cron execution starts with a fresh Set, so failed
    //    subscriptions can be retried later.
    // ========================================================================

    const processedSubscriptionIds =
        new Set();


    const summary = {

        startedAt:
            cronStartedAt.toISOString(),

        checked:
            0,

        paused:
            0,

        alreadyPaused:
            0,

        failed:
            0,

        skipped:
            false,

        // NEW: track vapi relink outcomes
        assistantRelinked:
            0,

        assistantRelinkSkipped:
            0,

        assistantRelinkFailed:
            0,

        errors:
            []
    };


    try {

        logger.info(
            `[Subscription Expiry Cron] Starting at ${cronStartedAt.toISOString()}`
        );


        // ====================================================================
        // GLOBAL ADVISORY LOCK
        //
        // Important if production has multiple Node replicas.
        //
        // Only one instance performs the expiry sweep.
        // ====================================================================

        const globalLock =
            await executeQuery(
                `
                SELECT
                    pg_try_advisory_lock(
                        hashtext($1)
                    ) AS locked
                `,
                [
                    globalLockKey
                ]
            );


        globalLockAcquired =
            Boolean(
                globalLock.rows[0]
                    ?.locked
            );


        if (
            !globalLockAcquired
        ) {

            logger.info(
                '[Subscription Expiry Cron] Another instance is already running the expiry sweep.'
            );


            summary.skipped =
                true;


            return summary;
        }


        // ====================================================================
        // BATCH SIZE
        //
        // IMPORTANT:
        //
        // 500 means 500 AT A TIME.
        //
        // It does NOT mean only 500 subscriptions total.
        //
        // After one batch finishes, another query loads the next batch.
        // ====================================================================

        const batchSize =
            envPositiveInteger(
                process.env
                    .SUBSCRIPTION_EXPIRY_CRON_BATCH_SIZE,

                500
            );


        logger.info(
            `[Subscription Expiry Cron] Batch size=${batchSize}`
        );


        // ====================================================================
        // BATCH NUMBER
        // ====================================================================

        let batchNumber =
            0;


        // ====================================================================
        // PROCESS ALL EXPIRED SUBSCRIPTIONS
        //
        // Continue querying until database returns ZERO eligible rows.
        // ====================================================================

        while (
            true
        ) {

            batchNumber +=
                1;


            // =================================================================
            // IDS ALREADY ATTEMPTED DURING THIS RUN
            //
            // Convert to string because SQL compares id::text.
            // =================================================================

            const excludedIds =
                Array.from(
                    processedSubscriptionIds
                ).map(
                    id =>
                        String(id)
                );


            // =================================================================
            // FIND NEXT BATCH OF EXPIRED SUBSCRIPTIONS
            //
            // Example:
            //
            // current_period_end:
            //
            // 2026-09-26 12:24:41
            //
            //
            // Cron:
            //
            // 2026-09-27 00:00:00
            //
            //
            // SQL:
            //
            // current_period_end <= NOW()
            //
            // TRUE
            //
            //
            // IMPORTANT:
            //
            // Only ACTIVE subscriptions are selected.
            //
            // Successfully paused subscriptions become:
            //
            // active -> paused
            //
            // Therefore they naturally disappear from this query.
            //
            // processedSubscriptionIds gives us an additional safety layer
            // so failed records cannot cause an infinite loop.
            // =================================================================

            const expiredResult =
                await executeQuery(
                    `
                    SELECT

                        id,

                        stripe_subscription_id,

                        status,

                        current_period_start,

                        current_period_end,

                        cancel_at_period_end,

                        user_id,

                        hospital_id,

                        subscription_plans_id

                    FROM subscriptions

                    WHERE

                        stripe_subscription_id
                            IS NOT NULL

                        AND current_period_end
                            IS NOT NULL

                        AND current_period_end
                            <= NOW()

                        AND status =
                            'active'

                        AND COALESCE(
                            cancel_at_period_end,
                            FALSE
                        ) = FALSE

                        AND NOT (
                            id::text =
                            ANY(
                                $2::text[]
                            )
                        )

                    ORDER BY
                        current_period_end ASC

                    LIMIT $1
                    `,
                    [
                        batchSize,
                        excludedIds
                    ]
                );


            const subscriptions =
                expiredResult.rows;


            // =================================================================
            // NOTHING LEFT TO PROCESS
            // =================================================================

            if (
                subscriptions.length ===
                0
            ) {

                logger.info(
                    `[Subscription Expiry Cron] No more expired active subscriptions found.`
                );


                logger.info(
                    `[Subscription Expiry Cron] Completed after ${batchNumber - 1} batch(es).`
                );


                break;
            }


            // =================================================================
            // ADD TO TOTAL CHECKED
            //
            // IMPORTANT:
            //
            // Previously:
            //
            // summary.checked = subscriptions.length
            //
            // would only show the current batch.
            //
            // Now we accumulate ALL batches.
            // =================================================================

            summary.checked +=
                subscriptions.length;


            logger.info(
                `[Subscription Expiry Cron] ` +
                `Batch ${batchNumber}: ` +
                `found ${subscriptions.length} expired active subscription(s).`
            );


            // =================================================================
            // PROCESS CURRENT BATCH
            //
            // One by one.
            // =================================================================

            for (
                const dbSubscription
                of subscriptions
            ) {

                const stripeSubscriptionId =
                    dbSubscription
                        .stripe_subscription_id;


                // =============================================================
                // MARK THIS DB ROW AS ATTEMPTED
                //
                // Do this BEFORE calling Stripe.
                //
                // Even if Stripe throws an error, this row won't be picked
                // again during the SAME cron execution.
                //
                // It can be retried on the NEXT scheduled cron execution.
                // =============================================================

                processedSubscriptionIds.add(
                    String(
                        dbSubscription.id
                    )
                );


                try {

                    logger.info(
                        `[Subscription Expiry Cron] ` +
                        `Batch=${batchNumber}, ` +
                        `DB id=${dbSubscription.id}, ` +
                        `Stripe=${stripeSubscriptionId}, ` +
                        `expiredAt=${dbSubscription.current_period_end}`
                    );


                    // =========================================================
                    // PAUSE SAME STRIPE SUBSCRIPTION
                    //
                    // subscriptionPauseService handles:
                    //
                    // - Stripe subscription retrieval
                    // - Stripe status validation
                    // - test clock validation
                    // - flexible billing mode validation
                    // - collection method validation
                    // - schedule validation
                    // - Stripe pause API
                    // - DB synchronization
                    // - preserving current_period_start
                    // =========================================================

                    const result =
                        await subscriptionPauseService
                            .pauseSubscriptionNow(
                                stripeSubscriptionId,
                                getPauseInput()
                            );


                    // =========================================================
                    // ALREADY PAUSED
                    //
                    // This can happen when:
                    //
                    // Stripe was successfully paused previously,
                    // but DB synchronization failed.
                    //
                    // pauseSubscriptionNow() should detect Stripe status
                    // and synchronize the DB.
                    // =========================================================

                    if (
                        result.already_paused
                    ) {

                        summary.alreadyPaused +=
                            1;


                        logger.info(
                            `[Subscription Expiry Cron] ` +
                            `Stripe subscription ${stripeSubscriptionId} ` +
                            `was already paused. Database synchronized.`
                        );


                    } else {

                        summary.paused +=
                            1;


                        logger.info(
                            `[Subscription Expiry Cron] ` +
                            `Successfully paused Stripe subscription ${stripeSubscriptionId}.`
                        );
                    }


                    logger.info(
                        `[Subscription Expiry Cron] ` +
                        `Success ${stripeSubscriptionId}, ` +
                        `alreadyPaused=${Boolean(result.already_paused)}`
                    );


                    // =========================================================
                    // NEW: RELINK HOSPITAL'S VAPI PHONE NUMBER
                    //
                    // VAPI-ONLY. No DB writes here.
                    //
                    // Runs for BOTH the "paused" and "already_paused" cases
                    // above, since in both cases the subscription is
                    // effectively expired/paused and the phone number should
                    // point to the static deactivated assistant.
                    //
                    // Wrapped in its own try/catch so a Vapi failure never
                    // affects the subscription pause result recorded above.
                    // =========================================================

                    try {

                        const relinked =
                            await relinkHospitalPhoneToStaticAssistant(
                                dbSubscription.hospital_id
                            );


                        if (
                            relinked
                        ) {

                            summary.assistantRelinked +=
                                1;


                        } else {

                            summary.assistantRelinkSkipped +=
                                1;
                        }


                    } catch (
                        vapiError
                    ) {

                        summary.assistantRelinkFailed +=
                            1;


                        logger.error(
                            `[Subscription Expiry Cron] ` +
                            `Failed to relink Vapi phone number for ` +
                            `hospital ${dbSubscription.hospital_id} ` +
                            `(subscription ${stripeSubscriptionId}): ` +
                            `${vapiError.message}`
                        );
                    }


                } catch (
                    error
                ) {

                    // =========================================================
                    // FAILURE
                    //
                    // IMPORTANT:
                    //
                    // We DO NOT throw here.
                    //
                    // One failed subscription must not stop:
                    //
                    // - remaining records in this batch
                    // - next batches
                    //
                    //
                    // Also, because its ID is in processedSubscriptionIds,
                    // it will NOT be selected repeatedly during this same
                    // cron execution.
                    //
                    // The next scheduled cron execution gets a fresh Set
                    // and can retry it.
                    // =========================================================

                    summary.failed +=
                        1;


                    summary.errors.push({

                        subscriptionId:
                            dbSubscription.id,


                        stripeSubscriptionId,


                        code:
                            error.code ||
                            null,


                        message:
                            error.message
                    });


                    logger.error(
                        `[Subscription Expiry Cron] ` +
                        `Failed ${stripeSubscriptionId}: ` +
                        `${error.message}`
                    );
                }
            }


            // =================================================================
            // CURRENT BATCH FINISHED
            // =================================================================

            logger.info(
                `[Subscription Expiry Cron] ` +
                `Batch ${batchNumber} completed. ` +
                `Processed this batch=${subscriptions.length}.`
            );


            logger.info(
                `[Subscription Expiry Cron] ` +
                `Running totals: ` +
                `checked=${summary.checked}, ` +
                `paused=${summary.paused}, ` +
                `alreadyPaused=${summary.alreadyPaused}, ` +
                `failed=${summary.failed}, ` +
                `assistantRelinked=${summary.assistantRelinked}, ` +
                `assistantRelinkSkipped=${summary.assistantRelinkSkipped}, ` +
                `assistantRelinkFailed=${summary.assistantRelinkFailed}`
            );


            // =================================================================
            // DO NOT RETURN HERE
            //
            // while(true) automatically goes back to the database
            // and retrieves the NEXT batch.
            // =================================================================
        }


        // ====================================================================
        // ALL BATCHES COMPLETED
        // ====================================================================

        return summary;


    } catch (
        error
    ) {

        logger.error(
            `[Subscription Expiry Cron] Fatal error: ${error.message}`
        );


        throw error;


    } finally {

        // ====================================================================
        // RELEASE GLOBAL LOCK
        // ====================================================================

        if (
            globalLockAcquired
        ) {

            try {

                await executeQuery(
                    `
                    SELECT
                        pg_advisory_unlock(
                            hashtext($1)
                        )
                    `,
                    [
                        globalLockKey
                    ]
                );


            } catch (
                unlockError
            ) {

                logger.error(
                    `[Subscription Expiry Cron] Failed to release global lock: ${unlockError.message}`
                );
            }
        }


        // ====================================================================
        // FINAL SUMMARY
        // ====================================================================

        logger.info(
            `[Subscription Expiry Cron] Finished. ` +
            `checked=${summary.checked}, ` +
            `paused=${summary.paused}, ` +
            `alreadyPaused=${summary.alreadyPaused}, ` +
            `failed=${summary.failed}, ` +
            `assistantRelinked=${summary.assistantRelinked}, ` +
            `assistantRelinkSkipped=${summary.assistantRelinkSkipped}, ` +
            `assistantRelinkFailed=${summary.assistantRelinkFailed}`
        );
    }
}


// ============================================================================
// START CRON
// ============================================================================

function startSubscriptionExpiryCron() {

    if (
        scheduledTask
    ) {

        return scheduledTask;
    }


    const enabled =
        envBoolean(
            process.env
                .SUBSCRIPTION_EXPIRY_CRON_ENABLED,

            true
        );


    if (
        !enabled
    ) {

        logger.info(
            '[Subscription Expiry Cron] Disabled by environment configuration.'
        );


        return null;
    }


    // ------------------------------------------------------------------------
    // CHANGE THIS THROUGH .env
    //
    // Default:
    //
    // midnight every day
    //
    //
    // Examples:
    //
    // 0 0 * * *
    // midnight daily
    //
    // */5 * * * *
    // every 5 minutes
    //
    // 0 * * * *
    // every hour
    //
    // ------------------------------------------------------------------------

    const schedule =
        process.env
            .SUBSCRIPTION_EXPIRY_CRON_SCHEDULE
        ||
        // '0 0 * * *';
        '*/2 * * * *';
        



    const timezone =
        process.env
            .SUBSCRIPTION_EXPIRY_CRON_TIMEZONE
        ||
        'Asia/Kolkata';


    if (
        !cron.validate(
            schedule
        )
    ) {

        throw new Error(
            `Invalid SUBSCRIPTION_EXPIRY_CRON_SCHEDULE: ${schedule}`
        );
    }


    scheduledTask =
        cron.schedule(
            schedule,

            async () => {

                try {

                    await runSubscriptionExpirySweep();


                } catch (
                    error
                ) {

                    logger.error(
                        `[Subscription Expiry Cron] Scheduled execution failed: ${error.message}`
                    );
                }
            },

            {

                timezone,


                // Supported by current node-cron.
                //
                // Prevent same Node process from starting a second
                // expiry sweep while the first one is still running.

                noOverlap:
                    true,


                name:
                    'subscription-expiry-pause'
            }
        );


    logger.info(
        `[Subscription Expiry Cron] Scheduled="${schedule}" timezone="${timezone}"`
    );


    // ========================================================================
    // OPTIONAL RUN AT SERVER START
    //
    // false:
    //
    // only scheduled execution
    //
    // true:
    //
    // run once immediately when backend starts
    // AND continue normal cron schedule afterward
    // ========================================================================

    const runOnStartup =
        envBoolean(
            process.env
                .SUBSCRIPTION_EXPIRY_CRON_RUN_ON_STARTUP,

            false
        );


    if (
        runOnStartup
    ) {

        setImmediate(
            async () => {

                try {

                    await runSubscriptionExpirySweep();


                } catch (
                    error
                ) {

                    logger.error(
                        `[Subscription Expiry Cron] Startup sweep failed: ${error.message}`
                    );
                }
            }
        );
    }


    return scheduledTask;
}


// ============================================================================
// STOP
// ============================================================================

function stopSubscriptionExpiryCron() {

    if (
        scheduledTask
    ) {

        scheduledTask.stop();


        scheduledTask =
            null;
    }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {

    startSubscriptionExpiryCron,

    stopSubscriptionExpiryCron,

    runSubscriptionExpirySweep
};