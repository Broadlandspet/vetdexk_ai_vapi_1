
const UserService = require('../services/userService');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { executeQuery } = require('../config/database'); // for hospital fetch

class AuthController {


    // // Login user
    static async login(req, res) {
        try {
            const { emailOrUsername, password } = req.body;

            if (!emailOrUsername || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email/Username and password are required'
                });
            }

            const user = await UserService.verifyLogin(emailOrUsername, password);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is deactivated'
                });
            }

            // ---------- FETCH HOSPITAL DETAILS ----------
            let hospital = null;
            if (user.hospital_id) {
                const hospitalResult = await executeQuery(
                    `SELECT id, 
                            hospital_name, 
                            hospital_number, 
                            hospital_address, 
                            hospital_email
                     FROM hospitals 
                     WHERE id = $1`,
                    [user.hospital_id]
                );
                if (hospitalResult.rows.length > 0) {
                    hospital = hospitalResult.rows[0];
                }
            }

            // Generate JWT token - NOW INCLUDING hospital_id
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    email: user.email, 
                    role: user.role,
                    hospital_id: user.hospital_id || null   // 👈 added
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Build response user object with hospital fields
            const userResponse = {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                hospital_id: user.hospital_id || null,
                hospital_name: hospital?.hospital_name || null,
                hospital_number: hospital?.hospital_number || null,
                hospital_address: hospital?.hospital_address || null,
                hospital_email: hospital?.hospital_email || null
            };

            res.json({
                success: true,
                data: {
                    user: userResponse,
                    token
                },
                message: 'Login successful'
            });

        } catch (error) {
            logger.error('Error in login:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to login'
            });
        }
    }





static async register(req, res) {
        try {
            const {
                name,
                email,
                username,
                password,
                mobile_number,
                role = 'admin',
                plan_id,
                plan_name,
                plan_price,
                plan_currency,
                plan_interval,
                demo_request_id,
                source = 'demo_feedback_payment'
            } = req.body;
 
            // Validate required fields
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required'
                });
            }
 
            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }
 
            if (!username) {
                return res.status(400).json({
                    success: false,
                    error: 'Username is required'
                });
            }
 
            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: 'Password is required'
                });
            }
 
            if (!mobile_number) {
                return res.status(400).json({
                    success: false,
                    error: 'Mobile number is required'
                });
            }
 
            // Validate email format
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }
 
            // Validate mobile number format (minimum 10 digits)
           // Validate phone
            const phonePattern = /^[0-9+\-\s()]{7,20}$/;
            if (!phonePattern.test(hospitalPhone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone number'
                });
            }
 
            // Validate role
            const allowedRoles = ['admin', 'viewer', 'user'];
            if (role && !allowedRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Allowed roles are admin, viewer, and user'
                });
            }
 
            // Create user with pending status
            const user = await UserService.createUser({
                name,
                email,
                username,
                password,
                mobile_number: mobile_number.trim(),
                role: role || 'admin',
                plan_id,
                plan_name,
                plan_price,
                plan_currency,
                plan_interval,
                demo_request_id,
                registration_status: 'pending',
                is_active: false,
                source: source
            });
 
            res.json({
                success: true,
                data: user,
                message: 'Registration submitted successfully. Awaiting Super Admin approval.'
            });
 
        } catch (error) {
            logger.error('Error in register:', error);
 
            // Handle specific errors
            if (error.message === 'Email already exists') {
                return res.status(400).json({
                    success: false,
                    error: 'Email already exists. Please use a different email.'
                });
            }
 
            if (error.message === 'Username already exists') {
                return res.status(400).json({
                    success: false,
                    error: 'Username already exists. Please choose a different username.'
                });
            }
 
            if (error.message === 'Mobile number is required') {
                return res.status(400).json({
                    success: false,
                    error: 'Mobile number is required'
                });
            }
 
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to register user'
            });
        }
    }
 
// Get active hospitals for registration
static async getRegistrationHospitals(req, res) {
    try {
        const hospitals = await UserService.getRegistrationHospitals();
 
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
}
 
 
 
// static async login(req, res) {
//     try {
//         const { emailOrUsername, password } = req.body;
 
//         if (!emailOrUsername || !password) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Email/Username and password are required'
//             });
//         }
 
//         const user = await UserService.verifyLogin(emailOrUsername, password);
 
//         if (!user) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Invalid credentials'
//             });
//         }
 
//         // Generate JWT token
//         const token = jwt.sign(
//             { userId: user.id, email: user.email, role: user.role },
//             JWT_SECRET,
//             { expiresIn: '7d' }
//         );
 
//         res.json({
//             success: true,
//             data: {
//                 user: {
//                     id: user.id,
//                     name: user.name,
//                     email: user.email,
//                     username: user.username,
//                     role: user.role
//                 },
//                 token
//             },
//             message: 'Login successful'
//         });
 
//     } catch (error) {
//         logger.error('Error in login:', error);
 
//         if (error.message === 'ACCOUNT_PENDING_APPROVAL') {
//             return res.status(403).json({
//                 success: false,
//                 error: 'Your account is pending Super Admin approval'
//             });
//         }
 
//         if (error.message === 'ACCOUNT_DISABLED') {
//             return res.status(403).json({
//                 success: false,
//                 error: 'Your account has been deactivated'
//             });
//         }
 
//         res.status(500).json({
//             success: false,
//             error: 'Failed to login'
//         });
//     }
// }






    // Get current user profile
    static async getProfile(req, res) {
        try {
            const userId = req.userId;
            const user = await UserService.getUserById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            logger.error('Error fetching profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch profile'
            });
        }
    }

    // Update user profile
    static async updateProfile(req, res) {
        try {
            const userId = req.userId;
            const updates = req.body;

            const updatedUser = await UserService.updateUser(userId, updates);

            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                data: updatedUser,
                message: 'Profile updated successfully'
            });

        } catch (error) {
            logger.error('Error updating profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile'
            });
        }
    }

    // Change password
    static async changePassword(req, res) {
        try {
            const userId = req.userId;
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Old password and new password are required'
                });
            }

            await UserService.changePassword(userId, oldPassword, newPassword);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            logger.error('Error changing password:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to change password'
            });
        }
    }

    // Get all users (admin only)
    static async getAllUsers(req, res) {
        try {
            const users = await UserService.getAllUsers();

            res.json({
                success: true,
                data: users,
                count: users.length
            });

        } catch (error) {
            logger.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch users'
            });
        }
    }
}

module.exports = AuthController;