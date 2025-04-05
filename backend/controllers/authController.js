const User = require('../models/User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, phone, nic, address, city } = req.body; // Get all fields from body

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user (password will be hashed by the pre-save hook in User.js)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone, // Save optional fields too
      nic,
      address,
      city,
      goldBalanceGrams: 0, // Initialize gold balance
    });

    if (user) {
      // Send back user info and token (don't send password back)
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        nic: user.nic,
        address: user.address,
        city: user.city,
        goldBalanceGrams: user.goldBalanceGrams,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: 'Server Error during registration' });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        nic: user.nic,
        address: user.address,
        city: user.city,
        goldBalanceGrams: user.goldBalanceGrams,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' }); // 401 Unauthorized
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server Error during login' });
  }
};

module.exports = { registerUser, loginUser };