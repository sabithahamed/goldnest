const express = require('express');
const { makeInvestment } = require('../controllers/investmentController');
const { protect } = require('../middleware/authMiddleware'); // Import the protect middleware

const router = express.Router();

// Apply the 'protect' middleware to this route
// Any request to POST /api/investments/invest must have a valid token
router.post('/invest', protect, makeInvestment);

// Add other investment-related routes here later if needed

module.exports = router;