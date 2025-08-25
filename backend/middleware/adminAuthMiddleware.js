// backend/middleware/adminAuthMiddleware.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware to protect routes and ensure the user is an admin
const protectAdmin = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
            
            if (!decoded.isAdmin) {
                 return res.status(403).json({ message: 'Forbidden: Not an admin token.' });
            }

            // Explicitly select the fields needed by our application downstream
            req.admin = await Admin.findById(decoded.id).select('firstName lastName email role isActive');
            
            // Attach sessionId to req.admin for easy access in logout
            if (decoded.sessionId) {
                if (req.admin) {
                    req.admin.sessionId = decoded.sessionId;
                }
            }

            if (!req.admin || !req.admin.isActive) {
                return res.status(401).json({ message: 'Not authorized, admin not found or inactive.' });
            }
            next();
        } catch (error) {
            console.error('Admin auth middleware error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed.' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token.' });
    }
};

// Middleware to ensure the logged-in admin has the 'superadmin' role
const superAdminOnly = (req, res, next) => {
    if (req.admin && req.admin.role === 'superadmin') {
        next();
    } else {
        // --- THIS IS THE FIX: Changed '4SAP' back to '403' ---
        res.status(403).json({ message: 'Forbidden: Super admin access required.' });
    }
};

// Middleware to confirm the admin's password for sensitive actions
const confirmPassword = async (req, res, next) => {
    if (req.admin.role === 'superadmin') {
        return next();
    }

    const { confirmationPassword } = req.body;

    if (!confirmationPassword) {
        return res.status(401).json({ message: 'Password confirmation is required for this action.' });
    }

    try {
        const adminWithPassword = await Admin.findById(req.admin._id).select('+password');
        if (!adminWithPassword) {
            return res.status(404).json({ message: 'Admin not found.' });
        }
        
        const isMatch = await adminWithPassword.matchPassword(confirmationPassword);

        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password. Action denied.' });
        }
        
        next();
    } catch (error) {
        console.error("Error in confirmPassword middleware:", error);
        res.status(500).json({ message: 'Server error during password confirmation.' });
    }
};


module.exports = { protectAdmin, superAdminOnly, confirmPassword };