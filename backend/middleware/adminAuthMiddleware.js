// backend/middleware/adminAuthMiddleware.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Middleware to protect routes.
 * Verifies the JWT, checks if it's an admin token, and attaches the admin user to the request.
 */
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
            
            // Attach sessionId to req.admin for easy access in logout and session validation
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

/**
 * Middleware to restrict a route to superadmins only.
 * Must be used AFTER protectAdmin.
 */
const superAdminOnly = (req, res, next) => {
    if (req.admin && req.admin.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Super admin access required.' });
    }
};

/**
 * Middleware for sensitive actions.
 * Bypasses the password check for superadmins but requires it for all other roles.
 * Must be used AFTER protectAdmin.
 */
const confirmPassword = async (req, res, next) => {
    // Superadmins can bypass this standard confirmation for convenience on non-critical actions.
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

/**
 * NEW, STRICTER MIDDLEWARE for critical actions.
 * FORCES password confirmation for ALL roles, including superadmins.
 * This should be used for actions like deleting data or modifying financial reserves.
 * Must be used AFTER protectAdmin.
 */
const forceConfirmPassword = async (req, res, next) => {
    const { confirmationPassword } = req.body;

    if (!confirmationPassword) {
        return res.status(401).json({ message: 'Password confirmation is required for this critical action.' });
    }

    // This is a special string the frontend sends when a superadmin performs a *non-critical* action
    // that uses the standard `confirmPassword` middleware. It allows the bypass.
    // However, for routes using `forceConfirmPassword`, a real password is required,
    // so we explicitly check for and reject this bypass string.
    if (confirmationPassword === 'SUPERADMIN_BYPASS') {
        return res.status(401).json({ message: 'A valid password is required for this action, even for superadmins.' });
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
        console.error("Error in forceConfirmPassword middleware:", error);
        res.status(500).json({ message: 'Server error during password confirmation.' });
    }
};


module.exports = { 
    protectAdmin, 
    superAdminOnly, 
    confirmPassword,
    forceConfirmPassword // Export the new middleware
};