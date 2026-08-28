const logger = require('../utils/logger');
const SuperadminService = require('../services/superadminService');
const userService = require('../services/userService')

const credentialsResourceService = require('../services/credentialsResourceService');

const credentialService = require('../services/credentialService');  


const subscriptionService = require('../services/subscriptionService');
const vapiService = require('../services/vapiService');
const { DEACTIVATED_STATIC_ASSISTANT_ID } = require('../config/vapiConfig');



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

        const userCheck = await userService.getUserById(id);
        if (!userCheck) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = await SuperadminService.approveUser(id, req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const { sendApprovalEmail } = require('../services/approvalEmailService');
        sendApprovalEmail({ name: user.name, email: user.email }).catch(err => {
            logger.error(`Approval email failed for user ${user.email}: ${err.message}`);
        });

        res.json({ success: true, data: user, message: 'User approved successfully' });

    } catch (error) {
        logger.error('Error approving user:', error);

        const knownValidationErrors = [
            'Please assign a hospital',
            'already',
            'No subscription found',
            'is not active'
        ];
        if (error.message && knownValidationErrors.some(fragment => error.message.includes(fragment))) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

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




exports.updateCredentials = async (req, res) => {
     console.log('⚡⚡⚡ updateCredentials controller called!');
    try {
        const hospitalId = req.params.hospitalId || req.body.hospital_id;
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required in URL or body.'
            });
        }

        // Allowed fields for update
        const allowedFields = [
            'google_client_id',
            'google_client_secret',
            'google_calendar_refresh_token',
            'google_gmail_refresh_token',
            'admin_email',
            'google_email',
            'ezy_vet_partner_id',
            'ezy_vet_client_id',
            'ezy_vet_client_secret',
            'ezy_vet_grant_type',
            'ezy_vet_scope',
            'ezy_vet_site_uid'
        ];

        // Extract only allowed fields from request body
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update.'
            });
        }

        // Perform the update
        await credentialService.updateCredentialsFields(hospitalId, updateData);

        // Fetch the updated credentials (already returns uppercase keys)
        const updatedCredentials = await credentialService.getCredentials(hospitalId);

        return res.status(200).json({
            success: true,
            message: `Credentials updated for hospital ${hospitalId}.`,
            data: updatedCredentials
        });

    } catch (error) {
        logger.error('Error updating credentials:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update credentials.'
        });
    }
};



// // ==============================
// // UPDATE VAPI PHONE NUMBER ID (SUPERADMIN ONLY)

// // ==============================

// ==============================
// UPDATE VAPI PHONE NUMBER (SUPERADMIN ONLY)
// ==============================
exports.updateVapiPhoneNumber = async (req, res) => {
     console.log('🔥🔥🔥 updateVapiPhoneNumber controller called!');
    try {
        const { hospital_id, vapi_phone_number_id } = req.body;

        if (!hospital_id) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id is required in the body.'
            });
        }

        if (!vapi_phone_number_id) {
            return res.status(400).json({
                success: false,
                message: 'vapi_phone_number_id is required in the body.'
            });
        }

        // ✅ CORRECT: Use the dedicated function that allows vapi_phone_number_id
        await credentialService.updateVapiPhoneNumberId(hospital_id, vapi_phone_number_id);

        // Fetch updated credentials
        const updated = await credentialService.getCredentials(hospital_id);

        return res.status(200).json({
            success: true,
            message: `Vapi phone number updated for hospital ${hospital_id}.`,
            data: updated
        });

    } catch (error) {
        logger.error('Error updating Vapi phone number:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update Vapi phone number.'
        });
    }
};









/**
 * POST /api/superadmin/deactivate-user
 * body: { user_id, hospital_id }
 *
 * 1. Checks the subscription: if cancel_at_period_end === false, status === 'active',
 *    and current_period_end has already passed -> ends the subscription
 *    (cancel_at_period_end = true, status = 'inactive').
 * 2. On success, relinks the hospital's Vapi phone number to the static
 *    fallback assistant (0c574b6a-676f-4316-bd3c-22ab9a0e131d).
 */
exports.deactivateUser = async (req, res) => {
    try {
        const { user_id, hospital_id } = req.body;

        if (!user_id || !hospital_id) {
            return res.status(400).json({
                success: false,
                message: 'user_id and hospital_id are required.'
            });
        }

        const subscription = await subscriptionService.getSubscriptionForUserHospital(user_id, hospital_id);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No subscription found for this user_id/hospital_id.'
            });
        }

        const { current_period_end, cancel_at_period_end, status } = subscription;
        const now = new Date();
        const periodHasEnded = current_period_end && new Date(current_period_end) <= now;

        const eligible = cancel_at_period_end === false && status === 'active' && periodHasEnded;

        if (!eligible) {
            return res.status(400).json({
                success: false,
                message: 'Subscription end process failed because the plan subscription time period is still left.',
                data: {
                    current_period_end,
                    cancel_at_period_end,
                    status,
                    server_time: now
                }
            });
        }

        const updatedSubscription = await subscriptionService.endSubscription(subscription.id);

        // ── Relink phone number to the static fallback assistant ──
        let assistantRelinked = false;
        try {
            const credentials = await credentialService.getCredentials(hospital_id);
            const phoneNumberId = credentials.VAPI_PHONE_NUMBER_ID;

            if (phoneNumberId) {
                await vapiService.linkPhoneNumberToAssistant(phoneNumberId, DEACTIVATED_STATIC_ASSISTANT_ID);
                assistantRelinked = true;
            } else {
                logger.warn(`[deactivate-user] No vapi_phone_number_id stored for hospital ${hospital_id}; skipped Vapi relink.`);
            }
        } catch (vapiErr) {
            // Subscription is already updated in the DB — log but don't fail the whole request
            logger.error(`[deactivate-user] Failed to relink phone number to static assistant: ${vapiErr.message}`);
        }

        return res.status(200).json({
            success: true,
            message: 'Subscription successfully ended and the db data is updated.',
            data: {
                subscription: updatedSubscription,
                assistant_relinked_to_static: assistantRelinked
            }
        });

    } catch (error) {
        logger.error('Error deactivating user:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to deactivate user.'
        });
    }
};

/**
 * POST /api/superadmin/activate-user
 * body: { hospital_id, user_id, subscription_plans_id?, ... }
 *
 * 1. Updates only the fields present in the body.
 * 2. If subscription_plans_id is present, current_period_end is auto-computed
 *    from the plan's interval.
 * 3. On success, relinks the hospital's Vapi phone number back to its own
 *    (real) assistant, undoing the static fallback from deactivate-user.
 */
exports.activateUser = async (req, res) => {
    try {
        const { hospital_id, user_id } = req.body;

        if (!hospital_id || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'hospital_id and user_id are required.'
            });
        }

        const updatedSubscription = await subscriptionService.activateSubscription(user_id, hospital_id, req.body);

        // ── Relink phone number back to the hospital's own assistant ──
        let assistantRelinked = false;
        try {
            const credentials = await credentialService.getCredentials(hospital_id);
            const phoneNumberId = credentials.VAPI_PHONE_NUMBER_ID;
            const assistantId = credentials.VAPI_ASSISTANT_ID;

            if (phoneNumberId && assistantId) {
                await vapiService.linkPhoneNumberToAssistant(phoneNumberId, assistantId);
                assistantRelinked = true;
            } else {
                logger.warn(`[activate-user] Missing vapi_phone_number_id or vapi_assistant_id for hospital ${hospital_id}; skipped Vapi relink.`);
            }
        } catch (vapiErr) {
            logger.error(`[activate-user] Failed to relink phone number to original assistant: ${vapiErr.message}`);
        }

        return res.status(200).json({
            success: true,
            message: 'Subscription activated successfully.',
            data: {
                subscription: updatedSubscription,
                assistant_relinked_to_original: assistantRelinked
            }
        });

    } catch (error) {
        logger.error('Error activating user:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to activate user.'
        });
    }
};