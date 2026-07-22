// const BookDemoService = require("../services/bookDemoService");
// const logger = require("../utils/logger");

// class CalendlyWebhookController {

//     static async webhook(req, res) {
//         try {

//             logger.info("Calendly webhook received");

//             logger.info(req.body);

//             await BookDemoService.processCalendlyWebhook(req.body);

//             return res.status(200).json({
//                 success: true
//             });

//         } catch (err) {

//             logger.error("Calendly webhook error:", err);

//             return res.status(500).json({
//                 success: false
//             });

//         }
//     }

// }

// module.exports = CalendlyWebhookController;







const BookDemoService = require("../services/bookDemoService");
const logger = require("../utils/logger");

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Handle Calendly webhook (public)
 * POST /api/calendly/webhook
 */
exports.webhook = async (req, res) => {
    try {
        logger.info("Calendly webhook received");
        logger.info(req.body);

        await BookDemoService.processCalendlyWebhook(req.body);

        return res.status(200).json({
            success: true
        });

    } catch (err) {
        logger.error("Calendly webhook error:", err);

        return res.status(500).json({
            success: false
        });
    }
};