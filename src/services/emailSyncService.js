// services/emailSyncService.js
const supportEmailService = require('./supportEmailService');
const supportTicketService = require('./supportTicketService');
const logger = require('../utils/logger');

class EmailSyncService {
    constructor() {
        this.isSyncing = false;
        // ✅ REMOVED: isRunning, interval, intervalId — no more 5-min polling loop.
        // sync() is now only called manually (dashboard "Sync inbox"/"Sync sent" buttons)
        // or as a fallback inside processHistorySince() if Gmail history has expired.
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

    /**
     * ✅ Called by the Gmail push webhook. Diffs history since lastHistoryId,
     * finds new/changed messages, and reuses the SAME per-email logic as
     * syncNewInboundQueries — just scoped to specific message IDs instead of
     * scanning the whole candidate list.
     *
     * Returns { touchedTicketIds } so the controller can emit a WebSocket
     * event only for tickets that actually changed.
     */
    async processHistorySince(startHistoryId) {
        const touchedTicketIds = new Set();

        try {
            const messageIds = await supportEmailService.getHistoryMessageIds(startHistoryId);

            if (messageIds === null) {
                // History expired (Gmail only retains ~1 week) — cursor is stale,
                // do one full sync so nothing gets silently dropped, then bail.
                logger.warn('⚠️ History expired, running full sync as fallback');
                await this.sync();
                return { touchedTicketIds: [] };
            }

            if (messageIds.length === 0) {
                logger.info('📭 No new messages in this history diff');
                return { touchedTicketIds: [] };
            }

            logger.info(`📧 Processing ${messageIds.length} messages from push notification...`);

            for (const id of messageIds) {
                try {
                    const already = await supportTicketService.isEmailProcessed(id);
                    if (already) continue;

                    const email = await supportEmailService.getEmailById(id);
                    if (!email) continue;

                    if (supportEmailService.isSystemEmail(email)) {
                        await supportTicketService.markEmailProcessed(email.id);
                        continue;
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
                            message: email.body || email.snippet,
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

                        logger.info(`🎫 [push] Created new ticket ${ticket.ticket_number} from ${fromEmail}`);
                    } else {
                        const isFromUser = email.from.toLowerCase().includes(ticket.user_email.toLowerCase());

                        await supportTicketService.addReply({
                            ticket_id: ticket.id,
                            reply_type: isFromUser ? 'user' : 'admin',
                            sender_email: email.from,
                            sender_name: isFromUser ? ticket.user_name : 'Support Team (from Gmail)',
                            message: email.body || email.snippet,
                            gmail_message_id: email.id,
                            email_rfc_message_id: email.messageId
                        });

                        if (isFromUser && ['resolved', 'closed'].includes(ticket.status)) {
                            await supportTicketService.updateStatus(ticket.id, 'in_progress');
                            logger.info(`🔄 [push] Reopened ticket ${ticket.ticket_number}`);
                        }

                        logger.info(`💬 [push] Added reply to ticket ${ticket.ticket_number} from ${email.from}`);
                    }

                    await supportTicketService.markEmailProcessed(email.id, ticket.id);
                    touchedTicketIds.add(ticket.id);

                } catch (err) {
                    logger.error(`Error processing pushed message ${id}:`, err);
                }
            }

        } catch (error) {
            logger.error('Error in processHistorySince:', error);
        }

        return { touchedTicketIds: Array.from(touchedTicketIds) };
    }

    /**
     * One-time / renewal call to start Gmail push notifications.
     * Call this on server boot (after a brief delay) and daily via cron.
     */
    async startGmailWatch() {
        const result = await supportEmailService.startWatch();
        const settingsService = require('./settingsService');
        await settingsService.set('gmail_last_history_id', String(result.historyId));
        logger.info(`👁️ Gmail watch started/renewed. historyId=${result.historyId}, expires=${new Date(parseInt(result.expiration)).toISOString()}`);
        return result;
    }

    /**
     * Sync open ticket threads by fetching entire Gmail thread.
     * Still used inside sync() — the manual "Sync inbox" button, and the
     * expired-history fallback path in processHistorySince().
     */
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
                        const already = await supportTicketService.isEmailProcessed(email.id);
                        if (already) continue;

                        if (supportEmailService.isSystemEmail(email)) {
                            logger.debug(`⏭️ Skipping system email in thread: ${email.subject}`);
                            await supportTicketService.markEmailProcessed(email.id);
                            continue;
                        }

                        const isFromUser = email.from.toLowerCase().includes(ticket.user_email.toLowerCase());

                        await supportTicketService.addReply({
                            ticket_id: ticket.id,
                            reply_type: isFromUser ? 'user' : 'admin',
                            sender_email: email.from,
                            sender_name: isFromUser ? ticket.user_name : 'Support Team (from Gmail)',
                            message: email.body || email.snippet,
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

    /**
     * Sync brand new inbound queries. Still used inside sync().
     */
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
                    const already = await supportTicketService.isEmailProcessed(email.id);
                    if (already) continue;

                    if (supportEmailService.isSystemEmail(email)) {
                        logger.debug(`⏭️ Skipping system email: ${email.subject}`);
                        await supportTicketService.markEmailProcessed(email.id);
                        continue;
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
                            message: email.body || email.snippet,
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

                        await supportTicketService.addReply({
                            ticket_id: ticket.id,
                            reply_type: isFromUser ? 'user' : 'admin',
                            sender_email: email.from,
                            sender_name: isFromUser ? ticket.user_name : 'Support Team (from Gmail)',
                            message: email.body || email.snippet,
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

    /**
     * Sync sent emails (admin replies from Gmail). Still used inside sync()
     * and by the manual "Sync sent" dashboard button.
     * Match by threadId/In-Reply-To, not subject — subject no longer
     * contains [TICKET-XXX] after the threading fix.
     */
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
                    const already = await supportTicketService.isEmailProcessed(email.id);
                    if (already) continue;

                    if (supportEmailService.isSystemEmail(email)) {
                        await supportTicketService.markEmailProcessed(email.id);
                        continue;
                    }

                    const sender = this.parseEmail(email.from);
                    if (!adminEmails.includes(sender)) {
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
                        await supportTicketService.markEmailProcessed(email.id);
                        continue;
                    }

                    await supportTicketService.addReply({
                        ticket_id: ticket.id,
                        reply_type: 'admin',
                        sender_email: email.from,
                        sender_name: 'Support Team (from Gmail)',
                        message: email.body || email.snippet,
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

    parseEmail(fromHeader) {
        if (!fromHeader) return null;
        const match = fromHeader.match(/<(.+?)>/);
        return match ? match[1] : fromHeader;
    }
}

module.exports = new EmailSyncService();