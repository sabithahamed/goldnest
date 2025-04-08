// backend/controllers/priceAlertController.js
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get user's price alerts
// @route   GET /api/users/price-alerts
// @access  Private
const getPriceAlerts = async (req, res) => {
    try {
        // User object from 'protect' middleware already has the necessary data if populated correctly
        // If not, fetch specifically: const user = await User.findById(req.user._id).select('priceAlerts');
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

        // Return the newly added alert
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
    const { id } = req.params;
    const { isActive } = req.body; // Only allow toggling active status for now
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid alert ID format.' });
    }
    if (typeof isActive !== 'boolean') {
         return res.status(400).json({ message: 'Invalid isActive value provided.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const alert = user.priceAlerts.id(id);
        if (!alert) return res.status(404).json({ message: 'Price alert not found.' });

        alert.isActive = isActive;
        // alert.lastTriggered = null; // Reset trigger time when toggling? Optional.

        await user.save();
        res.json(alert); // Return updated alert

    } catch (error) {
        console.error("Error updating price alert:", error);
        res.status(500).json({ message: 'Server Error updating price alert' });
    }
};


// @desc    Delete a price alert
// @route   DELETE /api/users/price-alerts/:id
// @access  Private
const deletePriceAlert = async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid alert ID format.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

         const alert = user.priceAlerts.id(id);
         if (!alert) return res.status(404).json({ message: 'Price alert not found.' });

         alert.remove(); // Remove subdocument
        await user.save();

        res.json({ message: 'Price alert deleted successfully.', deletedId: id });

    } catch (error) {
        console.error("Error deleting price alert:", error);
        res.status(500).json({ message: 'Server Error deleting price alert' });
    }
};


module.exports = { getPriceAlerts, addPriceAlert, updatePriceAlert, deletePriceAlert };