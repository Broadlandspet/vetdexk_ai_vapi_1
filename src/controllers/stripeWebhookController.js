
const stripe = require('../services/stripeService');
const PaymentService = require('../services/paymentService');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');


exports.handleStripeWebhook = async (req, res) => {

    let event;

    try {

        const signature = req.headers['stripe-signature'];

        if (!signature) {
            console.error('❌ No Stripe signature header found');
            return res.status(400).send('Webhook Error: No signature');
        }

        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        console.log(`✅ Webhook verified: ${event.type} [${event.id}]`);

    } catch (err) {
        console.error('❌ Stripe webhook signature verification failed:', err.message);
        logger.error('❌ Stripe webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ─────────────────────────────────────────────────────────────
    // IDEMPOTENCY: Claim the event atomically, don't check-then-act
    // ─────────────────────────────────────────────────────────────
    let claimed = true;

    try {
        const claim = await executeQuery(
            `
            INSERT INTO stripe_webhook_events (id, type)
            VALUES ($1, $2)
            ON CONFLICT (id) DO NOTHING
            RETURNING id
            `,
            [event.id, event.type]
        );

        if (claim.rows.length === 0) {
            console.log(`↩️ Duplicate Stripe webhook ignored: ${event.id} (${event.type})`);
            return res.json({ received: true, duplicate: true });
        }

    } catch (err) {
        console.error('Idempotency claim failed:', err.message);
        claimed = false;
    }

    // ─────────────────────────────────────────────────────────────
    // PROCESS EVENT
    // ─────────────────────────────────────────────────────────────
    try {

        console.log(`🔄 Processing ${event.type}...`);

        switch (event.type) {

            // ============================================================
            // CHECKOUT COMPLETED
            //
            // Two distinct session modes land here:
            //
            //   mode: 'setup'        -> customer just added a card via the
            //                            MISSING_PAYMENT_METHOD fallback flow.
            //                            No subscription created here — we
            //                            attach the card and then run the
            //                            deferred renewal.
            //
            //   mode: 'subscription' -> existing new-signup flow, unchanged.
            // ============================================================
            case 'checkout.session.completed': {

                const session = event.data.object;

                // --------------------------------------------------------
                // SETUP-MODE SESSION: card added for a pending renewal
                // --------------------------------------------------------
                if (session.mode === 'setup') {

                    const setupIntentId = session.setup_intent;
                    const stripeSubscriptionId = session.metadata?.stripeSubscriptionId;
                    const subscriptionPlanId = session.metadata?.subscriptionPlanId;
                    const customerId = session.customer;

                    console.log(
                        `📊 [setup] stripeSubscriptionId=${stripeSubscriptionId}, ` +
                        `subscriptionPlanId=${subscriptionPlanId}, customerId=${customerId}`
                    );

                    if (!setupIntentId || !stripeSubscriptionId || !customerId) {
                        console.error('❌ setup session missing required fields', session.id);
                        logger.error(`setup session ${session.id} missing required fields`, {
                            setupIntentId, stripeSubscriptionId, customerId
                        });
                        return res.status(400).json({ received: true, error: 'Missing setup session fields' });
                    }

                    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
                    const paymentMethodId = setupIntent.payment_method;

                    if (!paymentMethodId) {
                        console.error('❌ No payment method attached from setup intent', setupIntent.id);
                        return res.status(400).json({ received: true, error: 'No payment method from setup' });
                    }

                    await stripe.customers.update(customerId, {
                        invoice_settings: { default_payment_method: paymentMethodId }
                    });

                    console.log(`✅ Default payment method set for customer ${customerId}: ${paymentMethodId}`);

                    try {
                        await PaymentService.chargeAndStackRenewal({
                            stripeSubscriptionId,
                            subscriptionPlanId,
                            defaultPaymentMethod: paymentMethodId,
                            customerId
                        });

                        console.log(`✅ Renewal completed after card setup for ${stripeSubscriptionId}`);

                    } catch (renewErr) {
                        console.error(`❌ Renewal after card setup failed: ${renewErr.message}`);
                        logger.error(`Renewal after card setup failed for ${stripeSubscriptionId}: ${renewErr.message}`);
                        // Do not fail the webhook response for this — the card
                        // was saved successfully even if the renewal charge
                        // failed; that failure surfaces via invoice.payment_failed
                        // or can be retried by the user through Renew Now again.
                    }

                    break;
                }

                // --------------------------------------------------------
                // EXISTING SUBSCRIPTION-MODE LOGIC — unchanged
                // --------------------------------------------------------
                const bookingId = session.metadata?.bookingId;
                const subscriptionPlanId = session.metadata?.subscriptionPlanId;
                const stripeSubscriptionId = session.subscription;
                const userId = session.metadata?.userId;
                const hospitalId = session.metadata?.hospitalId;
                const action = session.metadata?.action || null;  

                console.log(
                    `📊 Extracted: bookingId=${bookingId}, ` +
                    `subscriptionPlanId=${subscriptionPlanId}, ` +
                    `stripeSubscriptionId=${stripeSubscriptionId}, ` +
                    `userId=${userId}, hospitalId=${hospitalId}`
                );

                if (!bookingId && !userId) {
                    const msg = `checkout.session.completed ${event.id}: no bookingId or userId in metadata`;
                    console.error('❌', msg);
                    logger.error(msg, { sessionId: session.id, metadata: session.metadata });
                    return res.status(400).json({ received: true, error: 'No bookingId or userId' });
                }

                if (!stripeSubscriptionId) {
                    const msg = `checkout.session.completed ${event.id}: no subscription ID on session`;
                    console.error('❌', msg);
                    logger.error(msg, { sessionId: session.id });
                    return res.status(400).json({ received: true, error: 'No subscription ID' });
                }

                await PaymentService.markPaymentCompletedFromWebhook({
                    bookingId: bookingId ? parseInt(bookingId, 10) : null,
                    subscriptionPlanId: subscriptionPlanId ? parseInt(subscriptionPlanId, 10) : null,
                    stripeSubscriptionId,
                    userId: userId || null,
                    hospitalId: hospitalId ? parseInt(hospitalId, 10) : null
                    
                });

                console.log(`✅ Payment completed for booking ${bookingId} / user ${userId}`);

                break;
            }

            // ============================================================
            // SUBSCRIPTION STATE CHANGES
            //
            // created / updated / deleted / paused / resumed
            //
            // All use the SAME PaymentService sync function, which
            // internally routes paused subscriptions to
            // syncPausedSubscriptionFromStripe (preserves current_period_start).
            // ============================================================
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
            case 'customer.subscription.paused':
            case 'customer.subscription.resumed': {

                const subscription = event.data.object;

                console.log(`📦 ${event.type}: ${subscription.id}, Status: ${subscription.status}`);

                await PaymentService.syncSubscriptionFromStripe(subscription);

                console.log(`✅ Subscription synced: ${subscription.id}`);

                break;
            }

            // ============================================================
            // INVOICE PAID
            //
            // paused -> resume same subscription -> resumption invoice ->
            // customer pays -> invoice.paid -> retrieve SAME subscription ->
            // sync DB
            // ============================================================
            case 'invoice.paid': {

                const invoice = event.data.object;

                console.log(`📦 Invoice paid: ${invoice.id}, Subscription: ${invoice.subscription}`);

                if (invoice.subscription) {

                    const freshSub = await stripe.subscriptions.retrieve(
                        invoice.subscription,
                        {},
                        {
                            apiVersion: process.env.STRIPE_PAUSE_API_VERSION || '2026-07-29.preview'
                        }
                    );

                    await PaymentService.syncSubscriptionFromStripe(freshSub);

                    await PaymentService.recordInvoicePayment(
                        invoice.subscription,
                        invoice.hosted_invoice_url,
                        invoice.amount_paid
                    );

                    console.log(`✅ Invoice paid + subscription synced: ${invoice.subscription}`);
                }

                break;
            }

            // ============================================================
            // INVOICE PAYMENT FAILED
            //
            // Sync Stripe's latest status before marking payment failed —
            // especially important during paused subscription renewal/resume.
            // ============================================================
            case 'invoice.payment_failed': {

                const invoice = event.data.object;

                console.log(`📦 Invoice payment failed: ${invoice.id}, Subscription: ${invoice.subscription}`);

                if (invoice.subscription) {

                    try {
                        const freshSub = await stripe.subscriptions.retrieve(
                            invoice.subscription,
                            {},
                            {
                                apiVersion: process.env.STRIPE_PAUSE_API_VERSION || '2026-07-29.preview'
                            }
                        );

                        await PaymentService.syncSubscriptionFromStripe(freshSub);

                        console.log(`✅ Subscription state synced after failed payment: ${invoice.subscription}`);

                    } catch (syncError) {
                        console.error(`❌ Failed to sync subscription after payment failure: ${syncError.message}`);
                        logger.error(`Failed to sync subscription after payment failure: ${syncError.message}`);
                    }

                    await PaymentService.markPaymentFailedBySubscriptionId(invoice.subscription);

                    console.log(`✅ Payment failed for subscription: ${invoice.subscription}`);
                }

                break;
            }

            // ============================================================
            // CHECKOUT FAILED / EXPIRED
            // ============================================================
            case 'checkout.session.expired':
            case 'checkout.session.async_payment_failed': {

                const session = event.data.object;
                const bookingId = session.metadata?.bookingId;

                if (bookingId) {
                    await PaymentService.markPaymentFailed(parseInt(bookingId, 10));
                    console.log(`✅ Payment marked failed for booking ${bookingId}`);
                }

                break;
            }

            // ============================================================
            // EVERYTHING ELSE
            // ============================================================
            default: {
                console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
                break;
            }
        }

        console.log(`✅ Webhook processed successfully: ${event.type}`);

        return res.json({ received: true });

    } catch (err) {

        console.error('❌ Webhook handler error:', err);
        console.error('❌ Stack trace:', err.stack);
        logger.error('❌ Stripe webhook handler error:', err);

        // ============================================================
        // RELEASE IDEMPOTENCY CLAIM WHEN PROCESSING FAILED
        // Allows Stripe's retry to process this same event again.
        // ============================================================
        if (claimed) {
            try {
                await executeQuery(
                    `DELETE FROM stripe_webhook_events WHERE id = $1`,
                    [event.id]
                );
            } catch (cleanupErr) {
                console.error('Failed to release idempotency claim:', cleanupErr.message);
            }
        }

        return res.status(500).send(`Webhook handler error: ${err.message}`);
    }
};