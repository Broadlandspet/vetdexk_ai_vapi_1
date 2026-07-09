const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class PaymentService {

    // Record static payment (no actual payment processing)
    static async recordStaticPayment(data) {
        try {
            const {
                bookingId,
                planId,
                amount,
                currency
            } = data;

            // Start transaction
            await executeQuery('BEGIN');

            try {
                // Generate static transaction ID
                const transactionId = `static_${Date.now()}_${bookingId}`;

                // Update booking with payment status
                const result = await executeQuery(
                    `
                    UPDATE book_demo 
                    SET 
                        payment_status = 'completed',
                        status = 'payment_completed',
                        notes = COALESCE(notes, '') || $1,
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *
                    `,
                    [
                        `\n[Payment] Plan: ${planId}, Amount: ${amount} ${currency}, Transaction: ${transactionId}, Date: ${new Date().toISOString()}`,
                        bookingId
                    ]
                );

                if (result.rows.length === 0) {
                    throw new Error('Booking not found');
                }

                await executeQuery('COMMIT');

                logger.info(`✅ Static payment recorded for booking #${bookingId} - Plan: ${planId}`);
                logger.info(`   Payment Status: completed, Booking Status: payment_completed`);

                return {
                    success: true,
                    bookingId: bookingId,
                    planId: planId,
                    transactionId: transactionId,
                    booking: result.rows[0]
                };

            } catch (error) {
                await executeQuery('ROLLBACK');
                throw error;
            }

        } catch (error) {
            logger.error('Error recording static payment:', error);
            throw error;
        }
    }

    // Check payment status
    static async getPaymentStatus(bookingId) {
        try {
            const result = await executeQuery(
                `
                SELECT 
                    id,
                    status,
                    payment_status,
                    notes,
                    updated_at
                FROM book_demo 
                WHERE id = $1
                `,
                [bookingId]
            );
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const booking = result.rows[0];
            
            // Check if payment was completed
            const isPaid = booking.payment_status === 'completed';
            
            // Extract payment info from notes if available
            let paymentInfo = null;
            if (booking.notes && booking.notes.includes('[Payment]')) {
                const noteLines = booking.notes.split('\n');
                const paymentNote = noteLines.find(line => line.includes('[Payment]'));
                if (paymentNote) {
                    paymentInfo = paymentNote;
                }
            }
            
            return {
                bookingId: booking.id,
                isPaid,
                paymentStatus: booking.payment_status || 'not_started',
                bookingStatus: booking.status,
                paymentInfo,
                updatedAt: booking.updated_at
            };
            
        } catch (error) {
            logger.error('Error fetching payment status:', error);
            return null;
        }
    }

    // Update payment status
    static async updatePaymentStatus(bookingId, status) {
        try {
            const validStatuses = ['pending', 'completed', 'failed', 'not_started'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid payment status. Must be one of: pending, completed, failed, not_started');
            }

            const result = await executeQuery(
                `
                UPDATE book_demo 
                SET 
                    payment_status = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [status, bookingId]
            );

            if (result.rows.length === 0) {
                throw new Error('Booking not found');
            }

            logger.info(`✅ Payment status updated to '${status}' for booking #${bookingId}`);

            return result.rows[0];

        } catch (error) {
            logger.error('Error updating payment status:', error);
            throw error;
        }
    }
}

module.exports = PaymentService;