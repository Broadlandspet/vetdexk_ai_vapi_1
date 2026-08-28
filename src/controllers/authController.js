const UserService = require('../services/userService');
const logger = require('../utils/logger');
const stripe = require('../services/stripeService');  
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const EmailService = require('../services/emailService'); 
const BookDemoService = require('../services/bookDemoService');
const subscriptionPlanService = require ('../services/subscriptionPlanService')

const PaymentService = require('../services/paymentService');

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────



/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email/Username and password are required'
            });
        }

        const user = await UserService.verifyLogin(emailOrUsername, password);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated'
            });
        }

        // ---------- FETCH HOSPITAL DETAILS ----------
        let hospital = null;
        if (user.hospital_id) {
            const hospitalResult = await executeQuery(
                `SELECT id, 
                        hospital_name, 
                        hospital_number, 
                        hospital_address, 
                        hospital_email
                 FROM hospitals 
                 WHERE id = $1`,
                [user.hospital_id]
            );
            if (hospitalResult.rows.length > 0) {
                hospital = hospitalResult.rows[0];
            }
        }

        // Generate JWT token - NOW INCLUDING hospital_id
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role,
                hospital_id: user.hospital_id || null
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Build response user object with hospital fields
        const userResponse = {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            hospital_id: user.hospital_id || null,
            hospital_name: hospital?.hospital_name || null,
            hospital_number: hospital?.hospital_number || null,
            hospital_address: hospital?.hospital_address || null,
            hospital_email: hospital?.hospital_email || null
        };

        res.json({
            success: true,
            data: {
                user: userResponse,
                token
            },
            message: 'Login successful'
        });

    } catch (error) {
        logger.error('Error in login:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to login'
        });
    }
};

// // // /**
// // //  * Register a new user (pending approval)
// // //  * POST /api/auth/register
// // //  */



// exports.renewSubscription = async (req, res) => {
//     try {
//         const userId = req.userId || req.user.id;

//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Unauthorized'
//             });
//         }

//         const sub = await UserService.getSubscriptionByUserId(userId);

//         if (!sub) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'No subscription found'
//             });
//         }

//         const {
//             stripe_subscription_id,
//             status,
//             subscription_plans_id,
//             hospital_id,
//             current_period_end
//         } = sub;


//         // ================================================================
//         // NEW:
//         // ALWAYS CHECK THE REAL STRIPE SUBSCRIPTION STATUS FIRST
//         //
//         // Do not depend only on our DB status because webhook updates
//         // may arrive slightly later.
//         // ================================================================

//         let liveStripeSub = null;

//         if (stripe_subscription_id) {
//             try {
//                 liveStripeSub = await stripe.subscriptions.retrieve(
//                     stripe_subscription_id,
//                     {
//                         expand: ['latest_invoice']
//                     }
//                 );

//                 logger.info(
//                     `Live Stripe subscription ${stripe_subscription_id} status: ${liveStripeSub.status}`
//                 );

//             } catch (stripeRetrieveError) {

//                 // If Stripe genuinely says the subscription no longer exists,
//                 // allow the normal "create new subscription" flow below.
//                 if (
//                     stripeRetrieveError?.code === 'resource_missing' ||
//                     stripeRetrieveError?.statusCode === 404
//                 ) {
//                     logger.warn(
//                         `Stripe subscription ${stripe_subscription_id} was not found.`
//                     );

//                     liveStripeSub = null;

//                 } else {
//                     // IMPORTANT:
//                     // Do NOT silently ignore network/API errors because that
//                     // could accidentally create a duplicate subscription.
//                     throw stripeRetrieveError;
//                 }
//             }
//         }


//         // Use Stripe as source of truth whenever available.
//         const effectiveStatus =
//             liveStripeSub?.status || status;


//         // ================================================================
//         // NEW CASE:
//         // PAUSED SUBSCRIPTION
//         //
//         // Resume SAME Stripe subscription.
//         //
//         // DO NOT:
//         //
//         // stripe.checkout.sessions.create({
//         //     mode: 'subscription'
//         // })
//         //
//         // because that creates a NEW subscription.
//         // ================================================================

//         if (
//             liveStripeSub &&
//             liveStripeSub.status === 'paused'
//         ) {

//             if (
//                 liveStripeSub.collection_method !==
//                 'charge_automatically'
//             ) {
//                 return res.status(400).json({
//                     success: false,

//                     error:
//                         'This paused subscription cannot be resumed automatically because its collection method is not charge_automatically.',

//                     code:
//                         'UNSUPPORTED_COLLECTION_METHOD'
//                 });
//             }


//             // ------------------------------------------------------------
//             // Prevent two Renew requests from resuming/creating invoices
//             // at exactly the same time.
//             // ------------------------------------------------------------

//             const resumeLockKey =
//                 `resume:${userId}:${stripe_subscription_id}`;

//             const resumeLockResult =
//                 await executeQuery(
//                     `SELECT pg_try_advisory_lock(hashtext($1)) AS locked`,
//                     [resumeLockKey]
//                 );


//             if (!resumeLockResult.rows[0].locked) {
//                 return res.status(409).json({
//                     success: false,

//                     error:
//                         'Subscription renewal is already in progress.',

//                     code:
//                         'RENEWAL_IN_PROGRESS'
//                 });
//             }


//             try {

//                 logger.info(
//                     `Resuming paused Stripe subscription ${stripe_subscription_id}`
//                 );


//                 // ========================================================
//                 // RESUME THE SAME SUBSCRIPTION
//                 //
//                 // payment_behavior = resume_on_payment_attempt
//                 //
//                 // Stripe creates/finalizes the resumption invoice,
//                 // but DOES NOT automatically charge it.
//                 //
//                 // We then return hosted_invoice_url so the frontend can
//                 // open Stripe's payment page and let the customer enter
//                 // their card.
//                 //
//                 // billing_cycle_anchor = now
//                 //
//                 // New billing period starts NOW after successful resume.
//                 // ========================================================

//                 const resumedSub =
//                     await stripe.subscriptions.resume(
//                         stripe_subscription_id,
//                         {
//                             payment_behavior:
//                                 'resume_on_payment_attempt',

//                             billing_cycle_anchor:
//                                 'now',

//                             proration_behavior:
//                                 'none',

//                             expand: [
//                                 'latest_invoice'
//                             ]
//                         },
//                         {
//                             // Pause/Resume subscription API currently
//                             // requires the preview Stripe API.
//                             apiVersion:
//                                 process.env.STRIPE_PAUSE_API_VERSION ||
//                                 '2026-07-29.preview',

//                             idempotencyKey:
//                                 `resume-${userId}-${stripe_subscription_id}-${Date.now()}`
//                         }
//                     );


//                 // ========================================================
//                 // GET RESUMPTION INVOICE
//                 // ========================================================

//                 let resumeInvoice = null;


//                 if (resumedSub.latest_invoice) {

//                     if (
//                         typeof resumedSub.latest_invoice ===
//                         'string'
//                     ) {

//                         resumeInvoice =
//                             await stripe.invoices.retrieve(
//                                 resumedSub.latest_invoice
//                             );

//                     } else {

//                         resumeInvoice =
//                             resumedSub.latest_invoice;
//                     }
//                 }


//                 // ========================================================
//                 // GET STRIPE PAYMENT PAGE
//                 // ========================================================

//                 const paymentUrl =
//                     resumeInvoice?.hosted_invoice_url ||
//                     null;


//                 // ========================================================
//                 // SYNC CURRENT STRIPE STATE INTO OUR DATABASE
//                 //
//                 // At this point it can still be "paused" because the
//                 // resumption invoice hasn't been paid yet.
//                 //
//                 // Your invoice.paid webhook will sync it again after
//                 // payment succeeds.
//                 // ========================================================

//                 await PaymentService.syncSubscriptionFromStripe(
//                     resumedSub
//                 );


//                 logger.info(
//                     `Resume initiated for ${stripe_subscription_id}. ` +
//                     `Status=${resumedSub.status}, ` +
//                     `Invoice=${resumeInvoice?.id || 'none'}`
//                 );


//                 // ========================================================
//                 // RESPONSE
//                 //
//                 // Keep checkoutUrl name so your existing frontend can
//                 // continue opening the returned URL.
//                 // ========================================================

//                 return res.json({
//                     success: true,

//                     message: paymentUrl
//                         ? 'Subscription renewal started. Redirect the customer to Stripe to complete payment.'
//                         : 'Subscription resumed successfully. No payment was required.',


//                     // SAME EXISTING SUBSCRIPTION
//                     subscriptionId:
//                         resumedSub.id,


//                     // Helpful for testing
//                     previousSubscriptionId:
//                         stripe_subscription_id,


//                     sameSubscription:
//                         resumedSub.id ===
//                         stripe_subscription_id,


//                     status:
//                         resumedSub.status,


//                     // ----------------------------------------------------
//                     // Invoice
//                     // ----------------------------------------------------

//                     invoiceId:
//                         resumeInvoice?.id ||
//                         null,


//                     invoiceStatus:
//                         resumeInvoice?.status ||
//                         null,


//                     amountDue:
//                         resumeInvoice?.amount_due ??
//                         0,


//                     amountPaid:
//                         resumeInvoice?.amount_paid ??
//                         0,


//                     currency:
//                         resumeInvoice?.currency ||
//                         null,


//                     // ----------------------------------------------------
//                     // Stripe Hosted Invoice payment page
//                     //
//                     // Your frontend can continue doing:
//                     //
//                     // window.location.href = checkoutUrl
//                     // ----------------------------------------------------

//                     checkoutUrl:
//                         paymentUrl,


//                     hostedInvoiceUrl:
//                         paymentUrl,


//                     paymentRequired:
//                         Boolean(paymentUrl),


//                     // ----------------------------------------------------
//                     // Billing period returned by Stripe
//                     // ----------------------------------------------------

//                     billingCycleAnchor:
//                         resumedSub.billing_cycle_anchor ||
//                         null,


//                     billingCycleAnchorIso:
//                         resumedSub.billing_cycle_anchor
//                             ? new Date(
//                                 resumedSub.billing_cycle_anchor *
//                                 1000
//                             ).toISOString()
//                             : null,


//                     currentPeriodStart:
//                         resumedSub.current_period_start
//                         ??
//                         resumedSub.items?.data?.[0]
//                             ?.current_period_start
//                         ??
//                         null,


//                     currentPeriodEnd:
//                         resumedSub.current_period_end
//                         ??
//                         resumedSub.items?.data?.[0]
//                             ?.current_period_end
//                         ??
//                         null,


//                     hospital_id:
//                         hospital_id,


//                     user_id:
//                         userId,


//                     subscription_plans_id:
//                         subscription_plans_id
//                 });


//             } finally {

//                 await executeQuery(
//                     `SELECT pg_advisory_unlock(hashtext($1))`,
//                     [resumeLockKey]
//                 );
//             }
//         }


//         // ================================================================
//         // EXISTING CASE 1:
//         // EXPIRED / CANCELLED / UNPAID
//         //
//         // CHANGED:
//         // We use effectiveStatus instead of only DB status.
//         //
//         // PAUSED subscriptions never reach here because they are handled
//         // above.
//         // ================================================================

//         if (!['active', 'trialing'].includes(effectiveStatus)) {

//             const plan =
//                 await subscriptionPlanService.getActivePlanById(
//                     subscription_plans_id
//                 );


//             if (!plan) {
//                 return res.status(400).json({
//                     success: false,
//                     error:
//                         'Plan not found or no longer active'
//                 });
//             }


//             const userEmail =
//                 req.user?.email ||
//                 (
//                     await UserService.getUserById(
//                         userId
//                     )
//                 )?.email;


//             if (!userEmail) {
//                 return res.status(400).json({
//                     success: false,
//                     error:
//                         'User email not found'
//                 });
//             }


//             // ============================================================
//             // EXISTING GUARD — SLIGHTLY UPDATED
//             //
//             // We already retrieved the live subscription above, so use it.
//             //
//             // PAUSED is NOT included here because it has already been
//             // handled using resume().
//             // ============================================================

//             if (liveStripeSub) {

//                 if (
//                     [
//                         'active',
//                         'trialing',
//                         'past_due'
//                     ].includes(
//                         liveStripeSub.status
//                     )
//                 ) {

//                     return res.status(409).json({
//                         success: false,

//                         error:
//                             'An existing Stripe subscription is still active. Please contact support.',

//                         code:
//                             'STALE_SUBSCRIPTION_STATE'
//                     });
//                 }
//             }


//             // ============================================================
//             // EXISTING CODE
//             //
//             // At this point the old subscription cannot be resumed,
//             // for example:
//             //
//             // status = canceled
//             //
//             // A new Stripe subscription is expected here.
//             // ============================================================

//             const metadata = {

//                 userId:
//                     String(userId),

//                 hospitalId:
//                     String(hospital_id || ''),

//                 subscriptionPlanId:
//                     String(
//                         plan.subscriptionPlanId
//                     ),

//                 action:
//                     'reactivate'
//             };


//             const session =
//                 await stripe.checkout.sessions.create(
//                     {
//                         mode:
//                             'subscription',

//                         payment_method_types:
//                             ['card'],

//                         customer_email:
//                             userEmail,

//                         line_items: [
//                             {
//                                 price:
//                                     plan.stripePriceId,

//                                 quantity:
//                                     1
//                             }
//                         ],

//                         metadata,

//                         subscription_data: {
//                             metadata
//                         },

//                         success_url:
//                             `${
//                                 process.env.PAYMENT_URL ||
//                                 'http://localhost:3000'
//                             }/dashboard?subscription=reactivated`,

//                         cancel_url:
//                             `${
//                                 process.env.PAYMENT_URL ||
//                                 'http://localhost:3000'
//                             }/dashboard?subscription=cancelled`
//                     },
//                     {
//                         idempotencyKey:
//                             `checkout-reactivate-${userId}-${subscription_plans_id}`
//                     }
//                 );


//             return res.json({
//                 success: true,

//                 checkoutUrl:
//                     session.url,

//                 message:
//                     'Redirect to Stripe to restart your subscription'
//             });
//         }



//         // ================================================================
//         // CASE 2:
//         // ACTIVE SUBSCRIPTION — EARLY RENEWAL WITHIN WINDOW
//         //
//         // YOUR EXISTING CODE BELOW IS KEPT UNCHANGED.
//         // ================================================================

//         const now = new Date();

//         const periodEnd =
//             new Date(current_period_end);

//         const daysUntilExpiry =
//             Math.ceil(
//                 (periodEnd - now) /
//                 (1000 * 60 * 60 * 24)
//             );


//         if (daysUntilExpiry > 31) {

//             // production value — bump temporarily only while testing

//             return res.status(400).json({

//                 success: false,

//                 error:
//                     `Your subscription is active until ${periodEnd.toLocaleDateString()}. You can renew within 5 days of expiry.`,

//                 code:
//                     'TOO_EARLY'
//             });
//         }


//         // Postgres advisory lock scoped to this user — prevents concurrent
//         // double-renewal requests without needing a separate lock service.

//         const lockKey =
//             `renew:${userId}`;


//         const lockResult =
//             await executeQuery(
//                 `SELECT pg_try_advisory_lock(hashtext($1)) AS locked`,
//                 [lockKey]
//             );


//         if (!lockResult.rows[0].locked) {

//             return res.status(409).json({

//                 success: false,

//                 error:
//                     'Renewal already in progress',

//                 code:
//                     'RENEWAL_IN_PROGRESS'
//             });
//         }


//         try {

//             const stripeSub =
//                 await stripe.subscriptions.retrieve(
//                     stripe_subscription_id
//                 );


//             // Re-check live Stripe status,
//             // not just the cached DB row.

//             if (
//                 ![
//                     'active',
//                     'trialing'
//                 ].includes(
//                     stripeSub.status
//                 )
//             ) {

//                 return res.status(409).json({

//                     success: false,

//                     error:
//                         'Subscription state changed. Please refresh and try again.',

//                     code:
//                         'STATE_MISMATCH'
//                 });
//             }


//             const customer =
//                 await stripe.customers.retrieve(
//                     stripeSub.customer
//                 );


//             const defaultPaymentMethod =
//                 customer.invoice_settings
//                     ?.default_payment_method
//                 ||
//                 customer.default_source;


//             if (!defaultPaymentMethod) {

//                 return res.status(400).json({

//                     success: false,

//                     error:
//                         'No default payment method. Please add one in Customer Portal.',

//                     code:
//                         'MISSING_PAYMENT_METHOD'
//                 });
//             }


//             const plan =
//                 await subscriptionPlanService.getPlanById(
//                     subscription_plans_id
//                 );


//             if (!plan) {

//                 return res.status(400).json({

//                     success: false,

//                     error:
//                         'Plan not found'
//                 });
//             }


//             const idempotencyKey =
//                 `renew-${userId}-${stripe_subscription_id}-${crypto.randomUUID()}`;


//             // Charge for the renewal — pull actual amount/currency from
//             // Stripe's Price object rather than hand-converting
//             // plan.price to cents.

//             const stripePrice =
//                 await stripe.prices.retrieve(
//                     plan.stripePriceId
//                 );


//             await stripe.invoiceItems.create(
//                 {
//                     customer:
//                         stripeSub.customer,

//                     subscription:
//                         stripe_subscription_id,

//                     amount:
//                         stripePrice.unit_amount,

//                     currency:
//                         stripePrice.currency,

//                     description:
//                         `Early renewal – ${
//                             plan.subscriptionDetails ||
//                             plan.interval
//                         }`
//                 },
//                 {
//                     idempotencyKey:
//                         `${idempotencyKey}-item`
//                 }
//             );


//             const invoice =
//                 await stripe.invoices.create(
//                     {
//                         customer:
//                             stripeSub.customer,

//                         subscription:
//                             stripe_subscription_id,

//                         auto_advance:
//                             true,

//                         default_payment_method:
//                             defaultPaymentMethod
//                     },
//                     {
//                         idempotencyKey:
//                             `${idempotencyKey}-invoice`
//                     }
//                 );


//             const finalized =
//                 await stripe.invoices.finalizeInvoice(
//                     invoice.id
//                 );


//             const paid =
//                 await stripe.invoices.pay(
//                     finalized.id,
//                     {
//                         payment_method:
//                             defaultPaymentMethod
//                     }
//                 );


//             if (paid.status !== 'paid') {

//                 logger.error(
//                     `Renewal invoice ${paid.id} not paid, status=${paid.status}`
//                 );


//                 return res.status(402).json({

//                     success: false,

//                     error:
//                         'Payment could not be completed. Please check your payment method.',

//                     code:
//                         'PAYMENT_FAILED'
//                 });
//             }


//             // Extend the period from where it currently ends — NOT from
//             // "now" — so already-paid days are never discarded.
//             //
//             // trial_end (not billing_cycle_anchor) is what actually moves
//             // current_period_end forward to an arbitrary future date
//             // without resetting the cycle.

//             function getIntervalMs(interval) {

//                 const days =
//                     parseInt(interval, 10) ||
//                     30;

//                 return (
//                     days *
//                     24 *
//                     60 *
//                     60 *
//                     1000
//                 );
//             }


//             const currentPeriodEndDate =
//                 new Date(
//                     current_period_end
//                 );


//             const newPeriodEndDate =
//                 new Date(
//                     currentPeriodEndDate.getTime() +
//                     getIntervalMs(
//                         plan.interval
//                     )
//                 );


//             const newPeriodEndUnix =
//                 Math.floor(
//                     newPeriodEndDate.getTime() /
//                     1000
//                 );


//             // The old current_period_end becomes the new
//             // current_period_start — that's genuinely when this
//             // newly-paid period begins.

//             const newPeriodStartUnix =
//                 Math.floor(
//                     currentPeriodEndDate.getTime() /
//                     1000
//                 );


//             const updatedSub =
//                 await stripe.subscriptions.update(
//                     stripe_subscription_id,
//                     {
//                         trial_end:
//                             newPeriodEndUnix,

//                         proration_behavior:
//                             'none'
//                     },
//                     {
//                         idempotencyKey:
//                             `${idempotencyKey}-extend`
//                     }
//                 );


//             // Trust Stripe's own reported values over our local
//             // computation where available.

//             const finalPeriodEnd =
//                 updatedSub.current_period_end
//                 ??
//                 updatedSub.items
//                     ?.data?.[0]
//                     ?.current_period_end
//                 ??
//                 newPeriodEndUnix;


//             const finalPeriodStart =
//                 updatedSub.current_period_start
//                 ??
//                 updatedSub.items
//                     ?.data?.[0]
//                     ?.current_period_start
//                 ??
//                 newPeriodStartUnix;


//             const updated =
//                 await PaymentService.markSubscriptionRenewed(
//                     stripe_subscription_id,
//                     finalPeriodStart,
//                     finalPeriodEnd,
//                     paid.hosted_invoice_url,
//                     paid.amount_paid,

//                     // pass Stripe's real status
//                     // likely 'trialing' due to trial_end
//                     updatedSub.status
//                 );


//             return res.json({

//                 success: true,

//                 message:
//                     'Subscription renewed successfully.',

//                 invoiceId:
//                     paid.id,

//                 currentPeriodStart:
//                     updated?.current_period_start ||
//                     null,

//                 currentPeriodEnd:
//                     updated?.current_period_end ||
//                     null,

//                 status:
//                     updated?.status ||
//                     null,

//                 hospital_id:
//                     hospital_id,

//                 user_id:
//                     userId,

//                 subscription_plans_id:
//                     subscription_plans_id
//             });


//         } finally {

//             await executeQuery(
//                 `SELECT pg_advisory_unlock(hashtext($1))`,
//                 [lockKey]
//             );
//         }


//     } catch (error) {

//         logger.error(
//             'Renewal error:',
//             error
//         );


//         res.status(500).json({

//             success: false,

//             error:
//                 'Failed to process renewal request'
//         });
//     }
// };




// exports.renewSubscription = async (req, res) => {
//     try {
//         const userId = req.userId || req.user?.id;

//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Unauthorized'
//             });
//         }

//         const sub =
//             await UserService.getSubscriptionByUserId(userId);

//         if (!sub) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'No subscription found'
//             });
//         }

//         const {
//             stripe_subscription_id,
//             status,
//             subscription_plans_id,
//             hospital_id,
//             current_period_end
//         } = sub;


//         // ================================================================
//         // LOAD LIVE STRIPE SUBSCRIPTION
//         // ================================================================

//         let liveStripeSub = null;

//         if (stripe_subscription_id) {
//             try {
//                 liveStripeSub =
//                     await stripe.subscriptions.retrieve(
//                         stripe_subscription_id,
//                         {
//                             expand: [
//                                 'latest_invoice'
//                             ]
//                         }
//                     );

//                 logger.info(
//                     `Live Stripe subscription ${stripe_subscription_id} status=${liveStripeSub.status}`
//                 );

//             } catch (stripeRetrieveError) {

//                 if (
//                     stripeRetrieveError?.code === 'resource_missing' ||
//                     stripeRetrieveError?.statusCode === 404
//                 ) {
//                     logger.warn(
//                         `Stripe subscription ${stripe_subscription_id} not found`
//                     );

//                     liveStripeSub = null;

//                 } else {
//                     throw stripeRetrieveError;
//                 }
//             }
//         }


//         const effectiveStatus =
//             liveStripeSub?.status || status;


//         // ================================================================
//         // CASE 1:
//         // PAUSED SUBSCRIPTION
//         //
//         // SAME subscription is resumed.
//         //
//         // NO checkout mode="subscription"
//         // NO new sub_xxx
//         // NO trial_end
//         // NO manual date calculation
//         // ================================================================

//         if (
//             liveStripeSub &&
//             liveStripeSub.status === 'paused'
//         ) {

//             if (
//                 liveStripeSub.collection_method !==
//                 'charge_automatically'
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     error:
//                         'This paused subscription cannot be resumed because collection_method is not charge_automatically.',
//                     code:
//                         'UNSUPPORTED_COLLECTION_METHOD'
//                 });
//             }


//             // ============================================================
//             // CURRENT REAL SERVER TIME
//             // ============================================================

//             const serverNowUnix =
//                 Math.floor(Date.now() / 1000);


//             // ============================================================
//             // STRIPE PAUSE TIMESTAMP
//             //
//             // This is useful for detecting the exact issue you just had.
//             // ============================================================

//             const stripePausedAt =
//                 liveStripeSub.status_details
//                     ?.paused
//                     ?.transitioned_at
//                 ??
//                 liveStripeSub.items
//                     ?.data?.[0]
//                     ?.current_period_end
//                 ??
//                 null;


//             // ============================================================
//             // IMPORTANT:
//             // TEST CLOCK CHECK
//             //
//             // If attached to a Stripe Test Clock, "now" means the
//             // test-clock time, NOT Date.now() from your Node server.
//             // ============================================================

//             if (liveStripeSub.test_clock) {

//                 logger.error(
//                     `Cannot renew ${stripe_subscription_id} using real server time because it is attached to Stripe Test Clock ${liveStripeSub.test_clock}`
//                 );

//                 return res.status(409).json({
//                     success: false,

//                     error:
//                         'This Stripe test subscription is attached to a Test Clock. Stripe billing_cycle_anchor=now will use the Test Clock time instead of the real current server date.',

//                     code:
//                         'STRIPE_TEST_CLOCK_ACTIVE',

//                     testClock:
//                         liveStripeSub.test_clock,

//                     serverCurrentTime:
//                         new Date(
//                             serverNowUnix * 1000
//                         ).toISOString(),

//                     stripePausedAt:
//                         stripePausedAt
//                             ? new Date(
//                                 stripePausedAt * 1000
//                             ).toISOString()
//                             : null
//                 });
//             }


//             // ============================================================
//             // CLOCK SAFETY CHECK
//             //
//             // Stripe pause time must NOT be in the future compared with
//             // our actual server clock.
//             //
//             // Example of BAD state:
//             //
//             // Server:
//             // 2026-08-26
//             //
//             // Stripe:
//             // 2026-11-30
//             //
//             // We refuse to resume because billing_cycle_anchor='now'
//             // would then also produce November -> February.
//             // ============================================================

//             const CLOCK_TOLERANCE_SECONDS =
//                 5 * 60;


//             if (
//                 stripePausedAt &&
//                 stripePausedAt >
//                     serverNowUnix +
//                     CLOCK_TOLERANCE_SECONDS
//             ) {

//                 logger.error(
//                     `Stripe clock mismatch for ${stripe_subscription_id}. ` +
//                     `Server=${new Date(serverNowUnix * 1000).toISOString()}, ` +
//                     `Stripe=${new Date(stripePausedAt * 1000).toISOString()}`
//                 );


//                 return res.status(409).json({

//                     success: false,

//                     error:
//                         'Stripe subscription time is ahead of the current server time. Renewal has been stopped to prevent incorrect billing dates.',

//                     code:
//                         'STRIPE_CLOCK_MISMATCH',

//                     serverCurrentTime:
//                         new Date(
//                             serverNowUnix * 1000
//                         ).toISOString(),

//                     stripePausedAt:
//                         new Date(
//                             stripePausedAt * 1000
//                         ).toISOString()
//                 });
//             }


//             // ============================================================
//             // LOCK
//             // ============================================================

//             const resumeLockKey =
//                 `resume:${userId}:${stripe_subscription_id}`;


//             const resumeLockResult =
//                 await executeQuery(
//                     `
//                     SELECT pg_try_advisory_lock(
//                         hashtext($1)
//                     ) AS locked
//                     `,
//                     [
//                         resumeLockKey
//                     ]
//                 );


//             if (!resumeLockResult.rows[0].locked) {
//                 return res.status(409).json({
//                     success: false,

//                     error:
//                         'Subscription renewal is already in progress.',

//                     code:
//                         'RENEWAL_IN_PROGRESS'
//                 });
//             }


//             try {

//                 logger.info(
//                     `Resuming SAME paused Stripe subscription ${stripe_subscription_id}`
//                 );


//                 // ========================================================
//                 // RESUME SAME SUBSCRIPTION
//                 //
//                 // billing_cycle_anchor: now
//                 //
//                 // Stripe will automatically calculate:
//                 //
//                 // current_period_start = NOW
//                 //
//                 // current_period_end =
//                 // NOW + recurring Stripe Price interval
//                 //
//                 // DO NOT send trial_end.
//                 // DO NOT calculate 90 days manually here.
//                 // ========================================================

//                 const resumeIdempotencyKey =
//                     `resume-${userId}-${stripe_subscription_id}-${stripePausedAt || 'paused'}`;


//                 const resumedSub =
//                     await stripe.subscriptions.resume(
//                         stripe_subscription_id,
//                         {
//                             payment_behavior:
//                                 'resume_on_payment_attempt',

//                             billing_cycle_anchor:
//                                 'now',

//                             proration_behavior:
//                                 'none',

//                             expand: [
//                                 'latest_invoice'
//                             ]
//                         },
//                         {
//                             apiVersion:
//                                 process.env.STRIPE_PAUSE_API_VERSION ||
//                                 '2026-07-29.preview',

//                             idempotencyKey:
//                                 resumeIdempotencyKey
//                         }
//                     );


//                 // ========================================================
//                 // RESUMPTION INVOICE
//                 // ========================================================

//                 let resumeInvoice = null;


//                 if (resumedSub.latest_invoice) {

//                     if (
//                         typeof resumedSub.latest_invoice ===
//                         'string'
//                     ) {

//                         resumeInvoice =
//                             await stripe.invoices.retrieve(
//                                 resumedSub.latest_invoice
//                             );

//                     } else {

//                         resumeInvoice =
//                             resumedSub.latest_invoice;
//                     }
//                 }


//                 const paymentUrl =
//                     resumeInvoice?.hosted_invoice_url ||
//                     null;


//                 // ========================================================
//                 // IMPORTANT:
//                 //
//                 // IF PAYMENT IS REQUIRED,
//                 // DO NOT FORCE THE DB TO ACTIVE HERE.
//                 //
//                 // Wait for invoice.paid.
//                 //
//                 // invoice.paid
//                 //      ↓
//                 // retrieve fresh Stripe subscription
//                 //      ↓
//                 // syncSubscriptionFromStripe()
//                 //
//                 // That is where DB receives final Stripe period dates.
//                 // ========================================================

//                 if (
//                     !paymentUrl &&
//                     resumedSub.status === 'active'
//                 ) {

//                     await PaymentService.syncSubscriptionFromStripe(
//                         resumedSub
//                     );
//                 }


//                 const stripeItem =
//                     resumedSub.items?.data?.[0]
//                     || null;


//                 const stripePeriodStart =
//                     resumedSub.current_period_start
//                     ??
//                     stripeItem?.current_period_start
//                     ??
//                     null;


//                 const stripePeriodEnd =
//                     resumedSub.current_period_end
//                     ??
//                     stripeItem?.current_period_end
//                     ??
//                     null;


//                 logger.info(
//                     `Resume initiated: ${stripe_subscription_id}, ` +
//                     `status=${resumedSub.status}, ` +
//                     `start=${stripePeriodStart}, ` +
//                     `end=${stripePeriodEnd}, ` +
//                     `invoice=${resumeInvoice?.id || 'none'}`
//                 );


//                 return res.json({

//                     success: true,


//                     message:
//                         paymentUrl
//                             ? 'Subscription renewal started. Complete the Stripe payment to activate the existing subscription.'
//                             : 'Subscription resumed successfully.',


//                     subscriptionId:
//                         resumedSub.id,


//                     previousSubscriptionId:
//                         stripe_subscription_id,


//                     sameSubscription:
//                         resumedSub.id ===
//                         stripe_subscription_id,


//                     status:
//                         resumedSub.status,


//                     // ----------------------------------------------------
//                     // CURRENT REAL SERVER TIME
//                     // ----------------------------------------------------

//                     requestedAt:
//                         serverNowUnix,

//                     requestedAtIso:
//                         new Date(
//                             serverNowUnix * 1000
//                         ).toISOString(),


//                     // ----------------------------------------------------
//                     // STRIPE BILLING DATES
//                     // ----------------------------------------------------

//                     currentPeriodStart:
//                         stripePeriodStart,

//                     currentPeriodStartIso:
//                         stripePeriodStart
//                             ? new Date(
//                                 stripePeriodStart * 1000
//                             ).toISOString()
//                             : null,


//                     currentPeriodEnd:
//                         stripePeriodEnd,

//                     currentPeriodEndIso:
//                         stripePeriodEnd
//                             ? new Date(
//                                 stripePeriodEnd * 1000
//                             ).toISOString()
//                             : null,


//                     billingCycleAnchor:
//                         resumedSub.billing_cycle_anchor ||
//                         null,

//                     billingCycleAnchorIso:
//                         resumedSub.billing_cycle_anchor
//                             ? new Date(
//                                 resumedSub.billing_cycle_anchor *
//                                 1000
//                             ).toISOString()
//                             : null,


//                     // ----------------------------------------------------
//                     // PAYMENT
//                     // ----------------------------------------------------

//                     invoiceId:
//                         resumeInvoice?.id ||
//                         null,

//                     invoiceStatus:
//                         resumeInvoice?.status ||
//                         null,

//                     amountDue:
//                         resumeInvoice?.amount_due ??
//                         0,

//                     amountPaid:
//                         resumeInvoice?.amount_paid ??
//                         0,

//                     currency:
//                         resumeInvoice?.currency ||
//                         null,


//                     paymentRequired:
//                         Boolean(paymentUrl),


//                     // Keep existing frontend property
//                     checkoutUrl:
//                         paymentUrl,


//                     hostedInvoiceUrl:
//                         paymentUrl,

//  returnUrl:
//         `${
//             process.env.PAYMENT_URL ||
//             'http://localhost:3000'
//         }/dashboard?subscription=renewed`,



//                     hospital_id:
//                         hospital_id,

//                     user_id:
//                         userId,

//                     subscription_plans_id:
//                         subscription_plans_id
//                 });


//             } finally {

//                 await executeQuery(
//                     `
//                     SELECT pg_advisory_unlock(
//                         hashtext($1)
//                     )
//                     `,
//                     [
//                         resumeLockKey
//                     ]
//                 );
//             }
//         }



//         // ================================================================
//         // CASE 2:
//         // CANCELED / TERMINAL / MISSING SUBSCRIPTION
//         //
//         // New Stripe subscription required.
//         // ================================================================

//         if (
//             ![
//                 'active',
//                 'trialing'
//             ].includes(
//                 effectiveStatus
//             )
//         ) {

//             const plan =
//                 await subscriptionPlanService.getActivePlanById(
//                     subscription_plans_id
//                 );


//             if (!plan) {
//                 return res.status(400).json({
//                     success: false,
//                     error:
//                         'Plan not found or no longer active'
//                 });
//             }


//             const userEmail =
//                 req.user?.email ||
//                 (
//                     await UserService.getUserById(
//                         userId
//                     )
//                 )?.email;


//             if (!userEmail) {
//                 return res.status(400).json({
//                     success: false,
//                     error:
//                         'User email not found'
//                 });
//             }


//             // If Stripe still has a non-terminal subscription,
//             // don't accidentally create another one.

//             if (liveStripeSub) {

//                 if (
//                     [
//                         'active',
//                         'trialing',
//                         'past_due',
//                         'paused'
//                     ].includes(
//                         liveStripeSub.status
//                     )
//                 ) {

//                     return res.status(409).json({
//                         success: false,

//                         error:
//                             `Existing Stripe subscription is ${liveStripeSub.status}. A new subscription will not be created.`,

//                         code:
//                             'STALE_SUBSCRIPTION_STATE'
//                     });
//                 }
//             }


//             const metadata = {

//                 userId:
//                     String(userId),

//                 hospitalId:
//                     String(
//                         hospital_id ||
//                         ''
//                     ),

//                 subscriptionPlanId:
//                     String(
//                         plan.subscriptionPlanId
//                     ),

//                 action:
//                     'reactivate'
//             };


//             const session =
//                 await stripe.checkout.sessions.create(
//                     {

//                         mode:
//                             'subscription',

//                         payment_method_types:
//                             [
//                                 'card'
//                             ],

//                         customer_email:
//                             userEmail,

//                         line_items: [
//                             {
//                                 price:
//                                     plan.stripePriceId,

//                                 quantity:
//                                     1
//                             }
//                         ],

//                         metadata,

//                         subscription_data: {
//                             metadata
//                         },

//                         success_url:
//                             `${
//                                 process.env.PAYMENT_URL ||
//                                 'http://localhost:3000'
//                             }/dashboard?subscription=reactivated`,

//                         cancel_url:
//                             `${
//                                 process.env.PAYMENT_URL ||
//                                 'http://localhost:3000'
//                             }/dashboard?subscription=cancelled`
//                     },
//                     {

//                         idempotencyKey:
//                             `checkout-reactivate-${userId}-${subscription_plans_id}`
//                     }
//                 );


//             return res.json({

//                 success:
//                     true,

//                 checkoutUrl:
//                     session.url,

//                 message:
//                     'Redirect to Stripe to create a new subscription because the previous subscription cannot be resumed.'
//             });
//         }



//         // ================================================================
//         // CASE 3:
//         // ACTIVE SUBSCRIPTION — EARLY RENEWAL
//         //
//         // YOUR EXISTING LOGIC IS PRESERVED BELOW.
//         //
//         // NOTE:
//         // This is DIFFERENT from paused -> resume.
//         // ================================================================

//         const now =
//             new Date();


//         const periodEnd =
//             new Date(
//                 current_period_end
//             );


//         const daysUntilExpiry =
//             Math.ceil(
//                 (
//                     periodEnd -
//                     now
//                 )
//                 /
//                 (
//                     1000 *
//                     60 *
//                     60 *
//                     24
//                 )
//             );


//         if (
//             daysUntilExpiry >
//             1
//         ) {

//             return res.status(400).json({

//                 success:
//                     false,

//                 error:
//                     `Your subscription is active until ${periodEnd.toLocaleDateString()}. You can renew within 31 days of expiry.`,

//                 code:
//                     'TOO_EARLY'
//             });
//         }


//         const lockKey =
//             `renew:${userId}`;


//         const lockResult =
//             await executeQuery(
//                 `
//                 SELECT pg_try_advisory_lock(
//                     hashtext($1)
//                 ) AS locked
//                 `,
//                 [
//                     lockKey
//                 ]
//             );


//         if (
//             !lockResult.rows[0].locked
//         ) {

//             return res.status(409).json({

//                 success:
//                     false,

//                 error:
//                     'Renewal already in progress',

//                 code:
//                     'RENEWAL_IN_PROGRESS'
//             });
//         }


//         try {

//             const stripeSub =
//                 await stripe.subscriptions.retrieve(
//                     stripe_subscription_id
//                 );


//             if (
//                 ![
//                     'active',
//                     'trialing'
//                 ].includes(
//                     stripeSub.status
//                 )
//             ) {

//                 return res.status(409).json({

//                     success:
//                         false,

//                     error:
//                         'Subscription state changed. Please refresh and try again.',

//                     code:
//                         'STATE_MISMATCH'
//                 });
//             }


//             const customer =
//                 await stripe.customers.retrieve(
//                     stripeSub.customer
//                 );


//             const defaultPaymentMethod =
//                 customer.invoice_settings
//                     ?.default_payment_method
//                 ||
//                 customer.default_source;


//             if (
//                 !defaultPaymentMethod
//             ) {

//                 return res.status(400).json({

//                     success:
//                         false,

//                     error:
//                         'No default payment method. Please add one in Customer Portal.',

//                     code:
//                         'MISSING_PAYMENT_METHOD'
//                 });
//             }


//             const plan =
//                 await subscriptionPlanService.getPlanById(
//                     subscription_plans_id
//                 );


//             if (!plan) {

//                 return res.status(400).json({

//                     success:
//                         false,

//                     error:
//                         'Plan not found'
//                 });
//             }


//             const idempotencyKey =
//                 `renew-${userId}-${stripe_subscription_id}-${crypto.randomUUID()}`;


//             const stripePrice =
//                 await stripe.prices.retrieve(
//                     plan.stripePriceId
//                 );


//             await stripe.invoiceItems.create(
//                 {

//                     customer:
//                         stripeSub.customer,

//                     subscription:
//                         stripe_subscription_id,

//                     amount:
//                         stripePrice.unit_amount,

//                     currency:
//                         stripePrice.currency,

//                     description:
//                         `Early renewal – ${
//                             plan.subscriptionDetails ||
//                             plan.interval
//                         }`
//                 },
//                 {

//                     idempotencyKey:
//                         `${idempotencyKey}-item`
//                 }
//             );


//             const invoice =
//                 await stripe.invoices.create(
//                     {

//                         customer:
//                             stripeSub.customer,

//                         subscription:
//                             stripe_subscription_id,

//                         auto_advance:
//                             true,

//                         default_payment_method:
//                             defaultPaymentMethod
//                     },
//                     {

//                         idempotencyKey:
//                             `${idempotencyKey}-invoice`
//                     }
//                 );


//             const finalized =
//                 await stripe.invoices.finalizeInvoice(
//                     invoice.id
//                 );


//             const paid =
//                 await stripe.invoices.pay(
//                     finalized.id,
//                     {

//                         payment_method:
//                             defaultPaymentMethod
//                     }
//                 );


//             if (
//                 paid.status !==
//                 'paid'
//             ) {

//                 logger.error(
//                     `Renewal invoice ${paid.id} not paid, status=${paid.status}`
//                 );


//                 return res.status(402).json({

//                     success:
//                         false,

//                     error:
//                         'Payment could not be completed. Please check your payment method.',

//                     code:
//                         'PAYMENT_FAILED'
//                 });
//             }


//             // ============================================================
//             // KEEP YOUR EXISTING EARLY-RENEWAL DATE LOGIC
//             //
//             // This section is NOT involved when status is paused.
//             // ============================================================

//             function getIntervalMs(interval) {

//                 const days =
//                     parseInt(
//                         interval,
//                         10
//                     )
//                     ||
//                     30;


//                 return (
//                     days *
//                     24 *
//                     60 *
//                     60 *
//                     1000
//                 );
//             }


//             const currentPeriodEndDate =
//                 new Date(
//                     current_period_end
//                 );


//             const newPeriodEndDate =
//                 new Date(
//                     currentPeriodEndDate.getTime()
//                     +
//                     getIntervalMs(
//                         plan.interval
//                     )
//                 );


//             const newPeriodEndUnix =
//                 Math.floor(
//                     newPeriodEndDate.getTime()
//                     /
//                     1000
//                 );


//             const newPeriodStartUnix =
//                 Math.floor(
//                     currentPeriodEndDate.getTime()
//                     /
//                     1000
//                 );


//             const updatedSub =
//                 await stripe.subscriptions.update(
//                     stripe_subscription_id,
//                     {

//                         trial_end:
//                             newPeriodEndUnix,

//                         proration_behavior:
//                             'none'
//                     },
//                     {

//                         idempotencyKey:
//                             `${idempotencyKey}-extend`
//                     }
//                 );


//             const finalPeriodEnd =
//                 updatedSub.current_period_end
//                 ??
//                 updatedSub.items
//                     ?.data?.[0]
//                     ?.current_period_end
//                 ??
//                 newPeriodEndUnix;


//             const finalPeriodStart =
//                 updatedSub.current_period_start
//                 ??
//                 updatedSub.items
//                     ?.data?.[0]
//                     ?.current_period_start
//                 ??
//                 newPeriodStartUnix;


//             const updated =
//                 await PaymentService.markSubscriptionRenewed(
//                     stripe_subscription_id,

//                     finalPeriodStart,

//                     finalPeriodEnd,

//                     paid.hosted_invoice_url,

//                     paid.amount_paid,

//                     updatedSub.status
//                 );


//             return res.json({

//                 success:
//                     true,

//                 message:
//                     'Subscription renewed successfully.',

//                 invoiceId:
//                     paid.id,

//                 currentPeriodStart:
//                     updated?.current_period_start ||
//                     null,

//                 currentPeriodEnd:
//                     updated?.current_period_end ||
//                     null,

//                 status:
//                     updated?.status ||
//                     null,

//                 hospital_id:
//                     hospital_id,

//                 user_id:
//                     userId,

//                 subscription_plans_id:
//                     subscription_plans_id
//             });


//         } finally {

//             await executeQuery(
//                 `
//                 SELECT pg_advisory_unlock(
//                     hashtext($1)
//                 )
//                 `,
//                 [
//                     lockKey
//                 ]
//             );
//         }


//     } catch (error) {

//         logger.error(
//             'Renewal error:',
//             error
//         );


//         return res.status(500).json({

//             success:
//                 false,

//             error:
//                 'Failed to process renewal request'
//         });
//     }
// };


// exports.renewSubscription = async (req, res) => {
//     try {
//         const userId = req.userId || req.user?.id;

//         if (!userId) {
//             return res.status(401).json({ success: false, error: 'Unauthorized' });
//         }

//         const sub = await UserService.getSubscriptionByUserId(userId);

//         if (!sub) {
//             return res.status(404).json({ success: false, error: 'No subscription found' });
//         }

//         const {
//             stripe_subscription_id,
//             status,
//             subscription_plans_id,
//             hospital_id,
//             current_period_end
//         } = sub;

//         // ================================================================
//         // LOAD LIVE STRIPE SUBSCRIPTION
//         // FIX: apiVersion now matches the preview version used everywhere
//         // else this subscription is touched (pause/resume/webhook).
//         // ================================================================
//         let liveStripeSub = null;

//         if (stripe_subscription_id) {
//             try {
//                 liveStripeSub = await stripe.subscriptions.retrieve(
//                     stripe_subscription_id,
//                     { expand: ['latest_invoice'] },
//                     {
//                         apiVersion:
//                             process.env.STRIPE_PAUSE_API_VERSION ||
//                             '2026-07-29.preview'
//                     }
//                 );

//                 logger.info(`Live Stripe subscription ${stripe_subscription_id} status=${liveStripeSub.status}`);

//             } catch (stripeRetrieveError) {
//                 if (
//                     stripeRetrieveError?.code === 'resource_missing' ||
//                     stripeRetrieveError?.statusCode === 404
//                 ) {
//                     logger.warn(`Stripe subscription ${stripe_subscription_id} not found`);
//                     liveStripeSub = null;
//                 } else {
//                     throw stripeRetrieveError;
//                 }
//             }
//         }

//         const effectiveStatus = liveStripeSub?.status || status;

//         // ================================================================
//         // CASE 1: PAUSED SUBSCRIPTION — resume same subscription
//         // (unchanged — this is correct as-is)
//         // ================================================================
//         if (liveStripeSub && liveStripeSub.status === 'paused') {

//             if (liveStripeSub.collection_method !== 'charge_automatically') {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'This paused subscription cannot be resumed because collection_method is not charge_automatically.',
//                     code: 'UNSUPPORTED_COLLECTION_METHOD'
//                 });
//             }

//             const serverNowUnix = Math.floor(Date.now() / 1000);

//             const stripePausedAt =
//                 liveStripeSub.status_details?.paused?.transitioned_at
//                 ?? liveStripeSub.items?.data?.[0]?.current_period_end
//                 ?? null;

//             if (liveStripeSub.test_clock) {
//                 logger.error(`Cannot renew ${stripe_subscription_id} using real server time because it is attached to Stripe Test Clock ${liveStripeSub.test_clock}`);
//                 return res.status(409).json({
//                     success: false,
//                     error: 'This Stripe test subscription is attached to a Test Clock. Stripe billing_cycle_anchor=now will use the Test Clock time instead of the real current server date.',
//                     code: 'STRIPE_TEST_CLOCK_ACTIVE',
//                     testClock: liveStripeSub.test_clock,
//                     serverCurrentTime: new Date(serverNowUnix * 1000).toISOString(),
//                     stripePausedAt: stripePausedAt ? new Date(stripePausedAt * 1000).toISOString() : null
//                 });
//             }

//             const CLOCK_TOLERANCE_SECONDS = 5 * 60;

//             if (stripePausedAt && stripePausedAt > serverNowUnix + CLOCK_TOLERANCE_SECONDS) {
//                 logger.error(`Stripe clock mismatch for ${stripe_subscription_id}. Server=${new Date(serverNowUnix * 1000).toISOString()}, Stripe=${new Date(stripePausedAt * 1000).toISOString()}`);
//                 return res.status(409).json({
//                     success: false,
//                     error: 'Stripe subscription time is ahead of the current server time. Renewal has been stopped to prevent incorrect billing dates.',
//                     code: 'STRIPE_CLOCK_MISMATCH',
//                     serverCurrentTime: new Date(serverNowUnix * 1000).toISOString(),
//                     stripePausedAt: new Date(stripePausedAt * 1000).toISOString()
//                 });
//             }

//             const resumeLockKey = `resume:${userId}:${stripe_subscription_id}`;
//             const resumeLockResult = await executeQuery(
//                 `SELECT pg_try_advisory_lock(hashtext($1)) AS locked`,
//                 [resumeLockKey]
//             );

//             if (!resumeLockResult.rows[0].locked) {
//                 return res.status(409).json({
//                     success: false,
//                     error: 'Subscription renewal is already in progress.',
//                     code: 'RENEWAL_IN_PROGRESS'
//                 });
//             }

//             try {
//                 logger.info(`Resuming SAME paused Stripe subscription ${stripe_subscription_id}`);

//                 const resumeIdempotencyKey = `resume-${userId}-${stripe_subscription_id}-${stripePausedAt || 'paused'}`;

//                 const resumedSub = await stripe.subscriptions.resume(
//                     stripe_subscription_id,
//                     {
//                         payment_behavior: 'resume_on_payment_attempt',
//                         billing_cycle_anchor: 'now',
//                         proration_behavior: 'none',
//                         expand: ['latest_invoice']
//                     },
//                     {
//                         apiVersion: process.env.STRIPE_PAUSE_API_VERSION || '2026-07-29.preview',
//                         idempotencyKey: resumeIdempotencyKey
//                     }
//                 );

//                 let resumeInvoice = null;
//                 if (resumedSub.latest_invoice) {
//                     resumeInvoice = typeof resumedSub.latest_invoice === 'string'
//                         ? await stripe.invoices.retrieve(resumedSub.latest_invoice)
//                         : resumedSub.latest_invoice;
//                 }

//                 const paymentUrl = resumeInvoice?.hosted_invoice_url || null;

//                 if (!paymentUrl && resumedSub.status === 'active') {
//                     await PaymentService.syncSubscriptionFromStripe(resumedSub);
//                 }

//                 const stripeItem = resumedSub.items?.data?.[0] || null;
//                 const stripePeriodStart = resumedSub.current_period_start ?? stripeItem?.current_period_start ?? null;
//                 const stripePeriodEnd = resumedSub.current_period_end ?? stripeItem?.current_period_end ?? null;

//                 logger.info(`Resume initiated: ${stripe_subscription_id}, status=${resumedSub.status}, start=${stripePeriodStart}, end=${stripePeriodEnd}, invoice=${resumeInvoice?.id || 'none'}`);

//                 return res.json({
//                     success: true,
//                     message: paymentUrl
//                         ? 'Subscription renewal started. Complete the Stripe payment to activate the existing subscription.'
//                         : 'Subscription resumed successfully.',
//                     subscriptionId: resumedSub.id,
//                     previousSubscriptionId: stripe_subscription_id,
//                     sameSubscription: resumedSub.id === stripe_subscription_id,
//                     status: resumedSub.status,
//                     requestedAt: serverNowUnix,
//                     requestedAtIso: new Date(serverNowUnix * 1000).toISOString(),
//                     currentPeriodStart: stripePeriodStart,
//                     currentPeriodStartIso: stripePeriodStart ? new Date(stripePeriodStart * 1000).toISOString() : null,
//                     currentPeriodEnd: stripePeriodEnd,
//                     currentPeriodEndIso: stripePeriodEnd ? new Date(stripePeriodEnd * 1000).toISOString() : null,
//                     billingCycleAnchor: resumedSub.billing_cycle_anchor || null,
//                     billingCycleAnchorIso: resumedSub.billing_cycle_anchor ? new Date(resumedSub.billing_cycle_anchor * 1000).toISOString() : null,
//                     invoiceId: resumeInvoice?.id || null,
//                     invoiceStatus: resumeInvoice?.status || null,
//                     amountDue: resumeInvoice?.amount_due ?? 0,
//                     amountPaid: resumeInvoice?.amount_paid ?? 0,
//                     currency: resumeInvoice?.currency || null,
//                     paymentRequired: Boolean(paymentUrl),
//                     checkoutUrl: paymentUrl,
//                     hostedInvoiceUrl: paymentUrl,
//                     returnUrl: `${process.env.PAYMENT_URL || 'http://localhost:3000'}/dashboard?subscription=renewed`,
//                     hospital_id: hospital_id,
//                     user_id: userId,
//                     subscription_plans_id: subscription_plans_id
//                 });

//             } finally {
//                 await executeQuery(`SELECT pg_advisory_unlock(hashtext($1))`, [resumeLockKey]);
//             }
//         }

//         // ================================================================
//         // CASE 2: PAST_DUE / UNPAID / INCOMPLETE / CANCELED / TERMINAL / MISSING
//         // FIX: only active/trialing blocks; past_due/unpaid/incomplete get
//         // canceled then fall through to a fresh Checkout Session.
//         // ================================================================
//         if (!['active', 'trialing'].includes(effectiveStatus)) {

//             const plan = await subscriptionPlanService.getActivePlanById(subscription_plans_id);

//             if (!plan) {
//                 return res.status(400).json({ success: false, error: 'Plan not found or no longer active' });
//             }

//             const userEmail = req.user?.email || (await UserService.getUserById(userId))?.email;

//             if (!userEmail) {
//                 return res.status(400).json({ success: false, error: 'User email not found' });
//             }

//             if (liveStripeSub) {
//                 if (['active', 'trialing'].includes(liveStripeSub.status)) {
//                     return res.status(409).json({
//                         success: false,
//                         error: `Existing Stripe subscription is ${liveStripeSub.status}. A new subscription will not be created.`,
//                         code: 'STALE_SUBSCRIPTION_STATE'
//                     });
//                 }

//                 if (['past_due', 'unpaid', 'incomplete'].includes(liveStripeSub.status)) {
//                     try {
//                         await stripe.subscriptions.cancel(liveStripeSub.id, {
//                             invoice_now: false,
//                             prorate: false
//                         });
//                         logger.info(`Canceled stale ${liveStripeSub.status} subscription ${liveStripeSub.id} before restart`);
//                     } catch (cancelErr) {
//                         logger.warn(`Could not cancel stale subscription ${liveStripeSub.id}: ${cancelErr.message}`);
//                     }

//                     await executeQuery(
//                         `UPDATE subscriptions
//                          SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
//                          WHERE stripe_subscription_id = $1`,
//                         [liveStripeSub.id]
//                     );
//                 }
//             }

//             const metadata = {
//                 userId: String(userId),
//                 hospitalId: String(hospital_id || ''),
//                 subscriptionPlanId: String(plan.subscriptionPlanId),
//                 action: 'reactivate'
//             };

//             const session = await stripe.checkout.sessions.create(
//                 {
//                     mode: 'subscription',
//                     payment_method_types: ['card'],
//                     customer_email: userEmail,
//                     line_items: [{ price: plan.stripePriceId, quantity: 1 }],
//                     metadata,
//                     subscription_data: { metadata },
//                     success_url: `${process.env.PAYMENT_URL || 'http://localhost:3000'}/dashboard?subscription=reactivated`,
//                     cancel_url: `${process.env.PAYMENT_URL || 'http://localhost:3000'}/dashboard?subscription=cancelled`
//                 },
//                 {
//                     idempotencyKey: `checkout-restart-${userId}-${subscription_plans_id}-${Date.now()}`
//                 }
//             );

//             return res.json({
//                 success: true,
//                 checkoutUrl: session.url,
//                 message: 'Redirect to Stripe to create a new subscription because the previous subscription cannot be resumed.'
//             });
//         }

//         // ================================================================
//         // CASE 3: ACTIVE SUBSCRIPTION — EARLY RENEWAL
//         // FIX: 5-day window (was 1 day / message said 31) + payment method
//         // lookup checks the subscription before the customer.
//         // ================================================================
//         const now = new Date();
//         const periodEnd = new Date(current_period_end);
//         const daysUntilExpiry = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));

//         const RENEWAL_WINDOW_DAYS = 5;

//         if (daysUntilExpiry > RENEWAL_WINDOW_DAYS) {
//             return res.status(400).json({
//                 success: false,
//                 error: `Your subscription is active until ${periodEnd.toLocaleDateString()}. You can renew within ${RENEWAL_WINDOW_DAYS} days of expiry.`,
//                 code: 'TOO_EARLY'
//             });
//         }

//         const lockKey = `renew:${userId}`;
//         const lockResult = await executeQuery(`SELECT pg_try_advisory_lock(hashtext($1)) AS locked`, [lockKey]);

//         if (!lockResult.rows[0].locked) {
//             return res.status(409).json({ success: false, error: 'Renewal already in progress', code: 'RENEWAL_IN_PROGRESS' });
//         }

//         try {
//             const stripeSub = await stripe.subscriptions.retrieve(stripe_subscription_id);

//             if (!['active', 'trialing'].includes(stripeSub.status)) {
//                 return res.status(409).json({
//                     success: false,
//                     error: 'Subscription state changed. Please refresh and try again.',
//                     code: 'STATE_MISMATCH'
//                 });
//             }

//             const customer = await stripe.customers.retrieve(stripeSub.customer);

//             const defaultPaymentMethod =
//                 stripeSub.default_payment_method
//                 || customer.invoice_settings?.default_payment_method
//                 || customer.default_source;

//             if (!defaultPaymentMethod) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'No default payment method. Please add one in Customer Portal.',
//                     code: 'MISSING_PAYMENT_METHOD'
//                 });
//             }

//             const plan = await subscriptionPlanService.getPlanById(subscription_plans_id);

//             if (!plan) {
//                 return res.status(400).json({ success: false, error: 'Plan not found' });
//             }

//             const idempotencyKey = `renew-${userId}-${stripe_subscription_id}-${crypto.randomUUID()}`;

//             const stripePrice = await stripe.prices.retrieve(plan.stripePriceId);

//             await stripe.invoiceItems.create(
//                 {
//                     customer: stripeSub.customer,
//                     subscription: stripe_subscription_id,
//                     amount: stripePrice.unit_amount,
//                     currency: stripePrice.currency,
//                     description: `Early renewal – ${plan.subscriptionDetails || plan.interval}`
//                 },
//                 { idempotencyKey: `${idempotencyKey}-item` }
//             );

//             const invoice = await stripe.invoices.create(
//                 {
//                     customer: stripeSub.customer,
//                     subscription: stripe_subscription_id,
//                     auto_advance: true,
//                     default_payment_method: defaultPaymentMethod
//                 },
//                 { idempotencyKey: `${idempotencyKey}-invoice` }
//             );

//             const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
//             const paid = await stripe.invoices.pay(finalized.id, { payment_method: defaultPaymentMethod });

//             if (paid.status !== 'paid') {
//                 logger.error(`Renewal invoice ${paid.id} not paid, status=${paid.status}`);
//                 return res.status(402).json({
//                     success: false,
//                     error: 'Payment could not be completed. Please check your payment method.',
//                     code: 'PAYMENT_FAILED'
//                 });
//             }

//             function getIntervalMs(interval) {
//                 const days = parseInt(interval, 10) || 30;
//                 return days * 24 * 60 * 60 * 1000;
//             }

//             const currentPeriodEndDate = new Date(current_period_end);
//             const newPeriodEndDate = new Date(currentPeriodEndDate.getTime() + getIntervalMs(plan.interval));
//             const newPeriodEndUnix = Math.floor(newPeriodEndDate.getTime() / 1000);
//             const newPeriodStartUnix = Math.floor(currentPeriodEndDate.getTime() / 1000);

//                     // ================================================================
//             // STACKING VIA pause_collection (not trial_end):
//             //
//             // trial_end previously caused a fake "Free trial" label, risk of
//             // Stripe auto-canceling at trial end, and a stray proration
//             // credit — confirmed happening in production, so it's avoided.
//             //
//             // pause_collection keeps status = 'active' the entire time.
//             // If Stripe's original billing cycle boundary is reached before
//             // resumes_at, behavior: 'void' voids that invoice automatically
//             // instead of charging — since the customer already paid via the
//             // manual invoice created above. Billing resumes normally once
//             // resumes_at (newPeriodEndUnix) is reached.
//             // ================================================================

//             const updatedSub =
//                 await stripe.subscriptions.update(
//                     stripe_subscription_id,
//                     {
//                         pause_collection: {
//                             behavior: 'void',
//                             resumes_at: newPeriodEndUnix
//                         },
//                         proration_behavior:
//                             'none'
//                     },
//                     {
//                         idempotencyKey:
//                             `${idempotencyKey}-extend`
//                     }
//                 );

//             // NOTE: with pause_collection, Stripe's own current_period_end
//             // may not immediately reflect newPeriodEndUnix in this response,
//             // since the underlying period continues advancing naturally
//             // underneath the pause. Trust your own calculated value here
//             // rather than relying solely on Stripe's returned field.
//             const finalPeriodEnd = newPeriodEndUnix;
//             const finalPeriodStart = newPeriodStartUnix;

//             const updated = await PaymentService.markSubscriptionRenewed(
//                 stripe_subscription_id,
//                 finalPeriodStart,
//                 finalPeriodEnd,
//                 paid.hosted_invoice_url,
//                 paid.amount_paid,
//                 updatedSub.status
//             );

//             return res.json({
//                 success: true,
//                 message: 'Subscription renewed successfully.',
//                 invoiceId: paid.id,
//                 currentPeriodStart: updated?.current_period_start || null,
//                 currentPeriodEnd: updated?.current_period_end || null,
//                 status: updated?.status || null,
//                 hospital_id: hospital_id,
//                 user_id: userId,
//                 subscription_plans_id: subscription_plans_id
//             });

//         } finally {
//             await executeQuery(`SELECT pg_advisory_unlock(hashtext($1))`, [lockKey]);
//         }

//     } catch (error) {
//         logger.error('Renewal error:', error);
//         return res.status(500).json({ success: false, error: 'Failed to process renewal request' });
//     }
// };

// ============================================================================
// This is the renewSubscription EXPORTED FUNCTION ONLY.
//
// Drop this in to REPLACE your existing exports.renewSubscription in
// whichever controller file it currently lives in (the one that also
// requires stripe, PaymentService, executeQuery, logger, UserService,
// subscriptionPlanService, and crypto — keep those requires as they are,
// this file assumes they already exist above it).
// ============================================================================

exports.renewSubscription = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const sub = await UserService.getSubscriptionByUserId(userId);

        if (!sub) {
            return res.status(404).json({ success: false, error: 'No subscription found' });
        }

        const {
            stripe_subscription_id,
            status,
            subscription_plans_id,
            hospital_id,
            current_period_end
        } = sub;

        // ================================================================
        // LOAD LIVE STRIPE SUBSCRIPTION
        // apiVersion matches the preview version used everywhere else this
        // subscription is touched (pause/resume/webhook).
        // ================================================================
        let liveStripeSub = null;

        if (stripe_subscription_id) {
            try {
                liveStripeSub = await stripe.subscriptions.retrieve(
                    stripe_subscription_id,
                    { expand: ['latest_invoice'] },
                    {
                        apiVersion:
                            process.env.STRIPE_PAUSE_API_VERSION ||
                            '2026-07-29.preview'
                    }
                );

                logger.info(`Live Stripe subscription ${stripe_subscription_id} status=${liveStripeSub.status}`);

            } catch (stripeRetrieveError) {
                if (
                    stripeRetrieveError?.code === 'resource_missing' ||
                    stripeRetrieveError?.statusCode === 404
                ) {
                    logger.warn(`Stripe subscription ${stripe_subscription_id} not found`);
                    liveStripeSub = null;
                } else {
                    throw stripeRetrieveError;
                }
            }
        }

        const effectiveStatus = liveStripeSub?.status || status;

        // ================================================================
        // CASE 1: PAUSED SUBSCRIPTION — resume same subscription
        // (unchanged — correct as-is)
        // ================================================================
        if (liveStripeSub && liveStripeSub.status === 'paused') {

            if (liveStripeSub.collection_method !== 'charge_automatically') {
                return res.status(400).json({
                    success: false,
                    error: 'This paused subscription cannot be resumed because collection_method is not charge_automatically.',
                    code: 'UNSUPPORTED_COLLECTION_METHOD'
                });
            }

            const serverNowUnix = Math.floor(Date.now() / 1000);

            const stripePausedAt =
                liveStripeSub.status_details?.paused?.transitioned_at
                ?? liveStripeSub.items?.data?.[0]?.current_period_end
                ?? null;

            if (liveStripeSub.test_clock) {
                logger.error(`Cannot renew ${stripe_subscription_id} using real server time because it is attached to Stripe Test Clock ${liveStripeSub.test_clock}`);
                return res.status(409).json({
                    success: false,
                    error: 'This Stripe test subscription is attached to a Test Clock. Stripe billing_cycle_anchor=now will use the Test Clock time instead of the real current server date.',
                    code: 'STRIPE_TEST_CLOCK_ACTIVE',
                    testClock: liveStripeSub.test_clock,
                    serverCurrentTime: new Date(serverNowUnix * 1000).toISOString(),
                    stripePausedAt: stripePausedAt ? new Date(stripePausedAt * 1000).toISOString() : null
                });
            }

            const CLOCK_TOLERANCE_SECONDS = 5 * 60;

            if (stripePausedAt && stripePausedAt > serverNowUnix + CLOCK_TOLERANCE_SECONDS) {
                logger.error(`Stripe clock mismatch for ${stripe_subscription_id}. Server=${new Date(serverNowUnix * 1000).toISOString()}, Stripe=${new Date(stripePausedAt * 1000).toISOString()}`);
                return res.status(409).json({
                    success: false,
                    error: 'Stripe subscription time is ahead of the current server time. Renewal has been stopped to prevent incorrect billing dates.',
                    code: 'STRIPE_CLOCK_MISMATCH',
                    serverCurrentTime: new Date(serverNowUnix * 1000).toISOString(),
                    stripePausedAt: new Date(stripePausedAt * 1000).toISOString()
                });
            }

            const resumeLockKey = `resume:${userId}:${stripe_subscription_id}`;
            const resumeLockResult = await executeQuery(
                `SELECT pg_try_advisory_lock(hashtext($1)) AS locked`,
                [resumeLockKey]
            );

            if (!resumeLockResult.rows[0].locked) {
                return res.status(409).json({
                    success: false,
                    error: 'Subscription renewal is already in progress.',
                    code: 'RENEWAL_IN_PROGRESS'
                });
            }

            try {
                logger.info(`Resuming SAME paused Stripe subscription ${stripe_subscription_id}`);

                const resumeIdempotencyKey = `resume-${userId}-${stripe_subscription_id}-${stripePausedAt || 'paused'}`;

                const resumedSub = await stripe.subscriptions.resume(
                    stripe_subscription_id,
                    {
                        payment_behavior: 'resume_on_payment_attempt',
                        billing_cycle_anchor: 'now',
                        proration_behavior: 'none',
                        expand: ['latest_invoice']
                    },
                    {
                        apiVersion: process.env.STRIPE_PAUSE_API_VERSION || '2026-07-29.preview',
                        idempotencyKey: resumeIdempotencyKey
                    }
                );

                let resumeInvoice = null;
                if (resumedSub.latest_invoice) {
                    resumeInvoice = typeof resumedSub.latest_invoice === 'string'
                        ? await stripe.invoices.retrieve(resumedSub.latest_invoice)
                        : resumedSub.latest_invoice;
                }

                const paymentUrl = resumeInvoice?.hosted_invoice_url || null;

                if (!paymentUrl && resumedSub.status === 'active') {
                    await PaymentService.syncSubscriptionFromStripe(resumedSub);
                }

                const stripeItem = resumedSub.items?.data?.[0] || null;
                const stripePeriodStart = resumedSub.current_period_start ?? stripeItem?.current_period_start ?? null;
                const stripePeriodEnd = resumedSub.current_period_end ?? stripeItem?.current_period_end ?? null;

                logger.info(`Resume initiated: ${stripe_subscription_id}, status=${resumedSub.status}, start=${stripePeriodStart}, end=${stripePeriodEnd}, invoice=${resumeInvoice?.id || 'none'}`);

                return res.json({
                    success: true,
                    message: paymentUrl
                        ? 'Subscription renewal started. Complete the Stripe payment to activate the existing subscription.'
                        : 'Subscription resumed successfully.',
                    subscriptionId: resumedSub.id,
                    previousSubscriptionId: stripe_subscription_id,
                    sameSubscription: resumedSub.id === stripe_subscription_id,
                    status: resumedSub.status,
                    requestedAt: serverNowUnix,
                    requestedAtIso: new Date(serverNowUnix * 1000).toISOString(),
                    currentPeriodStart: stripePeriodStart,
                    currentPeriodStartIso: stripePeriodStart ? new Date(stripePeriodStart * 1000).toISOString() : null,
                    currentPeriodEnd: stripePeriodEnd,
                    currentPeriodEndIso: stripePeriodEnd ? new Date(stripePeriodEnd * 1000).toISOString() : null,
                    billingCycleAnchor: resumedSub.billing_cycle_anchor || null,
                    billingCycleAnchorIso: resumedSub.billing_cycle_anchor ? new Date(resumedSub.billing_cycle_anchor * 1000).toISOString() : null,
                    invoiceId: resumeInvoice?.id || null,
                    invoiceStatus: resumeInvoice?.status || null,
                    amountDue: resumeInvoice?.amount_due ?? 0,
                    amountPaid: resumeInvoice?.amount_paid ?? 0,
                    currency: resumeInvoice?.currency || null,
                    paymentRequired: Boolean(paymentUrl),
                    checkoutUrl: paymentUrl,
                    hostedInvoiceUrl: paymentUrl,
                    returnUrl: `${process.env.PAYMENT_URL || 'http://localhost:3000'}/dashboard?subscription=renewed`,
                    hospital_id: hospital_id,
                    user_id: userId,
                    subscription_plans_id: subscription_plans_id
                });

            } finally {
                await executeQuery(`SELECT pg_advisory_unlock(hashtext($1))`, [resumeLockKey]);
            }
        }

        // ================================================================
        // CASE 2: PAST_DUE / UNPAID / INCOMPLETE / CANCELED / TERMINAL / MISSING
        // Only active/trialing blocks; past_due/unpaid/incomplete get
        // canceled then fall through to a fresh Checkout Session.
        // (unchanged — this is your confirmed intentional behavior)
        // ================================================================
        if (!['active', 'trialing'].includes(effectiveStatus)) {

            const plan = await subscriptionPlanService.getActivePlanById(subscription_plans_id);

            if (!plan) {
                return res.status(400).json({ success: false, error: 'Plan not found or no longer active' });
            }

            const userEmail = req.user?.email || (await UserService.getUserById(userId))?.email;

            if (!userEmail) {
                return res.status(400).json({ success: false, error: 'User email not found' });
            }

            if (liveStripeSub) {
                if (['active', 'trialing'].includes(liveStripeSub.status)) {
                    return res.status(409).json({
                        success: false,
                        error: `Existing Stripe subscription is ${liveStripeSub.status}. A new subscription will not be created.`,
                        code: 'STALE_SUBSCRIPTION_STATE'
                    });
                }

                if (['past_due', 'unpaid', 'incomplete'].includes(liveStripeSub.status)) {
                    try {
                        await stripe.subscriptions.cancel(liveStripeSub.id, {
                            invoice_now: false,
                            prorate: false
                        });
                        logger.info(`Canceled stale ${liveStripeSub.status} subscription ${liveStripeSub.id} before restart`);
                    } catch (cancelErr) {
                        logger.warn(`Could not cancel stale subscription ${liveStripeSub.id}: ${cancelErr.message}`);
                    }

                    await executeQuery(
                        `UPDATE subscriptions
                         SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
                         WHERE stripe_subscription_id = $1`,
                        [liveStripeSub.id]
                    );
                }
            }

            const metadata = {
                userId: String(userId),
                hospitalId: String(hospital_id || ''),
                subscriptionPlanId: String(plan.subscriptionPlanId),
                action: 'reactivate'
            };

            const session = await stripe.checkout.sessions.create(
                {
                    mode: 'subscription',
                    payment_method_types: ['card'],
                    customer_email: userEmail,
                    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
                    metadata,
                    subscription_data: { metadata },
                    success_url: `${process.env.PAYMENT_URL || 'http://localhost:3000'}/dashboard?subscription=reactivated`,
                    cancel_url: `${process.env.PAYMENT_URL || 'http://localhost:3000'}/dashboard?subscription=cancelled`
                },
                {
                    idempotencyKey: `checkout-restart-${userId}-${subscription_plans_id}-${Date.now()}`
                }
            );

            return res.json({
                success: true,
                checkoutUrl: session.url,
                message: 'Redirect to Stripe to create a new subscription because the previous subscription cannot be resumed.'
            });
        }

        // ================================================================
        // CASE 3: ACTIVE SUBSCRIPTION — EARLY RENEWAL
        //
        // 5-day renewal window (message and logic now match).
        // Payment method lookup checks the subscription's own
        // default_payment_method before the customer-level default.
        //
        // NEW: if no payment method exists anywhere, instead of dead-ending
        // with a "Customer Portal" message (no such portal exists in this
        // app), create a Checkout Session in mode: 'setup' so the customer
        // can add a card without creating a new subscription. The webhook's
        // checkout.session.completed (mode: 'setup') branch picks up from
        // there and completes the renewal automatically via
        // PaymentService.chargeAndStackRenewal.
        // ================================================================
        const now = new Date();
        const periodEnd = new Date(current_period_end);
        const daysUntilExpiry = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));

        const RENEWAL_WINDOW_DAYS = 5;

        if (daysUntilExpiry > RENEWAL_WINDOW_DAYS) {
            return res.status(400).json({
                success: false,
                error: `Your subscription is active until ${periodEnd.toLocaleDateString()}. You can renew within ${RENEWAL_WINDOW_DAYS} days of expiry.`,
                code: 'TOO_EARLY'
            });
        }

        const lockKey = `renew:${userId}`;
        const lockResult = await executeQuery(`SELECT pg_try_advisory_lock(hashtext($1)) AS locked`, [lockKey]);

        if (!lockResult.rows[0].locked) {
            return res.status(409).json({ success: false, error: 'Renewal already in progress', code: 'RENEWAL_IN_PROGRESS' });
        }

        try {
            const stripeSub = await stripe.subscriptions.retrieve(stripe_subscription_id);

            if (!['active', 'trialing'].includes(stripeSub.status)) {
                return res.status(409).json({
                    success: false,
                    error: 'Subscription state changed. Please refresh and try again.',
                    code: 'STATE_MISMATCH'
                });
            }

            const customer = await stripe.customers.retrieve(stripeSub.customer);

            const defaultPaymentMethod =
                stripeSub.default_payment_method
                || customer.invoice_settings?.default_payment_method
                || customer.default_source;

            // ============================================================
            // NO PAYMENT METHOD: create a setup-mode Checkout Session
            // instead of dead-ending. Same subscription — no new sub_xxx
            // is created here.
            // ============================================================
            if (!defaultPaymentMethod) {

                const setupSession = await stripe.checkout.sessions.create(
                    {
                        mode: 'setup',
                        customer: stripeSub.customer,
                        payment_method_types: ['card'],
                        metadata: {
                            purpose: 'renewal_card_setup',
                            stripeSubscriptionId: stripe_subscription_id,
                            subscriptionPlanId: String(subscription_plans_id),
                            userId: String(userId)
                        },
                        success_url: `${process.env.PAYMENT_URL || 'http://localhost:3000'}/dashboard?cardAdded=success`,
                        cancel_url: `${process.env.PAYMENT_URL || 'http://localhost:3000'}/dashboard?cardAdded=cancelled`
                    },
                    {
                        idempotencyKey: `setup-renew-${userId}-${stripe_subscription_id}-${Date.now()}`
                    }
                );

                return res.json({
                    success: true,
                    paymentRequired: true,
                    cardSetupRequired: true,
                    message: 'No payment method on file. Please add a card to complete renewal.',
                    setupUrl: setupSession.url,
                    checkoutUrl: setupSession.url
                });
            }

            const plan = await subscriptionPlanService.getPlanById(subscription_plans_id);

            if (!plan) {
                return res.status(400).json({ success: false, error: 'Plan not found' });
            }

            const idempotencyKey = `renew-${userId}-${stripe_subscription_id}-${crypto.randomUUID()}`;

            const stripePrice = await stripe.prices.retrieve(plan.stripePriceId);

            await stripe.invoiceItems.create(
                {
                    customer: stripeSub.customer,
                    subscription: stripe_subscription_id,
                    amount: stripePrice.unit_amount,
                    currency: stripePrice.currency,
                    description: `Early renewal – ${plan.subscriptionDetails || plan.interval}`
                },
                { idempotencyKey: `${idempotencyKey}-item` }
            );

            const invoice = await stripe.invoices.create(
                {
                    customer: stripeSub.customer,
                    subscription: stripe_subscription_id,
                    auto_advance: true,
                    default_payment_method: defaultPaymentMethod
                },
                { idempotencyKey: `${idempotencyKey}-invoice` }
            );

            const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
            const paid = await stripe.invoices.pay(finalized.id, { payment_method: defaultPaymentMethod });

            if (paid.status !== 'paid') {
                logger.error(`Renewal invoice ${paid.id} not paid, status=${paid.status}`);
                return res.status(402).json({
                    success: false,
                    error: 'Payment could not be completed. Please check your payment method.',
                    code: 'PAYMENT_FAILED'
                });
            }

            function getIntervalMs(interval) {
                const days = parseInt(interval, 10) || 30;
                return days * 24 * 60 * 60 * 1000;
            }

            const currentPeriodEndDate = new Date(current_period_end);
            const newPeriodEndDate = new Date(currentPeriodEndDate.getTime() + getIntervalMs(plan.interval));
            const newPeriodEndUnix = Math.floor(newPeriodEndDate.getTime() / 1000);
            const newPeriodStartUnix = Math.floor(currentPeriodEndDate.getTime() / 1000);

            // ============================================================
            // STACKING VIA pause_collection (not trial_end):
            //
            // trial_end previously caused a fake "Free trial" label, risk of
            // Stripe auto-canceling at trial end, and a stray proration
            // credit — confirmed happening in production, so it's avoided.
            //
            // pause_collection keeps status = 'active' the entire time.
            // If Stripe's original billing cycle boundary is reached before
            // resumes_at, behavior: 'void' voids that invoice automatically
            // instead of charging — since the customer already paid via the
            // manual invoice created above. Billing resumes normally once
            // resumes_at (newPeriodEndUnix) is reached.
            // ============================================================
            const updatedSub = await stripe.subscriptions.update(
                stripe_subscription_id,
                {
                    pause_collection: {
                        behavior: 'void',
                        resumes_at: newPeriodEndUnix
                    },
                    proration_behavior: 'none'
                },
                { idempotencyKey: `${idempotencyKey}-extend` }
            );

            // NOTE: with pause_collection, Stripe's own current_period_end
            // may not immediately reflect newPeriodEndUnix in this response,
            // since the underlying period continues advancing naturally
            // underneath the pause. Trust the calculated values here rather
            // than relying solely on Stripe's returned field.
            const finalPeriodEnd = newPeriodEndUnix;
            const finalPeriodStart = newPeriodStartUnix;

            const updated = await PaymentService.markSubscriptionRenewed(
                stripe_subscription_id,
                finalPeriodStart,
                finalPeriodEnd,
                paid.hosted_invoice_url,
                paid.amount_paid,
                updatedSub.status
            );

            return res.json({
                success: true,
                message: 'Subscription renewed successfully.',
                invoiceId: paid.id,
                currentPeriodStart: updated?.current_period_start || null,
                currentPeriodEnd: updated?.current_period_end || null,
                status: updated?.status || null,
                hospital_id: hospital_id,
                user_id: userId,
                subscription_plans_id: subscription_plans_id
            });

        } finally {
            await executeQuery(`SELECT pg_advisory_unlock(hashtext($1))`, [lockKey]);
        }

    } catch (error) {
        logger.error('Renewal error:', error);
        return res.status(500).json({ success: false, error: 'Failed to process renewal request' });
    }
};



exports.register = async (req, res) => {
    try {
        const {
            name,
            email,
            username,
            password,
            mobile_number,
            role = 'admin',
            demo_request_id,
            source = 'demo_feedback_payment'
        } = req.body;

        // ─── Input validation ──────────────────────────────────────────────
        if (!name)           return res.status(400).json({ success: false, error: 'Name is required' });
        if (!email)          return res.status(400).json({ success: false, error: 'Email is required' });
        if (!username)       return res.status(400).json({ success: false, error: 'Username is required' });
        if (!password)       return res.status(400).json({ success: false, error: 'Password is required' });
        if (!mobile_number)  return res.status(400).json({ success: false, error: 'Mobile number is required' });
        if (!demo_request_id) return res.status(400).json({ success: false, error: 'Booking reference is required' });

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }

        const phonePattern = /^[0-9+\-\s()]{7,20}$/;
        if (!phonePattern.test(mobile_number)) {
            return res.status(400).json({ success: false, error: 'Invalid phone number' });
        }

        const allowedRoles = ['admin', 'viewer', 'user'];
        if (role && !allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role. Allowed roles are admin, viewer, and user'
            });
        }

        // ─── Check booking exists ──────────────────────────────────────────
        const booking = await BookDemoService.getBookingById(demo_request_id);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        // ─── Prevent duplicate registration ────────────────────────────────
        const existingUser = await BookDemoService.getUserByDemoRequestId(demo_request_id);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                code: 'ALREADY_REGISTERED',
                error: 'This booking has already been registered'
            });
        }

        // ─── Fetch subscription & plan details from the database ──────────
        const subQuery = `
            SELECT 
                s.status AS subscription_status,
                sp.subscription_plan_id,
                sp.subscription_details,
                sp.price,
                sp.interval
            FROM subscriptions s
            JOIN subscription_plans sp ON s.subscription_plans_id = sp.subscription_plan_id
            WHERE s.booking_id = $1
            ORDER BY s.created_at DESC
            LIMIT 1
        `;
        const subResult = await executeQuery(subQuery, [demo_request_id]);

        if (subResult.rows.length === 0) {
            logger.error(`Registration blocked: no subscription found for booking #${demo_request_id}`);
            return res.status(404).json({
                success: false,
                error: 'No active subscription found for this booking. Please contact support.'
            });
        }

        const sub = subResult.rows[0];
        const subscriptionStatus = sub.subscription_status;

        // Determine if the subscription is considered "paid" (active, trialing, or past_due)
        const paidStatuses = ['active', 'trialing', 'past_due'];
        if (!paidStatuses.includes(subscriptionStatus)) {
            logger.warn(`Registration blocked: booking #${demo_request_id} has subscription status '${subscriptionStatus}' (not paid)`);
            return res.status(402).json({
                success: false,
                error: 'Payment has not been completed or subscription is not active.'
            });
        }

        // ─── Map interval to legacy plan_id (for compatibility) ───────────
        const intervalToPlanId = {
            '30 days': 'monthly',
            '90 days': 'quarterly',
            '365 days': 'yearly'
        };
        const planId = intervalToPlanId[sub.interval] || 'monthly';

        // ─── Build plan info for the user ──────────────────────────────────
        const planInfo = {
            plan_id: planId,
            plan_name: sub.subscription_details || 'Monthly',
            plan_price: sub.price,
            plan_currency: '$',
            plan_interval: sub.interval,  // can be '30 days', '90 days', '365 days'
        };

        // ─── Create user ────────────────────────────────────────────────────
        const user = await UserService.createUser({
            name,
            email,
            username,
            password,
            mobile_number: mobile_number.trim(),
            role: role || 'admin',
            demo_request_id,
            registration_status: 'pending',
            is_active: false,
            source,
            ...planInfo  // spread plan fields
        });

        res.json({
            success: true,
            data: user,
            message: 'Registration submitted successfully. Awaiting Super Admin approval.'
        });

    } catch (error) {
        logger.error('Error in register:', error);

        if (error.message === 'Email already exists') {
            return res.status(400).json({ success: false, error: 'Email already exists. Please use a different email.' });
        }
        if (error.message === 'Username already exists') {
            return res.status(400).json({ success: false, error: 'Username already exists. Please choose a different username.' });
        }
        if (error.code === '23505' && error.constraint === 'users_demo_request_id_key') {
            return res.status(409).json({
                success: false,
                code: 'ALREADY_REGISTERED',
                error: 'This booking has already been registered'
            });
        }

        res.status(500).json({ success: false, error: error.message || 'Failed to register user' });
    }
};


exports.getMySubscription = async (req, res) => {
    try {
        // ✅ verifyToken sets req.userId or req.user.id – adjust as needed
        const userId = req.userId || (req.user && req.user.id);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const subscription = await UserService.getSubscriptionByUserId(userId);
        if (!subscription) {
            return res.status(404).json({ success: false, error: 'No active subscription found' });
        }

        res.json({ success: true, data: subscription });
    } catch (error) {
        logger.error('Error fetching subscription:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch subscription details' });
    }
};

/**
 * Forgot password – send reset link
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format.' });
        }

        // 1. Check if user exists
        const userResult = await executeQuery(
            `SELECT id, email FROM users WHERE email = $1`,
            [email]
        );

        // 🔐 SECURITY: If user doesn't exist, we still send a success response to prevent email scraping.
        if (userResult.rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists, a reset link has been sent.'
            });
        }

        const user = userResult.rows[0];

        // 2. Generate a secure random token and expiry (1 hour from now)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

        // 3. Store token in database
        await executeQuery(
            `UPDATE users
             SET reset_password_token = $1, reset_password_expiry = $2
             WHERE id = $3`,
            [resetToken, expiryTime, user.id]
        );

        // 4. Construct the reset link (Frontend URL)
        const forgotpasswordurl = process.env.FORGOT_PASSWORD_URL || 'http://localhost:3000';
        const resetLink = `${forgotpasswordurl}/reset-password/${resetToken}`;

        const subject = 'VetDesk.ai - Password Reset Request';
        const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; color: #1e293b;">

    <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 24px 0;">Password Reset Request</h1>

    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>

    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        We received a request to reset the password for the VetDesk.ai account associated with
        <strong>${email}</strong>.
    </p>

    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
        Click the button below to create a new password. This link is valid for <strong>1 hour</strong>.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
        <tr>
            <td style="border-radius: 6px; background-color: #2563eb;">
                <a href="${resetLink}"
                   style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                    Reset Password
                </a>
            </td>
        </tr>
    </table>

    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 8px 0;">
        Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #2563eb; word-break: break-all; margin: 0 0 32px 0;">
        ${resetLink}
    </p>

    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 32px 0;">
        If you didn't request this, you can safely ignore this email — your password will remain unchanged.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px 0;">

    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        This is an automated message from VetDesk.ai. Please do not reply directly to this email.
    </p>

</div>
`;

        // 6. Send Email using your existing GmailService (Wait for it to finish)
        await EmailService.sendEmailViaGmailAPI({
            to: email,
            subject: subject,
            html: htmlContent
        });

        return res.status(200).json({
            success: true,
            message: 'If an account exists, a reset link has been sent.'
        });

    } catch (error) {
        logger.error('Forgot password error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while processing your request.'
        });
    }
};

/**
 * Reset password using token
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token, new password, and confirm password are required.'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match.'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long.'
            });
        }

        // 1. Validate Token directly in Controller
        const userResult = await executeQuery(
            `SELECT id, email FROM users
             WHERE reset_password_token = $1
             AND reset_password_expiry > NOW()`,
            [token]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token.'
            });
        }

        const user = userResult.rows[0];

        // 2. Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // 3. Update password and clear the token fields
        await executeQuery(
            `UPDATE users
             SET password_hash = $1, reset_password_token = NULL, reset_password_expiry = NULL
             WHERE id = $2`,
            [hashedPassword, user.id]
        );

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });

    } catch (error) {
        logger.error('Reset password error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while resetting your password.'
        });
    }
};

/**
 * Get active hospitals for registration dropdown
 * GET /api/auth/hospitals
 */
exports.getRegistrationHospitals = async (req, res) => {
    try {
        const hospitals = await UserService.getRegistrationHospitals();

        return res.status(200).json({
            success: true,
            message: 'Hospitals fetched successfully.',
            count: hospitals.length,
            data: hospitals
        });

    } catch (error) {
        logger.error('Error fetching hospitals:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch hospitals.'
        });
    }
};

/**
 * Get current user profile (protected)
 * GET /api/auth/profile
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await UserService.getUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        logger.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
};

/**
 * Update user profile (protected)
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const updates = req.body;

        const updatedUser = await UserService.updateUser(userId, updates);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: updatedUser,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        logger.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};

/**
 * Change password (protected)
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
    try {
        const userId = req.userId;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Old password and new password are required'
            });
        }

        await UserService.changePassword(userId, oldPassword, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to change password'
        });
    }
};

// exports.renewSubscription = async (req, res) => {
//     try {
//         const userId = req.userId || req.user.id;
//         if (!userId) {
//             return res.status(401).json({ success: false, error: 'Unauthorized' });
//         }

//         // Get user's current subscription
//         const sub = await UserService.getSubscriptionByUserId(userId);
//         if (!sub) {
//             return res.status(404).json({ success: false, error: 'No subscription found for this user' });
//         }

//         const { stripe_subscription_id, status, subscription_plans_id, hospital_id } = sub;

//         // ── Case 1: Active / Trialing → renew via invoice ──────────────
//         if (['active', 'trialing'].includes(status)) {
//             // Retrieve Stripe subscription
//             const stripeSub = await stripe.subscriptions.retrieve(stripe_subscription_id);
//             // Create an invoice for the upcoming period and pay it immediately
//             const invoice = await stripe.invoices.create({
//                 customer: stripeSub.customer,
//                 subscription: stripe_subscription_id,
//                 auto_advance: true,
//             });
//             const paidInvoice = await stripe.invoices.pay(invoice.id);

//             return res.json({
//                 success: true,
//                 message: 'Subscription renewed successfully',
//                 data: { invoice_id: paidInvoice.id }
//             });
//         }

//         // ── Case 2: Expired / Canceled / Unpaid → redirect to Checkout ──
//         const plan = await SubscriptionPlanService.getPlanById(subscription_plans_id);
//         if (!plan) {
//             return res.status(400).json({ success: false, error: 'Plan not found' });
//         }

//         // Get user email (from req.user or DB)
//         const userEmail = req.user?.email || (await UserService.getUserById(userId))?.email;
//         if (!userEmail) {
//             return res.status(400).json({ success: false, error: 'User email not found' });
//         }

//         // Create a Checkout Session for a new subscription
//         const session = await stripe.checkout.sessions.create({
//             mode: 'subscription',
//             payment_method_types: ['card'],
//             customer_email: userEmail,
//             line_items: [{ price: plan.stripePriceId, quantity: 1 }],
//             metadata: {
//                 userId: String(userId),
//                 hospitalId: String(hospital_id || ''),
//                 action: 'reactivate'
//             },
//             subscription_data: {
//                 metadata: {
//                     userId: String(userId),
//                     hospitalId: String(hospital_id || ''),
//                 }
//             },
//             success_url: `${process.env.DASHBOARD_URL }/dashboard?subscription=reactivated`,
//             cancel_url: `${process.env.DASHBOARD_URL }/dashboard?subscription=cancelled`,
//         });

//         return res.json({
//             success: true,
//             checkoutUrl: session.url,
//             message: 'Redirect to Stripe to restart your subscription'
//         });

//     } catch (error) {
//         logger.error('Renewal error:', error);
//         res.status(500).json({ success: false, error: 'Failed to process renewal request' });
//     }
// };



// controllers/authController.js


// exports.renewSubscription = async (req, res) => {
//     try {
//         const userId = req.userId || req.user.id;
//         if (!userId) {
//             return res.status(401).json({ success: false, error: 'Unauthorized' });
//         }

//         const sub = await UserService.getSubscriptionByUserId(userId);
//         if (!sub) {
//             return res.status(404).json({ success: false, error: 'No subscription found for this user' });
//         }

//         const { stripe_subscription_id, status, subscription_plans_id, hospital_id } = sub;

//         // ── Case 1: Active / Trialing ──────────────────────────────────
//         if (['active', 'trialing'].includes(status)) {
//             // Retrieve the Stripe subscription to get the customer ID
//             const stripeSub = await stripe.subscriptions.retrieve(stripe_subscription_id);

//             // Check if customer has a default payment method
//             const customer = await stripe.customers.retrieve(stripeSub.customer);
//             const defaultPaymentMethod = customer.default_source || customer.invoice_settings.default_payment_method;
//             if (!defaultPaymentMethod) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'No default payment method. Please add one in Customer Portal.',
//                     code: 'MISSING_PAYMENT_METHOD'
//                 });
//             }

//             // ✅ Advance the subscription billing cycle to now
//             await stripe.subscriptions.update(stripe_subscription_id, {
//                 billing_cycle_anchor: 'now',
//                 proration_behavior: 'none',   // set to 'create_prorations' if you want prorated charges
//             });

//             // Stripe will now generate an invoice for the new period and charge the default payment method.
//             // The invoice.paid webhook will update the database.

//             return res.json({
//                 success: true,
//                 message: 'Subscription renewed successfully. The new period will start now.',
//             });
//         }

//         // ── Case 2: Expired / Canceled / Unpaid ──────────────────────
//         const plan = await SubscriptionPlanService.getPlanById(subscription_plans_id);
//         if (!plan) {
//             return res.status(400).json({ success: false, error: 'Plan not found' });
//         }

//         const userEmail = req.user?.email || (await UserService.getUserById(userId))?.email;
//         if (!userEmail) {
//             return res.status(400).json({ success: false, error: 'User email not found' });
//         }

//         const session = await stripe.checkout.sessions.create({
//             mode: 'subscription',
//             payment_method_types: ['card'],
//             customer_email: userEmail,
//             line_items: [{ price: plan.stripePriceId, quantity: 1 }],
//             metadata: {
//                 userId: String(userId),
//                 hospitalId: String(hospital_id || ''),
//                 action: 'reactivate'
//             },
//             subscription_data: {
//                 metadata: {
//                     userId: String(userId),
//                     hospitalId: String(hospital_id || ''),
//                 }
//             },
//             success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?subscription=reactivated`,
//             cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?subscription=cancelled`,
//         });

//         return res.json({
//             success: true,
//             checkoutUrl: session.url,
//             message: 'Redirect to Stripe to restart your subscription'
//         });

//     } catch (error) {
//         logger.error('Renewal error:', error);
//         res.status(500).json({ success: false, error: 'Failed to process renewal request' });
//     }
// };






/**
 * Get all users (admin only)
 * GET /api/auth/users
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await UserService.getAllUsers();

        res.json({
            success: true,
            data: users,
            count: users.length
        });

    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
};