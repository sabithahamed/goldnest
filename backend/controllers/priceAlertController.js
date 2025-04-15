// backend/controllers/priceAlertController.js
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get user's price alerts
// @route   GET /api/users/price-alerts
// @access  Private
const getPriceAlerts = async (req, res) => {
    try {
        // Assuming 'req.user' is populated by the 'protect' middleware
        // If it only contains the ID, you might need to fetch again:
        // const user = await User.findById(req.user._id).select('priceAlerts');
        // res.json(user.priceAlerts || []);
        // But if req.user is the full user document:
        res.json(req.user.priceAlerts || []);
    } catch (error) {
        console.error("Error getting price alerts:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a new price alert
// @route   POST /api/users/price-alerts
// @access  Private
const addPriceAlert = async (req, res) => {
    const { targetPriceLKRPerGram, condition } = req.body;
    const userId = req.user._id;

    // Validation
    if (!targetPriceLKRPerGram || isNaN(targetPriceLKRPerGram) || Number(targetPriceLKRPerGram) <= 0) {
        return res.status(400).json({ message: 'Invalid target price.' });
    }
    if (!condition || !['below', 'above'].includes(condition)) {
        return res.status(400).json({ message: 'Invalid condition (must be "below" or "above").' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Optional: Limit number of alerts per user
        if (user.priceAlerts && user.priceAlerts.length >= 10) { // Example limit
            return res.status(400).json({ message: 'Maximum number of price alerts reached.' });
        }

        const newAlert = {
            targetPriceLKRPerGram: Number(targetPriceLKRPerGram),
            condition: condition,
            isActive: true // Default to active
            // Mongoose will auto-generate _id
        };

        user.priceAlerts.push(newAlert);
        await user.save();

        // Return the newly added alert (the last one in the array)
        const addedAlert = user.priceAlerts[user.priceAlerts.length - 1];
        res.status(201).json(addedAlert);

    } catch (error) {
        console.error("Error adding price alert:", error);
        res.status(500).json({ message: 'Server Error adding price alert' });
    }
};

// @desc    Update a price alert (e.g., toggle isActive)
// @route   PUT /api/users/price-alerts/:id
// @access  Private
const updatePriceAlert = async (req, res) => {
    const { id } = req.params; // Alert ID
    const { isActive } = req.body; // Only allow toggling active status for now
    const userId = req.user._id; // User ID from token

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid alert ID format.' });
    }
    // Validate isActive if it's provided
    if (req.body.hasOwnProperty('isActive') && typeof isActive !== 'boolean') {
         return res.status(400).json({ message: 'Invalid isActive value provided (must be true or false).' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const alert = user.priceAlerts.id(id); // Find the subdocument by its _id
        if (!alert) return res.status(404).json({ message: 'Price alert not found.' });

        // Update fields if they are provided in the request body
        if (req.body.hasOwnProperty('isActive')) {
            alert.isActive = isActive;
            // alert.lastTriggered = null; // Optional: Reset trigger time when toggling?
        }
        // Add other updatable fields here if needed in the future
        // e.g., if (req.body.targetPriceLKRPerGram) { alert.targetPriceLKRPerGram = Number(req.body.targetPriceLKRPerGram); }

        await user.save(); // Save the parent document
        res.json(alert); // Return updated alert subdocument

    } catch (error) {
        console.error("Error updating price alert:", error);
        res.status(500).json({ message: 'Server Error updating price alert' });
    }
};


// @desc    Delete a price alert
// @route   DELETE /api/users/price-alerts/:id
// @access  Private
const deletePriceAlert = async (req, res) => {
    const { id } = req.params; // ID of the alert to delete
    const userId = req.user._id; // User ID from protect middleware

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid alert ID format.' });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // --- Start of Updated Logic ---

        // Find the alert to ensure it exists before attempting removal
        const alertExists = user.priceAlerts.some(alert => alert._id.toString() === id);

        if (!alertExists) {
            return res.status(404).json({ message: 'Price alert not found' });
        }

        // Filter out the alert to be deleted using standard array filter
        // Keep only the alerts whose _id does NOT match the id from params
        user.priceAlerts = user.priceAlerts.filter(alert => alert._id.toString() !== id);

        // --- End of Updated Logic ---

        // Save the user document with the modified priceAlerts array
        await user.save();

        // Respond with success message
        res.status(200).json({ message: 'Price alert deleted successfully' });

    } catch (error) {
        console.error('Error deleting price alert:', error); // Log the full error
        res.status(500).json({ message: 'Server error deleting price alert' });
    }
};


module.exports = {
    getPriceAlerts,
    addPriceAlert,
    updatePriceAlert,
    deletePriceAlert
};