const aiService = require('../services/aiSuggestionService');

// @desc    Get investment timing suggestion (Personalized)
// @route   GET /api/ai/investment-timing
// @access  Private
const getTimingSuggestion = async (req, res) => {
    try {
        // Pass user data to the service
        const suggestion = await aiService.getInvestmentTimingSuggestion(req.user);
        res.json({ suggestion });
    } catch (error) {
        console.error("Error in getTimingSuggestion controller:", error);
        res.status(500).json({ message: 'Server error fetching AI suggestion' });
    }
};

// @desc    Get monthly growth forecast % (Market Focused)
// @route   GET /api/ai/monthly-forecast
// @access  Public
const getForecast = async (req, res) => {
    try {
        const forecast = await aiService.getMonthlyGrowthForecast();
         // We expect just the percentage string here based on the service function modification
        res.json({ forecast }); // e.g., { forecast: "+2.1%" }
    } catch (error) {
        console.error("Error in getForecast controller:", error);
        res.status(500).json({ message: 'Server error fetching AI forecast' });
    }
};

// @desc    Get dashboard overview suggestion (Personalized)
// @route   GET /api/ai/dashboard-overview
// @access  Private
const getOverview = async (req, res) => {
    try {
        // Pass user data to the service
        const overview = await aiService.getDashboardOverviewSuggestion(req.user);
        res.json({ overview });
    } catch (error) {
        console.error("Error in getOverview controller:", error);
        res.status(500).json({ message: 'Server error fetching AI overview' });
    }
};

// @desc    Get price trend summary (Market Focused)
// @route   GET /api/ai/trend-summary
// @access  Public
const getTrendSummary = async (req, res) => {
    try {
        const summary = await aiService.getPriceTrendSummary();
        res.json({ summary });
    } catch (error) {
        console.error("Error in getTrendSummary controller:", error);
        res.status(500).json({ message: 'Server error fetching AI trend summary' });
    }
};

const getMarketOutlook = async (req, res) => {
    try {
        const outlook = await aiService.getMarketOutlookSuggestion();
        res.json({ outlook });
    } catch (error) {
        console.error("Error in getMarketOutlook controller:", error);
        res.status(500).json({ message: 'Server error fetching AI market outlook' });
    }
};

module.exports = {
    getTimingSuggestion,
    getForecast,
    getOverview,
    getTrendSummary,
    getMarketOutlook, // <-- EXPORT NEW FUNCTION
};
