const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');

const appointmentController = require('../controllers/appointmentController');

const slotController = require('../controllers/slotController');


// Import all admin controller methods
const {
    getAllCalls,
    getCallById,
    getCallBySid,
    getAllConversations,
    getConversationById,
    getConversationByNumbers,
    getAllTranscriptions,
    getTranscriptionById,
    getTranscriptionsByCall,
    getDashboardStats,
    handleRecordingOptions,
    getAllRecordings,
    getRecordingUrl,
    publicStreamRecording,
    streamRecording,
    audioPlayerPopup,

    getWorkingHours,
    updateWorkingHours,
    updateWorkingHourById,
    updateWorkingHourByDay,


    getPricing,
    updatePricing,
    addPricingCategory,
    addPricingItem,
    deletePricingCategory,
    deletePricingItem,

        getEmailLogs,
    getEmailLogsStats,
    getEmailConfig,
    updateEmailConfig

} = require('../controllers/adminController');

const router = express.Router();

// ==================== PUBLIC ROUTES (NO AUTH) ====================
// These routes must come BEFORE the auth middleware
router.options('/stream/:recordingSid', handleRecordingOptions);
router.get('/stream/:recordingSid', publicStreamRecording);

// ==================== PROTECTED ROUTES (REQUIRE AUTH) ====================
// All routes below require authentication
router.use(verifyToken);
router.use(requireRole(['admin']));

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Calls routes
router.get('/calls', getAllCalls);
router.get('/calls/:id', getCallById);
router.get('/calls/sid/:callSid', getCallBySid);

// Conversations routes
router.get('/conversations', getAllConversations);
router.get('/conversations/:id', getConversationById);
router.get('/conversations/numbers/find', getConversationByNumbers);

// Transcriptions routes
router.get('/transcriptions', getAllTranscriptions);
router.get('/transcriptions/:id', getTranscriptionById);
router.get('/transcriptions/call/:callId', getTranscriptionsByCall);

// Recording routes (protected)
router.get('/recordings', getAllRecordings);
router.get('/recordings/:transcriptionId/url', getRecordingUrl);
router.get('/recordings/:transcriptionId/play', audioPlayerPopup);
router.get('/recordings/:transcriptionId/stream', streamRecording);





// ==================== WORKING HOURS ROUTES ====================
// Get working hours (supports ?appointment_type=consultation)
router.get('/working-hours', getWorkingHours);

// Update multiple working hours (bulk update)
router.put('/working-hours', updateWorkingHours);

// Update single working hour by ID
router.put('/working-hours/:id', updateWorkingHourById);

// Update working hour by day_of_week (e.g., Monday, Tuesday)
router.put('/working-hours/day/:day', updateWorkingHourByDay);






// ==================== PRICING ROUTES ====================

// Get all pricing (categories + items)
router.get('/pricing', getPricing);

// Update pricing (bulk update)
router.put('/pricing', updatePricing);

// Add new category
router.post('/pricing/category', addPricingCategory);

// Add new service item
router.post('/pricing/item', addPricingItem);

// Delete category (soft delete)
router.delete('/pricing/category/:id', deletePricingCategory);

// Delete service item (soft delete)
router.delete('/pricing/item/:id', deletePricingItem);






// ==================== APPOINTMENT ROUTES (ADMIN ONLY) ====================
// These routes are protected by admin authentication

// Cancel appointment (admin only)
router.post('/appointments', (req, res, next) => appointmentController.bookAppointment(req, res, next));
router.post('/cancel', (req, res, next) => appointmentController.cancelAppointment(req, res, next));
router.delete('/:id', (req, res, next) => appointmentController.cancelAppointment(req, res, next));

// Get all appointments (Admin only)
router.get('/all', (req, res, next) => appointmentController.getAllAppointments(req, res, next));

// Reschedule appointment (Admin only)
router.post('/reschedule', (req, res, next) => appointmentController.rescheduleAppointment(req, res, next));

// Complete appointment (Admin only)
router.post('/complete', (req, res, next) => appointmentController.completeAppointment(req, res, next));

router.post('/', (req, res, next) => slotController.getAvailableSlots(req, res, next));



// ==================== EMAIL LOGS ROUTES ====================
router.get('/email-logs', getEmailLogs);
router.get('/email-logs/stats', getEmailLogsStats);

// ==================== EMAIL CONFIG ROUTES ====================
router.get('/email-config', getEmailConfig);
router.post('/email-config', updateEmailConfig);





module.exports = router;