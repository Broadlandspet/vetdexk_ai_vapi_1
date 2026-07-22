const logger = require('../utils/logger');
const SuperadminService = require('../services/superadminService');


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

// Assign hospital to user
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


//approve users (super admin)
exports.approveUser = async (req, res) => {
    try {
        const { id } = req.params;

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

