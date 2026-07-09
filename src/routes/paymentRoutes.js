const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

// User routes - no auth required
router.post('/submit', PaymentController.submitPayment);
router.get('/status/:bookingId', PaymentController.checkPaymentStatus);

// Admin routes (add authentication middleware if needed)
router.put('/update-status/:bookingId', PaymentController.updatePaymentStatus);

module.exports = router;