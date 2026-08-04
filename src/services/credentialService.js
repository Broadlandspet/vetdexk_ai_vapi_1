
// // ==============================
// // 🔌 Import database with executeQuery
// // ==============================
// const { encrypt, decrypt } = require('../utils/encryption');
// const { executeQuery } = require('../config/database');

// // ==============================
// // 🔑 KEY TRANSFORMER: Convert all object keys to UPPERCASE
// // ==============================
// function toUpperCaseKeys(obj) {
//     if (obj === null || typeof obj !== 'object') {
//         return obj;
//     }
//     if (Array.isArray(obj)) {
//         return obj.map(item => toUpperCaseKeys(item));
//     }
//     const newObj = {};
//     for (const [key, value] of Object.entries(obj)) {
//         const newKey = key.toUpperCase();
//         newObj[newKey] = toUpperCaseKeys(value);
//     }
//     return newObj;
// }

// // ==============================
// // 🔐 SENSITIVE COLUMNS - ALL COLUMNS EXCEPT hospital_id, created_at, updated_at
// // ==============================
// const SENSITIVE_COLUMNS = [
//     // VAPI related
//     'vapi_api_key',
//     'vapi_assistant_id',
//     'vapi_api_base_url',
//     'vapi_private_api_key',
//     'vapi_feedback_assistant_id',
//     'vapi_phone_number_id',
    
//     // Google related
//     'google_client_id',
//     'google_client_secret',
//     'google_calendar_refresh_token',
//     'google_gmail_refresh_token',
//     'google_calendar_id',
//     'google_email',
    
//     // Hospital related
//     'admin_email',
//     'superadmin_email',
//     'hospital_api_key',
    
//     // Appointment settings
//     'default_slot_duration',
//     'max_booking_days',
//     'min_booking_hours',
//     'feedback_call_delay_minutes',
    
//     // Calendly
//     'calendly_pat',
    
//     // EzyVet related
//     'ezy_vet_partner_id',
//     'ezy_vet_client_id',
//     'ezy_vet_client_secret',
//     'ezy_vet_grant_type',
//     'ezy_vet_scope',
//     'ezy_vet_site_uid'
// ];

// // ==============================
// // 🔐 ENCRYPTION HELPERS
// // ==============================
// function encryptSensitiveFields(data) {
//     const encryptedData = { ...data };
//     SENSITIVE_COLUMNS.forEach((column) => {
//         if (encryptedData[column] !== null && encryptedData[column] !== undefined) {
//             encryptedData[column] = encrypt(encryptedData[column]);
//         }
//     });
//     return encryptedData;
// }

// function decryptSensitiveFields(data) {
//     const decryptedData = { ...data };
//     SENSITIVE_COLUMNS.forEach((column) => {
//         if (decryptedData[column]) {
//             try {
//                 decryptedData[column] = decrypt(decryptedData[column]);
//             } catch (err) {
//                 console.error(`Failed to decrypt column ${column}:`, err.message);
//                 decryptedData[column] = null;
//             }
//         }
//     });
//     return decryptedData;
// }

// // ==============================
// // 📝 SAVE CREDENTIALS (INSERT / UPSERT)
// // ==============================
// async function saveCredentials(data) {
//     const {
//         hospital_id,
//         vapi_api_key,
//         vapi_assistant_id,
//         google_client_id,
//         google_client_secret,
//         google_calendar_refresh_token,
//         google_gmail_refresh_token,
//         google_calendar_id,
//         admin_email,
//         google_email,
//         default_slot_duration,
//         max_booking_days,
//         min_booking_hours,
//         hospital_api_key,
//         vapi_api_base_url,
//         vapi_private_api_key,
//         vapi_feedback_assistant_id,
//         vapi_phone_number_id,
//         feedback_call_delay_minutes,
//         superadmin_email,
//         calendly_pat,
//         ezy_vet_partner_id,
//         ezy_vet_client_id,
//         ezy_vet_client_secret,
//         ezy_vet_grant_type,
//         ezy_vet_scope,
//         ezy_vet_site_uid
//     } = data;

//     if (!hospital_id) {
//         throw new Error('hospital_id is required');
//     }

//     const rawData = {
//         hospital_id,
//         vapi_api_key,
//         vapi_assistant_id,
//         google_client_id,
//         google_client_secret,
//         google_calendar_refresh_token,
//         google_gmail_refresh_token,
//         google_calendar_id,
//         admin_email,
//         google_email,
//         default_slot_duration,
//         max_booking_days,
//         min_booking_hours,
//         hospital_api_key,
//         vapi_api_base_url,
//         vapi_private_api_key,
//         vapi_feedback_assistant_id,
//         vapi_phone_number_id,
//         feedback_call_delay_minutes,
//         superadmin_email,
//         calendly_pat,
//         ezy_vet_partner_id,
//         ezy_vet_client_id,
//         ezy_vet_client_secret,
//         ezy_vet_grant_type,
//         ezy_vet_scope,
//         ezy_vet_site_uid
//     };

//     // 🔐 Encrypt ALL sensitive fields
//     const encryptedData = encryptSensitiveFields(rawData);

//     const sql = `
//         INSERT INTO vet_desk_ai_crendatials (
//             hospital_id,
//             vapi_api_key,
//             vapi_assistant_id,
//             google_client_id,
//             google_client_secret,
//             google_calendar_refresh_token,
//             google_gmail_refresh_token,
//             google_calendar_id,
//             admin_email,
//             google_email,
//             default_slot_duration,
//             max_booking_days,
//             min_booking_hours,
//             hospital_api_key,
//             vapi_api_base_url,
//             vapi_private_api_key,
//             vapi_feedback_assistant_id,
//             vapi_phone_number_id,
//             feedback_call_delay_minutes,
//             superadmin_email,
//             calendly_pat,
//             ezy_vet_partner_id,
//             ezy_vet_client_id,
//             ezy_vet_client_secret,
//             ezy_vet_grant_type,
//             ezy_vet_scope,
//             ezy_vet_site_uid
//         ) VALUES (
//             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
//             $11, $12, $13, $14, $15, $16, $17, $18,
//             $19, $20, $21, $22, $23, $24, $25, $26, $27
//         )
//         ON CONFLICT (hospital_id) 
//         DO UPDATE SET
//             vapi_api_key = EXCLUDED.vapi_api_key,
//             vapi_assistant_id = EXCLUDED.vapi_assistant_id,
//             google_client_id = EXCLUDED.google_client_id,
//             google_client_secret = EXCLUDED.google_client_secret,
//             google_calendar_refresh_token = EXCLUDED.google_calendar_refresh_token,
//             google_gmail_refresh_token = EXCLUDED.google_gmail_refresh_token,
//             google_calendar_id = EXCLUDED.google_calendar_id,
//             admin_email = EXCLUDED.admin_email,
//             google_email = EXCLUDED.google_email,
//             default_slot_duration = EXCLUDED.default_slot_duration,
//             max_booking_days = EXCLUDED.max_booking_days,
//             min_booking_hours = EXCLUDED.min_booking_hours,
//             hospital_api_key = EXCLUDED.hospital_api_key,
//             vapi_api_base_url = EXCLUDED.vapi_api_base_url,
//             vapi_private_api_key = EXCLUDED.vapi_private_api_key,
//             vapi_feedback_assistant_id = EXCLUDED.vapi_feedback_assistant_id,
//             vapi_phone_number_id = EXCLUDED.vapi_phone_number_id,
//             feedback_call_delay_minutes = EXCLUDED.feedback_call_delay_minutes,
//             superadmin_email = EXCLUDED.superadmin_email,
//             calendly_pat = EXCLUDED.calendly_pat,
//             ezy_vet_partner_id = EXCLUDED.ezy_vet_partner_id,
//             ezy_vet_client_id = EXCLUDED.ezy_vet_client_id,
//             ezy_vet_client_secret = EXCLUDED.ezy_vet_client_secret,
//             ezy_vet_grant_type = EXCLUDED.ezy_vet_grant_type,
//             ezy_vet_scope = EXCLUDED.ezy_vet_scope,
//             ezy_vet_site_uid = EXCLUDED.ezy_vet_site_uid,
//             updated_at = CURRENT_TIMESTAMP
//     `;

//     const values = [
//         encryptedData.hospital_id,
//         encryptedData.vapi_api_key,
//         encryptedData.vapi_assistant_id,
//         encryptedData.google_client_id,
//         encryptedData.google_client_secret,
//         encryptedData.google_calendar_refresh_token,
//         encryptedData.google_gmail_refresh_token,
//         encryptedData.google_calendar_id,
//         encryptedData.admin_email,
//         encryptedData.google_email,
//         encryptedData.default_slot_duration,
//         encryptedData.max_booking_days,
//         encryptedData.min_booking_hours,
//         encryptedData.hospital_api_key,
//         encryptedData.vapi_api_base_url,
//         encryptedData.vapi_private_api_key,
//         encryptedData.vapi_feedback_assistant_id,
//         encryptedData.vapi_phone_number_id,
//         encryptedData.feedback_call_delay_minutes,
//         encryptedData.superadmin_email,
//         encryptedData.calendly_pat,
//         encryptedData.ezy_vet_partner_id,
//         encryptedData.ezy_vet_client_id,
//         encryptedData.ezy_vet_client_secret,
//         encryptedData.ezy_vet_grant_type,
//         encryptedData.ezy_vet_scope,
//         encryptedData.ezy_vet_site_uid
//     ];

//     const result = await executeQuery(sql, values);
//     return result;
// }

// // ==============================
// // 📥 GET CREDENTIALS (with UPPERCASE keys)
// // ==============================
// async function getCredentials(hospitalId) {
//     if (!hospitalId) {
//         throw new Error('hospital_id is required');
//     }

//     const sql = `
//         SELECT 
//             hospital_id,
//             vapi_api_key,
//             vapi_assistant_id,
//             google_client_id,
//             google_client_secret,
//             google_calendar_refresh_token,
//             google_gmail_refresh_token,
//             google_calendar_id,
//             admin_email,
//             google_email,
//             default_slot_duration,
//             max_booking_days,
//             min_booking_hours,
//             hospital_api_key,
//             vapi_api_base_url,
//             vapi_private_api_key,
//             vapi_feedback_assistant_id,
//             vapi_phone_number_id,
//             feedback_call_delay_minutes,
//             superadmin_email,
//             calendly_pat,
//             ezy_vet_partner_id,
//             ezy_vet_client_id,
//             ezy_vet_client_secret,
//             ezy_vet_grant_type,
//             ezy_vet_scope,
//             ezy_vet_site_uid,
//             created_at,
//             updated_at
//         FROM vet_desk_ai_crendatials
//         WHERE hospital_id = $1
//     `;

//     const result = await executeQuery(sql, [hospitalId]);

//     if (result.rows.length === 0) {
//         throw new Error(`No credentials found for hospital_id: ${hospitalId}`);
//     }

//     const row = result.rows[0];

//     // 🔓 Decrypt ALL sensitive fields
//     const decryptedData = decryptSensitiveFields(row);

//     // 📤 Convert all keys to UPPERCASE
//     const dataWithUppercaseKeys = toUpperCaseKeys(decryptedData);

//     return dataWithUppercaseKeys;
// }

// // ==============================
// // 🔍 CHECK IF CREDENTIALS EXIST
// // ==============================
// async function credentialsExist(hospitalId) {
//     const sql = `SELECT COUNT(*) as count FROM vet_desk_ai_crendatials WHERE hospital_id = $1`;
//     const result = await executeQuery(sql, [hospitalId]);
//     return parseInt(result.rows[0].count) > 0;
// }







// // ==============================
// // 🗑️ DELETE CREDENTIALS
// // ==============================
// async function deleteCredentials(hospitalId) {
//     if (!hospitalId) {
//         throw new Error('hospital_id is required');
//     }

//     const sql = `
//         DELETE FROM vet_desk_ai_crendatials
//         WHERE hospital_id = $1
//         RETURNING hospital_id
//     `;

//     const result = await executeQuery(sql, [hospitalId]);
//     return result.rows[0] || null; // null if no row existed for that hospital_id
// }



// // ==============================
// // 📤 EXPORTS
// // ==============================
// module.exports = {
//     saveCredentials,
//     getCredentials,
//     credentialsExist,
//     deleteCredentials,
//     SENSITIVE_COLUMNS
// };


















// ==============================
// 🔌 Import database with executeQuery
// ==============================
const { encrypt, decrypt } = require('../utils/encryption');
const { executeQuery } = require('../config/database');

// ==============================
// 🔑 KEY TRANSFORMER: Convert all object keys to UPPERCASE
// ==============================
function toUpperCaseKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => toUpperCaseKeys(item));
    }
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const newKey = key.toUpperCase();
        newObj[newKey] = toUpperCaseKeys(value);
    }
    return newObj;
}

// ==============================
// 🔐 SENSITIVE COLUMNS - ALL COLUMNS EXCEPT hospital_id, hospital_name,
// main_vapi_assistant_name, feedback_vapi_assistant_name, created_at, updated_at
// ==============================
const SENSITIVE_COLUMNS = [
    // VAPI related
    'vapi_api_key',
    'vapi_assistant_id',
    'vapi_api_base_url',
    'vapi_private_api_key',
    'vapi_feedback_assistant_id',
    'vapi_phone_number_id',

    // Google related
    'google_client_id',
    'google_client_secret',
    'google_calendar_refresh_token',
    'google_gmail_refresh_token',
    'google_calendar_id',
    'google_email',

    // Hospital related
    'admin_email',
    'superadmin_email',
    'hospital_api_key',

    // Appointment settings
    'default_slot_duration',
    'max_booking_days',
    'min_booking_hours',
    'feedback_call_delay_minutes',

    // Calendly
    'calendly_pat',

    // EzyVet related
    'ezy_vet_partner_id',
    'ezy_vet_client_id',
    'ezy_vet_client_secret',
    'ezy_vet_grant_type',
    'ezy_vet_scope',
    'ezy_vet_site_uid'
];

// ==============================
// 🔐 ENCRYPTION HELPERS
// ==============================
function encryptSensitiveFields(data) {
    const encryptedData = { ...data };
    SENSITIVE_COLUMNS.forEach((column) => {
        if (encryptedData[column] !== null && encryptedData[column] !== undefined) {
            encryptedData[column] = encrypt(encryptedData[column]);
        }
    });
    return encryptedData;
}

function decryptSensitiveFields(data) {
    const decryptedData = { ...data };
    SENSITIVE_COLUMNS.forEach((column) => {
        if (decryptedData[column]) {
            try {
                decryptedData[column] = decrypt(decryptedData[column]);
            } catch (err) {
                console.error(`Failed to decrypt column ${column}:`, err.message);
                decryptedData[column] = null;
            }
        }
    });
    return decryptedData;
}

// ==============================
// 📝 SAVE CREDENTIALS (INSERT / UPSERT)
// ==============================
async function saveCredentials(data) {
    const {
        hospital_id,
        hospital_name,
        vapi_api_key,
        vapi_assistant_id,
        main_vapi_assistant_name,
        feedback_vapi_assistant_name,
        google_client_id,
        google_client_secret,
        google_calendar_refresh_token,
        google_gmail_refresh_token,
        google_calendar_id,
        admin_email,
        google_email,
        default_slot_duration,
        max_booking_days,
        min_booking_hours,
        hospital_api_key,
        vapi_api_base_url,
        vapi_private_api_key,
        vapi_feedback_assistant_id,
        vapi_phone_number_id,
        feedback_call_delay_minutes,
        superadmin_email,
        calendly_pat,
        ezy_vet_partner_id,
        ezy_vet_client_id,
        ezy_vet_client_secret,
        ezy_vet_grant_type,
        ezy_vet_scope,
        ezy_vet_site_uid
    } = data;

    if (!hospital_id) {
        throw new Error('hospital_id is required');
    }

    const rawData = {
        hospital_id,
        hospital_name,
        vapi_api_key,
        vapi_assistant_id,
        main_vapi_assistant_name,
        feedback_vapi_assistant_name,
        google_client_id,
        google_client_secret,
        google_calendar_refresh_token,
        google_gmail_refresh_token,
        google_calendar_id,
        admin_email,
        google_email,
        default_slot_duration,
        max_booking_days,
        min_booking_hours,
        hospital_api_key,
        vapi_api_base_url,
        vapi_private_api_key,
        vapi_feedback_assistant_id,
        vapi_phone_number_id,
        feedback_call_delay_minutes,
        superadmin_email,
        calendly_pat,
        ezy_vet_partner_id,
        ezy_vet_client_id,
        ezy_vet_client_secret,
        ezy_vet_grant_type,
        ezy_vet_scope,
        ezy_vet_site_uid
    };

    // 🔐 Encrypt sensitive fields only (hospital_name and the assistant name
    // columns are plain text, not in SENSITIVE_COLUMNS, so left untouched)
    const encryptedData = encryptSensitiveFields(rawData);

//     const sql = `
//         INSERT INTO vet_desk_ai_crendatials (
//             hospital_id,
//             hospital_name,
//             vapi_api_key,
//             vapi_assistant_id,
//             main_vapi_assistant_name,
//             feedback_vapi_assistant_name,
//             google_client_id,
//             google_client_secret,
//             google_calendar_refresh_token,
//             google_gmail_refresh_token,
//             google_calendar_id,
//             admin_email,
//             google_email,
//             default_slot_duration,
//             max_booking_days,
//             min_booking_hours,
//             hospital_api_key,
//             vapi_api_base_url,
//             vapi_private_api_key,
//             vapi_feedback_assistant_id,
//             vapi_phone_number_id,
//             feedback_call_delay_minutes,
//             superadmin_email,
//             calendly_pat,
//             ezy_vet_partner_id,
//             ezy_vet_client_id,
//             ezy_vet_client_secret,
//             ezy_vet_grant_type,
//             ezy_vet_scope,
//             ezy_vet_site_uid
//         ) VALUES (
//             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
//             $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
//             $21, $22, $23, $24, $25, $26, $27, $28, $29
//         )
//         ON CONFLICT (hospital_id) 
//         DO UPDATE SET
//             hospital_name = EXCLUDED.hospital_name,
//             vapi_api_key = EXCLUDED.vapi_api_key,
//             vapi_assistant_id = EXCLUDED.vapi_assistant_id,
//             main_vapi_assistant_name = EXCLUDED.main_vapi_assistant_name,
//             feedback_vapi_assistant_name = EXCLUDED.feedback_vapi_assistant_name,
//             google_client_id = EXCLUDED.google_client_id,
//             google_client_secret = EXCLUDED.google_client_secret,
//             google_calendar_refresh_token = EXCLUDED.google_calendar_refresh_token,
//             google_gmail_refresh_token = EXCLUDED.google_gmail_refresh_token,
//             google_calendar_id = EXCLUDED.google_calendar_id,
//             admin_email = EXCLUDED.admin_email,
//             google_email = EXCLUDED.google_email,
//             default_slot_duration = EXCLUDED.default_slot_duration,
//             max_booking_days = EXCLUDED.max_booking_days,
//             min_booking_hours = EXCLUDED.min_booking_hours,
//             hospital_api_key = EXCLUDED.hospital_api_key,
//             vapi_api_base_url = EXCLUDED.vapi_api_base_url,
//             vapi_private_api_key = EXCLUDED.vapi_private_api_key,
//             vapi_feedback_assistant_id = EXCLUDED.vapi_feedback_assistant_id,
//             vapi_phone_number_id = EXCLUDED.vapi_phone_number_id,
//             feedback_call_delay_minutes = EXCLUDED.feedback_call_delay_minutes,
//             superadmin_email = EXCLUDED.superadmin_email,
//             calendly_pat = EXCLUDED.calendly_pat,
//             ezy_vet_partner_id = EXCLUDED.ezy_vet_partner_id,
//             ezy_vet_client_id = EXCLUDED.ezy_vet_client_id,
//             ezy_vet_client_secret = EXCLUDED.ezy_vet_client_secret,
//             ezy_vet_grant_type = EXCLUDED.ezy_vet_grant_type,
//             ezy_vet_scope = EXCLUDED.ezy_vet_scope,
//             ezy_vet_site_uid = EXCLUDED.ezy_vet_site_uid,
//             updated_at = CURRENT_TIMESTAMP
//     `;

//     const values = [
//         encryptedData.hospital_id,
//         encryptedData.hospital_name,
//         encryptedData.vapi_api_key,
//         encryptedData.vapi_assistant_id,
//         encryptedData.main_vapi_assistant_name,
//         encryptedData.feedback_vapi_assistant_name,
//         encryptedData.google_client_id,
//         encryptedData.google_client_secret,
//         encryptedData.google_calendar_refresh_token,
//         encryptedData.google_gmail_refresh_token,
//         encryptedData.google_calendar_id,
//         encryptedData.admin_email,
//         encryptedData.google_email,
//         encryptedData.default_slot_duration,
//         encryptedData.max_booking_days,
//         encryptedData.min_booking_hours,
//         encryptedData.hospital_api_key,
//         encryptedData.vapi_api_base_url,
//         encryptedData.vapi_private_api_key,
//         encryptedData.vapi_feedback_assistant_id,
//         encryptedData.vapi_phone_number_id,
//         encryptedData.feedback_call_delay_minutes,
//         encryptedData.superadmin_email,
//         encryptedData.calendly_pat,
//         encryptedData.ezy_vet_partner_id,
//         encryptedData.ezy_vet_client_id,
//         encryptedData.ezy_vet_client_secret,
//         encryptedData.ezy_vet_grant_type,
//         encryptedData.ezy_vet_scope,
//         encryptedData.ezy_vet_site_uid
//     ];

//     const result = await executeQuery(sql, values);
//     return result;
// }








const sql = `
    INSERT INTO vet_desk_ai_crendatials (
        hospital_id,
        hospital_name,
        vapi_api_key,
        vapi_assistant_id,
        main_vapi_assistant_name,
        feedback_vapi_assistant_name,
        google_client_id,
        google_client_secret,
        google_calendar_refresh_token,
        google_gmail_refresh_token,
        google_calendar_id,
        admin_email,
        google_email,
        default_slot_duration,
        max_booking_days,
        min_booking_hours,
        hospital_api_key,
        vapi_api_base_url,
        vapi_private_api_key,
        vapi_feedback_assistant_id,
        vapi_phone_number_id,
        feedback_call_delay_minutes,
        superadmin_email,
        calendly_pat,
        ezy_vet_partner_id,
        ezy_vet_client_id,
        ezy_vet_client_secret,
        ezy_vet_grant_type,
        ezy_vet_scope,
        ezy_vet_site_uid
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
    )
    ON CONFLICT (hospital_id) 
    DO UPDATE SET
        hospital_name = EXCLUDED.hospital_name,
        vapi_api_key = EXCLUDED.vapi_api_key,
        vapi_assistant_id = EXCLUDED.vapi_assistant_id,
        main_vapi_assistant_name = EXCLUDED.main_vapi_assistant_name,
        feedback_vapi_assistant_name = EXCLUDED.feedback_vapi_assistant_name,
        google_client_id = EXCLUDED.google_client_id,
        google_client_secret = EXCLUDED.google_client_secret,
        google_calendar_refresh_token = EXCLUDED.google_calendar_refresh_token,
        google_gmail_refresh_token = EXCLUDED.google_gmail_refresh_token,
        google_calendar_id = EXCLUDED.google_calendar_id,
        admin_email = EXCLUDED.admin_email,
        google_email = EXCLUDED.google_email,
        default_slot_duration = EXCLUDED.default_slot_duration,
        max_booking_days = EXCLUDED.max_booking_days,
        min_booking_hours = EXCLUDED.min_booking_hours,
        hospital_api_key = EXCLUDED.hospital_api_key,
        vapi_api_base_url = EXCLUDED.vapi_api_base_url,
        vapi_private_api_key = EXCLUDED.vapi_private_api_key,
        vapi_feedback_assistant_id = EXCLUDED.vapi_feedback_assistant_id,
        vapi_phone_number_id = EXCLUDED.vapi_phone_number_id,
        feedback_call_delay_minutes = EXCLUDED.feedback_call_delay_minutes,
        superadmin_email = EXCLUDED.superadmin_email,
        calendly_pat = EXCLUDED.calendly_pat,
        ezy_vet_partner_id = EXCLUDED.ezy_vet_partner_id,
        ezy_vet_client_id = EXCLUDED.ezy_vet_client_id,
        ezy_vet_client_secret = EXCLUDED.ezy_vet_client_secret,
        ezy_vet_grant_type = EXCLUDED.ezy_vet_grant_type,
        ezy_vet_scope = EXCLUDED.ezy_vet_scope,
        ezy_vet_site_uid = EXCLUDED.ezy_vet_site_uid,
        updated_at = CURRENT_TIMESTAMP
`;

const values = [
    encryptedData.hospital_id,               // $1
    encryptedData.hospital_name,              // $2
    encryptedData.vapi_api_key,                // $3
    encryptedData.vapi_assistant_id,           // $4
    encryptedData.main_vapi_assistant_name,    // $5
    encryptedData.feedback_vapi_assistant_name,// $6
    encryptedData.google_client_id,            // $7
    encryptedData.google_client_secret,        // $8
    encryptedData.google_calendar_refresh_token, // $9
    encryptedData.google_gmail_refresh_token,  // $10
    encryptedData.google_calendar_id,          // $11
    encryptedData.admin_email,                 // $12
    encryptedData.google_email,                // $13
    encryptedData.default_slot_duration,       // $14
    encryptedData.max_booking_days,            // $15
    encryptedData.min_booking_hours,           // $16
    encryptedData.hospital_api_key,            // $17
    encryptedData.vapi_api_base_url,           // $18
    encryptedData.vapi_private_api_key,        // $19
    encryptedData.vapi_feedback_assistant_id,  // $20
    encryptedData.vapi_phone_number_id,        // $21
    encryptedData.feedback_call_delay_minutes, // $22
    encryptedData.superadmin_email,            // $23
    encryptedData.calendly_pat,                // $24
    encryptedData.ezy_vet_partner_id,          // $25
    encryptedData.ezy_vet_client_id,           // $26
    encryptedData.ezy_vet_client_secret,       // $27
    encryptedData.ezy_vet_grant_type,          // $28
    encryptedData.ezy_vet_scope,               // $29
    encryptedData.ezy_vet_site_uid             // $30
];

const result = await executeQuery(sql, values);
return result;

}



// ==============================
// 📥 GET CREDENTIALS (with UPPERCASE keys)
// ==============================
async function getCredentials(hospitalId) {
    if (!hospitalId) {
        throw new Error('hospital_id is required');
    }

    const sql = `
        SELECT 
            hospital_id,
            hospital_name,
            vapi_api_key,
            vapi_assistant_id,
            main_vapi_assistant_name,
            feedback_vapi_assistant_name,
            google_client_id,
            google_client_secret,
            google_calendar_refresh_token,
            google_gmail_refresh_token,
            google_calendar_id,
            admin_email,
            google_email,
            default_slot_duration,
            max_booking_days,
            min_booking_hours,
            hospital_api_key,
            vapi_api_base_url,
            vapi_private_api_key,
            vapi_feedback_assistant_id,
            vapi_phone_number_id,
            feedback_call_delay_minutes,
            superadmin_email,
            calendly_pat,
            ezy_vet_partner_id,
            ezy_vet_client_id,
            ezy_vet_client_secret,
            ezy_vet_grant_type,
            ezy_vet_scope,
            ezy_vet_site_uid,
            created_at,
            updated_at
        FROM vet_desk_ai_crendatials
        WHERE hospital_id = $1
    `;

    const result = await executeQuery(sql, [hospitalId]);

    if (result.rows.length === 0) {
        throw new Error(`No credentials found for hospital_id: ${hospitalId}`);
    }

    const row = result.rows[0];

    // 🔓 Decrypt sensitive fields (hospital_name / assistant names pass through untouched)
    const decryptedData = decryptSensitiveFields(row);

    // 📤 Convert all keys to UPPERCASE
    const dataWithUppercaseKeys = toUpperCaseKeys(decryptedData);

    return dataWithUppercaseKeys;
}

// ==============================
// 🔍 CHECK IF CREDENTIALS EXIST
// ==============================
async function credentialsExist(hospitalId) {
    const sql = `SELECT COUNT(*) as count FROM vet_desk_ai_crendatials WHERE hospital_id = $1`;
    const result = await executeQuery(sql, [hospitalId]);
    return parseInt(result.rows[0].count) > 0;
}

// ==============================
// 🗑️ DELETE CREDENTIALS
// ==============================
async function deleteCredentials(hospitalId) {
    if (!hospitalId) {
        throw new Error('hospital_id is required');
    }

    const sql = `
        DELETE FROM vet_desk_ai_crendatials
        WHERE hospital_id = $1
        RETURNING hospital_id
    `;

    const result = await executeQuery(sql, [hospitalId]);
    return result.rows[0] || null;
}

// ==============================
// 📤 EXPORTS
// ==============================
module.exports = {
    saveCredentials,
    getCredentials,
    credentialsExist,
    deleteCredentials,
    SENSITIVE_COLUMNS
};