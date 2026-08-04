const express = require('express');
const router = express.Router();
const credentialController = require('../controllers/credentialController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

/**
 * POST /api/credentials
 * Body: {
 *   hospital_id: "123",
 *   vapi_api_key: "...",
 *   vapi_assistant_id: "...",
 *   google_client_id: "...",
 *   google_client_secret: "...",
 *   ... (all other fields)
 * }
 */

router.post('/', apiKeyAuth, credentialController.saveCredentials);

/**
 * GET /api/credentials/:hospitalId
 * Returns decrypted credentials for the hospital
 * Example: GET /api/credentials/1
 */
router.get('/:hospitalId', apiKeyAuth, credentialController.getCredentials);

/**
 * GET /api/credentials/:hospitalId/exists
 * Check if credentials exist
 * Example: GET /api/credentials/1/exists
 */
router.get('/:hospitalId/exists', apiKeyAuth, credentialController.checkCredentialsExist);

module.exports = router;