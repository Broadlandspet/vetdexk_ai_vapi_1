


// const supportEmailService = require('./supportEmailService');
// const supportTicketService = require('./supportTicketService');
// const settingsService = require('./settingsService');
// const logger = require('../utils/logger');

// class EmailSyncService {
//     constructor() {
//         this.isSyncing = false;
//         this._watchRenewalInProgress = false;
//     }

//     async sync() {
//         if (this.isSyncing) {
//             logger.debug('Sync already in progress, skipping...');
//             return;
//         }

//         this.isSyncing = true;
//         try {
//             logger.info('🔄 Starting full email sync...');

//             await this.syncOpenTicketThreads();
//             await this.syncNewInboundQueries();
//             await this.syncSentEmails();

//         } catch (error) {
//             logger.error('Error during email sync:', error);
//         } finally {
//             this.isSyncing = false;
//         }
//     }

// async processHistorySince(startHistoryId) {
//     const touchedTicketIds = new Set();

//     try {
//         const messageIds = await supportEmailService.getHistoryMessageIds(startHistoryId);

//         if (messageIds === null) {
//             logger.warn('⚠️ History expired, running full sync as fallback');
//             await this.sync();
//             return { touchedTicketIds: [] };
//         }

//         if (messageIds.length === 0) {
//             logger.info('📭 No new messages in this history diff');
//             return { touchedTicketIds: [] };
//         }

//         logger.info(`📧 Processing ${messageIds.length} messages from push notification...`);

//         let processedCount = 0;
//         let skippedCount = 0;
//         let errorCount = 0;

//         for (const id of messageIds) {
//             try {
//                 const already = await supportTicketService.isEmailProcessed(id);
//                 if (already) {
//                     logger.info(`⏭️ [${id}] Already processed, skipping`);
//                     skippedCount++;
//                     continue;
//                 }

//                 let email;
//                 try {
//                     email = await supportEmailService.getEmailById(id);
//                 } catch (fetchError) {
//                     if (fetchError.status === 404 || fetchError.code === 404) {
//                         logger.warn(`⚠️ [${id}] Message not found in Gmail (deleted), marking as processed`);
//                         await supportTicketService.markEmailProcessed(id);
//                         skippedCount++;
//                         continue;
//                     }
//                     throw fetchError;
//                 }

//                 if (!email) {
//                     logger.warn(`⚠️ Could not fetch email ${id}`);
//                     skippedCount++;
//                     continue;
//                 }

//                 // ✅ LOG DETAILED EMAIL INFO
//                 logger.info(`📧 [${id}] From: "${email.from}", Subject: "${email.subject}"`);

//                 const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
//                 const isFromSupport = email.from.toLowerCase().includes(supportAddr);

//                 // ✅ CRITICAL: Only check for system/confirmation patterns if the email is FROM support
//                 // If it's from a customer, NEVER skip it as system email!
//                 if (isFromSupport) {
//                     // Check if it's a system/confirmation email FROM support
//                     if (supportEmailService.isSystemEmail(email)) {
//                         logger.info(`⏭️ [${id}] Skipping SYSTEM email from support: ${email.subject}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         skippedCount++;
//                         continue;
//                     }

//                     if (this.isConfirmationEmail(email)) {
//                         logger.info(`⏭️ [${id}] Skipping CONFIRMATION email from support: ${email.subject}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         skippedCount++;
//                         continue;
//                     }
//                 } else {
//                     // ✅ Email is FROM a customer - NEVER skip as system/confirmation
//                     // Even if it contains "thank you for contacting us" in quoted text
//                     logger.info(`✅ [${id}] Email is FROM customer: ${email.from}`);
//                 }

//                 let ticket = await supportTicketService.findTicketByThread(email.threadId)
//                     || await supportTicketService.findTicketByMessageId(email.inReplyTo)
//                     || await supportTicketService.findTicketByMessageId(email.messageId);

//                 if (!ticket) {
//                     // ✅ Only create a new ticket if the email is NOT from support
//                     if (isFromSupport) {
//                         logger.info(`⏭️ [${id}] Skipping ADMIN email with no matching ticket: ${email.subject}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         skippedCount++;
//                         continue;
//                     }

//                     const fromMatch = email.from.match(/<(.+?)>/);
//                     const fromEmail = fromMatch ? fromMatch[1] : email.from;
//                     const fromName = email.from.split('<')[0].trim() || fromEmail;

//                     ticket = await supportTicketService.createTicket({
//                         user_email: fromEmail,
//                         user_name: fromName,
//                         subject: email.subject,
//                         message: this.stripHtml(email.body) || email.snippet,,
//                         gmail_message_id: email.id,
//                         gmail_thread_id: email.threadId,
//                         email_rfc_message_id: email.messageId,
//                         email_references: email.references,
//                         source: 'email',
//                         priority: 'medium'
//                     });

//                     await supportTicketService.updateTicketEmailInfo(ticket.id, {
//                         gmailApiMessageId: email.id,
//                         rfcMessageId: email.messageId,
//                         references: email.references,
//                         gmailThreadId: email.threadId
//                     });

//                     logger.info(`🎫 [${id}] ✅ Created NEW ticket ${ticket.ticket_number} from ${fromEmail}`);
//                 } else {
//                     const isFromUser = email.from.toLowerCase().includes(ticket.user_email.toLowerCase());
//                     const replyType = isFromUser ? 'user' : 'admin';

//                     logger.info(`🔍 [${id}] Found ticket ${ticket.ticket_number}, isFromUser=${isFromUser}, replyType=${replyType}`);

//                     if (replyType === 'admin') {
//                         const dup = await supportTicketService.hasRecentSimilarReply(ticket.id, 'admin', 120);
//                         if (dup) {
//                             logger.info(`⏭️ [${id}] Skipping DUPLICATE admin reply for ticket ${ticket.ticket_number}`);
//                             await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                             touchedTicketIds.add(ticket.id);
//                             continue;
//                         }
//                     }

//                     await supportTicketService.addReply({
//                         ticket_id: ticket.id,
//                         reply_type: replyType,
//                         sender_email: email.from,
//                         sender_name: replyType === 'admin' ? 'Support Team (from Gmail)' : ticket.user_name,
//                         message: this.stripHtml(email.body) || email.snippet,,
//                         gmail_message_id: email.id,
//                         email_rfc_message_id: email.messageId
//                     });

//                     if (replyType === 'user' && ['resolved', 'closed'].includes(ticket.status)) {
//                         await supportTicketService.updateStatus(ticket.id, 'in_progress');
//                         logger.info(`🔄 [${id}] Reopened ticket ${ticket.ticket_number}`);
//                     }

//                     logger.info(`💬 [${id}] ✅ Added ${replyType} reply to ticket ${ticket.ticket_number} from ${email.from}`);
//                 }

//                 await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                 touchedTicketIds.add(ticket.id);
//                 processedCount++;

//             } catch (err) {
//                 logger.error(`Error processing pushed message ${id}:`, err);
//                 errorCount++;
//                 try {
//                     await supportTicketService.markEmailProcessed(id);
//                 } catch (markErr) {
//                     logger.error(`Failed to mark ${id} as processed:`, markErr);
//                 }
//             }
//         }

//         logger.info(`📊 Summary: ${processedCount} processed, ${skippedCount} skipped, ${errorCount} errors`);

//     } catch (error) {
//         logger.error('Error in processHistorySince:', error);
//     }

//     return { touchedTicketIds: Array.from(touchedTicketIds) };
// }
//     async startGmailWatch() {
//         if (this._watchRenewalInProgress) {
//             logger.debug('⏭️ Watch renewal already in progress, skipping...');
//             return;
//         }

//         this._watchRenewalInProgress = true;
//         try {
//             const existingExpiration = await settingsService.get('gmail_watch_expiration');
//             const now = Date.now();
            
//             if (existingExpiration && parseInt(existingExpiration) > now + (60 * 60 * 1000)) {
//                 const currentHistoryId = await settingsService.get('gmail_last_history_id');
//                 logger.info(`👁️ Gmail watch still valid (expires at ${new Date(parseInt(existingExpiration)).toISOString()}), cursor at historyId=${currentHistoryId}`);
//                 return { historyId: currentHistoryId };
//             }
            
//             const result = await supportEmailService.startWatch();
            
//             const currentHistoryId = await settingsService.get('gmail_last_history_id');
            
//             if (!currentHistoryId) {
//                 await settingsService.set('gmail_last_history_id', String(result.historyId));
//                 logger.info(`👁️ Initial Gmail watch started. historyId=${result.historyId}`);
//             } else {
//                 logger.info(`👁️ Gmail watch renewed (keeping cursor at historyId=${currentHistoryId})`);
//             }
            
//             await settingsService.set('gmail_watch_expiration', result.expiration);
//             return result;
            
//         } catch (error) {
//             logger.error('Failed to start/renew Gmail watch:', error);
//             throw error;
//         } finally {
//             this._watchRenewalInProgress = false;
//         }
//     }

//     async syncOpenTicketThreads() {
//         try {
//             const pendingResult = await supportTicketService.listTickets({
//                 status: 'pending',
//                 limit: 500,
//                 offset: 0
//             });

//             const inProgressResult = await supportTicketService.listTickets({
//                 status: 'in_progress',
//                 limit: 500,
//                 offset: 0
//             });

//             const tickets = [...pendingResult.data, ...inProgressResult.data];

//             if (tickets.length === 0) {
//                 logger.info('📭 No open tickets to sync');
//                 return;
//             }

//             logger.info(`🔄 Syncing ${tickets.length} open tickets...`);
//             let processedCount = 0;

//             for (const ticket of tickets) {
//                 if (!ticket.gmail_thread_id) continue;

//                 try {
//                     const messages = await supportEmailService.fetchThreadMessages(ticket.gmail_thread_id);

//                     for (const email of messages) {
//                         const already = await supportTicketService.isEmailProcessed(email.id);
//                         if (already) {
//                             logger.debug(`⏭️ Email ${email.id} already processed, skipping`);
//                             continue;
//                         }

//                         if (supportEmailService.isSystemEmail(email)) {
//                             logger.debug(`⏭️ Skipping system email in thread: ${email.subject}`);
//                             await supportTicketService.markEmailProcessed(email.id);
//                             continue;
//                         }

//                         if (this.isConfirmationEmail(email)) {
//                             logger.debug(`⏭️ Skipping confirmation email in thread: ${email.subject}`);
//                             await supportTicketService.markEmailProcessed(email.id);
//                             continue;
//                         }

//                         const isFromUser = email.from.toLowerCase().includes(ticket.user_email.toLowerCase());

//                         if (!isFromUser && this.isAdminSystemEmail(email)) {
//                             logger.debug(`⏭️ Skipping admin system email for ticket ${ticket.ticket_number}`);
//                             await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                             continue;
//                         }

//                         if (!isFromUser) {
//                             const dup = await supportTicketService.hasRecentSimilarReply(ticket.id, 'admin', 120);
//                             if (dup) {
//                                 logger.debug(`⏭️ Skipping likely-duplicate admin reply for ticket ${ticket.ticket_number} (race guard)`);
//                                 await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                                 continue;
//                             }
//                         }

//                         await supportTicketService.addReply({
//                             ticket_id: ticket.id,
//                             reply_type: isFromUser ? 'user' : 'admin',
//                             sender_email: email.from,
//                             sender_name: isFromUser ? ticket.user_name : 'Support Team (from Gmail)',
//                             message: this.stripHtml(email.body) || email.snippet,,
//                             gmail_message_id: email.id,
//                             email_rfc_message_id: email.messageId
//                         });

//                         if (isFromUser && ['resolved', 'closed'].includes(ticket.status)) {
//                             await supportTicketService.updateStatus(ticket.id, 'in_progress');
//                             logger.info(`🔄 Reopened ticket ${ticket.ticket_number}`);
//                         }

//                         await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                         processedCount++;
//                         logger.info(`✅ Added message to ticket ${ticket.ticket_number} from ${email.from}`);
//                     }

//                 } catch (err) {
//                     logger.error(`Thread sync failed for ticket ${ticket.id}:`, err.message);
//                 }
//             }

//             logger.info(`✅ Synced ${processedCount} new messages`);

//         } catch (error) {
//             logger.error('Error syncing open ticket threads:', error);
//         }
//     }

//     async syncNewInboundQueries() {
//         try {
//             const emails = await supportEmailService.fetchCandidateEmails(100);

//             if (emails.length === 0) {
//                 logger.info('📭 No new inbound queries');
//                 return;
//             }

//             logger.info(`📧 Processing ${emails.length} candidate emails...`);
//             let processedCount = 0;

//             for (const email of emails) {
//                 try {
//                     const already = await supportTicketService.isEmailProcessed(email.id);
//                     if (already) {
//                         logger.debug(`⏭️ Email ${email.id} already processed, skipping`);
//                         continue;
//                     }

//                     if (supportEmailService.isSystemEmail(email)) {
//                         logger.debug(`⏭️ Skipping system email: ${email.subject}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         continue;
//                     }

//                     if (this.isConfirmationEmail(email)) {
//                         logger.debug(`⏭️ Skipping confirmation email: ${email.subject}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         continue;
//                     }

//                     let ticket = await supportTicketService.findTicketByThread(email.threadId)
//                         || await supportTicketService.findTicketByMessageId(email.inReplyTo)
//                         || await supportTicketService.findTicketByMessageId(email.messageId);

//                     if (!ticket) {
//                         const fromMatch = email.from.match(/<(.+?)>/);
//                         const fromEmail = fromMatch ? fromMatch[1] : email.from;
//                         const fromName = email.from.split('<')[0].trim() || fromEmail;

//                         ticket = await supportTicketService.createTicket({
//                             user_email: fromEmail,
//                             user_name: fromName,
//                             subject: email.subject,
//                             message: this.stripHtml(email.body) || email.snippet,,
//                             gmail_message_id: email.id,
//                             gmail_thread_id: email.threadId,
//                             email_rfc_message_id: email.messageId,
//                             email_references: email.references,
//                             source: 'email',
//                             priority: 'medium'
//                         });

//                         await supportTicketService.updateTicketEmailInfo(ticket.id, {
//                             gmailApiMessageId: email.id,
//                             rfcMessageId: email.messageId,
//                             references: email.references,
//                             gmailThreadId: email.threadId
//                         });

//                         logger.info(`🎫 Created new ticket ${ticket.ticket_number} from ${fromEmail}`);
//                     } else {
//                         const isFromUser = email.from.toLowerCase().includes(ticket.user_email.toLowerCase());

//                         if (!isFromUser && this.isAdminSystemEmail(email)) {
//                             logger.debug(`⏭️ Skipping admin system email for ticket ${ticket.ticket_number}`);
//                             await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                             continue;
//                         }

//                         if (!isFromUser) {
//                             const dup = await supportTicketService.hasRecentSimilarReply(ticket.id, 'admin', 120);
//                             if (dup) {
//                                 logger.debug(`⏭️ Skipping likely-duplicate admin reply for ticket ${ticket.ticket_number} (race guard)`);
//                                 await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                                 continue;
//                             }
//                         }

//                         await supportTicketService.addReply({
//                             ticket_id: ticket.id,
//                             reply_type: isFromUser ? 'user' : 'admin',
//                             sender_email: email.from,
//                             sender_name: isFromUser ? ticket.user_name : 'Support Team (from Gmail)',
//                             message: this.stripHtml(email.body) || email.snippet,,
//                             gmail_message_id: email.id,
//                             email_rfc_message_id: email.messageId
//                         });

//                         if (isFromUser && ['resolved', 'closed'].includes(ticket.status)) {
//                             await supportTicketService.updateStatus(ticket.id, 'in_progress');
//                             logger.info(`🔄 Reopened ticket ${ticket.ticket_number}`);
//                         }

//                         await supportTicketService.updateTicketEmailInfo(ticket.id, {
//                             rfcMessageId: email.messageId,
//                             references: email.references
//                         });

//                         logger.info(`💬 Added reply to ticket ${ticket.ticket_number} from ${email.from}`);
//                     }

//                     await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                     processedCount++;

//                 } catch (err) {
//                     logger.error(`Error processing email ${email.id}:`, err);
//                 }
//             }

//             logger.info(`✅ Processed ${processedCount} new inbound queries`);

//         } catch (error) {
//             logger.error('Error syncing new inbound queries:', error);
//         }
//     }

//     async syncSentEmails() {
//         try {
//             const adminEmails = [
//                 process.env.SUPERADMIN_GMAIL_EMAIL,
//                 process.env.ADMIN_EMAIL,
//                 'rajdevfree2@gmail.com',
//                 'anilkumarr0180@gmail.com'
//             ].filter(Boolean);

//             const sentEmails = await supportEmailService.fetchSentEmails();

//             if (sentEmails.length === 0) {
//                 return;
//             }

//             logger.info(`📤 Found ${sentEmails.length} sent emails to check`);

//             for (const email of sentEmails) {
//                 try {
//                     const already = await supportTicketService.isEmailProcessed(email.id);
//                     if (already) {
//                         logger.debug(`⏭️ Sent email ${email.id} already processed, skipping`);
//                         continue;
//                     }

//                     if (supportEmailService.isSystemEmail(email)) {
//                         logger.debug(`⏭️ Skipping system sent email: ${email.subject}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         continue;
//                     }

//                     if (this.isConfirmationEmail(email)) {
//                         logger.debug(`⏭️ Skipping confirmation sent email: ${email.subject}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         continue;
//                     }

//                     const sender = this.parseEmail(email.from);
//                     if (!adminEmails.includes(sender)) {
//                         logger.debug(`⏭️ Skipping non-admin sent email: ${sender}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         continue;
//                     }

//                     let ticket = await supportTicketService.findTicketByThread(email.threadId);

//                     if (!ticket && email.inReplyTo) {
//                         ticket = await supportTicketService.findTicketByMessageId(email.inReplyTo);
//                     }

//                     if (!ticket) {
//                         const ticketNumber = supportEmailService.extractTicketNumber(email.subject);
//                         if (ticketNumber) {
//                             ticket = await supportTicketService.findTicketByNumber(ticketNumber);
//                         }
//                     }

//                     if (!ticket) {
//                         logger.debug(`⏭️ No ticket found for sent email: ${email.subject}`);
//                         await supportTicketService.markEmailProcessed(email.id);
//                         continue;
//                     }

//                     if (this.isAdminSystemEmail(email)) {
//                         logger.debug(`⏭️ Skipping admin system email for ticket ${ticket.ticket_number}`);
//                         await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                         continue;
//                     }

//                     const dup = await supportTicketService.hasRecentSimilarReply(ticket.id, 'admin', 120);
//                     if (dup) {
//                         logger.debug(`⏭️ Skipping likely-duplicate sent-email admin reply for ticket ${ticket.ticket_number} (race guard)`);
//                         await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                         continue;
//                     }

//                     await supportTicketService.addReply({
//                         ticket_id: ticket.id,
//                         reply_type: 'admin',
//                         sender_email: email.from,
//                         sender_name: 'Support Team (from Gmail)',
//                         message: this.stripHtml(email.body) || email.snippet,,
//                         gmail_message_id: email.id,
//                         email_rfc_message_id: email.messageId
//                     });

//                     await supportTicketService.markEmailProcessed(email.id, ticket.id);
//                     logger.info(`✅ Admin reply from Gmail added to ticket ${ticket.ticket_number}`);

//                 } catch (err) {
//                     logger.error(`Error processing sent email ${email.id}:`, err);
//                 }
//             }

//         } catch (error) {
//             logger.error('Error syncing sent emails:', error);
//         }
//     }

//     isConfirmationEmail(email) {
//         if (!email) return false;

//         const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
//         const from = (email.from || '').toLowerCase();
//         const isFromSupportAccount = !!supportAddr && from.includes(supportAddr);

//         if (!isFromSupportAccount) {
//             return false;
//         }

//         const body = (email.body || '').toLowerCase();
//         const subject = (email.subject || '').toLowerCase();

//         if (body.includes('thank you for contacting us') && 
//             body.includes('we have received your query')) {
//             return true;
//         }
        
//         if (body.includes('ticket number:') && 
//             body.includes('we will get back to you shortly')) {
//             return true;
//         }
        
//         if (subject.includes('we received your query') || 
//             subject.includes('confirmation') ||
//             subject.includes('thank you for contacting')) {
//             return true;
//         }
        
//         return false;
//     }

//     isAdminSystemEmail(email) {
//         if (!email) return false;

//         if (email.headers) {
//             const autoReply = email.headers['x-auto-reply'] || '';
//             const systemEmail = email.headers['x-system-email'] || '';
//             const precedence = email.headers['precedence'] || '';

//             if (autoReply === 'yes' || systemEmail === 'true' || precedence === 'bulk') {
//                 return true;
//             }
//         }

//         const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
//         const from = (email.from || '').toLowerCase();
//         const isFromSupportAccount = !!supportAddr && from.includes(supportAddr);

//         if (!isFromSupportAccount) {
//             return false;
//         }

//         const body = (email.body || '').toLowerCase();

//         if (body.includes('has been marked as resolved') && 
//             body.includes('if you are not satisfied')) {
//             return true;
//         }
        
//         if (body.includes('this is an automated message') && 
//             body.includes('ticket')) {
//             return true;
//         }
        
//         return false;
//     }

//     parseEmail(fromHeader) {
//         if (!fromHeader) return null;
//         const match = fromHeader.match(/<(.+?)>/);
//         return match ? match[1] : fromHeader;
//     }

//     stop() {
//         logger.info('🛑 Email sync service stopping...');
//         this.isSyncing = false;
//     }
// }

// module.exports = new EmailSyncService();


const supportEmailService = require('./supportEmailService');
const supportTicketService = require('./supportTicketService');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

class EmailSyncService {
    constructor() {
        this.isSyncing = false;
        this._watchRenewalInProgress = false;
    }

    async sync() {
        if (this.isSyncing) {
            logger.debug('Sync already in progress, skipping...');
            return;
        }

        this.isSyncing = true;
        try {
            logger.info('🔄 Starting full email sync...');

            await this.syncOpenTicketThreads();
            await this.syncNewInboundQueries();
            await this.syncSentEmails();

        } catch (error) {
            logger.error('Error during email sync:', error);
        } finally {
            this.isSyncing = false;
        }
    }

stripHtml(text) {
        if (!text) return text;
        if (!/<[a-z][\s\S]*>/i.test(text)) return text; // not HTML, leave as-is
        return text
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }



    async processHistorySince(startHistoryId) {
        const touchedTicketIds = new Set();

        try {
            const messageIds = await supportEmailService.getHistoryMessageIds(startHistoryId);

          if (messageIds === null) {
    logger.warn('⚠️ History expired, but sync disabled - skipping');
     await this.sync(); 
    return { touchedTicketIds: [] };
}
            if (messageIds.length === 0) {
                logger.info('📭 No new messages in this history diff');
                return { touchedTicketIds: [] };
            }

            logger.info(`📧 Processing ${messageIds.length} messages from push notification...`);

            let processedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;

            for (const id of messageIds) {
                try {
                  
const claimed = await supportTicketService.claimEmailProcessing(id);
                    if (!claimed) {
                        logger.info(`⏭️ [${id}] Already claimed by another sync run, skipping`);
                        skippedCount++;
                        continue;
                    }
                    let email;
                    try {
                        email = await supportEmailService.getEmailById(id);
                    } catch (fetchError) {
                        if (fetchError.status === 404 || fetchError.code === 404) {
                            logger.warn(`⚠️ [${id}] Message not found in Gmail (deleted), marking as processed`);
                            await supportTicketService.markEmailProcessed(id);
                            skippedCount++;
                            continue;
                        }
                        throw fetchError;
                    }

                    if (!email) {
                        logger.warn(`⚠️ Could not fetch email ${id}`);
                        skippedCount++;
                        continue;
                    }

                    // ✅ LOG DETAILED EMAIL INFO
                    logger.info(`📧 [${id}] From: "${email.from}", Subject: "${email.subject}"`);

                    const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
                    const isFromSupport = email.from.toLowerCase().includes(supportAddr);

                    // ✅ CRITICAL: Only check system/confirmation if email is FROM support
                    if (isFromSupport) {
                        if (supportEmailService.isSystemEmail(email)) {
                            logger.info(`⏭️ [${id}] Skipping SYSTEM email from support: ${email.subject}`);
                            await supportTicketService.markEmailProcessed(email.id);
                            skippedCount++;
                            continue;
                        }

                        if (this.isConfirmationEmail(email)) {
                            logger.info(`⏭️ [${id}] Skipping CONFIRMATION email from support: ${email.subject}`);
                            await supportTicketService.markEmailProcessed(email.id);
                            skippedCount++;
                            continue;
                        }
                    } else {
                        // ✅ Email is FROM a customer - NEVER skip as system/confirmation
                        logger.info(`✅ [${id}] Email is FROM customer: ${email.from}`);
                    }

                    let ticket = await supportTicketService.findTicketByThread(email.threadId)
                        || await supportTicketService.findTicketByMessageId(email.inReplyTo)
                        || await supportTicketService.findTicketByMessageId(email.messageId);

                    if (!ticket) {
                        if (isFromSupport) {
                            logger.info(`⏭️ [${id}] Skipping ADMIN email with no matching ticket: ${email.subject}`);
                            await supportTicketService.markEmailProcessed(email.id);
                            skippedCount++;
                            continue;
                        }

                        const fromMatch = email.from.match(/<(.+?)>/);
                        const fromEmail = fromMatch ? fromMatch[1] : email.from;
                        const fromName = email.from.split('<')[0].trim() || fromEmail;

                        ticket = await supportTicketService.createTicket({
                            user_email: fromEmail,
                            user_name: fromName,
                            subject: email.subject,
                            message: this.stripHtml(email.body) || email.snippet,
                            gmail_message_id: email.id,
                            gmail_thread_id: email.threadId,
                            email_rfc_message_id: email.messageId,
                            email_references: email.references,
                            source: 'email',
                            priority: 'medium'
                        });

                        await supportTicketService.updateTicketEmailInfo(ticket.id, {
                            gmailApiMessageId: email.id,
                            rfcMessageId: email.messageId,
                            references: email.references,
                            gmailThreadId: email.threadId
                        });

                        logger.info(`🎫 [${id}] ✅ Created NEW ticket ${ticket.ticket_number} from ${fromEmail}`);
                    } else {
                        const isFromUser = email.from.toLowerCase().includes(ticket.user_email.toLowerCase());
                        const replyType = isFromUser ? 'user' : 'admin';

                        logger.info(`🔍 [${id}] Found ticket ${ticket.ticket_number}, replyType=${replyType}`);

                        if (replyType === 'admin') {
                            const dup = await supportTicketService.hasRecentSimilarReply(ticket.id, 'admin', 120);
                            if (dup) {
                                logger.info(`⏭️ [${id}] Skipping DUPLICATE admin reply for ticket ${ticket.ticket_number}`);
                                await supportTicketService.markEmailProcessed(email.id, ticket.id);
                                touchedTicketIds.add(ticket.id);
                                continue;
                            }
                        }

                        await supportTicketService.addReply({
                            ticket_id: ticket.id,
                            reply_type: replyType,
                            sender_email: email.from,
                            sender_name: replyType === 'admin' ? 'Support Team (from Gmail)' : ticket.user_name,
                            message: this.stripHtml(email.body) || email.snippet,
                            gmail_message_id: email.id,
                            email_rfc_message_id: email.messageId
                        });

                        if (replyType === 'user' && ['resolved', 'closed'].includes(ticket.status)) {
                            await supportTicketService.updateStatus(ticket.id, 'in_progress');
                            logger.info(`🔄 [${id}] Reopened ticket ${ticket.ticket_number}`);
                        }

                        logger.info(`💬 [${id}] ✅ Added ${replyType} reply to ticket ${ticket.ticket_number} from ${email.from}`);
                    }

                    await supportTicketService.markEmailProcessed(email.id, ticket.id);
                    touchedTicketIds.add(ticket.id);
                    processedCount++;

                } catch (err) {
                    logger.error(`Error processing pushed message ${id}:`, err);
                    errorCount++;
                    
                }
            }

            logger.info(`📊 Summary: ${processedCount} processed, ${skippedCount} skipped, ${errorCount} errors`);

        } catch (error) {
            logger.error('Error in processHistorySince:', error);
        }

        return { touchedTicketIds: Array.from(touchedTicketIds) };
    }

    async startGmailWatch() {
        if (this._watchRenewalInProgress) {
            logger.debug('⏭️ Watch renewal already in progress, skipping...');
            return;
        }

        this._watchRenewalInProgress = true;
        try {
            const existingExpiration = await settingsService.get('gmail_watch_expiration');
            const now = Date.now();
            
            if (existingExpiration && parseInt(existingExpiration) > now + (60 * 60 * 1000)) {
                const currentHistoryId = await settingsService.get('gmail_last_history_id');
                logger.info(`👁️ Gmail watch still valid (expires at ${new Date(parseInt(existingExpiration)).toISOString()}), cursor at historyId=${currentHistoryId}`);
                return { historyId: currentHistoryId };
            }
            
            const result = await supportEmailService.startWatch();
            
            const currentHistoryId = await settingsService.get('gmail_last_history_id');
            
            if (!currentHistoryId) {
                await settingsService.set('gmail_last_history_id', String(result.historyId));
                logger.info(`👁️ Initial Gmail watch started. historyId=${result.historyId}`);
            } else {
                logger.info(`👁️ Gmail watch renewed (keeping cursor at historyId=${currentHistoryId})`);
            }
            
            await settingsService.set('gmail_watch_expiration', result.expiration);
            return result;
            
        } catch (error) {
            logger.error('Failed to start/renew Gmail watch:', error);
            throw error;
        } finally {
            this._watchRenewalInProgress = false;
        }
    }

    async syncOpenTicketThreads() {
        try {
            const pendingResult = await supportTicketService.listTickets({
                status: 'pending',
                limit: 500,
                offset: 0
            });

            const inProgressResult = await supportTicketService.listTickets({
                status: 'in_progress',
                limit: 500,
                offset: 0
            });

            const tickets = [...pendingResult.data, ...inProgressResult.data];

            if (tickets.length === 0) {
                logger.info('📭 No open tickets to sync');
                return;
            }

            logger.info(`🔄 Syncing ${tickets.length} open tickets...`);
            let processedCount = 0;

            for (const ticket of tickets) {
                if (!ticket.gmail_thread_id) continue;

                try {
                    const messages = await supportEmailService.fetchThreadMessages(ticket.gmail_thread_id);

                    for (const email of messages) {
                      const claimed = await supportTicketService.claimEmailProcessing(email.id);
                        if (!claimed) {
                            logger.debug(`⏭️ Email ${email.id} already claimed, skipping`);
                            continue;
                        }

                        const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
                        const isFromSupport = email.from.toLowerCase().includes(supportAddr);

                        if (isFromSupport) {
                            if (supportEmailService.isSystemEmail(email)) {
                                logger.debug(`⏭️ Skipping system email in thread: ${email.subject}`);
                                await supportTicketService.markEmailProcessed(email.id);
                                continue;
                            }

                            if (this.isConfirmationEmail(email)) {
                                logger.debug(`⏭️ Skipping confirmation email in thread: ${email.subject}`);
                                await supportTicketService.markEmailProcessed(email.id);
                                continue;
                            }
                        }

                        const isFromUser = email.from.toLowerCase().includes(ticket.user_email.toLowerCase());

                        if (!isFromUser && this.isAdminSystemEmail(email)) {
                            logger.debug(`⏭️ Skipping admin system email for ticket ${ticket.ticket_number}`);
                            await supportTicketService.markEmailProcessed(email.id, ticket.id);
                            continue;
                        }

                        if (!isFromUser) {
                            const dup = await supportTicketService.hasRecentSimilarReply(ticket.id, 'admin', 120);
                            if (dup) {
                                logger.debug(`⏭️ Skipping likely-duplicate admin reply for ticket ${ticket.ticket_number} (race guard)`);
                                await supportTicketService.markEmailProcessed(email.id, ticket.id);
                                continue;
                            }
                        }

                        await supportTicketService.addReply({
                            ticket_id: ticket.id,
                            reply_type: isFromUser ? 'user' : 'admin',
                            sender_email: email.from,
                            sender_name: isFromUser ? ticket.user_name : 'Support Team (from Gmail)',
                            message: this.stripHtml(email.body) || email.snippet,
                            gmail_message_id: email.id,
                            email_rfc_message_id: email.messageId
                        });

                        if (isFromUser && ['resolved', 'closed'].includes(ticket.status)) {
                            await supportTicketService.updateStatus(ticket.id, 'in_progress');
                            logger.info(`🔄 Reopened ticket ${ticket.ticket_number}`);
                        }

                        await supportTicketService.markEmailProcessed(email.id, ticket.id);
                        processedCount++;
                        logger.info(`✅ Added message to ticket ${ticket.ticket_number} from ${email.from}`);
                    }

                } catch (err) {
                    logger.error(`Thread sync failed for ticket ${ticket.id}:`, err.message);
                }
            }

            logger.info(`✅ Synced ${processedCount} new messages`);

        } catch (error) {
            logger.error('Error syncing open ticket threads:', error);
        }
    }

    async syncNewInboundQueries() {
        try {
            const emails = await supportEmailService.fetchCandidateEmails(100);

            if (emails.length === 0) {
                logger.info('📭 No new inbound queries');
                return;
            }

            logger.info(`📧 Processing ${emails.length} candidate emails...`);
            let processedCount = 0;

            for (const email of emails) {
                try {
                  const claimed = await supportTicketService.claimEmailProcessing(email.id);
                    if (!claimed) {
                        logger.debug(`⏭️ Email ${email.id} already claimed, skipping`);
                        continue;
                    }

                    const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
                    const isFromSupport = email.from.toLowerCase().includes(supportAddr);

                    if (isFromSupport) {
                        if (supportEmailService.isSystemEmail(email)) {
                            logger.debug(`⏭️ Skipping system email: ${email.subject}`);
                            await supportTicketService.markEmailProcessed(email.id);
                            continue;
                        }

                        if (this.isConfirmationEmail(email)) {
                            logger.debug(`⏭️ Skipping confirmation email: ${email.subject}`);
                            await supportTicketService.markEmailProcessed(email.id);
                            continue;
                        }
                    }

                    let ticket = await supportTicketService.findTicketByThread(email.threadId)
                        || await supportTicketService.findTicketByMessageId(email.inReplyTo)
                        || await supportTicketService.findTicketByMessageId(email.messageId);

                    if (!ticket) {
                        const fromMatch = email.from.match(/<(.+?)>/);
                        const fromEmail = fromMatch ? fromMatch[1] : email.from;
                        const fromName = email.from.split('<')[0].trim() || fromEmail;

                        ticket = await supportTicketService.createTicket({
                            user_email: fromEmail,
                            user_name: fromName,
                            subject: email.subject,
                            message: this.stripHtml(email.body) || email.snippet,
                            gmail_message_id: email.id,
                            gmail_thread_id: email.threadId,
                            email_rfc_message_id: email.messageId,
                            email_references: email.references,
                            source: 'email',
                            priority: 'medium'
                        });

                        await supportTicketService.updateTicketEmailInfo(ticket.id, {
                            gmailApiMessageId: email.id,
                            rfcMessageId: email.messageId,
                            references: email.references,
                            gmailThreadId: email.threadId
                        });

                        logger.info(`🎫 Created new ticket ${ticket.ticket_number} from ${fromEmail}`);
                    } else {
                        const isFromUser = email.from.toLowerCase().includes(ticket.user_email.toLowerCase());

                        if (!isFromUser && this.isAdminSystemEmail(email)) {
                            logger.debug(`⏭️ Skipping admin system email for ticket ${ticket.ticket_number}`);
                            await supportTicketService.markEmailProcessed(email.id, ticket.id);
                            continue;
                        }

                        if (!isFromUser) {
                            const dup = await supportTicketService.hasRecentSimilarReply(ticket.id, 'admin', 120);
                            if (dup) {
                                logger.debug(`⏭️ Skipping likely-duplicate admin reply for ticket ${ticket.ticket_number} (race guard)`);
                                await supportTicketService.markEmailProcessed(email.id, ticket.id);
                                continue;
                            }
                        }

                        await supportTicketService.addReply({
                            ticket_id: ticket.id,
                            reply_type: isFromUser ? 'user' : 'admin',
                            sender_email: email.from,
                            sender_name: isFromUser ? ticket.user_name : 'Support Team (from Gmail)',
                            message: this.stripHtml(email.body) || email.snippet,
                            gmail_message_id: email.id,
                            email_rfc_message_id: email.messageId
                        });

                        if (isFromUser && ['resolved', 'closed'].includes(ticket.status)) {
                            await supportTicketService.updateStatus(ticket.id, 'in_progress');
                            logger.info(`🔄 Reopened ticket ${ticket.ticket_number}`);
                        }

                        await supportTicketService.updateTicketEmailInfo(ticket.id, {
                            rfcMessageId: email.messageId,
                            references: email.references
                        });

                        logger.info(`💬 Added reply to ticket ${ticket.ticket_number} from ${email.from}`);
                    }

                    await supportTicketService.markEmailProcessed(email.id, ticket.id);
                    processedCount++;

                } catch (err) {
                    logger.error(`Error processing email ${email.id}:`, err);
                }
            }

            logger.info(`✅ Processed ${processedCount} new inbound queries`);

        } catch (error) {
            logger.error('Error syncing new inbound queries:', error);
        }
    }

    async syncSentEmails() {
        try {
            const adminEmails = [
                process.env.SUPERADMIN_GMAIL_EMAIL,
                process.env.ADMIN_EMAIL,
                'rajdevfree2@gmail.com',
                'anilkumarr0180@gmail.com'
            ].filter(Boolean);

            const sentEmails = await supportEmailService.fetchSentEmails();

            if (sentEmails.length === 0) {
                return;
            }

            logger.info(`📤 Found ${sentEmails.length} sent emails to check`);

            for (const email of sentEmails) {
                try {
                   const claimed = await supportTicketService.claimEmailProcessing(email.id);
                    if (!claimed) {
                        logger.debug(`⏭️ Sent email ${email.id} already claimed, skipping`);
                        continue;
                    }

                    const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
                    const isFromSupport = email.from.toLowerCase().includes(supportAddr);

                    if (isFromSupport) {
                        if (supportEmailService.isSystemEmail(email)) {
                            logger.debug(`⏭️ Skipping system sent email: ${email.subject}`);
                            await supportTicketService.markEmailProcessed(email.id);
                            continue;
                        }

                        if (this.isConfirmationEmail(email)) {
                            logger.debug(`⏭️ Skipping confirmation sent email: ${email.subject}`);
                            await supportTicketService.markEmailProcessed(email.id);
                            continue;
                        }
                    }

                    const sender = this.parseEmail(email.from);
                    if (!adminEmails.includes(sender)) {
                        logger.debug(`⏭️ Skipping non-admin sent email: ${sender}`);
                        await supportTicketService.markEmailProcessed(email.id);
                        continue;
                    }

                    let ticket = await supportTicketService.findTicketByThread(email.threadId);

                    if (!ticket && email.inReplyTo) {
                        ticket = await supportTicketService.findTicketByMessageId(email.inReplyTo);
                    }

                    if (!ticket) {
                        const ticketNumber = supportEmailService.extractTicketNumber(email.subject);
                        if (ticketNumber) {
                            ticket = await supportTicketService.findTicketByNumber(ticketNumber);
                        }
                    }

                    if (!ticket) {
                        logger.debug(`⏭️ No ticket found for sent email: ${email.subject}`);
                        await supportTicketService.markEmailProcessed(email.id);
                        continue;
                    }

                    if (this.isAdminSystemEmail(email)) {
                        logger.debug(`⏭️ Skipping admin system email for ticket ${ticket.ticket_number}`);
                        await supportTicketService.markEmailProcessed(email.id, ticket.id);
                        continue;
                    }

                    const dup = await supportTicketService.hasRecentSimilarReply(ticket.id, 'admin', 120);
                    if (dup) {
                        logger.debug(`⏭️ Skipping likely-duplicate sent-email admin reply for ticket ${ticket.ticket_number} (race guard)`);
                        await supportTicketService.markEmailProcessed(email.id, ticket.id);
                        continue;
                    }

                    await supportTicketService.addReply({
                        ticket_id: ticket.id,
                        reply_type: 'admin',
                        sender_email: email.from,
                        sender_name: 'Support Team (from Gmail)',
                        message: this.stripHtml(email.body) || email.snippet,
                        gmail_message_id: email.id,
                        email_rfc_message_id: email.messageId
                    });

                    await supportTicketService.markEmailProcessed(email.id, ticket.id);
                    logger.info(`✅ Admin reply from Gmail added to ticket ${ticket.ticket_number}`);

                } catch (err) {
                    logger.error(`Error processing sent email ${email.id}:`, err);
                }
            }

        } catch (error) {
            logger.error('Error syncing sent emails:', error);
        }
    }

    /**
     * ✅ FIXED: Only check confirmation patterns if email is FROM support account
     * This prevents customer replies from being skipped when they quote the confirmation email
     */
    isConfirmationEmail(email) {
        if (!email) return false;

        const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
        const from = (email.from || '').toLowerCase();
        const isFromSupportAccount = !!supportAddr && from.includes(supportAddr);

        // ✅ If email is NOT from support account, it's a customer email - NEVER skip it
        if (!isFromSupportAccount) {
            return false;
        }

        const body = (email.body || '').toLowerCase();
        const subject = (email.subject || '').toLowerCase();

        if (body.includes('thank you for contacting us') && 
            body.includes('we have received your query')) {
            return true;
        }
        
        if (body.includes('ticket number:') && 
            body.includes('we will get back to you shortly')) {
            return true;
        }
        
        if (subject.includes('we received your query') || 
            subject.includes('confirmation') ||
            subject.includes('thank you for contacting')) {
            return true;
        }
        
        return false;
    }

    /**
     * ✅ FIXED: Only check admin system patterns if email is FROM support account
     */
    isAdminSystemEmail(email) {
        if (!email) return false;

        if (email.headers) {
            const autoReply = email.headers['x-auto-reply'] || '';
            const systemEmail = email.headers['x-system-email'] || '';
            const precedence = email.headers['precedence'] || '';

            if (autoReply === 'yes' || systemEmail === 'true' || precedence === 'bulk') {
                return true;
            }
        }

        const supportAddr = (process.env.SUPERADMIN_GMAIL_EMAIL || '').toLowerCase();
        const from = (email.from || '').toLowerCase();
        const isFromSupportAccount = !!supportAddr && from.includes(supportAddr);

        // ✅ If email is NOT from support account, it's a customer email - NEVER skip it
        if (!isFromSupportAccount) {
            return false;
        }

        const body = (email.body || '').toLowerCase();

        if (body.includes('has been marked as resolved') && 
            body.includes('if you are not satisfied')) {
            return true;
        }
        
        if (body.includes('this is an automated message') && 
            body.includes('ticket')) {
            return true;
        }
        
        return false;
    }

    parseEmail(fromHeader) {
        if (!fromHeader) return null;
        const match = fromHeader.match(/<(.+?)>/);
        return match ? match[1] : fromHeader;
    }

    stop() {
        logger.info('🛑 Email sync service stopping...');
        this.isSyncing = false;
    }
}

module.exports = new EmailSyncService();