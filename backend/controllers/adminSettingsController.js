// backend/controllers/adminSettingsController.js
const Setting = require('../models/Setting');
const { appendPriceToCsv } = require('../utils/csvUtils'); // <-- IMPORT

// A helper to get all settings at once
const getSettings = async (req, res) => {
    try {
        const settings = await Setting.find({});
        // Convert array of settings to a key-value object for easier frontend use
        const settingsObject = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
        
        res.json({ settings: settingsObject });
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ message: "Error fetching settings." });
    }
};

// A helper to update multiple settings at once
const updateSettings = async (req, res) => {
    const settingsToUpdate = req.body;
    try {
        const updatePromises = Object.entries(settingsToUpdate).map(([key, value]) => {
            // Ensure numeric values are stored as numbers
            const parsedValue = !isNaN(parseFloat(value)) ? parseFloat(value) : value;
            return Setting.findOneAndUpdate(
                { key },
                { value: parsedValue },
                { upsert: true, new: true }
            );
        });

        await Promise.all(updatePromises);
        res.json({ message: 'Settings updated successfully.' });
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ message: "Error updating settings." });
    }
};

// @desc    Add a new gold price entry to the CSV
// @route   POST /api/admin/settings/gold-price
// @access  Private (Admin Only)
const addGoldPriceEntry = async (req, res) => {
    const { date, price } = req.body;

    if (!date || !price || isNaN(parseFloat(price))) {
        return res.status(400).json({ message: 'Please provide a valid date and price.' });
    }

    try {
        await appendPriceToCsv(date, parseFloat(price));
        // We don't save this to the 'Setting' model anymore, as it's a historical entry.
        res.status(201).json({ message: `Successfully added price for ${date}.` });
    } catch (error) {
        console.error("Error adding price to CSV:", error);
        res.status(500).json({ message: 'Failed to write to CSV file.' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    addGoldPriceEntry, // <-- EXPORT
};