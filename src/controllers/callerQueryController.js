const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

/**
 * POST /api/caller-query
 * Save a caller's query with phone, email, and hospital_id
 */
exports.createCallerQuery = async (req, res) => {
    try {
        const { hospital_id, phone, email, query } = req.body;

        // Validate required fields
        if (!hospital_id) {
            return res.status(400).json({
                success: false,
                error: 'hospital_id is required'
            });
        }
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'query is required'
            });
        }

        const hospitalId = parseInt(hospital_id, 10);
        if (isNaN(hospitalId)) {
            return res.status(400).json({
                success: false,
                error: 'hospital_id must be a valid number'
            });
        }

        const insertQuery = `
            INSERT INTO caller_query (hospital_id, phone, email, query, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id, hospital_id, phone, email, query, created_at, updated_at
        `;
        const values = [hospitalId, phone || null, email || null, query];
        const result = await executeQuery(insertQuery, values);
        const newRecord = result.rows[0];

        return res.status(201).json({
            success: true,
            data: {
                id: newRecord.id,
                hospital_id: newRecord.hospital_id,
                phone: newRecord.phone,
                email: newRecord.email,
                query: newRecord.query,
                created_at: newRecord.created_at,
                updated_at: newRecord.updated_at
            }
        });
    } catch (error) {
        logger.error(`Error in createCallerQuery: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * GET /api/caller-query
 * Get all queries (optional filters: hospital_id, phone, email, date range)
 */
exports.getCallerQueries = async (req, res) => {
    try {
        const { hospital_id, phone, email, startDate, endDate } = req.query;
        let conditions = [];
        let values = [];
        let idx = 1;

        if (hospital_id) {
            const hospitalId = parseInt(hospital_id, 10);
            if (!isNaN(hospitalId)) {
                conditions.push(`hospital_id = $${idx++}`);
                values.push(hospitalId);
            }
        }
        if (phone) {
            conditions.push(`phone = $${idx++}`);
            values.push(phone);
        }
        if (email) {
            conditions.push(`email = $${idx++}`);
            values.push(email);
        }
        if (startDate) {
            conditions.push(`created_at >= $${idx++}`);
            values.push(startDate);
        }
        if (endDate) {
            conditions.push(`created_at <= $${idx++}`);
            values.push(endDate);
        }

        let query = `
            SELECT id, hospital_id, phone, email, query, created_at, updated_at 
            FROM caller_query
        `;
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';

        const result = await executeQuery(query, values);
        return res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error(`Error in getCallerQueries: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * GET /api/caller-query/:id
 * Get a specific query by ID
 */
exports.getCallerQueryById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT id, hospital_id, phone, email, query, created_at, updated_at 
            FROM caller_query 
            WHERE id = $1
        `;
        const result = await executeQuery(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Query not found'
            });
        }
        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error(`Error in getCallerQueryById: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * DELETE /api/caller-query/:id
 * Delete a query by ID
 */
exports.deleteCallerQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `DELETE FROM caller_query WHERE id = $1 RETURNING id`;
        const result = await executeQuery(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Query not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Query deleted successfully',
            data: { id: result.rows[0].id }
        });
    } catch (error) {
        logger.error(`Error in deleteCallerQuery: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};