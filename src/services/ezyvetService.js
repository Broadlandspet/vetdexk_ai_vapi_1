
// ─── DEPENDENCIES ────────────────────────────────────────────────────────
const axios = require('axios');
const { executeQuery, pool } = require('../config/database'); // 👈 added pool
const logger = require('../utils/logger');
const moment = require('moment-timezone');

// ─── CONSTANTS ──────────────────────────────────────────────────────────
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'America/Chicago';
const EZY_VET_API_BASE = process.env.EZY_VET_URL || 'https://apiv2.trial.ezyvet.com';
const TOKEN_URL = process.env.EZY_VET_TOKEN_URL || 'https://api.trial.ezyvet.com/v1/oauth/access_token';
const EZY_VET_API_BASE_V1 = process.env.EZY_VET_API_BASE_V1 || 'https://api.trial.ezyvet.com';

// ─── IN-MEMORY CACHES ─────────────────────────────────────────────────
const tokenCache = {};
const appointmentTypeCache = {};

// ─── HELPER: FORMAT US PHONE NUMBER ────────────────────────────────────
function formatPhoneNumber(phone) {
    if (!phone) return phone;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        const stripped = cleaned.slice(1);
        return `(${stripped.slice(0,3)}) ${stripped.slice(3,6)}-${stripped.slice(6)}`;
    }
    if (cleaned.length === 11) {
        return `+${cleaned}`;
    }
    return phone;
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



// ─── HARDCODED DOCTOR UIDS AND NAMES ────────────────────────────────────
// const DOCTOR_RESOURCES = [
//     {
//         uid: 'resource_1dPZDf2n8oixXJ1HWFvjM',
//         name: 'Emily Miralaie, DVM'
//     },
//     {
//         uid: 'resource_VJATtiYXmGObZOFgU2dzG',
//         name: 'Alexis Kessler DVM'
//     },
//     {
//         uid: 'resource_3tck1fmRlQ1TcubiL6ocb',
//         name: 'Amanda Munoz DVM'
//     }
// ];


// ─── HARDCODED DOCTOR UIDS, NAMES, AND NUMERIC IDs ──────────────────
const DOCTOR_RESOURCES = [
    {
        uid: 'resource_1dPZDf2n8oixXJ1HWFvjM',
        name: 'Emily Miralaie, DVM',
        id: 1756            // numeric resource ID
    },
    {
        uid: 'resource_VJATtiYXmGObZOFgU2dzG',
        name: 'Alexis Kessler DVM',
        id: 3277            // numeric resource ID
    },
    {
        uid: 'resource_3tck1fmRlQ1TcubiL6ocb',
        name: 'Amanda Munoz DVM',
        id: 3446               
    }
];








// ─── HELPER: GET CREDENTIALS FROM DB ──────────────────────────────────
exports.getCredentials = async (hospitalId) => {
    const query = `
        SELECT partner_id, client_id, client_secret, grant_type, scope, site_uid
        FROM ezyvet_credentials
        WHERE hospital_id = $1
    `;
    const result = await executeQuery(query, [hospitalId]);
    if (result.rows.length === 0) {
        throw new Error(`No ezyVet credentials found for hospital_id ${hospitalId}`);
    }
    return result.rows[0];
};

// ─── HELPER: OBTAIN NEW ACCESS TOKEN ──────────────────────────────────
exports.fetchNewToken = async (credentials) => {
    const payload = {
        partner_id: credentials.partner_id,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        grant_type: credentials.grant_type,
        scope: credentials.scope,
        site_uid: credentials.site_uid,
    };
    try {
        const response = await axios.post(TOKEN_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        return {
            token: response.data.access_token,
            expiresIn: response.data.expires_in,
        };
    } catch (error) {
        logger.error('ezyVet token fetch failed:', error.response?.data || error.message);
        throw new Error(`Token fetch failed: ${error.response?.data?.message || error.message}`);
    }
};

// ─── PUBLIC: GET ACCESS TOKEN (with caching) ──────────────────────────
exports.getAccessToken = async (hospitalId) => {
    const cached = tokenCache[hospitalId];
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        logger.info(`Using cached token for hospital ${hospitalId}`);
        return cached.token;
    }
    logger.info(`Fetching new token for hospital ${hospitalId}`);
    const credentials = await exports.getCredentials(hospitalId);
    const { token, expiresIn } = await exports.fetchNewToken(credentials);
    tokenCache[hospitalId] = {
        token,
        expiresAt: now + expiresIn * 1000,
    };
    return token;
};

// ─── HELPER: FETCH APPOINTMENT TYPE DETAILS ──────────────────────────
exports.fetchAppointmentTypeDetails = async (token, uid) => {
    if (appointmentTypeCache[uid]) {
        logger.info(`Using cached appointment type ${uid}`);
        return appointmentTypeCache[uid];
    }
    const url = `${EZY_VET_API_BASE}/v2/appointmenttype?uid=${uid}`;
    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const items = response.data.items;
        if (items && items.length > 0 && items[0].appointmenttype) {
            const typeData = items[0].appointmenttype;
            appointmentTypeCache[uid] = typeData;
            return typeData;
        }
        throw new Error(`Appointment type not found for UID ${uid}`);
    } catch (error) {
        logger.error(`Failed to fetch appointment type ${uid}:`, error.response?.data || error.message);
        throw new Error(`Appointment type fetch failed: ${error.response?.data?.message || error.message}`);
    }
};

// ─── PUBLIC: FETCH FILTERED RESOURCES ─────────────────────────────────
exports.fetchFilteredResources = async (hospitalId) => {
    const token = await exports.getAccessToken(hospitalId);
    const pageSize = 200;
    const fetchPage = async (page) => {
        const url = `${EZY_VET_API_BASE}/v2/resource?page=${page}&limit=${pageSize}`;
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        return response.data;
    };
    const firstPage = await fetchPage(1);
    const totalPages = firstPage.meta.items_page_total;
    let allItems = [...firstPage.items];
    for (let page = 2; page <= totalPages; page++) {
        const pageData = await fetchPage(page);
        allItems = allItems.concat(pageData.items);
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    const allowedDoctors = [
        'Amanda Munoz DVM',
        'Emily Miralaie, DVM',
        'Alexis Kessler DVM'
    ];
    const filtered = allItems.filter(item => {
        const r = item.resource;
        if (!(r.active === true && r.access === 'On Calendar')) return false;
        const ownershipId = parseInt(r.ownership_id, 10);
        if (ownershipId !== 11) return false;
        return allowedDoctors.includes(r.name);
    });
    logger.info(`Filtered to ${filtered.length} resources matching the specific doctors.`);
    return filtered;
};

// ─── PUBLIC: FETCH AVAILABILITY ──────────────────────────────────────

exports.fetchResourceAvailability = async (hospitalId, resourceUid, dates, duration = 30) => {
    const token = await exports.getAccessToken(hospitalId);
    if (!Array.isArray(dates)) dates = [dates];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const d of dates) {
        if (!dateRegex.test(d)) throw new Error(`Invalid date format: ${d}. Use YYYY-MM-DD`);
    }
    const params = new URLSearchParams();
    params.append('resources[]', resourceUid);
    dates.forEach(d => params.append('dates[]', d));
    params.append('duration', duration);
    params.append('filter[slots.available][eq]', 'true');
    const url = `${EZY_VET_API_BASE}/ezycab/availability?${params.toString()}`;
    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const availabilityData = response.data.data;
        const formatted = await Promise.all(availabilityData.map(async (item) => {
            const date = item.attributes.date;
            const timezone = item.attributes.timezone;
            const slotsWithTypes = item.attributes.slots.filter(
                slot => slot.relationships.appointmentType.data.length > 0
            );
            const typeUids = new Set();
            slotsWithTypes.forEach(slot => {
                slot.relationships.appointmentType.data.forEach(apt => typeUids.add(apt.id));
            });
            const typeDetailsMap = {};
            for (const uid of typeUids) {
                try {
                    const details = await exports.fetchAppointmentTypeDetails(token, uid);
                    typeDetailsMap[uid] = details;
                } catch (err) {
                    logger.warn(`Could not fetch details for appointment type ${uid}: ${err.message}`);
                    typeDetailsMap[uid] = null;
                }
            }
            const enrichedSlots = slotsWithTypes.map(slot => {
                const start = slot.start;
                const durationMs = slot.duration * 60000;
                const startDate = new Date(start);
                const endDate = new Date(startDate.getTime() + durationMs);
                const timeFormatter = new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: timezone,
                });
                const startStr = timeFormatter.format(startDate);
                const endStr = timeFormatter.format(endDate);

                const appointmentTypes = slot.relationships.appointmentType.data.map(apt => {
                    const details = typeDetailsMap[apt.id] || null;
                    return {
                        id: String(APPOINTMENT_TYPE_MAP[apt.id] || null),
                        uid: apt.id,
                        type: apt.type,
                        name: details ? details.name : null,
                        active: details ? details.active : null,
                        default_duration: details ? details.default_duration : null,
                    };
                });

                return {
                    date: date,
                    time: `${startStr} – ${endStr}`,
                    duration: slot.duration,
                    available: slot.available,
                    appointmentType: appointmentTypes,
                };
            });

            // ─── NEW: Filter out slots that have "Block" as an appointment type ───
            const filteredSlots = enrichedSlots.filter(slot => {
                // Keep the slot only if NONE of its appointment types are "Block"
                return !slot.appointmentType.some(apt => apt.name === "Block");
            });

            return { date, timezone, slots: filteredSlots };
        }));
        // Remove dates that end up with no slots after filtering
        return formatted.filter(item => item.slots.length > 0);
    } catch (error) {
        logger.error('ezyVet availability fetch failed:', error.response?.data || error.message);
        throw new Error(`Availability fetch failed: ${error.response?.data?.message || error.message}`);
    }
};

// ─── CREATE CONTACT (OWNER) ──────────────────────────────────────────

exports.createContact = async (hospitalId, contactData) => {
    const token = await exports.getAccessToken(hospitalId);
    const formattedPhone = formatPhoneNumber(contactData.mobile_phone);
    
    // ─── Build contact details dynamically ──────────────────────────────
    // Always include Mobile Phone
    const contactDetailList = [
        { name: 'Mobile Phone', value: formattedPhone, contact_detail_type_id: '3', preferred: 1 }
    ];
    
    // Only add Email Address if it exists and is not empty
    if (contactData.email_address && contactData.email_address.trim() !== '') {
        contactDetailList.push({
            name: 'Email Address',
            value: contactData.email_address,
            contact_detail_type_id: '1',
            preferred: 1
        });
    }

    const payload = {
        first_name: contactData.first_name,
        last_name: contactData.last_name || '',
        is_customer: 1,
        stop_credit: 'OK',
        ownership_id: '11',
        contact_detail_list: contactDetailList  // ← Dynamic list
    };
    
    try {
        const response = await axios.post(`${EZY_VET_API_BASE_V1}/v1/contact`, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const contact = response.data.items[0].contact;
        return {
            id: contact.id,
            code: contact.code,
            first_name: contact.first_name,
            last_name: contact.last_name,
        };
    } catch (error) {
        logger.error('ezyVet create contact failed:', error.response?.data || error.message);
        throw new Error(`Contact creation failed: ${error.response?.data?.message || error.message}`);
    }
};


// // ─── CREATE ANIMAL (PET) ──────────────────────────────────────────────
// exports.createAnimal = async (hospitalId, animalData) => {
//     const token = await exports.getAccessToken(hospitalId);
//     const payload = {
//         contact_id: animalData.contact_id,
//         name: animalData.name,
//         sex_id: animalData.sex_id,
//         species_id: animalData.species_id,
//         breed_id: animalData.breed_id
//     };
//     if (animalData.animalcolour_id !== null && animalData.animalcolour_id !== undefined) {
//         payload.animalcolour_id = animalData.animalcolour_id;
//     }
//     try {
//         const response = await axios.post(`${EZY_VET_API_BASE_V1}/v1/animal`, payload, {
//             headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
//         });
//         const animal = response.data.items[0].animal;
//         return {
//             id: animal.id,
//             code: animal.code,
//             name: animal.name,
//         };
//     } catch (error) {
//         logger.error('ezyVet create animal failed:', error.response?.data || error.message);
//         throw new Error(`Animal creation failed: ${error.response?.data?.message || error.message}`);
//     }
// };


exports.createAnimal = async (hospitalId, animalData) => {
    const token = await exports.getAccessToken(hospitalId);
    const payload = {
        contact_id: animalData.contact_id,
        name: animalData.name,
        sex_id: animalData.sex_id,
        species_id: animalData.species_id,
        breed_id: animalData.breed_id || null   // <-- allow null
    };
    if (animalData.animalcolour_id !== null && animalData.animalcolour_id !== undefined) {
        payload.animalcolour_id = animalData.animalcolour_id;
    }
    try {
        const response = await axios.post(`${EZY_VET_API_BASE_V1}/v1/animal`, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const animal = response.data.items[0].animal;
        return {
            id: animal.id,
            code: animal.code,
            name: animal.name,
        };
    } catch (error) {
        logger.error('ezyVet create animal failed:', error.response?.data || error.message);
        throw new Error(`Animal creation failed: ${error.response?.data?.message || error.message}`);
    }
};

// ─── BOOK APPOINTMENT ──────────────────────────────────────────────────
exports.bookAppointment = async (hospitalId, bookingData) => {
    const token = await exports.getAccessToken(hospitalId);
    const payload = {
        start_at: bookingData.start_at,
        duration: bookingData.duration,
        type_id: bookingData.type_id,
        status_id: bookingData.status_id || 2,
        description: bookingData.description || '',
        animal_id: bookingData.animal_id,
        contact_id: bookingData.contact_id,
        sales_resource: bookingData.sales_resource,
        resources: bookingData.resources
    };
    try {
        const response = await axios.post(`${EZY_VET_API_BASE}/v2/appointment`, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const appointment = response.data.items[0].appointment;
        logger.info(`Appointment booked successfully. ID: ${appointment.id}`);
        return {
            id: appointment.id,
            uid: appointment.uid,
            active: appointment.active,
            description: appointment.description,
            contact_id: appointment.contact_id,
            animal_id: appointment.animal_id,
            start_at: appointment.start_at,
            duration: appointment.duration,
            type_id: appointment.type_id,
            status_id: appointment.status_id,
        };
    } catch (error) {
        logger.error('ezyVet book appointment failed:', error.response?.data || error.message);
        throw new Error(`Appointment booking failed: ${error.response?.data?.message || error.message}`);
    }
};

// ─── NEW: SAVE OWNER AND PET TO LOCAL DB ──────────────────────────────


exports.saveOwnerAndPetToDb = async (hospitalId, ownerData, petData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert into ezy_vet_pet_owner
        const ownerInsertQuery = `
            INSERT INTO ezy_vet_pet_owner 
            (hospital_id, name, phone, email, ezy_vet_contact_id, ezyVetContactCode, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id
        `;
        const ownerValues = [
            hospitalId,
            ownerData.name,
            ownerData.phone,
            ownerData.email || null,
            ownerData.ezy_vet_contact_id,
            ownerData.ezyVetContactCode
        ];
        const ownerResult = await client.query(ownerInsertQuery, ownerValues);
        const ownerId = ownerResult.rows[0].id;

        // 2. Insert into ezy_vet_pets
        const petInsertQuery = `
            INSERT INTO ezy_vet_pets 
            (hospital_id, pet_owner_id, pet_name, pet_sex, pet_species, pet_breed, 
             ezy_vet_breed_id, ezy_vet_contact_id, ezyVetContactCode, 
             ezy_vet_pet_code, ezy_vet_pet_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id
        `;
        const petValues = [
            hospitalId,
            ownerId,
            petData.pet_name,
            petData.sex,
            petData.species,
            petData.breed,
            petData.ezy_vet_breed_id,
            petData.ezy_vet_contact_id,
            petData.ezyVetContactCode,
            petData.ezy_vet_pet_code,
            petData.ezy_vet_pet_id
        ];
        const petResult = await client.query(petInsertQuery, petValues);
        const petId = petResult.rows[0].id;

        // 3. Update ezy_vet_pet_owner with the pet_id array
        await client.query(
            `UPDATE ezy_vet_pet_owner SET pet_id = array_append(pet_id, $1) WHERE id = $2`,
            [petId, ownerId]
        );

        await client.query('COMMIT');
        logger.info(`Saved owner ID ${ownerId} and pet ID ${petId} to local DB.`);
        return { ownerId, petId };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error saving owner and pet to local DB:', error);
        throw new Error(`Failed to save to local database: ${error.message}`);
    } finally {
        client.release();
    }
};





exports.savePetToDb = async (hospitalId, petOwnerId, petData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const petInsertQuery = `
            INSERT INTO ezy_vet_pets 
            (hospital_id, pet_owner_id, pet_name, pet_sex, pet_species, pet_breed, 
             ezy_vet_breed_id, ezy_vet_contact_id, ezyVetContactCode, 
             ezy_vet_pet_code, ezy_vet_pet_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id
        `;
        const petValues = [
            hospitalId,
            petOwnerId,
            petData.pet_name,
            petData.sex,
            petData.species,
            petData.breed,
            petData.ezy_vet_breed_id,
            petData.ezy_vet_contact_id,
            petData.ezyVetContactCode || null,
            petData.ezy_vet_pet_code,
            petData.ezy_vet_pet_id
        ];

        const petResult = await client.query(petInsertQuery, petValues);
        const petId = petResult.rows[0].id;

        // Update ezy_vet_pet_owner with the new pet_id array
        await client.query(
            `UPDATE ezy_vet_pet_owner SET pet_id = array_append(pet_id, $1) WHERE id = $2`,
            [petId, petOwnerId]
        );

        await client.query('COMMIT');
        logger.info(`Saved pet ID ${petId} to local DB for pet_owner ${petOwnerId}`);
        return { petId };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error saving pet to local DB:', error);
        throw new Error(`Failed to save pet to local database: ${error.message}`);
    } finally {
        client.release();
    }
};








exports.lookupOwnerByPhone = async (hospitalId, phone) => {
    try {
        // 1. Find owner in ezy_vet_pet_owner
        const ownerQuery = `
            SELECT id, hospital_id, name, phone, email, 
                   pet_id, ezy_vet_contact_id, ezyvetcontactcode,
                   created_at, updated_at
            FROM ezy_vet_pet_owner
            WHERE hospital_id = $1 AND phone = $2
        `;
        const ownerResult = await executeQuery(ownerQuery, [hospitalId, phone]);

        if (ownerResult.rows.length === 0) {
            return null;
        }

        const owner = ownerResult.rows[0];

        // 2. Get pets using pet_id array from ezy_vet_pets
        let pets = [];
        if (owner.pet_id && owner.pet_id.length > 0) {
            const petQuery = `
                SELECT id, hospital_id, pet_name, pet_sex, pet_species, pet_breed,
                       ezy_vet_breed_id, ezy_vet_contact_id, ezyvetcontactcode,
                       ezy_vet_pet_code, ezy_vet_pet_id
                FROM ezy_vet_pets
                WHERE id = ANY($1)
            `;
            const petResult = await executeQuery(petQuery, [owner.pet_id]);
            pets = petResult.rows;
        }

        return { owner, pets };
    } catch (error) {
        logger.error('Error in lookupOwnerByPhone:', error);
        throw new Error(`Failed to lookup owner: ${error.message}`);
    }
};





// ─── SAVE APPOINTMENT TO LOCAL DB ──────────────────────────────────────
exports.saveAppointmentToDb = async (appointmentData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const query = `
            INSERT INTO ezy_vet_appointments (
                hospital_id, pet_id, pet_owner_id,
                ezy_vet_appointment_id, ezy_vet_appointment_uid,
                ezy_vet_appointment_active, ezy_vet_appointment_description,
                ezy_vet_contact_id, ezyvet_contact_code,
                ezy_vet_pet_id, ezy_vet_pet_code,
                pet_owner, appointment_type,
                ezy_vet_appointment_type, ezy_vet_appointment_type_id,
                date, time, start_at, duration,
                status, appointment_status, notes, call_sid,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23,
                NOW(), NOW()
            )
            RETURNING id
        `;

        const values = [
            appointmentData.hospital_id,
            appointmentData.pet_id,
            appointmentData.pet_owner_id,
            appointmentData.ezy_vet_appointment_id,
            appointmentData.ezy_vet_appointment_uid,
            appointmentData.ezy_vet_appointment_active,
            appointmentData.ezy_vet_appointment_description,
            appointmentData.ezy_vet_contact_id,
            appointmentData.ezyvet_contact_code,
            appointmentData.ezy_vet_pet_id,
            appointmentData.ezy_vet_pet_code,
            appointmentData.pet_owner,
            appointmentData.appointment_type,
            appointmentData.ezy_vet_appointment_type,
            appointmentData.ezy_vet_appointment_type_id,
            appointmentData.date,
            appointmentData.time,
            appointmentData.start_at,
            appointmentData.duration,
            appointmentData.status,
            appointmentData.appointment_status,
            appointmentData.notes,
            appointmentData.call_sid || null
        ];

        const result = await client.query(query, values);
        const localId = result.rows[0].id;

        await client.query('COMMIT');
        logger.info(`Appointment saved to local DB with ID ${localId}`);
        return { localId };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error saving appointment to local DB:', error);
        throw new Error(`Failed to save appointment to local database: ${error.message}`);
    } finally {
        client.release();
    }
};



// // ─── CHECK LOCAL AVAILABILITY ──────────────────────────────────────────

exports.checkLocalAvailability = async (hospitalId, startAt, duration, resourceId = null) => {
    // Convert Unix timestamps to Date objects for PostgreSQL
    const requestedStart = new Date(startAt * 1000);
    const requestedEnd = new Date((startAt + duration) * 1000);

    // Build the overlap query
    // Exclude cancelled appointments:
    // - status != 'Cancelled'
    // - appointment_status != 'Cancelled'
    // - ezy_vet_appointment_active = 'true'
    let query = `
        SELECT COUNT(*) as count
        FROM ezy_vet_appointments
        WHERE hospital_id = $1
        AND status != 'Cancelled'
        AND appointment_status != 'Cancelled'
        AND ezy_vet_appointment_active = 'true'
        AND start_at < $2
        AND (start_at + (duration * interval '1 second')) > $3
    `;

    const params = [
        hospitalId,
        requestedEnd,   // $2 - requested end time
        requestedStart  // $3 - requested start time
    ];

    // If resourceId is provided, check only appointments for that specific resource
    if (resourceId) {
        // Assuming the resources column is an array of integers (like [3277])
        // Check if the resourceId exists in the resources array
        query += ` AND $4 = ANY(resources)`;
        params.push(resourceId);
    }

    try {
        const result = await executeQuery(query, params);
        const count = parseInt(result.rows[0].count, 10);
        
        // Return true if no overlapping appointments found (slot is available)
        // Return false if at least one overlapping appointment exists (slot is taken)
        return count === 0;
    } catch (error) {
        logger.error(`Error checking local availability: ${error.message}`);
        // On error, return false to be safe (prevent double-booking)
        return false;
    }
};







// ─── CANCEL APPOINTMENT IN EZYVET ──────────────────────────────────────
exports.cancelAppointment = async (hospitalId, appointmentId, cancellationReason = null, cancellationReasonText = null) => {
    const token = await exports.getAccessToken(hospitalId);
    const url = `${EZY_VET_API_BASE}/v2/appointment/${appointmentId}`;
    
    const payload = {
        cancel: true
    };
    if (cancellationReason) {
        payload.cancellation_reason = parseInt(cancellationReason, 10);
    }
    if (cancellationReasonText) {
        payload.cancellation_reason_text = cancellationReasonText;
    }
    
    try {
        const response = await axios.patch(url, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/merge-patch+json'
            }
        });
        const appointment = response.data.items[0].appointment;
        logger.info(`Appointment ${appointmentId} cancelled successfully.`);
        return {
            id: appointment.id,
            uid: appointment.uid,
            active: appointment.active,
            cancellation_reason: appointment.cancellation_reason,
            cancellation_reason_text: appointment.cancellation_reason_text,
        };
    } catch (error) {
        logger.error('ezyVet cancel appointment failed:', error.response?.data || error.message);
        throw new Error(`Cancellation failed: ${error.response?.data?.message || error.message}`);
    }
};

// ─── UPDATE LOCAL DB AFTER CANCELLATION ────────────────────────────────
exports.saveCancelAppointmentToDb = async (hospitalId, ezyAppointmentId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const updateQuery = `
            UPDATE ezy_vet_appointments
            SET 
                ezy_vet_appointment_active = 'false',
                status = 'Completed',
                appointment_status = 'Cancelled',
                updated_at = NOW()
            WHERE hospital_id = $1 
            AND ezy_vet_appointment_id = $2
            RETURNING id
        `;
        const result = await client.query(updateQuery, [hospitalId, String(ezyAppointmentId)]);
        
        if (result.rows.length === 0) {
            throw new Error(`No local appointment found for ezyVet ID ${ezyAppointmentId} in hospital ${hospitalId}`);
        }
        
        await client.query('COMMIT');
        logger.info(`Local appointment record updated for ezyVet ID ${ezyAppointmentId}`);
        return { updated: true };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error updating local appointment after cancellation:', error);
        throw new Error(`Failed to update local appointment: ${error.message}`);
    } finally {
        client.release();
    }
};




// ─── GET APPOINTMENTS BY OWNER ID ──────────────────────────────────────
exports.getAppointmentsByOwner = async (hospitalId, petOwnerId) => {
    try {
        const query = `
            SELECT 
                id,
                hospital_id,
                pet_id,
                pet_owner_id,
                ezy_vet_appointment_id,
                ezy_vet_appointment_uid,
                ezy_vet_appointment_active,
                ezy_vet_appointment_description,
                ezy_vet_contact_id,
                ezyvet_contact_code,
                ezy_vet_pet_id,
                ezy_vet_pet_code,
                appointment_type,
                ezy_vet_appointment_type,
                ezy_vet_appointment_type_id,
                date,
                time,
                start_at,
                duration,
                status,
                appointment_status,
                notes,
                call_sid,
                created_at,
                updated_at
            FROM ezy_vet_appointments
            WHERE hospital_id = $1 
            AND pet_owner_id = $2
            AND ezy_vet_appointment_active = 'true'
            AND status != 'Completed'
            AND appointment_status != 'Cancelled'
            ORDER BY date DESC, time DESC
        `;
        const result = await executeQuery(query, [hospitalId, petOwnerId]);
        return result.rows;
    } catch (error) {
        logger.error('Error fetching appointments by owner:', error);
        throw new Error(`Failed to fetch appointments: ${error.message}`);
    }
};





/**
 * Get availability slots for all three hardcoded doctors for given dates
 * Checks BOTH ezyVet AND local database for conflicts
 * 
 * @param {number} hospitalId - Hospital ID
 * @param {string[]} dates - Array of date strings (YYYY-MM-DD)
 * @param {number} duration - Duration in minutes (default 30)
 * @param {number|null} resourceId - Optional resource ID to filter conflicts
 * @returns {Promise<Array>} - Array of objects: { date, timezone, for_dr, slots }
 */
// exports.getAvailabilityForAllDoctors = async (hospitalId, dates, duration = 30, resourceId = null) => {
//     const result = [];

//     // Loop through hardcoded doctor resources
//     for (const doctor of DOCTOR_RESOURCES) {
//         const uid = doctor.uid;
//         const doctorName = doctor.name;

//         logger.info(`Fetching availability for doctor: ${doctorName} (${uid})`);

//         let availability;
//         try {
//             availability = await exports.fetchResourceAvailability(hospitalId, uid, dates, duration);
//         } catch (err) {
//             logger.warn(`Failed to fetch availability for doctor ${doctorName}: ${err.message}`);
//             continue; // skip this doctor if fetch fails
//         }

//         // If no slots for this doctor on any date, skip
//         if (!availability || availability.length === 0) {
//             logger.info(`No slots from ezyVet for doctor ${doctorName} on requested dates`);
//             continue;
//         }

//         // For each date entry, filter slots by local DB availability
//         for (const dateEntry of availability) {
//             if (!dateEntry.slots || dateEntry.slots.length === 0) {
//                 continue;
//             }

//             // Filter slots based on local DB availability
//             const filteredSlots = [];

//             for (const slot of dateEntry.slots) {
//                 // Parse the time from the slot
//                 const timeStr = slot.time.split(' – ')[0].trim();
//                 const dateTimeStr = `${dateEntry.date} ${timeStr}`;
                
//                 // Convert to Unix timestamp
//                 const startAt = moment.tz(dateTimeStr, 'YYYY-MM-DD HH:mm', dateEntry.timezone).unix();
//                 const slotDuration = slot.duration || duration;

//                 // ✅ Check local DB for conflicts
//                 const isAvailable = await exports.checkLocalAvailability(
//                     hospitalId, 
//                     startAt, 
//                     slotDuration, 
//                     resourceId
//                 );
                
//                 if (isAvailable) {
//                     // ✅ Only keep slots that are free in local DB
//                     filteredSlots.push(slot);
//                 } else {
//                     logger.debug(`Slot ${slot.time} for ${doctorName} on ${dateEntry.date} is booked in local DB - filtering out`);
//                 }
//             }

//             // Only add to result if there are slots available
//             if (filteredSlots.length > 0) {
//                 result.push({
//                     date: dateEntry.date,
//                     timezone: dateEntry.timezone,
//                     for_dr: doctorName,
//                     slots: filteredSlots
//                 });
//             }
//         }
//     }

//     return result;
// };


exports.getAvailabilityForAllDoctors = async (hospitalId, dates, duration = 30, resourceId = null) => {
    const result = [];

    // Loop through hardcoded doctor resources
    for (const doctor of DOCTOR_RESOURCES) {
        const uid = doctor.uid;
        const doctorName = doctor.name;
        const doctorNumericId = doctor.id;   // <-- numeric ID

        logger.info(`Fetching availability for doctor: ${doctorName} (${uid})`);

        let availability;
        try {
            availability = await exports.fetchResourceAvailability(hospitalId, uid, dates, duration);
        } catch (err) {
            logger.warn(`Failed to fetch availability for doctor ${doctorName}: ${err.message}`);
            continue; // skip this doctor if fetch fails
        }

        // If no slots for this doctor on any date, skip
        if (!availability || availability.length === 0) {
            logger.info(`No slots from ezyVet for doctor ${doctorName} on requested dates`);
            continue;
        }

        // For each date entry, filter slots by local DB availability
        for (const dateEntry of availability) {
            if (!dateEntry.slots || dateEntry.slots.length === 0) {
                continue;
            }

            // Filter slots based on local DB availability
            const filteredSlots = [];

            for (const slot of dateEntry.slots) {
                // Parse the time from the slot
                const timeStr = slot.time.split(' – ')[0].trim();
                const dateTimeStr = `${dateEntry.date} ${timeStr}`;
                
                // Convert to Unix timestamp
                const startAt = moment.tz(dateTimeStr, 'YYYY-MM-DD HH:mm', dateEntry.timezone).unix();
                const slotDuration = slot.duration || duration;

                // ✅ Check local DB for conflicts
                const isAvailable = await exports.checkLocalAvailability(
                    hospitalId, 
                    startAt, 
                    slotDuration, 
                    resourceId
                );
                
                if (isAvailable) {
                    // ✅ Only keep slots that are free in local DB
                    filteredSlots.push(slot);
                } else {
                    logger.debug(`Slot ${slot.time} for ${doctorName} on ${dateEntry.date} is booked in local DB - filtering out`);
                }
            }

            // Only add to result if there are slots available
            if (filteredSlots.length > 0) {
                result.push({
                    date: dateEntry.date,
                    timezone: dateEntry.timezone,
                    for_dr: doctorName,
                    resource_id: doctorNumericId,   // <-- ADD THIS
                    slots: filteredSlots
                });
            }
        }
    }

    return result;
};




/**
 * Get the FIRST doctor that has available slots for the given date(s)
 * Uses the hardcoded doctor order: Emily → Alexis → Amanda
 * 
 * @param {number} hospitalId - Hospital ID
 * @param {string[]} dates - Array of date strings (YYYY-MM-DD)
 * @param {number} duration - Duration in minutes (default 30)
 * @param {number|null} resourceId - Optional resource ID to filter conflicts
 * @returns {Promise<Array>} - Array with ONE doctor's availability (or empty)
 */
exports.fetchInstantAvailabilitySlots = async (hospitalId, dates, duration = 30, resourceId = null) => {
    // Get all doctors' availability (with local DB check)
    const allAvailability = await exports.getAvailabilityForAllDoctors(
        hospitalId, 
        dates, 
        duration, 
        resourceId
    );

    // Return only the FIRST doctor that has slots
    if (allAvailability && allAvailability.length > 0) {
        return [allAvailability[0]];  // ✅ Return just the first doctor
    }

    // No doctor has available slots
    return [];
};











// ─── EXPOSE TOKEN CACHE ──────────────────────────────────────────────
exports.tokenCache = tokenCache;