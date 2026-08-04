// services/settingsService.js
const { executeQuery } = require('../config/database');

class SettingsService {
    async get(key) {
        const result = await executeQuery(
            `SELECT value FROM app_settings WHERE key = $1`,
            [key]
        );
        return result.rows[0]?.value || null;
    }

    async set(key, value) {
        await executeQuery(
            `INSERT INTO app_settings (key, value, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, value]
        );
    }
}

module.exports = new SettingsService();