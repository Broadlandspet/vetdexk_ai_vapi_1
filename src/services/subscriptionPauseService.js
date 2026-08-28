const stripe = require('./stripeService');
const PaymentService = require('./paymentService');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');


// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_PAUSE_INPUT = {
    unused_time_from:
        process.env.SUBSCRIPTION_PAUSE_UNUSED_TIME_FROM ||
        'none',

    outstanding_usage_through:
        process.env.SUBSCRIPTION_PAUSE_OUTSTANDING_USAGE_THROUGH ||
        'now',

    invoicing_behavior:
        process.env.SUBSCRIPTION_PAUSE_INVOICING_BEHAVIOR ||
        'pending_invoice_item'
};




// ============================================================================
// STRIPE PREVIEW API VERSION
// ============================================================================

function getPauseApiVersion() {

    return (
        process.env.STRIPE_PAUSE_API_VERSION ||
        '2026-07-29.preview'
    );
}


// ============================================================================
// UNIX -> ISO
// ============================================================================

function unixToIso(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return null;
    }

    return new Date(
        number * 1000
    ).toISOString();
}


// ============================================================================
// PAUSED AT
// ============================================================================

function getPausedAt(subscription) {

    return (
        subscription
            ?.status_details
            ?.paused
            ?.transitioned_at
        ??
        null
    );
}


// ============================================================================
// BILLING MODE
// ============================================================================

function getBillingModeType(subscription) {

    if (
        !subscription?.billing_mode
    ) {
        return null;
    }

    if (
        typeof subscription.billing_mode ===
        'string'
    ) {
        return subscription.billing_mode;
    }

    return (
        subscription.billing_mode.type ||
        null
    );
}


// ============================================================================
// FIND CURRENT PERIOD END
//
// Newer Stripe subscription responses can expose billing period information
// on subscription items.
// ============================================================================

function maxCurrentPeriodEnd(subscription) {

    const values = [];


    if (
        Number.isFinite(
            Number(
                subscription?.current_period_end
            )
        )
    ) {
        values.push(
            Number(
                subscription.current_period_end
            )
        );
    }


    const items =
        subscription?.items?.data || [];


    for (
        const item
        of items
    ) {

        if (
            Number.isFinite(
                Number(
                    item?.current_period_end
                )
            )
        ) {

            values.push(
                Number(
                    item.current_period_end
                )
            );
        }
    }


    if (
        values.length === 0
    ) {
        return null;
    }


    return Math.max(
        ...values
    );
}


// ============================================================================
// STRIPE RAW/PREVIEW REQUEST
//
// stripe.rawRequest is available on modern stripe-node versions.
//
// A fetch fallback is included so this integration does not depend on the
// generated SDK exposing the preview pause endpoint.
// ============================================================================

async function stripePreviewRequest(
    method,
    path,
    params = {},
    requestOptions = {}
) {

    const apiVersion =
        getPauseApiVersion();


    // ------------------------------------------------------------------------
    // Preferred: Stripe SDK rawRequest
    // ------------------------------------------------------------------------

    if (
        typeof stripe.rawRequest ===
        'function'
    ) {

        return stripe.rawRequest(
            method,
            path,
            params,
            {
                apiVersion,

                maxNetworkRetries:
                    2,

                ...requestOptions
            }
        );
    }


    // ------------------------------------------------------------------------
    // Fallback: native fetch
    // ------------------------------------------------------------------------

    if (
        typeof fetch !==
        'function'
    ) {

        const error =
            new Error(
                'Your Stripe SDK does not expose rawRequest and this Node version does not provide fetch(). Upgrade stripe-node or use Node 18+.'
            );

        error.statusCode =
            500;

        throw error;
    }


    if (
        !process.env.STRIPE_SECRET_KEY
    ) {

        const error =
            new Error(
                'STRIPE_SECRET_KEY is not configured.'
            );

        error.statusCode =
            500;

        throw error;
    }


    const headers = {

        Authorization:
            `Bearer ${process.env.STRIPE_SECRET_KEY}`,

        'Stripe-Version':
            apiVersion,

        'Content-Type':
            'application/x-www-form-urlencoded'
    };


    if (
        requestOptions.idempotencyKey
    ) {

        headers['Idempotency-Key'] =
            requestOptions.idempotencyKey;
    }


    const options = {

        method,

        headers
    };


    if (
        method !== 'GET' &&
        method !== 'HEAD'
    ) {

        const body =
            new URLSearchParams();


        for (
            const [
                key,
                value
            ]
            of Object.entries(params)
        ) {

            if (
                value !== null &&
                value !== undefined
            ) {

                body.append(
                    key,
                    String(value)
                );
            }
        }


        options.body =
            body.toString();
    }


    const response =
        await fetch(
            `https://api.stripe.com${path}`,
            options
        );


    const data =
        await response.json();


    if (
        !response.ok
    ) {

        const error =
            new Error(
                data?.error?.message ||
                `Stripe request failed with HTTP ${response.status}`
            );


        error.statusCode =
            response.status;


        error.code =
            data?.error?.code ||
            'STRIPE_REQUEST_FAILED';


        error.stripeError =
            data?.error ||
            null;


        throw error;
    }


    return data;
}


// ============================================================================
// RETRIEVE SUBSCRIPTION USING SAME PREVIEW VERSION
// ============================================================================

async function getPreviewSubscription(
    subscriptionId
) {

    return stripePreviewRequest(
        'GET',

        `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,

        {}
    );
}


// ============================================================================
// NORMALIZE PAUSE INPUT
// ============================================================================

function normalizePauseInput(
    input = {}
) {

    return {

        unused_time_from:
            input.unused_time_from
            ??
            DEFAULT_PAUSE_INPUT.unused_time_from,


        outstanding_usage_through:
            input.outstanding_usage_through
            ??
            DEFAULT_PAUSE_INPUT.outstanding_usage_through,


        invoicing_behavior:
            input.invoicing_behavior
            ??
            DEFAULT_PAUSE_INPUT.invoicing_behavior
    };
}


// ============================================================================
// SERIALIZE FOR LOG/HTTP RESPONSE
// ============================================================================

function serializeSubscription(
    subscription,
    extra = {}
) {

    const item =
        subscription?.items?.data?.[0]
        ||
        null;


    return {

        id:
            subscription?.id ||
            null,

        customer:
            subscription?.customer ||
            null,

        status:
            subscription?.status ||
            null,

        billing_mode:
            getBillingModeType(
                subscription
            ),

        collection_method:
            subscription?.collection_method ||
            null,

        test_clock:
            subscription?.test_clock ||
            null,

        current_period_start:
            subscription?.current_period_start
            ??
            item?.current_period_start
            ??
            null,

        current_period_end:
            subscription?.current_period_end
            ??
            item?.current_period_end
            ??
            null,

        paused_at:
            getPausedAt(
                subscription
            ),

        paused_at_iso:
            unixToIso(
                getPausedAt(
                    subscription
                )
            ),

        ended_at:
            subscription?.ended_at
            ??
            null,

        canceled_at:
            subscription?.canceled_at
            ??
            null,

        ...extra
    };
}


// ============================================================================
// PAUSE SAME STRIPE SUBSCRIPTION
// ============================================================================

async function pauseSubscriptionNow(
    subscriptionId,
    input = {}
) {

    if (
        !subscriptionId
    ) {

        const error =
            new Error(
                'Stripe subscription ID is required.'
            );

        error.statusCode =
            400;

        throw error;
    }


    // ------------------------------------------------------------------------
    // PER-SUBSCRIPTION LOCK
    //
    // Prevent:
    //
    // cron + manual request
    // cron + cron
    // two app requests
    //
    // from pausing the same subscription simultaneously.
    // ------------------------------------------------------------------------

    const lockKey =
        `subscription-pause:${subscriptionId}`;


    const lockResult =
        await executeQuery(
            `
            SELECT
                pg_try_advisory_lock(
                    hashtext($1)
                ) AS locked
            `,
            [
                lockKey
            ]
        );


    if (
        !lockResult.rows[0]?.locked
    ) {

        const error =
            new Error(
                'Pause operation is already in progress for this subscription.'
            );

        error.statusCode =
            409;

        error.code =
            'PAUSE_ALREADY_IN_PROGRESS';

        throw error;
    }


    try {

        const normalizedInput =
            normalizePauseInput(
                input
            );


        // ====================================================================
        // REAL SERVER TIME
        // ====================================================================

        const requestedPauseAt =
            Math.floor(
                Date.now() /
                1000
            );


        // ====================================================================
        // STRIPE BEFORE PAUSE
        // ====================================================================

        const before =
            await getPreviewSubscription(
                subscriptionId
            );


        logger.info(
            `[Subscription Pause] Stripe before pause: ${subscriptionId}, status=${before.status}`
        );


        // ====================================================================
        // ALREADY PAUSED
        //
        // Important for recovery:
        //
        // Stripe may have paused successfully but our DB update could have
        // failed. If cron retries, synchronize DB instead of failing.
        // ====================================================================

        if (
            before.status ===
            'paused'
        ) {

            await PaymentService
                .syncSubscriptionFromStripe(
                    before
                );


            const pausedAt =
                getPausedAt(
                    before
                );


            const periodEnd =
                maxCurrentPeriodEnd(
                    before
                );


            return {

                success:
                    true,

                already_paused:
                    true,

                message:
                    'Subscription was already paused in Stripe. Database was synchronized.',

                stripe:
                    serializeSubscription(
                        before,
                        {

                            effective_access_end_at:
                                unixToIso(
                                    pausedAt
                                    ??
                                    periodEnd
                                )
                        }
                    )
            };
        }


        // ====================================================================
        // TERMINAL SUBSCRIPTIONS
        // ====================================================================

        if (
            before.status ===
            'canceled'
            ||
            before.status ===
            'incomplete_expired'
        ) {

            const error =
                new Error(
                    `Subscription is ${before.status}. A terminal subscription cannot be paused.`
                );


            error.statusCode =
                400;


            error.code =
                'TERMINAL_SUBSCRIPTION';


            throw error;
        }


        // ====================================================================
        // ONLY ACTIVE SUBSCRIPTIONS
        //
        // Cron only selects active rows.
        //
        // Stripe documents additional restrictions for trialing, unpaid,
        // incomplete etc., so we reject them explicitly here.
        // ====================================================================

        if (
            before.status !==
            'active'
        ) {

            const error =
                new Error(
                    `Subscription must be active before it can be paused. Current Stripe status: ${before.status}.`
                );


            error.statusCode =
                400;


            error.code =
                'SUBSCRIPTION_NOT_ACTIVE';


            throw error;
        }


        // ====================================================================
        // TEST CLOCK SAFETY
        // ====================================================================

        const stripeTestClock =
            before.test_clock ||
            null;


        if (
            stripeTestClock
        ) {

            const error =
                new Error(
                    `This subscription is attached to Stripe Test Clock ${stripeTestClock}. ` +
                    `Stripe's pause timestamp follows the Test Clock instead of the server clock.`
                );


            error.statusCode =
                409;


            error.code =
                'STRIPE_TEST_CLOCK_ACTIVE';


            throw error;
        }


        // ====================================================================
        // FLEXIBLE BILLING MODE REQUIRED
        // ====================================================================

        const billingMode =
            getBillingModeType(
                before
            );


        if (
            billingMode !==
            'flexible'
        ) {

            const error =
                new Error(
                    `Stripe Pause Subscription requires flexible billing mode. Current billing mode is ${billingMode || 'unknown'}.`
                );


            error.statusCode =
                400;


            error.code =
                'STRIPE_FLEXIBLE_BILLING_REQUIRED';


            throw error;
        }


        // ====================================================================
        // COLLECTION METHOD
        // ====================================================================

        if (
            before.collection_method !==
            'charge_automatically'
        ) {

            const error =
                new Error(
                    'Stripe Pause Subscription requires collection_method=charge_automatically.'
                );


            error.statusCode =
                400;


            error.code =
                'UNSUPPORTED_COLLECTION_METHOD';


            throw error;
        }


        // ====================================================================
        // SUBSCRIPTION SCHEDULE
        // ====================================================================

        if (
            before.schedule
        ) {

            const error =
                new Error(
                    'Subscription has an attached Stripe schedule. Release the schedule before pausing.'
                );


            error.statusCode =
                400;


            error.code =
                'SUBSCRIPTION_HAS_SCHEDULE';


            throw error;
        }


        // ====================================================================
        // ACTIVE BILLING SCHEDULE
        // ====================================================================

        if (
            Array.isArray(
                before.billing_schedules
            )
            &&
            before.billing_schedules.length >
            0
        ) {

            const error =
                new Error(
                    'Subscription has an active billing schedule and cannot currently be paused.'
                );


            error.statusCode =
                400;


            error.code =
                'SUBSCRIPTION_HAS_BILLING_SCHEDULE';


            throw error;
        }


        // ====================================================================
        // ORIGINAL PERIOD
        // ====================================================================

        const beforeItem =
            before.items?.data?.[0]
            ||
            null;


        const originalPeriodStart =
            before.current_period_start
            ??
            beforeItem?.current_period_start
            ??
            null;


        const originalPeriodEnd =
            before.current_period_end
            ??
            beforeItem?.current_period_end
            ??
            maxCurrentPeriodEnd(
                before
            )
            ??
            null;


        // ====================================================================
        // CLOCK SAFETY
        // ====================================================================

        const CLOCK_TOLERANCE_SECONDS =
            5 * 60;


        if (
            originalPeriodStart
            &&
            originalPeriodStart >
                requestedPauseAt +
                CLOCK_TOLERANCE_SECONDS
        ) {

            const error =
                new Error(
                    `Stripe subscription time is ahead of server time. ` +
                    `Server=${unixToIso(requestedPauseAt)}, ` +
                    `Stripe period start=${unixToIso(originalPeriodStart)}.`
                );


            error.statusCode =
                409;


            error.code =
                'STRIPE_CLOCK_MISMATCH';


            throw error;
        }


        // ====================================================================
        // PAUSE
        // ====================================================================

        logger.info(
            `[Subscription Pause] Pausing Stripe subscription ${subscriptionId}`
        );


        const paused =
            await stripePreviewRequest(
                'POST',

                `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/pause`,

                {

                    'bill_for[unused_time_from][type]':
                        normalizedInput.unused_time_from,


                    'bill_for[outstanding_usage_through][type]':
                        normalizedInput.outstanding_usage_through,


                    invoicing_behavior:
                        normalizedInput.invoicing_behavior
                },

                {

                    idempotencyKey:
                        `pause-${subscriptionId}-${originalPeriodEnd || requestedPauseAt}`
                }
            );


        // ====================================================================
        // STRIPE PAUSE TIME
        // ====================================================================

        const pausedAt =
            getPausedAt(
                paused
            );


        const stripePeriodEnd =
            maxCurrentPeriodEnd(
                paused
            );


        const effectivePeriodEnd =
            pausedAt
            ??
            stripePeriodEnd
            ??
            requestedPauseAt;


        // ====================================================================
        // VERIFY CLOCK
        // ====================================================================

        const pauseClockDifference =
            pausedAt

                ? Math.abs(
                    pausedAt -
                    requestedPauseAt
                )

                : 0;


        const clockMismatch =
            pauseClockDifference >
            CLOCK_TOLERANCE_SECONDS;


        if (
            clockMismatch
        ) {

            logger.error(
                `[Subscription Pause] Stripe/server clock mismatch for ${subscriptionId}: ` +
                `server=${unixToIso(requestedPauseAt)}, ` +
                `stripe=${unixToIso(pausedAt)}`
            );
        }


        // ====================================================================
        // DB SYNC
        //
        // VERY IMPORTANT:
        //
        // syncSubscriptionFromStripe MUST have the paused special-case shown
        // later in this answer.
        //
        // That special-case preserves current_period_start.
        // ====================================================================

        await PaymentService
            .syncSubscriptionFromStripe(
                paused
            );


        logger.info(
            `[Subscription Pause] Successfully paused ${subscriptionId}. ` +
            `pausedAt=${unixToIso(effectivePeriodEnd)}`
        );


        // ====================================================================
        // RESULT
        // ====================================================================

        return {

            success:
                true,


            already_paused:
                false,


            message:
                'Subscription paused successfully in Stripe and synchronized with the database.',


            before: {

                status:
                    before.status,


                current_period_start:
                    originalPeriodStart,


                current_period_start_iso:
                    unixToIso(
                        originalPeriodStart
                    ),


                current_period_end:
                    originalPeriodEnd,


                current_period_end_iso:
                    unixToIso(
                        originalPeriodEnd
                    )
            },


            after: {

                status:
                    paused.status,


                // Keep original start for OUR DATABASE semantics.
                current_period_start:
                    originalPeriodStart,


                current_period_start_iso:
                    unixToIso(
                        originalPeriodStart
                    ),


                current_period_end:
                    effectivePeriodEnd,


                current_period_end_iso:
                    unixToIso(
                        effectivePeriodEnd
                    )
            },


            clock: {

                server_pause_at:
                    requestedPauseAt,


                server_pause_at_iso:
                    unixToIso(
                        requestedPauseAt
                    ),


                stripe_pause_at:
                    pausedAt,


                stripe_pause_at_iso:
                    unixToIso(
                        pausedAt
                    ),


                mismatch:
                    clockMismatch
            },


            stripe:
                serializeSubscription(
                    paused
                )
        };


    } finally {

        // ====================================================================
        // RELEASE PER-SUBSCRIPTION LOCK
        // ====================================================================

        try {

            await executeQuery(
                `
                SELECT
                    pg_advisory_unlock(
                        hashtext($1)
                    )
                `,
                [
                    lockKey
                ]
            );

        } catch (
            unlockError
        ) {

            logger.error(
                `[Subscription Pause] Failed to release lock for ${subscriptionId}: ${unlockError.message}`
            );
        }
    }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {

    pauseSubscriptionNow,

    getPreviewSubscription,

    DEFAULT_PAUSE_INPUT
};