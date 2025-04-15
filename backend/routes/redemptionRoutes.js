// backend/routes/redemptionRoutes.js
const express = require('express');
const { requestRedemption, getRedemptionHistory } = require('../controllers/redemptionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Protect all redemption routes

router.post('/request', requestRedemption);
router.get('/history', getRedemptionHistory); // Add route to fetch history

module.exports = router;