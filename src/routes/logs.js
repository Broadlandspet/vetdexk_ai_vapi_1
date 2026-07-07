



const express = require('express');
const LogController = require('../controllers/logController');

const router = express.Router();

router.get('/calls', LogController.getAllCalls);
router.get('/calls/:callSid', LogController.getCallDetails);
router.get('/calls/:callSid/transcription', LogController.getCallTranscription);
router.get('/stats', LogController.getCallStats);
router.get('/conversations', LogController.getConversationHistory); // NEW

module.exports = router;