// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { 
    getDashboardStats, 
    getAllUsers, 
    getUserById,           
    updateUserStatus,       
    getAllRedemptions,
    updateRedemptionStatus,
    getRecentTransactions,
    getUserSignupChartData,
    getTransactionTypeChartData // <-- IMPORT
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { confirmPassword } = require('../middleware/adminAuthMiddleware'); // <-- IMPORT IT

router.use(protectAdmin);

// Dashboard Routes
router.get('/stats/dashboard', getDashboardStats);
router.get('/stats/recent-transactions', getRecentTransactions);
router.get('/stats/user-chart', getUserSignupChartData);
router.get('/stats/transaction-types', getTransactionTypeChartData); // <-- ADD THIS

// User Management Routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);          
router.put('/users/:id/status', updateUserStatus); 

// Redemption Management Routes
router.get('/redemptions', getAllRedemptions);
router.put('/redemptions/:id', updateRedemptionStatus);
router.put('/users/:id/status', confirmPassword, updateUserStatus); // <-- ADD MIDDLEWARE

module.exports = router;