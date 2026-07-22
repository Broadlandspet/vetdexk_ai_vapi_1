// const { executeQuery } = require('../config/database');
// const logger = require('../utils/logger');
// const bcrypt = require('bcrypt');

// class superadminService {




// // Get all users except Super Admin
// static async getAllUsers() {
//     try {
//         const result = await executeQuery(`
//             SELECT
//                 u.id,
//                 u.name,
//                 u.email,
//                 u.username,
//                 u.mobile_number,
//                 u.dob,
//                 u.role,
//                 u.is_active,
//                 u.registration_status,
//                 u.created_at,
//                 u.last_login,
//                 u.hospital_id,
//                 h.hospital_name
//             FROM users u
//             LEFT JOIN hospitals h
//                 ON u.hospital_id = h.id
//             WHERE u.role != 'superadmin'
//             ORDER BY u.created_at DESC
//         `);

//         return result.rows || [];
//     } catch (error) {
//         logger.error('Error fetching users:', error);
//         throw error;
//     }
// }


// // Get all hospitals
// static async getAllHospitals() {
//     try {
//         const result = await executeQuery(`
//             SELECT
//                 id,
//                 hospital_name,
//                 hospital_number,
//                 hospital_email,
//                 hospital_address,
//                 created_at,
//                 is_active,
//                 updated_at
//             FROM hospitals
//             ORDER BY created_at DESC
//         `);

//         return result.rows || [];
//     } catch (error) {
//         logger.error('Error fetching hospitals:', error);
//         throw error;
//     }
// }

// // In SuperadminService.js
// static async toggleHospitalStatus(hospitalId, isActive) {
//     try {
//         const result = await executeQuery(
//             `
//             UPDATE hospitals 
//             SET 
//                 is_active = $1,
//                 updated_at = NOW()
//             WHERE id = $2
//             RETURNING id, hospital_name, is_active, updated_at
//             `,
//             [isActive, hospitalId]
//         );

//         if (result.rowCount === 0) {
//             throw new Error('Hospital not found');
//         }

//         return result.rows[0];
//     } catch (error) {
//         logger.error('Error toggling hospital status:', error);
//         throw error;
//     }
// }



// // Update user role
// // Update user role
// static async updateUserRole(userId, role) {
//     try {
//         const allowedRoles = ['admin', 'superadmin'];

//         if (!allowedRoles.includes(role)) {
//             throw new Error('Role must be either admin or superadmin.');
//         }

//         const result = await executeQuery(
//             `
//             UPDATE users
//             SET role = $1
//             WHERE id = $2
//             RETURNING
//                 id,
//                 name,
//                 email,
//                 username,
//                 role,
//                 is_active
//             `,
//             [role, userId]
//         );

//         if (result.rows.length === 0) {
//             throw new Error('User not found.');
//         }

//         return result.rows[0];

//     } catch (error) {
//         logger.error('Error updating user role:', error);
//         throw error;
//     }
// }


// // Assign hospital to user
// static async assignHospitalToUser(userId, hospitalId) {
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
// }



// // Activate / Deactivate User
// static async updateUserStatus(userId, isActive) {
//     try {
//         // Check if user exists
//         const userResult = await executeQuery(
//             `
//             SELECT id
//             FROM users
//             WHERE id = $1
//             `,
//             [userId]
//         );

//         if (userResult.rows.length === 0) {
//             throw new Error('User not found.');
//         }

//         const result = await executeQuery(
//             `
//             UPDATE users
//             SET
//                 is_active = $1,
//                 updated_at = CURRENT_TIMESTAMP
//             WHERE id = $2
//             RETURNING
//                 id,
//                 name,
//                 email,
//                 username,
//                 role,
//                 is_active
//             `,
//             [isActive, userId]
//         );

//         return result.rows[0];

//     } catch (error) {
//         logger.error('Error updating user status:', error);
//         throw error;
//     }
// }

// // Update Hospital
// static async updateHospital(hospitalId, data) {
//     try {
//         // Check if hospital exists
//         const hospitalResult = await executeQuery(
//             `
//             SELECT *
//             FROM hospitals
//             WHERE id = $1
//             `,
//             [hospitalId]
//         );

//         if (hospitalResult.rows.length === 0) {
//             throw new Error('Hospital not found.');
//         }

//         const hospital = hospitalResult.rows[0];
// // Validate only the fields that were provided
// if (
//     data.hospital_name !== undefined &&
//     data.hospital_name !== null &&
//     data.hospital_name.trim() === ''
// ) {
//     throw new Error('Hospital name cannot be empty.');
// }

// if (
//     data.hospital_email !== undefined &&
//     data.hospital_email !== null &&
//     data.hospital_email.trim() === ''
// ) {
//     throw new Error('Hospital email cannot be empty.');
// }

// if (
//     data.hospital_number !== undefined &&
//     data.hospital_number !== null &&
//     data.hospital_number.trim() === ''
// ) {
//     throw new Error('Hospital number cannot be empty.');
// }

// if (
//     data.hospital_address !== undefined &&
//     data.hospital_address !== null &&
//     data.hospital_address.trim() === ''
// ) {
//     throw new Error('Hospital address cannot be empty.');
// }


//         const hospitalName = data.hospital_name ?? hospital.hospital_name;
//         const hospitalAddress = data.hospital_address ?? hospital.hospital_address;
//         const hospitalNumber = data.hospital_number ?? hospital.hospital_number;
//         const hospitalEmail = data.hospital_email ?? hospital.hospital_email;

//         const result = await executeQuery(
//             `
//             UPDATE hospitals
//             SET
//                 hospital_name = $1,
//                 hospital_address = $2,
//                 hospital_number = $3,
//                 hospital_email = $4,
//                 updated_at = CURRENT_TIMESTAMP
//             WHERE id = $5
//             RETURNING
//                 id,
//                 hospital_name,
//                 hospital_address,
//                 hospital_number,
//                 hospital_email,
//                 created_at,
//                 updated_at
//             `,
//             [
//                 hospitalName,
//                 hospitalAddress,
//                 hospitalNumber,
//                 hospitalEmail,
//                 hospitalId
//             ]
//         );

//         return result.rows[0];

//     } catch (error) {
//         logger.error('Error updating hospital:', error);
//         throw error;
//     }
// }


// // Enable / Disable Hospital
// static async updateHospitalStatus(hospitalId, isActive) {
//     try {
//         // Check if hospital exists
//         const hospitalResult = await executeQuery(
//             `
//             SELECT id
//             FROM hospitals
//             WHERE id = $1
//             `,
//             [hospitalId]
//         );

//         if (hospitalResult.rows.length === 0) {
//             throw new Error('Hospital not found.');
//         }

//         const result = await executeQuery(
//             `
//             UPDATE hospitals
//             SET
//                 is_active = $1,
//                 updated_at = CURRENT_TIMESTAMP
//             WHERE id = $2
//             RETURNING
//                 id,
//                 hospital_name,
//                 hospital_email,
//                 hospital_number,
//                 hospital_address,
//                 is_active,
//                 created_at,
//                 updated_at
//             `,
//             [isActive, hospitalId]
//         );

//         return result.rows[0];

//     } catch (error) {
//         logger.error('Error updating hospital status:', error);
//         throw error;
//     }
// }



// // Create Hospital
// static async createHospital(data) {
//     try {
//         const {
//             hospital_name,
//             hospital_address,
//             hospital_number,
//             hospital_email
//         } = data;

//         // Validate required fields
//         if (!hospital_name || hospital_name.trim() === '') {
//             throw new Error('Hospital name is required.');
//         }

//         if (!hospital_address || hospital_address.trim() === '') {
//             throw new Error('Hospital address is required.');
//         }

//         if (!hospital_number || hospital_number.trim() === '') {
//             throw new Error('Hospital number is required.');
//         }

//         if (!hospital_email || hospital_email.trim() === '') {
//             throw new Error('Hospital email is required.');
//         }

//         // Check if hospital email already exists
//         const emailExists = await executeQuery(
//             `
//             SELECT id
//             FROM hospitals
//             WHERE LOWER(hospital_email) = LOWER($1)
//             `,
//             [hospital_email]
//         );

//         if (emailExists.rows.length > 0) {
//             throw new Error('Hospital email already exists.');
//         }

//         // Check if hospital number already exists
//         const numberExists = await executeQuery(
//             `
//             SELECT id
//             FROM hospitals
//             WHERE hospital_number = $1
//             `,
//             [hospital_number]
//         );

//         if (numberExists.rows.length > 0) {
//             throw new Error('Hospital number already exists.');
//         }

//     const result = await executeQuery(
//     `
//     INSERT INTO hospitals (
//         hospital_name,
//         hospital_address,
//         hospital_number,
//         hospital_email
//     )
//     VALUES ($1, $2, $3, $4)
//     RETURNING
//         id,
//         hospital_name,
//         hospital_address,
//         hospital_number,
//         hospital_email,
//         is_active,
//         created_at,
//         updated_at
//     `,
//     [
//         hospital_name.trim(),
//         hospital_address.trim(),
//         hospital_number.trim(),
//         hospital_email.trim().toLowerCase()
//     ]
// );

// return result.rows[0];

       

//     } catch (error) {
//         logger.error('Error creating hospital:', error);
//         throw error;
//     }
// }


// static async getPendingRegistrations() {
//     try {
//         const result = await executeQuery(`
//             SELECT
//                 u.id,
//                 u.name,
//                 u.email,
//                 u.username,
//                 u.mobile_number,
//                 u.dob,
//                 u.role,
//                 u.registration_status,
//                 u.is_active,
//                 u.created_at,
//                 u.hospital_id,
//                 h.hospital_name AS hospital_name
//             FROM users u
//             LEFT JOIN hospitals h
//                 ON u.hospital_id = h.id
//             WHERE u.registration_status = 'pending'
//             ORDER BY u.created_at DESC
//         `);

//         return result.rows;

//     } catch (error) {
//         logger.error('Error fetching pending registrations:', error);
//         throw error;
//     }
// }

// // approve users (superadmin)
// static async approveUser(userId, approvedBy) {
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
// }

// //reject users
// // Reject user (superadmin)
// static async rejectUser(userId, rejectedBy) {
//     try {
//         const result = await executeQuery(
//             `UPDATE users
//              SET
//                 registration_status = 'rejected',
//                 is_active = false,
//                 approved_by = $2,
//                 approved_at = NOW(),
//                 updated_at = NOW()
//              WHERE id = $1
//              RETURNING *`,
//             [userId, rejectedBy]
//         );

//         return result.rows[0];
//     } catch (error) {
//         logger.error('Error rejecting user:', error);
//         throw error;
//     }
// }



// }

// module.exports = superadminService;






const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get all users except Super Admin
 */
exports.getAllUsers = async function() {
    try {
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

/**
 * Assign hospital to user
 */
exports.assignHospitalToUser = async function(userId, hospitalId) {
    try {
        // Check if user exists
        const userResult = await executeQuery(
            `SELECT id FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            throw new Error('User not found.');
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
                hospital_id
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

/**
 * Approve user (superadmin)
 */
exports.approveUser = async function(userId, approvedBy) {
    try {
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
                approved_at = NOW(),
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