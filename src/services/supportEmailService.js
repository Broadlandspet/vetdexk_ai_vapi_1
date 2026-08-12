

// // // services/supportEmailService.js
// // const { google } = require('googleapis');
// // const { OAuth2Client } = require('google-auth-library');
// // const logger = require('../utils/logger');
// // const storageService = require('./storageService');


// // class SupportEmailService {
// //     constructor() {
// //         this.clientId = process.env.SUPERADMIN_GOOGLE_CLIENT_ID;
// //         this.clientSecret = process.env.SUPERADMIN_GOOGLE_CLIENT_SECRET;
// //         this.refreshToken = process.env.SUPERADMIN_GMAIL_REFRESH_TOKEN;
// //         this.email = process.env.SUPERADMIN_GMAIL_EMAIL;

// //         const keywordsStr = process.env.SUPPORT_EMAIL_KEYWORDS || 'query,queries';
// //         this.allowedKeywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

// //         const sendersStr = process.env.SUPPORT_ALLOWED_SENDERS || '';
// //         this.allowedSenders = sendersStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

// //         if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.email) {
// //             logger.error('❌ Missing superadmin Gmail OAuth credentials');
// //             throw new Error('Missing superadmin Gmail OAuth credentials');
// //         }

// //         logger.info('🔍 SUPPORT EMAIL SERVICE INITIALIZED');
// //         logger.info(`   📧 Email: ${this.email}`);
// //         logger.info(`   📋 Keywords: ${this.allowedKeywords.join(', ')}`);

// //         this.oauth2Client = new OAuth2Client(
// //             this.clientId,
// //             this.clientSecret,
// //             'https://developers.google.com/oauthplayground'
// //         );

// //         this.oauth2Client.setCredentials({
// //             refresh_token: this.refreshToken
// //         });

// //         this.gmail = google.gmail({
// //             version: 'v1',
// //             auth: this.oauth2Client
// //         });

// //         this.lastTokenRefresh = Date.now();
// //         this.tokenRefreshInterval = 50 * 60 * 1000;

// //         this.oauth2Client.on('tokens', (tokens) => {
// //             if (tokens.refresh_token) {
// //                 logger.info('🔄 New refresh token received');
// //             }
// //             logger.info('🔄 Access token refreshed');
// //         });
// //     }

// // // services/supportEmailService.js

// // // Add at the top

// // /**
// //  * ✅ NEW: Extract attachments from email
// //  */
// // async extractAttachments(gmailMessage) {
// //     const attachments = [];
    
// //     const findAttachments = (part) => {
// //         if (part.filename && part.filename.length > 0) {
// //             attachments.push({
// //                 filename: part.filename,
// //                 mimeType: part.mimeType,
// //                 size: part.body.size || 0,
// //                 attachmentId: part.body.attachmentId,
// //                 data: part.body.data || null
// //             });
// //         }
        
// //         if (part.parts) {
// //             part.parts.forEach(findAttachments);
// //         }
// //     };
    
// //     if (gmailMessage.payload.parts) {
// //         gmailMessage.payload.parts.forEach(findAttachments);
// //     } else if (gmailMessage.payload.filename && gmailMessage.payload.filename.length > 0) {
// //         attachments.push({
// //             filename: gmailMessage.payload.filename,
// //             mimeType: gmailMessage.payload.mimeType,
// //             size: gmailMessage.payload.body.size || 0,
// //             attachmentId: gmailMessage.payload.body.attachmentId,
// //             data: gmailMessage.payload.body.data || null
// //         });
// //     }
    
// //     return attachments;
// // }

// // /**
// //  * ✅ NEW: Download attachment from Gmail
// //  */
// // async downloadAttachment(messageId, attachmentId) {
// //     try {
// //         await this.ensureValidToken();
// //         const response = await this.gmail.users.messages.attachments.get({
// //             userId: 'me',
// //             messageId: messageId,
// //             id: attachmentId
// //         });
// //         return response.data;
// //     } catch (error) {
// //         logger.error(`❌ Error downloading attachment ${attachmentId}:`, error.message);
// //         throw error;
// //     }
// // }

// // /**
// //  * ✅ NEW: Save attachment to Supabase
// //  */
// // async saveAttachment(attachmentData, ticketId, replyId = null, uploadedBy = null) {
// //     try {
// //         const { executeQuery } = require('../config/database');
        
// //         // Upload to Supabase
// //         const uploadResult = await storageService.uploadFromBase64(
// //             attachmentData.data,
// //             attachmentData.filename,
// //             attachmentData.mimeType,
// //             ticketId
// //         );

// //         // Save to database
// //         const dbResult = await executeQuery(
// //             `INSERT INTO support_attachments 
// //              (ticket_id, reply_id, filename, file_size, mime_type, storage_path, download_url, uploaded_by)
// //              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
// //              RETURNING *`,
// //             [ticketId, replyId, attachmentData.filename, attachmentData.size, 
// //              attachmentData.mimeType, uploadResult.storagePath, uploadResult.downloadUrl, uploadedBy]
// //         );

// //         // Update attachment count
// //         await executeQuery(
// //             `UPDATE support_tickets SET attachment_count = (
// //                 SELECT COUNT(*) FROM support_attachments WHERE ticket_id = $1
// //             ) WHERE id = $1`,
// //             [ticketId]
// //         );

// //         logger.info(`📎 Saved attachment: ${attachmentData.filename} → ${uploadResult.downloadUrl}`);
// //         return dbResult.rows[0];

// //     } catch (error) {
// //         logger.error('❌ Error saving attachment:', error.message);
// //         throw error;
// //     }
// // }

// // /**
// //  * ✅ NEW: Save file from dashboard upload
// //  */
// // async saveUploadedFile(file, ticketId, replyId = null, uploadedBy = null) {
// //     try {
// //         const { executeQuery } = require('../config/database');
        
// //         const uploadResult = await storageService.uploadFile(
// //             file.buffer,
// //             file.originalname,
// //             file.mimetype,
// //             ticketId
// //         );

// //         const dbResult = await executeQuery(
// //             `INSERT INTO support_attachments 
// //              (ticket_id, reply_id, filename, file_size, mime_type, storage_path, download_url, uploaded_by)
// //              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
// //              RETURNING *`,
// //             [ticketId, replyId, file.originalname, file.size, 
// //              file.mimetype, uploadResult.storagePath, uploadResult.downloadUrl, uploadedBy]
// //         );

// //         await executeQuery(
// //             `UPDATE support_tickets SET attachment_count = (
// //                 SELECT COUNT(*) FROM support_attachments WHERE ticket_id = $1
// //             ) WHERE id = $1`,
// //             [ticketId]
// //         );

// //         logger.info(`📎 Uploaded file: ${file.originalname} → ${uploadResult.downloadUrl}`);
// //         return dbResult.rows[0];

// //     } catch (error) {
// //         logger.error('❌ Error saving uploaded file:', error.message);
// //         throw error;
// //     }
// // }



// //     async ensureValidToken() {
// //         try {
// //             const now = Date.now();
// //             if (now - this.lastTokenRefresh > this.tokenRefreshInterval) {
// //                 logger.info('🔄 Refreshing Gmail access token...');
// //                 const { credentials } = await this.oauth2Client.refreshAccessToken();
// //                 this.oauth2Client.setCredentials(credentials);
// //                 this.lastTokenRefresh = now;
// //                 logger.info('✅ Gmail token refreshed');
// //             }
// //             return this.oauth2Client;
// //         } catch (error) {
// //             logger.error('❌ Error refreshing Gmail token:', error.message);
// //             try {
// //                 logger.info('🔄 Retrying token refresh...');
// //                 const { credentials } = await this.oauth2Client.refreshAccessToken();
// //                 this.oauth2Client.setCredentials(credentials);
// //                 this.lastTokenRefresh = Date.now();
// //                 logger.info('✅ Token refresh retry successful');
// //                 return this.oauth2Client;
// //             } catch (retryError) {
// //                 logger.error('❌ Retry failed:', retryError.message);
// //                 throw new Error('Unable to refresh Gmail token');
// //             }
// //         }
// //     }

// //     async testConnection() {
// //         try {
// //             await this.ensureValidToken();
// //             const response = await this.gmail.users.getProfile({ userId: 'me' });
// //             logger.info('✅ Gmail connection successful');
// //             logger.info(`   📧 Email: ${response.data.emailAddress}`);
// //             return response.data;
// //         } catch (error) {
// //             logger.error('❌ Gmail connection failed:', error.message);
// //             throw error;
// //         }
// //     }

// //     /**
// //      * Check if email is from system/marketing sender
// //      */
// //  // services/supportEmailService.js

// // isSystemEmail(email) {
// //     // ✅ CHECK HEADERS FIRST (most reliable)
// //     if (email.headers) {
// //         const autoReply = (email.headers['x-auto-reply'] || '').toLowerCase();
// //         const systemEmail = (email.headers['x-system-email'] || '').toLowerCase();
// //         const precedence = (email.headers['precedence'] || '').toLowerCase();
// //         const autoSubmitted = (email.headers['auto-submitted'] || '').toLowerCase();
        
// //         if (autoReply === 'yes' || 
// //             systemEmail === 'true' || 
// //             precedence === 'bulk' ||
// //             autoSubmitted === 'auto-replied' ||
// //             autoSubmitted === 'auto-generated') {
// //             return true;
// //         }
// //     }
    
// //     const systemSenders = [
// //         'mailer-daemon@',
// //         'no-reply@',
// //         'noreply@',
// //         'mailer@',
// //         'system@',
// //         'mail-daemon@',
// //         'team@mail.perplexity.ai',
// //         'marketing@',
// //         'newsletter@',
// //         'digest@',
// //         'notifications@',
// //         'accounts@',
// //         'security@',
// //         'info@',
// //         'hello@',
// //         'welcome@',
// //         'support@'
// //     ];
    
// //     const from = (email.from || '').toLowerCase();
// //     for (const sender of systemSenders) {
// //         if (from.includes(sender)) {
// //             return true;
// //         }
// //     }
    
// //     const body = (email.body || '').toLowerCase();
// //     const subject = (email.subject || '').toLowerCase();
    
// //     // ✅ CHECK FOR CONFIRMATION PATTERNS
// //     if (body.includes('thank you for contacting us') && 
// //         body.includes('we have received your query')) {
// //         return true;
// //     }
    
// //     if (body.includes('ticket number:') && 
// //         body.includes('we will get back to you shortly')) {
// //         return true;
// //     }
    
// //     // ✅ CHECK FOR RESOLUTION NOTICES
// //     if (body.includes('has been marked as resolved') && 
// //         body.includes('if you are not satisfied')) {
// //         return true;
// //     }
    
// //     if (body.includes('automated message') && body.includes('ticket number')) {
// //         return true;
// //     }
    
// //     if (subject.includes('we received your query') || 
// //         subject.includes('confirmation') ||
// //         subject.includes('thank you for contacting')) {
// //         return true;
// //     }
    
// //     const marketingSubject = [
// //         'welcome',
// //         'newsletter',
// //         'digest',
// //         'new feature',
// //         'announcement',
// //         'delivery status',
// //         'mail delivery subsystem'
// //     ];
    
// //     for (const pattern of marketingSubject) {
// //         if (subject.includes(pattern) && !subject.includes('ticket-')) {
// //             return true;
// //         }
// //     }
    
// //     return false;
// // }

// //     /**
// //      * Check if email matches allowed keywords (subject + sender only)
// //      */
// //     hasMatchingKeyword(email) {
// //         const searchText = `${email.subject} ${email.from}`.toLowerCase();
        
// //         for (const keyword of this.allowedKeywords) {
// //             if (searchText.includes(keyword.toLowerCase())) {
// //                 return true;
// //             }
// //         }
// //         return false;
// //     }

// //     /**
// //      * Check if email is a reply to an existing ticket
// //      */
// //     isTicketReply(email) {
// //         const ticketPattern = /ticket-\d{8}-\d{4}/i;
// //         if (ticketPattern.test(email.subject)) return true;
// //         if (email.inReplyTo) return true;
// //         if (email.references) return true;
// //         return false;
// //     }

// //     /**
// //      * Extract ticket number from email subject
// //      */
// //     extractTicketNumber(subject) {
// //         if (!subject) return null;
// //         const match = subject.match(/TICKET-(\d{8}-\d{4})/i);
// //         return match ? `TICKET-${match[1]}` : null;
// //     }

// //     /**
// //      * Fetch candidate emails by date window (NOT just unread)
// //      */
// //     async fetchCandidateEmails(maxResults = 100) {
// //         logger.info('📧 Fetching candidate emails...');
// //         try {
// //             await this.ensureValidToken();

// //             const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
// //             const dateStr = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;

// //             let query = `in:inbox after:${dateStr}`;
// //             if (this.allowedSenders.length > 0) {
// //                 const fromQuery = this.allowedSenders.map(e => `from:${e}`).join(' OR ');
// //                 query = `in:inbox after:${dateStr} (${fromQuery})`;
// //             }

// //             logger.info(`   🔍 Search query: ${query}`);

// //             const response = await this.gmail.users.messages.list({
// //                 userId: 'me',
// //                 q: query,
// //                 maxResults
// //             });

// //             const messages = response.data.messages || [];
// //             logger.info(`   📊 Found ${messages.length} emails`);

// //             const emails = [];
// //             let skippedSystem = 0;
// //             let skippedNoKeyword = 0;

// //             for (const msg of messages) {
// //                 try {
// //                     const email = await this.getEmailById(msg.id);
                    
// //                     if (this.isSystemEmail(email)) {
// //                         skippedSystem++;
// //                         logger.debug(`   ⏭️ Skipping system email: ${email.subject}`);
// //                         continue;
// //                     }
                    
// //                     const hasKeyword = this.hasMatchingKeyword(email);
// //                     const isTicketReply = this.isTicketReply(email);

// //                     if (hasKeyword || isTicketReply) {
// //                         emails.push(email);
// //                         logger.info(`   ✅ [${emails.length}] From: ${email.from}, Subject: ${email.subject}`);
// //                     } else {
// //                         skippedNoKeyword++;
// //                     }
// //                 } catch (err) {
// //                     logger.error(`   ❌ Error fetching email ${msg.id}:`, err.message);
// //                 }
// //             }

// //             logger.info(`✅ Found ${emails.length} candidate emails (${skippedSystem} system, ${skippedNoKeyword} no keyword)`);
// //             return emails;

// //         } catch (error) {
// //             logger.error('❌ Error fetching candidate emails:', error.message);
// //             throw error;
// //         }
// //     }

// // /**
// //  * ✅ NEW: Diff Gmail history since a given historyId, return message IDs
// //  * that were added to the mailbox (used by the Pub/Sub webhook).
// //  */
// // async getHistoryMessageIds(startHistoryId) {
// //     await this.ensureValidToken();
// //     try {
// //         const messageIds = new Set();
// //         let pageToken = null;

// //         do {
// //             const response = await this.gmail.users.history.list({
// //                 userId: 'me',
// //                 startHistoryId: startHistoryId,
// //                 historyTypes: ['messageAdded'],
// //                 ...(pageToken && { pageToken })
// //             });

// //             const history = response.data.history || [];
// //             for (const record of history) {
// //                 for (const added of record.messagesAdded || []) {
// //                     if (added.message?.id) {
// //                         messageIds.add(added.message.id);
// //                     }
// //                 }
// //             }

// //             pageToken = response.data.nextPageToken;
// //         } while (pageToken);

// //         logger.info(`📜 History diff from ${startHistoryId}: ${messageIds.size} new message(s)`);
// //         return Array.from(messageIds);

// //     } catch (error) {
// //         // 404 = startHistoryId too old — Gmail only retains ~1 week of history.
// //         // This can happen if the server was down a while or watch() lapsed.
// //         if (error.code === 404 || error.response?.status === 404) {
// //             logger.error(`❌ startHistoryId ${startHistoryId} expired/invalid. Falling back to full sync.`);
// //             return null; // ✅ signal "can't diff, do a full sync instead" — different from []=[]"nothing new"
// //         }
// //         logger.error('❌ Error fetching Gmail history:', error.message);
// //         throw error;
// //     }
// // }

// // /**
// //  * ✅ NEW: Register (or renew) Gmail push notifications for this mailbox.
// //  * Must be re-called at least every 7 days — Gmail expires watch() automatically.
// //  */
// // async startWatch() {
// //     await this.ensureValidToken();
// //     try {
// //         const topicName = process.env.GMAIL_PUBSUB_TOPIC
// //             || 'projects/hospital-management-503802/topics/gmail-support-notifications';

// //        const response = await this.gmail.users.watch({
// //     userId: 'me',
// //     requestBody: {
// //         topicName,
// //         labelIds: ['INBOX', 'SENT'],
// //         labelFilterBehavior: 'INCLUDE'
// //     }
// // });

// //         logger.info(`👁️ Gmail watch registered. historyId=${response.data.historyId}, expiration=${response.data.expiration}`);

// //         return {
// //             historyId: response.data.historyId,
// //             expiration: response.data.expiration
// //         };
// //     } catch (error) {
// //         logger.error('❌ Error starting Gmail watch:', error.message);
// //         throw error;
// //     }
// // }


// //     /**
// //      * Fetch full thread by thread ID
// //      */
// //     async fetchThreadMessages(threadId) {
// //         try {
// //             await this.ensureValidToken();
// //             const response = await this.gmail.users.threads.get({
// //                 userId: 'me',
// //                 id: threadId,
// //                 format: 'full'
// //             });

// //             const messages = response.data.messages || [];
// //             logger.info(`📊 Thread ${threadId} has ${messages.length} messages`);
            
// //             return messages.map(m => this.parseEmail(m));
// //         } catch (error) {
// //             logger.error(`❌ Error fetching thread ${threadId}:`, error.message);
// //             throw error;
// //         }
// //     }

// //     /**
// //      * Send email with proper RFC822 Message-ID threading.
// //      *
// //      * IMPORTANT: Gmail does not reliably honor a custom Message-ID header
// //      * on outbound mail — it may silently reassign its own. So after sending,
// //      * we read the message back and use whatever Message-ID Gmail actually
// //      * attached, instead of trusting the one we generated.
// //      *
// //      * Subject is passed through UNCHANGED (no ticket-number bracket appended
// //      * here) — callers are responsible for keeping the subject's normalized
// //      * form ("Re: " stripped) identical across the whole ticket lifecycle,
// //      * since Gmail requires matching subjects to group messages into a thread.
// //      */
// // // In supportEmailService.js - sendEmailReply() method

// // async sendEmailReply({ 
// //     to, 
// //     subject, 
// //     html, 
// //     inReplyToMessageId = null, 
// //     referencesChain = null, 
// //     threadId = null, 
// //     cc = [], 
// //     bcc = [], 
// //     ticketNumber = null 
// // }) {
// //     await this.ensureValidToken();

// //     const fromEmail = this.email;
// //     const domain = fromEmail.split('@')[1] || 'support.com';

// //     if (!ticketNumber) {
// //         const match = subject.match(/\[(TICKET-\d{8}-\d{4})\]/);
// //         if (match) ticketNumber = match[1];
// //     }

// //     const provisionalMessageId = `<${ticketNumber || 'ticket'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${domain}>`;

// //     // ✅ BUILD ALL HEADERS - ADD SYSTEM IDENTIFICATION HEADERS
// //     const emailLines = [
// //         `From: "Support Team" <${fromEmail}>`,
// //         `To: ${to}`,
// //         ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []),
// //         ...(bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
// //         `Subject: ${subject}`,
// //         `Message-ID: ${provisionalMessageId}`,
// //         'MIME-Version: 1.0',
// //         'Content-Type: text/html; charset=utf-8',
// //         'Content-Transfer-Encoding: 7bit',
// //         // ✅ ADD THESE HEADERS to identify system emails
// //         'X-Auto-Reply: yes',
// //         'X-System-Email: true',
// //         'Precedence: bulk',
// //         'Auto-Submitted: auto-replied'
// //     ];

// //     if (inReplyToMessageId) {
// //         const chain = referencesChain
// //             ? `${referencesChain} ${inReplyToMessageId}`
// //             : inReplyToMessageId;
// //         emailLines.push(`In-Reply-To: ${inReplyToMessageId}`);
// //         emailLines.push(`References: ${chain}`);
// //     } else if (ticketNumber) {
// //         const syntheticId = `<${ticketNumber}@${domain}>`;
// //         emailLines.push(`In-Reply-To: ${syntheticId}`);
// //         emailLines.push(`References: ${syntheticId}`);
// //     }

// //     if (ticketNumber) {
// //         emailLines.push(`X-Ticket-Number: ${ticketNumber}`);
// //     }

// //     emailLines.push('');
// //     emailLines.push(html);

// //     const rawEmail = emailLines.join('\r\n');
// //     const base64Encoded = Buffer.from(rawEmail)
// //         .toString('base64')
// //         .replace(/\+/g, '-')
// //         .replace(/\//g, '_')
// //         .replace(/=+$/, '');

// //     const resource = {
// //         raw: base64Encoded,
// //         ...(threadId && { threadId })
// //     };

// //     const response = await this.gmail.users.messages.send({
// //         userId: 'me',
// //         resource
// //     });

// //     const supportTicketService = require('./supportTicketService');
// // await supportTicketService.markEmailProcessed(response.data.id, null); // reserve immediately, ticket linked later if needed

// //     let actualMessageId = provisionalMessageId;
// //     try {
// //         const sent = await this.gmail.users.messages.get({
// //             userId: 'me',
// //             id: response.data.id,
// //             format: 'metadata',
// //             metadataHeaders: ['Message-ID']
// //         });
// //         const header = (sent.data.payload.headers || [])
// //             .find(h => h.name.toLowerCase() === 'message-id');

// //         if (header && header.value) {
// //             actualMessageId = header.value;
// //             if (actualMessageId !== provisionalMessageId) {
// //                 logger.warn(`⚠️ Gmail reassigned Message-ID. Sent: ${provisionalMessageId}, Actual: ${actualMessageId}`);
// //             }
// //         }
// //     } catch (verifyErr) {
// //         logger.error('⚠️ Could not verify actual Message-ID after send, falling back to provisional value:', verifyErr.message);
// //     }

// //     const references = inReplyToMessageId
// //         ? (referencesChain ? `${referencesChain} ${inReplyToMessageId}` : inReplyToMessageId)
// //         : null;

// //     logger.info(`✅ Support reply sent to ${to}, apiId: ${response.data.id}, threadId: ${response.data.threadId}, rfcMsgId: ${actualMessageId}`);

// //     return {
// //         gmailApiMessageId: response.data.id,
// //         rfcMessageId: actualMessageId,
// //         references: references,
// //         threadId: response.data.threadId
// //     };
// // }

// //     async getEmailById(messageId) {
// //         await this.ensureValidToken();
// //         const response = await this.gmail.users.messages.get({
// //             userId: 'me',
// //             id: messageId,
// //             format: 'full'
// //         });
// //         return this.parseEmail(response.data);
// //     }

// //    parseEmail(gmailMessage) {
// //     const headers = {};
// //     (gmailMessage.payload.headers || []).forEach(header => {
// //         headers[header.name.toLowerCase()] = header.value;
// //     });

// //     let plainText = '';
// //     let htmlText = '';

// //     const extractBody = (part) => {
// //         if (part.mimeType === 'text/plain' && part.body && part.body.data) {
// //             plainText = Buffer.from(part.body.data, 'base64').toString('utf-8');
// //         } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
// //             htmlText = Buffer.from(part.body.data, 'base64').toString('utf-8');
// //         } else if (part.parts) {
// //             part.parts.forEach(extractBody);
// //         }
// //     };

// //     if (gmailMessage.payload.parts) {
// //     gmailMessage.payload.parts.forEach(extractBody);
// // } else if (gmailMessage.payload.body && gmailMessage.payload.body.data) {
// //     const decoded = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf-8');
// //     if (gmailMessage.payload.mimeType === 'text/html') {
// //         htmlText = decoded;
// //     } else {
// //         plainText = decoded;
// //     }
// // }

// //     const body = plainText || htmlText || gmailMessage.snippet || '';
// //     const cleanedBody = this.cleanEmailBody(body);

// //     return {
// //         id: gmailMessage.id,
// //         threadId: gmailMessage.threadId,
// //         from: headers.from || '',
// //         to: headers.to || '',
// //         subject: headers.subject || '(no subject)',
// //         date: headers.date || new Date().toISOString(),
// //         messageId: headers['message-id'] || '',
// //         inReplyTo: headers['in-reply-to'] || null,
// //         references: headers.references || null,
// //         body: cleanedBody,
// //         plainText: plainText || body,
// //         htmlText: htmlText || '',
// //         snippet: gmailMessage.snippet || '',
// //         labels: gmailMessage.labelIds || [],
// //         // ✅ ADD HEADERS TO THE PARSED EMAIL
// //         headers: headers
// //     };
// // }

// // cleanEmailBody(body) {
// //     if (!body) return '';

 
// //     const quoteHeaderPattern = /^On\s[\s\S]*?wrote:\s*/im;
// //     const quoteMatch = body.match(quoteHeaderPattern);
// //     let cleaned = quoteMatch ? body.slice(0, quoteMatch.index) : body;

// //     cleaned = cleaned
// //         .replace(/^>.*$/gm, '')
// //         .replace(/From: .*$/gm, '')
// //         .replace(/Sent: .*$/gm, '')
// //         .replace(/To: .*$/gm, '')
// //         .replace(/Subject: .*$/gm, '')
// //         .replace(/--\s*$.*/s, '')
// //         .replace(/Sent from my (iPhone|Android|iPad|BlackBerry).*$/m, '')
// //         .replace(/Get (Outlook|Gmail|Mail) for (iOS|Android|Windows|Mac).*$/m, '')
// //         .replace(/^__*$/gm, '')
// //         .replace(/\n{3,}/g, '\n\n');

// //     return cleaned.trim();
// // }

// //     async markAsRead(messageId) {
// //         await this.ensureValidToken();
// //         await this.gmail.users.messages.modify({
// //             userId: 'me',
// //             id: messageId,
// //             resource: { removeLabelIds: ['UNREAD'] }
// //         });
// //         return true;
// //     }

// //     async applyLabels(messageId, labelNames) {
// //         await this.ensureValidToken();
// //         const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' });
// //         const existingLabels = labelsResponse.data.labels || [];

// //         const labelIds = [];
// //         for (const labelName of labelNames) {
// //             let label = existingLabels.find(l => l.name === labelName);
// //             if (!label) {
// //                 const createResponse = await this.gmail.users.labels.create({
// //                     userId: 'me',
// //                     resource: {
// //                         name: labelName,
// //                         labelListVisibility: 'labelShow',
// //                         messageListVisibility: 'show'
// //                     }
// //                 });
// //                 label = createResponse.data;
// //             }
// //             labelIds.push(label.id);
// //         }

// //         await this.gmail.users.messages.modify({
// //             userId: 'me',
// //             id: messageId,
// //             resource: { addLabelIds: labelIds }
// //         });
// //         return true;
// //     }

// // // services/supportEmailService.js

// // /**
// //  * ✅ FIXED: Use date window instead of subject:TICKET-
// //  * Subject no longer contains ticket number after threading fix.
// //  */
// // async fetchSentEmails() {
// //     logger.info('📤 Fetching sent emails...');
// //     try {
// //         await this.ensureValidToken();

// //         // Use date window like fetchCandidateEmails
// //         const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
// //         const dateStr = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;
// //         const query = `in:sent after:${dateStr}`;

// //         const response = await this.gmail.users.messages.list({
// //             userId: 'me',
// //             q: query,
// //             maxResults: 50
// //         });

// //         const messages = response.data.messages || [];
// //         const emails = [];
// //         for (const msg of messages) {
// //             try {
// //                 const email = await this.getEmailById(msg.id);
// //                 emails.push(email);
// //             } catch (err) {
// //                 logger.error(`   ❌ Error fetching sent email ${msg.id}:`, err.message);
// //             }
// //         }
// //         return emails;
// //     } catch (error) {
// //         logger.error('❌ Error fetching sent emails:', error.message);
// //         throw error;
// //     }
// // }
// // }

// // module.exports = new SupportEmailService();


// // services/supportEmailService.js
// const { google } = require('googleapis');
// const { OAuth2Client } = require('google-auth-library');
// const logger = require('../utils/logger');
// const storageService = require('./storageService');


// class SupportEmailService {
//     constructor() {
//         this.clientId = process.env.SUPERADMIN_GOOGLE_CLIENT_ID;
//         this.clientSecret = process.env.SUPERADMIN_GOOGLE_CLIENT_SECRET;
//         this.refreshToken = process.env.SUPERADMIN_GMAIL_REFRESH_TOKEN;
//         this.email = process.env.SUPERADMIN_GMAIL_EMAIL;

//         const keywordsStr = process.env.SUPPORT_EMAIL_KEYWORDS || 'query,queries';
//         this.allowedKeywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

//         const sendersStr = process.env.SUPPORT_ALLOWED_SENDERS || '';
//         this.allowedSenders = sendersStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

//         if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.email) {
//             logger.error('❌ Missing superadmin Gmail OAuth credentials');
//             throw new Error('Missing superadmin Gmail OAuth credentials');
//         }

//         logger.info('🔍 SUPPORT EMAIL SERVICE INITIALIZED');
//         logger.info(`   📧 Email: ${this.email}`);
//         logger.info(`   📋 Keywords: ${this.allowedKeywords.join(', ')}`);

//         this.oauth2Client = new OAuth2Client(
//             this.clientId,
//             this.clientSecret,
//             'https://developers.google.com/oauthplayground'
//         );

//         this.oauth2Client.setCredentials({
//             refresh_token: this.refreshToken
//         });

//         this.gmail = google.gmail({
//             version: 'v1',
//             auth: this.oauth2Client
//         });

//         this.lastTokenRefresh = Date.now();
//         this.tokenRefreshInterval = 50 * 60 * 1000;

//         this.oauth2Client.on('tokens', (tokens) => {
//             if (tokens.refresh_token) {
//                 logger.info('🔄 New refresh token received');
//             }
//             logger.info('🔄 Access token refreshed');
//         });
//     }

// // services/supportEmailService.js

// // Add at the top

// /**
//  * ✅ NEW: Extract attachments from email
//  */
// async extractAttachments(gmailMessage) {
//     const attachments = [];
    
//     const findAttachments = (part) => {
//         if (part.filename && part.filename.length > 0) {
//             attachments.push({
//                 filename: part.filename,
//                 mimeType: part.mimeType,
//                 size: part.body.size || 0,
//                 attachmentId: part.body.attachmentId,
//                 data: part.body.data || null
//             });
//         }
        
//         if (part.parts) {
//             part.parts.forEach(findAttachments);
//         }
//     };
    
//     if (gmailMessage.payload.parts) {
//         gmailMessage.payload.parts.forEach(findAttachments);
//     } else if (gmailMessage.payload.filename && gmailMessage.payload.filename.length > 0) {
//         attachments.push({
//             filename: gmailMessage.payload.filename,
//             mimeType: gmailMessage.payload.mimeType,
//             size: gmailMessage.payload.body.size || 0,
//             attachmentId: gmailMessage.payload.body.attachmentId,
//             data: gmailMessage.payload.body.data || null
//         });
//     }
    
//     return attachments;
// }

// /**
//  * ✅ NEW: Download attachment from Gmail
//  */
// async downloadAttachment(messageId, attachmentId) {
//     try {
//         await this.ensureValidToken();
//         const response = await this.gmail.users.messages.attachments.get({
//             userId: 'me',
//             messageId: messageId,
//             id: attachmentId
//         });
//         return response.data;
//     } catch (error) {
//         logger.error(`❌ Error downloading attachment ${attachmentId}:`, error.message);
//         throw error;
//     }
// }

// /**
//  * ✅ NEW: Save attachment to Supabase
//  */
// async saveAttachment(attachmentData, ticketId, replyId = null, uploadedBy = null) {
//     try {
//         const { executeQuery } = require('../config/database');
        
//         // Upload to Supabase
//         const uploadResult = await storageService.uploadFromBase64(
//             attachmentData.data,
//             attachmentData.filename,
//             attachmentData.mimeType,
//             ticketId
//         );

//         // Save to database
//         const dbResult = await executeQuery(
//             `INSERT INTO support_attachments 
//              (ticket_id, reply_id, filename, file_size, mime_type, storage_path, download_url, uploaded_by)
//              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//              RETURNING *`,
//             [ticketId, replyId, attachmentData.filename, attachmentData.size, 
//              attachmentData.mimeType, uploadResult.storagePath, uploadResult.downloadUrl, uploadedBy]
//         );

//         // Update attachment count
//         await executeQuery(
//             `UPDATE support_tickets SET attachment_count = (
//                 SELECT COUNT(*) FROM support_attachments WHERE ticket_id = $1
//             ) WHERE id = $1`,
//             [ticketId]
//         );

//         logger.info(`📎 Saved attachment: ${attachmentData.filename} → ${uploadResult.downloadUrl}`);
//         return dbResult.rows[0];

//     } catch (error) {
//         logger.error('❌ Error saving attachment:', error.message);
//         throw error;
//     }
// }

// /**
//  * ✅ NEW: Save file from dashboard upload
//  */
// async saveUploadedFile(file, ticketId, replyId = null, uploadedBy = null) {
//     try {
//         const { executeQuery } = require('../config/database');
        
//         const uploadResult = await storageService.uploadFile(
//             file.buffer,
//             file.originalname,
//             file.mimetype,
//             ticketId
//         );

//         const dbResult = await executeQuery(
//             `INSERT INTO support_attachments 
//              (ticket_id, reply_id, filename, file_size, mime_type, storage_path, download_url, uploaded_by)
//              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//              RETURNING *`,
//             [ticketId, replyId, file.originalname, file.size, 
//              file.mimetype, uploadResult.storagePath, uploadResult.downloadUrl, uploadedBy]
//         );

//         await executeQuery(
//             `UPDATE support_tickets SET attachment_count = (
//                 SELECT COUNT(*) FROM support_attachments WHERE ticket_id = $1
//             ) WHERE id = $1`,
//             [ticketId]
//         );

//         logger.info(`📎 Uploaded file: ${file.originalname} → ${uploadResult.downloadUrl}`);
//         return dbResult.rows[0];

//     } catch (error) {
//         logger.error('❌ Error saving uploaded file:', error.message);
//         throw error;
//     }
// }



//     async ensureValidToken() {
//         try {
//             const now = Date.now();
//             if (now - this.lastTokenRefresh > this.tokenRefreshInterval) {
//                 logger.info('🔄 Refreshing Gmail access token...');
//                 const { credentials } = await this.oauth2Client.refreshAccessToken();
//                 this.oauth2Client.setCredentials(credentials);
//                 this.lastTokenRefresh = now;
//                 logger.info('✅ Gmail token refreshed');
//             }
//             return this.oauth2Client;
//         } catch (error) {
//             logger.error('❌ Error refreshing Gmail token:', error.message);
//             try {
//                 logger.info('🔄 Retrying token refresh...');
//                 const { credentials } = await this.oauth2Client.refreshAccessToken();
//                 this.oauth2Client.setCredentials(credentials);
//                 this.lastTokenRefresh = Date.now();
//                 logger.info('✅ Token refresh retry successful');
//                 return this.oauth2Client;
//             } catch (retryError) {
//                 logger.error('❌ Retry failed:', retryError.message);
//                 throw new Error('Unable to refresh Gmail token');
//             }
//         }
//     }

//     async testConnection() {
//         try {
//             await this.ensureValidToken();
//             const response = await this.gmail.users.getProfile({ userId: 'me' });
//             logger.info('✅ Gmail connection successful');
//             logger.info(`   📧 Email: ${response.data.emailAddress}`);
//             return response.data;
//         } catch (error) {
//             logger.error('❌ Gmail connection failed:', error.message);
//             throw error;
//         }
//     }

//     /**
//      * Check if email is from system/marketing sender.
//      *
//      * ✅ FIXED: body-text pattern checks (confirmation text, resolution
//      * text, etc.) now ONLY apply when the email is actually FROM our own
//      * support account. Previously these ran unconditionally, so a genuine
//      * customer reply that simply quoted our confirmation email underneath
//      * (e.g. "On ... wrote: > Thank you for contacting us...") was
//      * misclassified as a system email and silently dropped — which is why
//      * real replies from users weren't showing up on the dashboard even
//      * though the mail visibly arrived in the inbox.
//      */
//     isSystemEmail(email) {
//         // ✅ CHECK HEADERS FIRST (most reliable, always safe — only we set these)
//         if (email.headers) {
//             const autoReply = (email.headers['x-auto-reply'] || '').toLowerCase();
//             const systemEmail = (email.headers['x-system-email'] || '').toLowerCase();
//             const precedence = (email.headers['precedence'] || '').toLowerCase();
//             const autoSubmitted = (email.headers['auto-submitted'] || '').toLowerCase();

//             if (autoReply === 'yes' ||
//                 systemEmail === 'true' ||
//                 precedence === 'bulk' ||
//                 autoSubmitted === 'auto-replied' ||
//                 autoSubmitted === 'auto-generated') {
//                 return true;
//             }
//         }

//         const systemSenders = [
//             'mailer-daemon@',
//             'no-reply@',
//             'noreply@',
//             'mailer@',
//             'system@',
//             'mail-daemon@',
//             'team@mail.perplexity.ai',
//             'marketing@',
//             'newsletter@',
//             'digest@',
//             'notifications@',
//             'accounts@',
//             'security@',
//             'info@',
//             'hello@',
//             'welcome@',
//             'support@'
//         ];

//         const from = (email.from || '').toLowerCase();
//         for (const sender of systemSenders) {
//             if (from.includes(sender)) {
//                 return true;
//             }
//         }

//         const subject = (email.subject || '').toLowerCase();

//         // ✅ GATE: body-content pattern checks below only make sense for mail
//         // FROM our own support account. A customer replying to (and quoting)
//         // our confirmation/resolution email will legitimately contain this
//         // exact text as a quote — that must NOT be treated as a system email.
//         const isFromSupportAccount = !!this.email && from.includes(this.email.toLowerCase());

//         if (isFromSupportAccount) {
//             const body = (email.body || '').toLowerCase();

//             // ✅ CHECK FOR CONFIRMATION PATTERNS
//             if (body.includes('thank you for contacting us') &&
//                 body.includes('we have received your query')) {
//                 return true;
//             }

//             if (body.includes('ticket number:') &&
//                 body.includes('we will get back to you shortly')) {
//                 return true;
//             }

//             // ✅ CHECK FOR RESOLUTION NOTICES
//             if (body.includes('has been marked as resolved') &&
//                 body.includes('if you are not satisfied')) {
//                 return true;
//             }

//             if (body.includes('automated message') && body.includes('ticket number')) {
//                 return true;
//             }

//             if (subject.includes('we received your query') ||
//                 subject.includes('confirmation') ||
//                 subject.includes('thank you for contacting')) {
//                 return true;
//             }
//         }

//         const marketingSubject = [
//             'welcome',
//             'newsletter',
//             'digest',
//             'new feature',
//             'announcement',
//             'delivery status',
//             'mail delivery subsystem'
//         ];

//         for (const pattern of marketingSubject) {
//             if (subject.includes(pattern) && !subject.includes('ticket-')) {
//                 return true;
//             }
//         }

//         return false;
//     }

//     /**
//      * Check if email matches allowed keywords (subject + sender only)
//      */
//     hasMatchingKeyword(email) {
//         const searchText = `${email.subject} ${email.from}`.toLowerCase();
        
//         for (const keyword of this.allowedKeywords) {
//             if (searchText.includes(keyword.toLowerCase())) {
//                 return true;
//             }
//         }
//         return false;
//     }

//     /**
//      * Check if email is a reply to an existing ticket
//      */
//     isTicketReply(email) {
//         const ticketPattern = /ticket-\d{8}-\d{4}/i;
//         if (ticketPattern.test(email.subject)) return true;
//         if (email.inReplyTo) return true;
//         if (email.references) return true;
//         return false;
//     }

//     /**
//      * Extract ticket number from email subject
//      */
//     extractTicketNumber(subject) {
//         if (!subject) return null;
//         const match = subject.match(/TICKET-(\d{8}-\d{4})/i);
//         return match ? `TICKET-${match[1]}` : null;
//     }

//     /**
//      * Fetch candidate emails by date window (NOT just unread)
//      */
//     async fetchCandidateEmails(maxResults = 100) {
//         logger.info('📧 Fetching candidate emails...');
//         try {
//             await this.ensureValidToken();

//             const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
//             const dateStr = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;

//             let query = `in:inbox after:${dateStr}`;
//             if (this.allowedSenders.length > 0) {
//                 const fromQuery = this.allowedSenders.map(e => `from:${e}`).join(' OR ');
//                 query = `in:inbox after:${dateStr} (${fromQuery})`;
//             }

//             logger.info(`   🔍 Search query: ${query}`);

//             const response = await this.gmail.users.messages.list({
//                 userId: 'me',
//                 q: query,
//                 maxResults
//             });

//             const messages = response.data.messages || [];
//             logger.info(`   📊 Found ${messages.length} emails`);

//             const emails = [];
//             let skippedSystem = 0;
//             let skippedNoKeyword = 0;

//             for (const msg of messages) {
//                 try {
//                     const email = await this.getEmailById(msg.id);
                    
//                     if (this.isSystemEmail(email)) {
//                         skippedSystem++;
//                         logger.debug(`   ⏭️ Skipping system email: ${email.subject}`);
//                         continue;
//                     }
                    
//                     const hasKeyword = this.hasMatchingKeyword(email);
//                     const isTicketReply = this.isTicketReply(email);

//                     if (hasKeyword || isTicketReply) {
//                         emails.push(email);
//                         logger.info(`   ✅ [${emails.length}] From: ${email.from}, Subject: ${email.subject}`);
//                     } else {
//                         skippedNoKeyword++;
//                     }
//                 } catch (err) {
//                     logger.error(`   ❌ Error fetching email ${msg.id}:`, err.message);
//                 }
//             }

//             logger.info(`✅ Found ${emails.length} candidate emails (${skippedSystem} system, ${skippedNoKeyword} no keyword)`);
//             return emails;

//         } catch (error) {
//             logger.error('❌ Error fetching candidate emails:', error.message);
//             throw error;
//         }
//     }

// /**
//  * ✅ NEW: Diff Gmail history since a given historyId, return message IDs
//  * that were added to the mailbox (used by the Pub/Sub webhook).
//  */
// async getHistoryMessageIds(startHistoryId) {
//     await this.ensureValidToken();
//     try {
//         const messageIds = new Set();
//         let pageToken = null;

//         do {
//             const response = await this.gmail.users.history.list({
//                 userId: 'me',
//                 startHistoryId: startHistoryId,
//                 historyTypes: ['messageAdded'],
//                 ...(pageToken && { pageToken })
//             });

//             const history = response.data.history || [];
//             for (const record of history) {
//                 for (const added of record.messagesAdded || []) {
//                     if (added.message?.id) {
//                         messageIds.add(added.message.id);
//                     }
//                 }
//             }

//             pageToken = response.data.nextPageToken;
//         } while (pageToken);

//         logger.info(`📜 History diff from ${startHistoryId}: ${messageIds.size} new message(s)`);
//         return Array.from(messageIds);

//     } catch (error) {
//         // 404 = startHistoryId too old — Gmail only retains ~1 week of history.
//         // This can happen if the server was down a while or watch() lapsed.
//         if (error.code === 404 || error.response?.status === 404) {
//             logger.error(`❌ startHistoryId ${startHistoryId} expired/invalid. Falling back to full sync.`);
//             return null; // ✅ signal "can't diff, do a full sync instead" — different from []=[]"nothing new"
//         }
//         logger.error('❌ Error fetching Gmail history:', error.message);
//         throw error;
//     }
// }

// /**
//  * ✅ NEW: Register (or renew) Gmail push notifications for this mailbox.
//  * Must be re-called at least every 7 days — Gmail expires watch() automatically.
//  */
// async startWatch() {
//     await this.ensureValidToken();
//     try {
//         const topicName = process.env.GMAIL_PUBSUB_TOPIC
//             || 'projects/hospital-management-503802/topics/gmail-support-notifications';

//        const response = await this.gmail.users.watch({
//     userId: 'me',
//     requestBody: {
//         topicName,
//         labelIds: ['INBOX', 'SENT'],
//         labelFilterBehavior: 'INCLUDE'
//     }
// });

//         logger.info(`👁️ Gmail watch registered. historyId=${response.data.historyId}, expiration=${response.data.expiration}`);

//         return {
//             historyId: response.data.historyId,
//             expiration: response.data.expiration
//         };
//     } catch (error) {
//         logger.error('❌ Error starting Gmail watch:', error.message);
//         throw error;
//     }
// }


//     /**
//      * Fetch full thread by thread ID
//      */
//     async fetchThreadMessages(threadId) {
//         try {
//             await this.ensureValidToken();
//             const response = await this.gmail.users.threads.get({
//                 userId: 'me',
//                 id: threadId,
//                 format: 'full'
//             });

//             const messages = response.data.messages || [];
//             logger.info(`📊 Thread ${threadId} has ${messages.length} messages`);
            
//             return messages.map(m => this.parseEmail(m));
//         } catch (error) {
//             logger.error(`❌ Error fetching thread ${threadId}:`, error.message);
//             throw error;
//         }
//     }

//     /**
//      * Send email with proper RFC822 Message-ID threading.
//      *
//      * IMPORTANT: Gmail does not reliably honor a custom Message-ID header
//      * on outbound mail — it may silently reassign its own. So after sending,
//      * we read the message back and use whatever Message-ID Gmail actually
//      * attached, instead of trusting the one we generated.
//      *
//      * Subject is passed through UNCHANGED (no ticket-number bracket appended
//      * here) — callers are responsible for keeping the subject's normalized
//      * form ("Re: " stripped) identical across the whole ticket lifecycle,
//      * since Gmail requires matching subjects to group messages into a thread.
//      */
// // In supportEmailService.js - sendEmailReply() method

// async sendEmailReply({ 
//     to, 
//     subject, 
//     html, 
//     inReplyToMessageId = null, 
//     referencesChain = null, 
//     threadId = null, 
//     cc = [], 
//     bcc = [], 
//     ticketNumber = null 
// }) {
//     await this.ensureValidToken();

//     const fromEmail = this.email;
//     const domain = fromEmail.split('@')[1] || 'support.com';

//     if (!ticketNumber) {
//         const match = subject.match(/\[(TICKET-\d{8}-\d{4})\]/);
//         if (match) ticketNumber = match[1];
//     }

//     const provisionalMessageId = `<${ticketNumber || 'ticket'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${domain}>`;

//     // ✅ BUILD ALL HEADERS - ADD SYSTEM IDENTIFICATION HEADERS
//     const emailLines = [
//         `From: "Support Team" <${fromEmail}>`,
//         `To: ${to}`,
//         ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []),
//         ...(bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
//         `Subject: ${subject}`,
//         `Message-ID: ${provisionalMessageId}`,
//         'MIME-Version: 1.0',
//         'Content-Type: text/html; charset=utf-8',
//         'Content-Transfer-Encoding: 7bit',
//         // ✅ ADD THESE HEADERS to identify system emails
//         'X-Auto-Reply: yes',
//         'X-System-Email: true',
//         'Precedence: bulk',
//         'Auto-Submitted: auto-replied'
//     ];

//     if (inReplyToMessageId) {
//         const chain = referencesChain
//             ? `${referencesChain} ${inReplyToMessageId}`
//             : inReplyToMessageId;
//         emailLines.push(`In-Reply-To: ${inReplyToMessageId}`);
//         emailLines.push(`References: ${chain}`);
//     } else if (ticketNumber) {
//         const syntheticId = `<${ticketNumber}@${domain}>`;
//         emailLines.push(`In-Reply-To: ${syntheticId}`);
//         emailLines.push(`References: ${syntheticId}`);
//     }

//     if (ticketNumber) {
//         emailLines.push(`X-Ticket-Number: ${ticketNumber}`);
//     }

//     emailLines.push('');
//     emailLines.push(html);

//     const rawEmail = emailLines.join('\r\n');
//     const base64Encoded = Buffer.from(rawEmail)
//         .toString('base64')
//         .replace(/\+/g, '-')
//         .replace(/\//g, '_')
//         .replace(/=+$/, '');

//     const resource = {
//         raw: base64Encoded,
//         ...(threadId && { threadId })
//     };

//     const response = await this.gmail.users.messages.send({
//         userId: 'me',
//         resource
//     });

//     // ✅ Reserve the dedupe row IMMEDIATELY — before the Message-ID verify
//     // fetch below, before returning to the caller. Gmail's own push
//     // notification for this SENT message can otherwise race ahead of the
//     // caller's own markEmailProcessed() call and get double-processed.
//     const supportTicketService = require('./supportTicketService');
//     await supportTicketService.markEmailProcessed(response.data.id, null);

//     let actualMessageId = provisionalMessageId;
//     try {
//         const sent = await this.gmail.users.messages.get({
//             userId: 'me',
//             id: response.data.id,
//             format: 'metadata',
//             metadataHeaders: ['Message-ID']
//         });
//         const header = (sent.data.payload.headers || [])
//             .find(h => h.name.toLowerCase() === 'message-id');

//         if (header && header.value) {
//             actualMessageId = header.value;
//             if (actualMessageId !== provisionalMessageId) {
//                 logger.warn(`⚠️ Gmail reassigned Message-ID. Sent: ${provisionalMessageId}, Actual: ${actualMessageId}`);
//             }
//         }
//     } catch (verifyErr) {
//         logger.error('⚠️ Could not verify actual Message-ID after send, falling back to provisional value:', verifyErr.message);
//     }

//     const references = inReplyToMessageId
//         ? (referencesChain ? `${referencesChain} ${inReplyToMessageId}` : inReplyToMessageId)
//         : null;

//     logger.info(`✅ Support reply sent to ${to}, apiId: ${response.data.id}, threadId: ${response.data.threadId}, rfcMsgId: ${actualMessageId}`);

//     return {
//         gmailApiMessageId: response.data.id,
//         rfcMessageId: actualMessageId,
//         references: references,
//         threadId: response.data.threadId
//     };
// }

//     async getEmailById(messageId) {
//         await this.ensureValidToken();
//         const response = await this.gmail.users.messages.get({
//             userId: 'me',
//             id: messageId,
//             format: 'full'
//         });
//         return this.parseEmail(response.data);
//     }

//    parseEmail(gmailMessage) {
//     const headers = {};
//     (gmailMessage.payload.headers || []).forEach(header => {
//         headers[header.name.toLowerCase()] = header.value;
//     });

//     let plainText = '';
//     let htmlText = '';

//     const extractBody = (part) => {
//         if (part.mimeType === 'text/plain' && part.body && part.body.data) {
//             plainText = Buffer.from(part.body.data, 'base64').toString('utf-8');
//         } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
//             htmlText = Buffer.from(part.body.data, 'base64').toString('utf-8');
//         } else if (part.parts) {
//             part.parts.forEach(extractBody);
//         }
//     };

//     // ✅ FIXED: single-part messages now check payload.mimeType before
//     // deciding whether the decoded content is plain text or HTML. Previously
//     // this branch always assigned to plainText regardless of mimeType, so a
//     // single-part text/html email (like our own confirmation/reply emails)
//     // had its raw HTML tags dumped straight into the "message" field.
//     if (gmailMessage.payload.parts) {
//         gmailMessage.payload.parts.forEach(extractBody);
//     } else if (gmailMessage.payload.body && gmailMessage.payload.body.data) {
//         const decoded = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf-8');
//         if (gmailMessage.payload.mimeType === 'text/html') {
//             htmlText = decoded;
//         } else {
//             plainText = decoded;
//         }
//     }

//     const body = plainText || htmlText || gmailMessage.snippet || '';
//     const cleanedBody = this.cleanEmailBody(body);

//     return {
//         id: gmailMessage.id,
//         threadId: gmailMessage.threadId,
//         from: headers.from || '',
//         to: headers.to || '',
//         subject: headers.subject || '(no subject)',
//         date: headers.date || new Date().toISOString(),
//         messageId: headers['message-id'] || '',
//         inReplyTo: headers['in-reply-to'] || null,
//         references: headers.references || null,
//         body: cleanedBody,
//         plainText: plainText || body,
//         htmlText: htmlText || '',
//         snippet: gmailMessage.snippet || '',
//         labels: gmailMessage.labelIds || [],
//         // ✅ ADD HEADERS TO THE PARSED EMAIL
//         headers: headers
//     };
// }

// cleanEmailBody(body) {
//     if (!body) return '';

 
//     const quoteHeaderPattern = /^On\s[\s\S]*?wrote:\s*/im;
//     const quoteMatch = body.match(quoteHeaderPattern);
//     let cleaned = quoteMatch ? body.slice(0, quoteMatch.index) : body;

//     cleaned = cleaned
//         .replace(/^>.*$/gm, '')
//         .replace(/From: .*$/gm, '')
//         .replace(/Sent: .*$/gm, '')
//         .replace(/To: .*$/gm, '')
//         .replace(/Subject: .*$/gm, '')
//         .replace(/--\s*$.*/s, '')
//         .replace(/Sent from my (iPhone|Android|iPad|BlackBerry).*$/m, '')
//         .replace(/Get (Outlook|Gmail|Mail) for (iOS|Android|Windows|Mac).*$/m, '')
//         .replace(/^__*$/gm, '')
//         .replace(/\n{3,}/g, '\n\n');

//     return cleaned.trim();
// }

//     async markAsRead(messageId) {
//         await this.ensureValidToken();
//         await this.gmail.users.messages.modify({
//             userId: 'me',
//             id: messageId,
//             resource: { removeLabelIds: ['UNREAD'] }
//         });
//         return true;
//     }

//     async applyLabels(messageId, labelNames) {
//         await this.ensureValidToken();
//         const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' });
//         const existingLabels = labelsResponse.data.labels || [];

//         const labelIds = [];
//         for (const labelName of labelNames) {
//             let label = existingLabels.find(l => l.name === labelName);
//             if (!label) {
//                 const createResponse = await this.gmail.users.labels.create({
//                     userId: 'me',
//                     resource: {
//                         name: labelName,
//                         labelListVisibility: 'labelShow',
//                         messageListVisibility: 'show'
//                     }
//                 });
//                 label = createResponse.data;
//             }
//             labelIds.push(label.id);
//         }

//         await this.gmail.users.messages.modify({
//             userId: 'me',
//             id: messageId,
//             resource: { addLabelIds: labelIds }
//         });
//         return true;
//     }

// // services/supportEmailService.js

// /**
//  * ✅ FIXED: Use date window instead of subject:TICKET-
//  * Subject no longer contains ticket number after threading fix.
//  */
// async fetchSentEmails() {
//     logger.info('📤 Fetching sent emails...');
//     try {
//         await this.ensureValidToken();

//         // Use date window like fetchCandidateEmails
//         const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
//         const dateStr = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;
//         const query = `in:sent after:${dateStr}`;

//         const response = await this.gmail.users.messages.list({
//             userId: 'me',
//             q: query,
//             maxResults: 50
//         });

//         const messages = response.data.messages || [];
//         const emails = [];
//         for (const msg of messages) {
//             try {
//                 const email = await this.getEmailById(msg.id);
//                 emails.push(email);
//             } catch (err) {
//                 logger.error(`   ❌ Error fetching sent email ${msg.id}:`, err.message);
//             }
//         }
//         return emails;
//     } catch (error) {
//         logger.error('❌ Error fetching sent emails:', error.message);
//         throw error;
//     }
// }
// }

// module.exports = new SupportEmailService();


const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');
const storageService = require('./storageService');

class SupportEmailService {
    constructor() {
        this.clientId = process.env.SUPERADMIN_GOOGLE_CLIENT_ID;
        this.clientSecret = process.env.SUPERADMIN_GOOGLE_CLIENT_SECRET;
        this.refreshToken = process.env.SUPERADMIN_GMAIL_REFRESH_TOKEN;
        this.email = process.env.SUPERADMIN_GMAIL_EMAIL;

        const keywordsStr = process.env.SUPPORT_EMAIL_KEYWORDS || 'query,queries';
        this.allowedKeywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

        const sendersStr = process.env.SUPPORT_ALLOWED_SENDERS || '';
        this.allowedSenders = sendersStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

        if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.email) {
            logger.error('❌ Missing superadmin Gmail OAuth credentials');
            throw new Error('Missing superadmin Gmail OAuth credentials');
        }

        logger.info('🔍 SUPPORT EMAIL SERVICE INITIALIZED');
        logger.info(`   📧 Email: ${this.email}`);
        logger.info(`   📋 Keywords: ${this.allowedKeywords.join(', ')}`);

        this.oauth2Client = new OAuth2Client(
            this.clientId,
            this.clientSecret,
            'https://developers.google.com/oauthplayground'
        );

        this.oauth2Client.setCredentials({
            refresh_token: this.refreshToken
        });

        this.gmail = google.gmail({
            version: 'v1',
            auth: this.oauth2Client
        });

        this.lastTokenRefresh = Date.now();
        this.tokenRefreshInterval = 50 * 60 * 1000;

        this.oauth2Client.on('tokens', (tokens) => {
            if (tokens.refresh_token) {
                logger.info('🔄 New refresh token received');
            }
            logger.info('🔄 Access token refreshed');
        });
    }

    /**
     * ✅ NEW: Extract attachments from email
     */
    async extractAttachments(gmailMessage) {
        const attachments = [];
        
        const findAttachments = (part) => {
            if (part.filename && part.filename.length > 0) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size || 0,
                    attachmentId: part.body.attachmentId,
                    data: part.body.data || null
                });
            }
            
            if (part.parts) {
                part.parts.forEach(findAttachments);
            }
        };
        
        if (gmailMessage.payload.parts) {
            gmailMessage.payload.parts.forEach(findAttachments);
        } else if (gmailMessage.payload.filename && gmailMessage.payload.filename.length > 0) {
            attachments.push({
                filename: gmailMessage.payload.filename,
                mimeType: gmailMessage.payload.mimeType,
                size: gmailMessage.payload.body.size || 0,
                attachmentId: gmailMessage.payload.body.attachmentId,
                data: gmailMessage.payload.body.data || null
            });
        }
        
        return attachments;
    }

    /**
     * ✅ NEW: Download attachment from Gmail
     */
    async downloadAttachment(messageId, attachmentId) {
        try {
            await this.ensureValidToken();
            const response = await this.gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: messageId,
                id: attachmentId
            });
            return response.data;
        } catch (error) {
            logger.error(`❌ Error downloading attachment ${attachmentId}:`, error.message);
            throw error;
        }
    }

    /**
     * ✅ NEW: Save attachment to Supabase
     */
    async saveAttachment(attachmentData, ticketId, replyId = null, uploadedBy = null) {
        try {
            const { executeQuery } = require('../config/database');
            
            const uploadResult = await storageService.uploadFromBase64(
                attachmentData.data,
                attachmentData.filename,
                attachmentData.mimeType,
                ticketId
            );

            const dbResult = await executeQuery(
                `INSERT INTO support_attachments 
                 (ticket_id, reply_id, filename, file_size, mime_type, storage_path, download_url, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [ticketId, replyId, attachmentData.filename, attachmentData.size, 
                 attachmentData.mimeType, uploadResult.storagePath, uploadResult.downloadUrl, uploadedBy]
            );

            await executeQuery(
                `UPDATE support_tickets SET attachment_count = (
                    SELECT COUNT(*) FROM support_attachments WHERE ticket_id = $1
                ) WHERE id = $1`,
                [ticketId]
            );

            logger.info(`📎 Saved attachment: ${attachmentData.filename} → ${uploadResult.downloadUrl}`);
            return dbResult.rows[0];

        } catch (error) {
            logger.error('❌ Error saving attachment:', error.message);
            throw error;
        }
    }

    /**
     * ✅ NEW: Save file from dashboard upload
     */
    async saveUploadedFile(file, ticketId, replyId = null, uploadedBy = null) {
        try {
            const { executeQuery } = require('../config/database');
            
            const uploadResult = await storageService.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
                ticketId
            );

            const dbResult = await executeQuery(
                `INSERT INTO support_attachments 
                 (ticket_id, reply_id, filename, file_size, mime_type, storage_path, download_url, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [ticketId, replyId, file.originalname, file.size, 
                 file.mimetype, uploadResult.storagePath, uploadResult.downloadUrl, uploadedBy]
            );

            await executeQuery(
                `UPDATE support_tickets SET attachment_count = (
                    SELECT COUNT(*) FROM support_attachments WHERE ticket_id = $1
                ) WHERE id = $1`,
                [ticketId]
            );

            logger.info(`📎 Uploaded file: ${file.originalname} → ${uploadResult.downloadUrl}`);
            return dbResult.rows[0];

        } catch (error) {
            logger.error('❌ Error saving uploaded file:', error.message);
            throw error;
        }
    }

    async ensureValidToken() {
        try {
            const now = Date.now();
            if (now - this.lastTokenRefresh > this.tokenRefreshInterval) {
                logger.info('🔄 Refreshing Gmail access token...');
                const { credentials } = await this.oauth2Client.refreshAccessToken();
                this.oauth2Client.setCredentials(credentials);
                this.lastTokenRefresh = now;
                logger.info('✅ Gmail token refreshed');
            }
            return this.oauth2Client;
        } catch (error) {
            logger.error('❌ Error refreshing Gmail token:', error.message);
            try {
                logger.info('🔄 Retrying token refresh...');
                const { credentials } = await this.oauth2Client.refreshAccessToken();
                this.oauth2Client.setCredentials(credentials);
                this.lastTokenRefresh = Date.now();
                logger.info('✅ Token refresh retry successful');
                return this.oauth2Client;
            } catch (retryError) {
                logger.error('❌ Retry failed:', retryError.message);
                throw new Error('Unable to refresh Gmail token');
            }
        }
    }

    async testConnection() {
        try {
            await this.ensureValidToken();
            const response = await this.gmail.users.getProfile({ userId: 'me' });
            logger.info('✅ Gmail connection successful');
            logger.info(`   📧 Email: ${response.data.emailAddress}`);
            return response.data;
        } catch (error) {
            logger.error('❌ Gmail connection failed:', error.message);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Check if email is from system/marketing sender.
     * Body-text pattern checks only apply when the email is FROM our own support account.
     * This prevents customer replies from being misclassified when they quote our emails.
     */
    isSystemEmail(email) {
        // ✅ CHECK HEADERS FIRST (most reliable, always safe — only we set these)
        if (email.headers) {
            const autoReply = (email.headers['x-auto-reply'] || '').toLowerCase();
            const systemEmail = (email.headers['x-system-email'] || '').toLowerCase();
            const precedence = (email.headers['precedence'] || '').toLowerCase();
            const autoSubmitted = (email.headers['auto-submitted'] || '').toLowerCase();

            if (autoReply === 'yes' ||
                systemEmail === 'true' ||
                precedence === 'bulk' ||
                autoSubmitted === 'auto-replied' ||
                autoSubmitted === 'auto-generated') {
                return true;
            }
        }

        const systemSenders = [
            'mailer-daemon@',
            'no-reply@',
            'noreply@',
            'mailer@',
            'system@',
            'mail-daemon@',
            'team@mail.perplexity.ai',
            'marketing@',
            'newsletter@',
            'digest@',
            'notifications@',
            'accounts@',
            'security@',
            'info@',
            'hello@',
            'welcome@',
            'support@'
        ];

        const from = (email.from || '').toLowerCase();
        for (const sender of systemSenders) {
            if (from.includes(sender)) {
                return true;
            }
        }

        const subject = (email.subject || '').toLowerCase();

        // ✅ GATE: body-content pattern checks below only make sense for mail
        // FROM our own support account. A customer replying to (and quoting)
        // our confirmation/resolution email will legitimately contain this
        // exact text as a quote — that must NOT be treated as a system email.
        const isFromSupportAccount = !!this.email && from.includes(this.email.toLowerCase());

        if (isFromSupportAccount) {
            const body = (email.body || '').toLowerCase();

            if (body.includes('thank you for contacting us') &&
                body.includes('we have received your query')) {
                return true;
            }

            if (body.includes('ticket number:') &&
                body.includes('we will get back to you shortly')) {
                return true;
            }

            if (body.includes('has been marked as resolved') &&
                body.includes('if you are not satisfied')) {
                return true;
            }

            if (body.includes('automated message') && body.includes('ticket number')) {
                return true;
            }

            if (subject.includes('we received your query') ||
                subject.includes('confirmation') ||
                subject.includes('thank you for contacting')) {
                return true;
            }
        }

        const marketingSubject = [
            'welcome',
            'newsletter',
            'digest',
            'new feature',
            'announcement',
            'delivery status',
            'mail delivery subsystem'
        ];

        for (const pattern of marketingSubject) {
            if (subject.includes(pattern) && !subject.includes('ticket-')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if email matches allowed keywords (subject + sender only)
     */
    hasMatchingKeyword(email) {
        const searchText = `${email.subject} ${email.from}`.toLowerCase();
        
        for (const keyword of this.allowedKeywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if email is a reply to an existing ticket
     */
    isTicketReply(email) {
        const ticketPattern = /ticket-\d{8}-\d{4}/i;
        if (ticketPattern.test(email.subject)) return true;
        if (email.inReplyTo) return true;
        if (email.references) return true;
        return false;
    }

    /**
     * Extract ticket number from email subject
     */
    extractTicketNumber(subject) {
        if (!subject) return null;
        const match = subject.match(/TICKET-(\d{8}-\d{4})/i);
        return match ? `TICKET-${match[1]}` : null;
    }

    /**
     * Fetch candidate emails by date window (NOT just unread)
     */
    async fetchCandidateEmails(maxResults = 100) {
        logger.info('📧 Fetching candidate emails...');
        try {
            await this.ensureValidToken();

            const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const dateStr = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;

            let query = `in:inbox after:${dateStr}`;
            if (this.allowedSenders.length > 0) {
                const fromQuery = this.allowedSenders.map(e => `from:${e}`).join(' OR ');
                query = `in:inbox after:${dateStr} (${fromQuery})`;
            }

            logger.info(`   🔍 Search query: ${query}`);

            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults
            });

            const messages = response.data.messages || [];
            logger.info(`   📊 Found ${messages.length} emails`);

            const emails = [];
            let skippedSystem = 0;
            let skippedNoKeyword = 0;

            for (const msg of messages) {
                try {
                    const email = await this.getEmailById(msg.id);
                    
                    if (this.isSystemEmail(email)) {
                        skippedSystem++;
                        logger.debug(`   ⏭️ Skipping system email: ${email.subject}`);
                        continue;
                    }
                    
                    const hasKeyword = this.hasMatchingKeyword(email);
                    const isTicketReply = this.isTicketReply(email);

                    if (hasKeyword || isTicketReply) {
                        emails.push(email);
                        logger.info(`   ✅ [${emails.length}] From: ${email.from}, Subject: ${email.subject}`);
                    } else {
                        skippedNoKeyword++;
                    }
                } catch (err) {
                    logger.error(`   ❌ Error fetching email ${msg.id}:`, err.message);
                }
            }

            logger.info(`✅ Found ${emails.length} candidate emails (${skippedSystem} system, ${skippedNoKeyword} no keyword)`);
            return emails;

        } catch (error) {
            logger.error('❌ Error fetching candidate emails:', error.message);
            throw error;
        }
    }

    /**
     * ✅ NEW: Diff Gmail history since a given historyId, return message IDs
     */
    async getHistoryMessageIds(startHistoryId) {
        await this.ensureValidToken();
        try {
            const messageIds = new Set();
            let pageToken = null;

            do {
                const response = await this.gmail.users.history.list({
                    userId: 'me',
                    startHistoryId: startHistoryId,
                    historyTypes: ['messageAdded'],
                    ...(pageToken && { pageToken })
                });

                const history = response.data.history || [];
                for (const record of history) {
                    for (const added of record.messagesAdded || []) {
                        if (added.message?.id) {
                            messageIds.add(added.message.id);
                        }
                    }
                }

                pageToken = response.data.nextPageToken;
            } while (pageToken);

            logger.info(`📜 History diff from ${startHistoryId}: ${messageIds.size} new message(s)`);
            return Array.from(messageIds);

        } catch (error) {
            if (error.code === 404 || error.response?.status === 404) {
                logger.error(`❌ startHistoryId ${startHistoryId} expired/invalid. Falling back to full sync.`);
                return null;
            }
            logger.error('❌ Error fetching Gmail history:', error.message);
            throw error;
        }
    }

    /**
     * ✅ NEW: Register (or renew) Gmail push notifications
     */
    async startWatch() {
        await this.ensureValidToken();
        try {
            const topicName = process.env.GMAIL_PUBSUB_TOPIC
                || 'projects/hospital-management-503802/topics/gmail-support-notifications';

            const response = await this.gmail.users.watch({
                userId: 'me',
                requestBody: {
                    topicName,
                    labelIds: ['INBOX', 'SENT'],
                    labelFilterBehavior: 'INCLUDE'
                }
            });

            logger.info(`👁️ Gmail watch registered. historyId=${response.data.historyId}, expiration=${response.data.expiration}`);

            return {
                historyId: response.data.historyId,
                expiration: response.data.expiration
            };
        } catch (error) {
            logger.error('❌ Error starting Gmail watch:', error.message);
            throw error;
        }
    }

    /**
     * Fetch full thread by thread ID
     */
    async fetchThreadMessages(threadId) {
        try {
            await this.ensureValidToken();
            const response = await this.gmail.users.threads.get({
                userId: 'me',
                id: threadId,
                format: 'full'
            });

            const messages = response.data.messages || [];
            logger.info(`📊 Thread ${threadId} has ${messages.length} messages`);
            
            return messages.map(m => this.parseEmail(m));
        } catch (error) {
            logger.error(`❌ Error fetching thread ${threadId}:`, error.message);
            throw error;
        }
    }

    /**
     * Send email with proper RFC822 Message-ID threading
     */
    async sendEmailReply({ 
        to, 
        subject, 
        html, 
        inReplyToMessageId = null, 
        referencesChain = null, 
        threadId = null, 
        cc = [], 
        bcc = [], 
        ticketNumber = null 
    }) {
        await this.ensureValidToken();

        const fromEmail = this.email;
        const domain = fromEmail.split('@')[1] || 'support.com';

        if (!ticketNumber) {
            const match = subject.match(/\[(TICKET-\d{8}-\d{4})\]/);
            if (match) ticketNumber = match[1];
        }

        const provisionalMessageId = `<${ticketNumber || 'ticket'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${domain}>`;

        const emailLines = [
            `From: "Support Team" <${fromEmail}>`,
            `To: ${to}`,
            ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []),
            ...(bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
            `Subject: ${subject}`,
            `Message-ID: ${provisionalMessageId}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: 7bit',
            'X-Auto-Reply: yes',
            'X-System-Email: true',
            'Precedence: bulk',
            'Auto-Submitted: auto-replied'
        ];

        if (inReplyToMessageId) {
            const chain = referencesChain
                ? `${referencesChain} ${inReplyToMessageId}`
                : inReplyToMessageId;
            emailLines.push(`In-Reply-To: ${inReplyToMessageId}`);
            emailLines.push(`References: ${chain}`);
        } else if (ticketNumber) {
            const syntheticId = `<${ticketNumber}@${domain}>`;
            emailLines.push(`In-Reply-To: ${syntheticId}`);
            emailLines.push(`References: ${syntheticId}`);
        }

        if (ticketNumber) {
            emailLines.push(`X-Ticket-Number: ${ticketNumber}`);
        }

        emailLines.push('');
        emailLines.push(html);

        const rawEmail = emailLines.join('\r\n');
        const base64Encoded = Buffer.from(rawEmail)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const resource = {
            raw: base64Encoded,
            ...(threadId && { threadId })
        };

        const response = await this.gmail.users.messages.send({
            userId: 'me',
            resource
        });

        const supportTicketService = require('./supportTicketService');
    

        let actualMessageId = provisionalMessageId;
        try {
            const sent = await this.gmail.users.messages.get({
                userId: 'me',
                id: response.data.id,
                format: 'metadata',
                metadataHeaders: ['Message-ID']
            });
            const header = (sent.data.payload.headers || [])
                .find(h => h.name.toLowerCase() === 'message-id');

            if (header && header.value) {
                actualMessageId = header.value;
                if (actualMessageId !== provisionalMessageId) {
                    logger.warn(`⚠️ Gmail reassigned Message-ID. Sent: ${provisionalMessageId}, Actual: ${actualMessageId}`);
                }
            }
        } catch (verifyErr) {
            logger.error('⚠️ Could not verify actual Message-ID after send, falling back to provisional value:', verifyErr.message);
        }

        const references = inReplyToMessageId
            ? (referencesChain ? `${referencesChain} ${inReplyToMessageId}` : inReplyToMessageId)
            : null;

        logger.info(`✅ Support reply sent to ${to}, apiId: ${response.data.id}, threadId: ${response.data.threadId}, rfcMsgId: ${actualMessageId}`);

        return {
            gmailApiMessageId: response.data.id,
            rfcMessageId: actualMessageId,
            references: references,
            threadId: response.data.threadId
        };
    }

    async getEmailById(messageId) {
        await this.ensureValidToken();
        const response = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
        });
        return this.parseEmail(response.data);
    }

    parseEmail(gmailMessage) {
        const headers = {};
        (gmailMessage.payload.headers || []).forEach(header => {
            headers[header.name.toLowerCase()] = header.value;
        });

        let plainText = '';
        let htmlText = '';

        const extractBody = (part) => {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                plainText = Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
                htmlText = Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.parts) {
                part.parts.forEach(extractBody);
            }
        };

        if (gmailMessage.payload.parts) {
            gmailMessage.payload.parts.forEach(extractBody);
        } else if (gmailMessage.payload.body && gmailMessage.payload.body.data) {
            const decoded = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf-8');
            if (gmailMessage.payload.mimeType === 'text/html') {
                htmlText = decoded;
            } else {
                plainText = decoded;
            }
        }

        const body = plainText || htmlText || gmailMessage.snippet || '';
        const cleanedBody = this.cleanEmailBody(body);

        return {
            id: gmailMessage.id,
            threadId: gmailMessage.threadId,
            from: headers.from || '',
            to: headers.to || '',
            subject: headers.subject || '(no subject)',
            date: headers.date || new Date().toISOString(),
            messageId: headers['message-id'] || '',
            inReplyTo: headers['in-reply-to'] || null,
            references: headers.references || null,
            body: cleanedBody,
            plainText: plainText || body,
            htmlText: htmlText || '',
            snippet: gmailMessage.snippet || '',
            labels: gmailMessage.labelIds || [],
            headers: headers
        };
    }

    cleanEmailBody(body) {
        if (!body) return '';

        const quoteHeaderPattern = /^On\s[\s\S]*?wrote:\s*/im;
        const quoteMatch = body.match(quoteHeaderPattern);
        let cleaned = quoteMatch ? body.slice(0, quoteMatch.index) : body;

        cleaned = cleaned
            .replace(/^>.*$/gm, '')
            .replace(/From: .*$/gm, '')
            .replace(/Sent: .*$/gm, '')
            .replace(/To: .*$/gm, '')
            .replace(/Subject: .*$/gm, '')
            .replace(/--\s*$.*/s, '')
            .replace(/Sent from my (iPhone|Android|iPad|BlackBerry).*$/m, '')
            .replace(/Get (Outlook|Gmail|Mail) for (iOS|Android|Windows|Mac).*$/m, '')
            .replace(/^__*$/gm, '')
            .replace(/\n{3,}/g, '\n\n');

        return cleaned.trim();
    }

    async markAsRead(messageId) {
        await this.ensureValidToken();
        await this.gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            resource: { removeLabelIds: ['UNREAD'] }
        });
        return true;
    }

    async applyLabels(messageId, labelNames) {
        await this.ensureValidToken();
        const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' });
        const existingLabels = labelsResponse.data.labels || [];

        const labelIds = [];
        for (const labelName of labelNames) {
            let label = existingLabels.find(l => l.name === labelName);
            if (!label) {
                const createResponse = await this.gmail.users.labels.create({
                    userId: 'me',
                    resource: {
                        name: labelName,
                        labelListVisibility: 'labelShow',
                        messageListVisibility: 'show'
                    }
                });
                label = createResponse.data;
            }
            labelIds.push(label.id);
        }

        await this.gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            resource: { addLabelIds: labelIds }
        });
        return true;
    }

    /**
     * ✅ FIXED: Use date window instead of subject:TICKET-
     */
    async fetchSentEmails() {
        logger.info('📤 Fetching sent emails...');
        try {
            await this.ensureValidToken();

            const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const dateStr = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;
            const query = `in:sent after:${dateStr}`;

            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 50
            });

            const messages = response.data.messages || [];
            const emails = [];
            for (const msg of messages) {
                try {
                    const email = await this.getEmailById(msg.id);
                    emails.push(email);
                } catch (err) {
                    logger.error(`   ❌ Error fetching sent email ${msg.id}:`, err.message);
                }
            }
            return emails;
        } catch (error) {
            logger.error('❌ Error fetching sent emails:', error.message);
            throw error;
        }
    }
}

module.exports = new SupportEmailService();