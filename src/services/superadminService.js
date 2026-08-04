
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get all users except Super Admin
 */
exports.getAllUsers = async function() {
    try {
        exports.deleteExpiredRejectedUsers();
        const result = await executeQuery(`
            SELECT
                u.id,
                u.name,
                u.email,
                u.username,
                u.mobile_number,
                u.dob,
                u.role,
                u.is_active,
                u.registration_status,
                u.created_at,
                u.last_login,
                u.hospital_id,
                h.hospital_name
            FROM users u
            LEFT JOIN hospitals h
                ON u.hospital_id = h.id
            WHERE u.role != 'superadmin'
            ORDER BY u.created_at DESC
        `);

        return result.rows || [];
    } catch (error) {
        logger.error('Error fetching users:', error);
        throw error;
    }
};

/**
 * Get all hospitals
 */
exports.getAllHospitals = async function() {
    try {
        const result = await executeQuery(`
            SELECT
                id,
                hospital_name,
                hospital_number,
                hospital_email,
                hospital_address,
                created_at,
                is_active,
                updated_at
            FROM hospitals
            ORDER BY created_at DESC
        `);

        return result.rows || [];
    } catch (error) {
        logger.error('Error fetching hospitals:', error);
        throw error;
    }
};

/**
 * Toggle hospital active status
 */
exports.toggleHospitalStatus = async function(hospitalId, isActive) {
    try {
        const result = await executeQuery(
            `
            UPDATE hospitals 
            SET 
                is_active = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, hospital_name, is_active, updated_at
            `,
            [isActive, hospitalId]
        );

        if (result.rowCount === 0) {
            throw new Error('Hospital not found');
        }

        return result.rows[0];
    } catch (error) {
        logger.error('Error toggling hospital status:', error);
        throw error;
    }
};

/**
 * Update user role
 */
exports.updateUserRole = async function(userId, role) {
    try {
        const allowedRoles = ['admin', 'superadmin'];

        if (!allowedRoles.includes(role)) {
            throw new Error('Role must be either admin or superadmin.');
        }

        const result = await executeQuery(
            `
            UPDATE users
            SET role = $1
            WHERE id = $2
            RETURNING
                id,
                name,
                email,
                username,
                role,
                is_active
            `,
            [role, userId]
        );

        if (result.rows.length === 0) {
            throw new Error('User not found.');
        }

        return result.rows[0];

    } catch (error) {
        logger.error('Error updating user role:', error);
        throw error;
    }
};

// /**
//  * Assign hospital to user
//  */
// exports.assignHospitalToUser = async function(userId, hospitalId) {
//     try {
//         // Check if user exists
//         const userResult = await executeQuery(
//             `SELECT id FROM users WHERE id = $1`,
//             [userId]
//         );

//         if (userResult.rows.length === 0) {
//             throw new Error('User not found.');
//         }

//         // Check if hospital exists
//         const hospitalResult = await executeQuery(
//             `SELECT id FROM hospitals WHERE id = $1`,
//             [hospitalId]
//         );

//         if (hospitalResult.rows.length === 0) {
//             throw new Error('Hospital not found.');
//         }

//         // Update hospital assignment
//         const result = await executeQuery(
//             `
//             UPDATE users
//             SET hospital_id = $1
//             WHERE id = $2
//             RETURNING
//                 id,
//                 name,
//                 email,
//                 username,
//                 role,
//                 hospital_id
//             `,
//             [hospitalId, userId]
//         );

//         return result.rows[0];

//     } catch (error) {
//         logger.error('Error assigning hospital to user:', error);
//         throw error;
//     }
// };
/**
 * Assign hospital to user — only allowed while registration is
 * pending (or status hasn't been set yet, i.e. NULL).
 */

exports.assignHospitalToUser = async function(userId, hospitalId) {
    try {
        // Check if user exists and get their registration status
        const userResult = await executeQuery(
            `SELECT id, registration_status FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            throw new Error('User not found.');
        }

        const status = userResult.rows[0].registration_status;

        if (status !== 'pending' && status !== null) {
            throw new Error('Hospital can only be assigned to users with a pending registration.');
        }

        // Check if hospital exists
        const hospitalResult = await executeQuery(
            `SELECT id FROM hospitals WHERE id = $1`,
            [hospitalId]
        );

        if (hospitalResult.rows.length === 0) {
            throw new Error('Hospital not found.');
        }

        // Update hospital assignment
        const result = await executeQuery(
            `
            UPDATE users
            SET hospital_id = $1
            WHERE id = $2
            RETURNING
                id,
                name,
                email,
                username,
                role,
                hospital_id,
                registration_status
            `,
            [hospitalId, userId]
        );

        return result.rows[0];

    } catch (error) {
        logger.error('Error assigning hospital to user:', error);
        throw error;
    }
};




/**
 * Activate / Deactivate User
 */
exports.updateUserStatus = async function(userId, isActive) {
    try {
        // Check if user exists
        const userResult = await executeQuery(
            `
            SELECT id
            FROM users
            WHERE id = $1
            `,
            [userId]
        );

        if (userResult.rows.length === 0) {
            throw new Error('User not found.');
        }

        const result = await executeQuery(
            `
            UPDATE users
            SET
                is_active = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING
                id,
                name,
                email,
                username,
                role,
                is_active
            `,
            [isActive, userId]
        );

        return result.rows[0];

    } catch (error) {
        logger.error('Error updating user status:', error);
        throw error;
    }
};

/**
 * Update Hospital
 */
exports.updateHospital = async function(hospitalId, data) {
    try {
        // Check if hospital exists
        const hospitalResult = await executeQuery(
            `
            SELECT *
            FROM hospitals
            WHERE id = $1
            `,
            [hospitalId]
        );

        if (hospitalResult.rows.length === 0) {
            throw new Error('Hospital not found.');
        }

        const hospital = hospitalResult.rows[0];

        // Validate only the fields that were provided
        if (
            data.hospital_name !== undefined &&
            data.hospital_name !== null &&
            data.hospital_name.trim() === ''
        ) {
            throw new Error('Hospital name cannot be empty.');
        }

        if (
            data.hospital_email !== undefined &&
            data.hospital_email !== null &&
            data.hospital_email.trim() === ''
        ) {
            throw new Error('Hospital email cannot be empty.');
        }

        if (
            data.hospital_number !== undefined &&
            data.hospital_number !== null &&
            data.hospital_number.trim() === ''
        ) {
            throw new Error('Hospital number cannot be empty.');
        }

        if (
            data.hospital_address !== undefined &&
            data.hospital_address !== null &&
            data.hospital_address.trim() === ''
        ) {
            throw new Error('Hospital address cannot be empty.');
        }

        const hospitalName = data.hospital_name ?? hospital.hospital_name;
        const hospitalAddress = data.hospital_address ?? hospital.hospital_address;
        const hospitalNumber = data.hospital_number ?? hospital.hospital_number;
        const hospitalEmail = data.hospital_email ?? hospital.hospital_email;

        const result = await executeQuery(
            `
            UPDATE hospitals
            SET
                hospital_name = $1,
                hospital_address = $2,
                hospital_number = $3,
                hospital_email = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING
                id,
                hospital_name,
                hospital_address,
                hospital_number,
                hospital_email,
                created_at,
                updated_at
            `,
            [
                hospitalName,
                hospitalAddress,
                hospitalNumber,
                hospitalEmail,
                hospitalId
            ]
        );

        return result.rows[0];

    } catch (error) {
        logger.error('Error updating hospital:', error);
        throw error;
    }
};

/**
 * Enable / Disable Hospital
 */
exports.updateHospitalStatus = async function(hospitalId, isActive) {
    try {
        // Check if hospital exists
        const hospitalResult = await executeQuery(
            `
            SELECT id
            FROM hospitals
            WHERE id = $1
            `,
            [hospitalId]
        );

        if (hospitalResult.rows.length === 0) {
            throw new Error('Hospital not found.');
        }

        const result = await executeQuery(
            `
            UPDATE hospitals
            SET
                is_active = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING
                id,
                hospital_name,
                hospital_email,
                hospital_number,
                hospital_address,
                is_active,
                created_at,
                updated_at
            `,
            [isActive, hospitalId]
        );

        return result.rows[0];

    } catch (error) {
        logger.error('Error updating hospital status:', error);
        throw error;
    }
};

/**
 * Create Hospital
 */
exports.createHospital = async function(data) {
    try {
        const {
            hospital_name,
            hospital_address,
            hospital_number,
            hospital_email
        } = data;

        // Validate required fields
        if (!hospital_name || hospital_name.trim() === '') {
            throw new Error('Hospital name is required.');
        }

        if (!hospital_address || hospital_address.trim() === '') {
            throw new Error('Hospital address is required.');
        }

        if (!hospital_number || hospital_number.trim() === '') {
            throw new Error('Hospital number is required.');
        }

        if (!hospital_email || hospital_email.trim() === '') {
            throw new Error('Hospital email is required.');
        }

        // Check if hospital email already exists
        const emailExists = await executeQuery(
            `
            SELECT id
            FROM hospitals
            WHERE LOWER(hospital_email) = LOWER($1)
            `,
            [hospital_email]
        );

        if (emailExists.rows.length > 0) {
            throw new Error('Hospital email already exists.');
        }

        // Check if hospital number already exists
        const numberExists = await executeQuery(
            `
            SELECT id
            FROM hospitals
            WHERE hospital_number = $1
            `,
            [hospital_number]
        );

        if (numberExists.rows.length > 0) {
            throw new Error('Hospital number already exists.');
        }

        const result = await executeQuery(
            `
            INSERT INTO hospitals (
                hospital_name,
                hospital_address,
                hospital_number,
                hospital_email
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
                id,
                hospital_name,
                hospital_address,
                hospital_number,
                hospital_email,
                is_active,
                created_at,
                updated_at
            `,
            [
                hospital_name.trim(),
                hospital_address.trim(),
                hospital_number.trim(),
                hospital_email.trim().toLowerCase()
            ]
        );

        return result.rows[0];

    } catch (error) {
        logger.error('Error creating hospital:', error);
        throw error;
    }
};

/**
 * Get pending registrations
 */
exports.getPendingRegistrations = async function() {
    try {
        exports.deleteExpiredRejectedUsers();
        const result = await executeQuery(`
            SELECT
                u.id,
                u.name,
                u.email,
                u.username,
                u.mobile_number,
                u.dob,
                u.role,
                u.registration_status,
                u.is_active,
                u.created_at,
                u.hospital_id,
                h.hospital_name AS hospital_name
            FROM users u
            LEFT JOIN hospitals h
                ON u.hospital_id = h.id
            WHERE u.registration_status = 'pending'
            ORDER BY u.created_at DESC
        `);

        return result.rows;

    } catch (error) {
        logger.error('Error fetching pending registrations:', error);
        throw error;
    }
};

// /**
//  * Approve user (superadmin)
//  */
// exports.approveUser = async function(userId, approvedBy) {
//     try {
//         const result = await executeQuery(
//             `UPDATE users
//              SET
//                 registration_status = 'approved',
//                 is_active = true,
//                 approved_by = $2,
//                 approved_at = NOW(),
//                 updated_at = NOW()
//              WHERE id = $1
//              RETURNING *`,
//             [userId, approvedBy]
//         );

//         return result.rows[0];
//     } catch (error) {
//         logger.error('Error approving user:', error);
//         throw error;
//     }
// };



exports.approveUser = async function(userId, approvedBy) {
    try {
        // ✅ First check if user exists and has a hospital_id
        const userCheckResult = await executeQuery(
            `SELECT id, hospital_id FROM users WHERE id = $1`,
            [userId]
        );
 
        if (userCheckResult.rows.length === 0) {
            throw new Error('User not found');
        }
 
        const user = userCheckResult.rows[0];
 
        // ✅ Check if user has a hospital assigned
        if (!user.hospital_id) {
            throw new Error('Please assign a hospital to the user account before approving the user.');
        }
 
        // ✅ Proceed with approval
        const result = await executeQuery(
            `UPDATE users
             SET
                registration_status = 'approved',
                is_active = true,
                approved_by = $2,
                approved_at = NOW(),
                updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [userId, approvedBy]
        );
 
        return result.rows[0];
    } catch (error) {
        logger.error('Error approving user:', error);
        throw error;
    }
};






/**
 * Reject user (superadmin)
 */
exports.rejectUser = async function(userId, rejectedBy) {
    try {
        const result = await executeQuery(
            `UPDATE users
             SET
                registration_status = 'rejected',
                is_active = false,
                approved_by = $2,
                rejected_at = NOW(),
                updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [userId, rejectedBy]
        );

        return result.rows[0];
    } catch (error) {
        logger.error('Error rejecting user:', error);
        throw error;
    }
};


/**
 * Hard Delete User (Permanent deletion)
 * Deletes user from database permanently
 */
exports.deleteUser = async function(userId) {
    try {
        // Check if user exists
        const userResult = await executeQuery(
            `SELECT id, role FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            throw new Error('User not found.');
        }

        const user = userResult.rows[0];

        // Prevent deleting superadmin
        if (user.role === 'superadmin') {
            throw new Error('Cannot delete Super Admin user.');
        }

        // Check if user is trying to delete themselves
        // This check should also be in controller

        // Permanently delete user
        const result = await executeQuery(
            `DELETE FROM users 
             WHERE id = $1 AND role != 'superadmin'
             RETURNING id, name, email, username, role`,
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('User cannot be deleted.');
        }

        return result.rows[0];

    } catch (error) {
        logger.error('Error deleting user:', error);
        throw error;
    }
};

/**
 * Hard Delete Hospital (Permanent deletion)
 * Deletes hospital from database permanently
 */
exports.deleteHospital = async function(hospitalId) {
    try {
        // Check if hospital exists
        const hospitalResult = await executeQuery(
            `SELECT id, hospital_name FROM hospitals WHERE id = $1`,
            [hospitalId]
        );

        if (hospitalResult.rows.length === 0) {
            throw new Error('Hospital not found.');
        }

        // Check if there are users assigned to this hospital
        const usersResult = await executeQuery(
            `SELECT COUNT(*) as user_count FROM users WHERE hospital_id = $1`,
            [hospitalId]
        );

        const userCount = parseInt(usersResult.rows[0].user_count);

        if (userCount > 0) {
            throw new Error(
                `Cannot delete hospital "${hospitalResult.rows[0].hospital_name}" because it has ${userCount} user(s) assigned. Please reassign or delete the users first.`
            );
        }

        // Permanently delete hospital
        const result = await executeQuery(
            `DELETE FROM hospitals 
             WHERE id = $1 
             RETURNING id, hospital_name, hospital_number, hospital_email, hospital_address`,
            [hospitalId]
        );

        if (result.rows.length === 0) {
            throw new Error('Hospital cannot be deleted.');
        }

        return result.rows[0];

    } catch (error) {
        logger.error('Error deleting hospital:', error);
        throw error;
    }
};



/**
 * Permanently delete users whose registration was rejected
 * more than 15 days ago. Called opportunistically from read
 * paths rather than on a schedule.
 */
exports.deleteExpiredRejectedUsers = async function() {
    try {
        const result = await executeQuery(
            `DELETE FROM users
             WHERE registration_status = 'rejected'
               AND rejected_at IS NOT NULL
               AND rejected_at < NOW() - INTERVAL '15 days'
             RETURNING id, name, email`
        );

        if (result.rows.length > 0) {
            logger.info(`Cleanup: deleted ${result.rows.length} rejected user(s) past the 15-day retention window.`);
        }

        return result.rows;
    } catch (error) {
        // Don't let cleanup failures break the actual request
        logger.error('Error deleting expired rejected users:', error);
        return [];
    }
};