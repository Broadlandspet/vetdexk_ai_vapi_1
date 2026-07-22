
// const { google } = require('googleapis');
// const env = require('../config/env');
// const { executeQuery } = require('../config/database');
// const logger = require('../utils/logger');

// // Use the calendar instance from config if available, otherwise create one.
// // We'll import the calendar from config, but also need OAuth2 for dynamic tokens.
// const { calendar } = require('../config/google');

// class CalendarService {

//     /**
//      * Fetch hospital-specific Google Calendar credentials from DB
//      * @param {number} hospitalId 
//      * @returns {Promise<{ refreshToken: string, calendarId: string } | null>}
//      */
//     async _getHospitalCalendar(hospitalId) {
//         if (!hospitalId) return null;
//         try {
//             const result = await executeQuery(
//                 `SELECT google_calendar_refresh_token, google_calendar_id 
//                  FROM hospital_calendar 
//                  WHERE hospital_id = $1`,
//                 [hospitalId]
//             );
//             if (result.rows.length === 0) {
//                 console.log(`   ⚠️ No calendar config found for hospital ${hospitalId}, using fallback .env`);
//                 return null;
//             }
//             const row = result.rows[0];
//             const refreshToken = row.google_calendar_refresh_token;
//             const calendarId = row.google_calendar_id || 'primary';

//             // ✅ LOG: Show what we fetched
//             console.log(`   📅 Hospital ${hospitalId} calendar credentials:`);
//             console.log(`      Refresh Token: ${refreshToken ? '✅ Present' : '❌ Missing'}`);
//             console.log(`      Calendar ID:   ${calendarId}`);

//             return { refreshToken, calendarId };
//         } catch (error) {
//             logger.error('Error fetching hospital calendar credentials:', error);
//             return null;
//         }
//     }

//     /**
//      * Get a Google OAuth2 client with the given refresh token.
//      * If no refresh token, falls back to the default client from config.
//      */
//     async _getGoogleClient(refreshToken) {
//         // Create a new OAuth2 client using environment variables
//         const oauth2Client = new google.auth.OAuth2(
//             env.GOOGLE_CLIENT_ID,
//             env.GOOGLE_CLIENT_SECRET,
//             env.GOOGLE_REDIRECT_URI || 'http://localhost'
//         );

//         if (refreshToken) {
//             oauth2Client.setCredentials({
//                 refresh_token: refreshToken
//             });
//             // The client will auto-refresh the access token when needed
//             return oauth2Client;
//         }

//         // Fallback: use the default client from config (which may already have credentials)
//         // If your config exports a pre-authenticated client, we can fallback to it.
//         // For safety, we'll try to use the existing calendar's auth if available.
//         if (calendar && calendar.auth) {
//             return calendar.auth;
//         }

//         // Otherwise, return the new client (without refresh token, will fail if not authenticated)
//         return oauth2Client;
//     }

//     /**
//      * Create a calendar event for an appointment
//      * @param {Object} appointmentData - appointment details
//      * @param {number} hospitalId - hospital ID for dynamic calendar
//      */
//     async createEvent(appointmentData, hospitalId = null) {
//         try {
//             const { patient_name, pet_name, pet_species, pet_breed, appointment_type, date, time, phone } = appointmentData;

//             // Get hospital calendar credentials
//             let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
//             let authClient = null;

//             if (hospitalId) {
//                 const creds = await this._getHospitalCalendar(hospitalId);
//                 if (creds) {
//                     calendarId = creds.calendarId || 'primary';
//                     authClient = await this._getGoogleClient(creds.refreshToken);
//                 }
//             }

//             // If no authClient, use default from config
//             if (!authClient) {
//                 authClient = calendar.auth; // fallback to the default auth from config
//                 if (!authClient) {
//                     // If still no auth, create a new OAuth2 client with env credentials (no refresh)
//                     authClient = new google.auth.OAuth2(
//                         env.GOOGLE_CLIENT_ID,
//                         env.GOOGLE_CLIENT_SECRET,
//                         env.GOOGLE_REDIRECT_URI || 'http://localhost'
//                     );
//                     // If you have a default refresh token in env, you can set it here
//                     if (env.GOOGLE_REFRESH_TOKEN) {
//                         authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
//                     }
//                 }
//             }

//             console.log(`   📅 Creating event in calendar: ${calendarId} for hospital ${hospitalId || 'default'}`);

//             // Parse date and time
//             const [hours, minutes] = this._parseTime(time);
//             const startDateTime = new Date(`${date}T${hours}:${minutes}:00`);
//             const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

//             const event = {
//                 summary: `${appointment_type.charAt(0).toUpperCase() + appointment_type.slice(1)} - ${pet_name} (${patient_name})`,
//                 description: `Patient: ${patient_name}\nPhone: ${phone}\nPet: ${pet_name}\nSpecies: ${pet_species}\nBreed: ${pet_breed}\nType: ${appointment_type}`,
//                 start: {
//                     dateTime: startDateTime.toISOString(),
//                     timeZone: env.TIMEZONE || 'Asia/Kolkata'
//                 },
//                 end: {
//                     dateTime: endDateTime.toISOString(),
//                     timeZone: env.TIMEZONE || 'Asia/Kolkata'
//                 },
//                 attendees: [
//                     { email: env.ADMIN_EMAIL || 'abs@gmail.com' }
//                 ],
//                 reminders: {
//                     useDefault: false,
//                     overrides: [
//                         { method: 'email', minutes: 24 * 60 },
//                         { method: 'popup', minutes: 30 }
//                     ]
//                 },
//                 colorId: '1',
//                 extendedProperties: {
//                     private: {
//                         patientName: patient_name,
//                         petName: pet_name,
//                         petspecies: pet_species,
//                         petBreed: pet_breed,
//                         appointmentType: appointment_type,
//                         phone: phone,
//                         appointmentStatus: 'confirmed',
//                         hospitalId: String(hospitalId || '')
//                     }
//                 }
//             };

//             const response = await calendar.events.insert({
//                 auth: authClient,
//                 calendarId: calendarId,
//                 resource: event,
//                 sendUpdates: 'all'
//             });

//             console.log(`✅ Calendar event created: ${response.data.id} for hospital ${hospitalId || 'default'}`);
//             return {
//                 success: true,
//                 eventId: response.data.id,
//                 htmlLink: response.data.htmlLink,
//                 created: response.data.created
//             };

//         } catch (error) {
//             console.error('Error creating calendar event:', error.message);
//             if (error.response) {
//                 console.error('Google API Error:', error.response.data);
//             }
//             throw new Error(`Failed to create calendar event: ${error.message}`);
//         }
//     }

//     /**
//      * Check free/busy for a specific date and hospital
//      * @param {string} date - YYYY-MM-DD
//      * @param {number} hospitalId - optional hospital ID
//      */
//     async checkFreeBusy(date, hospitalId = null) {
//         try {
//             // Get hospital calendar credentials
//             let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
//             let authClient = null;

//             if (hospitalId) {
//                 const creds = await this._getHospitalCalendar(hospitalId);
//                 if (creds) {
//                     calendarId = creds.calendarId || 'primary';
//                     authClient = await this._getGoogleClient(creds.refreshToken);
//                 }
//             }

//             if (!authClient) {
//                 authClient = calendar.auth || new google.auth.OAuth2(
//                     env.GOOGLE_CLIENT_ID,
//                     env.GOOGLE_CLIENT_SECRET,
//                     env.GOOGLE_REDIRECT_URI || 'http://localhost'
//                 );
//                 if (env.GOOGLE_REFRESH_TOKEN) {
//                     authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
//                 }
//             }

//             console.log(`   📅 Checking free/busy in calendar: ${calendarId} for hospital ${hospitalId || 'default'}`);

//             const timeMin = new Date(`${date}T00:00:00`);
//             const timeMax = new Date(`${date}T23:59:59`);

//             const response = await calendar.freebusy.query({
//                 auth: authClient,
//                 requestBody: {
//                     timeMin: timeMin.toISOString(),
//                     timeMax: timeMax.toISOString(),
//                     timeZone: env.TIMEZONE || 'Asia/Kolkata',
//                     items: [{ id: calendarId }]
//                 }
//             });

//             const busySlots = response.data.calendars[calendarId]?.busy || [];

//             console.log(`      📊 Found ${busySlots.length} busy slots from Google Calendar`);

//             return busySlots.map(slot => ({
//                 start: new Date(slot.start),
//                 end: new Date(slot.end)
//             }));

//         } catch (error) {
//             console.error('Error checking free/busy:', error.message);
//             // Fail open – return empty array
//             return [];
//         }
//     }

//     /**
//      * Update an existing calendar event (reschedule)
//      * @param {string} eventId - Google event ID
//      * @param {Object} updateData - updated appointment data
//      * @param {number} hospitalId - optional hospital ID
//      */
//     async updateEvent(eventId, updateData, hospitalId = null) {
//         try {
//             const { patient_name, pet_name, appointment_type, date, time } = updateData;

//             let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
//             let authClient = null;

//             if (hospitalId) {
//                 const creds = await this._getHospitalCalendar(hospitalId);
//                 if (creds) {
//                     calendarId = creds.calendarId || 'primary';
//                     authClient = await this._getGoogleClient(creds.refreshToken);
//                 }
//             }

//             if (!authClient) {
//                 authClient = calendar.auth || new google.auth.OAuth2(
//                     env.GOOGLE_CLIENT_ID,
//                     env.GOOGLE_CLIENT_SECRET,
//                     env.GOOGLE_REDIRECT_URI || 'http://localhost'
//                 );
//                 if (env.GOOGLE_REFRESH_TOKEN) {
//                     authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
//                 }
//             }

//             console.log(`   📅 Updating event in calendar: ${calendarId} for hospital ${hospitalId || 'default'}`);

//             const [hours, minutes] = this._parseTime(time);
//             const startDateTime = new Date(`${date}T${hours}:${minutes}:00`);
//             const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

//             const event = {
//                 summary: `${appointment_type.charAt(0).toUpperCase() + appointment_type.slice(1)} - ${pet_name} (${patient_name})`,
//                 start: {
//                     dateTime: startDateTime.toISOString(),
//                     timeZone: env.TIMEZONE || 'Asia/Kolkata'
//                 },
//                 end: {
//                     dateTime: endDateTime.toISOString(),
//                     timeZone: env.TIMEZONE || 'Asia/Kolkata'
//                 }
//             };

//             const response = await calendar.events.patch({
//                 auth: authClient,
//                 calendarId: calendarId,
//                 eventId: eventId,
//                 resource: event,
//                 sendUpdates: 'all'
//             });

//             console.log(`✅ Calendar event updated: ${response.data.id}`);
//             return {
//                 success: true,
//                 eventId: response.data.id,
//                 updated: response.data.updated
//             };

//         } catch (error) {
//             console.error('Error updating calendar event:', error.message);
//             throw new Error(`Failed to update calendar event: ${error.message}`);
//         }
//     }

//     /**
//      * Cancel/Delete a calendar event
//      * @param {string} eventId - Google event ID
//      * @param {number} hospitalId - optional hospital ID
//      */
//     async cancelEvent(eventId, hospitalId = null) {
//         try {
//             let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
//             let authClient = null;

//             if (hospitalId) {
//                 const creds = await this._getHospitalCalendar(hospitalId);
//                 if (creds) {
//                     calendarId = creds.calendarId || 'primary';
//                     authClient = await this._getGoogleClient(creds.refreshToken);
//                 }
//             }

//             if (!authClient) {
//                 authClient = calendar.auth || new google.auth.OAuth2(
//                     env.GOOGLE_CLIENT_ID,
//                     env.GOOGLE_CLIENT_SECRET,
//                     env.GOOGLE_REDIRECT_URI || 'http://localhost'
//                 );
//                 if (env.GOOGLE_REFRESH_TOKEN) {
//                     authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
//                 }
//             }

//             console.log(`   📅 Cancelling event in calendar: ${calendarId} for hospital ${hospitalId || 'default'}`);

//             try {
//                 await calendar.events.patch({
//                     auth: authClient,
//                     calendarId: calendarId,
//                     eventId: eventId,
//                     resource: { status: 'cancelled' },
//                     sendUpdates: 'all'
//                 });
//                 console.log(`✅ Calendar event cancelled: ${eventId}`);
//             } catch (patchError) {
//                 // If patch fails, try delete
//                 await calendar.events.delete({
//                     auth: authClient,
//                     calendarId: calendarId,
//                     eventId: eventId,
//                     sendUpdates: 'all'
//                 });
//                 console.log(`✅ Calendar event deleted: ${eventId}`);
//             }

//             return { success: true };

//         } catch (error) {
//             console.error('Error cancelling calendar event:', error.message);
//             throw new Error(`Failed to cancel calendar event: ${error.message}`);
//         }
//     }

//     /**
//      * Mark event as completed
//      * @param {string} eventId - Google event ID
//      * @param {string} notes - optional notes
//      * @param {number} hospitalId - optional hospital ID
//      */
//     async markCompleted(eventId, notes = '', hospitalId = null) {
//         try {
//             let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
//             let authClient = null;

//             if (hospitalId) {
//                 const creds = await this._getHospitalCalendar(hospitalId);
//                 if (creds) {
//                     calendarId = creds.calendarId || 'primary';
//                     authClient = await this._getGoogleClient(creds.refreshToken);
//                 }
//             }

//             if (!authClient) {
//                 authClient = calendar.auth || new google.auth.OAuth2(
//                     env.GOOGLE_CLIENT_ID,
//                     env.GOOGLE_CLIENT_SECRET,
//                     env.GOOGLE_REDIRECT_URI || 'http://localhost'
//                 );
//                 if (env.GOOGLE_REFRESH_TOKEN) {
//                     authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
//                 }
//             }

//             const event = {
//                 colorId: '2',
//                 summary: `✅ COMPLETED - ${notes}`,
//                 extendedProperties: {
//                     private: {
//                         appointmentStatus: 'completed',
//                         completedAt: new Date().toISOString(),
//                         notes: notes
//                     }
//                 }
//             };

//             const response = await calendar.events.patch({
//                 auth: authClient,
//                 calendarId: calendarId,
//                 eventId: eventId,
//                 resource: event
//             });

//             return { success: true, eventId: response.data.id };

//         } catch (error) {
//             console.error('Error marking event completed:', error.message);
//             throw new Error(`Failed to mark event completed: ${error.message}`);
//         }
//     }

//     /**
//      * Get event details
//      * @param {string} eventId - Google event ID
//      * @param {number} hospitalId - optional hospital ID
//      */
//     async getEvent(eventId, hospitalId = null) {
//         try {
//             let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
//             let authClient = null;

//             if (hospitalId) {
//                 const creds = await this._getHospitalCalendar(hospitalId);
//                 if (creds) {
//                     calendarId = creds.calendarId || 'primary';
//                     authClient = await this._getGoogleClient(creds.refreshToken);
//                 }
//             }

//             if (!authClient) {
//                 authClient = calendar.auth || new google.auth.OAuth2(
//                     env.GOOGLE_CLIENT_ID,
//                     env.GOOGLE_CLIENT_SECRET,
//                     env.GOOGLE_REDIRECT_URI || 'http://localhost'
//                 );
//                 if (env.GOOGLE_REFRESH_TOKEN) {
//                     authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
//                 }
//             }

//             const response = await calendar.events.get({
//                 auth: authClient,
//                 calendarId: calendarId,
//                 eventId: eventId
//             });

//             return response.data;

//         } catch (error) {
//             console.error('Error getting event:', error.message);
//             return null;
//         }
//     }

//     /**
//      * Parse time string to hours and minutes
//      * Accepts: "2:30 PM", "14:30", "02:30 PM"
//      */
//     _parseTime(timeStr) {
//         let hours, minutes;

//         if (timeStr.toUpperCase().includes('PM') || timeStr.toUpperCase().includes('AM')) {
//             const [time, period] = timeStr.split(' ');
//             const [h, m] = time.split(':');
//             hours = parseInt(h);
//             minutes = parseInt(m);

//             if (period.toUpperCase() === 'PM' && hours !== 12) {
//                 hours += 12;
//             } else if (period.toUpperCase() === 'AM' && hours === 12) {
//                 hours = 0;
//             }
//         } else {
//             const [h, m] = timeStr.split(':');
//             hours = parseInt(h);
//             minutes = parseInt(m);
//         }

//         return [
//             hours.toString().padStart(2, '0'),
//             minutes.toString().padStart(2, '0')
//         ];
//     }
// }

// module.exports = new CalendarService();









const { google } = require('googleapis');
const env = require('../config/env');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// Use the calendar instance from config if available, otherwise create one.
const { calendar } = require('../config/google');

// ─── Helper reference for internal calls ───────────────────────────────────────
const self = exports;

// ─── Helper: Parse time string ──────────────────────────────────────────────────
const _parseTime = (timeStr) => {
    let hours, minutes;

    if (timeStr.toUpperCase().includes('PM') || timeStr.toUpperCase().includes('AM')) {
        const [time, period] = timeStr.split(' ');
        const [h, m] = time.split(':');
        hours = parseInt(h);
        minutes = parseInt(m);

        if (period.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }
    } else {
        const [h, m] = timeStr.split(':');
        hours = parseInt(h);
        minutes = parseInt(m);
    }

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0')
    ];
};
// Also expose it so other methods can use it via self._parseTime
exports._parseTime = _parseTime;

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Fetch hospital-specific Google Calendar credentials from DB
 * @param {number} hospitalId
 * @returns {Promise<{ refreshToken: string, calendarId: string } | null>}
 */
exports._getHospitalCalendar = async (hospitalId) => {
    if (!hospitalId) return null;
    try {
        const result = await executeQuery(
            `SELECT google_calendar_refresh_token, google_calendar_id 
             FROM hospital_calendar 
             WHERE hospital_id = $1`,
            [hospitalId]
        );
        if (result.rows.length === 0) {
            console.log(`   ⚠️ No calendar config found for hospital ${hospitalId}, using fallback .env`);
            return null;
        }
        const row = result.rows[0];
        const refreshToken = row.google_calendar_refresh_token;
        const calendarId = row.google_calendar_id || 'primary';

        console.log(`   📅 Hospital ${hospitalId} calendar credentials:`);
        console.log(`      Refresh Token: ${refreshToken ? '✅ Present' : '❌ Missing'}`);
        console.log(`      Calendar ID:   ${calendarId}`);

        return { refreshToken, calendarId };
    } catch (error) {
        logger.error('Error fetching hospital calendar credentials:', error);
        return null;
    }
};

/**
 * Get a Google OAuth2 client with the given refresh token.
 * If no refresh token, falls back to the default client from config.
 */
exports._getGoogleClient = async (refreshToken) => {
    const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI || 'http://localhost'
    );

    if (refreshToken) {
        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });
        return oauth2Client;
    }

    // Fallback: use the default client from config (which may already have credentials)
    if (calendar && calendar.auth) {
        return calendar.auth;
    }

    // Otherwise, return the new client (without refresh token, will fail if not authenticated)
    return oauth2Client;
};

/**
 * Create a calendar event for an appointment
 * @param {Object} appointmentData - appointment details
 * @param {number} hospitalId - hospital ID for dynamic calendar
 */
exports.createEvent = async (appointmentData, hospitalId = null) => {
    try {
        const { patient_name, pet_name, pet_species, pet_breed, appointment_type, date, time, phone } = appointmentData;

        // Get hospital calendar credentials
        let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
        let authClient = null;

        if (hospitalId) {
            const creds = await self._getHospitalCalendar(hospitalId);
            if (creds) {
                calendarId = creds.calendarId || 'primary';
                authClient = await self._getGoogleClient(creds.refreshToken);
            }
        }

        // If no authClient, use default from config
        if (!authClient) {
            authClient = calendar.auth; // fallback to the default auth from config
            if (!authClient) {
                authClient = new google.auth.OAuth2(
                    env.GOOGLE_CLIENT_ID,
                    env.GOOGLE_CLIENT_SECRET,
                    env.GOOGLE_REDIRECT_URI || 'http://localhost'
                );
                if (env.GOOGLE_REFRESH_TOKEN) {
                    authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
                }
            }
        }

        console.log(`   📅 Creating event in calendar: ${calendarId} for hospital ${hospitalId || 'default'}`);

        const [hours, minutes] = _parseTime(time);
        const startDateTime = new Date(`${date}T${hours}:${minutes}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

        const event = {
            summary: `${appointment_type.charAt(0).toUpperCase() + appointment_type.slice(1)} - ${pet_name} (${patient_name})`,
            description: `Patient: ${patient_name}\nPhone: ${phone}\nPet: ${pet_name}\nSpecies: ${pet_species}\nBreed: ${pet_breed}\nType: ${appointment_type}`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: env.TIMEZONE || 'Asia/Kolkata'
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: env.TIMEZONE || 'Asia/Kolkata'
            },
            attendees: [
                { email: env.ADMIN_EMAIL || 'abs@gmail.com' }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 30 }
                ]
            },
            colorId: '1',
            extendedProperties: {
                private: {
                    patientName: patient_name,
                    petName: pet_name,
                    petspecies: pet_species,
                    petBreed: pet_breed,
                    appointmentType: appointment_type,
                    phone: phone,
                    appointmentStatus: 'confirmed',
                    hospitalId: String(hospitalId || '')
                }
            }
        };

        const response = await calendar.events.insert({
            auth: authClient,
            calendarId: calendarId,
            resource: event,
            sendUpdates: 'all'
        });

        console.log(`✅ Calendar event created: ${response.data.id} for hospital ${hospitalId || 'default'}`);
        return {
            success: true,
            eventId: response.data.id,
            htmlLink: response.data.htmlLink,
            created: response.data.created
        };

    } catch (error) {
        console.error('Error creating calendar event:', error.message);
        if (error.response) {
            console.error('Google API Error:', error.response.data);
        }
        throw new Error(`Failed to create calendar event: ${error.message}`);
    }
};

/**
 * Check free/busy for a specific date and hospital
 * @param {string} date - YYYY-MM-DD
 * @param {number} hospitalId - optional hospital ID
 */
exports.checkFreeBusy = async (date, hospitalId = null) => {
    try {
        let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
        let authClient = null;

        if (hospitalId) {
            const creds = await self._getHospitalCalendar(hospitalId);
            if (creds) {
                calendarId = creds.calendarId || 'primary';
                authClient = await self._getGoogleClient(creds.refreshToken);
            }
        }

        if (!authClient) {
            authClient = calendar.auth || new google.auth.OAuth2(
                env.GOOGLE_CLIENT_ID,
                env.GOOGLE_CLIENT_SECRET,
                env.GOOGLE_REDIRECT_URI || 'http://localhost'
            );
            if (env.GOOGLE_REFRESH_TOKEN) {
                authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
            }
        }

        console.log(`   📅 Checking free/busy in calendar: ${calendarId} for hospital ${hospitalId || 'default'}`);

        const timeMin = new Date(`${date}T00:00:00`);
        const timeMax = new Date(`${date}T23:59:59`);

        const response = await calendar.freebusy.query({
            auth: authClient,
            requestBody: {
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                timeZone: env.TIMEZONE || 'Asia/Kolkata',
                items: [{ id: calendarId }]
            }
        });

        const busySlots = response.data.calendars[calendarId]?.busy || [];

        console.log(`      📊 Found ${busySlots.length} busy slots from Google Calendar`);

        return busySlots.map(slot => ({
            start: new Date(slot.start),
            end: new Date(slot.end)
        }));

    } catch (error) {
        console.error('Error checking free/busy:', error.message);
        return [];
    }
};

/**
 * Update an existing calendar event (reschedule)
 * @param {string} eventId - Google event ID
 * @param {Object} updateData - updated appointment data
 * @param {number} hospitalId - optional hospital ID
 */
exports.updateEvent = async (eventId, updateData, hospitalId = null) => {
    try {
        const { patient_name, pet_name, appointment_type, date, time } = updateData;

        let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
        let authClient = null;

        if (hospitalId) {
            const creds = await self._getHospitalCalendar(hospitalId);
            if (creds) {
                calendarId = creds.calendarId || 'primary';
                authClient = await self._getGoogleClient(creds.refreshToken);
            }
        }

        if (!authClient) {
            authClient = calendar.auth || new google.auth.OAuth2(
                env.GOOGLE_CLIENT_ID,
                env.GOOGLE_CLIENT_SECRET,
                env.GOOGLE_REDIRECT_URI || 'http://localhost'
            );
            if (env.GOOGLE_REFRESH_TOKEN) {
                authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
            }
        }

        console.log(`   📅 Updating event in calendar: ${calendarId} for hospital ${hospitalId || 'default'}`);

        const [hours, minutes] = _parseTime(time);
        const startDateTime = new Date(`${date}T${hours}:${minutes}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

        const event = {
            summary: `${appointment_type.charAt(0).toUpperCase() + appointment_type.slice(1)} - ${pet_name} (${patient_name})`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: env.TIMEZONE || 'Asia/Kolkata'
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: env.TIMEZONE || 'Asia/Kolkata'
            }
        };

        const response = await calendar.events.patch({
            auth: authClient,
            calendarId: calendarId,
            eventId: eventId,
            resource: event,
            sendUpdates: 'all'
        });

        console.log(`✅ Calendar event updated: ${response.data.id}`);
        return {
            success: true,
            eventId: response.data.id,
            updated: response.data.updated
        };

    } catch (error) {
        console.error('Error updating calendar event:', error.message);
        throw new Error(`Failed to update calendar event: ${error.message}`);
    }
};

/**
 * Cancel/Delete a calendar event
 * @param {string} eventId - Google event ID
 * @param {number} hospitalId - optional hospital ID
 */
exports.cancelEvent = async (eventId, hospitalId = null) => {
    try {
        let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
        let authClient = null;

        if (hospitalId) {
            const creds = await self._getHospitalCalendar(hospitalId);
            if (creds) {
                calendarId = creds.calendarId || 'primary';
                authClient = await self._getGoogleClient(creds.refreshToken);
            }
        }

        if (!authClient) {
            authClient = calendar.auth || new google.auth.OAuth2(
                env.GOOGLE_CLIENT_ID,
                env.GOOGLE_CLIENT_SECRET,
                env.GOOGLE_REDIRECT_URI || 'http://localhost'
            );
            if (env.GOOGLE_REFRESH_TOKEN) {
                authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
            }
        }

        console.log(`   📅 Cancelling event in calendar: ${calendarId} for hospital ${hospitalId || 'default'}`);

        try {
            await calendar.events.patch({
                auth: authClient,
                calendarId: calendarId,
                eventId: eventId,
                resource: { status: 'cancelled' },
                sendUpdates: 'all'
            });
            console.log(`✅ Calendar event cancelled: ${eventId}`);
        } catch (patchError) {
            // If patch fails, try delete
            await calendar.events.delete({
                auth: authClient,
                calendarId: calendarId,
                eventId: eventId,
                sendUpdates: 'all'
            });
            console.log(`✅ Calendar event deleted: ${eventId}`);
        }

        return { success: true };

    } catch (error) {
        console.error('Error cancelling calendar event:', error.message);
        throw new Error(`Failed to cancel calendar event: ${error.message}`);
    }
};

/**
 * Mark event as completed
 * @param {string} eventId - Google event ID
 * @param {string} notes - optional notes
 * @param {number} hospitalId - optional hospital ID
 */
exports.markCompleted = async (eventId, notes = '', hospitalId = null) => {
    try {
        let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
        let authClient = null;

        if (hospitalId) {
            const creds = await self._getHospitalCalendar(hospitalId);
            if (creds) {
                calendarId = creds.calendarId || 'primary';
                authClient = await self._getGoogleClient(creds.refreshToken);
            }
        }

        if (!authClient) {
            authClient = calendar.auth || new google.auth.OAuth2(
                env.GOOGLE_CLIENT_ID,
                env.GOOGLE_CLIENT_SECRET,
                env.GOOGLE_REDIRECT_URI || 'http://localhost'
            );
            if (env.GOOGLE_REFRESH_TOKEN) {
                authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
            }
        }

        const event = {
            colorId: '2',
            summary: `✅ COMPLETED - ${notes}`,
            extendedProperties: {
                private: {
                    appointmentStatus: 'completed',
                    completedAt: new Date().toISOString(),
                    notes: notes
                }
            }
        };

        const response = await calendar.events.patch({
            auth: authClient,
            calendarId: calendarId,
            eventId: eventId,
            resource: event
        });

        return { success: true, eventId: response.data.id };

    } catch (error) {
        console.error('Error marking event completed:', error.message);
        throw new Error(`Failed to mark event completed: ${error.message}`);
    }
};

/**
 * Get event details
 * @param {string} eventId - Google event ID
 * @param {number} hospitalId - optional hospital ID
 */
exports.getEvent = async (eventId, hospitalId = null) => {
    try {
        let calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
        let authClient = null;

        if (hospitalId) {
            const creds = await self._getHospitalCalendar(hospitalId);
            if (creds) {
                calendarId = creds.calendarId || 'primary';
                authClient = await self._getGoogleClient(creds.refreshToken);
            }
        }

        if (!authClient) {
            authClient = calendar.auth || new google.auth.OAuth2(
                env.GOOGLE_CLIENT_ID,
                env.GOOGLE_CLIENT_SECRET,
                env.GOOGLE_REDIRECT_URI || 'http://localhost'
            );
            if (env.GOOGLE_REFRESH_TOKEN) {
                authClient.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
            }
        }

        const response = await calendar.events.get({
            auth: authClient,
            calendarId: calendarId,
            eventId: eventId
        });

        return response.data;

    } catch (error) {
        console.error('Error getting event:', error.message);
        return null;
    }
};