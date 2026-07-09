
// ─── DEPENDENCIES ────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const ezyvetController = require('../controllers/ezyvetController');
const apiKeyAuth = require('../middleware/apiKeyAuth');


// ─── ALL ROUTES USE POST ───────────────────────────────────────────────



// POST /api/ezyvet/resources/summary
// Get summary (id, uid, name, access) only
router.post('/resources/summary', apiKeyAuth, ezyvetController.getResourcesSummary);

// POST /api/ezyvet/resource
// Get single resource by UID (send uid in body)
router.post('/resource', apiKeyAuth, ezyvetController.getResourceByUid);

// POST /api/ezyvet/availability
// Get availability for multiple resources and dates
router.post('/availability', apiKeyAuth, ezyvetController.getAvailability);

// POST /api/ezyvet/test-token
// Test token generation (debug only)
router.post('/test-token', apiKeyAuth, ezyvetController.testToken);



// ─── NEW ROUTE ──────────────────────────────────────────────────────────


// POST /api/ezyvet/resources
// Get all filtered resources (active + On Calendar)
router.post('/resources', apiKeyAuth, ezyvetController.getResources);


// POST /api/ezyvet/resource/availability
// Get availability for a single resource by UID
router.post('/resource/availability', apiKeyAuth, ezyvetController.getResourceAvailability);




// ─── NEW ROUTE ──────────────────────────────────────────────────────────
// POST /api/ezyvet/create/patient
// Creates a new contact (owner) and a linked animal (pet)
router.post('/create/patient', apiKeyAuth, ezyvetController.createNewEntry);


// ─── NEW ROUTE ──────────────────────────────────────────────────────────
// POST /api/ezyvet/create/pet
// Create a pet (animal) and link to an existing contact
router.post('/create/pet', apiKeyAuth, ezyvetController.createPet);




// ─── NEW ROUTE ──────────────────────────────────────────────────────────
// POST /api/ezyvet/book/appointment
// Book an appointment for an existing patient
router.post('/book/appointment', apiKeyAuth, ezyvetController.bookAppointment);





// ─── LOOKUP PATIENT BY PHONE ────────────────────────────────────────────
// POST /api/ezyvet/lookup/patient
// Body: { hospital_id, phone }
router.post('/lookup/patient', apiKeyAuth, ezyvetController.lookupPatient);  




// ─── CANCEL APPOINTMENT ──────────────────────────────────────────────────
// POST /api/ezyvet/cancel/appointment
// Body: { hospital_id, appointment_id, cancellation_reason?, cancellation_reason_text? }
router.post('/cancel/appointment', apiKeyAuth, ezyvetController.cancelAppointment);


// ─── GET APPOINTMENTS BY PHONE ──────────────────────────────────────────
// POST /api/ezyvet/appointments/lookup
// Body: { hospital_id, phone }
router.post('/appointments/lookup', apiKeyAuth, ezyvetController.getAppointmentsByPhone);




// POST /api/ezyvet/resources/availabilityslots
// Get availability slots for all three doctors (with local DB check)
router.post('/resources/availabilityslots', apiKeyAuth, ezyvetController.allAvailabilitySlots);





// POST /api/ezyvet/resources/availabilityslots/instant
// Get first available doctor with slots
router.post('/resources/availabilityslots/instant', apiKeyAuth, ezyvetController.instantAvailabilitySlots);

module.exports = router;