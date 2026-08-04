
const credentialService = require('../services/credentialService');

/**
 * Helper: Convert all object keys to lowercase (recursively)
 * This is needed because credentialService.getCredentials() returns keys in UPPERCASE,
 * but saveCredentials() expects keys in lowercase.
 */
function toLowerCaseKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => toLowerCaseKeys(item));
    }
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        newObj[key.toLowerCase()] = toLowerCaseKeys(value);
    }
    return newObj;
}

/**
 * POST /api/credentials
 * Save or update hospital credentials – ONLY fields passed will be updated.
 * Missing fields will retain their existing values (not set to NULL).
 */
exports.saveCredentials = async (req, res) => {
    try {
        const data = req.body;

        // Validate required field
        if (!data.hospital_id) {
            return res.status(400).json({
                success: false,
                error: 'hospital_id is required'
            });
        }

        const hospitalId = data.hospital_id;

        // ── 1. Fetch existing credentials (if any) ──
        let existing = {};
        let credentialsExist = false;
        try {
            const fetched = await credentialService.getCredentials(hospitalId);
            // getCredentials returns keys in UPPERCASE – convert to lowercase for merge
            existing = toLowerCaseKeys(fetched);
            credentialsExist = true;
        } catch (err) {
            // If not found, we'll start with an empty object
            // (only hospital_id will be used)
            credentialsExist = false;
        }

        // ── 2. Merge: only fields from request body will overwrite existing ──
        const merged = {
            ...existing,
            ...data
        };
        // Ensure hospital_id is correct (use the one from request)
        merged.hospital_id = hospitalId;

        // ── 3. Save merged data (encryption happens inside the service) ──
        await credentialService.saveCredentials(merged);

        const message = credentialsExist
            ? `Credentials for hospital ${hospitalId} updated successfully.`
            : `Credentials for hospital ${hospitalId} created successfully.`;

        res.status(201).json({
            success: true,
            message: message,
            hospital_id: hospitalId
        });

    } catch (error) {
        console.error('Error in saveCredentials:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save credentials. Please check server logs.'
        });
    }
};

/**
 * GET /api/credentials/:hospitalId
 * Fetch and decrypt credentials for a hospital
 */
exports.getCredentials = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'hospital_id is required as a URL parameter'
            });
        }

        // Fetch and decrypt
        const decryptedData = await credentialService.getCredentials(hospitalId);

        // 🔒 CRITICAL: This endpoint returns decrypted data.
        // Make sure you have proper authentication/authorization in place
        // because this exposes ALL sensitive keys.
        res.json({
            success: true,
            data: decryptedData
        });

    } catch (error) {
        console.error('Error in getCredentials:', error);

        if (error.message && error.message.includes('No credentials found')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve credentials.'
        });
    }
};

/**
 * GET /api/credentials/:hospitalId/exists
 * Check if credentials exist for a hospital (safe to expose)
 */
exports.checkCredentialsExist = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                error: 'hospital_id is required as a URL parameter'
            });
        }

        const exists = await credentialService.credentialsExist(hospitalId);
        
        res.json({
            success: true,
            exists,
            hospital_id: hospitalId
        });

    } catch (error) {
        console.error('Error in checkCredentialsExist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check credentials existence.'
        });
    }
};