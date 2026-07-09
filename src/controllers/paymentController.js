const BookDemoService = require('../services/bookDemoService');
const PaymentService = require('../services/paymentService');
const logger = require('../utils/logger');

class PaymentController {

    // Simplified: Just mark payment as completed (static payment)
    static async submitPayment(req, res) {
        try {
            const { 
                bookingId, 
                planId, 
                amount, 
                currency 
            } = req.body;

            // Validate required fields
            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    error: 'Booking ID is required'
                });
            }

            if (!planId) {
                return res.status(400).json({
                    success: false,
                    error: 'Plan ID is required'
                });
            }

            // Check if booking exists
            const booking = await BookDemoService.getBookingById(bookingId);
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            // Check if payment already completed
            if (booking.payment_status === 'completed') {
                return res.status(400).json({
                    success: false,
                    error: 'Payment already completed for this booking'
                });
            }

            // Record static payment
            const result = await PaymentService.recordStaticPayment({
                bookingId,
                planId,
                amount: amount || 0,
                currency: currency || 'USD'
            });

            res.json({
                success: true,
                message: 'Payment recorded successfully! Please complete your registration.',
                data: {
                    bookingId: bookingId,
                    planId: planId,
                    paymentStatus: 'completed',
                    status: 'completed'
                }
            });

        } catch (error) {
            logger.error('Error submitting payment:', error);
            
            if (error.message === 'Booking not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to submit payment'
            });
        }
    }

    // Check payment status for a booking
    static async checkPaymentStatus(req, res) {
        try {
            const { bookingId } = req.params;

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    error: 'Booking ID is required'
                });
            }

            const result = await PaymentService.getPaymentStatus(bookingId);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error checking payment status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check payment status'
            });
        }
    }

    // Update payment status (for admin use)
    static async updatePaymentStatus(req, res) {
        try {
            const { bookingId } = req.params;
            const { status } = req.body;

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    error: 'Booking ID is required'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Status is required'
                });
            }

            const booking = await PaymentService.updatePaymentStatus(bookingId, status);

            res.json({
                success: true,
                message: `Payment status updated to '${status}'`,
                data: booking
            });

        } catch (error) {
            logger.error('Error updating payment status:', error);
            
            if (error.message.includes('Invalid payment status')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to update payment status'
            });
        }
    }
}

module.exports = PaymentController;