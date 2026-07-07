// const { google } = require('googleapis');
// const env = require('./env');

// // OAuth2 Client Setup
// const oauth2Client = new google.auth.OAuth2(
//     env.GOOGLE_CLIENT_ID,
//     env.GOOGLE_CLIENT_SECRET,
//     env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
// );

// // Set credentials with refresh token
// oauth2Client.setCredentials({
//     refresh_token: env.GOOGLE_REFRESH_TOKEN
// });

// // Auto-refresh access token before each request
// oauth2Client.on('tokens', (tokens) => {
//     if (tokens.refresh_token) {
//         // Store the new refresh token if it gets rotated
//         console.log('New refresh token received:', tokens.refresh_token);
//     }
//     console.log('Access token refreshed automatically');
// });

// // Get fresh access token
// const getAccessToken = async () => {
//     try {
//         const { token } = await oauth2Client.getAccessToken();
//         return token;
//     } catch (error) {
//         console.error('Error getting access token:', error.message);
//         throw new Error('Failed to authenticate with Google');
//     }
// };

// // Calendar API instance
// const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// // Gmail API instance
// const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// module.exports = {
//     oauth2Client,
//     getAccessToken,
//     calendar,
//     gmail
// };






const { google } = require('googleapis');
const env = require('./env');

// ============================================
// CALENDAR OAUTH2 CLIENT
// ============================================
const calendarOAuth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
);

// Set credentials with Calendar refresh token
if (env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
    calendarOAuth2Client.setCredentials({
        refresh_token: env.GOOGLE_CALENDAR_REFRESH_TOKEN
    });
    console.log('   ✅ Calendar OAuth2 Client: Configured with refresh token');
} else {
    console.warn('   ⚠️  Calendar OAuth2 Client: No refresh token configured');
}

// Auto-refresh Calendar access token
calendarOAuth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        console.log('🔄 Calendar refresh token rotated');
    }
    console.log('✅ Calendar access token refreshed');
});

// ============================================
// GMAIL OAUTH2 CLIENT (Separate client)
// ============================================
const gmailOAuth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
);

// Set credentials with Gmail refresh token
if (env.GOOGLE_GMAIL_REFRESH_TOKEN) {
    gmailOAuth2Client.setCredentials({
        refresh_token: env.GOOGLE_GMAIL_REFRESH_TOKEN
    });
    console.log('   ✅ Gmail OAuth2 Client: Configured with refresh token');
} else {
    console.warn('   ⚠️  Gmail OAuth2 Client: No refresh token configured');
}

// Auto-refresh Gmail access token
gmailOAuth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        console.log('🔄 Gmail refresh token rotated');
    }
    console.log('✅ Gmail access token refreshed');
});

// ============================================
// API INSTANCES
// ============================================

// Calendar API instance (uses Calendar OAuth client)
const calendar = google.calendar({ 
    version: 'v3', 
    auth: calendarOAuth2Client 
});

// Gmail API instance (uses Gmail OAuth client)
const gmail = google.gmail({ 
    version: 'v1', 
    auth: gmailOAuth2Client 
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get fresh Calendar access token
 */
const getCalendarAccessToken = async () => {
    try {
        if (!env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
            throw new Error('Calendar refresh token not configured');
        }
        const { token } = await calendarOAuth2Client.getAccessToken();
        return token;
    } catch (error) {
        console.error('Error getting Calendar access token:', error.message);
        throw new Error('Failed to authenticate Calendar with Google');
    }
};

/**
 * Get fresh Gmail access token
 */
const getGmailAccessToken = async () => {
    try {
        if (!env.GOOGLE_GMAIL_REFRESH_TOKEN) {
            throw new Error('Gmail refresh token not configured');
        }
        const { token } = await gmailOAuth2Client.getAccessToken();
        return token;
    } catch (error) {
        console.error('Error getting Gmail access token:', error.message);
        throw new Error('Failed to authenticate Gmail with Google');
    }
};

/**
 * Get access token (backward compatibility - uses Calendar)
 */
const getAccessToken = async () => {
    return getCalendarAccessToken();
};

/**
 * Verify Calendar connection
 */
const verifyCalendarConnection = async () => {
    try {
        if (!env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
            return { success: false, error: 'Calendar refresh token not configured' };
        }
        
        const token = await calendarOAuth2Client.getAccessToken();
        
        // Try to list calendars to verify
        const response = await calendar.calendarList.list({
            auth: calendarOAuth2Client
        });
        
        return {
            success: true,
            calendars: response.data.items.length,
            tokenValid: !!token
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Verify Gmail connection
 */
const verifyGmailConnection = async () => {
    try {
        if (!env.GOOGLE_GMAIL_REFRESH_TOKEN) {
            return { success: false, error: 'Gmail refresh token not configured' };
        }
        
        const token = await gmailOAuth2Client.getAccessToken();
        
        // Try to get profile to verify
        const response = await gmail.users.getProfile({
            userId: 'me',
            auth: gmailOAuth2Client
        });
        
        return {
            success: true,
            emailAddress: response.data.emailAddress,
            tokenValid: !!token
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Check if Calendar is configured
 */
const isCalendarConfigured = () => {
    return !!(env.GOOGLE_CLIENT_ID && 
              env.GOOGLE_CLIENT_SECRET && 
              env.GOOGLE_CALENDAR_REFRESH_TOKEN);
};

/**
 * Check if Gmail is configured
 */
const isGmailConfigured = () => {
    return !!(env.GOOGLE_CLIENT_ID && 
              env.GOOGLE_CLIENT_SECRET && 
              env.GOOGLE_GMAIL_REFRESH_TOKEN);
};

// ============================================
// LOG CONFIGURATION STATUS
// ============================================
console.log('\n🔐 GOOGLE API CONFIGURATION');
console.log('========================================');
console.log(`   Client ID      : ${env.GOOGLE_CLIENT_ID ? '✅ ' + env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : '❌ Missing'}`);
console.log(`   Client Secret  : ${env.GOOGLE_CLIENT_SECRET ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Calendar Token : ${env.GOOGLE_CALENDAR_REFRESH_TOKEN ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Gmail Token    : ${env.GOOGLE_GMAIL_REFRESH_TOKEN ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Calendar ID    : ${env.GOOGLE_CALENDAR_ID || 'primary'}`);
console.log('========================================\n');

// ============================================
// EXPORTS
// ============================================
module.exports = {
    // OAuth2 Clients
    calendarOAuth2Client,
    gmailOAuth2Client,
    
    // For backward compatibility
    oauth2Client: calendarOAuth2Client,
    
    // API Instances
    calendar,
    gmail,
    
    // Token functions
    getAccessToken,           // Backward compatible (Calendar)
    getCalendarAccessToken,   // Calendar specific
    getGmailAccessToken,      // Gmail specific
    
    // Verification
    verifyCalendarConnection,
    verifyGmailConnection,
    
    // Status checks
    isCalendarConfigured,
    isGmailConfigured
};