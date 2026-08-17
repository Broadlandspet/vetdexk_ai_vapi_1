

const supportTicketService = require('../services/supportTicketService');
const supportEmailService = require('../services/supportEmailService');
const emailSyncService = require('../services/emailSyncService');
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

function cleanSubject(subject) {
    if (!subject) return subject;
    return subject
        .replace(/\s*\[TICKET-\d{8}-\d{4}\]\s*/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

exports.listTickets = async (req, res) => {
    try {
        const { 
            status, 
            priority, 
            search, 
            source,
            page = 1, 
            limit = 20 
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await supportTicketService.listTickets({
            status,
            priority,
            search,
            source,
            limit: parseInt(limit),
            offset
        });

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
        
    } catch (error) {
        logger.error('Error listing tickets:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets',
            error: error.message
        });
    }
};

exports.getTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const ticket = await supportTicketService.getTicketById(id);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        logger.error('Error getting ticket:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket'
        });
    }
};

exports.replyToTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, is_internal } = req.body;
        const adminId = req.userId;
        const files = req.files || [];

        const isInternalBool = is_internal === true || is_internal === 'true';

        if ((!message || message.trim() === '') && files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Reply message or attachment is required'
            });
        }

        const ticket = await supportTicketService.getTicketById(id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const adminEmail = req.user?.email || req.userEmail || process.env.SUPERADMIN_GMAIL_EMAIL || 'admin@system.com';
        const adminName = req.user?.name || req.userName || 'Admin';
        const cleanMessage = (message || '').trim();

        let reply;
        let wonRace = true; // internal notes never race, so default true

        if (isInternalBool) {
            // Internal notes never touch Gmail — create immediately, no race possible.
            reply = await supportTicketService.addReply({
                ticket_id: id,
                reply_type: 'admin',
                sender_email: adminEmail,
                sender_name: adminName,
                message: cleanMessage,
                is_internal: true
            });
  } else {
    // ✅ For customer-facing replies: send FIRST, then atomically claim the
    // Gmail message ID BEFORE creating any row.
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
    const baseSubject = cleanSubject(ticket.subject);
    const subject = baseSubject.toLowerCase().startsWith('re:')
        ? baseSubject
        : `Re: ${baseSubject}`;

    const html = `
        <html>
        <body>
            <p>Hello ${ticket.user_name || 'User'},</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
                <p>${cleanMessage.replace(/\n/g, '<br>')}</p>
            </div>
            <p>Reply to this email to continue the conversation.</p>
            <hr>
            <p style="color:#6c757d;font-size:12px;">
                Ticket #${ticket.ticket_number} | 
              
            </p>
        </body>
        </html>
    `;

    const looksLikeRealMessageId = /^<.+@.+>$/.test(ticket.email_rfc_message_id || '');
    const inReplyToMessageId = looksLikeRealMessageId ? ticket.email_rfc_message_id : null;
    const referencesChain = looksLikeRealMessageId ? ticket.email_references : null;

    // ✅ NEW: build attachment payload from multer's in-memory buffers
    const emailAttachments = files.map(f => ({
        filename: f.originalname,
        mimeType: f.mimetype,
        buffer: f.buffer
    }));

    const emailResult = await supportEmailService.sendEmailReply({
        to: ticket.user_email,
        subject,
        html,
        inReplyToMessageId,
        referencesChain,
        threadId: ticket.gmail_thread_id,
        ticketNumber: ticket.ticket_number,
        attachments: emailAttachments   // ✅ NEW
    });

            if (emailResult && emailResult.gmailApiMessageId) {
                wonRace = await supportTicketService.claimEmailProcessing(emailResult.gmailApiMessageId, ticket.id);
            }

            if (wonRace) {
                // We got here first — safe to create the reply row, with the
                // Gmail ID already attached (no separate update needed, so no
                // UNIQUE-collision window at all).
                reply = await supportTicketService.addReply({
                    ticket_id: id,
                    reply_type: 'admin',
                    sender_email: adminEmail,
                    sender_name: adminName,
                    message: cleanMessage,
                    is_internal: false,
                    gmail_message_id: emailResult?.gmailApiMessageId || null,
                    email_rfc_message_id: emailResult?.rfcMessageId || null
                });

                if (emailResult) {
                    try {
                        await supportTicketService.updateTicketEmailInfo(ticket.id, {
                            gmailApiMessageId: emailResult.gmailApiMessageId,
                            rfcMessageId: emailResult.rfcMessageId,
                            references: emailResult.references,
                            gmailThreadId: emailResult.threadId
                        });
                    } catch (metaErr) {
                        logger.error(`⚠️ Reply sent OK but failed to save ticket email info:`, metaErr.message);
                    }
                }
            } else {
                // A webhook/sync run claimed this exact Gmail message first and
                // already inserted its own reply row for it — reuse that row
                // instead of creating a duplicate.
                logger.warn(`⚠️ Lost claim race for ${emailResult?.gmailApiMessageId} — reusing existing reply row`);
                reply = await supportTicketService.getReplyByGmailMessageId(emailResult?.gmailApiMessageId);

                if (reply && reply.message !== cleanMessage) {
                    // The sync path stores the raw sent-email HTML as the message
                    // (no plain-text part exists for our own outgoing emails).
                    // We know the real text the admin typed — fix the row.
                    reply = await supportTicketService.updateReplyMessage(reply.id, cleanMessage) || reply;
                }

                if (!reply) {
                    // Extremely unlikely (claim lost but no row yet — the other
                    // side is mid-insert). Fall back to creating our own row
                    // rather than losing the message entirely.
                    reply = await supportTicketService.addReply({
                        ticket_id: id,
                        reply_type: 'admin',
                        sender_email: adminEmail,
                        sender_name: adminName,
                        message: cleanMessage,
                        is_internal: false,
                        gmail_message_id: emailResult?.gmailApiMessageId || null,
                        email_rfc_message_id: emailResult?.rfcMessageId || null
                    });
                }
            }

            logger.info(`✅ Admin reply sent to ${ticket.user_email} for ticket ${ticket.ticket_number}`);
        }

        const savedAttachments = [];
        for (const file of files) {
            try {
                const saved = await supportEmailService.saveUploadedFile(file, id, reply.id, adminId);
                savedAttachments.push(saved);
            } catch (attachErr) {
                logger.error(`❌ Failed to save attachment ${file.originalname} for ticket ${id}:`, attachErr.message);
            }
        }
        reply.attachments = savedAttachments;

        if (!['resolved', 'closed'].includes(ticket.status)) {
            await supportTicketService.updateStatus(id, 'in_progress');
        }


         const io = req.app.get('io');
        if (io) {
            io.emit('tickets:updated', { ticketIds: [ticket.id] });
        }

        return res.status(200).json({
            success: true,
            message: 'Reply sent successfully',
            data: reply
        });

    } catch (error) {
        logger.error('Error replying to ticket:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send reply',
            error: error.message
        });
    }
};

exports.updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed: pending, in_progress, resolved, closed'
            });
        }

        const ticket = await supportTicketService.updateStatus(id, status);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        if (status === 'resolved') {
            const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';

            const baseSubject = cleanSubject(ticket.subject);
            const subject = baseSubject.toLowerCase().startsWith('re:')
                ? baseSubject
                : `Re: ${baseSubject}`;
            const html = `
                <html>
                <body>
                    <p>Hello ${ticket.user_name || 'User'},</p>
                    <p>Your ticket "<strong>${ticket.subject}</strong>" has been marked as resolved.</p>
                    <p>If you are not satisfied, simply reply to this email and we will reopen it.</p>
                    <hr>
                    <p style="color:#6c757d;font-size:12px;">
                        Ticket #${ticket.ticket_number} | 
                      
                    </p>
                </body>
                </html>
            `;
            const looksLikeRealMessageId = /^<.+@.+>$/.test(ticket.email_rfc_message_id || '');
            const inReplyToMessageId = looksLikeRealMessageId ? ticket.email_rfc_message_id : null;
            const referencesChain = looksLikeRealMessageId ? ticket.email_references : null;
            const emailResult = await supportEmailService.sendEmailReply({
                to: ticket.user_email,
                subject,
                html,
                inReplyToMessageId,
                referencesChain,
                threadId: ticket.gmail_thread_id,
                ticketNumber: ticket.ticket_number
            });
     if (emailResult && emailResult.gmailApiMessageId) {
                try {
                    const claimed = await supportTicketService.claimEmailProcessing(emailResult.gmailApiMessageId, ticket.id);
                    if (!claimed) {
                        logger.warn(`⚠️ Resolution email ${emailResult.gmailApiMessageId} already claimed elsewhere (webhook likely got there first)`);
                    }
                } catch (markErr) {
                    logger.error(`⚠️ Failed to claim resolution email as processed:`, markErr.message);
                }
            }

            logger.info(`✅ Resolution email sent for ticket ${ticket.ticket_number}`);
        }

 const io = req.app.get('io');
        if (io) {
            io.emit('tickets:updated', { ticketIds: [ticket.id] });
        }


        return res.status(200).json({
            success: true,
            message: `Ticket status updated to ${status}`,
            data: ticket
        });

    } catch (error) {
        logger.error('Error updating ticket status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
};

exports.updateTicketPriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        const valid = ['low', 'medium', 'high'];
        if (!valid.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid priority. Allowed: low, medium, high'
            });
        }

        const ticket = await supportTicketService.updatePriority(id, priority);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

   const io = req.app.get('io');
        if (io) {
            io.emit('tickets:updated', { ticketIds: [ticket.id] });
        }


        return res.status(200).json({
            success: true,
            message: `Ticket priority updated to ${priority}`,
            data: ticket
        });

    } catch (error) {
        logger.error('Error updating ticket priority:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update priority'
        });
    }
};

exports.assignTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_id } = req.body;

        if (!admin_id) {
            return res.status(400).json({
                success: false,
                message: 'admin_id is required'
            });
        }

        const ticket = await supportTicketService.assignTicket(id, admin_id);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
const io = req.app.get('io');
        if (io) {
            io.emit('tickets:updated', { ticketIds: [ticket.id] });
        }



        return res.status(200).json({
            success: true,
            message: 'Ticket assigned successfully',
            data: ticket
        });

    } catch (error) {
        logger.error('Error assigning ticket:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign ticket'
        });
    }
};

exports.getStats = async (req, res) => {
    try {
        const stats = await supportTicketService.getStats();
        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch stats'
        });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await supportTicketService.getDashboardStats();
        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting dashboard stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats'
        });
    }
};

exports.manualSync = async (req, res) => {
    try {
        await emailSyncService.sync();
        return res.status(200).json({
            success: true,
            message: 'Manual sync completed'
        });
    } catch (error) {
        logger.error('Error during manual sync:', error);
        return res.status(500).json({
            success: false,
            message: 'Manual sync failed',
            error: error.message
        });
    }
};

exports.manualSyncSent = async (req, res) => {
    try {
        await emailSyncService.syncSentEmails();
        return res.status(200).json({
            success: true,
            message: 'Sent emails sync completed'
        });
    } catch (error) {
        logger.error('Error during sent emails sync:', error);
        return res.status(500).json({
            success: false,
            message: 'Sent emails sync failed'
        });
    }
};

exports.startGmailWatch = async (req, res) => {
    try {
        const result = await emailSyncService.startGmailWatch();
        return res.status(200).json({
            success: true,
            message: 'Gmail watch registered',
            data: result
        });
    } catch (error) {
        logger.error('Error starting Gmail watch:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to start Gmail watch',
            error: error.message
        });
    }
};

exports.handleGmailWebhook = async (req, res) => {
    try {
        let data;
        if (req.body.message && req.body.message.data) {
            const decoded = Buffer.from(req.body.message.data, 'base64').toString('utf-8');
            data = JSON.parse(decoded);
        } else {
            data = req.body;
        }

        const pushHistoryId = data.historyId;
        const emailAddress = data.emailAddress;

        if (!pushHistoryId) {
            logger.warn('⚠️ Gmail webhook received without historyId');
            return res.status(200).send('OK');
        }

        logger.info(`📬 Gmail push notification: historyId=${pushHistoryId} for ${emailAddress}`);

        const storedHistoryId = await settingsService.get('gmail_last_history_id');

        if (!storedHistoryId) {
            logger.info('📭 No stored history cursor, running full sync...');
            await emailSyncService.sync();
            await settingsService.set('gmail_last_history_id', String(pushHistoryId));
            return res.status(200).send('OK');
        }

        const startId = parseInt(storedHistoryId);
        
        const processFrom = Math.min(startId, pushHistoryId) - 100;
        
        if (startId >= pushHistoryId) {
            logger.info(`📌 Cursor ${startId} is >= push ${pushHistoryId}, processing from ${processFrom}`);
        } else {
            logger.info(`📌 Diffing from ${processFrom} to ${pushHistoryId}`);
        }
        
        const result = await emailSyncService.processHistorySince(processFrom);
        
        // ✅ ALWAYS update cursor to push history ID
        await settingsService.set('gmail_last_history_id', String(pushHistoryId));
        logger.info(`📌 Updated history cursor to ${pushHistoryId}`);

        // ✅ ALWAYS emit socket events to refresh the dashboard
        const io = req.app.get('io');
        if (io) {
            // Always emit a refresh event so frontend fetches latest data
            io.emit('tickets:refresh');
            logger.info(`📡 Emitted tickets:refresh to refresh dashboard`);
            
            // Also emit specific ticket updates if any
            if (result?.touchedTicketIds?.length > 0) {
                io.emit('tickets:updated', { ticketIds: result.touchedTicketIds });
                logger.info(`📡 Emitted tickets:updated for [${result.touchedTicketIds.join(', ')}]`);
            } else {
                // Even if no new tickets were created, the cursor advanced
                // The frontend should refresh to show any updates
                logger.info(`📡 No new tickets created, but dashboard refresh sent`);
            }
        } else {
            logger.warn('⚠️ Socket.io not available, frontend will not update in real-time');
        }

        res.status(200).send('OK');

    } catch (error) {
        logger.error('Error processing Gmail webhook:', error);
        res.status(200).send('OK');
    }
};