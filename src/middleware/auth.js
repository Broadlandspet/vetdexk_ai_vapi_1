const jwt = require('jsonwebtoken');

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'No token provided'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach user info to request
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        req.user = {
            id: decoded.userId,
            role: decoded.role,
            hospital_id: decoded.hospital_id || null   // 👈 added
        };
        // Also attach hospital_id directly for convenience
        req.hospitalId = decoded.hospital_id || null;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

// Check role middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    requireRole,
    JWT_SECRET
};