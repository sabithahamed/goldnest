// backend/controllers/adminInventoryController.js
const User = require('../models/User');
const InventoryLog = require('../models/InventoryLog');

// @desc    Get all inventory statistics
// @route   GET /api/admin/inventory/stats
// @access  Private (Admin Only)
const getInventoryStats = async (req, res) => {
    try {
        // Concurrently fetch stats
        const [
            physicalGoldResult,
            tokenizedGoldResult,
            inventoryLogs
        ] = await Promise.all([
            // 1. Calculate total physical gold added by admins
            InventoryLog.aggregate([
                { $group: { _id: null, total: { $sum: '$gramsAdded' } } }
            ]),
            // 2. Calculate total gold owned by all users (tokenized)
            User.aggregate([
                { $group: { _id: null, total: { $sum: '$goldBalanceGrams' } } }
            ]),
            // 3. Get the history of additions
            InventoryLog.find({}).sort({ createdAt: -1 }).limit(10)
        ]);

        const totalPhysicalGold = physicalGoldResult.length > 0 ? physicalGoldResult[0].total : 0;
        const totalTokenizedGold = tokenizedGoldResult.length > 0 ? tokenizedGoldResult[0].total : 0;

        res.json({
            totalPhysicalGold,
            totalTokenizedGold,
            reserveBalance: totalPhysicalGold - totalTokenizedGold,
            inventoryLogs
        });

    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add physical gold to the reserve
// @route   POST /api/admin/inventory/add
// @access  Private (Admin Only)
const addPhysicalGold = async (req, res) => {
    const { gramsAdded, notes } = req.body;
    const adminId = req.admin._id;
    const adminName = req.admin.name;

    if (!gramsAdded || isNaN(gramsAdded) || gramsAdded <= 0) {
        return res.status(400).json({ message: 'Please provide a valid number of grams to add.' });
    }

    try {
        const newLog = new InventoryLog({
            gramsAdded: parseFloat(gramsAdded),
            notes,
            adminId,
            adminName,
        });

        await newLog.save();
        res.status(201).json({ message: 'Physical gold added to reserve successfully.', log: newLog });
    } catch (error) {
        console.error('Error adding physical gold:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getInventoryStats,
    addPhysicalGold,
};