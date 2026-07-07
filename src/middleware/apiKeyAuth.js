// src/middleware/apiKeyAuth.js
const env = require('../config/env');

const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['authorization'] || req.headers['x-api-key'];
    
    const expectedApiKey = env.HOSPITAL_API_KEY || process.env.HOSPITAL_API_KEY;
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'API key is required'
        });
    }
    
    // Remove 'Bearer ' prefix if present
    const providedKey = apiKey.startsWith('Bearer ') ? apiKey.substring(7) : apiKey;
    
    if (providedKey !== expectedApiKey) {
        return res.status(403).json({
            success: false,
            error: 'Invalid API key'
        });
    }
    
    next();
};

module.exports = apiKeyAuth;