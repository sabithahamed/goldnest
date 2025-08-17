// backend/controllers/adminAuthController.js
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

const generateAdminToken = (id, role) => {
  return jwt.sign({ id, role, isAdmin: true }, process.env.ADMIN_JWT_SECRET, {
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
    // --- THIS IS THE FIX ---
    // We must explicitly ask for the password field because of `select: false` in the schema.
    const admin = await Admin.findOne({ email }).select('+password');
    // --- END OF FIX ---

    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or account disabled.' });
    }

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    // We are not modifying the password here, so we can skip validation
    // to avoid potential issues if other fields were changed.
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