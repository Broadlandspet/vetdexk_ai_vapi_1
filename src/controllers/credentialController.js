
const credentialService = require('../services/credentialService');

/**
 * Helper: Convert all object keys to lowercase (recursively)
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
 * Hospital ID is taken from the authenticated token, NOT from the request body.
 */
exports.saveCredentials = async (req, res) => {
    try {
        // 🔒 Get hospital ID from token (not from body)
        const hospitalId = req.hospitalId || (req.user && req.user.hospital_id);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                error: 'No hospital associated with this admin'
            });
        }

        const data = req.body;

        // ── 1. Fetch existing credentials (if any) ──
        let existing = {};
        let credentialsExist = false;
        try {
            const fetched = await credentialService.getCredentials(hospitalId);
            existing = toLowerCaseKeys(fetched);
            credentialsExist = true;
        } catch (err) {
            // Not found – start fresh
            credentialsExist = false;
        }

        // ── 2. Merge: only fields from request body will overwrite existing ──
        // Ensure hospital_id is ALWAYS the one from the token
        const merged = {
            ...existing,
            ...data,
            hospital_id: hospitalId   // force token value
        };

        // ── 3. Save merged data ──
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
 * GET /api/credentials
 * Fetch and decrypt credentials for the hospital associated with the token.
 * (No path parameter – hospital_id is taken from the JWT.)
 */



exports.getCredentials = async (req, res) => {
    try {
        let hospitalId;

        // Superadmin: use the ID from the URL parameter
        if (req.user && req.user.role === 'superadmin') {
            hospitalId = req.params.hospitalId;
            if (!hospitalId) {
                return res.status(400).json({
                    success: false,
                    error: 'Hospital ID is required in the URL'
                });
            }
        } else {
            // Regular admin: use hospital ID from the token
            hospitalId = req.hospitalId || (req.user && req.user.hospital_id);
            if (!hospitalId) {
                return res.status(403).json({
                    success: false,
                    error: 'No hospital associated with this admin'
                });
            }
        }

        // Fetch and decrypt
        const decryptedData = await credentialService.getCredentials(hospitalId);

        // 🔒 CRITICAL: This endpoint returns decrypted data.
        // Make sure you have proper authentication/authorization in place.
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
 * Check if credentials exist for a hospital (safe to expose).
 * This remains unchanged – it still accepts a hospital_id in the URL
 * because it's a simple existence check that doesn't expose secrets.
 * (If you want to restrict it, you can also take hospital_id from token.)
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