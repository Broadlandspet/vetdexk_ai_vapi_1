// ─── DEPENDENCIES ────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const animalController = require('../controllers/animalController');
const apiKeyAuth = require('../middleware/apiKeyAuth');


// ─── ALL ROUTES USE POST ───────────────────────────────────────────────

// POST /api/animal/breeds
// Get all breeds for a hospital (body: { hospital_id })
router.post('/breeds', apiKeyAuth, animalController.getAllBreeds);

// POST /api/animal/breed
// Get a specific breed by ID (body: { hospital_id, id })
router.post('/breed', apiKeyAuth, animalController.getBreedById);

// POST /api/animal/breeds/search
// Search breeds by name (body: { hospital_id, breed_name })
router.post('/breeds/search', apiKeyAuth, animalController.searchBreeds);

// POST /api/animal/breeds/species
// Get breeds by species ID (body: { hospital_id, species_id })
router.post('/breeds/species', apiKeyAuth, animalController.getBreedsBySpecies);

module.exports = router;