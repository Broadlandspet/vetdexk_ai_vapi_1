// routes/supportTicketRoutes.js
const express = require('express');
const router = express.Router();
const supportTicketController = require('../controllers/supportTicketController');
const { verifyToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// ─── Ticket CRUD ──────────────────────────────────────────────
router.get('/tickets', supportTicketController.listTickets);
router.get('/tickets/:id', supportTicketController.getTicket);

// ✅ single registration, with auth + multer
router.post(
    '/tickets/:id/reply',
    verifyToken,
    upload.array('attachments', 10), // Max 10 files
    supportTicketController.replyToTicket
);

router.put('/tickets/:id/status', supportTicketController.updateTicketStatus);
router.put('/tickets/:id/priority', supportTicketController.updateTicketPriority);

// ─── Statistics ──────────────────────────────────────────────
router.get('/stats', supportTicketController.getStats);
router.get('/dashboard-stats', supportTicketController.getDashboardStats);

// ─── Manual sync ──────────────────────────────────────────────
router.post('/sync', supportTicketController.manualSync);
router.post('/sync-sent', supportTicketController.manualSyncSent);


router.post('/gmail-webhook', supportTicketController.handleGmailWebhook);
router.post('/gmail-watch/start', verifyToken, supportTicketController.startGmailWatch);

module.exports = router;