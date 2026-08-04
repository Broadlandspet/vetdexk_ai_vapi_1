
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class SupportTicketService {
    generateTicketNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `TICKET-${year}${month}${day}-${random}`;
    }

/**
 * ✅ NEW: Get attachments for a ticket
 */
async getAttachmentsByTicket(ticketId) {
    const result = await executeQuery(
        `SELECT * FROM support_attachments 
         WHERE ticket_id = $1 
         ORDER BY created_at DESC`,
        [ticketId]
    );
    return result.rows;
}

/**
 * ✅ UPDATED: Get ticket by ID with attachments
 */
async getTicketById(id) {
    const ticketResult = await executeQuery(
        `SELECT 
            t.*,
            (SELECT COUNT(*) FROM support_replies WHERE ticket_id = t.id) as reply_count,
            (SELECT COUNT(*) FROM support_attachments WHERE ticket_id = t.id) as attachment_count
         FROM support_tickets t
         WHERE t.id = $1`,
        [id]
    );
    
    if (ticketResult.rows.length === 0) return null;
    
    const ticket = ticketResult.rows[0];

    const repliesResult = await executeQuery(
        `SELECT * FROM support_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
        [id]
    );
    
    // Get attachments for each reply
    for (const reply of repliesResult.rows) {
        const attachmentsResult = await executeQuery(
            `SELECT * FROM support_attachments WHERE reply_id = $1 ORDER BY created_at ASC`,
            [reply.id]
        );
        reply.attachments = attachmentsResult.rows;
    }
    
    ticket.replies = repliesResult.rows;
    
    // Get ticket-level attachments
    const attachmentsResult = await executeQuery(
        `SELECT * FROM support_attachments WHERE ticket_id = $1 AND reply_id IS NULL ORDER BY created_at ASC`,
        [id]
    );
    ticket.attachments = attachmentsResult.rows;
    
    return ticket;
}





    async createTicket(data) {
        const {
            user_email,
            user_name,
            user_phone = null,
            subject,
            message,
            gmail_message_id = null,
            gmail_thread_id = null,
            email_rfc_message_id = null,
            email_references = null,
            priority = 'medium',
            assigned_to = null,
            source = 'web_form'
        } = data;

        const ticketNumber = this.generateTicketNumber();

        const result = await executeQuery(
            `INSERT INTO support_tickets 
             (ticket_number, user_email, user_name, user_phone, subject, message, 
              gmail_message_id, gmail_thread_id, email_rfc_message_id, email_references,
              priority, assigned_to, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [ticketNumber, user_email, user_name, user_phone, subject, message,
             gmail_message_id, gmail_thread_id, email_rfc_message_id, email_references,
             priority, assigned_to, source]
        );

        const ticket = result.rows[0];

        await this.addReply({
            ticket_id: ticket.id,
            reply_type: 'user',
            sender_email: user_email,
            sender_name: user_name || 'User',
            message: message,
            gmail_message_id: gmail_message_id,
            email_rfc_message_id: email_rfc_message_id
        });

        logger.info(`✅ Created ticket ${ticketNumber} for ${user_email}`);
        return ticket;
    }


/**
 * ✅ HARDENED: relies on UNIQUE constraint on gmail_message_id
 * as second line of defense against duplicates.
 */
async addReply(data) {
    const {
        ticket_id,
        reply_type,
        sender_email,
        sender_name,
        message,
        gmail_message_id = null,
        email_rfc_message_id = null,
        is_internal = false
    } = data;

    const result = await executeQuery(
        `INSERT INTO support_replies 
         (ticket_id, reply_type, sender_email, sender_name, message, gmail_message_id, email_rfc_message_id, is_internal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (gmail_message_id) DO NOTHING
         RETURNING *`,
        [ticket_id, reply_type, sender_email, sender_name, message, gmail_message_id, email_rfc_message_id, is_internal]
    );

    if (result.rows.length === 0) {
        if (gmail_message_id) {
            logger.warn(`⏭️ Duplicate reply blocked for gmail_message_id ${gmail_message_id} on ticket ${ticket_id}`);
            const existing = await executeQuery(
                `SELECT * FROM support_replies WHERE gmail_message_id = $1`,
                [gmail_message_id]
            );
            return existing.rows[0] || null;
        }
        logger.error(`❌ addReply insert returned no row for ticket ${ticket_id}`);
        return null;
    }

    await executeQuery(
        `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`,
        [ticket_id]
    );

    logger.info(`💬 Added ${reply_type} reply to ticket ${ticket_id}`);
    return result.rows[0];
}

    async updateTicketEmailInfo(ticketId, { gmailApiMessageId, rfcMessageId, references, gmailThreadId }) {
        try {
            const result = await executeQuery(
                `UPDATE support_tickets 
                 SET gmail_message_id = COALESCE($1, gmail_message_id),
                     email_rfc_message_id = COALESCE($2, email_rfc_message_id),
                     email_references = COALESCE($3, email_references),
                     gmail_thread_id = COALESCE($4, gmail_thread_id),
                     updated_at = NOW()
                 WHERE id = $5
                 RETURNING *`,
                [gmailApiMessageId, rfcMessageId, references, gmailThreadId, ticketId]
            );
            
            if (result.rows.length > 0) {
                logger.info(`📧 Updated ticket ${ticketId} with RFC Message-ID: ${rfcMessageId}`);
            }
            
            return result.rows[0] || null;
        } catch (error) {
            logger.error(`Error updating ticket ${ticketId} email info:`, error);
            throw error;
        }
    }

    async findTicketByThread(threadId) {
        if (!threadId) return null;
        const result = await executeQuery(
            `SELECT * FROM support_tickets WHERE gmail_thread_id = $1`,
            [threadId]
        );
        return result.rows[0] || null;
    }

    async findTicketByMessageId(messageId) {
        if (!messageId) return null;
        const result = await executeQuery(
            `SELECT t.* FROM support_tickets t
             LEFT JOIN support_replies r ON r.ticket_id = t.id
             WHERE t.gmail_message_id = $1 
                OR r.gmail_message_id = $1
                OR t.email_rfc_message_id = $1 
                OR r.email_rfc_message_id = $1
             LIMIT 1`,
            [messageId]
        );
        return result.rows[0] || null;
    }

    async findTicketByNumber(ticketNumber) {
        const result = await executeQuery(
            `SELECT * FROM support_tickets WHERE ticket_number = $1`,
            [ticketNumber]
        );
        return result.rows[0] || null;
    }

    async isEmailProcessed(messageId) {
        const result = await executeQuery(
            `SELECT 1 FROM processed_emails WHERE gmail_message_id = $1`,
            [messageId]
        );
        return result.rows.length > 0;
    }

    async markEmailProcessed(messageId, ticketId = null) {
        await executeQuery(
            `INSERT INTO processed_emails (gmail_message_id, ticket_id) VALUES ($1, $2)
             ON CONFLICT (gmail_message_id) DO NOTHING`,
            [messageId, ticketId]
        );
    }

    async findRecentDuplicateTicket({ user_email, subject, message, windowSeconds = 30 }) {
    const result = await executeQuery(
        `SELECT * FROM support_tickets
         WHERE user_email = $1
           AND subject = $2
           AND message = $3
           AND created_at >= NOW() - ($4 || ' seconds')::interval
         ORDER BY created_at DESC
         LIMIT 1`,
        [user_email, subject, message, windowSeconds]
    );
    return result.rows[0] || null;
}




async listTickets({ status, priority, search, assigned_to, source, limit = 20, offset = 0 }) {
    let whereClauses = [];
    let params = [];
    let paramCounter = 1;

    if (status && status !== 'all') {
        whereClauses.push(`status = $${paramCounter}`);
        params.push(status);
        paramCounter++;
    }
    if (priority && priority !== 'all') {
        whereClauses.push(`priority = $${paramCounter}`);
        params.push(priority);
        paramCounter++;
    }
    if (source && source !== 'all') {
        whereClauses.push(`source = $${paramCounter}`);
        params.push(source);
        paramCounter++;
    }
    if (assigned_to) {
        whereClauses.push(`assigned_to = $${paramCounter}`);
        params.push(assigned_to);
        paramCounter++;
    }
    if (search) {
        whereClauses.push(`(user_email ILIKE $${paramCounter} OR 
                           user_name ILIKE $${paramCounter} OR 
                           subject ILIKE $${paramCounter} OR 
                           ticket_number ILIKE $${paramCounter} OR
                           message ILIKE $${paramCounter})`);
        params.push(`%${search}%`);
        paramCounter++;
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await executeQuery(
        `SELECT COUNT(*) FROM support_tickets ${whereClause}`,
        params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);

    // 👇 THIS is the block you replace — same spot, just the extra attachment_count line added
    const result = await executeQuery(
        `SELECT 
            t.*,
            (SELECT COUNT(*) FROM support_replies WHERE ticket_id = t.id) as reply_count,
            (SELECT COUNT(*) FROM support_replies WHERE ticket_id = t.id AND reply_type = 'user') as user_reply_count,
            (SELECT COUNT(*) FROM support_replies WHERE ticket_id = t.id AND reply_type = 'admin') as admin_reply_count,
            (SELECT COUNT(*) FROM support_attachments WHERE ticket_id = t.id) as attachment_count
         FROM support_tickets t
         ${whereClause}
         ORDER BY 
            CASE t.status 
                WHEN 'pending' THEN 1
                WHEN 'in_progress' THEN 2
                WHEN 'resolved' THEN 3
                WHEN 'closed' THEN 4
            END,
            t.created_at DESC
         LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
        params
    );

    return {
        data: result.rows,
        pagination: { 
            total, 
            limit, 
            offset, 
            totalPages: Math.ceil(total / limit) 
        }
    };
}

    async updateStatus(ticketId, status) {
        const valid = ['pending', 'in_progress', 'resolved', 'closed'];
        if (!valid.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${valid.join(', ')}`);
        }

        const result = await executeQuery(
            `UPDATE support_tickets 
             SET status = $1::varchar(50), 
                 updated_at = NOW(), 
                 resolved_at = CASE 
                     WHEN $1::varchar = 'resolved' THEN NOW() 
                     ELSE resolved_at 
                 END
             WHERE id = $2::integer
             RETURNING *`,
            [status, ticketId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Ticket not found');
        }
        
        logger.info(`📝 Ticket ${ticketId} status updated to: ${status}`);
        return result.rows[0];
    }

    async assignTicket(ticketId, adminUserId) {
        const result = await executeQuery(
            `UPDATE support_tickets SET assigned_to = $1, updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [adminUserId, ticketId]
        );
        return result.rows[0] || null;
    }

    async updatePriority(ticketId, priority) {
        const valid = ['low', 'medium', 'high'];
        if (!valid.includes(priority)) {
            throw new Error(`Invalid priority. Must be one of: ${valid.join(', ')}`);
        }

        const result = await executeQuery(
            `UPDATE support_tickets SET priority = $1, updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [priority, ticketId]
        );
        return result.rows[0] || null;
    }

    async getStats() {
        const result = await executeQuery(
            `SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
                COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
                COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
                COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
                COUNT(CASE WHEN source = 'web_form' THEN 1 END) as from_web_form,
                COUNT(CASE WHEN source = 'email' THEN 1 END) as from_email,
                AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_seconds
             FROM support_tickets`
        );
        return result.rows[0];
    }

    async getDashboardStats() {
        const stats = await this.getStats();
        
        const recentResult = await executeQuery(
            `SELECT id, ticket_number, user_email, user_name, subject, status, source, created_at
             FROM support_tickets 
             ORDER BY created_at DESC 
             LIMIT 5`
        );
        stats.recent_tickets = recentResult.rows;

        const dailyResult = await executeQuery(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
             FROM support_tickets
             WHERE created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );
        stats.daily_tickets = dailyResult.rows;

        return stats;
    }

    async getTicketsByUser(userId, userEmail) {
        const params = [];
        let query = `SELECT * FROM support_tickets WHERE `;
        const conditions = [];
        
        if (userId) {
            conditions.push(`user_id = $${params.length + 1}`);
            params.push(userId);
        }
        if (userEmail) {
            conditions.push(`user_email = $${params.length + 1}`);
            params.push(userEmail);
        }
        
        if (conditions.length === 0) return [];
        
        query += conditions.join(' OR ') + ' ORDER BY created_at DESC';
        const result = await executeQuery(query, params);
        return result.rows;
    }
}





module.exports = new SupportTicketService();