



// ─── DEPENDENCIES ────────────────────────────────────────────────────────
const patientService = require('../services/patientService');
const logger = require('../utils/logger');

// ─── HELPER: Extract hospital_id from request ──────────────────────────
const getHospitalId = (req) => {
    // 1. From JWT token / user object
    const fromToken = req.hospitalId || (req.user && req.user.hospital_id);
    if (fromToken) return fromToken;

    // 2. From request body (for public API key calls)
    const fromBody = req.body?.hospital_id;
    if (fromBody) return parseInt(fromBody) || null;

    // 3. From query params
    const fromQuery = req.query?.hospital_id;
    if (fromQuery) return parseInt(fromQuery) || null;

    return null;
};

// ─── CONTROLLER FUNCTIONS ──────────────────────────────────────────────

/**
 * Lookup patient by phone number – requires hospital_id
 * POST /api/patients/lookup - Body: { phone, hospital_id }
 * GET /api/patients/lookup?phone=+12125551234&hospital_id=1
 */
exports.lookupByPhone = async (req, res, next) => {
    try {
        const phone = (req.body.phone || req.query.phone || '').trim();
        const hospitalId = getHospitalId(req);

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required'
            });
        }

        const result = await patientService.findByPhone(phone, hospitalId);

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Error in lookupByPhone:', error);
        next(error);
    }
};

/**
 * Get patient by ID (admin only, scoped to hospital)
 * GET /api/patients/:id?hospital_id=1
 */
exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const hospitalId = getHospitalId(req);

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required'
            });
        }

        const patient = await patientService.findById(id, hospitalId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        return res.json({
            success: true,
            data: { patient }
        });

    } catch (error) {
        logger.error('Error in getById:', error);
        next(error);
    }
};

/**
 * Create new patient – requires hospital_id
 * POST /api/patients
 * Body: { name, phone, email, pet_name, ..., hospital_id }
 */
exports.create = async (req, res, next) => {
    try {
        const {
            name,
            phone,
            email,
            pet_name,
            pet_species,
            pet_breed,
            pet_gender,
            pet_age
        } = req.body;

        const hospitalId = getHospitalId(req);

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name and phone number are required'
            });
        }

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required'
            });
        }

        const result = await patientService.create({
            name,
            phone,
            email,
            pet_name,
            pet_species,
            pet_breed,
            pet_gender,
            pet_age
        }, hospitalId);

        if (result.is_new) {
            return res.status(201).json({
                success: true,
                message: 'Patient created successfully',
                data: result
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Patient already exists',
                data: result
            });
        }

    } catch (error) {
        logger.error('Error in create patient:', error);
        next(error);
    }
};

/**
 * Update patient (admin only, scoped to hospital)
 * PATCH /api/patients/:id
 * Body: { name, phone, email, pet_name, ..., hospital_id }
 */
exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const hospitalId = getHospitalId(req);

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required'
            });
        }

        const result = await patientService.update(id, updateData, hospitalId);

        if (!result.updated) {
            return res.status(404).json({
                success: false,
                message: result.message || 'Patient not found or no changes made'
            });
        }

        return res.json({
            success: true,
            message: 'Patient updated successfully',
            data: result
        });

    } catch (error) {
        logger.error('Error in update patient:', error);
        next(error);
    }
};

/**
 * Get all patients (admin, scoped to hospital)
 * GET /api/patients?page=1&limit=50&hospital_id=1
 */
exports.getAll = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const hospitalId = getHospitalId(req);

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required'
            });
        }

        const result = await patientService.getAllPatients(
            hospitalId,
            parseInt(page),
            parseInt(limit)
        );

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Error in getAll patients:', error);
        next(error);
    }
};

/**
 * Search patients (admin, scoped to hospital)
 * GET /api/patients/search?q=john&hospital_id=1
 */
exports.search = async (req, res, next) => {
    try {
        const { q } = req.query;
        const hospitalId = getHospitalId(req);

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required'
            });
        }

        const patients = await patientService.searchPatients(q, hospitalId);

        return res.json({
            success: true,
            data: { patients, total: patients.length }
        });

    } catch (error) {
        logger.error('Error in search patients:', error);
        next(error);
    }
};