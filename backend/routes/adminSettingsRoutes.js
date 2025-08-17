// backend/routes/adminSettingsRoutes.js
const express = require('express');
const router = express.Router();
const { 
    getSettings, 
    updateSettings, 
    addGoldPriceEntry // <-- IMPORT
} = require('../controllers/adminSettingsController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

// Protect all routes in this file
router.use(protectAdmin);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/gold-price', addGoldPriceEntry); // <-- ADD NEW ROUTE

module.exports = router;