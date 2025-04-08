// backend/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'price_alert',       // User-defined price alert triggered
            'market_movement',   // Significant system-detected market change
            'ai_insight',        // New AI suggestion available (optional)
            'transaction_buy',
            'transaction_sell',
            'transaction_deposit',
            'transaction_withdrawal_request', // Submitted
            'transaction_withdrawal_completed', // Processed (requires later update)
            'redemption_requested',
            'redemption_shipped',  // Requires later update
            'redemption_delivered', // Requires later update
            'gamification_badge',
            'gamification_challenge',
            'autopay_reminder',     // Requires job
            'autopay_executed',     // Requires job
            'autopay_failed',       // Requires job
            'security_password_change',
            'security_login',       // Optional: New device/location login
            'account_welcome',      // After email verification
            'general_info'          // For other system messages
        ],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String }, // Optional in-app link (e.g., /wallet, /orders/xyz)
    metadata: { type: mongoose.Schema.Types.Mixed }, // Store extra data { price: X, badgeId: Y }
}, {
    timestamps: true // Adds createdAt, updatedAt
});

// Optional: Index for faster querying of unread notifications per user
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;