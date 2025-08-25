// backend/controllers/adminAuthController.js

const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateAdminToken = (id, role, sessionId) => {
  return jwt.sign({ id, role, sessionId, isAdmin: true }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: '8h',
  });
};

// @desc    Authenticate admin & get token
// @route   POST /api/admin/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or account disabled.' });
    }

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const session = await AdminSession.create({
      adminId: admin._id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      adminEmail: admin.email,
      ipAddress: req.ip,
    });

    res.json({
      _id: admin._id,
      name: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      role: admin.role,
      token: generateAdminToken(admin._id, admin.role, session._id),
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

// @desc    Logout admin
// @route   POST /api/admin/auth/logout
// @access  Private (Admin)
const logoutAdmin = async (req, res) => {
    try {
        const sessionId = req.admin.sessionId;
        if (sessionId) {
            const session = await AdminSession.findById(sessionId);
            if (session && session.status === 'active') {
                session.logoutTime = new Date();
                session.durationMinutes = (session.logoutTime.getTime() - session.loginTime.getTime()) / 60000;
                session.status = 'logged_out';
                await session.save();
            }
        }
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Admin Logout Error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
};

// @desc    Reset admin password using token
// @route   PUT /api/admin/auth/reset-password/:resettoken
// @access  Public
const resetAdminPassword = async (req, res) => {
  const { password } = req.body;
  
  if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  try {
      const hashedToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
      const admin = await Admin.findOne({
          resetPasswordToken: hashedToken,
          resetPasswordExpire: { $gt: Date.now() },
      });

      if (!admin) {
          return res.status(400).json({ message: 'Invalid or expired setup link.' });
      }

      admin.password = password;
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpire = undefined;
      await admin.save();

      res.status(200).json({ message: 'Password has been set successfully. You can now log in.' });

  } catch (error) {
      console.error('Admin Reset Password Controller Error:', error);
      res.status(500).json({ message: 'Server error during password reset.' });
  }
};

// --- THIS IS THE NEW FUNCTION YOU NEED TO ADD ---
// @desc    Validate an admin's session token
// @route   GET /api/admin/auth/validate-session
// @access  Private (Admin)
const validateAdminSession = async (req, res) => {
    try {
        const sessionId = req.admin.sessionId;
        if (!sessionId) {
            return res.status(401).json({ valid: false, message: 'Session ID missing from token.' });
        }

        const session = await AdminSession.findById(sessionId);

        if (session && session.status === 'active') {
            res.json({ valid: true });
        } else {
            res.status(401).json({ valid: false, message: 'Session is invalid or has expired.' });
        }
    } catch (error) {
        console.error("Session validation error:", error);
        res.status(500).json({ valid: false, message: 'Server error during session validation.' });
    }
};


// --- UPDATED EXPORTS ---
module.exports = { 
    loginAdmin, 
    logoutAdmin, 
    resetAdminPassword,
    validateAdminSession // <-- Add the new function to the exports
};