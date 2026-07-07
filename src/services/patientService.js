

// ─── DEPENDENCIES ────────────────────────────────────────────────────────
const db = require('../config/database');
const logger = require('../utils/logger');

// ─── HELPERS ─────────────────────────────────────────────────────────────

/**
 * Normalize phone number format
 * Removes all non-digit characters except +, ensures + prefix
 */
function normalizePhone(phone) {
    if (!phone) return phone;
    
    let normalized = phone.replace(/[^\d+]/g, '');
    
    if (!normalized.startsWith('+')) {
        if (normalized.startsWith('1') && normalized.length === 11) {
            normalized = '+' + normalized;
        } else if (normalized.length === 10) {
            normalized = '+1' + normalized;
        } else {
            normalized = '+' + normalized;
        }
    }
    
    return normalized;
}

// ─── SERVICE FUNCTIONS ──────────────────────────────────────────────────

/**
 * Find patient by phone number (optionally filtered by hospital)
 */
exports.findByPhone = async (phone, hospitalId = null) => {
    try {
        const normalizedPhone = normalizePhone(phone);

        let query = `
            SELECT p.*, 
                (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'confirmed') as total_visits,
                (SELECT MAX(a.date) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'confirmed') as last_visit,
                (SELECT a.appointment_type FROM appointments a WHERE a.patient_id = p.id AND a.status = 'confirmed' ORDER BY a.date DESC LIMIT 1) as last_appointment_type
            FROM patients p
            WHERE p.phone = ?
        `;
        const params = [normalizedPhone];

        if (hospitalId) {
            query += ` AND p.hospital_id = ?`;
            params.push(hospitalId);
        }

        const [rows] = await db.execute(query, params);

        if (rows.length === 0) {
            return { found: false, patient: null };
        }

        const patient = rows[0];

        return {
            found: true,
            patient: {
                id: patient.id,
                name: patient.name,
                phone: patient.phone,
                email: patient.email,
                pet_name: patient.pet_name,
                pet_species: patient.pet_species,
                pet_breed: patient.pet_breed,
                pet_gender: patient.pet_gender,
                pet_age: patient.pet_age,
                last_visit: patient.last_visit,
                last_appointment_type: patient.last_appointment_type,
                total_visits: patient.total_visits || 0,
                is_returning: patient.is_returning === 1,
                hospital_id: patient.hospital_id,
                created_at: patient.created_at
            }
        };

    } catch (error) {
        logger.error('Error finding patient by phone:', error);
        throw new Error(`Database error: ${error.message}`);
    }
};

/**
 * Create a new patient (with duplicate phone check and hospital association)
 */
exports.create = async (patientData, hospitalId = null) => {
    try {
        const { name, phone, email, pet_name, pet_species, pet_breed, pet_gender, pet_age } = patientData;

        const normalizedPhone = normalizePhone(phone);

        // Check if patient already exists
        const existing = await exports.findByPhone(normalizedPhone, hospitalId);
        
        if (existing.found) {
            logger.info(`Patient already exists: ID ${existing.patient.id} - ${existing.patient.name}`);
            return {
                id: existing.patient.id,
                name: existing.patient.name,
                phone: normalizedPhone,
                is_new: false,
                existing_patient: existing.patient
            };
        }

        // Create new patient
        let query = `INSERT INTO patients (name, phone, email, pet_name, pet_species, pet_breed, pet_gender, pet_age, is_returning, created_at, updated_at`;
        let values = [name, normalizedPhone, email || null, pet_name, pet_species, pet_breed, pet_gender, pet_age];
        let placeholders = `(?, ?, ?, ?, ?, ?, ?, ?, false, NOW(), NOW()`;

        if (hospitalId) {
            query += `, hospital_id`;
            placeholders += `, ?`;
            values.push(hospitalId);
        }

        query += `) VALUES ${placeholders})`;

        const [result] = await db.execute(query, values);

        logger.info(`New patient created: ID ${result.insertId} - ${name}`);

        return {
            id: result.insertId,
            name,
            phone: normalizedPhone,
            is_new: true,
            hospital_id: hospitalId
        };

    } catch (error) {
        logger.error('Error creating patient:', error);
        throw new Error(`Failed to create patient: ${error.message}`);
    }
};

/**
 * Update existing patient (restricted to hospital if hospitalId provided)
 */
exports.update = async (patientId, updateData, hospitalId = null) => {
    try {
        const fields = [];
        const values = [];

        const allowedFields = ['name', 'email', 'pet_name', 'pet_species', 'pet_breed', 'pet_gender', 'pet_age', 'phone'];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined && value !== null) {
                if (key === 'phone') {
                    fields.push(`${key} = ?`);
                    values.push(normalizePhone(value));
                } else {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
        }

        if (fields.length === 0) {
            return { updated: false, message: 'No fields to update' };
        }

        fields.push('updated_at = NOW()');
        values.push(patientId);

        let query = `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`;
        const params = values;

        if (hospitalId) {
            query += ` AND hospital_id = ?`;
            params.push(hospitalId);
        }

        const [result] = await db.execute(query, params);

        if (result.affectedRows === 0) {
            logger.warn(`Patient ID ${patientId} not found or not owned by hospital ${hospitalId}`);
            return { updated: false, message: 'Patient not found or not owned by your hospital' };
        }

        logger.info(`Patient updated: ID ${patientId}`);

        return {
            updated: true,
            patientId: patientId
        };

    } catch (error) {
        logger.error('Error updating patient:', error);
        throw new Error(`Failed to update patient: ${error.message}`);
    }
};

/**
 * Update patient visit count and mark as returning
 */
exports.updateVisitInfo = async (patientId) => {
    try {
        await db.execute(
            `UPDATE patients SET is_returning = true, updated_at = NOW() WHERE id = ?`,
            [patientId]
        );

        logger.info(`Patient visit info updated: ID ${patientId}`);

    } catch (error) {
        logger.error('Error updating visit info:', error);
        throw new Error(`Failed to update visit info: ${error.message}`);
    }
};

/**
 * Get patient by ID (optionally filtered by hospital)
 */
exports.findById = async (patientId, hospitalId = null) => {
    try {
        let query = 'SELECT * FROM patients WHERE id = ?';
        const params = [patientId];

        if (hospitalId) {
            query += ' AND hospital_id = ?';
            params.push(hospitalId);
        }

        const [rows] = await db.execute(query, params);

        if (rows.length === 0) {
            return null;
        }

        return rows[0];

    } catch (error) {
        logger.error('Error finding patient by ID:', error);
        throw new Error(`Database error: ${error.message}`);
    }
};

/**
 * Get all patients (filtered by hospital if hospitalId provided)
 */
exports.getAllPatients = async (hospitalId = null, page = 1, limit = 50) => {
    try {
        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*, 
                (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) as total_appointments,
                (SELECT MAX(a.date) FROM appointments a WHERE a.patient_id = p.id) as last_visit_date
            FROM patients p
        `;
        const params = [];

        if (hospitalId) {
            query += ` WHERE p.hospital_id = ?`;
            params.push(hospitalId);
        }

        query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.execute(query, params);

        // Count total
        let countSql = 'SELECT COUNT(*) as total FROM patients';
        const countParams = [];
        if (hospitalId) {
            countSql += ' WHERE hospital_id = ?';
            countParams.push(hospitalId);
        }
        const [countResult] = await db.execute(countSql, countParams);

        return {
            patients: rows,
            total: countResult[0].total,
            page,
            totalPages: Math.ceil(countResult[0].total / limit)
        };

    } catch (error) {
        logger.error('Error getting all patients:', error);
        throw new Error(`Database error: ${error.message}`);
    }
};

/**
 * Search patients by name, phone, or pet_name (filtered by hospital)
 */
exports.searchPatients = async (query, hospitalId = null) => {
    try {
        const searchQuery = `%${query}%`;

        let sql = `
            SELECT * FROM patients 
            WHERE (name LIKE ? OR phone LIKE ? OR pet_name LIKE ?)
        `;
        const params = [searchQuery, searchQuery, searchQuery];

        if (hospitalId) {
            sql += ` AND hospital_id = ?`;
            params.push(hospitalId);
        }

        sql += ` ORDER BY updated_at DESC LIMIT 20`;

        const [rows] = await db.execute(sql, params);

        return rows;

    } catch (error) {
        logger.error('Error searching patients:', error);
        throw new Error(`Database error: ${error.message}`);
    }
};