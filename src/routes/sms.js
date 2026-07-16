// // src/routes/sms.js
// const express = require('express');
// const router = express.Router();
// const smsController = require('../controllers/smsController');
// const apiKeyAuth = require('../middleware/apiKeyAuth');


// // POST /api/sms/send – Send an SMS using Vapi
// router.post('/send', apiKeyAuth, smsController.sendSms);



// // Specific SMS types
// router.post('/appointment-booked', apiKeyAuth, smsController.sendAppointmentBooked);
// router.post('/appointment-cancelled', apiKeyAuth, smsController.sendAppointmentCancelled);
// router.post('/technical-error', apiKeyAuth, smsController.sendTechnicalError);
// router.post('/query-submitted', apiKeyAuth, smsController.sendQuerySubmitted);











// module.exports = router;







const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Generic SMS send
router.post('/send', apiKeyAuth, smsController.sendSms);

// Specific SMS types
router.post('/appointment-booked', apiKeyAuth, smsController.sendAppointmentBooked);
router.post('/appointment-cancelled', apiKeyAuth, smsController.sendAppointmentCancelled);
router.post('/multi-appointment-cancelled', apiKeyAuth, smsController.sendMultiAppointmentCancelled);
router.post('/technical-error', apiKeyAuth, smsController.sendTechnicalError);
router.post('/query-submitted', apiKeyAuth, smsController.sendQuerySubmitted);

module.exports = router;