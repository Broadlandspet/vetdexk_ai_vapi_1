





const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// ============================================
// PROTECTED ROUTES (Require API Key)
// ============================================

// Book appointment (VAPI - POST) - Requires API Key
router.post('/', apiKeyAuth, (req, res, next) => 
    appointmentController.bookAppointment(req, res, next)
);

// Get patient appointments by phone - Requires API Key
router.post('/lookup', apiKeyAuth, (req, res, next) => 
    appointmentController.getPatientAppointments(req, res, next)
);
router.get('/lookup', apiKeyAuth, (req, res, next) => 
    appointmentController.getPatientAppointments(req, res, next)
);
router.get('/', apiKeyAuth, (req, res, next) => 
    appointmentController.getPatientAppointments(req, res, next)
);

// Cancel appointment - Requires API Key
router.post('/cancel', apiKeyAuth, (req, res, next) => 
    appointmentController.cancelAppointment(req, res, next)
);
router.delete('/:id', apiKeyAuth, (req, res, next) => 
    appointmentController.cancelAppointment(req, res, next)
);

// Get all appointments (Admin) - This should use JWT, not API key
// Keep JWT auth for admin endpoints
router.get('/all', (req, res, next) => 
    appointmentController.getAllAppointments(req, res, next)
);

// Reschedule appointment - Requires API Key
router.post('/reschedule', apiKeyAuth, (req, res, next) =>
    appointmentController.rescheduleAppointment(req, res, next)
);

// Complete appointment - Requires API Key
router.post('/complete', apiKeyAuth, (req, res, next) =>
    appointmentController.completeAppointment(req, res, next)
);



router.post('/appointmentFeedback', apiKeyAuth, (req, res, next) =>
    appointmentController.appointmentFeedback(req, res, next)
);




// POST /api/appointments/feedback-call - Initiate outbound feedback call (no DB fetch)
router.post('/feedback-call', apiKeyAuth, (req, res, next) =>
    appointmentController.initiateFeedbackCallDirect(req, res, next)
);

module.exports = router;