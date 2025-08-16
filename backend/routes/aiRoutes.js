// backend/routes/aiRoutes.js
const express = require('express');
const {
    getTimingSuggestion,
    getForecast,
    getOverview,
    getTrendSummary,
    getMarketOutlook, // <-- IMPORT getMarketOutlook
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware

const router = express.Router();

// Add 'protect' to routes needing user data
router.get('/investment-timing', protect, getTimingSuggestion); // Needs user context (last purchase)
router.get('/monthly-forecast', getForecast); // Keep public - market focused
router.get('/dashboard-overview', protect, getOverview); // Needs user context (holdings)
router.get('/trend-summary', getTrendSummary); // Keep public - market focused
router.get('/market-outlook', getMarketOutlook); // <-- ADD THIS NEW ROUTE (public)

module.exports = router;
