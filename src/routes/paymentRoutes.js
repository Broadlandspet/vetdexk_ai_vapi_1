const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

router.post('/submit', PaymentController.submitPayment);
router.get('/status/:bookingId', PaymentController.getPaymentStatus);
router.put('/status/:bookingId', PaymentController.updatePaymentStatus);

module.exports = router;