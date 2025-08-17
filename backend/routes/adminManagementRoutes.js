// backend/routes/adminManagementRoutes.js
const express = require('express');
const router = express.Router();
const { getAdmins, createAdmin, getAuditLogs } = require('../controllers/adminManagementController');
const { protectAdmin, superAdminOnly } = require('../middleware/adminAuthMiddleware'); // <-- Import both

// First, protect all routes in this file to ensure only an admin can access them.
router.use(protectAdmin);

// Then, for specific routes, add the superAdminOnly middleware.
// This creates a chain: protectAdmin runs first, then superAdminOnly.
router.get('/accounts', superAdminOnly, getAdmins);
router.post('/accounts', superAdminOnly, createAdmin);
router.get('/audit-log', superAdminOnly, getAuditLogs);

module.exports = router;