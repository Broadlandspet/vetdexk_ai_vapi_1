
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

class UserService {

    // // Create a new user

    static async createUser(userData) {
    try {
        // Validate role
        const allowedRoles = ['admin', 'viewer', 'superadmin'];
 
        if (!allowedRoles.includes(userData.role)) {
            throw new Error(
                'Invalid role. Allowed roles are admin, viewer, and superadmin.'
            );
        }
 
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);
 
        const result = await executeQuery(
            `
            INSERT INTO users (
                name,
                email,
                username,
                role,
                hospital_id,
                mobile_number,
                dob,
                password_hash,
                registration_status,
                is_active
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10
            )
            RETURNING
                id,
                name,
                email,
                username,
                role,
                hospital_id,
                mobile_number,
                dob,
                registration_status,
                is_active,
                created_at
            `,
            [
                userData.name.trim(),
                userData.email.trim().toLowerCase(),
                userData.username.trim(),
                userData.role,
                userData.hospital_id,
                userData.mobile_number.trim(),
                userData.dob,
                passwordHash,
                'pending',
                false
            ]
        );
 
        logger.info(`User created: ${userData.email}`);
 
        return result.rows[0];
 
    } catch (error) {
        logger.error('Error creating user:', error);
        throw error;
    }
}
 
 
// Get active hospitals for registration
static async getRegistrationHospitals() {
    try {
        const result = await executeQuery(`
            SELECT
                id,
                hospital_name
            FROM hospitals
            WHERE is_active = true
            ORDER BY hospital_name ASC
        `);
 
        return result.rows || [];
 
    } catch (error) {
        logger.error('Error fetching registration hospitals:', error);
        throw error;
    }
}

    // Get user by ID
    static async getUserById(userId) {
        try {
            const result = await executeQuery(
                `SELECT id, name, email, username, role, is_active, created_at, last_login
                 FROM users WHERE id = $1`,
                [userId]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error fetching user:', error);
            return null;
        }
    }

    // Get user by email
    static async getUserByEmail(email) {
        try {
            const result = await executeQuery(
                `SELECT * FROM users WHERE email = $1`,
                [email]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error fetching user by email:', error);
            return null;
        }
    }

    // Get user by username
    static async getUserByUsername(username) {
        try {
            const result = await executeQuery(
                `SELECT * FROM users WHERE username = $1`,
                [username]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error fetching user by username:', error);
            return null;
        }
    }

    // Verify login credentials
    static async verifyLogin(emailOrUsername, password) {
        try {
            const result = await executeQuery(
                `SELECT * FROM users WHERE email = $1 OR username = $1`,
                [emailOrUsername]
            );

            if (result.rows.length === 0) {
                logger.error('User not found:', emailOrUsername);
                return null;
            }

            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                logger.error('Invalid password for:', emailOrUsername);
                return null;
            }

            // Update last login
            await executeQuery(
                `UPDATE users SET last_login = NOW() WHERE id = $1`,
                [user.id]
            );

            const { password_hash, ...userWithoutPassword } = user;
            return userWithoutPassword;

        } catch (error) {
            logger.error('Error verifying login:', error);
            return null;
        }
    }

    // Update user
    static async updateUser(userId, updates) {
        try {
            const allowedUpdates = ['name', 'email', 'username', 'role', 'is_active'];
            const setClauses = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updates)) {
                if (allowedUpdates.includes(key) && value !== undefined) {
                    setClauses.push(`${key} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            }

            if (setClauses.length === 0) {
                return null;
            }

            setClauses.push(`updated_at = NOW()`);
            values.push(userId);

            const result = await executeQuery(
                `UPDATE users SET ${setClauses.join(', ')} 
                 WHERE id = $${paramIndex}
                 RETURNING id, name, email, username, role, is_active, created_at`,
                values
            );

            if (result.rows.length === 0) {
                return null;
            }

            logger.info(`User updated: ${result.rows[0].email}`);
            return result.rows[0];

        } catch (error) {
            logger.error('Error updating user:', error);
            throw error;
        }
    }

    // Change password
    static async changePassword(userId, oldPassword, newPassword) {
        try {
            const result = await executeQuery(
                `SELECT * FROM users WHERE id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = result.rows[0];
            const isValid = await bcrypt.compare(oldPassword, user.password_hash);

            if (!isValid) {
                throw new Error('Invalid current password');
            }

            const saltRounds = 10;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            await executeQuery(
                `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
                [newPasswordHash, userId]
            );

            logger.info(`Password changed for user: ${user.email}`);
            return true;

        } catch (error) {
            logger.error('Error changing password:', error);
            throw error;
        }
    }

    // Delete user (soft delete)
    static async deleteUser(userId) {
        try {
            await executeQuery(
                `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
                [userId]
            );
            logger.info(`User deactivated: ${userId}`);
            return true;
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }

    // Get all users
    static async getAllUsers() {
        try {
            const result = await executeQuery(
                `SELECT id, name, email, username, role, is_active, created_at, last_login
                 FROM users ORDER BY created_at DESC`
            );
            return result.rows || [];
        } catch (error) {
            logger.error('Error fetching all users:', error);
            return [];
        }
    }
}

module.exports = UserService;