




// // const dotenv = require('dotenv');
// // dotenv.config();

// // // Required environment variables
// // const requiredEnvVars = [
// //   'TWILIO_ACCOUNT_SID',
// //   'TWILIO_AUTH_TOKEN',
// //   'TWILIO_PHONE_NUMBER',
// //   'DB_HOST',
// //   'DB_PORT',
// //   'DB_NAME',
// //   'DB_USER',
// //   'DB_PASSWORD'
// // ];

// // for (const envVar of requiredEnvVars) {
// //   if (!process.env[envVar]) {
// //     throw new Error(`Missing required environment variable: ${envVar}`);
// //   }
// // }

// // module.exports = {
// //   PORT: parseInt(process.env.PORT || '3001', 10),
// //   NODE_ENV: process.env.NODE_ENV || 'development',
  
// //   // Twilio
// //   TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
// //   TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
// //   TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  
// //   // PostgreSQL Database (direct connection to Supabase)
// //   DB_HOST: process.env.DB_HOST,
// //   DB_PORT: parseInt(process.env.DB_PORT, 10),
// //   DB_NAME: process.env.DB_NAME,
// //   DB_USER: process.env.DB_USER,
// //   DB_PASSWORD: process.env.DB_PASSWORD,
  
// //   // Keep Supabase for backward compatibility
// //   SUPABASE_URL: process.env.SUPABASE_URL,
// //   SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
// //   SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
// //   // Other
// //   FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
// //   LOG_LEVEL: process.env.LOG_LEVEL || 'info',
// //   JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key'
// // };







// const dotenv = require('dotenv');
// dotenv.config();

// // ============================================
// // Required environment variables
// // ============================================
// const requiredEnvVars = [
//   // Twilio
//   'TWILIO_ACCOUNT_SID',
//   'TWILIO_AUTH_TOKEN',
//   'TWILIO_PHONE_NUMBER',
  
//   // Database
//   'DB_HOST',
//   'DB_PORT',
//   'DB_NAME',
//   'DB_USER',
//   'DB_PASSWORD',
  
//   // Google OAuth (required for Calendar & Gmail)
//   'GOOGLE_CLIENT_ID',
//   'GOOGLE_CLIENT_SECRET'
// ];

// // Check required variables
// const missingVars = [];
// for (const envVar of requiredEnvVars) {
//   if (!process.env[envVar]) {
//     missingVars.push(envVar);
//   }
// }

// if (missingVars.length > 0) {
//   console.error(`\n❌ Missing required environment variables:`);
//   missingVars.forEach(v => console.error(`   - ${v}`));
//   console.error(`\n💡 Please check your .env file\n`);
//   throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
// }

// // ============================================
// // Warning for optional but recommended variables
// // ============================================
// const recommendedVars = [
//   { name: 'GOOGLE_CALENDAR_REFRESH_TOKEN', feature: 'Google Calendar integration' },
//   { name: 'GOOGLE_GMAIL_REFRESH_TOKEN', feature: 'Gmail email sending' },
//   { name: 'ADMIN_EMAIL', feature: 'Appointment notifications' },
//   { name: 'VAPI_API_KEY', feature: 'VAPI integration' }
// ];

// const missingRecommended = recommendedVars.filter(v => !process.env[v.name]);

// if (missingRecommended.length > 0) {
//   console.warn(`\n⚠️  Missing recommended environment variables:`);
//   missingRecommended.forEach(v => console.warn(`   - ${v.name} (${v.feature})`));
//   console.warn(`   Some features may not work correctly.\n`);
// }

// // ============================================
// // Export configuration
// // ============================================
// module.exports = {
//   // Server
//   PORT: parseInt(process.env.PORT || '3001', 10),
//   NODE_ENV: process.env.NODE_ENV || 'development',
//   BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
  
//   // Frontend
//   FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
//   // Logging
//   LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
//   // JWT
//   JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  
//   // ============================================
//   // Twilio Configuration
//   // ============================================
//   TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
//   TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
//   TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  
//   // ============================================
//   // VAPI Configuration
//   // ============================================
//   VAPI_API_KEY: process.env.VAPI_API_KEY,
//   VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID,
//   VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET,
  
//   // ============================================
//   // Database Configuration (PostgreSQL / Supabase)
//   // ============================================
//   DB_HOST: process.env.DB_HOST,
//   DB_PORT: parseInt(process.env.DB_PORT, 10),
//   DB_NAME: process.env.DB_NAME,
//   DB_USER: process.env.DB_USER,
//   DB_PASSWORD: process.env.DB_PASSWORD,
//   DATABASE_URL: process.env.DATABASE_URL,
  
//   // Supabase (backward compatibility)
//   SUPABASE_URL: process.env.SUPABASE_URL,
//   SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
//   // ============================================
//   // Google OAuth 2.0 Configuration
//   // ============================================
//   GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
//   GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground',
  
//   // Google Calendar
//   GOOGLE_CALENDAR_REFRESH_TOKEN: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || null,
//   GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary',
  
//   // Google Gmail
//   GOOGLE_GMAIL_REFRESH_TOKEN: process.env.GOOGLE_GMAIL_REFRESH_TOKEN || null,
  
//   // Google Service Account Email (sender)
//   GOOGLE_EMAIL: process.env.GOOGLE_EMAIL || process.env.ADMIN_EMAIL || null,
  
//   // ============================================
//   // Active Refresh Token (Helper)
//   // ============================================
//   // For Calendar API
//   get GOOGLE_REFRESH_TOKEN() {
//     return this.GOOGLE_CALENDAR_REFRESH_TOKEN;
//   },
  
//   // ============================================
//   // Email Configuration
//   // ============================================
//   ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'abs@gmail.com',
  
//   // ============================================
//   // Timezone & Appointment Configuration
//   // ============================================
//   TIMEZONE: process.env.TIMEZONE || 'America/New_York',
//   DEFAULT_SLOT_DURATION: parseInt(process.env.DEFAULT_SLOT_DURATION || '30', 10),
//   MAX_BOOKING_DAYS: parseInt(process.env.MAX_BOOKING_DAYS || '30', 10),
//   MIN_BOOKING_HOURS: parseInt(process.env.MIN_BOOKING_HOURS || '2', 10),
  
//   // ============================================
//   // Helper Methods
//   // ============================================
  
//   /**
//    * Check if Google Calendar integration is configured
//    */
//   isCalendarConfigured() {
//     return !!(process.env.GOOGLE_CLIENT_ID && 
//               process.env.GOOGLE_CLIENT_SECRET && 
//               process.env.GOOGLE_CALENDAR_REFRESH_TOKEN);
//   },
  
//   /**
//    * Check if Gmail integration is configured
//    */
//   isGmailConfigured() {
//     return !!(process.env.GOOGLE_CLIENT_ID && 
//               process.env.GOOGLE_CLIENT_SECRET && 
//               process.env.GOOGLE_GMAIL_REFRESH_TOKEN);
//   },
  
//   /**
//    * Check if all Google services are configured
//    */
//   isGoogleConfigured() {
//     return this.isCalendarConfigured() && this.isGmailConfigured();
//   },
  
//   /**
//    * Get configuration summary
//    */
//   getConfigSummary() {
//     return {
//       server: {
//         port: this.PORT,
//         environment: this.NODE_ENV,
//         baseUrl: this.BASE_URL
//       },
//       twilio: {
//         configured: !!(this.TWILIO_ACCOUNT_SID && this.TWILIO_AUTH_TOKEN),
//         phoneNumber: this.TWILIO_PHONE_NUMBER
//       },
//       vapi: {
//         configured: !!(this.VAPI_API_KEY && this.VAPI_ASSISTANT_ID)
//       },
//       database: {
//         configured: !!(this.DB_HOST && this.DB_NAME),
//         host: this.DB_HOST,
//         name: this.DB_NAME
//       },
//       google: {
//         oauth: !!(this.GOOGLE_CLIENT_ID && this.GOOGLE_CLIENT_SECRET),
//         calendar: this.isCalendarConfigured(),
//         gmail: this.isGmailConfigured(),
//         calendarId: this.GOOGLE_CALENDAR_ID
//       },
//       email: {
//         adminEmail: this.ADMIN_EMAIL,
//         senderEmail: this.GOOGLE_EMAIL
//       },
//       appointment: {
//         timezone: this.TIMEZONE,
//         slotDuration: this.DEFAULT_SLOT_DURATION,
//         maxBookingDays: this.MAX_BOOKING_DAYS
//       }
//     };
//   }
// };

// // ============================================
// // Print configuration on startup
// // ============================================
// console.log('\n📋 ENVIRONMENT CONFIGURATION');
// console.log('========================================');
// console.log(`   Server Port    : ${module.exports.PORT}`);
// console.log(`   Environment    : ${module.exports.NODE_ENV}`);
// console.log(`   Frontend URL   : ${module.exports.FRONTEND_URL}`);
// console.log(`   Database Host  : ${module.exports.DB_HOST}`);
// console.log(`   Database Name  : ${module.exports.DB_NAME}`);
// console.log('----------------------------------------');
// console.log(`   Twilio         : ${module.exports.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing'}`);
// console.log(`   VAPI           : ${module.exports.VAPI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
// console.log(`   Google OAuth   : ${module.exports.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Missing'}`);
// console.log(`   Calendar API   : ${module.exports.isCalendarConfigured() ? '✅ Configured' : '❌ Missing'}`);
// console.log(`   Gmail API      : ${module.exports.isGmailConfigured() ? '✅ Configured' : '❌ Missing'}`);
// console.log(`   Admin Email    : ${module.exports.ADMIN_EMAIL}`);
// console.log(`   Timezone       : ${module.exports.TIMEZONE}`);
// console.log('========================================\n');






const dotenv = require('dotenv');
dotenv.config();

// ============================================
// Required environment variables
// ============================================
const requiredEnvVars = [
  // Twilio
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  
  // Database
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  
  // Google OAuth (required for Calendar & Gmail)
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

// Check required variables
const missingVars = [];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
}

if (missingVars.length > 0) {
  console.error(`\n❌ Missing required environment variables:`);
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error(`\n💡 Please check your .env file\n`);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// ============================================
// Warning for optional but recommended variables
// ============================================
const recommendedVars = [
  { name: 'GOOGLE_CALENDAR_REFRESH_TOKEN', feature: 'Google Calendar integration' },
  { name: 'GOOGLE_GMAIL_REFRESH_TOKEN', feature: 'Gmail email sending' },
  { name: 'GMAIL_CLIENT_ID', feature: 'Gmail OAuth2 (separate from Calendar)' },
  { name: 'GMAIL_CLIENT_SECRET', feature: 'Gmail OAuth2 (separate from Calendar)' },
  { name: 'GMAIL_REFRESH_TOKEN', feature: 'Gmail OAuth2 (separate from Calendar)' },
  { name: 'ADMIN_EMAIL', feature: 'Admin email notifications' },
  { name: 'VAPI_API_KEY', feature: 'VAPI integration' }
];

const missingRecommended = recommendedVars.filter(v => !process.env[v.name]);

if (missingRecommended.length > 0) {
  console.warn(`\n⚠️  Missing recommended environment variables:`);
  missingRecommended.forEach(v => console.warn(`   - ${v.name} (${v.feature})`));
  console.warn(`   Some features may not work correctly.\n`);
}

// ============================================
// Export configuration
// ============================================
module.exports = {
  // Server
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  
  // ============================================
  // Twilio Configuration
  // ============================================
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  
  // ============================================
  // VAPI Configuration
  // ============================================
  VAPI_API_KEY: process.env.VAPI_API_KEY,
  VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID,
  VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET,
 CALENDLY_URL: process.env.CALENDLY_URL,
  CALENDLY_PAT: process.env.CALENDLY_PAT,
  // ============================================
  // Database Configuration (PostgreSQL / Supabase)
  // ============================================
  DB_HOST: process.env.DB_HOST,
  DB_PORT: parseInt(process.env.DB_PORT, 10),
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Supabase (backward compatibility)
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // ============================================
  // Google OAuth 2.0 Configuration
  // ============================================
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground',
  
  // Google Calendar
  GOOGLE_CALENDAR_REFRESH_TOKEN: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || null,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary',
  
  // ============================================
  // ✅ NEW: Gmail OAuth2 Configuration (separate from Calendar)
  // ============================================
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_GMAIL_REFRESH_TOKEN || null,
  GMAIL_FROM_EMAIL: process.env.GMAIL_FROM_EMAIL || process.env.GOOGLE_EMAIL || null,
  
  // Google Service Account Email (sender) - backward compatibility
  GOOGLE_EMAIL: process.env.GOOGLE_EMAIL || process.env.ADMIN_EMAIL || null,
  
  // ============================================
  // Active Refresh Token (Helper)
  // ============================================
  // For Calendar API
  get GOOGLE_REFRESH_TOKEN() {
    return this.GOOGLE_CALENDAR_REFRESH_TOKEN;
  },
  
  // ============================================
  // ✅ NEW: Email Configuration
  // ============================================
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@broadlandspet.com',
  
  // ============================================
  // Timezone & Appointment Configuration
  // ============================================
  TIMEZONE: process.env.TIMEZONE || 'America/New_York',
  DEFAULT_SLOT_DURATION: parseInt(process.env.DEFAULT_SLOT_DURATION || '30', 10),
  MAX_BOOKING_DAYS: parseInt(process.env.MAX_BOOKING_DAYS || '30', 10),
  MIN_BOOKING_HOURS: parseInt(process.env.MIN_BOOKING_HOURS || '2', 10),
  
  // ============================================
  // Helper Methods
  // ============================================
  
  /**
   * Check if Google Calendar integration is configured
   */
  isCalendarConfigured() {
    return !!(this.GOOGLE_CLIENT_ID && 
              this.GOOGLE_CLIENT_SECRET && 
              this.GOOGLE_CALENDAR_REFRESH_TOKEN);
  },
  
  /**
   * ✅ FIXED: Check if Gmail integration is configured
   * Now checks for separate Gmail OAuth2 credentials
   */
  isGmailConfigured() {
    return !!(this.GMAIL_CLIENT_ID && 
              this.GMAIL_CLIENT_SECRET && 
              this.GMAIL_REFRESH_TOKEN);
  },
  
  /**
   * Check if all Google services are configured
   */
  isGoogleConfigured() {
    return this.isCalendarConfigured() && this.isGmailConfigured();
  },
  
  /**
   * Get Gmail OAuth2 config (for emailService.js)
   */
  getGmailConfig() {
    return {
      clientId: this.GMAIL_CLIENT_ID,
      clientSecret: this.GMAIL_CLIENT_SECRET,
      refreshToken: this.GMAIL_REFRESH_TOKEN,
      fromEmail: this.GMAIL_FROM_EMAIL || this.GOOGLE_EMAIL || this.ADMIN_EMAIL
    };
  },
  
  /**
   * Get configuration summary
   */
  getConfigSummary() {
    return {
      server: {
        port: this.PORT,
        environment: this.NODE_ENV,
        baseUrl: this.BASE_URL
      },
      twilio: {
        configured: !!(this.TWILIO_ACCOUNT_SID && this.TWILIO_AUTH_TOKEN),
        phoneNumber: this.TWILIO_PHONE_NUMBER
      },
      vapi: {
        configured: !!(this.VAPI_API_KEY && this.VAPI_ASSISTANT_ID)
      },
      database: {
        configured: !!(this.DB_HOST && this.DB_NAME),
        host: this.DB_HOST,
        name: this.DB_NAME
      },
      google: {
        oauth: !!(this.GOOGLE_CLIENT_ID && this.GOOGLE_CLIENT_SECRET),
        calendar: this.isCalendarConfigured(),
        gmail: this.isGmailConfigured(),
        calendarId: this.GOOGLE_CALENDAR_ID
      },
      email: {
        adminEmail: this.ADMIN_EMAIL,
        senderEmail: this.GMAIL_FROM_EMAIL || this.GOOGLE_EMAIL
      },
      appointment: {
        timezone: this.TIMEZONE,
        slotDuration: this.DEFAULT_SLOT_DURATION,
        maxBookingDays: this.MAX_BOOKING_DAYS
      }
    };
  }
};

// ============================================
// Print configuration on startup
// ============================================
console.log('\n📋 ENVIRONMENT CONFIGURATION');
console.log('========================================');
console.log(`   Server Port    : ${module.exports.PORT}`);
console.log(`   Environment    : ${module.exports.NODE_ENV}`);
console.log(`   Frontend URL   : ${module.exports.FRONTEND_URL}`);
console.log(`   Database Host  : ${module.exports.DB_HOST}`);
console.log(`   Database Name  : ${module.exports.DB_NAME}`);
console.log('----------------------------------------');
console.log(`   Twilio         : ${module.exports.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing'}`);
console.log(`   VAPI           : ${module.exports.VAPI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Google OAuth   : ${module.exports.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Calendar API   : ${module.exports.isCalendarConfigured() ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Gmail API      : ${module.exports.isGmailConfigured() ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Admin Email    : ${module.exports.ADMIN_EMAIL}`);
console.log(`   Gmail From     : ${module.exports.GMAIL_FROM_EMAIL || module.exports.GOOGLE_EMAIL || 'Not set'}`);
console.log(`   Timezone       : ${module.exports.TIMEZONE}`);
console.log('========================================\n');