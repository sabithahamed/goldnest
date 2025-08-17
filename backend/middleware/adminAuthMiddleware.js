// backend/middleware/adminAuthMiddleware.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protectAdmin = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token using the ADMIN secret
            const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
            
            // Ensure it's an admin token
            if (!decoded.isAdmin) {
                return res.status(403).json({ message: 'Forbidden: Not an admin token' });
            }

            // Get admin from the token and attach to request object
            req.admin = await Admin.findById(decoded.id).select('-password');
            
            if (!req.admin) {
                 return res.status(401).json({ message: 'Not authorized, admin not found' });
            }

            next(); // Proceed to the protected route
        } catch (error) {
            console.error('Admin auth error:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protectAdmin };