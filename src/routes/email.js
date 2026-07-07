const express = require('express');
const EmailController = require('../controllers/emailController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All email routes require authentication
router.use(verifyToken);
router.use(requireRole(['admin']));

// Email Logs
router.get('/logs', EmailController.getEmailLogs);

// Email Configuration
router.get('/config', EmailController.getEmailConfig);
router.post('/config', EmailController.saveEmailConfig);
router.put('/config/:id', EmailController.updateEmailConfig);
router.delete('/config/:id', EmailController.deleteEmailConfig);

// Test email
router.post('/test', EmailController.testEmailConfig);

module.exports = router;