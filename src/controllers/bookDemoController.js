
const BookDemoService = require('../services/bookDemoService');
const FeedbackService = require('../services/feedbackService');
const logger = require('../utils/logger');
const env = require('../config/env');

// ─── HELPER: Render Error Page ──────────────────────────────────────────────────

function renderErrorPage(title, message, details = '') {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f0f4f8;
            padding: 20px;
        }
        .card {
            background: white;
            padding: 48px 40px;
            border-radius: 16px;
            max-width: 520px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            border: 1px solid #e7ebef;
        }
        .icon { font-size: 48px; margin-bottom: 16px; display: block; }
        h1 { 
            color: #14181f; 
            margin-bottom: 12px; 
            font-size: 24px;
            font-weight: 700;
            line-height: 1.3;
        }
        p { 
            color: #64748b; 
            margin-bottom: 8px; 
            font-size: 16px;
            line-height: 1.6;
        }
        .sub { color: #94a3b8; font-size: 14px; margin-top: 4px; }
        .btn {
            display: inline-block;
            margin-top: 24px;
            padding: 12px 32px;
            background: #ff7a1a;
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            border: none;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover { background: #e86a0e; }
        .details {
            margin-top: 16px;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e7ebef;
            font-size: 13px;
            color: #4b5563;
        }
        .details a { color: #0c8ce0; text-decoration: none; }
        .details a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="card">
        <span class="icon">${title === 'Link Already Used' ? '🔒' : title === 'Link Expired' ? '⏰' : title === 'Link Not Found' ? '🔍' : '⚠️'}</span>
        <h1>${title}</h1>
        <p>${message}</p>
        ${details ? `<p class="sub">${details}</p>` : ''}
        <div class="details">
            <strong>Need help?</strong> Contact us at <a href="mailto:support@vetdesk.ai">support@vetdesk.ai</a>
        </div>
        <a href="${env.FRONTEND_URL || '/'}" class="btn">Return to Home</a>
    </div>
</body>
</html>
    `;
}

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

// /**
//  * Create a new booking (public)
//  * POST /api/demo
//  */
// exports.createBooking = async (req, res) => {
//     try {
//         const {
//             fullName,
//             email,
//             hospitalName,
//             hospitalAddress,
//             hospitalEmail,
//             hospitalPhone,
//             notes = null
//         } = req.body;

//         // Validate required fields
//         if (!fullName || !email || !hospitalName || !hospitalAddress || !hospitalEmail || !hospitalPhone) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'All fields are required'
//             });
//         }

//         // Validate email format
//         const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailPattern.test(email)) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invalid email address'
//             });
//         }
//         if (!emailPattern.test(hospitalEmail)) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invalid hospital email address'
//             });
//         }

//         // Validate phone
//         const phonePattern = /^[0-9+\-\s()]{7,20}$/;
//         if (!phonePattern.test(hospitalPhone)) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invalid phone number'
//             });
//         }

//         const result = await BookDemoService.createBooking({
//             fullName,
//             email,
//             hospitalName,
//             hospitalAddress,
//             hospitalEmail,
//             hospitalPhone,
//             notes
//         });

//         res.json({
//             success: true,
//             message: 'Demo request submitted successfully. Please check your email for the meeting booking link.',
//             data: result.data
//         });

//     } catch (error) {
//         logger.error('Error creating booking:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to create booking. Please try again.'
//         });
//     }
// };



function normalizePhone(phone) {
    if (!phone) return phone;
    const trimmed = phone.trim();
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/\D/g, ''); // strip everything but digits
    return hasPlus ? `+${digitsOnly}` : digitsOnly;
}
 
exports.createBooking = async (req, res) => {
    try {
        const {
            fullName,
            email,
            hospitalName,
            hospitalAddress,
            hospitalEmail,
            notes = null
        } = req.body;
 
        let { hospitalPhone } = req.body;
 
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
 
        // Validate raw phone format first (before normalizing)
        // Allows digits, +, -, spaces, parens — formatted input like "+1 (555) 759-7861"
        const phonePattern = /^[0-9+\-\s()]{7,20}$/;
        if (!phonePattern.test(hospitalPhone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number'
            });
        }
 
        // Normalize phone: strip formatting, keep leading + if present
        hospitalPhone = normalizePhone(hospitalPhone);
 
        // Require a country code (must start with +)
        if (!hospitalPhone.startsWith('+')) {
            return res.status(400).json({
                success: false,
                error: 'Phone number must include a country code, e.g. +1 555 759 7861'
            });
        }
 
        // Sanity check on digit count (country code + number, E.164 max 15 digits)
        const digitCount = hospitalPhone.replace('+', '').length;
        if (digitCount < 8 || digitCount > 15) {
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
 
        if (!result.success && result.alreadyExists) {
            return res.status(409).json({
                success: false,
                error: result.error
            });
        }
 
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
};

/**
 * Redirect to Calendly via one-time token (with atomic claim)
 * GET /api/demo/schedule/:token
 */
exports.redirectToScheduling = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).send(renderErrorPage(
                'Invalid Link',
                'The scheduling link you used is invalid or malformed.'
            ));
        }

        // 1. Try to atomically claim the token (prevents double-use)
        const claimResult = await BookDemoService.claimToken(token);

        if (!claimResult.success) {
            const messages = {
                'not_found': ['Link Not Found', 'We couldn\'t find a demo request associated with this link.'],
                'already_scheduled': ['Link Already Used', 'This demo scheduling link has already been used to book a meeting. Please check your calendar invite for details.'],
                'already_used': ['Link Already Used', 'This link has already been used to access scheduling.'],
                'expired': ['Link Expired', 'This scheduling link has expired (valid for 7 days). Please request a new demo.'],
                'unknown': ['Link Unavailable', 'This link is no longer available for scheduling.']
            };

            const [title, message] = messages[claimResult.reason] || ['Link Unavailable', 'This link is no longer available.'];
            return res.status(410).send(renderErrorPage(title, message));
        }

        const booking = claimResult.booking;

        // 2. Build Calendly URL with pre-filled info
        const calendlyBaseUrl = env.CALENDLY_URL || 'https://calendly.com/anilkumarr0180/30min';
        const calendlyUrl = new URL(calendlyBaseUrl);
        
        // Add pre-filled parameters
        calendlyUrl.searchParams.set('name', booking.full_name);
        calendlyUrl.searchParams.set('email', booking.email);
        calendlyUrl.searchParams.set('a1', booking.hospital_name);
        calendlyUrl.searchParams.set('a2', booking.id);

        logger.info(`✅ Redirecting ${booking.email} to Calendly for booking #${booking.id}`);
        return res.redirect(calendlyUrl.toString());

    } catch (error) {
        logger.error('Error in redirectToScheduling:', error);
        return res.status(500).send(renderErrorPage(
            'Something Went Wrong',
            'We encountered an error while processing your request. Please try again or contact support.'
        ));
    }
};

/**
 * Handle Calendly Webhook with security
 * POST /api/demo/calendly/webhook
 */
exports.handleCalendlyWebhook = async (req, res) => {
    try {
        // Get signature from headers (Calendly sends it as x-calendly-webhook-signature)
        const signature = req.headers['x-calendly-webhook-signature'] || 
                         req.headers['calendly-webhook-signature'] || 
                         null;
        
        const result = await BookDemoService.processCalendlyWebhook(req.body, signature);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: result.ignored ? "Webhook ignored (not invitee.created)" : "Webhook processed successfully",
                data: result.booking || null
            });
        } else {
            return res.status(400).json({
                success: false,
                error: result.error || "Failed to process webhook"
            });
        }

    } catch (error) {
        logger.error("Calendly webhook error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to process webhook"
        });
    }
};

/**
 * Get all bookings (Super Admin only)
 * GET /api/demo
 */
exports.getAllBookings = async (req, res) => {
    try {
        // Service already filters out approved users and payment_completed
        const bookings = await BookDemoService.getAllBookings();
       
        // Calculate stats
        const stats = {
            total: bookings.length,
            new: bookings.filter(b => b.status === 'new').length,
            scheduled: bookings.filter(b => b.status === 'scheduled').length,
            contacted: bookings.filter(b => b.status === 'contacted').length,
            completed: bookings.filter(b => b.status === 'completed').length,
            payment_completed: bookings.filter(b => b.status === 'payment_completed').length,
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
};

/**
 * Get booking by ID (Super Admin only)
 * GET /api/demo/:id
 */
exports.getBookingById = async (req, res) => {
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
};

/**
 * Delete booking (Super Admin only)
 * DELETE /api/demo/:id
 */
exports.deleteBooking = async (req, res) => {
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
};

/**
 * Get bookings by email (Super Admin only)
 * GET /api/demo/email/:email
 */
exports.getBookingsByEmail = async (req, res) => {
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
};

/**
 * Get booking statistics (Super Admin only)
 * GET /api/demo/stats
 */
exports.getBookingStats = async (req, res) => {
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
};

/**
 * Update booking status (Super Admin only)
 * PUT /api/demo/:id/status
 */
exports.updateBookingStatus = async (req, res) => {
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
};

/**
 * Resend demo confirmation email (Super Admin only)
 * POST /api/demo/:id/resend-email
 */
exports.resendConfirmationEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await BookDemoService.getBookingById(id);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        // Reuse the token from the booking
        const result = await BookDemoService.resendConfirmationEmail(booking.id);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Confirmation email resent successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to resend email'
            });
        }
    } catch (error) {
        logger.error('Error resending confirmation email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend confirmation email'
        });
    }
};