// // // const supportTicketService = require('../services/supportTicketService');
// // // const supportEmailService = require('../services/supportEmailService');
// // // const logger = require('../utils/logger');

// // // // ─── List all tickets (with filters) ──────────────────────────
// // // exports.listTickets = async (req, res) => {
// // //     try {
// // //         const { 
// // //             status, 
// // //             priority, 
// // //             search, 
// // //             source,
// // //             page = 1, 
// // //             limit = 20 
// // //         } = req.query;
        
// // //         const offset = (parseInt(page) - 1) * parseInt(limit);

// // //         const result = await supportTicketService.listTickets({
// // //             status,
// // //             priority,
// // //             search,
// // //             source,
// // //             limit: parseInt(limit),
// // //             offset
// // //         });

// // //         return res.status(200).json({
// // //             success: true,
// // //             data: result.data,
// // //             pagination: result.pagination
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error listing tickets:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to fetch tickets',
// // //             error: error.message
// // //         });
// // //     }
// // // };

// // // // ─── Get a single ticket with replies ────────────────────────
// // // exports.getTicket = async (req, res) => {
// // //     try {
// // //         const { id } = req.params;
// // //         const ticket = await supportTicketService.getTicketById(id);
        
// // //         if (!ticket) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 message: 'Ticket not found'
// // //             });
// // //         }
        
// // //         return res.status(200).json({
// // //             success: true,
// // //             data: ticket
// // //         });
// // //     } catch (error) {
// // //         logger.error('Error getting ticket:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to fetch ticket'
// // //         });
// // //     }
// // // };

// // // // controllers/supportTicketController.js

// // // // ─── Reply to a ticket ────────────────────────────────────────
// // // exports.replyToTicket = async (req, res) => {
// // //     try {
// // //         const { id } = req.params;
// // //         const { message, is_internal = false } = req.body;
// // //         const adminId = req.userId;

// // //         if (!message || message.trim() === '') {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 message: 'Reply message is required'
// // //             });
// // //         }

// // //         const ticket = await supportTicketService.getTicketById(id);
// // //         if (!ticket) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 message: 'Ticket not found'
// // //             });
// // //         }

// // //         const adminEmail = req.user?.email || req.userEmail || 'rajdevfree2@gmail.com';
// // //         const adminName = req.user?.name || req.userName || 'Admin';

// // //         // Save admin reply
// // //         const reply = await supportTicketService.addReply({
// // //             ticket_id: id,
// // //             reply_type: 'admin',
// // //             sender_email: adminEmail,
// // //             sender_name: adminName,
// // //             message: message.trim(),
// // //             is_internal: is_internal
// // //         });

// // //         if (!['resolved', 'closed'].includes(ticket.status)) {
// // //             await supportTicketService.updateStatus(id, 'in_progress');
// // //         }

// // //         if (!is_internal) {
// // //             const subject = `Re: ${ticket.subject} [${ticket.ticket_number}]`;
// // //             const html = `
// // //                 <html>
// // //                 <body>
// // //                     <p>Hello ${ticket.user_name || 'User'},</p>
// // //                     <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
// // //                         <p>${message.trim().replace(/\n/g, '<br>')}</p>
// // //                     </div>
// // //                     <p>Reply to this email to continue the conversation.</p>
// // //                     <hr>
// // //                     <p style="color:#6c757d;font-size:12px;">
// // //                         Ticket #${ticket.ticket_number}
// // //                     </p>
// // //                 </body>
// // //                 </html>
// // //             `;

// // //             // ✅ Use proper RFC822 Message-ID
// // //             const emailResult = await supportEmailService.sendEmailReply({
// // //                 to: ticket.user_email,
// // //                 subject,
// // //                 html,
// // //                 inReplyToMessageId: ticket.email_rfc_message_id,
// // //                 referencesChain: ticket.email_references,
// // //                 threadId: ticket.gmail_thread_id,
// // //                 ticketNumber: ticket.ticket_number
// // //             });

// // //             // ✅ Save all email info
// // //             if (emailResult) {
// // //                 await supportTicketService.updateTicketEmailInfo(ticket.id, {
// // //                     gmailApiMessageId: emailResult.gmailApiMessageId,
// // //                     rfcMessageId: emailResult.rfcMessageId,
// // //                     references: emailResult.references,
// // //                     gmailThreadId: emailResult.threadId
// // //                 });
// // //             }

// // //             logger.info(`✅ Admin reply sent to ${ticket.user_email} for ticket ${ticket.ticket_number}`);
// // //         }

// // //         return res.status(200).json({
// // //             success: true,
// // //             message: 'Reply sent successfully',
// // //             data: reply
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error replying to ticket:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to send reply',
// // //             error: error.message
// // //         });
// // //     }
// // // };



// // // exports.manualSyncSent = async (req, res) => {
// // //     try {
// // //         const emailSyncService = require('../services/emailSyncService');
// // //         await emailSyncService.syncSentEmails();
// // //         return res.status(200).json({
// // //             success: true,
// // //             message: 'Sent emails sync completed'
// // //         });
// // //     } catch (error) {
// // //         logger.error('Error during sent emails sync:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Sent emails sync failed'
// // //         });
// // //     }
// // // };

// // // // ─── Update ticket status ─────────────────────────────────────
// // // exports.updateTicketStatus = async (req, res) => {
// // //     try {
// // //         const { id } = req.params;
// // //         const { status } = req.body;

// // //         const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
// // //         if (!validStatuses.includes(status)) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 message: 'Invalid status. Allowed: pending, in_progress, resolved, closed'
// // //             });
// // //         }

// // //         const ticket = await supportTicketService.updateStatus(id, status);
// // //         if (!ticket) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 message: 'Ticket not found'
// // //             });
// // //         }

// // //         // If resolved, send resolution email
// // //         if (status === 'resolved') {
// // //             const subject = `Your ticket has been resolved [${ticket.ticket_number}]`;
// // //             const html = `
// // //                 <html>
// // //                 <body>
// // //                     <p>Hello ${ticket.user_name || 'User'},</p>
// // //                     <p>Your ticket "<strong>${ticket.subject}</strong>" has been marked as resolved.</p>
// // //                     <p>If you are not satisfied, simply reply to this email and we will reopen it.</p>
// // //                     <hr>
// // //                     <p style="color:#6c757d;font-size:12px;">Ticket #${ticket.ticket_number}</p>
// // //                 </body>
// // //                 </html>
// // //             `;
// // //             await supportEmailService.sendEmailReply({
// // //                 to: ticket.user_email,
// // //                 subject,
// // //                 html,
// // //                 inReplyTo: ticket.gmail_message_id,
// // //                 threadId: ticket.gmail_thread_id
// // //             });
// // //         }

// // //         return res.status(200).json({
// // //             success: true,
// // //             message: `Ticket status updated to ${status}`,
// // //             data: ticket
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error updating ticket status:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to update status'
// // //         });
// // //     }
// // // };

// // // // ─── Update ticket priority ──────────────────────────────────
// // // exports.updateTicketPriority = async (req, res) => {
// // //     try {
// // //         const { id } = req.params;
// // //         const { priority } = req.body;

// // //         const valid = ['low', 'medium', 'high'];
// // //         if (!valid.includes(priority)) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 message: 'Invalid priority. Allowed: low, medium, high'
// // //             });
// // //         }

// // //         const ticket = await supportTicketService.updatePriority(id, priority);
// // //         if (!ticket) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 message: 'Ticket not found'
// // //             });
// // //         }

// // //         return res.status(200).json({
// // //             success: true,
// // //             message: `Ticket priority updated to ${priority}`,
// // //             data: ticket
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error updating ticket priority:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to update priority'
// // //         });
// // //     }
// // // };

// // // // ─── Assign ticket to admin ──────────────────────────────────
// // // exports.assignTicket = async (req, res) => {
// // //     try {
// // //         const { id } = req.params;
// // //         const { admin_id } = req.body;

// // //         if (!admin_id) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 message: 'admin_id is required'
// // //             });
// // //         }

// // //         const ticket = await supportTicketService.assignTicket(id, admin_id);
// // //         if (!ticket) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 message: 'Ticket not found'
// // //             });
// // //         }

// // //         return res.status(200).json({
// // //             success: true,
// // //             message: 'Ticket assigned successfully',
// // //             data: ticket
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error assigning ticket:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to assign ticket'
// // //         });
// // //     }
// // // };

// // // // ─── Get statistics ──────────────────────────────────────────
// // // exports.getStats = async (req, res) => {
// // //     try {
// // //         const stats = await supportTicketService.getStats();
// // //         return res.status(200).json({
// // //             success: true,
// // //             data: stats
// // //         });
// // //     } catch (error) {
// // //         logger.error('Error getting stats:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to fetch stats'
// // //         });
// // //     }
// // // };

// // // // ─── Get dashboard stats ─────────────────────────────────────
// // // exports.getDashboardStats = async (req, res) => {
// // //     try {
// // //         const stats = await supportTicketService.getDashboardStats();
// // //         return res.status(200).json({
// // //             success: true,
// // //             data: stats
// // //         });
// // //     } catch (error) {
// // //         logger.error('Error getting dashboard stats:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to fetch dashboard stats'
// // //         });
// // //     }
// // // };

// // // // ─── Manual sync trigger ─────────────────────────────────────
// // // exports.manualSync = async (req, res) => {
// // //     try {
// // //         const emailSyncService = require('../services/emailSyncService');
// // //         await emailSyncService.sync();
// // //         return res.status(200).json({
// // //             success: true,
// // //             message: 'Manual sync completed'
// // //         });
// // //     } catch (error) {
// // //         logger.error('Error during manual sync:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Manual sync failed',
// // //             error: error.message
// // //         });
// // //     }
// // // };

// // // controllers/supportTicketController.js
// // const supportTicketService = require('../services/supportTicketService');
// // const supportEmailService = require('../services/supportEmailService');
// // const logger = require('../utils/logger');

// // // ─── List all tickets (with filters) ──────────────────────────
// // exports.listTickets = async (req, res) => {
// //     try {
// //         const { 
// //             status, 
// //             priority, 
// //             search, 
// //             source,
// //             page = 1, 
// //             limit = 20 
// //         } = req.query;
        
// //         const offset = (parseInt(page) - 1) * parseInt(limit);

// //         const result = await supportTicketService.listTickets({
// //             status,
// //             priority,
// //             search,
// //             source,
// //             limit: parseInt(limit),
// //             offset
// //         });

// //         return res.status(200).json({
// //             success: true,
// //             data: result.data,
// //             pagination: result.pagination
// //         });
        
// //     } catch (error) {
// //         logger.error('Error listing tickets:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to fetch tickets',
// //             error: error.message
// //         });
// //     }
// // };

// // // ─── Get a single ticket with replies ────────────────────────
// // exports.getTicket = async (req, res) => {
// //     try {
// //         const { id } = req.params;
// //         const ticket = await supportTicketService.getTicketById(id);
        
// //         if (!ticket) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: 'Ticket not found'
// //             });
// //         }
        
// //         return res.status(200).json({
// //             success: true,
// //             data: ticket
// //         });
// //     } catch (error) {
// //         logger.error('Error getting ticket:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to fetch ticket'
// //         });
// //     }
// // };

// // // ─── Reply to a ticket ────────────────────────────────────────
// // exports.replyToTicket = async (req, res) => {
// //     try {
// //         const { id } = req.params;
// //         const { message, is_internal = false } = req.body;
// //         const adminId = req.userId;

// //         if (!message || message.trim() === '') {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Reply message is required'
// //             });
// //         }

// //         const ticket = await supportTicketService.getTicketById(id);
// //         if (!ticket) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: 'Ticket not found'
// //             });
// //         }

// //         const adminEmail = req.user?.email || req.userEmail || process.env.SUPERADMIN_GMAIL_EMAIL || 'admin@system.com';
// //         const adminName = req.user?.name || req.userName || 'Admin';

// //         // ✅ Save admin reply (plain text, not HTML)
// //         const cleanMessage = message.trim();
// //         const reply = await supportTicketService.addReply({
// //             ticket_id: id,
// //             reply_type: 'admin',
// //             sender_email: adminEmail,
// //             sender_name: adminName,
// //             message: cleanMessage,
// //             is_internal: is_internal
// //         });

// //         if (!['resolved', 'closed'].includes(ticket.status)) {
// //             await supportTicketService.updateStatus(id, 'in_progress');
// //         }

// //         if (!is_internal) {
// //             // ✅ Get clean frontend URL
// //             const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
            
// //             const subject = `Re: ${ticket.subject} [${ticket.ticket_number}]`;
// //             const html = `
// //                 <html>
// //                 <body>
// //                     <p>Hello ${ticket.user_name || 'User'},</p>
// //                     <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
// //                         <p>${cleanMessage.replace(/\n/g, '<br>')}</p>
// //                     </div>
// //                     <p>Reply to this email to continue the conversation.</p>
// //                     <hr>
// //                     <p style="color:#6c757d;font-size:12px;">
// //                         Ticket #${ticket.ticket_number} | 
// //                         <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
// //                     </p>
// //                 </body>
// //                 </html>
// //             `;

// //             // ✅ Send email with proper threading
// //             const emailResult = await supportEmailService.sendEmailReply({
// //                 to: ticket.user_email,
// //                 subject,
// //                 html,
// //                 inReplyToMessageId: ticket.email_rfc_message_id,
// //                 referencesChain: ticket.email_references,
// //                 threadId: ticket.gmail_thread_id,
// //                 ticketNumber: ticket.ticket_number
// //             });

// //             // ✅ Save email info
// //             if (emailResult) {
// //                 await supportTicketService.updateTicketEmailInfo(ticket.id, {
// //                     gmailApiMessageId: emailResult.gmailApiMessageId,
// //                     rfcMessageId: emailResult.rfcMessageId,
// //                     references: emailResult.references,
// //                     gmailThreadId: emailResult.threadId
// //                 });
// //             }

// //             // ✅ IMPORTANT: Mark as processed to prevent duplicate sync
// //             if (emailResult && emailResult.gmailApiMessageId) {
// //                 await supportTicketService.markEmailProcessed(
// //                     emailResult.gmailApiMessageId, 
// //                     ticket.id
// //                 );
// //                 logger.info(`✅ Marked sent email as processed: ${emailResult.gmailApiMessageId}`);
// //             }

// //             logger.info(`✅ Admin reply sent to ${ticket.user_email} for ticket ${ticket.ticket_number}`);
// //         }

// //         return res.status(200).json({
// //             success: true,
// //             message: 'Reply sent successfully',
// //             data: reply
// //         });

// //     } catch (error) {
// //         logger.error('Error replying to ticket:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to send reply',
// //             error: error.message
// //         });
// //     }
// // };

// // // ─── Update ticket status ─────────────────────────────────────
// // exports.updateTicketStatus = async (req, res) => {
// //     try {
// //         const { id } = req.params;
// //         const { status } = req.body;

// //         const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
// //         if (!validStatuses.includes(status)) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Invalid status. Allowed: pending, in_progress, resolved, closed'
// //             });
// //         }

// //         const ticket = await supportTicketService.updateStatus(id, status);
// //         if (!ticket) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: 'Ticket not found'
// //             });
// //         }

// //         // If resolved, send resolution email
// //         if (status === 'resolved') {
// //             const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
// //             const subject = `Your ticket has been resolved [${ticket.ticket_number}]`;
// //             const html = `
// //                 <html>
// //                 <body>
// //                     <p>Hello ${ticket.user_name || 'User'},</p>
// //                     <p>Your ticket "<strong>${ticket.subject}</strong>" has been marked as resolved.</p>
// //                     <p>If you are not satisfied, simply reply to this email and we will reopen it.</p>
// //                     <hr>
// //                     <p style="color:#6c757d;font-size:12px;">
// //                         Ticket #${ticket.ticket_number} | 
// //                         <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
// //                     </p>
// //                 </body>
// //                 </html>
// //             `;
            
// //             const emailResult = await supportEmailService.sendEmailReply({
// //                 to: ticket.user_email,
// //                 subject,
// //                 html,
// //                 inReplyToMessageId: ticket.email_rfc_message_id,
// //                 referencesChain: ticket.email_references,
// //                 threadId: ticket.gmail_thread_id,
// //                 ticketNumber: ticket.ticket_number
// //             });

// //             if (emailResult && emailResult.gmailApiMessageId) {
// //                 await supportTicketService.markEmailProcessed(emailResult.gmailApiMessageId, ticket.id);
// //             }
            
// //             logger.info(`✅ Resolution email sent for ticket ${ticket.ticket_number}`);
// //         }

// //         return res.status(200).json({
// //             success: true,
// //             message: `Ticket status updated to ${status}`,
// //             data: ticket
// //         });

// //     } catch (error) {
// //         logger.error('Error updating ticket status:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to update status'
// //         });
// //     }
// // };

// // // ─── Update ticket priority ──────────────────────────────────
// // exports.updateTicketPriority = async (req, res) => {
// //     try {
// //         const { id } = req.params;
// //         const { priority } = req.body;

// //         const valid = ['low', 'medium', 'high'];
// //         if (!valid.includes(priority)) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Invalid priority. Allowed: low, medium, high'
// //             });
// //         }

// //         const ticket = await supportTicketService.updatePriority(id, priority);
// //         if (!ticket) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: 'Ticket not found'
// //             });
// //         }

// //         return res.status(200).json({
// //             success: true,
// //             message: `Ticket priority updated to ${priority}`,
// //             data: ticket
// //         });

// //     } catch (error) {
// //         logger.error('Error updating ticket priority:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to update priority'
// //         });
// //     }
// // };

// // // ─── Assign ticket to admin ──────────────────────────────────
// // exports.assignTicket = async (req, res) => {
// //     try {
// //         const { id } = req.params;
// //         const { admin_id } = req.body;

// //         if (!admin_id) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'admin_id is required'
// //             });
// //         }

// //         const ticket = await supportTicketService.assignTicket(id, admin_id);
// //         if (!ticket) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: 'Ticket not found'
// //             });
// //         }

// //         return res.status(200).json({
// //             success: true,
// //             message: 'Ticket assigned successfully',
// //             data: ticket
// //         });

// //     } catch (error) {
// //         logger.error('Error assigning ticket:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to assign ticket'
// //         });
// //     }
// // };

// // // ─── Get statistics ──────────────────────────────────────────
// // exports.getStats = async (req, res) => {
// //     try {
// //         const stats = await supportTicketService.getStats();
// //         return res.status(200).json({
// //             success: true,
// //             data: stats
// //         });
// //     } catch (error) {
// //         logger.error('Error getting stats:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to fetch stats'
// //         });
// //     }
// // };

// // // ─── Get dashboard stats ─────────────────────────────────────
// // exports.getDashboardStats = async (req, res) => {
// //     try {
// //         const stats = await supportTicketService.getDashboardStats();
// //         return res.status(200).json({
// //             success: true,
// //             data: stats
// //         });
// //     } catch (error) {
// //         logger.error('Error getting dashboard stats:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to fetch dashboard stats'
// //         });
// //     }
// // };

// // // ─── Manual sync trigger ─────────────────────────────────────
// // exports.manualSync = async (req, res) => {
// //     try {
// //         const emailSyncService = require('../services/emailSyncService');
// //         await emailSyncService.sync();
// //         return res.status(200).json({
// //             success: true,
// //             message: 'Manual sync completed'
// //         });
// //     } catch (error) {
// //         logger.error('Error during manual sync:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Manual sync failed',
// //             error: error.message
// //         });
// //     }
// // };

// // // ─── Manual sync sent emails ─────────────────────────────────
// // exports.manualSyncSent = async (req, res) => {
// //     try {
// //         const emailSyncService = require('../services/emailSyncService');
// //         await emailSyncService.syncSentEmails();
// //         return res.status(200).json({
// //             success: true,
// //             message: 'Sent emails sync completed'
// //         });
// //     } catch (error) {
// //         logger.error('Error during sent emails sync:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Sent emails sync failed'
// //         });
// //     }
// // };


// // controllers/supportTicketController.js
// const supportTicketService = require('../services/supportTicketService');
// const supportEmailService = require('../services/supportEmailService');
// const logger = require('../utils/logger');

// // ─── List all tickets (with filters) ──────────────────────────
// exports.listTickets = async (req, res) => {
//     try {
//         const { 
//             status, 
//             priority, 
//             search, 
//             source,
//             page = 1, 
//             limit = 20 
//         } = req.query;
        
//         const offset = (parseInt(page) - 1) * parseInt(limit);

//         const result = await supportTicketService.listTickets({
//             status,
//             priority,
//             search,
//             source,
//             limit: parseInt(limit),
//             offset
//         });

//         return res.status(200).json({
//             success: true,
//             data: result.data,
//             pagination: result.pagination
//         });
        
//     } catch (error) {
//         logger.error('Error listing tickets:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch tickets',
//             error: error.message
//         });
//     }
// };

// // ─── Get a single ticket with replies ────────────────────────
// exports.getTicket = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const ticket = await supportTicketService.getTicketById(id);
        
//         if (!ticket) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Ticket not found'
//             });
//         }
        
//         return res.status(200).json({
//             success: true,
//             data: ticket
//         });
//     } catch (error) {
//         logger.error('Error getting ticket:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch ticket'
//         });
//     }
// };

// // ─── Reply to a ticket ────────────────────────────────────────
// exports.replyToTicket = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { message, is_internal = false } = req.body;
//         const adminId = req.userId;

//         if (!message || message.trim() === '') {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Reply message is required'
//             });
//         }

//         const ticket = await supportTicketService.getTicketById(id);
//         if (!ticket) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Ticket not found'
//             });
//         }

//         const adminEmail = req.user?.email || req.userEmail || process.env.SUPERADMIN_GMAIL_EMAIL || 'admin@system.com';
//         const adminName = req.user?.name || req.userName || 'Admin';

//         // ✅ Save admin reply (plain text, not HTML)
//         const cleanMessage = message.trim();
//         const reply = await supportTicketService.addReply({
//             ticket_id: id,
//             reply_type: 'admin',
//             sender_email: adminEmail,
//             sender_name: adminName,
//             message: cleanMessage,
//             is_internal: is_internal
//         });

//         if (!['resolved', 'closed'].includes(ticket.status)) {
//             await supportTicketService.updateStatus(id, 'in_progress');
//         }

//         if (!is_internal) {
//             // ✅ Get clean frontend URL
//             const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';

//             // ✅ FIX: subject must normalize (after stripping "Re: ") to the
//             // exact same subject as the ticket's root email. No "[TICKET-XXX]"
//             // bracket — Gmail requires matching subjects to group into one thread.
//             const subject = `Re: ${ticket.subject}`;

//             const html = `
//                 <html>
//                 <body>
//                     <p>Hello ${ticket.user_name || 'User'},</p>
//                     <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
//                         <p>${cleanMessage.replace(/\n/g, '<br>')}</p>
//                     </div>
//                     <p>Reply to this email to continue the conversation.</p>
//                     <hr>
//                     <p style="color:#6c757d;font-size:12px;">
//                         Ticket #${ticket.ticket_number} | 
//                         <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
//                     </p>
//                 </body>
//                 </html>
//             `;

//             // ✅ Send email with proper threading
//             const emailResult = await supportEmailService.sendEmailReply({
//                 to: ticket.user_email,
//                 subject,
//                 html,
//                 inReplyToMessageId: ticket.email_rfc_message_id,
//                 referencesChain: ticket.email_references,
//                 threadId: ticket.gmail_thread_id,
//                 ticketNumber: ticket.ticket_number
//             });

//             // ✅ Save email info
//             if (emailResult) {
//                 await supportTicketService.updateTicketEmailInfo(ticket.id, {
//                     gmailApiMessageId: emailResult.gmailApiMessageId,
//                     rfcMessageId: emailResult.rfcMessageId,
//                     references: emailResult.references,
//                     gmailThreadId: emailResult.threadId
//                 });
//             }

//             // ✅ IMPORTANT: Mark as processed to prevent duplicate sync
//             if (emailResult && emailResult.gmailApiMessageId) {
//                 await supportTicketService.markEmailProcessed(
//                     emailResult.gmailApiMessageId, 
//                     ticket.id
//                 );
//                 logger.info(`✅ Marked sent email as processed: ${emailResult.gmailApiMessageId}`);
//             }

//             logger.info(`✅ Admin reply sent to ${ticket.user_email} for ticket ${ticket.ticket_number}`);
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'Reply sent successfully',
//             data: reply
//         });

//     } catch (error) {
//         logger.error('Error replying to ticket:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to send reply',
//             error: error.message
//         });
//     }
// };

// // ─── Update ticket status ─────────────────────────────────────
// exports.updateTicketStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { status } = req.body;

//         const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
//         if (!validStatuses.includes(status)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid status. Allowed: pending, in_progress, resolved, closed'
//             });
//         }

//         const ticket = await supportTicketService.updateStatus(id, status);
//         if (!ticket) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Ticket not found'
//             });
//         }

//         // If resolved, send resolution email
//         if (status === 'resolved') {
//             const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';

//             // ✅ FIX: same normalized subject as every other email on this ticket
//             const subject = `Re: ${ticket.subject}`;

//             const html = `
//                 <html>
//                 <body>
//                     <p>Hello ${ticket.user_name || 'User'},</p>
//                     <p>Your ticket "<strong>${ticket.subject}</strong>" has been marked as resolved.</p>
//                     <p>If you are not satisfied, simply reply to this email and we will reopen it.</p>
//                     <hr>
//                     <p style="color:#6c757d;font-size:12px;">
//                         Ticket #${ticket.ticket_number} | 
//                         <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
//                     </p>
//                 </body>
//                 </html>
//             `;
            
//             const emailResult = await supportEmailService.sendEmailReply({
//                 to: ticket.user_email,
//                 subject,
//                 html,
//                 inReplyToMessageId: ticket.email_rfc_message_id,
//                 referencesChain: ticket.email_references,
//                 threadId: ticket.gmail_thread_id,
//                 ticketNumber: ticket.ticket_number
//             });

//             if (emailResult && emailResult.gmailApiMessageId) {
//                 await supportTicketService.markEmailProcessed(emailResult.gmailApiMessageId, ticket.id);
//             }
            
//             logger.info(`✅ Resolution email sent for ticket ${ticket.ticket_number}`);
//         }

//         return res.status(200).json({
//             success: true,
//             message: `Ticket status updated to ${status}`,
//             data: ticket
//         });

//     } catch (error) {
//         logger.error('Error updating ticket status:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to update status'
//         });
//     }
// };

// // ─── Update ticket priority ──────────────────────────────────
// exports.updateTicketPriority = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { priority } = req.body;

//         const valid = ['low', 'medium', 'high'];
//         if (!valid.includes(priority)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid priority. Allowed: low, medium, high'
//             });
//         }

//         const ticket = await supportTicketService.updatePriority(id, priority);
//         if (!ticket) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Ticket not found'
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: `Ticket priority updated to ${priority}`,
//             data: ticket
//         });

//     } catch (error) {
//         logger.error('Error updating ticket priority:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to update priority'
//         });
//     }
// };

// // ─── Assign ticket to admin ──────────────────────────────────
// exports.assignTicket = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { admin_id } = req.body;

//         if (!admin_id) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'admin_id is required'
//             });
//         }

//         const ticket = await supportTicketService.assignTicket(id, admin_id);
//         if (!ticket) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Ticket not found'
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'Ticket assigned successfully',
//             data: ticket
//         });

//     } catch (error) {
//         logger.error('Error assigning ticket:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to assign ticket'
//         });
//     }
// };

// // ─── Get statistics ──────────────────────────────────────────
// exports.getStats = async (req, res) => {
//     try {
//         const stats = await supportTicketService.getStats();
//         return res.status(200).json({
//             success: true,
//             data: stats
//         });
//     } catch (error) {
//         logger.error('Error getting stats:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch stats'
//         });
//     }
// };

// // ─── Get dashboard stats ─────────────────────────────────────
// exports.getDashboardStats = async (req, res) => {
//     try {
//         const stats = await supportTicketService.getDashboardStats();
//         return res.status(200).json({
//             success: true,
//             data: stats
//         });
//     } catch (error) {
//         logger.error('Error getting dashboard stats:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch dashboard stats'
//         });
//     }
// };

// // ─── Manual sync trigger ─────────────────────────────────────
// exports.manualSync = async (req, res) => {
//     try {
//         const emailSyncService = require('../services/emailSyncService');
//         await emailSyncService.sync();
//         return res.status(200).json({
//             success: true,
//             message: 'Manual sync completed'
//         });
//     } catch (error) {
//         logger.error('Error during manual sync:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Manual sync failed',
//             error: error.message
//         });
//     }
// };

// // ─── Manual sync sent emails ─────────────────────────────────
// exports.manualSyncSent = async (req, res) => {
//     try {
//         const emailSyncService = require('../services/emailSyncService');
//         await emailSyncService.syncSentEmails();
//         return res.status(200).json({
//             success: true,
//             message: 'Sent emails sync completed'
//         });
//     } catch (error) {
//         logger.error('Error during sent emails sync:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Sent emails sync failed'
//         });
//     }
// };

// controllers/supportTicketController.js
const supportTicketService = require('../services/supportTicketService');
const supportEmailService = require('../services/supportEmailService');
const logger = require('../utils/logger');

// ✅ NEW: strips any "[TICKET-XXXXXXXX-XXXX]" tag(s) that may already be
// embedded in a stored subject from before the subject-consistency fix,
// so replies don't keep re-stacking brackets/prefixes forever.
function cleanSubject(subject) {
    if (!subject) return subject;
    return subject
        .replace(/\s*\[TICKET-\d{8}-\d{4}\]\s*/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ─── List all tickets (with filters) ──────────────────────────
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

// ─── Get a single ticket with replies ────────────────────────
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

        // ✅ multipart fields are always strings — coerce properly
        const isInternalBool = is_internal === true || is_internal === 'true';

        // ✅ allow attachment-only replies with no text
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
        const reply = await supportTicketService.addReply({
            ticket_id: id,
            reply_type: 'admin',
            sender_email: adminEmail,
            sender_name: adminName,
            message: cleanMessage,
            is_internal: isInternalBool
        });

        // ✅ NEW: persist each uploaded file against this reply
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

        if (!isInternalBool) {
            const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
            const baseSubject = cleanSubject(ticket.subject);
            const subject = baseSubject.toLowerCase().startsWith('re:')
                ? baseSubject
                : `Re: ${baseSubject}`;

            // ✅ include download links for any attachments in the outgoing email
            const attachmentsHtml = savedAttachments.length > 0
                ? `<div style="margin-top:10px;">
                     <strong>Attachments:</strong>
                     <ul>${savedAttachments.map(a => `<li><a href="${a.download_url}">${a.filename}</a></li>`).join('')}</ul>
                   </div>`
                : '';

            const html = `
                <html>
                <body>
                    <p>Hello ${ticket.user_name || 'User'},</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
                        <p>${cleanMessage.replace(/\n/g, '<br>')}</p>
                        ${attachmentsHtml}
                    </div>
                    <p>Reply to this email to continue the conversation.</p>
                    <hr>
                    <p style="color:#6c757d;font-size:12px;">
                        Ticket #${ticket.ticket_number} | 
                        <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
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

            if (emailResult) {
                await supportTicketService.updateTicketEmailInfo(ticket.id, {
                    gmailApiMessageId: emailResult.gmailApiMessageId,
                    rfcMessageId: emailResult.rfcMessageId,
                    references: emailResult.references,
                    gmailThreadId: emailResult.threadId
                });
            }

            if (emailResult && emailResult.gmailApiMessageId) {
                await supportTicketService.markEmailProcessed(emailResult.gmailApiMessageId, ticket.id);
                logger.info(`✅ Marked sent email as processed: ${emailResult.gmailApiMessageId}`);
            }

            logger.info(`✅ Admin reply sent to ${ticket.user_email} for ticket ${ticket.ticket_number}`);
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

// ─── Update ticket status ─────────────────────────────────────
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
                        <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
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
                await supportTicketService.markEmailProcessed(emailResult.gmailApiMessageId, ticket.id);
            }
            
            logger.info(`✅ Resolution email sent for ticket ${ticket.ticket_number}`);
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

// ─── Update ticket priority ──────────────────────────────────
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

// ─── Assign ticket to admin ──────────────────────────────────
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

// ─── Get statistics ──────────────────────────────────────────
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

// ─── Get dashboard stats ─────────────────────────────────────
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

// ─── Manual sync trigger ─────────────────────────────────────
exports.manualSync = async (req, res) => {
    try {
        const emailSyncService = require('../services/emailSyncService');
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

// ─── Manual sync sent emails ─────────────────────────────────
exports.manualSyncSent = async (req, res) => {
    try {
        const emailSyncService = require('../services/emailSyncService');
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

// ─── Manually trigger / renew Gmail push watch ────────────────
exports.startGmailWatch = async (req, res) => {
    try {
        const emailSyncService = require('../services/emailSyncService');
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
    // Ack immediately — Pub/Sub retries aggressively on slow/failed responses.
    res.status(200).send('OK');

    try {
        const message = req.body?.message;
        if (!message?.data) {
            logger.warn('⚠️ Gmail webhook called with no message.data');
            return;
        }

        const decoded = Buffer.from(message.data, 'base64').toString('utf-8');
        const { historyId, emailAddress } = JSON.parse(decoded);

        logger.info(`📬 Gmail push notification: historyId=${historyId} for ${emailAddress}`);

        const settingsService = require('../services/settingsService');
        const lastHistoryId = await settingsService.get('gmail_last_history_id');

        if (!lastHistoryId) {
            logger.warn('⚠️ No stored gmail_last_history_id — storing current one, skipping this diff');
            await settingsService.set('gmail_last_history_id', String(historyId));
            return;
        }

        const emailSyncService = require('../services/emailSyncService');
        const result = await emailSyncService.processHistorySince(lastHistoryId);

        // ✅ NEW: notify connected dashboards that something changed
        const io = req.app.get('io');
        if (io && result?.touchedTicketIds?.length > 0) {
            io.emit('tickets:updated', { ticketIds: result.touchedTicketIds });
            logger.info(`📡 Emitted tickets:updated for [${result.touchedTicketIds.join(', ')}]`);
        }

        await settingsService.set('gmail_last_history_id', String(historyId));

    } catch (error) {
        logger.error('❌ Error processing Gmail webhook:', error);
    }
};