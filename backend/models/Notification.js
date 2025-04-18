// backend/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Index for efficient user-specific lookups
    },
    type: {
        type: String,
        required: true,
        enum: [ // <-- Updated enum list as per your request
            'account_welcome',
            'password_changed', // Assuming this replaces 'security_password_change' based on the new list
            'transaction_buy',
            'transaction_sell',
            'transaction_deposit',
            'transaction_withdrawal_request',
            'transaction_withdrawal_completed',
            'redemption_requested',
            'redemption_shipped',
            'redemption_delivered',
            'gamification_badge',
            'gamification_challenge',
            'gamification_reward_claimed', // <--- Value ensured to be present
            'price_alert',
            'market_movement',
            'autopay_success', // Renamed from 'autopay_executed' based on the new list
            'autopay_failed',
            'security_password_change', // Note: This was also in the new list's comment section, included for completeness based on that snippet. Consider if you need both this and 'password_changed'.
            // Add any other custom types you use here if needed
        ]
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true // Index for efficient querying of read/unread status
    },
    link: {
        type: String // Optional in-app link (e.g., /wallet, /orders/xyz, /gamification/rewards)
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed // Store extra context-specific data, e.g., { price: 100, badgeId: 'xyz', rewardId: 'abc' }
    },
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Compound index for faster querying of unread notifications per user, sorted by creation date
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Optional: If you frequently query only by type for a user
// notificationSchema.index({ userId: 1, type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;