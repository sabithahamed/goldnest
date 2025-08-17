// backend/routes/promoRoutes.js
const express = require('express');
const router = express.Router();
const { validatePromoCode } = require('../controllers/promoController');
const { protect } = require('../middleware/authMiddleware'); // Use standard user protection

// Protect all routes
router.use(protect);

router.post('/validate', validatePromoCode);

module.exports = router;