const cron = require('node-cron');
const appointmentController = require('../controllers/appointmentController');

// Schedule job to run every 2 minutes
// cron pattern: */2 * * * * = every 2 minutes
cron.schedule('*/2 * * * *', async () => {
    console.log('\n========================================');
    console.log('⏰ CRON JOB TRIGGERED: Feedback Call Checker');
    console.log(`Time: ${new Date().toISOString()}`);
    await appointmentController.processPendingFeedbackCalls();
    console.log('========================================\n');
});

console.log('✅ Feedback call cron job scheduled (every 2 minutes)');