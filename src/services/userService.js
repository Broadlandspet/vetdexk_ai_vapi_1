
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

class UserService {

    // // Create a new user



static async createUser(userData) {
    try {
        // Validate required fields
        if (!userData.name) {
            throw new Error('Name is required');
        }
        if (!userData.email) {
            throw new Error('Email is required');
        }
        if (!userData.username) {
            throw new Error('Username is required');
        }
        if (!userData.password) {
            throw new Error('Password is required');
        }
        if (!userData.mobile_number) {
            throw new Error('Mobile number is required');
        }
 
        // ✅ Set default role to 'admin' if not provided
        const role = userData.role || 'admin';
 
        // Validate role
        const allowedRoles = ['superadmin', 'admin', 'user', 'viewer'];
        if (!allowedRoles.includes(role)) {
            throw new Error('Invalid role. Allowed roles are superadmin, admin, user, and viewer.');
        }
 
        // Validate registration status
        const allowedStatuses = ['pending', 'approved', 'rejected'];
        const registrationStatus = userData.registration_status || 'pending';
        if (!allowedStatuses.includes(registrationStatus)) {
            throw new Error('Invalid registration status. Allowed statuses are pending, approved, and rejected.');
        }
 
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);
 
        // ✅ Insert user with all fields - role is now properly defined
        const result = await executeQuery(
            `
            INSERT INTO users (
                name,
                email,
                username,
                role,
                password_hash,
                is_active,
                mobile_number,
                dob,
                registration_status,
                hospital_id,
                demo_request_id,
                plan_id,
                plan_name,
                plan_price,
                plan_currency,
                plan_interval,
                plan_status,
                payment_status,
                registration_source,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
            RETURNING
                id,
                name,
                email,
                username,
                role,
                is_active,
                mobile_number,
                dob,
                registration_status,
                hospital_id,
                demo_request_id,
                plan_id,
                plan_name,
                plan_price,
                plan_currency,
                plan_interval,
                plan_status,
                payment_status,
                registration_source,
                created_at,
                updated_at
            `,
            [
                userData.name.trim(),
                userData.email.trim().toLowerCase(),
                userData.username.trim(),
                role, // ✅ Now properly defined as 'admin' by default
                passwordHash,
                false, // is_active: false until approved
                userData.mobile_number.trim(),
                userData.dob || null,
                registrationStatus,
                null, // hospital_id: null until assigned
                userData.demo_request_id || null,
                userData.plan_id || null,
                userData.plan_name || null,
                userData.plan_price || null,
                userData.plan_currency || '$',
                userData.plan_interval || 'month',
                'pending', // plan_status
                'completed', // payment_status: payment already done
                userData.source || 'demo_feedback_payment'
            ]
        );
 
        const newUser = result.rows[0];
 
        // Update book_demo with user reference
        if (userData.demo_request_id) {
            await executeQuery(
                `UPDATE book_demo
                 SET
                   payment_status = 'completed',
                   status = 'registered',
                   updated_at = NOW()
                 WHERE id = $1`,
                [userData.demo_request_id]
            );
            logger.info(`Updated demo request ${userData.demo_request_id} with payment status`);
        }
 
        // ✅ Log registration (using console/logger instead of audit_logs)
        logger.info(`User created successfully: ${userData.email} (ID: ${newUser.id})`, {
            name: userData.name,
            email: userData.email,
            username: userData.username,
            role: role,
            mobile_number: userData.mobile_number,
            plan_name: userData.plan_name || null,
            plan_price: userData.plan_price || null,
            demo_request_id: userData.demo_request_id || null,
            registration_status: registrationStatus,
            source: userData.source || 'demo_feedback_payment'
        });
 
        return newUser;
 
    } catch (error) {
        logger.error('Error creating user:', error);
       
        // Handle duplicate key violations
        if (error.code === '23505') {
            if (error.constraint === 'users_email_key') {
                throw new Error('Email already exists');
            } else if (error.constraint === 'users_username_key') {
                throw new Error('Username already exists');
            }
        }
       
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