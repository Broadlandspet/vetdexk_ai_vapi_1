// routes/subscriptionPlanRoutes.js  (new — mount at /api/subscription-plans)
const router = require('express').Router();
const paymentController = require('../controllers/paymentController');

router.get('/', paymentController.getActivePlans);

module.exports = router;
