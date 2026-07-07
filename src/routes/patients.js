





const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { verifyToken, requireRole } = require('../middleware/auth');  // 👈 added

// ============================================
// VAPI ENDPOINTS (use API Key)
// ============================================

// Lookup patient by phone (VAPI uses POST)
router.post('/lookup', apiKeyAuth, (req, res, next) => patientController.lookupByPhone(req, res, next));

// GET lookup is also available with API Key (for flexibility)
router.get('/lookup', apiKeyAuth, (req, res, next) => patientController.lookupByPhone(req, res, next));

// Create new patient (VAPI uses this when booking)
router.post('/', apiKeyAuth, (req, res, next) => patientController.create(req, res, next));

// ============================================
// ADMIN ENDPOINTS (require JWT + admin role)
// ============================================

// Search patients (admin only)
router.get('/search', verifyToken, requireRole(['admin']), (req, res, next) => patientController.search(req, res, next));

// Get patient by ID (admin only)
router.get('/:id', verifyToken, requireRole(['admin']), (req, res, next) => patientController.getById(req, res, next));

// Get all patients (admin only)
router.get('/', verifyToken, requireRole(['admin']), (req, res, next) => patientController.getAll(req, res, next));

// Update patient (admin only)
router.patch('/:id', verifyToken, requireRole(['admin']), (req, res, next) => patientController.update(req, res, next));

module.exports = router;