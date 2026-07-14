// In your routes file (e.g., feedbackRoutes.js)
const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/feedbackController');

// Get feedback form data (for frontend to display)
router.get('/feedback-form/:token', FeedbackController.getFeedbackForm);

// Submit feedback
router.post('/feedback-submit', FeedbackController.submitFeedback);

// ✅ NEW: Check if user can view pricing
router.get('/pricing-access/:bookingId', FeedbackController.checkPricingAccess);


router.get('/booking-details/:bookingId', FeedbackController.getBookingDetails);


module.exports = router;