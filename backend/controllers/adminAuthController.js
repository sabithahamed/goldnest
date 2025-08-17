// backend/controllers/adminAuthController.js
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

const generateAdminToken = (id, role) => {
  return jwt.sign({ id, role, isAdmin: true }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: '8h', // Shorter, more secure session length for admins
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
    // Find admin and explicitly include the password field for comparison
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin || !admin.isActive) {
      // Generic error to prevent revealing which accounts exist or are disabled
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login timestamp for auditing purposes
    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateAdminToken(admin._id, admin.role),
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

module.exports = { loginAdmin };