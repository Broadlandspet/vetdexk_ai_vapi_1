const logger = require('../utils/logger');
const SuperadminService = require('../services/superadminService');
const userService = require('../services/userService')

const credentialsResourceService = require('../services/credentialsResourceService');



  // Get all users except Super Admin
exports.getAllUsers=  async (req, res) => {
    try {
        const users = await SuperadminService.getAllUsers();

        return res.status(200).json({
            success: true,
            message: 'Users fetched successfully.',
            count: users.length,
            data: users
        });

    } catch (error) {
        logger.error('Error fetching users:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch users.'
        });
    }
}




exports.getAllHospitals = async (req, res) => {
    try {
        const hospitals = await SuperadminService.getAllHospitals();

        return res.status(200).json({
            success: true,
            message: 'Hospitals fetched successfully.',
            count: hospitals.length,
            data: hospitals
        });

    } catch (error) {
        logger.error('Error fetching hospitals:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch hospitals.'
        });
    }
};

// In superadminController.js
exports.toggleHospitalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active must be a boolean value'
            });
        }

        const hospital = await SuperadminService.toggleHospitalStatus(id, is_active);

        return res.status(200).json({
            success: true,
            message: `Hospital ${is_active ? 'enabled' : 'disabled'} successfully.`,
            data: hospital
        });

    } catch (error) {
        logger.error('Error toggling hospital status:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update hospital status.'
        });
    }
};



// Update user role
exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role is required.'
            });
        }

        const user = await SuperadminService.updateUserRole(id, role);

        return res.status(200).json({
            success: true,
            message: 'User role updated successfully.',
            data: user
        });

    } catch (error) {
        logger.error('Error updating user role:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update user role.'
        });
    }
};

// // Assign hospital to user


// Assign hospital to user (only valid while registration is pending or unset)
exports.assignHospitalToUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { hospital_id } = req.body;

        if (!hospital_id) {
            return res.status(400).json({
                success: false,
                message: 'Hospital ID is required.'
            });
        }

        const user = await SuperadminService.assignHospitalToUser(id, hospital_id);

        return res.status(200).json({
            success: true,
            message: 'Hospital assigned successfully.',
            data: user
        });

    } catch (error) {
        logger.error('Error assigning hospital:', error);

        if (error.message === 'User not found.' || error.message === 'Hospital not found.') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('pending registration')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to assign hospital.'
        });
    }
};


// Activate / Deactivate User
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active must be true or false.'
            });
        }

        const user = await SuperadminService.updateUserStatus(id, is_active);

        return res.status(200).json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully.`,
            data: user
        });

    } catch (error) {
        logger.error('Error updating user status:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update user status.'
        });
    }
};



// Update Hospital
exports.updateHospital = async (req, res) => {
    try {
        const { id } = req.params;

        const hospital = await SuperadminService.updateHospital(id, req.body);

        return res.status(200).json({
            success: true,
            message: 'Hospital updated successfully.',
            data: hospital
        });

    } catch (error) {
        logger.error('Error updating hospital:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update hospital.'
        });
    }
};


// Enable / Disable Hospital
exports.updateHospitalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active must be either true or false.'
            });
        }

        const hospital = await SuperadminService.updateHospitalStatus(
            id,
            is_active
        );

        return res.status(200).json({
            success: true,
            message: `Hospital ${
                is_active ? 'enabled' : 'disabled'
            } successfully.`,
            data: hospital
        });

    } catch (error) {
        logger.error('Error updating hospital status:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update hospital status.'
        });
    }
};


// Create Hospital
exports.createHospital = async (req, res) => {
    try {
        const hospital = await SuperadminService.createHospital(req.body);

        return res.status(201).json({
            success: true,
            message: 'Hospital created successfully.',
            data: hospital
        });

    } catch (error) {
        logger.error('Error creating hospital:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create hospital.'
        });
    }
};



//////get all pending regestartion(superadmin)
// ============================================
// PENDING REGISTRATIONS
// ============================================

exports.getPendingRegistrations = async (req, res) => {
    try {
        const users = await SuperadminService.getPendingRegistrations();

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        logger.error('Error fetching pending registrations:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending registrations'
        });
    }
};

exports.approveUser = async (req, res) => {
    try {
        const { id } = req.params;
 
        // ✅ First, check if user has a hospital_id
        const userCheck = await userService.getUserById(id);
       
        if (!userCheck) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
 
        // ✅ If user doesn't have a hospital_id, return error
        if (!userCheck.hospital_id) {
            return res.status(400).json({
                success: false,
                error: 'Please assign a hospital to the user account before approving the user.'
            });
        }
 
        const user = await SuperadminService.approveUser(
            id,
            req.userId
        );
 
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
 
        // Send approval email to the approved user (non-blocking)
        const { sendApprovalEmail } = require('../services/approvalEmailService');
        sendApprovalEmail({
            name: user.name,
            email: user.email
        }).catch(err => {
            logger.error(`Approval email failed for user ${user.email}: ${err.message}`);
        });
 
        res.json({
            success: true,
            data: user,
            message: 'User approved successfully'
        });
 
    } catch (error) {
        logger.error('Error approving user:', error);
 
        res.status(500).json({
            success: false,
            error: 'Failed to approve user'
        });
    }
};



/////////rejecting users
exports.rejectUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await SuperadminService.rejectUser(
            id,
            req.userId
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user,
            message: 'User registration rejected'
        });

    } catch (error) {
        logger.error('Error rejecting user:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to reject user'
        });
    }
};


/**
 * Delete User (Hard delete - Permanent)
 * DELETE /api/superadmin/users/:id
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if trying to delete self
        if (id === req.userId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account.'
            });
        }

        const user = await SuperadminService.deleteUser(id);

        return res.status(200).json({
            success: true,
            message: `User ${user.name} deleted successfully.`,
            data: user
        });

    } catch (error) {
        logger.error('Error deleting user:', error);

        // Handle specific error messages
        if (error.message === 'User not found.') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Cannot delete Super Admin user.') {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete user.'
        });
    }
};

/**
 * Delete Hospital (Hard delete - Permanent)
 * DELETE /api/superadmin/hospitals/:id
 */
exports.deleteHospital = async (req, res) => {
    try {
        const { id } = req.params;

        const hospital = await SuperadminService.deleteHospital(id);

        return res.status(200).json({
            success: true,
            message: `Hospital ${hospital.hospital_name} deleted successfully.`,
            data: hospital
        });

    } catch (error) {
        logger.error('Error deleting hospital:', error);

        // Handle specific error messages
        if (error.message === 'Hospital not found.') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('Cannot delete hospital')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete hospital.'
        });
    }
};

/**
 * Full onboarding: import phone number, create transfer tool,
 * create main + feedback assistants, link phone number, save credentials.
 * POST /api/superadmin/credentials-resources
 */
exports.createCredentialsResources = async (req, res) => {
    try {
        const result = await credentialsResourceService.createCredentialsResources(req.body);

        return res.status(201).json({
            success: true,
            message: `AI calling resources created and credentials saved for hospital ${result.hospital_id}.`,
            data: result
        });

    } catch (error) {
        logger.error('Error creating credentials resources:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create credentials resources.'
        });
    }
};






/**
 * Delete a hospital's AI calling resources (Vapi phone number + both
 * assistants) and its credentials row in vet_desk_ai_crendatials.
 * Accepts hospital_id either as a URL param (DELETE /credentials-resources/:hospitalId)
 * or in the request body (POST /credentials-resources/delete).
 */
exports.deleteCredentialsResources = async (req, res) => {
    try {
        const hospitalId = req.body.hospital_id || req.params.hospitalId;

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required.'
            });
        }

        const result = await credentialsResourceService.deleteCredentialsResources(hospitalId);
        const allSucceeded = result.errors.length === 0;

        return res.status(allSucceeded ? 200 : 207).json({
            success: allSucceeded,
            message: allSucceeded
                ? `All AI calling resources and credentials deleted for hospital ${hospitalId}.`
                : `Some resources for hospital ${hospitalId} could not be deleted — see data.errors.`,
            data: result
        });

    } catch (error) {
        logger.error('Error deleting credentials resources:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete credentials resources.',
            data: error.partialResults || null
        });
    }
};