// backend/routes/adminManagementRoutes.js
const express = require('express');
const router = express.Router();

// --- UPDATED: Import the new controller functions ---
const { 
    getAdmins, 
    createAdmin,
    deleteAdmin,
    updateAdminRole,
    getAdminSessionHistory, // <-- UPDATED
    getAdminActionLogs,
    findAdminByNicOrEmail,
    undoAdminAction     // <-- UPDATED
} = require('../controllers/adminManagementController');

const { protectAdmin, superAdminOnly, confirmPassword } = require('../middleware/adminAuthMiddleware');

// First, protect all routes in this file to ensure an admin is logged in.
router.use(protectAdmin);

// Then, apply superAdminOnly to all routes in this file, as they are all for management.
// This is a cleaner way to protect all endpoints in this module.
router.use(superAdminOnly); 

// --- Routes for creating/viewing admin accounts ---
router.route('/accounts')
    .get(getAdmins)
    .post(createAdmin); // Creating an admin is also sensitive

// --- Apply confirmPassword middleware to sensitive actions ---
router.delete('/accounts/:id', confirmPassword, deleteAdmin);
router.put('/accounts/:id/role', confirmPassword, updateAdminRole);
// ---

router.get('/find-admin', findAdminByNicOrEmail);
router.get('/sessions', getAdminSessionHistory); // <-- This route provides login/logout data
router.get('/actions', getAdminActionLogs);     // <-- This route provides admin action data
router.post('/actions/:id/undo', confirmPassword, undoAdminAction); // Undoing an action is sensitive

module.exports = router;