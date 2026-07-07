
const BookDemoService = require('../services/bookDemoService');
const FeedbackService = require('../services/feedbackService');
const logger = require('../utils/logger');

class FeedbackController {

    // Get feedback form data
    static async getFeedbackForm(req, res) {
        try {
            const { token } = req.params;
            
            // Decode token to get booking ID
            const decoded = Buffer.from(token, 'base64').toString();
            const bookingId = parseInt(decoded.split('-')[0]);
            
            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid feedback link'
                });
            }
            
            // Get booking details
            const booking = await BookDemoService.getBookingById(bookingId);
            
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }
            
            // Check if feedback already submitted
            const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);
            
            if (existingFeedback) {
                return res.status(400).json({
                    success: false,
                    error: 'Feedback already submitted'
                });
            }
            
            res.json({
                success: true,
                data: {
                    bookingId: booking.id,
                    fullName: booking.full_name,
                    email: booking.email,
                    hospitalName: booking.hospital_name
                }
            });
            
        } catch (error) {
            logger.error('Error getting feedback form:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to load feedback form'
            });
        }
    }

    // Submit feedback
    static async submitFeedback(req, res) {
        try {
            const {
                bookingId,
                rating,
                wouldRecommend,
                interestedInService,
                feedbackText,
                additionalComments
            } = req.body;
            
            // Validate
            if (!bookingId || !rating) {
                return res.status(400).json({
                    success: false,
                    error: 'Booking ID and rating are required'
                });
            }
            
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];
            
            const result = await FeedbackService.submitFeedback({
                bookingId,
                rating,
                wouldRecommend,
                interestedInService,
                feedbackText,
                additionalComments,
                ipAddress,
                userAgent
            });
            
            res.json({
                success: true,
                message: 'Feedback submitted successfully! Thank you!',
                data: result
            });
            
        } catch (error) {
            logger.error('Error submitting feedback:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit feedback'
            });
        }
    }
}

module.exports = FeedbackController;