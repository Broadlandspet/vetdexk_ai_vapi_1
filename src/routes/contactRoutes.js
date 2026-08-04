// src/routes/contactRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// POST /api/contact
// Public endpoint — no auth required
router.post('/', contactController.submitContactQuery);

module.exports = router;