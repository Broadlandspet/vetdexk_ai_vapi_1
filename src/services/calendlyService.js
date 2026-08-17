
const axios = require("axios");
const env = require("../config/env");

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get the current authenticated Calendly user
 */
exports.getCurrentUser = async () => {
    const response = await axios.get(
        "https://api.calendly.com/users/me",
        {
            headers: {
                Authorization: `Bearer ${env.CALENDLY_PAT}`
            }
        }
    );

    return response.data.resource;
};