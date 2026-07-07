const express = require('express');
const router = express.Router();
const BookDemoController = require('../controllers/bookDemoController');
const { verifyToken, requireRole } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES (no authentication required)
// ============================================

// POST /api/demo - Create a new demo booking (ANYONE can book)
router.post('/', BookDemoController.createBooking);

router.post(
    '/calendly/webhook',
    BookDemoController.handleCalendlyWebhook
);
// ============================================
// ADMIN ROUTES (Super Admin only)
// ============================================

// GET /api/demo/bookings - Get all bookings
router.get('/bookings', verifyToken, requireRole(['superadmin']), BookDemoController.getAllBookings);

// GET /api/demo/stats - Get booking statistics
router.get('/stats', verifyToken, requireRole(['superadmin']), BookDemoController.getBookingStats);

// GET /api/demo/email/:email - Get bookings by email
router.get('/email/:email', verifyToken, requireRole(['superadmin']), BookDemoController.getBookingsByEmail);

// GET /api/demo/:id - Get a specific booking
router.get('/:id', verifyToken, requireRole(['superadmin']), BookDemoController.getBookingById);

// PUT /api/demo/booking/:id/status - Update booking status
router.put('/booking/:id/status', verifyToken, requireRole(['superadmin']), BookDemoController.updateBookingStatus);

// DELETE /api/demo/:id - Delete a booking
router.delete('/:id', verifyToken, requireRole(['superadmin']), BookDemoController.deleteBooking);

module.exports = router;