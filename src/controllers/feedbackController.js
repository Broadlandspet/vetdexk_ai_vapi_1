// // // // // const BookDemoService = require('../services/bookDemoService');
// // // // // const FeedbackService = require('../services/feedbackService');
// // // // // const logger = require('../utils/logger');

// // // // // // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// // // // // /**
// // // // //  * Get feedback form data (public)
// // // // //  * GET /api/feedback/feedback-form/:token
// // // // //  */
// // // // // exports.getFeedbackForm = async (req, res) => {
// // // // //     try {
// // // // //         const { token } = req.params;
        
// // // // //         if (!token) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Invalid feedback link'
// // // // //             });
// // // // //         }
        
// // // // //         // Decode token to get booking ID
// // // // //         let decoded;
// // // // //         try {
// // // // //             decoded = Buffer.from(token, 'base64').toString('utf-8');
// // // // //         } catch (e) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Invalid feedback link format'
// // // // //             });
// // // // //         }
        
// // // // //         const bookingId = parseInt(decoded.split('-')[0]);
        
// // // // //         if (!bookingId || isNaN(bookingId)) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Invalid feedback link'
// // // // //             });
// // // // //         }
        
// // // // //         // Get booking details
// // // // //         const booking = await BookDemoService.getBookingById(bookingId);
        
// // // // //         if (!booking) {
// // // // //             return res.status(404).json({
// // // // //                 success: false,
// // // // //                 error: 'Booking not found'
// // // // //             });
// // // // //         }
        
// // // // //         // Check if feedback already submitted
// // // // //         const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);
        
// // // // //         if (existingFeedback) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Feedback already submitted for this booking'
// // // // //             });
// // // // //         }
        
// // // // //         // Return the data for the frontend
// // // // //         res.json({
// // // // //             success: true,
// // // // //             data: {
// // // // //                 bookingId: booking.id,
// // // // //                 fullName: booking.full_name,
// // // // //                 email: booking.email,
// // // // //                 hospitalName: booking.hospital_name,
// // // // //                 paymentStatus: booking.payment_status || 'not_started'
// // // // //             }
// // // // //         });
        
// // // // //     } catch (error) {
// // // // //         logger.error('Error getting feedback form:', error);
// // // // //         res.status(500).json({
// // // // //             success: false,
// // // // //             error: 'Failed to load feedback form'
// // // // //         });
// // // // //     }
// // // // // };

// // // // // /**
// // // // //  * Submit feedback (public)
// // // // //  * POST /api/feedback/feedback-submit
// // // // //  */
// // // // // exports.submitFeedback = async (req, res) => {
// // // // //     try {
// // // // //         const {
// // // // //             bookingId,
// // // // //             rating,
// // // // //             wouldRecommend,
// // // // //             interestedInService,
// // // // //             feedbackText,
// // // // //             additionalComments
// // // // //         } = req.body;
        
// // // // //         // Validate required fields
// // // // //         if (!bookingId) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Booking ID is required'
// // // // //             });
// // // // //         }
        
// // // // //         if (!rating || rating < 1 || rating > 5) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Valid rating (1-5) is required'
// // // // //             });
// // // // //         }
        
// // // // //         if (wouldRecommend === undefined || wouldRecommend === null) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Please indicate if you would recommend us'
// // // // //             });
// // // // //         }
        
// // // // //         if (interestedInService === undefined || interestedInService === null) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Please indicate if you are interested in our service'
// // // // //             });
// // // // //         }
        
// // // // //         // Get IP and user agent
// // // // //         const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
// // // // //         const userAgent = req.headers['user-agent'] || null;
        
// // // // //         // Submit feedback
// // // // //         const result = await FeedbackService.submitFeedback({
// // // // //             bookingId,
// // // // //             rating,
// // // // //             wouldRecommend,
// // // // //             interestedInService,
// // // // //             feedbackText: feedbackText || null,
// // // // //             additionalComments: additionalComments || null,
// // // // //             ipAddress,
// // // // //             userAgent
// // // // //         });
        
// // // // //         res.json({
// // // // //             success: true,
// // // // //             message: 'Feedback submitted successfully! Thank you!',
// // // // //             data: result
// // // // //         });
        
// // // // //     } catch (error) {
// // // // //         logger.error('Error submitting feedback:', error);
        
// // // // //         if (error.message === 'Booking not found') {
// // // // //             return res.status(404).json({
// // // // //                 success: false,
// // // // //                 error: 'Booking not found'
// // // // //             });
// // // // //         }
        
// // // // //         if (error.message === 'Feedback already submitted') {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Feedback already submitted for this booking'
// // // // //             });
// // // // //         }
        
// // // // //         res.status(500).json({
// // // // //             success: false,
// // // // //             error: 'Failed to submit feedback'
// // // // //         });
// // // // //     }
// // // // // };

// // // // // /**
// // // // //  * Check if user can view pricing (public)
// // // // //  * GET /api/feedback/pricing-access/:bookingId
// // // // //  */
// // // // // exports.checkPricingAccess = async (req, res) => {
// // // // //     try {
// // // // //         const { bookingId } = req.params;
        
// // // // //         if (!bookingId) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Booking ID is required'
// // // // //             });
// // // // //         }
        
// // // // //         const result = await FeedbackService.canViewPricing(parseInt(bookingId));
        
// // // // //         res.json({
// // // // //             success: true,
// // // // //             data: result
// // // // //         });
        
// // // // //     } catch (error) {
// // // // //         logger.error('Error checking pricing access:', error);
// // // // //         res.status(500).json({
// // // // //             success: false,
// // // // //             error: 'Failed to check pricing access'
// // // // //         });
// // // // //     }
// // // // // };

// // // // // /**
// // // // //  * Get booking details for registration (public)
// // // // //  * GET /api/feedback/booking-details/:bookingId
// // // // //  */
// // // // // exports.getBookingDetails = async (req, res) => {
// // // // //     try {
// // // // //         const { bookingId } = req.params;
        
// // // // //         if (!bookingId) {
// // // // //             return res.status(400).json({
// // // // //                 success: false,
// // // // //                 error: 'Booking ID is required'
// // // // //             });
// // // // //         }
        
// // // // //         const booking = await BookDemoService.getBookingById(parseInt(bookingId));
        
// // // // //         if (!booking) {
// // // // //             return res.status(404).json({
// // // // //                 success: false,
// // // // //                 error: 'Booking not found'
// // // // //             });
// // // // //         }
        
// // // // //         // Get plan info from notes
// // // // //         let planInfo = null;
// // // // //         if (booking.notes && booking.notes.includes('[Payment]')) {
// // // // //             const noteLines = booking.notes.split('\n');
// // // // //             const paymentNote = noteLines.find(line => line.includes('[Payment]'));
// // // // //             if (paymentNote) {
// // // // //                 const planMatch = paymentNote.match(/Plan: (\w+)/);
// // // // //                 if (planMatch) {
// // // // //                     planInfo = planMatch[1];
// // // // //                 }
// // // // //             }
// // // // //         }
        
// // // // //         res.json({
// // // // //             success: true,
// // // // //             data: {
// // // // //                 id: booking.id,
// // // // //                 full_name: booking.full_name,
// // // // //                 email: booking.email,
// // // // //                 hospital_name: booking.hospital_name,
// // // // //                 phone: booking.hospital_phone || '',
// // // // //                 payment_status: booking.payment_status,
// // // // //                 plan_name: planInfo || 'Monthly',
// // // // //                 plan_price: 299 // Default, can be enhanced
// // // // //             }
// // // // //         });
        
// // // // //     } catch (error) {
// // // // //         logger.error('Error getting booking details:', error);
// // // // //         res.status(500).json({
// // // // //             success: false,
// // // // //             error: 'Failed to get booking details'
// // // // //         });
// // // // //     }
// // // // // };


// // // // const BookDemoService = require('../services/bookDemoService');
// // // // const FeedbackService = require('../services/feedbackService');
// // // // const logger = require('../utils/logger');

// // // // // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// // // // /**
// // // //  * Get feedback form data (public)
// // // //  * GET /api/feedback/feedback-form/:token
// // // //  *
// // // //  * This is the single source of truth for "what should this link do right now".
// // // //  * The frontend must branch on `data.action` instead of trying to reconstruct
// // // //  * this state itself from separate calls.
// // // //  */
// // // // exports.getFeedbackForm = async (req, res) => {
// // // //     try {
// // // //         const { token } = req.params;

// // // //         if (!token) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Invalid feedback link'
// // // //             });
// // // //         }

// // // //         // Decode token to get booking ID
// // // //         let decoded;
// // // //         try {
// // // //             decoded = Buffer.from(token, 'base64').toString('utf-8');
// // // //         } catch (e) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Invalid feedback link format'
// // // //             });
// // // //         }

// // // //         const bookingId = parseInt(decoded.split('-')[0]);

// // // //         if (!bookingId || isNaN(bookingId)) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Invalid feedback link'
// // // //             });
// // // //         }

// // // //         // Get booking details
// // // //         const booking = await BookDemoService.getBookingById(bookingId);

// // // //         if (!booking) {
// // // //             return res.status(404).json({
// // // //                 success: false,
// // // //                 error: 'Booking not found'
// // // //             });
// // // //         }

// // // //         // ── STATE 1: Already registered → link is permanently spent ──
// // // //         // This is the check that was missing before. Without it, a paid +
// // // //         // registered customer clicking their old feedback email link keeps
// // // //         // getting bounced back into the registration flow forever.
// // // //         const existingUser = await BookDemoService.getUserByDemoRequestId(bookingId);
// // // //         if (existingUser) {
// // // //             return res.status(410).json({
// // // //                 success: false,
// // // //                 code: 'LINK_ALREADY_USED',
// // // //                 error: 'This link has already been used'
// // // //             });
// // // //         }

// // // //         // ── STATE 2: Paid, not yet registered → skip everything, go to registration ──
// // // //         if (booking.payment_status === 'completed') {
// // // //             return res.json({
// // // //                 success: true,
// // // //                 data: {
// // // //                     bookingId: booking.id,
// // // //                     fullName: booking.full_name,
// // // //                     email: booking.email,
// // // //                     hospitalName: booking.hospital_name,
// // // //                     action: 'GO_TO_REGISTRATION'
// // // //                 }
// // // //             });
// // // //         }

// // // //         const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);

// // // //         // ── STATE 3: Feedback submitted + interested, still unpaid → go straight to pricing ──
// // // //         if (existingFeedback && existingFeedback.interested_in_service === true) {
// // // //             return res.json({
// // // //                 success: true,
// // // //                 data: {
// // // //                     bookingId: booking.id,
// // // //                     fullName: booking.full_name,
// // // //                     email: booking.email,
// // // //                     hospitalName: booking.hospital_name,
// // // //                     action: 'GO_TO_PRICING'
// // // //                 }
// // // //             });
// // // //         }

// // // //         // ── STATE 4: Feedback submitted, not interested → done, nothing more to do ──
// // // //         if (existingFeedback && existingFeedback.interested_in_service === false) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Feedback already submitted for this booking'
// // // //             });
// // // //         }

// // // //         // ── STATE 5: Nothing submitted yet → normal form ──
// // // //         return res.json({
// // // //             success: true,
// // // //             data: {
// // // //                 bookingId: booking.id,
// // // //                 fullName: booking.full_name,
// // // //                 email: booking.email,
// // // //                 hospitalName: booking.hospital_name,
// // // //                 action: 'SHOW_FORM'
// // // //             }
// // // //         });

// // // //     } catch (error) {
// // // //         logger.error('Error getting feedback form:', error);
// // // //         res.status(500).json({
// // // //             success: false,
// // // //             error: 'Failed to load feedback form'
// // // //         });
// // // //     }
// // // // };

// // // // /**
// // // //  * Submit feedback (public)
// // // //  * POST /api/feedback/feedback-submit
// // // //  */
// // // // exports.submitFeedback = async (req, res) => {
// // // //     try {
// // // //         const {
// // // //             bookingId,
// // // //             rating,
// // // //             wouldRecommend,
// // // //             interestedInService,
// // // //             feedbackText,
// // // //             additionalComments
// // // //         } = req.body;

// // // //         if (!bookingId) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Booking ID is required'
// // // //             });
// // // //         }

// // // //         if (!rating || rating < 1 || rating > 5) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Valid rating (1-5) is required'
// // // //             });
// // // //         }

// // // //         if (wouldRecommend === undefined || wouldRecommend === null) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Please indicate if you would recommend us'
// // // //             });
// // // //         }

// // // //         if (interestedInService === undefined || interestedInService === null) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Please indicate if you are interested in our service'
// // // //             });
// // // //         }

// // // //         const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
// // // //         const userAgent = req.headers['user-agent'] || null;

// // // //         const result = await FeedbackService.submitFeedback({
// // // //             bookingId,
// // // //             rating,
// // // //             wouldRecommend,
// // // //             interestedInService,
// // // //             feedbackText: feedbackText || null,
// // // //             additionalComments: additionalComments || null,
// // // //             ipAddress,
// // // //             userAgent
// // // //         });

// // // //         res.json({
// // // //             success: true,
// // // //             message: 'Feedback submitted successfully! Thank you!',
// // // //             data: result
// // // //         });

// // // //     } catch (error) {
// // // //         logger.error('Error submitting feedback:', error);

// // // //         if (error.message === 'Booking not found') {
// // // //             return res.status(404).json({
// // // //                 success: false,
// // // //                 error: 'Booking not found'
// // // //             });
// // // //         }

// // // //         if (error.message === 'Feedback already submitted') {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Feedback already submitted for this booking'
// // // //             });
// // // //         }

// // // //         res.status(500).json({
// // // //             success: false,
// // // //             error: 'Failed to submit feedback'
// // // //         });
// // // //     }
// // // // };

// // // // /**
// // // //  * Check if user can view pricing (public)
// // // //  * GET /api/feedback/pricing-access/:bookingId
// // // //  *
// // // //  * NOTE: kept for backward compatibility / other callers, but FeedbackForm.tsx
// // // //  * no longer needs to call this directly — getFeedbackForm's `action` field
// // // //  * already covers this case on initial load.
// // // //  */
// // // // exports.checkPricingAccess = async (req, res) => {
// // // //     try {
// // // //         const { bookingId } = req.params;

// // // //         if (!bookingId) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Booking ID is required'
// // // //             });
// // // //         }

// // // //         const result = await FeedbackService.canViewPricing(parseInt(bookingId));

// // // //         res.json({
// // // //             success: true,
// // // //             data: result
// // // //         });

// // // //     } catch (error) {
// // // //         logger.error('Error checking pricing access:', error);
// // // //         res.status(500).json({
// // // //             success: false,
// // // //             error: 'Failed to check pricing access'
// // // //         });
// // // //     }
// // // // };

// // // // /**
// // // //  * Get booking details for registration (public)
// // // //  * GET /api/feedback/booking-details/:bookingId
// // // //  */
// // // // exports.getBookingDetails = async (req, res) => {
// // // //     try {
// // // //         const { bookingId } = req.params;

// // // //         if (!bookingId) {
// // // //             return res.status(400).json({
// // // //                 success: false,
// // // //                 error: 'Booking ID is required'
// // // //             });
// // // //         }

// // // //         const parsedId = parseInt(bookingId);

// // // //         const booking = await BookDemoService.getBookingById(parsedId);

// // // //         if (!booking) {
// // // //             return res.status(404).json({
// // // //                 success: false,
// // // //                 error: 'Booking not found'
// // // //             });
// // // //         }

// // // //         // Block re-registration through this endpoint too — if a users row
// // // //         // already exists for this booking, there's nothing left to register.
// // // //         const existingUser = await BookDemoService.getUserByDemoRequestId(parsedId);
// // // //         if (existingUser) {
// // // //             return res.status(410).json({
// // // //                 success: false,
// // // //                 code: 'LINK_ALREADY_USED',
// // // //                 error: 'This booking has already been registered'
// // // //             });
// // // //         }

// // // //         // Prefer the plan_id set at checkout time (multi-plan aware) over the
// // // //         // legacy free-text note parsing, which only ever applied to the old
// // // //         // static-payment flow and always assumed a single Monthly plan.
// // // //         const PLAN_DISPLAY = {
// // // //             monthly: { name: 'Monthly', price: 299 },
// // // //             quarterly: { name: 'Quarterly', price: 807 },
// // // //             yearly: { name: 'Yearly', price: 2870 }
// // // //         };

// // // //         let planName = 'Monthly';
// // // //         let planPrice = booking.plan_price || 299;

// // // //         if (booking.plan_id && PLAN_DISPLAY[booking.plan_id]) {
// // // //             planName = PLAN_DISPLAY[booking.plan_id].name;
// // // //             planPrice = booking.plan_price || PLAN_DISPLAY[booking.plan_id].price;
// // // //         } else if (booking.notes && booking.notes.includes('[Payment]')) {
// // // //             // legacy fallback for old static-payment bookings only
// // // //             const noteLines = booking.notes.split('\n');
// // // //             const paymentNote = noteLines.find(line => line.includes('[Payment]'));
// // // //             if (paymentNote) {
// // // //                 const planMatch = paymentNote.match(/Plan: (\w+)/);
// // // //                 if (planMatch) planName = planMatch[1];
// // // //             }
// // // //         }

// // // //         res.json({
// // // //             success: true,
// // // //             data: {
// // // //                 id: booking.id,
// // // //                 full_name: booking.full_name,
// // // //                 email: booking.email,
// // // //                 hospital_name: booking.hospital_name,
// // // //                 phone: booking.hospital_phone || '',
// // // //                 payment_status: booking.payment_status,
// // // //                 plan_id: booking.plan_id || 'monthly',
// // // //                 plan_name: planName,
// // // //                 plan_price: planPrice
// // // //             }
// // // //         });

// // // //     } catch (error) {
// // // //         logger.error('Error getting booking details:', error);
// // // //         res.status(500).json({
// // // //             success: false,
// // // //             error: 'Failed to get booking details'
// // // //         });
// // // //     }
// // // // };


// // // const BookDemoService = require('../services/bookDemoService');
// // // const FeedbackService = require('../services/feedbackService');
// // // const logger = require('../utils/logger');

// // // // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// // // /**
// // //  * Get feedback form data (public)
// // //  * GET /api/feedback/feedback-form/:token
// // //  *
// // //  * This is the single source of truth for "what should this link do right now".
// // //  * The frontend must branch on `data.action` instead of trying to reconstruct
// // //  * this state itself from separate calls.
// // //  */
// // // exports.getFeedbackForm = async (req, res) => {
// // //     try {
// // //         const { token } = req.params;

// // //         if (!token) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Invalid feedback link'
// // //             });
// // //         }

// // //         // Decode token to get booking ID
// // //         let decoded;
// // //         try {
// // //             decoded = Buffer.from(token, 'base64').toString('utf-8');
// // //         } catch (e) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Invalid feedback link format'
// // //             });
// // //         }

// // //         const bookingId = parseInt(decoded.split('-')[0]);

// // //         if (!bookingId || isNaN(bookingId)) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Invalid feedback link'
// // //             });
// // //         }

// // //         // Get booking details
// // //         const booking = await BookDemoService.getBookingById(bookingId);

// // //         if (!booking) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 error: 'Booking not found'
// // //             });
// // //         }

// // //         // ── STATE 1: Already registered → link is permanently spent ──
// // //         // This is the check that was missing before. Without it, a paid +
// // //         // registered customer clicking their old feedback email link keeps
// // //         // getting bounced back into the registration flow forever.
// // //         const existingUser = await BookDemoService.getUserByDemoRequestId(bookingId);
// // //         if (existingUser) {
// // //             return res.status(410).json({
// // //                 success: false,
// // //                 code: 'LINK_ALREADY_USED',
// // //                 error: 'This link has already been used'
// // //             });
// // //         }

// // //         // ── STATE 2: Paid, not yet registered → skip everything, go to registration ──
// // //         if (booking.payment_status === 'completed') {
// // //             return res.json({
// // //                 success: true,
// // //                 data: {
// // //                     bookingId: booking.id,
// // //                     fullName: booking.full_name,
// // //                     email: booking.email,
// // //                     hospitalName: booking.hospital_name,
// // //                     action: 'GO_TO_REGISTRATION'
// // //                 }
// // //             });
// // //         }

// // //         const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);

// // //         // ── STATE 3: Feedback submitted + interested, still unpaid → go straight to pricing ──
// // //         if (existingFeedback && existingFeedback.interested_in_service === true) {
// // //             return res.json({
// // //                 success: true,
// // //                 data: {
// // //                     bookingId: booking.id,
// // //                     fullName: booking.full_name,
// // //                     email: booking.email,
// // //                     hospitalName: booking.hospital_name,
// // //                     action: 'GO_TO_PRICING'
// // //                 }
// // //             });
// // //         }

// // //         // ── STATE 4: Feedback submitted, not interested → done, nothing more to do ──
// // //         if (existingFeedback && existingFeedback.interested_in_service === false) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Feedback already submitted for this booking'
// // //             });
// // //         }

// // //         // ── STATE 5: Nothing submitted yet → normal form ──
// // //         return res.json({
// // //             success: true,
// // //             data: {
// // //                 bookingId: booking.id,
// // //                 fullName: booking.full_name,
// // //                 email: booking.email,
// // //                 hospitalName: booking.hospital_name,
// // //                 action: 'SHOW_FORM'
// // //             }
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error getting feedback form:', error);
// // //         res.status(500).json({
// // //             success: false,
// // //             error: 'Failed to load feedback form'
// // //         });
// // //     }
// // // };

// // // /**
// // //  * Submit feedback (public)
// // //  * POST /api/feedback/feedback-submit
// // //  */
// // // exports.submitFeedback = async (req, res) => {
// // //     try {
// // //         const {
// // //             bookingId,
// // //             rating,
// // //             wouldRecommend,
// // //             interestedInService,
// // //             feedbackText,
// // //             additionalComments
// // //         } = req.body;

// // //         if (!bookingId) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Booking ID is required'
// // //             });
// // //         }

// // //         if (!rating || rating < 1 || rating > 5) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Valid rating (1-5) is required'
// // //             });
// // //         }

// // //         if (wouldRecommend === undefined || wouldRecommend === null) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Please indicate if you would recommend us'
// // //             });
// // //         }

// // //         if (interestedInService === undefined || interestedInService === null) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Please indicate if you are interested in our service'
// // //             });
// // //         }

// // //         const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
// // //         const userAgent = req.headers['user-agent'] || null;

// // //         const result = await FeedbackService.submitFeedback({
// // //             bookingId,
// // //             rating,
// // //             wouldRecommend,
// // //             interestedInService,
// // //             feedbackText: feedbackText || null,
// // //             additionalComments: additionalComments || null,
// // //             ipAddress,
// // //             userAgent
// // //         });

// // //         res.json({
// // //             success: true,
// // //             message: 'Feedback submitted successfully! Thank you!',
// // //             data: result
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error submitting feedback:', error);

// // //         if (error.message === 'Booking not found') {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 error: 'Booking not found'
// // //             });
// // //         }

// // //         if (error.message === 'Feedback already submitted') {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Feedback already submitted for this booking'
// // //             });
// // //         }

// // //         res.status(500).json({
// // //             success: false,
// // //             error: 'Failed to submit feedback'
// // //         });
// // //     }
// // // };

// // // /**
// // //  * Check if user can view pricing (public)
// // //  * GET /api/feedback/pricing-access/:bookingId
// // //  *
// // //  * NOTE: kept for backward compatibility / other callers, but FeedbackForm.tsx
// // //  * no longer needs to call this directly — getFeedbackForm's `action` field
// // //  * already covers this case on initial load.
// // //  */
// // // exports.checkPricingAccess = async (req, res) => {
// // //     try {
// // //         const { bookingId } = req.params;

// // //         if (!bookingId) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Booking ID is required'
// // //             });
// // //         }

// // //         const result = await FeedbackService.canViewPricing(parseInt(bookingId));

// // //         res.json({
// // //             success: true,
// // //             data: result
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error checking pricing access:', error);
// // //         res.status(500).json({
// // //             success: false,
// // //             error: 'Failed to check pricing access'
// // //         });
// // //     }
// // // };

// // // /**
// // //  * Get booking details for registration (public)
// // //  * GET /api/feedback/booking-details/:bookingId
// // //  */
// // // exports.getBookingDetails = async (req, res) => {
// // //     try {
// // //         const { bookingId } = req.params;

// // //         if (!bookingId) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Booking ID is required'
// // //             });
// // //         }

// // //         const parsedId = parseInt(bookingId);

// // //         const booking = await BookDemoService.getBookingById(parsedId);

// // //         if (!booking) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 error: 'Booking not found'
// // //             });
// // //         }

// // //         // Block re-registration through this endpoint too — if a users row
// // //         // already exists for this booking, there's nothing left to register.
// // //         const existingUser = await BookDemoService.getUserByDemoRequestId(parsedId);
// // //         if (existingUser) {
// // //             return res.status(410).json({
// // //                 success: false,
// // //                 code: 'LINK_ALREADY_USED',
// // //                 error: 'This booking has already been registered'
// // //             });
// // //         }

// // //         // Prefer the plan_id set at checkout time (multi-plan aware) over the
// // //         // legacy free-text note parsing, which only ever applied to the old
// // //         // static-payment flow and always assumed a single Monthly plan.
// // //         const PLAN_DISPLAY = {
// // //             monthly: { name: 'Monthly', price: 299 },
// // //             quarterly: { name: 'Quarterly', price: 897 },
// // //             yearly: { name: 'Yearly', price: 3588 }
// // //         };

// // //         let planName = 'Monthly';
// // //         let planPrice = booking.plan_price || 299;

// // //         if (booking.plan_id && PLAN_DISPLAY[booking.plan_id]) {
// // //             planName = PLAN_DISPLAY[booking.plan_id].name;
// // //             planPrice = booking.plan_price || PLAN_DISPLAY[booking.plan_id].price;
// // //         } else if (booking.notes && booking.notes.includes('[Payment]')) {
// // //             // legacy fallback for old static-payment bookings only
// // //             const noteLines = booking.notes.split('\n');
// // //             const paymentNote = noteLines.find(line => line.includes('[Payment]'));
// // //             if (paymentNote) {
// // //                 const planMatch = paymentNote.match(/Plan: (\w+)/);
// // //                 if (planMatch) planName = planMatch[1];
// // //             }
// // //         }

// // //         res.json({
// // //             success: true,
// // //             data: {
// // //                 id: booking.id,
// // //                 full_name: booking.full_name,
// // //                 email: booking.email,
// // //                 hospital_name: booking.hospital_name,
// // //                 phone: booking.hospital_phone || '',
// // //                 payment_status: booking.payment_status,
// // //                 plan_id: booking.plan_id || 'monthly',
// // //                 plan_name: planName,
// // //                 plan_price: planPrice
// // //             }
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error getting booking details:', error);
// // //         res.status(500).json({
// // //             success: false,
// // //             error: 'Failed to get booking details'
// // //         });
// // //     }
// // // };


// // const BookDemoService = require('../services/bookDemoService');
// // const FeedbackService = require('../services/feedbackService');
// // const logger = require('../utils/logger');

// // // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// // /**
// //  * Get feedback form data (public)
// //  * GET /api/feedback/feedback-form/:token
// //  *
// //  * This is the single source of truth for "what should this link do right now".
// //  * The frontend must branch on `data.action` instead of trying to reconstruct
// //  * this state itself from separate calls.
// //  *
// //  * `token` is now the booking's real feedback_token (a uuid, unique per
// //  * booking, stored on book_demo) — resolved by direct lookup. There is no
// //  * decoding step: nothing about the booking ID is derivable from the token
// //  * itself, and an invalid/malformed token simply matches no row.
// //  */
// // exports.getFeedbackForm = async (req, res) => {
// //     try {
// //         const { token } = req.params;

// //         if (!token) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Invalid feedback link'
// //             });
// //         }

// //         const booking = await FeedbackService.getBookingByFeedbackToken(token);

// //         if (!booking) {
// //             return res.status(404).json({
// //                 success: false,
// //                 error: 'Invalid feedback link'
// //             });
// //         }

// //         const bookingId = booking.id;

// //         // ── STATE 1: Already registered → link is permanently spent ──
// //         // This is the check that was missing before. Without it, a paid +
// //         // registered customer clicking their old feedback email link keeps
// //         // getting bounced back into the registration flow forever.
// //         const existingUser = await BookDemoService.getUserByDemoRequestId(bookingId);
// //         if (existingUser) {
// //             return res.status(410).json({
// //                 success: false,
// //                 code: 'LINK_ALREADY_USED',
// //                 error: 'This link has already been used'
// //             });
// //         }

// //         // ── STATE 2: Paid, not yet registered → skip everything, go to registration ──
// //         if (booking.payment_status === 'completed') {
// //             return res.json({
// //                 success: true,
// //                 data: {
// //                     bookingId: booking.id,
// //                     fullName: booking.full_name,
// //                     email: booking.email,
// //                     hospitalName: booking.hospital_name,
// //                     action: 'GO_TO_REGISTRATION'
// //                 }
// //             });
// //         }

// //         const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);

// //         // ── STATE 3: Feedback submitted + interested, still unpaid → go straight to pricing ──
// //         if (existingFeedback && existingFeedback.interested_in_service === true) {
// //             return res.json({
// //                 success: true,
// //                 data: {
// //                     bookingId: booking.id,
// //                     fullName: booking.full_name,
// //                     email: booking.email,
// //                     hospitalName: booking.hospital_name,
// //                     action: 'GO_TO_PRICING'
// //                 }
// //             });
// //         }

// //         // ── STATE 4: Feedback submitted, not interested → done, nothing more to do ──
// //         if (existingFeedback && existingFeedback.interested_in_service === false) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Feedback already submitted for this booking'
// //             });
// //         }

// //         // ── STATE 5: Nothing submitted yet → normal form, but only if the link hasn't expired ──
// //         // Expiry is only enforced here, at the point of a *fresh* submission.
// //         // A link that's already progressed to pricing/registration (states
// //         // 2-3 above) keeps working past its original expiry, since the user
// //         // is mid-flow and re-sending them a new email mid-checkout would be
// //         // a worse experience than just honoring the in-progress session.
// //         if (booking.feedback_token_expires_at && new Date(booking.feedback_token_expires_at) < new Date()) {
// //             return res.status(410).json({
// //                 success: false,
// //                 code: 'LINK_EXPIRED',
// //                 error: 'This feedback link has expired'
// //             });
// //         }

// //         return res.json({
// //             success: true,
// //             data: {
// //                 bookingId: booking.id,
// //                 fullName: booking.full_name,
// //                 email: booking.email,
// //                 hospitalName: booking.hospital_name,
// //                 action: 'SHOW_FORM'
// //             }
// //         });

// //     } catch (error) {
// //         logger.error('Error getting feedback form:', error);
// //         res.status(500).json({
// //             success: false,
// //             error: 'Failed to load feedback form'
// //         });
// //     }
// // };

// // /**
// //  * Submit feedback (public)
// //  * POST /api/feedback/feedback-submit
// //  */
// // exports.submitFeedback = async (req, res) => {
// //     try {
// //         const {
// //             bookingId,
// //             rating,
// //             wouldRecommend,
// //             interestedInService,
// //             feedbackText,
// //             additionalComments
// //         } = req.body;

// //         if (!bookingId) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Booking ID is required'
// //             });
// //         }

// //         if (!rating || rating < 1 || rating > 5) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Valid rating (1-5) is required'
// //             });
// //         }

// //         if (wouldRecommend === undefined || wouldRecommend === null) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Please indicate if you would recommend us'
// //             });
// //         }

// //         if (interestedInService === undefined || interestedInService === null) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Please indicate if you are interested in our service'
// //             });
// //         }

// //         const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
// //         const userAgent = req.headers['user-agent'] || null;

// //         const result = await FeedbackService.submitFeedback({
// //             bookingId,
// //             rating,
// //             wouldRecommend,
// //             interestedInService,
// //             feedbackText: feedbackText || null,
// //             additionalComments: additionalComments || null,
// //             ipAddress,
// //             userAgent
// //         });

// //         res.json({
// //             success: true,
// //             message: 'Feedback submitted successfully! Thank you!',
// //             data: result
// //         });

// //     } catch (error) {
// //         logger.error('Error submitting feedback:', error);

// //         if (error.message === 'Booking not found') {
// //             return res.status(404).json({
// //                 success: false,
// //                 error: 'Booking not found'
// //             });
// //         }

// //         if (error.message === 'Feedback already submitted') {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Feedback already submitted for this booking'
// //             });
// //         }

// //         res.status(500).json({
// //             success: false,
// //             error: 'Failed to submit feedback'
// //         });
// //     }
// // };

// // /**
// //  * Check if user can view pricing (public)
// //  * GET /api/feedback/pricing-access/:bookingId
// //  *
// //  * NOTE: kept for backward compatibility / other callers, but FeedbackForm.tsx
// //  * no longer needs to call this directly — getFeedbackForm's `action` field
// //  * already covers this case on initial load.
// //  */
// // exports.checkPricingAccess = async (req, res) => {
// //     try {
// //         const { bookingId } = req.params;

// //         if (!bookingId) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Booking ID is required'
// //             });
// //         }

// //         const result = await FeedbackService.canViewPricing(parseInt(bookingId));

// //         res.json({
// //             success: true,
// //             data: result
// //         });

// //     } catch (error) {
// //         logger.error('Error checking pricing access:', error);
// //         res.status(500).json({
// //             success: false,
// //             error: 'Failed to check pricing access'
// //         });
// //     }
// // };

// // /**
// //  * Get booking details for registration (public)
// //  * GET /api/feedback/booking-details/:bookingId
// //  *
// //  * NOTE: `plan_id` / `plan_price` here still come from legacy columns on
// //  * book_demo (PLAN_DISPLAY fallback map). Per the subscription/Stripe
// //  * architecture doc, this should eventually read from `subscriptions` +
// //  * `subscription_plans` instead — left untouched for now since that's part
// //  * of the payment-phase refactor, not this feedback pass.
// //  */
// // exports.getBookingDetails = async (req, res) => {
// //     try {
// //         const { bookingId } = req.params;

// //         if (!bookingId) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Booking ID is required'
// //             });
// //         }

// //         const parsedId = parseInt(bookingId);

// //         const booking = await BookDemoService.getBookingById(parsedId);

// //         if (!booking) {
// //             return res.status(404).json({
// //                 success: false,
// //                 error: 'Booking not found'
// //             });
// //         }

// //         // Block re-registration through this endpoint too — if a users row
// //         // already exists for this booking, there's nothing left to register.
// //         const existingUser = await BookDemoService.getUserByDemoRequestId(parsedId);
// //         if (existingUser) {
// //             return res.status(410).json({
// //                 success: false,
// //                 code: 'LINK_ALREADY_USED',
// //                 error: 'This booking has already been registered'
// //             });
// //         }

// //         // Prefer the plan_id set at checkout time (multi-plan aware) over the
// //         // legacy free-text note parsing, which only ever applied to the old
// //         // static-payment flow and always assumed a single Monthly plan.
// //         const PLAN_DISPLAY = {
// //             monthly: { name: 'Monthly', price: 299 },
// //             quarterly: { name: 'Quarterly', price: 897 },
// //             yearly: { name: 'Yearly', price: 3588 }
// //         };

// //         let planName = 'Monthly';
// //         let planPrice = booking.plan_price || 299;

// //         if (booking.plan_id && PLAN_DISPLAY[booking.plan_id]) {
// //             planName = PLAN_DISPLAY[booking.plan_id].name;
// //             planPrice = booking.plan_price || PLAN_DISPLAY[booking.plan_id].price;
// //         } else if (booking.notes && booking.notes.includes('[Payment]')) {
// //             // legacy fallback for old static-payment bookings only
// //             const noteLines = booking.notes.split('\n');
// //             const paymentNote = noteLines.find(line => line.includes('[Payment]'));
// //             if (paymentNote) {
// //                 const planMatch = paymentNote.match(/Plan: (\w+)/);
// //                 if (planMatch) planName = planMatch[1];
// //             }
// //         }

// //         res.json({
// //             success: true,
// //             data: {
// //                 id: booking.id,
// //                 full_name: booking.full_name,
// //                 email: booking.email,
// //                 hospital_name: booking.hospital_name,
// //                 phone: booking.hospital_phone || '',
// //                 payment_status: booking.payment_status,
// //                 plan_id: booking.plan_id || 'monthly',
// //                 plan_name: planName,
// //                 plan_price: planPrice
// //             }
// //         });

// //     } catch (error) {
// //         logger.error('Error getting booking details:', error);
// //         res.status(500).json({
// //             success: false,
// //             error: 'Failed to get booking details'
// //         });
// //     }
// // };


// const BookDemoService = require('../services/bookDemoService');
// const FeedbackService = require('../services/feedbackService');
// const PaymentService = require('../services/paymentService');   // NEW
// const logger = require('../utils/logger');

// // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// /**
//  * Get feedback form data (public)
//  * GET /api/feedback/feedback-form/:token
//  */
// exports.getFeedbackForm = async (req, res) => {
//     try {
//         const { token } = req.params;

//         if (!token) {
//             return res.status(400).json({ success: false, error: 'Invalid feedback link' });
//         }

//         const booking = await FeedbackService.getBookingByFeedbackToken(token);

//         if (!booking) {
//             return res.status(404).json({ success: false, error: 'Invalid feedback link' });
//         }

//         const bookingId = booking.id;

//         // ── STATE 1: Already registered → link is permanently spent ──
//         const existingUser = await BookDemoService.getUserByDemoRequestId(bookingId);
//         if (existingUser) {
//             return res.status(410).json({
//                 success: false,
//                 code: 'LINK_ALREADY_USED',
//                 error: 'This link has already been used'
//             });
//         }

//         // ── STATE 2: Paid, not yet registered → skip everything, go to registration ──
//         //
//         // CHANGED: this used to read booking.payment_status ('completed') off
//         // book_demo — but the new Stripe flow never writes that column at all,
//         // it only ever writes to `subscriptions`. Checking book_demo here meant
//         // this branch could never fire for a real payment. `subscriptions` is
//         // now the only source of truth for "did this booking pay."
//         //
//         // A subscription counts as "paid" if it exists and isn't stuck in a
//         // pre-payment or dead state. Card charges on Checkout are normally
//         // synchronous, so this is 'active' almost immediately after checkout —
//         // 'incomplete' only lingers for delayed payment methods.
//         const subscription = await PaymentService.getPaymentStatus(bookingId);
//         const DEAD_OR_UNPAID_STATUSES = ['incomplete', 'incomplete_expired', 'canceled', 'unpaid'];
//             const hasPaid = subscription && !DEAD_OR_UNPAID_STATUSES.includes(subscription.subscription_status);

//         if (hasPaid) {
//             return res.json({
//                 success: true,
//                 data: {
//                     bookingId: booking.id,
//                     fullName: booking.full_name,
//                     email: booking.email,
//                     hospitalName: booking.hospital_name,
//                     action: 'GO_TO_REGISTRATION'
//                 }
//             });
//         }

//         const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);

//         // ── STATE 3: Feedback submitted + interested, still unpaid → go straight to pricing ──
//         if (existingFeedback && existingFeedback.interested_in_service === true) {
//             return res.json({
//                 success: true,
//                 data: {
//                     bookingId: booking.id,
//                     fullName: booking.full_name,
//                     email: booking.email,
//                     hospitalName: booking.hospital_name,
//                     action: 'GO_TO_PRICING'
//                 }
//             });
//         }

//         // ── STATE 4: Feedback submitted, not interested → done, nothing more to do ──
//         if (existingFeedback && existingFeedback.interested_in_service === false) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Feedback already submitted for this booking'
//             });
//         }

//         // ── STATE 5: Nothing submitted yet → normal form, unless the link expired ──
//         if (booking.feedback_token_expires_at && new Date(booking.feedback_token_expires_at) < new Date()) {
//             return res.status(410).json({
//                 success: false,
//                 code: 'LINK_EXPIRED',
//                 error: 'This feedback link has expired'
//             });
//         }

//         return res.json({
//             success: true,
//             data: {
//                 bookingId: booking.id,
//                 fullName: booking.full_name,
//                 email: booking.email,
//                 hospitalName: booking.hospital_name,
//                 action: 'SHOW_FORM'
//             }
//         });

//     } catch (error) {
//         logger.error('Error getting feedback form:', error);
//         res.status(500).json({ success: false, error: 'Failed to load feedback form' });
//     }
// };

// /**
//  * Submit feedback (public)
//  * POST /api/feedback/feedback-submit
//  * — unchanged, not part of the payment refactor
//  */
// exports.submitFeedback = async (req, res) => {
//     try {
//         const {
//             bookingId,
//             rating,
//             wouldRecommend,
//             interestedInService,
//             feedbackText,
//             additionalComments
//         } = req.body;

//         if (!bookingId) {
//             return res.status(400).json({ success: false, error: 'Booking ID is required' });
//         }
//         if (!rating || rating < 1 || rating > 5) {
//             return res.status(400).json({ success: false, error: 'Valid rating (1-5) is required' });
//         }
//         if (wouldRecommend === undefined || wouldRecommend === null) {
//             return res.status(400).json({ success: false, error: 'Please indicate if you would recommend us' });
//         }
//         if (interestedInService === undefined || interestedInService === null) {
//             return res.status(400).json({ success: false, error: 'Please indicate if you are interested in our service' });
//         }

//         const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
//         const userAgent = req.headers['user-agent'] || null;

//         const result = await FeedbackService.submitFeedback({
//             bookingId,
//             rating,
//             wouldRecommend,
//             interestedInService,
//             feedbackText: feedbackText || null,
//             additionalComments: additionalComments || null,
//             ipAddress,
//             userAgent
//         });

//         res.json({
//             success: true,
//             message: 'Feedback submitted successfully! Thank you!',
//             data: result
//         });

//     } catch (error) {
//         logger.error('Error submitting feedback:', error);

//         if (error.message === 'Booking not found') {
//             return res.status(404).json({ success: false, error: 'Booking not found' });
//         }
//         if (error.message === 'Feedback already submitted') {
//             return res.status(400).json({ success: false, error: 'Feedback already submitted for this booking' });
//         }
//         res.status(500).json({ success: false, error: 'Failed to submit feedback' });
//     }
// };

// /**
//  * Check if user can view pricing (public)
//  * GET /api/feedback/pricing-access/:bookingId
//  * — unchanged
//  */
// exports.checkPricingAccess = async (req, res) => {
//     try {
//         const { bookingId } = req.params;
//         if (!bookingId) {
//             return res.status(400).json({ success: false, error: 'Booking ID is required' });
//         }
//         const result = await FeedbackService.canViewPricing(parseInt(bookingId));
//         res.json({ success: true, data: result });
//     } catch (error) {
//         logger.error('Error checking pricing access:', error);
//         res.status(500).json({ success: false, error: 'Failed to check pricing access' });
//     }
// };

// /**
//  * Get booking details for registration (public)
//  * GET /api/feedback/booking-details/:bookingId
//  *
//  * CHANGED: plan info now comes from the real `subscriptions` +
//  * `subscription_plans` join (via PaymentService.getPaymentStatus) instead
//  * of legacy book_demo.plan_id/plan_price + free-text note parsing. This
//  * endpoint is only ever reached via GO_TO_REGISTRATION, which — after the
//  * fix above — already confirmed a paid subscription exists, so the
//  * `!subscription` branch below should be rare (only a brief race right
//  * after checkout, before the webhook has landed).
//  */
// exports.getBookingDetails = async (req, res) => {
//     try {
//         const { bookingId } = req.params;
//         if (!bookingId) {
//             return res.status(400).json({ success: false, error: 'Booking ID is required' });
//         }

//         const parsedId = parseInt(bookingId);
//         const booking = await BookDemoService.getBookingById(parsedId);

//         if (!booking) {
//             return res.status(404).json({ success: false, error: 'Booking not found' });
//         }

//         const existingUser = await BookDemoService.getUserByDemoRequestId(parsedId);
//         if (existingUser) {
//             return res.status(410).json({
//                 success: false,
//                 code: 'LINK_ALREADY_USED',
//                 error: 'This booking has already been registered'
//             });
//         }

//         // interval is stored as '30 days' / '90 days' / '365 days' on
//         // subscription_plans — this is just a display label, not used for
//         // any date math or charge logic.
//         const INTERVAL_DISPLAY_NAME = {
//             '30 days': 'Monthly',
//             '90 days': 'Quarterly',
//             '365 days': 'Yearly'
//         };

//         const subscription = await PaymentService.getPaymentStatus(parsedId);

//         let subscriptionPlanId = null;
//         let planName = 'Monthly';
//         let planPrice = null;
//         let interval = null;

//         if (subscription) {
//             subscriptionPlanId = subscription.subscriptionPlanId;
//             planPrice = subscription.price;
//             interval = subscription.interval;
//             planName = INTERVAL_DISPLAY_NAME[subscription.interval] || subscription.planDetails || 'Monthly';
//         } else {
//             // Shouldn't normally happen post-fix (getFeedbackForm already
//             // gated on a paid subscription existing) — log it so a genuine
//             // webhook-lag race is visible instead of silently defaulting.
//             logger.warn(`getBookingDetails: no subscription found for booking ${parsedId} despite GO_TO_REGISTRATION being reachable`);
//         }

//         res.json({
//             success: true,
//             data: {
//                 id: booking.id,
//                 full_name: booking.full_name,
//                 email: booking.email,
//                 hospital_name: booking.hospital_name,
//                 phone: booking.hospital_phone || '',
//                 subscription_plan_id: subscriptionPlanId,
//                 plan_name: planName,
//                 plan_price: planPrice,
//                 interval: interval
//             }
//         });

//     } catch (error) {
//         logger.error('Error getting booking details:', error);
//         res.status(500).json({ success: false, error: 'Failed to get booking details' });
//     }
// };

const BookDemoService = require('../services/bookDemoService');
const FeedbackService = require('../services/feedbackService');
const PaymentService = require('../services/paymentService');
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
            return res.status(400).json({ success: false, error: 'Invalid feedback link' });
        }

        const booking = await FeedbackService.getBookingByFeedbackToken(token);

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Invalid feedback link' });
        }

        const bookingId = booking.id;

        // ── STATE 1: Already registered → link is permanently spent ──
        const existingUser = await BookDemoService.getUserByDemoRequestId(bookingId);
        if (existingUser) {
            return res.status(410).json({
                success: false,
                code: 'LINK_ALREADY_USED',
                error: 'This link has already been used'
            });
        }

        // ── STATE 2: Paid, not yet registered → skip everything, go to registration ──
        const subscription = await PaymentService.getPaymentStatus(bookingId);
        const DEAD_OR_UNPAID_STATUSES = ['incomplete', 'incomplete_expired', 'canceled', 'unpaid'];
        // ✅ FIX: Correct field name - subscription_status (with underscore)
        const hasPaid = subscription && !DEAD_OR_UNPAID_STATUSES.includes(subscription.subscription_status);

        if (hasPaid) {
            return res.json({
                success: true,
                data: {
                    bookingId: booking.id,
                    fullName: booking.full_name,
                    email: booking.email,
                    hospitalName: booking.hospital_name,
                    action: 'GO_TO_REGISTRATION'
                }
            });
        }

        const existingFeedback = await FeedbackService.getFeedbackByBookingId(bookingId);

        // ── STATE 3: Feedback submitted + interested, still unpaid → go straight to pricing ──
        if (existingFeedback && existingFeedback.interested_in_service === true) {
            return res.json({
                success: true,
                data: {
                    bookingId: booking.id,
                    fullName: booking.full_name,
                    email: booking.email,
                    hospitalName: booking.hospital_name,
                    action: 'GO_TO_PRICING'
                }
            });
        }

        // ── STATE 4: Feedback submitted, not interested → done, nothing more to do ──
        if (existingFeedback && existingFeedback.interested_in_service === false) {
            return res.status(400).json({
                success: false,
                error: 'Feedback already submitted for this booking'
            });
        }

        // ── STATE 5: Nothing submitted yet → normal form, unless the link expired ──
        if (booking.feedback_token_expires_at && new Date(booking.feedback_token_expires_at) < new Date()) {
            return res.status(410).json({
                success: false,
                code: 'LINK_EXPIRED',
                error: 'This feedback link has expired'
            });
        }

        return res.json({
            success: true,
            data: {
                bookingId: booking.id,
                fullName: booking.full_name,
                email: booking.email,
                hospitalName: booking.hospital_name,
                action: 'SHOW_FORM'
            }
        });

    } catch (error) {
        logger.error('Error getting feedback form:', error);
        res.status(500).json({ success: false, error: 'Failed to load feedback form' });
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

        if (!bookingId) {
            return res.status(400).json({ success: false, error: 'Booking ID is required' });
        }
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'Valid rating (1-5) is required' });
        }
        if (wouldRecommend === undefined || wouldRecommend === null) {
            return res.status(400).json({ success: false, error: 'Please indicate if you would recommend us' });
        }
        if (interestedInService === undefined || interestedInService === null) {
            return res.status(400).json({ success: false, error: 'Please indicate if you are interested in our service' });
        }

        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;

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
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        if (error.message === 'Feedback already submitted') {
            return res.status(400).json({ success: false, error: 'Feedback already submitted for this booking' });
        }
        res.status(500).json({ success: false, error: 'Failed to submit feedback' });
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
            return res.status(400).json({ success: false, error: 'Booking ID is required' });
        }
        const result = await FeedbackService.canViewPricing(parseInt(bookingId));
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error checking pricing access:', error);
        res.status(500).json({ success: false, error: 'Failed to check pricing access' });
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
            return res.status(400).json({ success: false, error: 'Booking ID is required' });
        }

        const parsedId = parseInt(bookingId);
        const booking = await BookDemoService.getBookingById(parsedId);

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const existingUser = await BookDemoService.getUserByDemoRequestId(parsedId);
        if (existingUser) {
            return res.status(410).json({
                success: false,
                code: 'LINK_ALREADY_USED',
                error: 'This booking has already been registered'
            });
        }

        // interval is stored as '30 days' / '90 days' / '365 days' on subscription_plans
        const INTERVAL_DISPLAY_NAME = {
            '30 days': 'Monthly',
            '90 days': 'Quarterly',
            '365 days': 'Yearly'
        };

        const subscription = await PaymentService.getPaymentStatus(parsedId);

        let subscriptionPlanId = null;
        let planName = 'Monthly';
        let planPrice = null;
        let interval = null;

        if (subscription) {
            subscriptionPlanId = subscription.subscriptionPlanId;
            planPrice = subscription.price;
            interval = subscription.interval;
            planName = INTERVAL_DISPLAY_NAME[subscription.interval] || subscription.planDetails || 'Monthly';
        } else {
            // ✅ FIX: Fallback to legacy book_demo fields if subscription not found
            logger.warn(`getBookingDetails: no subscription found for booking ${parsedId}, using legacy fields`);
            
            if (booking.plan_id && booking.plan_price) {
                // Convert 'monthly' → 'Monthly', 'quarterly' → 'Quarterly', 'yearly' → 'Yearly'
                planName = booking.plan_id.charAt(0).toUpperCase() + booking.plan_id.slice(1);
                planPrice = booking.plan_price;
                // Map legacy plan_id to interval format
                interval = booking.plan_id === 'monthly' ? '30 days' : 
                           booking.plan_id === 'quarterly' ? '90 days' : 
                           booking.plan_id === 'yearly' ? '365 days' : '30 days';
                
                logger.info(`Using legacy plan data: ${planName}, $${planPrice}, ${interval}`);
            } else {
                // Ultimate fallback - default to Monthly
                logger.warn(`No plan data found for booking ${parsedId}, using defaults`);
                planName = 'Monthly';
                planPrice = 299;
                interval = '30 days';
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
                subscription_plan_id: subscriptionPlanId,
                plan_name: planName,
                plan_price: planPrice,
                interval: interval
            }
        });

    } catch (error) {
        logger.error('Error getting booking details:', error);
        res.status(500).json({ success: false, error: 'Failed to get booking details' });
    }
};