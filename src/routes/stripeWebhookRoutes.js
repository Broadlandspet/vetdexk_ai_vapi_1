// routes/stripeWebhookRoutes.js
const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/stripeWebhookController');

// raw body required for Stripe signature verification — do NOT use express.json() here
router.post('/', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = router;


