// backend/routes/redeemRoutes.js
const express = require('express');
const { requestRedemption } = require('../controllers/redeemController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect the redemption route
router.post('/', protect, requestRedemption); // POST /api/redeem

module.exports = router;