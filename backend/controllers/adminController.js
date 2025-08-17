// backend/controllers/adminController.js
const User = require('../models/User');
const Redemption = require('../models/Redemption');
const mongoose = require('mongoose'); // Keep mongoose if it's used elsewhere or for consistency, though not strictly needed by the new function directly.
const { createNotification } = require('../services/notificationService'); // <-- ADD THIS IMPORT

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats/dashboard
// @access  Private (Admin Only)
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Concurrently fetch all statistics for efficiency
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
                {
                    $match: {
                        'transactions.type': 'investment',
                        'transactions.amountLKR': { $ne: null } // Ensure amountLKR is not null
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$transactions.amountLKR' }
                    }
                }
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
        // Build search query
        let query = {};
        if (searchQuery) {
            const searchRegex = new RegExp(searchQuery, 'i'); // 'i' for case-insensitive
            query = {
                $or: [
                    { name: searchRegex },
                    { email: searchRegex }
                ]
            };
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 }) // Show newest users first
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-password -resetPasswordToken -emailVerificationToken'); // Exclude sensitive info

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        res.json({
            users,
            currentPage: page,
            totalPages,
            totalUsers
        });
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
            .select('-password -resetPasswordToken -emailVerificationToken'); // Exclude sensitive info

        if (user) {
            // Sort transactions newest first for display
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
// @access  Private (Admin Only - maybe SuperAdmin later)
const updateUserStatus = async (req, res) => {
    const { isLocked } = req.body;
    const { id } = req.params;

    // Basic validation
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

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            isLocked: updatedUser.isLocked
        });
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
            .populate('user', 'name email') // Populate user's name and email
            .sort({ createdAt: -1 }) // Show newest requests first
            .skip((page - 1) * limit)
            .limit(limit);

        const totalRedemptions = await Redemption.countDocuments(query);
        const totalPages = Math.ceil(totalRedemptions / limit);

        res.json({
            redemptions,
            currentPage: page,
            totalPages,
            totalRedemptions
        });
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

        const originalStatus = redemption.status; // Keep track of the old status

        // 1. Update the main Redemption document
        if (status) redemption.status = status;
        if (trackingNumber) redemption.trackingNumber = trackingNumber;
        const updatedRedemption = await redemption.save();
        
        // 2. --- NEW LOGIC: Update the corresponding transaction in the User document ---
        if (status && status !== originalStatus) {
            const user = await User.findById(redemption.user);
            if (user) {
                // Find the specific transaction that is linked to this redemption
                const transactionToUpdate = user.transactions.find(
                    tx => tx.relatedRedemptionId && tx.relatedRedemptionId.toString() === redemptionId
                );

                if (transactionToUpdate) {
                    transactionToUpdate.status = status;
                    // Also update tracking number in the transaction if it exists
                    if (trackingNumber) {
                        transactionToUpdate.trackingNumber = trackingNumber;
                    }
                    await user.save();
                    console.log(`[Admin] Synced status to '${status}' for transaction ${transactionToUpdate._id} for user ${user._id}`);
                } else {
                     console.warn(`[Admin] Could not find matching transaction for redemption ${redemptionId} to sync status.`);
                }
            }
        }
        // --- END OF NEW LOGIC ---

        // 3. Send a notification to the user about the update
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
            // You can add notifications for 'processing' or 'cancelled' here too if you want.
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
            {
                $lookup: { // Join with users collection to get user's name
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: { // Shape the final output
                    _id: '$transactions._id',
                    userName: '$userInfo.name',
                    type: '$transactions.type',
                    amountLKR: '$transactions.amountLKR',
                    amountGrams: '$transactions.amountGrams',
                    date: '$transactions.date',
                }
            }
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
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // Sort by date ascending
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
            {
                $group: {
                    _id: '$transactions.type', // Group by the transaction type
                    count: { $sum: 1 }        // Count how many of each type
                }
            },
            {
                $project: { // Reshape the output for easier use on the frontend
                    type: '$_id',
                    count: '$count',
                    _id: 0
                }
            }
        ]);
        res.json(data);
    } catch (error) {
        console.error('Error fetching transaction type data:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllRedemptions,
    updateRedemptionStatus,
    getRecentTransactions,
    getUserSignupChartData,
    getTransactionTypeChartData // <-- EXPORT THE NEW FUNCTION
};