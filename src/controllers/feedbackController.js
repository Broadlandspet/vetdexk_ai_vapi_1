// const BookDemoService = require('../services/bookDemoService');
// const FeedbackService = require('../services/feedbackService');
// const logger = require('../utils/logger');

// class FeedbackController {

//     // Get feedback form data
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
//                     hospitalName: booking.hospital_name
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
            
//             // Handle specific errors
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

   
// }

// module.exports = FeedbackController;

const BookDemoService = require('../services/bookDemoService');
const FeedbackService = require('../services/feedbackService');
const logger = require('../utils/logger');

class FeedbackController {

    // Get feedback form data
    // static async getFeedbackForm(req, res) {
    //     try {
    //         const { token } = req.params;
            
    //         if (!token) {
    //             return res.status(400).json({
    //                 success: false,
    //                 error: 'Invalid feedback link'
    //             });
    //         }
            
    //         // Decode token to get booking ID
    //         let decoded;
    //         try {
    //             decoded = Buffer.from(token, 'base64').toString('utf-8');
    //         } catch (e) {
    //             return res.status(400).json({
    //                 success: false,
    //                 error: 'Invalid feedback link format'
    //             });
    //         }
            
    //         const bookingId = parseInt(decoded.split('-')[0]);
            
    //         if (!bookingId || isNaN(bookingId)) {
    //             return res.status(400).json({
    //                 success: false,
    //                 error: 'Invalid feedback link'
    //             });
    //         }
            
    //         // Get booking details
    //         const booking = await BookDemoService.getBookingById(bookingId);
            
    //         if (!booking) {
    //             return res.status(404).json({
    //                 success: false,
    //                 error: 'Booking not found'
    //             });
    //         }
            
    //         // Check if feedback already submitted
    //         const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);
            
    //         if (existingFeedback) {
    //             return res.status(400).json({
    //                 success: false,
    //                 error: 'Feedback already submitted for this booking'
    //             });
    //         }
            
    //         // Return the data for the frontend
    //         res.json({
    //             success: true,
    //             data: {
    //                 bookingId: booking.id,
    //                 fullName: booking.full_name,
    //                 email: booking.email,
    //                 hospitalName: booking.hospital_name
    //             }
    //         });
            
    //     } catch (error) {
    //         logger.error('Error getting feedback form:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: 'Failed to load feedback form'
    //         });
    //     }
    // }
    static async getFeedbackForm(req, res) {
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
            
            // Handle specific errors
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
    }

    // ✅ NEW: Check if user can view pricing
    static async checkPricingAccess(req, res) {
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
    }
}

module.exports = FeedbackController;