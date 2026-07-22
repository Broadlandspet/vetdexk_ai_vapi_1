// const UserService = require('../services/userService');
// const logger = require('../utils/logger');
// const jwt = require('jsonwebtoken');
// const { JWT_SECRET } = require('../middleware/auth');
// const { executeQuery } = require('../config/database'); // for hospital fetch

// class AuthController {


//     // // Login user
//     static async login(req, res) {
//         try {
//             const { emailOrUsername, password } = req.body;

//             if (!emailOrUsername || !password) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Email/Username and password are required'
//                 });
//             }

//             const user = await UserService.verifyLogin(emailOrUsername, password);

//             if (!user) {
//                 return res.status(401).json({
//                     success: false,
//                     error: 'Invalid credentials'
//                 });
//             }

//             if (!user.is_active) {
//                 return res.status(401).json({
//                     success: false,
//                     error: 'Account is deactivated'
//                 });
//             }

//             // ---------- FETCH HOSPITAL DETAILS ----------
//             let hospital = null;
//             if (user.hospital_id) {
//                 const hospitalResult = await executeQuery(
//                     `SELECT id, 
//                             hospital_name, 
//                             hospital_number, 
//                             hospital_address, 
//                             hospital_email
//                      FROM hospitals 
//                      WHERE id = $1`,
//                     [user.hospital_id]
//                 );
//                 if (hospitalResult.rows.length > 0) {
//                     hospital = hospitalResult.rows[0];
//                 }
//             }

//             // Generate JWT token - NOW INCLUDING hospital_id
//             const token = jwt.sign(
//                 { 
//                     userId: user.id, 
//                     email: user.email, 
//                     role: user.role,
//                     hospital_id: user.hospital_id || null   // 👈 added
//                 },
//                 JWT_SECRET,
//                 { expiresIn: '7d' }
//             );

//             // Build response user object with hospital fields
//             const userResponse = {
//                 id: user.id,
//                 name: user.name,
//                 email: user.email,
//                 username: user.username,
//                 role: user.role,
//                 hospital_id: user.hospital_id || null,
//                 hospital_name: hospital?.hospital_name || null,
//                 hospital_number: hospital?.hospital_number || null,
//                 hospital_address: hospital?.hospital_address || null,
//                 hospital_email: hospital?.hospital_email || null
//             };

//             res.json({
//                 success: true,
//                 data: {
//                     user: userResponse,
//                     token
//                 },
//                 message: 'Login successful'
//             });

//         } catch (error) {
//             logger.error('Error in login:', error);
//             res.status(500).json({
//                 success: false,
//                 error: 'Failed to login'
//             });
//         }
//     }





// static async register(req, res) {
//         try {
//             const {
//                 name,
//                 email,
//                 username,
//                 password,
//                 mobile_number,
//                 role = 'admin',
//                 plan_id,
//                 plan_name,
//                 plan_price,
//                 plan_currency,
//                 plan_interval,
//                 demo_request_id,
//                 source = 'demo_feedback_payment'
//             } = req.body;
 
//             // Validate required fields
//             if (!name) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Name is required'
//                 });
//             }
 
//             if (!email) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Email is required'
//                 });
//             }
 
//             if (!username) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Username is required'
//                 });
//             }
 
//             if (!password) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Password is required'
//                 });
//             }
 
//             if (!mobile_number) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Mobile number is required'
//                 });
//             }
 
//             // Validate email format
//             const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//             if (!emailPattern.test(email)) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Invalid email format'
//                 });
//             }
 
//             // Validate mobile number format (minimum 10 digits)
//            // Validate phone
//             const phonePattern = /^[0-9+\-\s()]{7,20}$/;
//             if (!phonePattern.test(hospitalPhone)) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Invalid phone number'
//                 });
//             }
 
//             // Validate role
//             const allowedRoles = ['admin', 'viewer', 'user'];
//             if (role && !allowedRoles.includes(role)) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Invalid role. Allowed roles are admin, viewer, and user'
//                 });
//             }
 
//             // Create user with pending status
//             const user = await UserService.createUser({
//                 name,
//                 email,
//                 username,
//                 password,
//                 mobile_number: mobile_number.trim(),
//                 role: role || 'admin',
//                 plan_id,
//                 plan_name,
//                 plan_price,
//                 plan_currency,
//                 plan_interval,
//                 demo_request_id,
//                 registration_status: 'pending',
//                 is_active: false,
//                 source: source
//             });
 
//             res.json({
//                 success: true,
//                 data: user,
//                 message: 'Registration submitted successfully. Awaiting Super Admin approval.'
//             });
 
//         } catch (error) {
//             logger.error('Error in register:', error);
 
//             // Handle specific errors
//             if (error.message === 'Email already exists') {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Email already exists. Please use a different email.'
//                 });
//             }
 
//             if (error.message === 'Username already exists') {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Username already exists. Please choose a different username.'
//                 });
//             }
 
//             if (error.message === 'Mobile number is required') {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Mobile number is required'
//                 });
//             }
 
//             res.status(500).json({
//                 success: false,
//                 error: error.message || 'Failed to register user'
//             });
//         }
//     }


//     // ── POST: /api/auth/forgot-password ──
//     static async forgotPassword(req, res) {
//         try {
//             const { email } = req.body;
 
//             if (!email) {
//                 return res.status(400).json({ success: false, error: 'Email is required.' });
//             }
 
//             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//             if (!emailRegex.test(email)) {
//                 return res.status(400).json({ success: false, error: 'Invalid email format.' });
//             }
 
//             // 1. Check if user exists
//             const userResult = await executeQuery(
//                 `SELECT id, email FROM users WHERE email = $1`,
//                 [email]
//             );
 
//             // 🔐 SECURITY: If user doesn't exist, we still send a success response to prevent email scraping.
//             if (userResult.rows.length === 0) {
//                 return res.status(200).json({
//                     success: true,
//                     message: 'If an account exists, a reset link has been sent.'
//                 });
//             }
 
//             const user = userResult.rows[0];
 
//             // 2. Generate a secure random token and expiry (1 hour from now)
//             const resetToken = crypto.randomBytes(32).toString('hex');
//             const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
 
//             // 3. Store token in database
//             await executeQuery(
//                 `UPDATE users
//                  SET reset_password_token = $1, reset_password_expiry = $2
//                  WHERE id = $3`,
//                 [resetToken, expiryTime, user.id]
//             );
 
//             // 4. Construct the reset link (Frontend URL)
//             const forgotpasswordurl = process.env.FORGOT_PASSWORD_URL || 'http://localhost:3000';
//             const resetLink = `${forgotpasswordurl}/reset-password/${resetToken}`;
 
         
// const subject = 'VetDesk.ai - Password Reset Request';
// const htmlContent = `
// <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; color: #1e293b;">
 
//     <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 24px 0;">Password Reset Request</h1>
 
//     <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>
 
//     <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
//         We received a request to reset the password for the VetDesk.ai account associated with
//         <strong>${email}</strong>.
//     </p>
 
//     <p style="font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
//         Click the button below to create a new password. This link is valid for <strong>1 hour</strong>.
//     </p>
 
//     <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
//         <tr>
//             <td style="border-radius: 6px; background-color: #2563eb;">
//                 <a href="${resetLink}"
//                    style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
//                     Reset Password
//                 </a>
//             </td>
//         </tr>
//     </table>
 
//     <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 8px 0;">
//         Or copy and paste this link into your browser:
//     </p>
//     <p style="font-size: 13px; line-height: 1.5; color: #2563eb; word-break: break-all; margin: 0 0 32px 0;">
//         ${resetLink}
//     </p>
 
//     <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 32px 0;">
//         If you didn't request this, you can safely ignore this email — your password will remain unchanged.
//     </p>
 
//     <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px 0;">
 
//     <p style="font-size: 12px; color: #94a3b8; margin: 0;">
//         This is an automated message from VetDesk.ai. Please do not reply directly to this email.
//     </p>
 
// </div>
// `;
 
 
 
 
 
 
//             // 6. Send Email using your existing GmailService (Wait for it to finish)
//             // ⚠️ NOTE: Because Gmail API can be slow, this could delay the response to the user.
//             // You can choose to "fire and forget" by removing `await`, but you lose error handling.
//             await EmailService.sendEmailViaGmailAPI({
//                 to: email,
//                 subject: subject,
//                 html: htmlContent
//             });
 
//             return res.status(200).json({
//                 success: true,
//                 message: 'If an account exists, a reset link has been sent.'
//             });
 
//         } catch (error) {
//             logger.error('Forgot password error:', error);
//             return res.status(500).json({
//                 success: false,
//                 error: 'An error occurred while processing your request.'
//             });
//         }
//     }
 
//     // ── POST: /api/auth/reset-password ──
//     static async resetPassword(req, res) {
//         try {
//             const { token, newPassword, confirmPassword } = req.body;
 
//             if (!token || !newPassword || !confirmPassword) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Token, new password, and confirm password are required.'
//                 });
//             }
 
//             if (newPassword !== confirmPassword) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Passwords do not match.'
//                 });
//             }
 
//             if (newPassword.length < 8) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Password must be at least 8 characters long.'
//                 });
//             }
 
//             // 1. Validate Token directly in Controller
//             const userResult = await executeQuery(
//                 `SELECT id, email FROM users
//                  WHERE reset_password_token = $1
//                  AND reset_password_expiry > NOW()`,
//                 [token]
//             );
 
//             if (userResult.rows.length === 0) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Invalid or expired reset token.'
//                 });
//             }
 
//             const user = userResult.rows[0];
 
//             // 2. Hash the new password
//             const saltRounds = 10;
//             const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
 
//             // 3. Update password and clear the token fields
//             await executeQuery(
//                 `UPDATE users
//                  SET password_hash = $1, reset_password_token = NULL, reset_password_expiry = NULL
//                  WHERE id = $2`,
//                 [hashedPassword, user.id]
//             );
 
//             return res.status(200).json({
//                 success: true,
//                 message: 'Password has been reset successfully. You can now log in with your new password.'
//             });
 
//         } catch (error) {
//             logger.error('Reset password error:', error);
//             return res.status(500).json({
//                 success: false,
//                 error: 'An error occurred while resetting your password.'
//             });
//         }
//     }


    





 
// // Get active hospitals for registration
// static async getRegistrationHospitals(req, res) {
//     try {
//         const hospitals = await UserService.getRegistrationHospitals();
 
//         return res.status(200).json({
//             success: true,
//             message: 'Hospitals fetched successfully.',
//             count: hospitals.length,
//             data: hospitals
//         });
 
//     } catch (error) {
//         logger.error('Error fetching hospitals:', error);
 
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch hospitals.'
//         });
//     }
// }
 
 
//     // Get current user profile
//     static async getProfile(req, res) {
//         try {
//             const userId = req.userId;
//             const user = await UserService.getUserById(userId);

//             if (!user) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'User not found'
//                 });
//             }

//             res.json({
//                 success: true,
//                 data: user
//             });

//         } catch (error) {
//             logger.error('Error fetching profile:', error);
//             res.status(500).json({
//                 success: false,
//                 error: 'Failed to fetch profile'
//             });
//         }
//     }

//     // Update user profile
//     static async updateProfile(req, res) {
//         try {
//             const userId = req.userId;
//             const updates = req.body;

//             const updatedUser = await UserService.updateUser(userId, updates);

//             if (!updatedUser) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'User not found'
//                 });
//             }

//             res.json({
//                 success: true,
//                 data: updatedUser,
//                 message: 'Profile updated successfully'
//             });

//         } catch (error) {
//             logger.error('Error updating profile:', error);
//             res.status(500).json({
//                 success: false,
//                 error: 'Failed to update profile'
//             });
//         }
//     }

//     // Change password
//     static async changePassword(req, res) {
//         try {
//             const userId = req.userId;
//             const { oldPassword, newPassword } = req.body;

//             if (!oldPassword || !newPassword) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Old password and new password are required'
//                 });
//             }

//             await UserService.changePassword(userId, oldPassword, newPassword);

//             res.json({
//                 success: true,
//                 message: 'Password changed successfully'
//             });

//         } catch (error) {
//             logger.error('Error changing password:', error);
//             res.status(500).json({
//                 success: false,
//                 error: error.message || 'Failed to change password'
//             });
//         }
//     }

//     // Get all users (admin only)
//     static async getAllUsers(req, res) {
//         try {
//             const users = await UserService.getAllUsers();

//             res.json({
//                 success: true,
//                 data: users,
//                 count: users.length
//             });

//         } catch (error) {
//             logger.error('Error fetching users:', error);
//             res.status(500).json({
//                 success: false,
//                 error: 'Failed to fetch users'
//             });
//         }
//     }
// }

// module.exports = AuthController;









const UserService = require('../services/userService');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { executeQuery } = require('../config/database'); // for hospital fetch
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const EmailService = require('../services/emailService'); // ✅ Added missing import

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
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
                hospital_id: user.hospital_id || null
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
};

/**
 * Register a new user (pending approval)
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
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

        // ✅ FIX: use mobile_number (not hospitalPhone)
        const phonePattern = /^[0-9+\-\s()]{7,20}$/;
        if (!phonePattern.test(mobile_number)) {
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
};

/**
 * Forgot password – send reset link
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format.' });
        }

        // 1. Check if user exists
        const userResult = await executeQuery(
            `SELECT id, email FROM users WHERE email = $1`,
            [email]
        );

        // 🔐 SECURITY: If user doesn't exist, we still send a success response to prevent email scraping.
        if (userResult.rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists, a reset link has been sent.'
            });
        }

        const user = userResult.rows[0];

        // 2. Generate a secure random token and expiry (1 hour from now)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

        // 3. Store token in database
        await executeQuery(
            `UPDATE users
             SET reset_password_token = $1, reset_password_expiry = $2
             WHERE id = $3`,
            [resetToken, expiryTime, user.id]
        );

        // 4. Construct the reset link (Frontend URL)
        const forgotpasswordurl = process.env.FORGOT_PASSWORD_URL || 'http://localhost:3000';
        const resetLink = `${forgotpasswordurl}/reset-password/${resetToken}`;

        const subject = 'VetDesk.ai - Password Reset Request';
        const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; color: #1e293b;">

    <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 24px 0;">Password Reset Request</h1>

    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>

    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        We received a request to reset the password for the VetDesk.ai account associated with
        <strong>${email}</strong>.
    </p>

    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
        Click the button below to create a new password. This link is valid for <strong>1 hour</strong>.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
        <tr>
            <td style="border-radius: 6px; background-color: #2563eb;">
                <a href="${resetLink}"
                   style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                    Reset Password
                </a>
            </td>
        </tr>
    </table>

    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 8px 0;">
        Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #2563eb; word-break: break-all; margin: 0 0 32px 0;">
        ${resetLink}
    </p>

    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 32px 0;">
        If you didn't request this, you can safely ignore this email — your password will remain unchanged.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px 0;">

    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        This is an automated message from VetDesk.ai. Please do not reply directly to this email.
    </p>

</div>
`;

        // 6. Send Email using your existing GmailService (Wait for it to finish)
        await EmailService.sendEmailViaGmailAPI({
            to: email,
            subject: subject,
            html: htmlContent
        });

        return res.status(200).json({
            success: true,
            message: 'If an account exists, a reset link has been sent.'
        });

    } catch (error) {
        logger.error('Forgot password error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while processing your request.'
        });
    }
};

/**
 * Reset password using token
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token, new password, and confirm password are required.'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match.'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long.'
            });
        }

        // 1. Validate Token directly in Controller
        const userResult = await executeQuery(
            `SELECT id, email FROM users
             WHERE reset_password_token = $1
             AND reset_password_expiry > NOW()`,
            [token]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token.'
            });
        }

        const user = userResult.rows[0];

        // 2. Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // 3. Update password and clear the token fields
        await executeQuery(
            `UPDATE users
             SET password_hash = $1, reset_password_token = NULL, reset_password_expiry = NULL
             WHERE id = $2`,
            [hashedPassword, user.id]
        );

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });

    } catch (error) {
        logger.error('Reset password error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while resetting your password.'
        });
    }
};

/**
 * Get active hospitals for registration dropdown
 * GET /api/auth/hospitals
 */
exports.getRegistrationHospitals = async (req, res) => {
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
};

/**
 * Get current user profile (protected)
 * GET /api/auth/profile
 */
exports.getProfile = async (req, res) => {
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
};

/**
 * Update user profile (protected)
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res) => {
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
};

/**
 * Change password (protected)
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
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
};

/**
 * Get all users (admin only)
 * GET /api/auth/users
 */
exports.getAllUsers = async (req, res) => {
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
};