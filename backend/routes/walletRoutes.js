// backend/routes/walletRoutes.js
const express = require('express');
const { depositFunds, withdrawFunds } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All wallet routes should be protected
router.use(protect);

router.post('/deposit', depositFunds);
router.post('/withdraw', withdrawFunds);

module.exports = router;