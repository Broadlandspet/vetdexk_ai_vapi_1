const express = require("express");
const router = express.Router();

const CalendlyController = require("../controllers/calendlyController");

router.get(
    "/me",
    CalendlyController.getCurrentUser
);

module.exports = router;