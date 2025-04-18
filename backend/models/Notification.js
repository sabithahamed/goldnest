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
        enum: [ // <-- Updated enum list
            // Existing types from old code
            'account_welcome',
            'password_changed',
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
            'gamification_reward_claimed', // Already present, ensured
            'price_alert',
            'market_movement',
            'autopay_success',             // Already present, ensured
            'autopay_failed',              // Already present, ensured
            'security_password_change',    // Kept from old code as requested

            // New types added based on "new changes"
            'autopay_reminder'             // <-- ADDED
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