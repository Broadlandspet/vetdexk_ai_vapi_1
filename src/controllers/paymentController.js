// const BookDemoService = require('../services/bookDemoService');
// const PaymentService = require('../services/paymentService');
// const logger = require('../utils/logger');

// // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// /**
//  * Record a static payment (simplified, no external gateway)
//  * POST /api/payments/submit
//  */
// exports.submitPayment = async (req, res) => {
//     try {
//         const { 
//             bookingId, 
//             planId, 
//             amount, 
//             currency 
//         } = req.body;

//         // Validate required fields
//         if (!bookingId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Booking ID is required'
//             });
//         }

//         if (!planId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Plan ID is required'
//             });
//         }

//         // Check if booking exists
//         const booking = await BookDemoService.getBookingById(bookingId);
//         if (!booking) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Booking not found'
//             });
//         }

//         // Check if payment already completed
//         if (booking.payment_status === 'completed') {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Payment already completed for this booking'
//             });
//         }

//         // Record static payment
//         const result = await PaymentService.recordStaticPayment({
//             bookingId,
//             planId,
//             amount: amount || 0,
//             currency: currency || 'USD'
//         });

//         res.json({
//             success: true,
//             message: 'Payment recorded successfully! Please complete your registration.',
//             data: {
//                 bookingId: bookingId,
//                 planId: planId,
//                 paymentStatus: 'completed',
//                 status: 'completed'
//             }
//         });

//     } catch (error) {
//         logger.error('Error submitting payment:', error);

//         if (error.message === 'Booking not found') {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Booking not found'
//             });
//         }

//         res.status(500).json({
//             success: false,
//             error: 'Failed to submit payment'
//         });
//     }
// };

// /**
//  * Get payment status with booking details
//  * GET /api/payments/status/:bookingId
//  */
// exports.getPaymentStatus = async (req, res) => {
//     try {
//         const { bookingId } = req.params;

//         if (!bookingId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Booking ID is required'
//             });
//         }

//         const result = await PaymentService.getPaymentStatus(parseInt(bookingId));

//         if (!result) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Booking not found'
//             });
//         }

//         res.json({
//             success: true,
//             data: result
//         });

//     } catch (error) {
//         logger.error('Error checking payment status:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to check payment status'
//         });
//     }
// };

// /**
//  * Update payment status (admin use)
//  * PUT /api/payments/status/:bookingId
//  */
// exports.updatePaymentStatus = async (req, res) => {
//     try {
//         const { bookingId } = req.params;
//         const { status } = req.body;

//         if (!bookingId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Booking ID is required'
//             });
//         }

//         if (!status) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Status is required'
//             });
//         }

//         const booking = await PaymentService.updatePaymentStatus(bookingId, status);

//         res.json({
//             success: true,
//             message: `Payment status updated to '${status}'`,
//             data: booking
//         });

//     } catch (error) {
//         logger.error('Error updating payment status:', error);

//         if (error.message.includes('Invalid payment status')) {
//             return res.status(400).json({
//                 success: false,
//                 error: error.message
//             });
//         }

//         res.status(500).json({
//             success: false,
//             error: 'Failed to update payment status'
//         });
//     }
// };



// exports.createCheckoutSession = async (req, res) => {
//     try {
//         const { bookingId, planId } = req.body;   // was just { bookingId }

//         if (!bookingId) {
//             return res.status(400).json({ success: false, error: 'Booking ID is required' });
//         }

//         const booking = await BookDemoService.getBookingById(bookingId);
//         if (!booking) {
//             return res.status(404).json({ success: false, error: 'Booking not found' });
//         }

//         if (booking.payment_status === 'completed') {
//             return res.status(400).json({ success: false, error: 'Payment already completed for this booking' });
//         }

//         const result = await PaymentService.createCheckoutSession(bookingId, planId || 'monthly');

//         res.json({
//             success: true,
//             data: { checkoutUrl: result.checkoutUrl }
//         });

//     } catch (error) {
//         logger.error('Error creating checkout session:', error);

//         if (error.message === 'Booking not found') {
//             return res.status(404).json({ success: false, error: 'Booking not found' });
//         }
//         if (error.message.includes('already completed')) {
//             return res.status(400).json({ success: false, error: error.message });
//         }
//         if (error.message.startsWith('Invalid plan')) {
//             return res.status(400).json({ success: false, error: error.message });
//         }

//         res.status(500).json({ success: false, error: 'Could not start checkout. Please try again.' });
//     }
// };

const BookDemoService = require('../services/bookDemoService');
const PaymentService = require('../services/paymentService');
const SubscriptionPlanService = require('../services/subscriptionPlanService');
const logger = require('../utils/logger');

/**
 * GET /api/subscription-plans
 * Public — active plans only, no Stripe internals exposed.
 */
exports.getActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlanService.getActivePlans();
    res.json({
      success: true,
      data: plans.map(p => ({
        subscriptionPlanId: p.subscriptionPlanId,
        subscriptionDetails: p.subscriptionDetails,
        price: p.price,
        interval: p.interval
      }))
    });
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    res.status(500).json({ success: false, error: 'Could not load pricing plans' });
  }
};

/**
 * POST /api/payments/checkout
 * Body: { bookingId, subscriptionPlanId }
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { bookingId, subscriptionPlanId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Booking ID is required' });
    }
    if (!subscriptionPlanId) {
      return res.status(400).json({ success: false, error: 'subscriptionPlanId is required' });
    }
    const booking = await BookDemoService.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (booking.payment_status === 'completed') {
      return res.status(400).json({ success: false, error: 'Payment already completed for this booking' });
    }

    const result = await PaymentService.createCheckoutSession(bookingId, subscriptionPlanId);
    res.json({ success: true, data: { checkoutUrl: result.checkoutUrl } });

  } catch (error) {
    logger.error('Error creating checkout session:', error);

    if (error.message === 'Booking not found') {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (error.message.includes('already completed')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message.startsWith('Invalid plan')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Could not start checkout. Please try again.' });
  }
};

/**
 * GET /api/payments/status/:bookingId
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Booking ID is required' });
    }

    const result = await PaymentService.getPaymentStatus(parseInt(bookingId, 10));
    if (!result) {
      return res.status(404).json({ success: false, error: 'No subscription found for this booking' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error checking payment status:', error);
    res.status(500).json({ success: false, error: 'Failed to check payment status' });
  }
};

