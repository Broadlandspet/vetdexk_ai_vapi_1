const BookDemoService = require('../services/bookDemoService');
const FeedbackService = require('../services/feedbackService'); 
const logger = require('../utils/logger');

class BookDemoController {

    // Create a new booking
    static async createBooking(req, res) {
        try {
            const {
                fullName,
                email,
                hospitalName,
                hospitalAddress,
                hospitalEmail,
                hospitalPhone,
                notes = null
            } = req.body;

            // Validate required fields
            if (!fullName || !email || !hospitalName || !hospitalAddress || !hospitalEmail || !hospitalPhone) {
                return res.status(400).json({
                    success: false,
                    error: 'All fields are required'
                });
            }

            // Validate email format
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email address'
                });
            }
            if (!emailPattern.test(hospitalEmail)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid hospital email address'
                });
            }

            // Validate phone
            const phonePattern = /^[0-9+\-\s()]{7,20}$/;
            if (!phonePattern.test(hospitalPhone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone number'
                });
            }

            const result = await BookDemoService.createBooking({
                fullName,
                email,
                hospitalName,
                hospitalAddress,
                hospitalEmail,
                hospitalPhone,
                notes
            });

            res.json({
                success: true,
                message: 'Demo request submitted successfully. Please check your email for the meeting booking link.',
                data: result.data
            });

        } catch (error) {
            logger.error('Error creating booking:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create booking. Please try again.'
            });
        }
    }

    // Get all bookings for Super Admin dashboard
    static async getAllBookings(req, res) {
        try {
            // Service returns array directly
            const bookings = await BookDemoService.getAllBookings();
            
            // Calculate stats
            const stats = {
                total: bookings.length,
                new: bookings.filter(b => b.status === 'new').length,
                scheduled: bookings.filter(b => b.status === 'scheduled').length,
                contacted: bookings.filter(b => b.status === 'contacted').length,
                completed: bookings.filter(b => b.status === 'completed').length,
            };
            
            res.json({
                success: true,
                data: bookings,
                stats: stats,
                count: bookings.length,
                message: 'Bookings fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching bookings:', error);
            logger.error('Error fetching bookings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch bookings'
            });
        }
    }

    // Get booking by ID
    static async getBookingById(req, res) {
        try {
            const { id } = req.params;
            const booking = await BookDemoService.getBookingById(id);
            
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            res.json({
                success: true,
                data: booking
            });
        } catch (error) {
            logger.error('Error fetching booking:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch booking'
            });
        }
    }

    // Delete booking
    static async deleteBooking(req, res) {
        try {
            const { id } = req.params;
            await BookDemoService.deleteBooking(id);
            
            res.json({
                success: true,
                message: 'Booking deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting booking:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete booking'
            });
        }
    }

    // Get bookings by email
    static async getBookingsByEmail(req, res) {
        try {
            const { email } = req.params;
            const bookings = await BookDemoService.getBookingsByEmail(email);
            
            res.json({
                success: true,
                data: bookings,
                count: bookings.length
            });
        } catch (error) {
            logger.error('Error fetching bookings by email:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch bookings'
            });
        }
    }

    // Get booking statistics
    static async getBookingStats(req, res) {
        try {
            const stats = await BookDemoService.getBookingStats();
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error fetching booking stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch booking statistics'
            });
        }
    }

    // Handle Calendly Webhook
    static async handleCalendlyWebhook(req, res) {
        try {
            await BookDemoService.processCalendlyWebhook(req.body);

            return res.status(200).json({
                success: true,
                message: "Webhook processed successfully"
            });

        } catch (error) {
            logger.error("Calendly webhook error:", error);

            return res.status(500).json({
                success: false,
                error: "Failed to process webhook"
            });
        }
    }

  // Update booking status - Clean controller without duplicate logic
    static async updateBookingStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['new', 'contacted', 'scheduled', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: new, contacted, scheduled, completed'
            });
        }

        // Service handles everything including feedback email
        const booking = await BookDemoService.updateBookingStatus(id, status);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        res.json({
            success: true,
            message: 'Booking status updated successfully',
            data: booking
        });
    } catch (error) {
        logger.error('Error updating booking status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update booking status'
        });
    }
    }


}








module.exports = BookDemoController;