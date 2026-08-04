// routes/userSupportRoutes.js
const express = require('express');
const router = express.Router();
const userSupportController = require('../controllers/userSupportController');


// ─── Public: submit a query (no auth required) ──────────────
router.post('/support/submit', userSupportController.submitQuery);



module.exports = router;