// backend/routes/sellRoutes.js
const express = require('express');
const { sellGold } = require('../controllers/sellController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect the sell route
router.post('/gold', protect, sellGold);

module.exports = router;