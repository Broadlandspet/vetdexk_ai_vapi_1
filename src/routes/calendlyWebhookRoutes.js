const express = require("express");

const router = express.Router();

const CalendlyWebhookController = require("../controllers/calendlyWebhookController");

router.post(
    "/webhook",
    CalendlyWebhookController.webhook
);

module.exports = router;