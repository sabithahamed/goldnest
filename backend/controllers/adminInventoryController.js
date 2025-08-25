// backend/controllers/adminInventoryController.js
const User = require('../models/User');
const InventoryLog = require('../models/InventoryLog');
const { mintToTreasury } = require('../services/blockchainService');
const { logAdminAction } = require('../services/auditLogService'); // <-- ADD THIS IMPORT

// @desc    Get all inventory statistics
// @route   GET /api/admin/inventory/stats
// @access  Private (Admin Only)
const getInventoryStats = async (req, res) => {
    try {
        const [
            physicalGoldResult,
            tokenizedGoldResult,
            inventoryLogs
        ] = await Promise.all([
            InventoryLog.aggregate([
                { $group: { _id: null, total: { $sum: '$gramsAdded' } } }
            ]),
            User.aggregate([
                { $group: { _id: null, total: { $sum: '$goldBalanceGrams' } } }
            ]),
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
    const adminName = `${req.admin.firstName} ${req.admin.lastName}`;

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

        // --- NEW: Log this action for the audit trail and undo feature ---
        // For an "add" action, the undoData specifies that the reverse action is to "delete" this new document.
        await logAdminAction(
            req.admin,
            'Added physical gold to reserve',
            { type: 'InventoryLog', id: newLog._id },
            { gramsAdded: newLog.gramsAdded, notes: newLog.notes },
            { action: 'delete', targetId: newLog._id.toString() }
        );

        try {
            const txHash = await mintToTreasury(parseFloat(gramsAdded));
            console.log(`[Admin] Minted ${gramsAdded}g to treasury, tx: ${txHash}`);
        } catch (blockchainError) {
            console.error(`CRITICAL: DB updated with ${gramsAdded}g, but blockchain mint failed!`, blockchainError);
        }
        
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