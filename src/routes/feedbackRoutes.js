const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/feedbackController');

// Public routes (no auth needed)
router.get('/:token', FeedbackController.getFeedbackForm);
router.post('/', FeedbackController.submitFeedback);

module.exports = router;