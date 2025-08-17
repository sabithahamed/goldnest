// backend/routes/adminInventoryRoutes.js
const express = require('express');
const router = express.Router();
const { getInventoryStats, addPhysicalGold } = require('../controllers/adminInventoryController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

// Protect all routes
router.use(protectAdmin);

router.get('/stats', getInventoryStats);
router.post('/add', addPhysicalGold);

module.exports = router;