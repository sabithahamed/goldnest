// backend/controllers/marketController.js
const { getGoldMarketSummary, loadGoldData } = require('../utils/goldDataUtils'); // <-- IMPORT loadGoldData

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


// @desc    Get all historical gold data for charting
// @route   GET /api/market/historical-data
// @access  Public
const getHistoricalGoldData = (req, res) => {
    try {
        const allData = loadGoldData(); // This loads and sorts the data (newest first)
        
        // Reverse the data so it's chronological for charting (oldest first)
        const chronologicalData = [...allData].reverse();

        // Format data for Chart.js
        const labels = chronologicalData.map(d => d.DateStr);
        const prices = chronologicalData.map(d => d.LKR_per_Oz / 31.1034768); // Convert to price per gram

        res.json({ labels, prices });
    } catch (error) {
        console.error("Error getting historical gold data:", error);
        res.status(500).json({ message: "Server error fetching historical data." });
    }
};

module.exports = { getGoldSummary, getHistoricalGoldData };