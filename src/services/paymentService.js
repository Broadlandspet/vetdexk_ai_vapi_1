
// // services/paymentService.js
// const crypto = require('crypto');
// const stripe = require('./stripeService');
// const { executeQuery } = require('../config/database');
// const BookDemoService = require('./bookDemoService');
// const SubscriptionPlanService = require('./subscriptionPlanService');
// const logger = require('../utils/logger');

// const FRONTEND_URL = process.env.FEEDBACK_URL || 'http://localhost:3000';

// // ─── CHECKOUT ────────────────────────────────────────────────────────────
// async function createCheckoutSession(bookingId, subscriptionPlanId) {
//     if (!subscriptionPlanId) {
//         throw new Error('Invalid plan: subscriptionPlanId is required');
//     }

//     const plan = await SubscriptionPlanService.getActivePlanById(subscriptionPlanId);
//     if (!plan) {
//         throw new Error('Invalid plan: not found or not active');
//     }

//     const booking = await BookDemoService.getBookingById(bookingId);
//     if (!booking) {
//         throw new Error('Booking not found');
//     }

//     const metadata = {
//         bookingId: String(bookingId),
//         subscriptionPlanId: String(plan.subscriptionPlanId)
//     };

//     const session = await stripe.checkout.sessions.create({
//         mode: 'subscription',
//         payment_method_types: ['card'],
//         customer_email: booking.email || undefined,
//         line_items: [{ price: plan.stripePriceId, quantity: 1 }],
//         metadata,
//         subscription_data: { metadata },
//         success_url: `${FRONTEND_URL}/feedbackform/${booking.feedback_token || ''}?payment=success`,
//         cancel_url: `${FRONTEND_URL}/feedbackform/${booking.feedback_token || ''}?payment=cancelled`
//     });

//     return { checkoutUrl: session.url };
// }

// // ─── SUBSCRIPTION SYNC ────────────────────────────────────────────────────

// async function syncSubscriptionFromStripe(stripeSubscription) {
//     console.log(`📝 [syncSubscriptionFromStripe] ========== START ==========`);
//     console.log(`📝 Subscription ID: ${stripeSubscription.id}`);
//     console.log(`📝 Status: ${stripeSubscription.status}`);
//     console.log(`📝 Metadata:`, JSON.stringify(stripeSubscription.metadata, null, 2));

//     const metadata = stripeSubscription.metadata || {};
//     const bookingId = metadata.bookingId ? parseInt(metadata.bookingId, 10) : null;
//     const subscriptionPlanId = metadata.subscriptionPlanId ? parseInt(metadata.subscriptionPlanId, 10) : null;
//     const userId = metadata.userId ? metadata.userId : null;
//     const hospitalId = metadata.hospitalId ? parseInt(metadata.hospitalId, 10) : null;
//     const action = metadata.action || null;   // ← NEW: 'reactivate' set by Case 2 checkout metadata

//     console.log(`📝 bookingId: ${bookingId}, subscriptionPlanId: ${subscriptionPlanId}, userId: ${userId}, hospitalId: ${hospitalId}, action: ${action}`);

//     // Validate booking exists (if bookingId provided)
//     if (bookingId) {
//         const bookingCheck = await executeQuery(
//             `SELECT id FROM book_demo WHERE id = $1`,
//             [bookingId]
//         );
//         if (bookingCheck.rows.length === 0) {
//             throw new Error(`Booking ${bookingId} not found`);
//         }
//         console.log(`✅ Booking ${bookingId} exists`);
//     }

//     // Validate plan exists (required)
//     if (!subscriptionPlanId) {
//         throw new Error('No subscriptionPlanId in metadata');
//     }
//     const planCheck = await executeQuery(
//         `SELECT subscription_plan_id FROM subscription_plans WHERE subscription_plan_id = $1`,
//         [subscriptionPlanId]
//     );
//     if (planCheck.rows.length === 0) {
//         throw new Error(`Plan ${subscriptionPlanId} not found`);
//     }

//     // FIXED: was `subscription.status` (undefined variable) — now uses the
//     // actual function parameter, stripeSubscription.
//     if (stripeSubscription.status === 'paused') {
//         return syncPausedSubscriptionFromStripe(stripeSubscription);
//     }

//     console.log(`✅ Plan ${subscriptionPlanId} exists`);

//     const item = stripeSubscription.items?.data?.[0];
//     const periodStart = stripeSubscription.current_period_start ?? item?.current_period_start;
//     const periodEnd = stripeSubscription.current_period_end ?? item?.current_period_end;

//     const stripeCustomerId = typeof stripeSubscription.customer === 'string'
//         ? stripeSubscription.customer
//         : stripeSubscription.customer?.id;

//     console.log(`📝 periodStart: ${periodStart}, periodEnd: ${periodEnd}`);
//     console.log(`📝 stripeCustomerId: ${stripeCustomerId}`);

//     // ========================================================================
//     // REACTIVATE (Case 2 restart of a canceled/past_due/unpaid/incomplete sub):
//     //
//     // The old subscription was already stripe.subscriptions.cancel()'d in
//     // renewSubscription (Case 2), and a NEW Checkout Session was created,
//     // which produces a NEW stripe_subscription_id once paid.
//     //
//     // Without this branch, the INSERT ... ON CONFLICT (stripe_subscription_id)
//     // below would never conflict (new ID = new row), leaving the old canceled
//     // row orphaned and creating a duplicate row per reactivation instead of
//     // updating the same user/hospital's subscription record in place.
//     //
//     // Only runs when action === 'reactivate' AND we have both userId and
//     // hospitalId to find the existing row by. Falls through to the normal
//     // insert/upsert path below if no matching row is found, so this is safe
//     // even on first-ever signup metadata accidentally carrying 'reactivate'.
//     // ========================================================================
//     if (action === 'reactivate' && userId && hospitalId) {

//         const existing = await executeQuery(
//             `SELECT id FROM subscriptions
//              WHERE user_id = $1 AND hospital_id = $2
//              ORDER BY created_at DESC
//              LIMIT 1`,
//             [userId, hospitalId]
//         );

//         if (existing.rows.length > 0) {

//             console.log(`📝 [reactivate] Updating existing subscription row ${existing.rows[0].id} in place with new Stripe subscription ${stripeSubscription.id}`);

//             try {
//                 const result = await executeQuery(
//                     `UPDATE subscriptions SET
//                         booking_id              = COALESCE($2, booking_id),
//                         subscription_plans_id   = $3,
//                         stripe_customer_id      = $4,
//                         stripe_subscription_id  = $5,
//                         status                  = $6,
//                         current_period_start    = $7,
//                         current_period_end      = $8,
//                         cancel_at_period_end    = $9,
//                         canceled_at             = $10,
//                         updated_at              = NOW()
//                      WHERE id = $1
//                      RETURNING *`,
//                     [
//                         existing.rows[0].id,
//                         bookingId,
//                         subscriptionPlanId,
//                         stripeCustomerId,
//                         stripeSubscription.id,
//                         stripeSubscription.status,
//                         periodStart ? new Date(periodStart * 1000) : null,
//                         periodEnd ? new Date(periodEnd * 1000) : null,
//                         !!stripeSubscription.cancel_at_period_end,
//                         stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
//                     ]
//                 );

//                 console.log(`✅ [reactivate] Row ${existing.rows[0].id} updated in place.`);
//                 console.log(`✅ Row after update:`, JSON.stringify(result.rows[0], null, 2));

//                 return result.rows[0];
//             } catch (error) {
//                 console.error(`❌ [reactivate] DATABASE ERROR:`, error);
//                 throw error;
//             }
//         }

//         console.log(`⚠️ [reactivate] No existing row found for user_id=${userId}, hospital_id=${hospitalId} — falling through to normal insert.`);
//     }

//     // ── NORMAL UPSERT PATH (unchanged) ──
//     try {
//         console.log(`📝 Executing INSERT/UPDATE...`);
//         const result = await executeQuery(
//             `INSERT INTO subscriptions (
//                 booking_id,
//                 subscription_plans_id,
//                 stripe_customer_id,
//                 stripe_subscription_id,
//                 status,
//                 current_period_start,
//                 current_period_end,
//                 cancel_at_period_end,
//                 canceled_at,
//                 user_id,
//                 hospital_id,
//                 updated_at
//              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
//              ON CONFLICT (stripe_subscription_id) DO UPDATE SET
//                 booking_id             = COALESCE(subscriptions.booking_id, EXCLUDED.booking_id),
//                 subscription_plans_id  = COALESCE(subscriptions.subscription_plans_id, EXCLUDED.subscription_plans_id),
//                 stripe_customer_id     = EXCLUDED.stripe_customer_id,
//                 status                 = EXCLUDED.status,
//                 current_period_start   = EXCLUDED.current_period_start,
//                 current_period_end     = EXCLUDED.current_period_end,
//                 cancel_at_period_end   = EXCLUDED.cancel_at_period_end,
//                 canceled_at            = EXCLUDED.canceled_at,
//                 user_id                = COALESCE(subscriptions.user_id, EXCLUDED.user_id),
//                 hospital_id            = COALESCE(subscriptions.hospital_id, EXCLUDED.hospital_id),
//                 updated_at             = NOW()
//              RETURNING *`,
//             [
//                 bookingId,
//                 subscriptionPlanId,
//                 stripeCustomerId,
//                 stripeSubscription.id,
//                 stripeSubscription.status,
//                 periodStart ? new Date(periodStart * 1000) : null,
//                 periodEnd ? new Date(periodEnd * 1000) : null,
//                 !!stripeSubscription.cancel_at_period_end,
//                 stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
//                 userId || null,
//                 hospitalId || null
//             ]
//         );

//         console.log(`✅ [syncSubscriptionFromStripe] SUCCESS!`);
//         console.log(`✅ Row inserted/updated:`, JSON.stringify(result.rows[0], null, 2));

//         return result.rows[0];
//     } catch (error) {
//         console.error(`❌ [syncSubscriptionFromStripe] DATABASE ERROR:`, error);
//         throw error;
//     }
// }


// // ─── CHECKOUT.SESSION.COMPLETED (subscription mode) ──────────────────────
// async function markPaymentCompletedFromWebhook({ bookingId, subscriptionPlanId, stripeSubscriptionId, userId, hospitalId }) {
//     console.log(`📝 [markPaymentCompletedFromWebhook] Called with:`, {
//         bookingId,
//         subscriptionPlanId,
//         stripeSubscriptionId,
//         userId,
//         hospitalId
//     });

//     if (!stripeSubscriptionId) {
//         console.warn(`⚠️ No stripeSubscriptionId for booking ${bookingId}`);
//         return;
//     }

//     try {
//         console.log(`🔍 Retrieving subscription from Stripe: ${stripeSubscriptionId}`);
//         const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
//         console.log(`✅ Retrieved subscription: ${subscription.id}, Status: ${subscription.status}`);

//         // Force metadata from the session (including userId/hospitalId)
//         subscription.metadata = {
//             bookingId: subscription.metadata?.bookingId || (bookingId != null ? String(bookingId) : undefined),
//             subscriptionPlanId: subscription.metadata?.subscriptionPlanId || (subscriptionPlanId != null ? String(subscriptionPlanId) : undefined),
//             userId: subscription.metadata?.userId || (userId != null ? String(userId) : undefined),
//             hospitalId: subscription.metadata?.hospitalId || (hospitalId != null ? String(hospitalId) : undefined),
//               action: subscription.metadata?.action || action || undefined 
//         };

//         console.log(`📝 Merged Subscription Metadata for Sync:`, subscription.metadata);

//         // Update Stripe subscription metadata for consistency
//         try {
//             await stripe.subscriptions.update(stripeSubscriptionId, {
//                 metadata: subscription.metadata
//             });
//             console.log(`✅ Updated Stripe subscription metadata`);
//         } catch (metaErr) {
//             console.warn(`⚠️ Non-blocking error updating Stripe metadata: ${metaErr.message}`);
//         }

//         // Sync to database
//         return await syncSubscriptionFromStripe(subscription);

//     } catch (error) {
//         console.error(`❌ [markPaymentCompletedFromWebhook] FAILED: ${error.message}`);
//         throw error;
//     }
// }

// // ─── CHECKOUT.SESSION.EXPIRED / ASYNC_PAYMENT_FAILED ────────────────────
// async function markPaymentFailed(bookingId) {
//     const result = await executeQuery(
//         `UPDATE subscriptions
//          SET status = 'incomplete_expired', updated_at = now()
//          WHERE booking_id = $1 AND status = 'incomplete'
//          RETURNING id`,
//         [bookingId]
//     );
//     if (result.rows.length === 0) {
//         logger.info(`No incomplete subscription for booking ${bookingId} on checkout failure`);
//     }
// }

// // ─── INVOICE.PAYMENT_FAILED ───────────────────────────────────────────────
// async function markPaymentFailedBySubscriptionId(stripeSubscriptionId) {
//     const result = await executeQuery(
//         `UPDATE subscriptions
//          SET status = 'past_due', updated_at = now()
//          WHERE stripe_subscription_id = $1 AND status != 'canceled'
//          RETURNING id`,
//         [stripeSubscriptionId]
//     );
//     if (result.rows.length === 0) {
//         logger.warn(`invoice.payment_failed for unknown/canceled subscription ${stripeSubscriptionId}`);
//     }
// }

// // ─── INVOICE.PAID ─────────────────────────────────────────────────────────
// async function markSubscriptionRenewed(stripeSubscriptionId, periodStartUnix, periodEndUnix, invoiceUrl, amountPaid, statusOverride) {
//     console.log(`🔍 [markSubscriptionRenewed] ========== START ==========`);
//     console.log(`🔍 stripeSubscriptionId: ${stripeSubscriptionId}`);
//     console.log(`🔍 periodStartUnix: ${periodStartUnix}`);
//     console.log(`🔍 periodEndUnix: ${periodEndUnix}`);
//     console.log(`🔍 invoiceUrl: ${invoiceUrl}`);
//     console.log(`🔍 amountPaid: ${amountPaid} (${typeof amountPaid})`);
//     console.log(`🔍 statusOverride: ${statusOverride}`);

//     // If amountPaid is 0 or null, the invoice was not charged (e.g. free trial
//     // or payment failure) — skip the write entirely.
//     if (!amountPaid || amountPaid <= 0) {
//         console.warn(`⚠️ Invoice ${invoiceUrl} has amountPaid = ${amountPaid} – skipping DB update. No payment collected.`);
//         return;
//     }

//     const newPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;
//     if (!newPeriodEnd) {
//         console.warn(`⚠️ Missing periodEndUnix for subscription ${stripeSubscriptionId} – skipping DB update.`);
//         return;
//     }

//     // periodStartUnix is optional — if not supplied, leave current_period_start
//     // untouched (COALESCE keeps the existing value) rather than nulling it out.
//     const newPeriodStart = periodStartUnix ? new Date(periodStartUnix * 1000) : null;

//     // Trust the caller's status if given; otherwise default to 'active'.
//     const status = statusOverride || 'active';

//     console.log(`📝 Updating subscription: status -> '${status}', current_period_start -> ${newPeriodStart?.toISOString() || '(unchanged)'}, current_period_end -> ${newPeriodEnd.toISOString()}`);

//     const result = await executeQuery(
//         `UPDATE subscriptions
//          SET status = $2,
//              current_period_start = COALESCE($3, current_period_start),
//              current_period_end = $4,
//              invoice = COALESCE($5, invoice),
//              updated_at = NOW()
//          WHERE stripe_subscription_id = $1
//          RETURNING id, user_id, hospital_id, subscription_plans_id, status, current_period_start, current_period_end`,
//         [stripeSubscriptionId, status, newPeriodStart, newPeriodEnd, invoiceUrl || null]
//     );

//     console.log(`📊 Rows updated: ${result.rows.length}`);
//     if (result.rows.length === 0) {
//         console.warn(`⚠️ No subscription found with stripe_subscription_id = ${stripeSubscriptionId}`);
//         return;
//     }

//     const sub = result.rows[0];
//     console.log(`✅ Subscription ${sub.id} updated.`);

//     return sub;
// }

// async function recordInvoicePayment(stripeSubscriptionId, invoiceUrl, amountPaid) {
//     if (!amountPaid || amountPaid <= 0) {
//         logger.warn(`Invoice for ${stripeSubscriptionId} has amountPaid=${amountPaid} — skipping.`);
//         return;
//     }

//     const result = await executeQuery(
//         `UPDATE subscriptions
//          SET invoice = COALESCE($2, invoice),
//              updated_at = NOW()
//          WHERE stripe_subscription_id = $1
//          RETURNING id, user_id, hospital_id, subscription_plans_id`,
//         [stripeSubscriptionId, invoiceUrl || null]
//     );

//     if (result.rows.length === 0) {
//         logger.warn(`invoice.paid for unknown subscription ${stripeSubscriptionId}`);
//         return;
//     }

//     return result.rows[0];
// }

// // ─── PAYMENT STATUS API ─────────────────────────────────────────────────────
// async function getPaymentStatus(bookingId) {
//     const result = await executeQuery(
//         `SELECT
//             s.id AS subscription_id,
//             s.booking_id,
//             s.subscription_plans_id,
//             s.stripe_subscription_id,
//             s.status AS subscription_status,
//             s.current_period_start,
//             s.current_period_end,
//             s.cancel_at_period_end,
//             s.canceled_at,
//             s.invoice,
//             sp.subscription_details,
//             sp.price,
//             sp.interval
//          FROM subscriptions s
//          LEFT JOIN subscription_plans sp ON sp.subscription_plan_id = s.subscription_plans_id
//          WHERE s.booking_id = $1
//          ORDER BY s.created_at DESC
//          LIMIT 1`,
//         [bookingId]
//     );

//     if (result.rows.length === 0) return null;

//     const row = result.rows[0];
//     return {
//         bookingId: row.booking_id,
//         subscriptionId: row.subscription_id,
//         subscriptionPlanId: row.subscription_plans_id,
//         planDetails: row.subscription_details,
//         price: row.price !== null ? Number(row.price) : null,
//         interval: row.interval,
//         stripeSubscriptionId: row.stripe_subscription_id,
//         subscriptionStatus: row.subscription_status,
//         currentPeriodStart: row.current_period_start,
//         currentPeriodEnd: row.current_period_end,
//         cancelAtPeriodEnd: row.cancel_at_period_end,
//         canceledAt: row.canceled_at,
//         invoice: row.invoice
//     };
// }

// // ============================================================================
// // SYNC PAUSED SUBSCRIPTION
// //
// // current_period_start is intentionally NOT included in the UPDATE — the
// // existing DB value remains unchanged. current_period_end becomes Stripe's
// // pause timestamp.
// // ============================================================================
// async function syncPausedSubscriptionFromStripe(subscription) {

//     const stripeItem = subscription?.items?.data?.[0] || null;

//     const pausedAt =
//         subscription?.status_details?.paused?.transitioned_at
//         ?? stripeItem?.current_period_end
//         ?? subscription?.current_period_end
//         ?? null;

//     if (!pausedAt) {
//         throw new Error(
//             `Unable to determine pause timestamp for Stripe subscription ${subscription.id}`
//         );
//     }

//     const pausedDate = new Date(pausedAt * 1000);

//     const result = await executeQuery(
//         `
//         UPDATE subscriptions
//         SET
//             status = 'paused',
//             current_period_end = $1,
//             cancel_at_period_end = FALSE,
//             canceled_at = NULL,
//             updated_at = NOW()
//         WHERE
//             stripe_subscription_id = $2
//         RETURNING *
//         `,
//         [pausedDate, subscription.id]
//     );

//     if (result.rows.length === 0) {
//         logger.warn(`No DB subscription found for paused Stripe subscription ${subscription.id}`);
//         return null;
//     }

//     logger.info(`Paused subscription synchronized: ${subscription.id}`);

//     return result.rows[0];
// }

// // ============================================================================
// // CHARGE + STACK RENEWAL
// //
// // Shared by two callers:
// //   1. renewSubscription (Case 3) when a default payment method already exists
// //   2. The webhook's checkout.session.completed (mode: 'setup') handler, once
// //      a customer adds a card through the fallback setup-session flow
// //
// // Charges the plan price immediately via a manually created invoice, then
// // uses pause_collection (not trial_end — trial_end caused a fake "Free trial"
// // label, auto-cancellation risk, and stray proration credits in production)
// // to stack a full new interval on top of the subscription's existing
// // current_period_end, so no already-paid-for days are lost.
// // ============================================================================
// async function chargeAndStackRenewal({ stripeSubscriptionId, subscriptionPlanId, defaultPaymentMethod, customerId }) {

//     const plan = await SubscriptionPlanService.getPlanById(subscriptionPlanId);
//     if (!plan) {
//         const err = new Error(`Plan ${subscriptionPlanId} not found`);
//         err.code = 'PLAN_NOT_FOUND';
//         throw err;
//     }

//     const stripePrice = await stripe.prices.retrieve(plan.stripePriceId);
//     const idempotencyKey = `renew-${stripeSubscriptionId}-${crypto.randomUUID()}`;

//     await stripe.invoiceItems.create(
//         {
//             customer: customerId,
//             subscription: stripeSubscriptionId,
//             amount: stripePrice.unit_amount,
//             currency: stripePrice.currency,
//             description: `Early renewal – ${plan.subscriptionDetails || plan.interval}`
//         },
//         { idempotencyKey: `${idempotencyKey}-item` }
//     );

//     const invoice = await stripe.invoices.create(
//         {
//             customer: customerId,
//             subscription: stripeSubscriptionId,
//             auto_advance: true,
//             default_payment_method: defaultPaymentMethod
//         },
//         { idempotencyKey: `${idempotencyKey}-invoice` }
//     );

//     const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
//     const paid = await stripe.invoices.pay(finalized.id, { payment_method: defaultPaymentMethod });

//     if (paid.status !== 'paid') {
//         const err = new Error(`Renewal invoice ${paid.id} not paid, status=${paid.status}`);
//         err.code = 'PAYMENT_FAILED';
//         throw err;
//     }

//     // Read the current period end from our own DB to stack the new period
//     // on top of it (not from Stripe — Stripe's live value may already have
//     // advanced or been altered by other flows).
//     const currentSubResult = await executeQuery(
//         `SELECT current_period_end FROM subscriptions WHERE stripe_subscription_id = $1`,
//         [stripeSubscriptionId]
//     );

//     if (currentSubResult.rows.length === 0) {
//         const err = new Error(`Subscription ${stripeSubscriptionId} not found in DB`);
//         err.code = 'SUBSCRIPTION_NOT_FOUND';
//         throw err;
//     }

//     const currentPeriodEndDate = new Date(currentSubResult.rows[0].current_period_end);

//     function getIntervalMs(interval) {
//         const days = parseInt(interval, 10) || 30;
//         return days * 24 * 60 * 60 * 1000;
//     }

//     const newPeriodEndDate = new Date(currentPeriodEndDate.getTime() + getIntervalMs(plan.interval));
//     const newPeriodEndUnix = Math.floor(newPeriodEndDate.getTime() / 1000);
//     const newPeriodStartUnix = Math.floor(currentPeriodEndDate.getTime() / 1000);

//     await stripe.subscriptions.update(
//         stripeSubscriptionId,
//         {
//             pause_collection: {
//                 behavior: 'void',
//                 resumes_at: newPeriodEndUnix
//             },
//             proration_behavior: 'none'
//         },
//         { idempotencyKey: `${idempotencyKey}-extend` }
//     );

//     return await markSubscriptionRenewed(
//         stripeSubscriptionId,
//         newPeriodStartUnix,
//         newPeriodEndUnix,
//         paid.hosted_invoice_url,
//         paid.amount_paid,
//         'active'
//     );
// }

// // ─── EXPORTS ────────────────────────────────────────────────────────────────
// module.exports = {
//     createCheckoutSession,
//     syncSubscriptionFromStripe,
//     markPaymentCompletedFromWebhook,
//     markPaymentFailed,
//     markPaymentFailedBySubscriptionId,
//     markSubscriptionRenewed,
//     recordInvoicePayment,
//     getPaymentStatus,
//     syncPausedSubscriptionFromStripe,
//     chargeAndStackRenewal
// };







// services/paymentService.js
const crypto = require('crypto');
const stripe = require('./stripeService');
const { executeQuery } = require('../config/database');
const BookDemoService = require('./bookDemoService');
const SubscriptionPlanService = require('./subscriptionPlanService');
const logger = require('../utils/logger');

// NEW: required for post-sync Vapi assistant<->phone relink
const credentialService = require('./credentialService');
const vapiService = require('./vapiService');

const FRONTEND_URL = process.env.FEEDBACK_URL || 'http://localhost:3000';

// ─── CHECKOUT ────────────────────────────────────────────────────────────
async function createCheckoutSession(bookingId, subscriptionPlanId) {
    if (!subscriptionPlanId) {
        throw new Error('Invalid plan: subscriptionPlanId is required');
    }

    const plan = await SubscriptionPlanService.getActivePlanById(subscriptionPlanId);
    if (!plan) {
        throw new Error('Invalid plan: not found or not active');
    }

    const booking = await BookDemoService.getBookingById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }

    const metadata = {
        bookingId: String(bookingId),
        subscriptionPlanId: String(plan.subscriptionPlanId)
    };

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: booking.email || undefined,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        metadata,
        subscription_data: { metadata },
        success_url: `${FRONTEND_URL}/feedbackform/${booking.feedback_token || ''}?payment=success`,
        cancel_url: `${FRONTEND_URL}/feedbackform/${booking.feedback_token || ''}?payment=cancelled`
    });

    return { checkoutUrl: session.url };
}

// ============================================================================
// NEW: RELINK HOSPITAL'S VAPI ASSISTANT TO ITS PHONE NUMBER
//
// VAPI-ONLY OPERATION. Does NOT write anything to the database.
//
// Called immediately after the `subscriptions` table is successfully
// updated inside syncSubscriptionFromStripe. Uses hospital_id from the
// ACTUAL DB ROW that was just written (not from Stripe metadata, which can
// be null on older/stale subscriptions).
//
// Steps:
//   1. Fetch vet_desk_ai_crendatials by hospital_id
//   2. Decrypt -> get vapi_assistant_id AND vapi_phone_number_id
//   3. Call vapiService.linkPhoneNumberToAssistant(phoneNumberId, assistantId)
//
// Any failure here is caught internally and logged — it must NEVER throw
// upward and break the subscription sync that already succeeded.
// ============================================================================
async function relinkHospitalAssistantToPhone(hospitalId) {

    if (!hospitalId) {
        logger.warn(
            `[relinkHospitalAssistantToPhone] No hospitalId provided; skipped Vapi relink.`
        );
        return false;
    }

    try {

        const credentials =
            await credentialService.getCredentials(hospitalId);

        const phoneNumberId =
            credentials.VAPI_PHONE_NUMBER_ID;

        const assistantId =
            credentials.VAPI_ASSISTANT_ID;

        if (!phoneNumberId || !assistantId) {

            logger.warn(
                `[relinkHospitalAssistantToPhone] Missing vapi_phone_number_id or ` +
                `vapi_assistant_id for hospital ${hospitalId}; skipped Vapi relink.`
            );

            return false;
        }

        await vapiService.linkPhoneNumberToAssistant(
            phoneNumberId,
            assistantId
        );

        logger.info(
            `[relinkHospitalAssistantToPhone] Relinked hospital ${hospitalId} ` +
            `phone number ${phoneNumberId} to assistant ${assistantId}.`
        );

        return true;

    } catch (error) {

        logger.error(
            `[relinkHospitalAssistantToPhone] Failed for hospital ${hospitalId}: ${error.message}`
        );

        return false;
    }
}

// ─── SUBSCRIPTION SYNC ────────────────────────────────────────────────────

async function syncSubscriptionFromStripe(stripeSubscription) {
    console.log(`📝 [syncSubscriptionFromStripe] ========== START ==========`);
    console.log(`📝 Subscription ID: ${stripeSubscription.id}`);
    console.log(`📝 Status: ${stripeSubscription.status}`);
    console.log(`📝 Metadata:`, JSON.stringify(stripeSubscription.metadata, null, 2));

    const metadata = stripeSubscription.metadata || {};
    const bookingId = metadata.bookingId ? parseInt(metadata.bookingId, 10) : null;
    const subscriptionPlanId = metadata.subscriptionPlanId ? parseInt(metadata.subscriptionPlanId, 10) : null;
    const userId = metadata.userId ? metadata.userId : null;
    const hospitalId = metadata.hospitalId ? parseInt(metadata.hospitalId, 10) : null;
    const action = metadata.action || null;   // ← NEW: 'reactivate' set by Case 2 checkout metadata

    console.log(`📝 bookingId: ${bookingId}, subscriptionPlanId: ${subscriptionPlanId}, userId: ${userId}, hospitalId: ${hospitalId}, action: ${action}`);

    // Validate booking exists (if bookingId provided)
    if (bookingId) {
        const bookingCheck = await executeQuery(
            `SELECT id FROM book_demo WHERE id = $1`,
            [bookingId]
        );
        if (bookingCheck.rows.length === 0) {
            throw new Error(`Booking ${bookingId} not found`);
        }
        console.log(`✅ Booking ${bookingId} exists`);
    }

    // Validate plan exists (required)
    if (!subscriptionPlanId) {
        throw new Error('No subscriptionPlanId in metadata');
    }
    const planCheck = await executeQuery(
        `SELECT subscription_plan_id FROM subscription_plans WHERE subscription_plan_id = $1`,
        [subscriptionPlanId]
    );
    if (planCheck.rows.length === 0) {
        throw new Error(`Plan ${subscriptionPlanId} not found`);
    }

    // FIXED: was `subscription.status` (undefined variable) — now uses the
    // actual function parameter, stripeSubscription.
    if (stripeSubscription.status === 'paused') {
        return syncPausedSubscriptionFromStripe(stripeSubscription);
    }

    console.log(`✅ Plan ${subscriptionPlanId} exists`);

    const item = stripeSubscription.items?.data?.[0];
    const periodStart = stripeSubscription.current_period_start ?? item?.current_period_start;
    const periodEnd = stripeSubscription.current_period_end ?? item?.current_period_end;

    const stripeCustomerId = typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id;

    console.log(`📝 periodStart: ${periodStart}, periodEnd: ${periodEnd}`);
    console.log(`📝 stripeCustomerId: ${stripeCustomerId}`);

    // ========================================================================
    // REACTIVATE (Case 2 restart of a canceled/past_due/unpaid/incomplete sub):
    //
    // The old subscription was already stripe.subscriptions.cancel()'d in
    // renewSubscription (Case 2), and a NEW Checkout Session was created,
    // which produces a NEW stripe_subscription_id once paid.
    //
    // Without this branch, the INSERT ... ON CONFLICT (stripe_subscription_id)
    // below would never conflict (new ID = new row), leaving the old canceled
    // row orphaned and creating a duplicate row per reactivation instead of
    // updating the same user/hospital's subscription record in place.
    //
    // Only runs when action === 'reactivate' AND we have both userId and
    // hospitalId to find the existing row by. Falls through to the normal
    // insert/upsert path below if no matching row is found, so this is safe
    // even on first-ever signup metadata accidentally carrying 'reactivate'.
    // ========================================================================
    if (action === 'reactivate' && userId && hospitalId) {

        const existing = await executeQuery(
            `SELECT id FROM subscriptions
             WHERE user_id = $1 AND hospital_id = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, hospitalId]
        );

        if (existing.rows.length > 0) {

            console.log(`📝 [reactivate] Updating existing subscription row ${existing.rows[0].id} in place with new Stripe subscription ${stripeSubscription.id}`);

            try {
                const result = await executeQuery(
                    `UPDATE subscriptions SET
                        booking_id              = COALESCE($2, booking_id),
                        subscription_plans_id   = $3,
                        stripe_customer_id      = $4,
                        stripe_subscription_id  = $5,
                        status                  = $6,
                        current_period_start    = $7,
                        current_period_end      = $8,
                        cancel_at_period_end    = $9,
                        canceled_at             = $10,
                        updated_at              = NOW()
                     WHERE id = $1
                     RETURNING *`,
                    [
                        existing.rows[0].id,
                        bookingId,
                        subscriptionPlanId,
                        stripeCustomerId,
                        stripeSubscription.id,
                        stripeSubscription.status,
                        periodStart ? new Date(periodStart * 1000) : null,
                        periodEnd ? new Date(periodEnd * 1000) : null,
                        !!stripeSubscription.cancel_at_period_end,
                        stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
                    ]
                );

                console.log(`✅ [reactivate] Row ${existing.rows[0].id} updated in place.`);
                console.log(`✅ Row after update:`, JSON.stringify(result.rows[0], null, 2));

                // ------------------------------------------------------------
                // NEW: RELINK HOSPITAL'S VAPI ASSISTANT TO ITS PHONE NUMBER
                //
                // Runs immediately after the subscriptions table update,
                // using hospital_id from the row that was just written.
                // Wrapped so a Vapi failure never breaks this sync.
                // ------------------------------------------------------------
                try {
                    await relinkHospitalAssistantToPhone(result.rows[0].hospital_id);
                } catch (relinkErr) {
                    logger.error(`[reactivate] Vapi relink failed: ${relinkErr.message}`);
                }

                return result.rows[0];
            } catch (error) {
                console.error(`❌ [reactivate] DATABASE ERROR:`, error);
                throw error;
            }
        }

        console.log(`⚠️ [reactivate] No existing row found for user_id=${userId}, hospital_id=${hospitalId} — falling through to normal insert.`);
    }

    // ── NORMAL UPSERT PATH (unchanged) ──
    try {
        console.log(`📝 Executing INSERT/UPDATE...`);
        const result = await executeQuery(
            `INSERT INTO subscriptions (
                booking_id,
                subscription_plans_id,
                stripe_customer_id,
                stripe_subscription_id,
                status,
                current_period_start,
                current_period_end,
                cancel_at_period_end,
                canceled_at,
                user_id,
                hospital_id,
                updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             ON CONFLICT (stripe_subscription_id) DO UPDATE SET
                booking_id             = COALESCE(subscriptions.booking_id, EXCLUDED.booking_id),
                subscription_plans_id  = COALESCE(subscriptions.subscription_plans_id, EXCLUDED.subscription_plans_id),
                stripe_customer_id     = EXCLUDED.stripe_customer_id,
                status                 = EXCLUDED.status,
                current_period_start   = EXCLUDED.current_period_start,
                current_period_end     = EXCLUDED.current_period_end,
                cancel_at_period_end   = EXCLUDED.cancel_at_period_end,
                canceled_at            = EXCLUDED.canceled_at,
                user_id                = COALESCE(subscriptions.user_id, EXCLUDED.user_id),
                hospital_id            = COALESCE(subscriptions.hospital_id, EXCLUDED.hospital_id),
                updated_at             = NOW()
             RETURNING *`,
            [
                bookingId,
                subscriptionPlanId,
                stripeCustomerId,
                stripeSubscription.id,
                stripeSubscription.status,
                periodStart ? new Date(periodStart * 1000) : null,
                periodEnd ? new Date(periodEnd * 1000) : null,
                !!stripeSubscription.cancel_at_period_end,
                stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
                userId || null,
                hospitalId || null
            ]
        );

        console.log(`✅ [syncSubscriptionFromStripe] SUCCESS!`);
        console.log(`✅ Row inserted/updated:`, JSON.stringify(result.rows[0], null, 2));

        // ----------------------------------------------------------------
        // NEW: RELINK HOSPITAL'S VAPI ASSISTANT TO ITS PHONE NUMBER
        //
        // Runs immediately after the subscriptions table update, using
        // hospital_id from the row that was just written/updated (COALESCE
        // in the query above means this stays correct even if the current
        // webhook's metadata lacked hospitalId, as long as it was set on
        // a previous sync). Wrapped so a Vapi failure never breaks this sync.
        // ----------------------------------------------------------------
        try {
            await relinkHospitalAssistantToPhone(result.rows[0].hospital_id);
        } catch (relinkErr) {
            logger.error(`Vapi relink failed: ${relinkErr.message}`);
        }

        return result.rows[0];
    } catch (error) {
        console.error(`❌ [syncSubscriptionFromStripe] DATABASE ERROR:`, error);
        throw error;
    }
}


// ─── CHECKOUT.SESSION.COMPLETED (subscription mode) ──────────────────────
async function markPaymentCompletedFromWebhook({ bookingId, subscriptionPlanId, stripeSubscriptionId, userId, hospitalId }) {
    console.log(`📝 [markPaymentCompletedFromWebhook] Called with:`, {
        bookingId,
        subscriptionPlanId,
        stripeSubscriptionId,
        userId,
        hospitalId
    });

    if (!stripeSubscriptionId) {
        console.warn(`⚠️ No stripeSubscriptionId for booking ${bookingId}`);
        return;
    }

    try {
        console.log(`🔍 Retrieving subscription from Stripe: ${stripeSubscriptionId}`);
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        console.log(`✅ Retrieved subscription: ${subscription.id}, Status: ${subscription.status}`);

        // Force metadata from the session (including userId/hospitalId)
        subscription.metadata = {
            bookingId: subscription.metadata?.bookingId || (bookingId != null ? String(bookingId) : undefined),
            subscriptionPlanId: subscription.metadata?.subscriptionPlanId || (subscriptionPlanId != null ? String(subscriptionPlanId) : undefined),
            userId: subscription.metadata?.userId || (userId != null ? String(userId) : undefined),
            hospitalId: subscription.metadata?.hospitalId || (hospitalId != null ? String(hospitalId) : undefined),
              action: subscription.metadata?.action || action || undefined 
        };

        console.log(`📝 Merged Subscription Metadata for Sync:`, subscription.metadata);

        // Update Stripe subscription metadata for consistency
        try {
            await stripe.subscriptions.update(stripeSubscriptionId, {
                metadata: subscription.metadata
            });
            console.log(`✅ Updated Stripe subscription metadata`);
        } catch (metaErr) {
            console.warn(`⚠️ Non-blocking error updating Stripe metadata: ${metaErr.message}`);
        }

        // Sync to database
        return await syncSubscriptionFromStripe(subscription);

    } catch (error) {
        console.error(`❌ [markPaymentCompletedFromWebhook] FAILED: ${error.message}`);
        throw error;
    }
}

// ─── CHECKOUT.SESSION.EXPIRED / ASYNC_PAYMENT_FAILED ────────────────────
async function markPaymentFailed(bookingId) {
    const result = await executeQuery(
        `UPDATE subscriptions
         SET status = 'incomplete_expired', updated_at = now()
         WHERE booking_id = $1 AND status = 'incomplete'
         RETURNING id`,
        [bookingId]
    );
    if (result.rows.length === 0) {
        logger.info(`No incomplete subscription for booking ${bookingId} on checkout failure`);
    }
}

// ─── INVOICE.PAYMENT_FAILED ───────────────────────────────────────────────
async function markPaymentFailedBySubscriptionId(stripeSubscriptionId) {
    const result = await executeQuery(
        `UPDATE subscriptions
         SET status = 'past_due', updated_at = now()
         WHERE stripe_subscription_id = $1 AND status != 'canceled'
         RETURNING id`,
        [stripeSubscriptionId]
    );
    if (result.rows.length === 0) {
        logger.warn(`invoice.payment_failed for unknown/canceled subscription ${stripeSubscriptionId}`);
    }
}

// ─── INVOICE.PAID ─────────────────────────────────────────────────────────
async function markSubscriptionRenewed(stripeSubscriptionId, periodStartUnix, periodEndUnix, invoiceUrl, amountPaid, statusOverride) {
    console.log(`🔍 [markSubscriptionRenewed] ========== START ==========`);
    console.log(`🔍 stripeSubscriptionId: ${stripeSubscriptionId}`);
    console.log(`🔍 periodStartUnix: ${periodStartUnix}`);
    console.log(`🔍 periodEndUnix: ${periodEndUnix}`);
    console.log(`🔍 invoiceUrl: ${invoiceUrl}`);
    console.log(`🔍 amountPaid: ${amountPaid} (${typeof amountPaid})`);
    console.log(`🔍 statusOverride: ${statusOverride}`);

    // If amountPaid is 0 or null, the invoice was not charged (e.g. free trial
    // or payment failure) — skip the write entirely.
    if (!amountPaid || amountPaid <= 0) {
        console.warn(`⚠️ Invoice ${invoiceUrl} has amountPaid = ${amountPaid} – skipping DB update. No payment collected.`);
        return;
    }

    const newPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;
    if (!newPeriodEnd) {
        console.warn(`⚠️ Missing periodEndUnix for subscription ${stripeSubscriptionId} – skipping DB update.`);
        return;
    }

    // periodStartUnix is optional — if not supplied, leave current_period_start
    // untouched (COALESCE keeps the existing value) rather than nulling it out.
    const newPeriodStart = periodStartUnix ? new Date(periodStartUnix * 1000) : null;

    // Trust the caller's status if given; otherwise default to 'active'.
    const status = statusOverride || 'active';

    console.log(`📝 Updating subscription: status -> '${status}', current_period_start -> ${newPeriodStart?.toISOString() || '(unchanged)'}, current_period_end -> ${newPeriodEnd.toISOString()}`);

    const result = await executeQuery(
        `UPDATE subscriptions
         SET status = $2,
             current_period_start = COALESCE($3, current_period_start),
             current_period_end = $4,
             invoice = COALESCE($5, invoice),
             updated_at = NOW()
         WHERE stripe_subscription_id = $1
         RETURNING id, user_id, hospital_id, subscription_plans_id, status, current_period_start, current_period_end`,
        [stripeSubscriptionId, status, newPeriodStart, newPeriodEnd, invoiceUrl || null]
    );

    console.log(`📊 Rows updated: ${result.rows.length}`);
    if (result.rows.length === 0) {
        console.warn(`⚠️ No subscription found with stripe_subscription_id = ${stripeSubscriptionId}`);
        return;
    }

    const sub = result.rows[0];
    console.log(`✅ Subscription ${sub.id} updated.`);

    // ------------------------------------------------------------------
    // NEW: RELINK HOSPITAL'S VAPI ASSISTANT TO ITS PHONE NUMBER
    //
    // markSubscriptionRenewed also writes to the subscriptions table
    // (early renewal / charge-and-stack flows), so the relink runs here
    // too, using hospital_id from the row just updated.
    // ------------------------------------------------------------------
    try {
        await relinkHospitalAssistantToPhone(sub.hospital_id);
    } catch (relinkErr) {
        logger.error(`Vapi relink failed after markSubscriptionRenewed: ${relinkErr.message}`);
    }

    return sub;
}

async function recordInvoicePayment(stripeSubscriptionId, invoiceUrl, amountPaid) {
    if (!amountPaid || amountPaid <= 0) {
        logger.warn(`Invoice for ${stripeSubscriptionId} has amountPaid=${amountPaid} — skipping.`);
        return;
    }

    const result = await executeQuery(
        `UPDATE subscriptions
         SET invoice = COALESCE($2, invoice),
             updated_at = NOW()
         WHERE stripe_subscription_id = $1
         RETURNING id, user_id, hospital_id, subscription_plans_id`,
        [stripeSubscriptionId, invoiceUrl || null]
    );

    if (result.rows.length === 0) {
        logger.warn(`invoice.paid for unknown subscription ${stripeSubscriptionId}`);
        return;
    }

    return result.rows[0];
}

// ─── PAYMENT STATUS API ─────────────────────────────────────────────────────
async function getPaymentStatus(bookingId) {
    const result = await executeQuery(
        `SELECT
            s.id AS subscription_id,
            s.booking_id,
            s.subscription_plans_id,
            s.stripe_subscription_id,
            s.status AS subscription_status,
            s.current_period_start,
            s.current_period_end,
            s.cancel_at_period_end,
            s.canceled_at,
            s.invoice,
            sp.subscription_details,
            sp.price,
            sp.interval
         FROM subscriptions s
         LEFT JOIN subscription_plans sp ON sp.subscription_plan_id = s.subscription_plans_id
         WHERE s.booking_id = $1
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [bookingId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        bookingId: row.booking_id,
        subscriptionId: row.subscription_id,
        subscriptionPlanId: row.subscription_plans_id,
        planDetails: row.subscription_details,
        price: row.price !== null ? Number(row.price) : null,
        interval: row.interval,
        stripeSubscriptionId: row.stripe_subscription_id,
        subscriptionStatus: row.subscription_status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        canceledAt: row.canceled_at,
        invoice: row.invoice
    };
}

// ============================================================================
// SYNC PAUSED SUBSCRIPTION
//
// current_period_start is intentionally NOT included in the UPDATE — the
// existing DB value remains unchanged. current_period_end becomes Stripe's
// pause timestamp.
// ============================================================================
async function syncPausedSubscriptionFromStripe(subscription) {

    const stripeItem = subscription?.items?.data?.[0] || null;

    const pausedAt =
        subscription?.status_details?.paused?.transitioned_at
        ?? stripeItem?.current_period_end
        ?? subscription?.current_period_end
        ?? null;

    if (!pausedAt) {
        throw new Error(
            `Unable to determine pause timestamp for Stripe subscription ${subscription.id}`
        );
    }

    const pausedDate = new Date(pausedAt * 1000);

    const result = await executeQuery(
        `
        UPDATE subscriptions
        SET
            status = 'paused',
            current_period_end = $1,
            cancel_at_period_end = FALSE,
            canceled_at = NULL,
            updated_at = NOW()
        WHERE
            stripe_subscription_id = $2
        RETURNING *
        `,
        [pausedDate, subscription.id]
    );

    if (result.rows.length === 0) {
        logger.warn(`No DB subscription found for paused Stripe subscription ${subscription.id}`);
        return null;
    }

    logger.info(`Paused subscription synchronized: ${subscription.id}`);

    return result.rows[0];
}

// ============================================================================
// CHARGE + STACK RENEWAL
//
// Shared by two callers:
//   1. renewSubscription (Case 3) when a default payment method already exists
//   2. The webhook's checkout.session.completed (mode: 'setup') handler, once
//      a customer adds a card through the fallback setup-session flow
//
// Charges the plan price immediately via a manually created invoice, then
// uses pause_collection (not trial_end — trial_end caused a fake "Free trial"
// label, auto-cancellation risk, and stray proration credits in production)
// to stack a full new interval on top of the subscription's existing
// current_period_end, so no already-paid-for days are lost.
// ============================================================================
async function chargeAndStackRenewal({ stripeSubscriptionId, subscriptionPlanId, defaultPaymentMethod, customerId }) {

    const plan = await SubscriptionPlanService.getPlanById(subscriptionPlanId);
    if (!plan) {
        const err = new Error(`Plan ${subscriptionPlanId} not found`);
        err.code = 'PLAN_NOT_FOUND';
        throw err;
    }

    const stripePrice = await stripe.prices.retrieve(plan.stripePriceId);
    const idempotencyKey = `renew-${stripeSubscriptionId}-${crypto.randomUUID()}`;

    await stripe.invoiceItems.create(
        {
            customer: customerId,
            subscription: stripeSubscriptionId,
            amount: stripePrice.unit_amount,
            currency: stripePrice.currency,
            description: `Early renewal – ${plan.subscriptionDetails || plan.interval}`
        },
        { idempotencyKey: `${idempotencyKey}-item` }
    );

    const invoice = await stripe.invoices.create(
        {
            customer: customerId,
            subscription: stripeSubscriptionId,
            auto_advance: true,
            default_payment_method: defaultPaymentMethod
        },
        { idempotencyKey: `${idempotencyKey}-invoice` }
    );

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    const paid = await stripe.invoices.pay(finalized.id, { payment_method: defaultPaymentMethod });

    if (paid.status !== 'paid') {
        const err = new Error(`Renewal invoice ${paid.id} not paid, status=${paid.status}`);
        err.code = 'PAYMENT_FAILED';
        throw err;
    }

    // Read the current period end from our own DB to stack the new period
    // on top of it (not from Stripe — Stripe's live value may already have
    // advanced or been altered by other flows).
    const currentSubResult = await executeQuery(
        `SELECT current_period_end FROM subscriptions WHERE stripe_subscription_id = $1`,
        [stripeSubscriptionId]
    );

    if (currentSubResult.rows.length === 0) {
        const err = new Error(`Subscription ${stripeSubscriptionId} not found in DB`);
        err.code = 'SUBSCRIPTION_NOT_FOUND';
        throw err;
    }

    const currentPeriodEndDate = new Date(currentSubResult.rows[0].current_period_end);

    function getIntervalMs(interval) {
        const days = parseInt(interval, 10) || 30;
        return days * 24 * 60 * 60 * 1000;
    }

    const newPeriodEndDate = new Date(currentPeriodEndDate.getTime() + getIntervalMs(plan.interval));
    const newPeriodEndUnix = Math.floor(newPeriodEndDate.getTime() / 1000);
    const newPeriodStartUnix = Math.floor(currentPeriodEndDate.getTime() / 1000);

    await stripe.subscriptions.update(
        stripeSubscriptionId,
        {
            pause_collection: {
                behavior: 'void',
                resumes_at: newPeriodEndUnix
            },
            proration_behavior: 'none'
        },
        { idempotencyKey: `${idempotencyKey}-extend` }
    );

    return await markSubscriptionRenewed(
        stripeSubscriptionId,
        newPeriodStartUnix,
        newPeriodEndUnix,
        paid.hosted_invoice_url,
        paid.amount_paid,
        'active'
    );
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────
module.exports = {
    createCheckoutSession,
    syncSubscriptionFromStripe,
    markPaymentCompletedFromWebhook,
    markPaymentFailed,
    markPaymentFailedBySubscriptionId,
    markSubscriptionRenewed,
    recordInvoicePayment,
    getPaymentStatus,
    syncPausedSubscriptionFromStripe,
    chargeAndStackRenewal,
    relinkHospitalAssistantToPhone
};