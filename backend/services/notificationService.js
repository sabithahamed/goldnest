// backend/services/notificationService.js
const Notification = require('../models/Notification');
const User = require('../models/User'); // Needed to check preferences
const { sendGenericNotificationEmail } = require('./emailService'); // We'll add this to emailService

const createNotification = async (userId, type, details = {}) => {
    // details object should contain: title, message, link (optional), metadata (optional)
    if (!userId || !type || !details.title || !details.message) {
        console.error('Missing required fields for creating notification:', { userId, type, details });
        return null;
    }

    try {
        // 1. Create Notification in DB
        const notification = await Notification.create({
            userId,
            type,
            title: details.title,
            message: details.message,
            link: details.link,
            metadata: details.metadata,
            isRead: false, // Default to unread
        });
        console.log(`Notification created for user ${userId}: Type=${type}`);

        // 2. Check User Preferences & Send Email (if applicable)
        const user = await User.findById(userId).select('email notificationPreferences');
        if (!user) {
             console.warn(`User ${userId} not found for sending notification email.`);
             return notification; // Still return the created DB notification
        }

        // Determine preference key based on notification type
        let emailPrefKey = null;
        if (['transaction_buy', 'transaction_sell', 'transaction_deposit', 'transaction_withdrawal_request', 'transaction_withdrawal_completed'].includes(type)) {
            emailPrefKey = 'transaction_updates';
        } else if (['redemption_requested', 'redemption_shipped', 'redemption_delivered'].includes(type)) {
            emailPrefKey = 'redemption_updates';
        } else if (['gamification_badge', 'gamification_challenge'].includes(type)) {
            emailPrefKey = 'gamification';
        } else if (type === 'price_alert') {
            emailPrefKey = 'price_alert';
        } else if (type === 'market_movement') {
            emailPrefKey = 'market_movement';
        } else if (type.startsWith('autopay')) {
             emailPrefKey = 'autopay';
        } else if (type.startsWith('security')) {
             emailPrefKey = 'security';
        }
        // Add 'promotions', 'general_info' etc. if needed

        // Check if preference exists and is enabled (default to true if structure missing)
        const sendEmailEnabled = user.notificationPreferences?.email?.[emailPrefKey] ?? true; // Default to ON if preference sub-key is missing


        if (emailPrefKey && sendEmailEnabled) {
            // Send a generic email template using the notification details
            // (Use specific email templates like password reset/verify where needed)
            if (type !== 'security_password_change') { // Don't resend password change email generically
                 await sendGenericNotificationEmail(user.email, details.title, details.message, details.link);
            }
        }

        // 3. (Future) Trigger Push Notification (using FCM token stored on user)

        return notification;

    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

module.exports = { createNotification };