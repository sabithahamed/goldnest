// backend/controllers/notificationController.js
const Notification = require('../models/Notification');

// @desc    Get notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    const userId = req.user._id;
    // Query params for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default 10 per page
    const unreadOnly = req.query.unread === 'true';

    const skip = (page - 1) * limit;
    const query = { userId };
    if (unreadOnly) {
        query.isRead = false;
    }

    try {
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 }) // Newest first
            .skip(skip)
            .limit(limit);

        const totalCount = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.json({
            notifications,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalNotifications: totalCount,
            unreadCount: unreadCount
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
    const userId = req.user._id;
    try {
        await Notification.updateMany({ userId: userId, isRead: false }, { $set: { isRead: true } });
        res.json({ message: 'All notifications marked as read.' });
    } catch (error) {
        console.error("Error marking all notifications read:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark a specific notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markOneAsRead = async (req, res) => {
    const userId = req.user._id;
    const notificationId = req.params.id;
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId: userId }, // Ensure user owns notification
            { $set: { isRead: true } },
            { new: true } // Return the updated document
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found or not owned by user.' });
        }
        res.json(notification);
    } catch (error) {
        console.error("Error marking notification read:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getNotifications, markAllAsRead, markOneAsRead };