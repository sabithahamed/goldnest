// backend/routes/adminInventoryRoutes.js
const express = require('express');
const router = express.Router();
const { getInventoryStats, addPhysicalGold, reducePhysicalGold } = require('../controllers/adminInventoryController');
const { protectAdmin, superAdminOnly, confirmPassword, forceConfirmPassword } = require('../middleware/adminAuthMiddleware');

// Protect all routes
router.use(protectAdmin);

router.get('/stats', getInventoryStats);
router.post('/add', confirmPassword, addPhysicalGold);

router.post('/reduce', superAdminOnly, forceConfirmPassword, reducePhysicalGold);
module.exports = router;