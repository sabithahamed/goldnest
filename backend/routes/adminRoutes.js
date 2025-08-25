// backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();

// --- IMPORT CONTROLLERS ---
// The loginAdmin function is no longer imported here.
const {
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllRedemptions,
    updateRedemptionStatus,
    getRecentTransactions,
    getUserSignupChartData,
    getTransactionTypeChartData
} = require('../controllers/adminController');

// --- IMPORT MIDDLEWARE ---
const { protectAdmin, confirmPassword } = require('../middleware/adminAuthMiddleware');


// =================================================================================
// PUBLIC ROUTES
// =================================================================================
// The login route has been REMOVED from this file.
// It now exists only in adminAuthRoutes.js


// =================================================================================
// PROTECTED ROUTES (Admin authentication is now required for all routes below)
// =================================================================================
// This middleware will run for every route defined after this point.
// It will verify the JWT and attach the admin user to the request object (req.admin).
router.use(protectAdmin);


// --- Dashboard Routes ---
router.get('/stats/dashboard', getDashboardStats);
router.get('/stats/recent-transactions', getRecentTransactions);
router.get('/stats/user-chart', getUserSignupChartData);
router.get('/stats/transaction-types', getTransactionTypeChartData);


// --- User Management Routes ---
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
// Apply specific 'confirmPassword' middleware for sensitive actions if needed
router.put('/users/:id/status', confirmPassword, updateUserStatus);


// --- Redemption Management Routes ---
router.get('/redemptions', getAllRedemptions);
router.put('/redemptions/:id', updateRedemptionStatus);


module.exports = router;