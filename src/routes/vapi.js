const express = require('express');
const VapiController = require('../controllers/vapiController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

const {
    getPricing,

} = require('../controllers/adminController');



const router = express.Router();



router.post('/', apiKeyAuth, VapiController.handleWebhook);


// Get all pricing (categories + items)
router.post('/pricing', apiKeyAuth, getPricing);


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