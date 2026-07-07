// ─── DEPENDENCIES ────────────────────────────────────────────────────────
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// ─── GET ALL BREEDS ─────────────────────────────────────────────────────
exports.getAllBreeds = async (req, res) => {
    try {
        const { hospital_id } = req.body;

        if (!hospital_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        const query = `
            SELECT * FROM ezy_vet_used_animal_breads 
            WHERE hospital_id = $1 
            ORDER BY bread_name ASC
        `;
        const result = await executeQuery(query, [hospital_id]);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        logger.error(`Error in getAllBreeds: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ─── GET BREED BY ID ────────────────────────────────────────────────────
exports.getBreedById = async (req, res) => {
    try {
        const { hospital_id, id } = req.body;

        if (!hospital_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Missing breed id in request body'
            });
        }

        const query = `
            SELECT * FROM ezy_vet_used_animal_breads 
            WHERE id = $1 AND hospital_id = $2
        `;
        const result = await executeQuery(query, [id, hospital_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Bread with ID ${id} not found for hospital ${hospital_id}`
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error(`Error in getBreedById: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ─── SEARCH BREEDS BY NAME ─────────────────────────────────────────────
exports.searchBreeds = async (req, res) => {
    try {
        const { hospital_id, bread_name } = req.body;

        if (!hospital_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        if (!bread_name) {
            return res.status(400).json({
                success: false,
                error: 'Missing bread_name in request body'
            });
        }

        const query = `
            SELECT * FROM ezy_vet_used_animal_breads 
            WHERE hospital_id = $1 
            AND bread_name ILIKE $2
            ORDER BY bread_name ASC
        `;
        const searchPattern = `%${bread_name}%`;
        const result = await executeQuery(query, [hospital_id, searchPattern]);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        logger.error(`Error in searchBreeds: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ─── GET BREEDS BY SPECIES ID ──────────────────────────────────────────
exports.getBreedsBySpecies = async (req, res) => {
    try {
        const { hospital_id, species_id } = req.body;

        if (!hospital_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        if (!species_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing species_id in request body'
            });
        }

        const query = `
            SELECT * FROM ezy_vet_used_animal_breads 
            WHERE hospital_id = $1 AND species_id = $2
            ORDER BY bread_name ASC
        `;
        const result = await executeQuery(query, [hospital_id, species_id]);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        logger.error(`Error in getBreedsBySpecies: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};