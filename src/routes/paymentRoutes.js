// const express = require('express');
// const router = express.Router();
// const PaymentController = require('../controllers/paymentController');

// router.post('/submit', PaymentController.submitPayment);
// router.get('/status/:bookingId', PaymentController.getPaymentStatus);
// router.put('/status/:bookingId', PaymentController.updatePaymentStatus);
      
// router.post('/create-checkout-session', PaymentController.createCheckoutSession); // NEW


// module.exports = router;

// routes/paymentRoutes.js
const router = require('express').Router();
const paymentController = require('../controllers/paymentController');

router.get('/status/:bookingId', paymentController.getPaymentStatus);
router.post('/create-checkout-session', paymentController.createCheckoutSession);
// submitPayment / PUT status routes removed — no static payment path anymore

module.exports = router;