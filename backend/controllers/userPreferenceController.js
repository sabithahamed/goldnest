// backend/controllers/userPreferenceController.js
const User = require('../models/User');

// @desc    Get user notification preferences
// @route   GET /api/users/preferences/notifications
// @access  Private
const getNotificationPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('notificationPreferences');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Return preferences or default if none set
        res.json(user.notificationPreferences || { email: {} /*, push: {}, sms: {} */ });
    } catch (error) {
        console.error("Error getting notification preferences:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user notification preferences
// @route   PUT /api/users/preferences/notifications
// @access  Private
const updateNotificationPreferences = async (req, res) => {
    // Expecting body like: { email: { price_alert: true, market_movement: false, ... } }
    const { email /*, push, sms */ } = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update preferences - carefully merge or replace based on needs
        // This simple approach replaces the whole email block
        if (email !== undefined) { // Check if email object was provided
             user.notificationPreferences.email = {
                 ...user.notificationPreferences.email, // Keep existing prefs not sent
                ...email // Overwrite with received prefs
             };
        }
        // Add blocks for push/sms similarly if implementing

        // Mark modified to ensure save works for nested objects
        user.markModified('notificationPreferences');
        const updatedUser = await user.save();

        res.json(updatedUser.notificationPreferences);

    } catch (error) {
        console.error("Error updating notification preferences:", error);
         if (error.name === 'ValidationError') {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Server Error saving preferences' });
    }
};

module.exports = { getNotificationPreferences, updateNotificationPreferences };