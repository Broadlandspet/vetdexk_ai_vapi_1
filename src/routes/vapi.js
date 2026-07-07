
// src/routes/vapi.js
const express = require('express');
const VapiController = require('../controllers/vapiController');
const apiKeyAuth = require('../middleware/apiKeyAuth');


const router = express.Router();



router.post('/', apiKeyAuth, VapiController.handleWebhook);

// Check working hours
router.post('/check-working-hours', apiKeyAuth, async (req, res) => {
    req.body.function = 'check_working_hours';
    req.body.parameters = req.body;
    await VapiController.handleFunctionCallAPI(req, res);
});

// Get available slots
router.post('/get-available-slots', apiKeyAuth, async (req, res) => {
    req.body.function = 'get_available_slots';
    req.body.parameters = req.body;
    await VapiController.handleFunctionCallAPI(req, res);
});



module.exports = router;