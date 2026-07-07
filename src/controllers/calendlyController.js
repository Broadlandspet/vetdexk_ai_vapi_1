const CalendlyService = require("../services/calendlyService");

class CalendlyController {

    static async getCurrentUser(req, res) {

        try {

            const user = await CalendlyService.getCurrentUser();

            return res.json({
                success: true,
                data: {
                    userUri: user.uri,
                    organizationUri: user.current_organization,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {

            console.error(error.response?.data || error);

            return res.status(500).json({
                success: false,
                message: error.response?.data || error.message
            });

        }

    }

}

module.exports = CalendlyController;