
const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const apiKeyAuth = require('../middleware/apiKeyAuth');


// VAPI uses POST with body: { date, type }
router.post('/', apiKeyAuth,  (req, res, next) => slotController.getAvailableSlots(req, res, next));

// Also keep GET for backward compatibility (admin dashboard etc.)
router.get('/', apiKeyAuth, (req, res, next) => slotController.getAvailableSlots(req, res, next));

// Check specific slot
router.post('/check', apiKeyAuth, (req, res, next) => slotController.checkSlot(req, res, next));
router.get('/check', apiKeyAuth, (req, res, next) => slotController.checkSlot(req, res, next));

// Working hours
router.get('/working-hours', apiKeyAuth, (req, res, next) => slotController.getWorkingHours(req, res, next));

// Available days
router.get('/available-days', apiKeyAuth, (req, res, next) => slotController.getAvailableDays(req, res, next));

module.exports = router;