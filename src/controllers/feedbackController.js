
// const BookDemoService = require('../services/bookDemoService');
// const FeedbackService = require('../services/feedbackService');
// const logger = require('../utils/logger');

// class FeedbackController {

//     static async getFeedbackForm(req, res) {
//         try {
//             const { token } = req.params;
            
//             if (!token) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Invalid feedback link'
//                 });
//             }
            
//             // Decode token to get booking ID
//             let decoded;
//             try {
//                 decoded = Buffer.from(token, 'base64').toString('utf-8');
//             } catch (e) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Invalid feedback link format'
//                 });
//             }
            
//             const bookingId = parseInt(decoded.split('-')[0]);
            
//             if (!bookingId || isNaN(bookingId)) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Invalid feedback link'
//                 });
//             }
            
//             // Get booking details
//             const booking = await BookDemoService.getBookingById(bookingId);
            
//             if (!booking) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'Booking not found'
//                 });
//             }
            
//             // Check if feedback already submitted
//             const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);
            
//             if (existingFeedback) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Feedback already submitted for this booking'
//                 });
//             }
            
//             // Return the data for the frontend
//             res.json({
//                 success: true,
//                 data: {
//                     bookingId: booking.id,
//                     fullName: booking.full_name,
//                     email: booking.email,
//                     hospitalName: booking.hospital_name,
//                     paymentStatus: booking.payment_status || 'not_started'
//                 }
//             });
            
//         } catch (error) {
//             logger.error('Error getting feedback form:', error);
//             res.status(500).json({
//                 success: false,
//                 error: 'Failed to load feedback form'
//             });
//         }
//     }

//     // Submit feedback
//     static async submitFeedback(req, res) {
//         try {
//             const {
//                 bookingId,
//                 rating,
//                 wouldRecommend,
//                 interestedInService,
//                 feedbackText,
//                 additionalComments
//             } = req.body;
            
//             // Validate required fields
//             if (!bookingId) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Booking ID is required'
//                 });
//             }
            
//             if (!rating || rating < 1 || rating > 5) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Valid rating (1-5) is required'
//                 });
//             }
            
//             if (wouldRecommend === undefined || wouldRecommend === null) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Please indicate if you would recommend us'
//                 });
//             }
            
//             if (interestedInService === undefined || interestedInService === null) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Please indicate if you are interested in our service'
//                 });
//             }
            
//             // Get IP and user agent
//             const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
//             const userAgent = req.headers['user-agent'] || null;
            
//             // Submit feedback
//             const result = await FeedbackService.submitFeedback({
//                 bookingId,
//                 rating,
//                 wouldRecommend,
//                 interestedInService,
//                 feedbackText: feedbackText || null,
//                 additionalComments: additionalComments || null,
//                 ipAddress,
//                 userAgent
//             });
            
//             res.json({
//                 success: true,
//                 message: 'Feedback submitted successfully! Thank you!',
//                 data: result
//             });
            
//         } catch (error) {
//             logger.error('Error submitting feedback:', error);
            
//             if (error.message === 'Booking not found') {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'Booking not found'
//                 });
//             }
            
//             if (error.message === 'Feedback already submitted') {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Feedback already submitted for this booking'
//                 });
//             }
            
//             res.status(500).json({
//                 success: false,
//                 error: 'Failed to submit feedback'
//             });
//         }
//     }

//     // Check if user can view pricing
//     static async checkPricingAccess(req, res) {
//         try {
//             const { bookingId } = req.params;
            
//             if (!bookingId) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Booking ID is required'
//                 });
//             }
            
//             const result = await FeedbackService.canViewPricing(parseInt(bookingId));
            
//             res.json({
//                 success: true,
//                 data: result
//             });
            
//         } catch (error) {
//             logger.error('Error checking pricing access:', error);
//             res.status(500).json({
//                 success: false,
//                 error: 'Failed to check pricing access'
//             });
//         }
//     }

//     // ✅ NEW: Get booking details for registration
//     static async getBookingDetails(req, res) {
//         try {
//             const { bookingId } = req.params;
            
//             if (!bookingId) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Booking ID is required'
//                 });
//             }
            
//             const booking = await BookDemoService.getBookingById(parseInt(bookingId));
            
//             if (!booking) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'Booking not found'
//                 });
//             }
            
//             // Get plan info from notes
//             let planInfo = null;
//             if (booking.notes && booking.notes.includes('[Payment]')) {
//                 const noteLines = booking.notes.split('\n');
//                 const paymentNote = noteLines.find(line => line.includes('[Payment]'));
//                 if (paymentNote) {
//                     const planMatch = paymentNote.match(/Plan: (\w+)/);
//                     if (planMatch) {
//                         planInfo = planMatch[1];
//                     }
//                 }
//             }
            
//             res.json({
//                 success: true,
//                 data: {
//                     id: booking.id,
//                     full_name: booking.full_name,
//                     email: booking.email,
//                     hospital_name: booking.hospital_name,
//                     phone: booking.hospital_phone || '',
//                     payment_status: booking.payment_status,
//                     plan_name: planInfo || 'Monthly',
//                     plan_price: 299 // Default, can be enhanced
//                 }
//             });
            
//         } catch (error) {
//             logger.error('Error getting booking details:', error);
//             res.status(500).json({
//                 success: false,
//                 error: 'Failed to get booking details'
//             });
//         }
//     }
// }

// module.exports = FeedbackController;







const BookDemoService = require('../services/bookDemoService');
const FeedbackService = require('../services/feedbackService');
const logger = require('../utils/logger');

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get feedback form data (public)
 * GET /api/feedback/feedback-form/:token
 */
exports.getFeedbackForm = async (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Invalid feedback link'
            });
        }
        
        // Decode token to get booking ID
        let decoded;
        try {
            decoded = Buffer.from(token, 'base64').toString('utf-8');
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid feedback link format'
            });
        }
        
        const bookingId = parseInt(decoded.split('-')[0]);
        
        if (!bookingId || isNaN(bookingId)) {
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
                error: 'Feedback already submitted for this booking'
            });
        }
        
        // Return the data for the frontend
        res.json({
            success: true,
            data: {
                bookingId: booking.id,
                fullName: booking.full_name,
                email: booking.email,
                hospitalName: booking.hospital_name,
                paymentStatus: booking.payment_status || 'not_started'
            }
        });
        
    } catch (error) {
        logger.error('Error getting feedback form:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load feedback form'
        });
    }
};

/**
 * Submit feedback (public)
 * POST /api/feedback/feedback-submit
 */
exports.submitFeedback = async (req, res) => {
    try {
        const {
            bookingId,
            rating,
            wouldRecommend,
            interestedInService,
            feedbackText,
            additionalComments
        } = req.body;
        
        // Validate required fields
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                error: 'Booking ID is required'
            });
        }
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Valid rating (1-5) is required'
            });
        }
        
        if (wouldRecommend === undefined || wouldRecommend === null) {
            return res.status(400).json({
                success: false,
                error: 'Please indicate if you would recommend us'
            });
        }
        
        if (interestedInService === undefined || interestedInService === null) {
            return res.status(400).json({
                success: false,
                error: 'Please indicate if you are interested in our service'
            });
        }
        
        // Get IP and user agent
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        
        // Submit feedback
        const result = await FeedbackService.submitFeedback({
            bookingId,
            rating,
            wouldRecommend,
            interestedInService,
            feedbackText: feedbackText || null,
            additionalComments: additionalComments || null,
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
        
        if (error.message === 'Booking not found') {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        
        if (error.message === 'Feedback already submitted') {
            return res.status(400).json({
                success: false,
                error: 'Feedback already submitted for this booking'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to submit feedback'
        });
    }
};

/**
 * Check if user can view pricing (public)
 * GET /api/feedback/pricing-access/:bookingId
 */
exports.checkPricingAccess = async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                error: 'Booking ID is required'
            });
        }
        
        const result = await FeedbackService.canViewPricing(parseInt(bookingId));
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        logger.error('Error checking pricing access:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check pricing access'
        });
    }
};

/**
 * Get booking details for registration (public)
 * GET /api/feedback/booking-details/:bookingId
 */
exports.getBookingDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                error: 'Booking ID is required'
            });
        }
        
        const booking = await BookDemoService.getBookingById(parseInt(bookingId));
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        
        // Get plan info from notes
        let planInfo = null;
        if (booking.notes && booking.notes.includes('[Payment]')) {
            const noteLines = booking.notes.split('\n');
            const paymentNote = noteLines.find(line => line.includes('[Payment]'));
            if (paymentNote) {
                const planMatch = paymentNote.match(/Plan: (\w+)/);
                if (planMatch) {
                    planInfo = planMatch[1];
                }
            }
        }
        
        res.json({
            success: true,
            data: {
                id: booking.id,
                full_name: booking.full_name,
                email: booking.email,
                hospital_name: booking.hospital_name,
                phone: booking.hospital_phone || '',
                payment_status: booking.payment_status,
                plan_name: planInfo || 'Monthly',
                plan_price: 299 // Default, can be enhanced
            }
        });
        
    } catch (error) {
        logger.error('Error getting booking details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get booking details'
        });
    }
};