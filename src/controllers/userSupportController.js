// // // const supportTicketService = require('../services/supportTicketService');
// // // const supportEmailService = require('../services/supportEmailService');
// // // const logger = require('../utils/logger');

// // // // ─── Submit a new query (public) ────────────────────────────
// // // exports.submitQuery = async (req, res) => {
// // //     try {
// // //         const { name, email, phone, subject, message } = req.body;

// // //         if (!name || !email || !subject || !message) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 message: 'Name, email, subject, and message are required'
// // //             });
// // //         }

// // //         // Create ticket
// // //         const ticket = await supportTicketService.createTicket({
// // //             user_email: email,
// // //             user_name: name,
// // //             user_phone: phone || null,
// // //             subject: subject,
// // //             message: message,
// // //             source: 'web_form',
// // //             priority: 'medium'
// // //         });

// // //         // ✅ Send confirmation email - DO NOT save as reply
// // //         const confirmSubject = `We received your query: ${ticket.ticket_number}`;
// // //         const confirmHtml = `
// // //             <html>
// // //             <body>
// // //                 <h2>Hello ${name},</h2>
// // //                 <p>Thank you for contacting us. We have received your query and will get back to you shortly.</p>
// // //                 <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
// // //                     <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
// // //                     <p><strong>Subject:</strong> ${subject}</p>
// // //                     <p><strong>Message:</strong> ${message}</p>
// // //                 </div>
// // //                 <p>You can reply to this email to add more information.</p>
// // //                 <hr>
// // //                 <p style="color:#6c757d;font-size:12px;">This is an automated message from our support system.</p>
// // //             </body>
// // //             </html>
// // //         `;
        
// // //         // ✅ Send email and capture info for threading
// // //         const emailResult = await supportEmailService.sendEmailReply({
// // //             to: email,
// // //             subject: confirmSubject,
// // //             html: confirmHtml,
// // //             ticketNumber: ticket.ticket_number
// // //         });

// // //         // ✅ Only store email info, NOT as a reply
// // //         if (emailResult) {
// // //             await supportTicketService.updateTicketEmailInfo(ticket.id, {
// // //                 gmailApiMessageId: emailResult.gmailApiMessageId,
// // //                 rfcMessageId: emailResult.rfcMessageId,
// // //                 references: null,
// // //                 gmailThreadId: emailResult.threadId
// // //             });
// // //         }

// // //         // Save to contact_queries (backward compatibility)
// // //         await saveToContactQueries({
// // //             name,
// // //             email,
// // //             phone: phone || null,
// // //             message,
// // //             status: 'new'
// // //         });

// // //         logger.info(`✅ New ticket ${ticket.ticket_number} created from contact form by ${email}`);

// // //         return res.status(201).json({
// // //             success: true,
// // //             message: 'Query submitted successfully. We will get back to you soon.',
// // //             data: { 
// // //                 ticket_number: ticket.ticket_number,
// // //                 ticket_id: ticket.id
// // //             }
// // //         });

// // //     } catch (error) {
// // //         logger.error('Error submitting query:', error);
// // //         return res.status(500).json({
// // //             success: false,
// // //             message: 'Failed to submit query',
// // //             error: error.message
// // //         });
// // //     }
// // // };

// // // // ─── Helper function to save to contact_queries ─────────────
// // // async function saveToContactQueries(data) {
// // //     await executeQuery(
// // //         `INSERT INTO contact_queries (name, email, phone, message, status, created_at, updated_at)
// // //          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
// // //         [data.name, data.email, data.phone, data.message, data.status]
// // //     );
// // // }


// // // // Helper function to save to contact_queries (backward compatibility)




// // // controllers/userSupportController.js
// // const supportTicketService = require('../services/supportTicketService');
// // const supportEmailService = require('../services/supportEmailService');
// // const { executeQuery } = require('../config/database');
// // const logger = require('../utils/logger');

// // exports.submitQuery = async (req, res) => {
// //     try {
// //         const { name, email, phone, subject, message } = req.body;

// //         if (!name || !email || !subject || !message) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: 'Name, email, subject, and message are required'
// //             });
// //         }

// //         const ticket = await supportTicketService.createTicket({
// //             user_email: email,
// //             user_name: name,
// //             user_phone: phone || null,
// //             subject: subject,
// //             message: message,
// //             source: 'web_form',
// //             priority: 'medium'
// //         });

// //         const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
// //         const confirmSubject = `We received your query: ${ticket.ticket_number}`;
// //         const confirmHtml = `
// //             <html>
// //             <body>
// //                 <h2>Hello ${name},</h2>
// //                 <p>Thank you for contacting us. We have received your query and will get back to you shortly.</p>
// //                 <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
// //                     <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
// //                     <p><strong>Subject:</strong> ${subject}</p>
// //                     <p><strong>Message:</strong> ${message}</p>
// //                 </div>
// //                 <p>You can reply to this email to add more information.</p>
// //                 <hr>
// //                 <p style="color:#6c757d;font-size:12px;">
// //                     Ticket #${ticket.ticket_number} | 
// //                     <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
// //                 </p>
// //             </body>
// //             </html>
// //         `;
        
// //         const emailResult = await supportEmailService.sendEmailReply({
// //             to: email,
// //             subject: confirmSubject,
// //             html: confirmHtml,
// //             ticketNumber: ticket.ticket_number
// //         });

// //         if (emailResult) {
// //             await supportTicketService.updateTicketEmailInfo(ticket.id, {
// //                 gmailApiMessageId: emailResult.gmailApiMessageId,
// //                 rfcMessageId: emailResult.rfcMessageId,
// //                 references: null,
// //                 gmailThreadId: emailResult.threadId
// //             });
// //         }

// //         await saveToContactQueries({
// //             name,
// //             email,
// //             phone: phone || null,
// //             message,
// //             status: 'new'
// //         });

// //         logger.info(`✅ New ticket ${ticket.ticket_number} created from contact form by ${email}`);

// //         return res.status(201).json({
// //             success: true,
// //             message: 'Query submitted successfully. We will get back to you soon.',
// //             data: { 
// //                 ticket_number: ticket.ticket_number,
// //                 ticket_id: ticket.id
// //             }
// //         });

// //     } catch (error) {
// //         logger.error('Error submitting query:', error);
// //         return res.status(500).json({
// //             success: false,
// //             message: 'Failed to submit query',
// //             error: error.message
// //         });
// //     }
// // };

// // async function saveToContactQueries(data) {
// //     await executeQuery(
// //         `INSERT INTO contact_queries (name, email, phone, message, status, created_at, updated_at)
// //          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
// //         [data.name, data.email, data.phone, data.message, data.status]
// //     );
// // }


// // controllers/userSupportController.js
// const supportTicketService = require('../services/supportTicketService');
// const supportEmailService = require('../services/supportEmailService');
// const { executeQuery } = require('../config/database');
// const logger = require('../utils/logger');

// exports.submitQuery = async (req, res) => {
//     try {
//         const { name, email, phone, subject, message } = req.body;

//         if (!name || !email || !subject || !message) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Name, email, subject, and message are required'
//             });
//         }

//         const ticket = await supportTicketService.createTicket({
//             user_email: email,
//             user_name: name,
//             user_phone: phone || null,
//             subject: subject,
//             message: message,
//             source: 'web_form',
//             priority: 'medium'
//         });

//         const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';

//         // ✅ FIX: subject must be the plain, unmodified subject — this is the
//         // "root" message of the thread. Every later email (dashboard reply,
//         // resolution notice) normalizes to "Re: " + this exact subject, so
//         // Gmail can group them into one conversation. Do NOT prepend/append
//         // anything here (no "We received your query:", no "[TICKET-XXX]").
//         const confirmSubject = subject;

//         const confirmHtml = `
//             <html>
//             <body>
//                 <h2>Hello ${name},</h2>
//                 <p>Thank you for contacting us. We have received your query and will get back to you shortly.</p>
//                 <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
//                     <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
//                     <p><strong>Subject:</strong> ${subject}</p>
//                     <p><strong>Message:</strong> ${message}</p>
//                 </div>
//                 <p>You can reply to this email to add more information.</p>
//                 <hr>
//                 <p style="color:#6c757d;font-size:12px;">
//                     Ticket #${ticket.ticket_number} | 
//                     <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
//                 </p>
//             </body>
//             </html>
//         `;
        
//         const emailResult = await supportEmailService.sendEmailReply({
//             to: email,
//             subject: confirmSubject,
//             html: confirmHtml,
//             ticketNumber: ticket.ticket_number
//         });

//         if (emailResult) {
//             await supportTicketService.updateTicketEmailInfo(ticket.id, {
//                 gmailApiMessageId: emailResult.gmailApiMessageId,
//                 rfcMessageId: emailResult.rfcMessageId,
//                 references: null,
//                 gmailThreadId: emailResult.threadId
//             });
//         }

//         await saveToContactQueries({
//             name,
//             email,
//             phone: phone || null,
//             message,
//             status: 'new'
//         });

//         logger.info(`✅ New ticket ${ticket.ticket_number} created from contact form by ${email}`);

//         return res.status(201).json({
//             success: true,
//             message: 'Query submitted successfully. We will get back to you soon.',
//             data: { 
//                 ticket_number: ticket.ticket_number,
//                 ticket_id: ticket.id
//             }
//         });

//     } catch (error) {
//         logger.error('Error submitting query:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to submit query',
//             error: error.message
//         });
//     }
// };

// async function saveToContactQueries(data) {
//     await executeQuery(
//         `INSERT INTO contact_queries (name, email, phone, message, status, created_at, updated_at)
//          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
//         [data.name, data.email, data.phone, data.message, data.status]
//     );
// }


// controllers/userSupportController.js
const supportTicketService = require('../services/supportTicketService');
const supportEmailService = require('../services/supportEmailService');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

exports.submitQuery = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, subject, and message are required'
            });
        }

        // ✅ NEW: guard against duplicate submissions (double-click, retry,
        // React StrictMode, etc.) hitting this endpoint twice in quick
        // succession with identical content.
        const existing = await supportTicketService.findRecentDuplicateTicket({
            user_email: email,
            subject,
            message
        });

        if (existing) {
            logger.warn(`⏭️ Duplicate webform submission blocked for ${email} (matches ${existing.ticket_number})`);
            return res.status(201).json({
                success: true,
                message: 'Query submitted successfully. We will get back to you soon.',
                data: {
                    ticket_number: existing.ticket_number,
                    ticket_id: existing.id
                }
            });
        }

        const ticket = await supportTicketService.createTicket({
            user_email: email,
            user_name: name,
            user_phone: phone || null,
            subject: subject,
            message: message,
            source: 'web_form',
            priority: 'medium'
        });

        const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';

        // ✅ FIX: subject must be the plain, unmodified subject — this is the
        // "root" message of the thread. Every later email (dashboard reply,
        // resolution notice) normalizes to "Re: " + this exact subject, so
        // Gmail can group them into one conversation. Do NOT prepend/append
        // anything here (no "We received your query:", no "[TICKET-XXX]").
        const confirmSubject = subject;

        const confirmHtml = `
            <html>
            <body>
                <h2>Hello ${name},</h2>
                <p>Thank you for contacting us. We have received your query and will get back to you shortly.</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
                    <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Message:</strong> ${message}</p>
                </div>
                <p>You can reply to this email to add more information.</p>
                <hr>
                <p style="color:#6c757d;font-size:12px;">
                    Ticket #${ticket.ticket_number} | 
                    <a href="${frontendUrl}/tickets/${ticket.id}">View in dashboard</a>
                </p>
            </body>
            </html>
        `;
        
        const emailResult = await supportEmailService.sendEmailReply({
            to: email,
            subject: confirmSubject,
            html: confirmHtml,
            ticketNumber: ticket.ticket_number
        });

        if (emailResult) {
            await supportTicketService.updateTicketEmailInfo(ticket.id, {
                gmailApiMessageId: emailResult.gmailApiMessageId,
                rfcMessageId: emailResult.rfcMessageId,
                references: null,
                gmailThreadId: emailResult.threadId
            });

            // ✅ FIX: mark this confirmation email as processed so the
            // periodic Gmail sync (syncSentEmails) doesn't re-ingest it
            // later as a spurious duplicate "admin reply" on the thread.
            // Without this, the confirmation you just sent shows up a
            // second time once the sync cron runs, because the subject
            // is now plain (no "We received your query" text) and no
            // longer trips isSystemEmail()'s pattern checks.
            if (emailResult.gmailApiMessageId) {
                await supportTicketService.markEmailProcessed(emailResult.gmailApiMessageId, ticket.id);
            }
        }

        await saveToContactQueries({
            name,
            email,
            phone: phone || null,
            message,
            status: 'new'
        });

        logger.info(`✅ New ticket ${ticket.ticket_number} created from contact form by ${email}`);

        return res.status(201).json({
            success: true,
            message: 'Query submitted successfully. We will get back to you soon.',
            data: { 
                ticket_number: ticket.ticket_number,
                ticket_id: ticket.id
            }
        });

    } catch (error) {
        logger.error('Error submitting query:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit query',
            error: error.message
        });
    }
};

async function saveToContactQueries(data) {
    await executeQuery(
        `INSERT INTO contact_queries (name, email, phone, message, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [data.name, data.email, data.phone, data.message, data.status]
    );
}