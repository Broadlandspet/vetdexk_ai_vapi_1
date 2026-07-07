
const UserService = require('../services/userService');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { executeQuery } = require('../config/database'); // for hospital fetch

class AuthController {

    // // Register new user
    // static async register(req, res) {
    //     try {
    //         const { name, email, username, password, role } = req.body;

    //         if (!name || !email || !username || !password) {
    //             return res.status(400).json({
    //                 success: false,
    //                 error: 'Name, email, username, and password are required'
    //             });
    //         }

    //         const user = await UserService.createUser({
    //             name,
    //             email,
    //             username,
    //             password,
    //             role: role || 'user'
    //         });

    //         res.json({
    //             success: true,
    //             data: user,
    //             message: 'User registered successfully'
    //         });

    //     } catch (error) {
    //         logger.error('Error in register:', error);

    //         if (error.code === '23505') {
    //             return res.status(400).json({
    //                 success: false,
    //                 error: 'Email or username already exists'
    //             });
    //         }

    //         res.status(500).json({
    //             success: false,
    //             error: 'Failed to register user'
    //         });
    //     }
    // }

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
            hospital_id,
            mobile_number,
            dob,
            role
        } = req.body;
 
        // Required field validation
        if (
            !name ||
            !email ||
            !username ||
            !password ||
            !hospital_id ||
            !mobile_number ||
            !dob ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, username, password, role, hospital, mobile number and DOB are required.'
            });
        }
 
        // Validate role
        const allowedRoles = ['admin', 'viewer', 'superadmin'];
 
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role. Allowed roles are admin, viewer, and superadmin.'
            });
        }
 
        const user = await UserService.createUser({
            name,
            email,
            username,
            password,
            hospital_id,
            mobile_number,
            dob,
            role
        });
 
        return res.status(201).json({
            success: true,
            data: user,
            message: 'Registration submitted successfully. Please wait for Super Admin approval.'
        });
 
    } catch (error) {
        logger.error('Error in register:', error);
 
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                error: 'Email or username already exists.'
            });
        }
 
        return res.status(500).json({
            success: false,
            error: 'Failed to register user.'
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