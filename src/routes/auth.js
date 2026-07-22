const express = require('express');
const AuthController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get(
    '/hospitals',
    AuthController.getRegistrationHospitals
);
 

// Protected routes
router.get('/profile', verifyToken, AuthController.getProfile);
router.put('/profile', verifyToken, AuthController.updateProfile);
router.post('/change-password', verifyToken, AuthController.changePassword);

// Admin only routes
router.get('/users', verifyToken, requireRole(['admin']), AuthController.getAllUsers);

module.exports = router;