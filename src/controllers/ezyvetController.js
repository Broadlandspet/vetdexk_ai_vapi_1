

// ─── DEPENDENCIES ────────────────────────────────────────────────────────
const ezyvetService = require('../services/ezyvetService');
const logger = require('../utils/logger');

const moment = require('moment-timezone');

// ─── HELPER: Parse array from body (accepts string or array) ──────────


function parseArrayParam(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
    return [value];
}



// ─── HARDCODED APPOINTMENT TYPE MAPPING ────────────────────────────────
const APPOINTMENT_TYPE_MAP = {
    'appointmentType_s2jCQr8h2HT8MW3nQe5I5': 1,
    'appointmentType_2MA345slblRUVyFCZpXxK': 2,
    'appointmentType_2IrjtvktO7lfykslqTYTp': 4,
    'appointmentType_dc9UiK1W0Jnozn3GfjFnQ': 7,
    'appointmentType_F8RbKIXszjXAXqD2pfkko': 8,
    'appointmentType_bPAtryMTuewEvZEes0fs9': 9,
    'appointmentType_RVtAq9xT7R809ea6OD3Ea': 15,
    'appointmentType_2H05RfCx0KymPAn3DvHUg': 17,
    'appointmentType_3y25ghUseRAiYBxS1FFAP': 18,
    'appointmentType_7wfHedVGDwjSox8HHq819': 19,
    'appointmentType_hOYoItmzYMchdvf0LTIXu': 10,
};

// ─── REVERSE MAP: Numeric ID → Name ────────────────────────────────────
const APPOINTMENT_TYPE_NAME_MAP = {
    1: 'Doctor Visit',
    2: 'Meeting',
    4: 'Block',
    7: 'Surgery',
    8: 'Vaccinations',
    9: 'Consult',
    10: 'Emergency',
    15: 'Grooming',
    17: 'Repeat Medication Request',
    18: 'Euthanasia',
    19: 'Tech Visit',
};





// ─── HELPER: Normalize breed value ──────────────────────────────
const normalizeBreed = (breed) => {
    if (!breed) return null;
    const breedStr = String(breed).trim();
    
    // If it's "Unknown" or "unknown" → treat as null
    if (breedStr.toLowerCase() === 'unknown') {
        return null;
    }
    
    // If it's not a number → treat as null
    if (isNaN(breedStr)) {
        return null;
    }
    
    const breedNumber = parseInt(breedStr, 10);
    
    // If it's 254 (invalid default) → treat as null
    if (breedNumber === 254) {
        return null;
    }
    
    return breedStr;
};








// ─── CONTROLLER: GET FILTERED RESOURCES ───────────────────────────────
exports.getResources = async (req, res) => {
    try {
        const { hospital_id } = req.body;
        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        logger.info(`[POST] Fetching ezyVet resources for hospital ${hospitalId}`);
        const resources = await ezyvetService.fetchFilteredResources(hospitalId);

        return res.status(200).json({
            success: true,
            count: resources.length,
            data: resources,
        });
    } catch (error) {
        logger.error(`Error in getResources: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// ─── CONTROLLER: TEST TOKEN ────────────────────────────────────────────
exports.testToken = async (req, res) => {
    try {
        const { hospital_id } = req.body;
        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        const token = await ezyvetService.getAccessToken(hospitalId);
        return res.status(200).json({
            success: true,
            token: token.substring(0, 20) + '...',
            message: 'Token retrieved successfully'
        });
    } catch (error) {
        logger.error(`Error in testToken: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// ─── CONTROLLER: GET SINGLE RESOURCE BY UID ──────────────────────────
exports.getResourceByUid = async (req, res) => {
    try {
        const { hospital_id, uid } = req.body;
        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'Missing uid in request body'
            });
        }

        const allResources = await ezyvetService.fetchFilteredResources(hospitalId);
        const resource = allResources.find(item => item.resource.uid === uid);

        if (!resource) {
            return res.status(404).json({
                success: false,
                error: `Resource with UID ${uid} not found or not active/On Calendar`
            });
        }

        return res.status(200).json({
            success: true,
            data: resource,
        });
    } catch (error) {
        logger.error(`Error in getResourceByUid: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};



// ─── CONTROLLER: GET RESOURCES SUMMARY (COUNT ONLY) ──────────────────
exports.getResourcesSummary = async (req, res) => {
    try {
        const { hospital_id } = req.body;
        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        const resources = await ezyvetService.fetchFilteredResources(hospitalId);

        const summary = resources.map(item => ({
            id: item.resource.id,
            uid: item.resource.uid,
            name: item.resource.name,
            access: item.resource.access,
        }));

        return res.status(200).json({
            success: true,
            count: summary.length,
            data: summary,
        });
    } catch (error) {
        logger.error(`Error in getResourcesSummary: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};




// ─── CONTROLLER: GET  ezy tho AVAILABILITY FOR MULTIPLE RESOURCES ──────────────
// NOTE: This is a placeholder for multi-resource availability.
// For single resource, use /resource/availability endpoint.
exports.getAvailability = async (req, res) => {
    try {
        const {
            hospital_id,
            resources,
            dates,
            duration,
            available_only
        } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        const resourceUids = parseArrayParam(resources);
        const dateList = parseArrayParam(dates);
        const dur = parseInt(duration, 10) || 15;
        const onlyAvailable = available_only === true || available_only === 'true';

        if (resourceUids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing resources (provide as array or comma-separated string)'
            });
        }
        if (resourceUids.length > 5) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 5 resources allowed per request'
            });
        }
        if (dateList.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing dates (provide as array or comma-separated string)'
            });
        }
        if (dateList.length > 7) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 7 dates allowed per request'
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        for (const d of dateList) {
            if (!dateRegex.test(d)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid date format: ${d}. Use YYYY-MM-DD`
                });
            }
        }

        // For multi-resource, we'll fetch availability for each resource separately
        // and combine the results.
        const allAvailability = [];
        for (const uid of resourceUids) {
            try {
                const availability = await ezyvetService.fetchResourceAvailability(
                    hospitalId,
                    uid,
                    dateList,
                    dur
                );
                allAvailability.push({
                    resourceUid: uid,
                    availability: availability
                });
            } catch (err) {
                logger.warn(`Failed to fetch availability for resource ${uid}: ${err.message}`);
                allAvailability.push({
                    resourceUid: uid,
                    availability: null,
                    error: err.message
                });
            }
        }

        return res.status(200).json({
            success: true,
            data: allAvailability,
        });
    } catch (error) {
        logger.error(`Error in getAvailability: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};


// ─── NEW: CONTROLLER: GET AVAILABILITY FOR A SINGLE RESOURCE ──────────
exports.getResourceAvailability = async (req, res) => {
    try {
        const { hospital_id, resource_id, dates, duration } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        if (!resource_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing resource_id (UID of the resource) in request body'
            });
        }

        // Parse dates – default to today if not provided
        let dateList = parseArrayParam(dates);
        if (dateList.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            dateList = [today];
            logger.info(`No dates provided, defaulting to today: ${today}`);
        }

        // Validate max 7 dates
        if (dateList.length > 7) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 7 dates allowed'
            });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        for (const d of dateList) {
            if (!dateRegex.test(d)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid date format: ${d}. Use YYYY-MM-DD`
                });
            }
        }

        const dur = parseInt(duration, 10) || 15;

        // Call service to fetch availability
        const availability = await ezyvetService.fetchResourceAvailability(
            hospitalId,
            resource_id,
            dateList,
            dur
        );

        return res.status(200).json({
            success: true,
            data: availability,
        });
    } catch (error) {
        logger.error(`Error in getResourceAvailability: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};






// ─── NEW: CREATE CONTACT + ANIMAL (PATIENT) ───────────────────────────


exports.createNewEntry = async (req, res) => {
    try {
        const {
            hospital_id,
            owner_full_name,
            mobile_phone,
            email_address,
            pet_name,
            pet_sex,           
            pet_species,      
            pet_color,
            pet_breed
        } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        // Validate required fields (pet_breed is now optional)
        if (!owner_full_name) {
            return res.status(400).json({ success: false, error: 'owner_full_name is required' });
        }
        if (!mobile_phone) {
            return res.status(400).json({ success: false, error: 'mobile_phone is required' });
        }
        if (!pet_name) {
            return res.status(400).json({ success: false, error: 'pet_name is required' });
        }
        if (!pet_sex) {
            return res.status(400).json({ success: false, error: 'pet_sex is required (Male or Female)' });
        }
        if (!pet_species) {
            return res.status(400).json({ success: false, error: 'pet_species is required (Dog, Cat, Bird, or Unknown)' });
        }

        // ─── HELPER: Normalize breed value ──────────────────────────────
        const normalizeBreed = (breed) => {
            if (!breed) return null;
            const breedStr = String(breed).trim();
            
            // If it's "Unknown" or "unknown" → treat as null
            if (breedStr.toLowerCase() === 'unknown') {
                return null;
            }
            
            // If it's not a number → treat as null
            if (isNaN(breedStr)) {
                return null;
            }
            
            const breedNumber = parseInt(breedStr, 10);
            
            // ✅ NEW: If it's 254 (invalid default) → treat as null
            if (breedNumber === 254) {
                return null;
            }
            
            return breedStr;
        };

        const normalizedBreed = normalizeBreed(pet_breed);

        // ─── MAP pet_sex (String → Numeric ID) ──────────────────────────
        const sexMapping = {
            'male': 1,
            'female': 3
        };
        const sexValue = typeof pet_sex === 'string' ? pet_sex.toLowerCase() : pet_sex;
        const sexId = sexMapping[sexValue];

        if (sexId === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Invalid pet_sex. Allowed values: "Male" or "Female"'
            });
        }

        // ─── MAP pet_species (String → Numeric ID) ──────────────────────
        const speciesMapping = {
            'dog': 1,
            'cat': 2,
            'bird': 7,
            'unknown': 3
        };
        const speciesValue = typeof pet_species === 'string' ? pet_species.toLowerCase() : pet_species;
        const speciesId = speciesMapping[speciesValue];

        if (speciesId === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Invalid pet_species. Allowed values: "Dog", "Cat", "Bird", or "Unknown"'
            });
        }

        // Split owner_full_name into first and last name
        const nameParts = owner_full_name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // 1. Create contact in ezyVet
        const contactData = {
            first_name: firstName,
            last_name: lastName,
            mobile_phone: mobile_phone,
            email_address: email_address
        };
        const contactResult = await ezyvetService.createContact(hospitalId, contactData);

        // 2. Create animal in ezyVet linked to the contact
        const animalData = {
            contact_id: contactResult.id,
            name: pet_name,
            sex_id: sexId,
            animalcolour_id: pet_color || null,
            species_id: speciesId,
            breed_id: normalizedBreed ? parseInt(normalizedBreed, 10) : null   // ← 254 becomes null
        };
        const animalResult = await ezyvetService.createAnimal(hospitalId, animalData);

        // 3. Save to local database
        const ownerDbData = {
            name: owner_full_name,
            phone: mobile_phone,
            email: email_address || null,
            ezy_vet_contact_id: contactResult.id,
            ezyVetContactCode: contactResult.code
        };
        const petDbData = {
            pet_name: pet_name,
            sex: pet_sex,
            species: pet_species,
            breed: normalizedBreed,                    // ← 254 becomes null
            ezy_vet_breed_id: normalizedBreed,         // ← 254 becomes null
            ezy_vet_contact_id: contactResult.id,
            ezyVetContactCode: contactResult.code,
            ezy_vet_pet_code: animalResult.code,
            ezy_vet_pet_id: animalResult.id
        };
        const savedData = await ezyvetService.saveOwnerAndPetToDb(hospitalId, ownerDbData, petDbData);

        // 4. Build structured response
        return res.status(200).json({
            success: true,
            data: {
                hospital_id: hospitalId,
                pet_owner_id: savedData.ownerId,
                pet_id: savedData.petId,
                contact_id: contactResult.id,
                owner_name: owner_full_name,
                mobile_phone: mobile_phone,
                email_address: email_address,
                ezyVetContactCode: contactResult.code,
                pet_name: animalResult.name,
                pet_code: animalResult.code,
                ezy_vet_pet_id: animalResult.id
            }
        });

    } catch (error) {
        logger.error(`Error in createNewEntry: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


// ─── NEW: CREATE PET (ANIMAL) AND LINK TO EXISTING CONTACT ────────────



exports.createPet = async (req, res) => {
    try {
        const {
            hospital_id,
            contact_id,
            pet_owner_id,
            pet_name,
            pet_sex,
            pet_species,
            pet_color,
            pet_breed
        } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        // Validate required fields (pet_breed is now optional)
        if (!contact_id) {
            return res.status(400).json({ success: false, error: 'contact_id is required' });
        }
        if (!pet_owner_id) {
            return res.status(400).json({ success: false, error: 'pet_owner_id is required' });
        }
        if (!pet_name) {
            return res.status(400).json({ success: false, error: 'pet_name is required' });
        }
        if (!pet_sex) {
            return res.status(400).json({ success: false, error: 'pet_sex is required (Male or Female)' });
        }
        if (!pet_species) {
            return res.status(400).json({ success: false, error: 'pet_species is required (Dog, Cat, Bird, or Unknown)' });
        }

        // ✅ NORMALIZE BREED HERE – 254 becomes null
        const normalizedBreed = normalizeBreed(pet_breed);

        // ─── MAP pet_sex (String → Numeric ID) ──────────────────────────
        const sexMapping = {
            'male': 1,
            'female': 3
        };
        const sexValue = typeof pet_sex === 'string' ? pet_sex.toLowerCase() : pet_sex;
        const sexId = sexMapping[sexValue];

        if (sexId === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Invalid pet_sex. Allowed values: "Male" or "Female"'
            });
        }

        // ─── MAP pet_species (String → Numeric ID) ──────────────────────
        const speciesMapping = {
            'dog': 1,
            'cat': 2,
            'bird': 7,
            'unknown': 3
        };
        const speciesValue = typeof pet_species === 'string' ? pet_species.toLowerCase() : pet_species;
        const speciesId = speciesMapping[speciesValue];

        if (speciesId === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Invalid pet_species. Allowed values: "Dog", "Cat", "Bird", or "Unknown"'
            });
        }

        // ─── 1. Create animal in ezyVet ──────────────────────────────────
        // ✅ USE normalizedBreed – 254 becomes null
        const animalData = {
            contact_id: parseInt(contact_id, 10),
            name: pet_name,
            sex_id: sexId,
            animalcolour_id: pet_color || null,
            species_id: speciesId,
            breed_id: normalizedBreed ? parseInt(normalizedBreed, 10) : null   // ← 254 → null!
        };
        const animalResult = await ezyvetService.createAnimal(hospitalId, animalData);

        // ─── 2. Save pet to local DB ─────────────────────────────────────
        const petDbData = {
            pet_name: pet_name,
            sex: pet_sex,
            species: pet_species,
            breed: normalizedBreed,                      // ← 254 → null
            ezy_vet_breed_id: normalizedBreed,           // ← 254 → null
            ezy_vet_contact_id: String(contact_id),
            ezyVetContactCode: null,
            ezy_vet_pet_code: animalResult.code,
            ezy_vet_pet_id: animalResult.id
        };
        // await ezyvetService.savePetToDb(hospitalId, parseInt(pet_owner_id, 10), petDbData);
       const savedData = await ezyvetService.savePetToDb(hospitalId, parseInt(pet_owner_id, 10), petDbData);
    

        // ─── 3. Build response ──────────────────────────────────────────
        return res.status(200).json({
            success: true,
            data: {
                // pet_id: animalResult.id,
                pet_id: savedData.petId,    
                pet_code: animalResult.code,
                pet_name: animalResult.name,
                contact_id: contact_id,
                pet_owner_id: pet_owner_id
            }
        });

    } catch (error) {
        logger.error(`Error in createPet: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};




// ─── NEW: BOOK APPOINTMENT ─────────────────────────────────────────────




exports.bookAppointment = async (req, res) => {
    try {
        const {
            hospital_id,
            pet_id,
            // pet_owner_id,
            pet_owner_id,
            date,
            time,
            type_id,
            description,
            animal_id,
            contact_id,
            resources
        } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        // ─── Validate required fields ──────────────────────────────────
        if (!pet_id) {
            return res.status(400).json({ success: false, error: 'pet_id is required' });
        }
        if (!pet_owner_id) {
            // return res.status(400).json({ success: false, error: 'pet_owner_id is required' });
            return res.status(400).json({ success: false, error: 'pet_owner_id is required' });

        }
        if (!date) {
            return res.status(400).json({ success: false, error: 'date is required (YYYY-MM-DD)' });
        }
        if (!time) {
            return res.status(400).json({ success: false, error: 'time is required (e.g., "15:30 – 16:00")' });
        }
        if (!type_id) {
            return res.status(400).json({ success: false, error: 'type_id is required' });
        }
        if (!animal_id) {
            return res.status(400).json({ success: false, error: 'animal_id is required' });
        }
        if (!contact_id) {
            return res.status(400).json({ success: false, error: 'contact_id is required' });
        }
        if (!resources || !Array.isArray(resources) || resources.length === 0) {
            return res.status(400).json({ success: false, error: 'resources array is required with at least one resource ID' });
        }

        // ─── Time conversion ──────────────────────────────────────────
        const startTime = time.split(' – ')[0].trim();
        if (!startTime) {
            return res.status(400).json({ success: false, error: 'Invalid time format. Use "HH:MM – HH:MM"' });
        }

        const timezone = process.env.DEFAULT_TIMEZONE || 'America/Chicago';
        const startAt = moment.tz(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', timezone).unix();

        const endTime = time.split(' – ')[1].trim();
        if (!endTime) {
            return res.status(400).json({ success: false, error: 'Invalid time format. Use "HH:MM – HH:MM"' });
        }
        const endMoment = moment.tz(`${date} ${endTime}`, 'YYYY-MM-DD HH:mm', timezone);
        const startMoment = moment.tz(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', timezone);
        const durationSeconds = endMoment.diff(startMoment, 'seconds');
        if (durationSeconds <= 0) {
            return res.status(400).json({ success: false, error: 'End time must be after start time' });
        }

        // ─── 🆕 CHECK LOCAL AVAILABILITY ──────────────────────────────
        const isAvailable = await ezyvetService.checkLocalAvailability(hospitalId, startAt, durationSeconds);
        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                error: 'This time slot is already booked. Please choose another time.'
            });
        }

        // ─── Prepare booking data ─────────────────────────────────────
        const salesResource = resources[0];
        const bookingData = {
            start_at: startAt,
            duration: durationSeconds,
            type_id: parseInt(type_id, 10),
            status_id: 2,
            description: description || '',
            animal_id: parseInt(animal_id, 10),
            contact_id: parseInt(contact_id, 10),
            sales_resource: salesResource,
            resources: resources.map(id => parseInt(id, 10))
        };

        // ─── 1. Book appointment in ezyVet ───────────────────────────
        const appointment = await ezyvetService.bookAppointment(hospitalId, bookingData);

        // ─── 2. Get appointment type name ────────────────────────────
        const appointmentTypeName = APPOINTMENT_TYPE_NAME_MAP[appointment.type_id] || null;

        // ─── 3. Save to local DB ─────────────────────────────────────
        await ezyvetService.saveAppointmentToDb({
            hospital_id: hospitalId,
            pet_id: parseInt(pet_id, 10),
            pet_owner_id: parseInt(pet_owner_id, 10),
            ezy_vet_appointment_id: String(appointment.id),
            ezy_vet_appointment_uid: appointment.uid,
            ezy_vet_appointment_active: appointment.active ? 'true' : 'false',
            ezy_vet_appointment_description: appointment.description,
            ezy_vet_contact_id: String(contact_id),
            ezyvet_contact_code: null,
            ezy_vet_pet_id: String(animal_id),
            ezy_vet_pet_code: null,
            pet_owner: null,
            appointment_type: appointmentTypeName,
            ezy_vet_appointment_type: appointmentTypeName,
            ezy_vet_appointment_type_id: String(type_id),
            date: date,
            time: startTime,
            start_at: new Date(startAt * 1000),
            duration: durationSeconds,
            status: 'confirmed',
            appointment_status: 'confirmed',
            notes: description || '',
            call_sid: null,
        });

        // ─── 4. Build response ────────────────────────────────────────
        return res.status(200).json({
            success: true,
            data: {
                hospital_id: hospitalId,
                pet_id: parseInt(pet_id, 10),
                pet_owner_id: parseInt(pet_owner_id, 10),
                appointment_id: appointment.id,
                appointment_uid: appointment.uid,
                active: appointment.active,
                description: appointment.description,
                contact_id: appointment.contact_id,
                animal_id: appointment.animal_id,
                start_at: appointment.start_at,
                duration: appointment.duration,
                appointment_type_id: appointment.type_id,
                appointment_type: appointmentTypeName,
                status_id: appointment.status_id
            }
        });
    } catch (error) {
        logger.error(`Error in bookAppointment: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


// ─── LOOKUP PATIENT (OWNER + pets) BY PHONE ────────────────────────────
exports.lookupPatient = async (req, res) => {
    try {
        const { hospital_id, phone } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        const result = await ezyvetService.lookupOwnerByPhone(hospitalId, phone);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'No owner found with this phone number'
            });
        }

        // Build response structure
        const { owner, pets } = result;
        const responseData = {
            id: owner.id,
            hospital_id: owner.hospital_id,
            name: owner.name,
            phone: owner.phone,
            email: owner.email,
            ezy_vet_contact_id: owner.ezy_vet_contact_id,
            ezyvetcontactcode: owner.ezyvetcontactcode,
            pets: pets.map(pet => ({
                id: pet.id,
                hospital_id: pet.hospital_id,
                pet_name: pet.pet_name,
                pet_sex: pet.pet_sex,
                pet_species: pet.pet_species,
                pet_breed: pet.pet_breed,
                ezy_vet_breed_id: pet.ezy_vet_breed_id,
                ezy_vet_contact_id: pet.ezy_vet_contact_id,
                ezyvetcontactcode: pet.ezyvetcontactcode,
                ezy_vet_pet_code: pet.ezy_vet_pet_code,
                ezy_vet_pet_id: pet.ezy_vet_pet_id
            }))
        };

        return res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        logger.error(`Error in lookupPatient: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};




// ─── CANCEL APPOINTMENT ──────────────────────────────────────────────────
exports.cancelAppointment = async (req, res) => {
    try {
        const {
            hospital_id,
            appointment_id,          // ezyVet numeric appointment ID
            cancellation_reason,     // optional
            cancellation_reason_text // optional
        } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }
        if (!appointment_id) {
            return res.status(400).json({
                success: false,
                error: 'appointment_id (ezyVet ID) is required'
            });
        }

        // 1. Cancel in ezyVet
        const cancelResult = await ezyvetService.cancelAppointment(
            hospitalId,
            appointment_id,
            cancellation_reason,
            cancellation_reason_text
        );

        // 2. Update local database
        await ezyvetService.saveCancelAppointmentToDb(hospitalId, appointment_id);

        // 3. Build response
        return res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: {
                appointment_id: cancelResult.id,
                appointment_uid: cancelResult.uid,
                active: cancelResult.active,
                cancellation_reason: cancelResult.cancellation_reason,
                cancellation_reason_text: cancelResult.cancellation_reason_text
            }
        });
    } catch (error) {
        logger.error(`Error in cancelAppointment: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};




// ─── GET APPOINTMENTS BY PHONE ──────────────────────────────────────────
exports.getAppointmentsByPhone = async (req, res) => {
    try {
        const { hospital_id, phone } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        // 1. Find owner by phone
        const ownerResult = await ezyvetService.lookupOwnerByPhone(hospitalId, phone);
        if (!ownerResult) {
            return res.status(404).json({
                success: false,
                message: 'No owner found with this phone number'
            });
        }

        const { owner, pets } = ownerResult;

        // 2. Get all active appointments for this owner
        const appointments = await ezyvetService.getAppointmentsByOwner(hospitalId, owner.id);

        // 3. Build response
        const formattedAppointments = appointments.map(apt => ({
            id: apt.id,
            ezy_vet_appointment_id: apt.ezy_vet_appointment_id,
            pet_id: apt.pet_id,
            pet_owner_id: apt.pet_owner_id,
            ezy_vet_contact_id: apt.ezy_vet_contact_id,
            ezy_vet_pet_id: apt.ezy_vet_pet_id,
            ezy_vet_appointment_active: apt.ezy_vet_appointment_active,
            status: apt.status,
            appointment_status: apt.appointment_status,
            appointment_type: apt.appointment_type,
            date: apt.date,
            time: apt.time,
            start_at: apt.start_at,
            duration: apt.duration,
            notes: apt.notes,
            created_at: apt.created_at
        }));

        return res.status(200).json({
            success: true,
            data: {
                hospital_id: owner.hospital_id,
                pet_owner_id: owner.id,
                pet_owner_name: owner.name,
                phone: owner.phone,
                email: owner.email,
                ezy_vet_contact_id: owner.ezy_vet_contact_id,
                ezyvetcontactcode: owner.ezyvetcontactcode,
                pets: pets.map(pet => ({
                    id: pet.id,
                    pet_name: pet.pet_name,
                    pet_sex: pet.pet_sex,
                    pet_species: pet.pet_species,
                    pet_breed: pet.pet_breed,
                })),
                appointments: formattedAppointments,
                total_appointments: formattedAppointments.length
            }
        });
    } catch (error) {
        logger.error(`Error in getAppointmentsByPhone: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};




/**
 * POST /api/ezyvet/resources/availabilityslots
 * Fetches availability for all three hardcoded doctors for given dates
 * Checks BOTH ezyVet AND local database for conflicts
 */



exports.allAvailabilitySlots = async (req, res) => {
    try {
        const { hospital_id, dates, duration, resource_id } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        // ─── NEW: Accept dates as string OR array ──────────────────────
        let dateList;
        if (typeof dates === 'string') {
            // If single string, convert to array
            dateList = [dates];
        } else if (Array.isArray(dates) && dates.length > 0) {
            // If array, use as is
            dateList = dates;
        } else {
            return res.status(400).json({
                success: false,
                error: 'dates is required as a string (e.g., "2026-07-09") or array (e.g., ["2026-07-09"])'
            });
        }

        // Validate each date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        for (const d of dateList) {
            if (!dateRegex.test(d)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid date format: ${d}. Use YYYY-MM-DD`
                });
            }
        }

        const dur = parseInt(duration, 10) || 30;
        
        // Optional resource_id for filtering conflicts
        const resourceId = resource_id ? parseInt(resource_id, 10) : null;

        // Call service to get all doctors' availability (with local DB check)
        const data = await ezyvetService.getAvailabilityForAllDoctors(
            hospitalId, 
            dateList,  // ← Use normalized dateList
            dur, 
            resourceId
        );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        logger.error(`Error in allAvailabilitySlots: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};




/**
 * POST /api/ezyvet/resources/availabilityslots/instant
 * Returns the FIRST doctor that has available slots for the given date(s)
 * Checks BOTH ezyVet AND local database for conflicts
 */




exports.instantAvailabilitySlots = async (req, res) => {
    try {
        const { hospital_id, dates, duration, resource_id } = req.body;

        const hospitalId = parseInt(hospital_id, 10);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'Missing hospital_id in request body'
            });
        }

        // ─── NEW: Accept dates as string OR array ──────────────────────
        let dateList;
        if (typeof dates === 'string') {
            // If single string, convert to array
            dateList = [dates];
        } else if (Array.isArray(dates) && dates.length > 0) {
            // If array, use as is
            dateList = dates;
        } else {
            return res.status(400).json({
                success: false,
                error: 'dates is required as a string (e.g., "2026-07-09") or array (e.g., ["2026-07-09"])'
            });
        }

        // Validate each date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        for (const d of dateList) {
            if (!dateRegex.test(d)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid date format: ${d}. Use YYYY-MM-DD`
                });
            }
        }

        const dur = parseInt(duration, 10) || 30;
        
        // Optional resource_id for filtering conflicts
        const resourceId = resource_id ? parseInt(resource_id, 10) : null;

        // Call service to get first available doctor with slots
        const data = await ezyvetService.fetchInstantAvailabilitySlots(
            hospitalId, 
            dateList,  // ← Use normalized dateList
            dur, 
            resourceId
        );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        logger.error(`Error in instantAvailabilitySlots: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};