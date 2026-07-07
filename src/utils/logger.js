



// src/utils/logger.js
const winston = require('winston');

// Silence ALL info logs from database operations
const filterDatabaseLogs = winston.format((info) => {
  // Filter out specific messages
  if (info.message && (
    info.message.includes('Call created:') ||
    info.message.includes('Call updated:') ||
    info.message.includes('Transcription status updated') ||
    info.message.includes('Recording info saved') ||
    info.message.includes('Server running on port') ||
    info.message.includes('Environment:') ||
    info.message.includes('Twilio phone number:')
  )) {
    return false;
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterDatabaseLogs(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;