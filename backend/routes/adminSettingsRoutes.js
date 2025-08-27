// backend/routes/adminSettingsRoutes.js
const express = require('express');
const router = express.Router();
const { 
    getSettings, 
    updateSettings, 
    addGoldPriceEntry // <-- IMPORT
} = require('../controllers/adminSettingsController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { confirmPassword } = require('../middleware/adminAuthMiddleware'); // <-- IMPORT IT

// Protect all routes in this file
router.use(protectAdmin);

router.get('/', getSettings);
router.put('/', confirmPassword, updateSettings); // Apply middleware
router.post('/gold-price', confirmPassword, addGoldPriceEntry); // <-- ADD NEW ROUTE

module.exports = router;