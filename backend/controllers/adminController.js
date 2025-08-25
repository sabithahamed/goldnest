// backend/controllers/adminController.js

// --- REQUIRED IMPORTS FOR LOGIN ---
const Admin = require('../models/Admin'); // Make sure this path is correct
const generateToken = require('../utils/generateToken'); // Make sure this path is correct

// --- EXISTING IMPORTS ---
const User = require('../models/User');
const Redemption = require('../models/Redemption');
const mongoose = require('mongoose');
const { createNotification } = require('../services/notificationService');
const { logAdminAction } = require('../services/auditLogService');


// =================================================================================
// EXISTING CONTROLLERS (No changes needed below)
// =================================================================================

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats/dashboard
// @access  Private (Admin Only)
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalUsers,
            newUsersToday,
            pendingRedemptions,
            totalTransactionVolume,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: today } }),
            Redemption.countDocuments({ status: 'pending' }),
            User.aggregate([
                { $unwind: '$transactions' },
                { $match: { 'transactions.type': 'investment', 'transactions.amountLKR': { $ne: null } } },
                { $group: { _id: null, total: { $sum: '$transactions.amountLKR' } } }
            ])
        ]);

        const stats = {
            totalUsers,
            newUsersToday,
            pendingRedemptions,
            totalVolume: totalTransactionVolume.length > 0 ? totalTransactionVolume[0].total : 0,
        };
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users with search and pagination
// @route   GET /api/admin/users
// @access  Private (Admin Only)
const getAllUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchQuery = req.query.search || '';

    try {
        let query = {};
        if (searchQuery) {
            const searchRegex = new RegExp(searchQuery, 'i');
            query = { $or: [{ name: searchRegex }, { email: searchRegex }] };
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-password -resetPasswordToken -emailVerificationToken');

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        res.json({ users, currentPage: page, totalPages, totalUsers });
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a single user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin Only)
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -resetPasswordToken -emailVerificationToken');

        if (user) {
            user.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(`Error fetching user ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user status (e.g., lock/unlock account)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin Only)
const updateUserStatus = async (req, res) => {
    const { isLocked } = req.body;
    const { id } = req.params;

    if (typeof isLocked !== 'boolean') {
        return res.status(400).json({ message: 'Invalid "isLocked" value. Must be true or false.' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isLocked = isLocked;
        const updatedUser = await user.save();
        
        await logAdminAction(req.admin, `Set user lock status to ${isLocked}`, { type: 'User', id: user._id });

        res.json({ _id: updatedUser._id, name: updatedUser.name, isLocked: updatedUser.isLocked });
    } catch (error) {
        console.error(`Error updating status for user ${id}:`, error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all redemption requests with filtering and pagination
// @route   GET /api/admin/redemptions
// @access  Private (Admin Only)
const getAllRedemptions = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const statusFilter = req.query.status || '';

    try {
        let query = {};
        if (statusFilter && statusFilter !== 'all') {
            query.status = statusFilter;
        }

        const redemptions = await Redemption.find(query)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalRedemptions = await Redemption.countDocuments(query);
        const totalPages = Math.ceil(totalRedemptions / limit);

        res.json({ redemptions, currentPage: page, totalPages, totalRedemptions });
    } catch (error) {
        console.error('Error fetching all redemptions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a redemption request's status
// @route   PUT /api/admin/redemptions/:id
// @access  Private (Admin Only)
const updateRedemptionStatus = async (req, res) => {
    const { status, trackingNumber } = req.body;
    const { id: redemptionId } = req.params;

    try {
        const redemption = await Redemption.findById(redemptionId);
        if (!redemption) {
            return res.status(404).json({ message: 'Redemption request not found' });
        }

        const originalStatus = redemption.status;
        if (status) redemption.status = status;
        if (trackingNumber) redemption.trackingNumber = trackingNumber;
        const updatedRedemption = await redemption.save();
        
        await logAdminAction(req.admin, `Updated redemption status to '${status}'`, { type: 'Redemption', id: redemption._id }, { trackingNumber });
        
        if (status && status !== originalStatus) {
            const user = await User.findById(redemption.user);
            if (user) {
                const transactionToUpdate = user.transactions.find(
                    tx => tx.relatedRedemptionId && tx.relatedRedemptionId.toString() === redemptionId
                );
                if (transactionToUpdate) {
                    transactionToUpdate.status = status;
                    if (trackingNumber) transactionToUpdate.trackingNumber = trackingNumber;
                    await user.save();
                }
            }
        }

        if (status && status !== originalStatus) {
            if (status === 'shipped') {
                 await createNotification(redemption.user, 'redemption_shipped', {
                    title: 'Your Gold is on its way!',
                    message: `Your redemption request for "${redemption.itemDescription}" has been shipped! ${trackingNumber ? `Tracking number: ${trackingNumber}` : ''}`,
                    link: `/redeem-details/${redemption._id}`
                });
            } else if (status === 'delivered') {
                 await createNotification(redemption.user, 'redemption_delivered', {
                    title: 'Your Gold has been Delivered!',
                    message: `Your redemption request for "${redemption.itemDescription}" has been marked as delivered. Enjoy your gold!`,
                    link: `/wallet`
                });
            }
        }
        
        res.json(updatedRedemption);
    } catch (error) {
        console.error(`Error updating redemption ${redemptionId}:`, error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get recent transactions for dashboard widget
// @route   GET /api/admin/stats/recent-transactions
// @access  Private (Admin Only)
const getRecentTransactions = async (req, res) => {
    try {
        const recentTransactions = await User.aggregate([
            { $unwind: '$transactions' },
            { $sort: { 'transactions.date': -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
            { $unwind: '$userInfo' },
            { $project: { _id: '$transactions._id', userName: '$userInfo.name', type: '$transactions.type', amountLKR: '$transactions.amountLKR', amountGrams: '$transactions.amountGrams', date: '$transactions.date' } }
        ]);
        res.json(recentTransactions);
    } catch (error) {
        console.error('Error fetching recent transactions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user signup data for a chart
// @route   GET /api/admin/stats/user-chart
// @access  Private (Admin Only)
const getUserSignupChartData = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const data = await User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json(data);
    } catch (error) {
        console.error('Error fetching user chart data:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get transaction type breakdown for a pie chart
// @route   GET /api/admin/stats/transaction-types
// @access  Private (Admin Only)
const getTransactionTypeChartData = async (req, res) => {
    try {
        const data = await User.aggregate([
            { $unwind: '$transactions' },
            { $group: { _id: '$transactions.type', count: { $sum: 1 } } },
            { $project: { type: '$_id', count: '$count', _id: 0 } }
        ]);
        res.json(data);
    } catch (error) {
        console.error('Error fetching transaction type data:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// --- EXPORT ALL CONTROLLERS ---
module.exports = {
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllRedemptions,
    updateRedemptionStatus,
    getRecentTransactions,
    getUserSignupChartData,
    getTransactionTypeChartData
};