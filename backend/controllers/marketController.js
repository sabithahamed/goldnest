// backend/controllers/marketController.js
const { getGoldMarketSummary } = require('../utils/goldDataUtils');

// @desc    Get latest gold market summary (price, change, etc.)
// @route   GET /api/market/gold-summary
// @access  Public (market data is public)
const getGoldSummary = (req, res) => {
    try {
        const summary = getGoldMarketSummary();
        res.json(summary);
    } catch (error) {
        console.error("Error getting gold market summary:", error);
        res.status(500).json({ message: "Server error fetching market data." });
    }
};

module.exports = { getGoldSummary };