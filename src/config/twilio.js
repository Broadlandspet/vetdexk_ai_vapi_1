const twilio = require('twilio');
const env = require('./env');

const twilioClient = twilio(
  env.TWILIO_ACCOUNT_SID,
  env.TWILIO_AUTH_TOKEN
);

const twilioWebhook = twilio.webhook({
  validate: env.NODE_ENV === 'production'
});

module.exports = {
  twilioClient,
  twilioWebhook
};