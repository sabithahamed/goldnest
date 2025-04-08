// backend/services/priceAlertService.js
const User = require('../models/User');
const { getGoldMarketSummary } = require('../utils/goldDataUtils');
const { createNotification } = require('./notificationService');

// Configurable threshold for market movement alert
const MARKET_MOVEMENT_THRESHOLD_PERCENT = 2.0; // e.g., 2% change

// Store the last known price to detect significant changes
let lastCheckedPricePerGram = null;
let lastMarketAlertTime = null;
const MARKET_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours cooldown for market alerts

const checkPriceAlerts = async () => {
    console.log('Checking prices for alerts...');
    const marketSummary = getGoldMarketSummary();
    const currentPricePerGram = marketSummary.latestPricePerGram;

    if (currentPricePerGram <= 0) {
        console.warn('Price Alert Check: Invalid current gold price fetched. Skipping check.');
        return;
    }

    // --- 1. Market Movement Alert ---
    if (lastCheckedPricePerGram !== null) {
        const priceChangePercent = Math.abs(((currentPricePerGram - lastCheckedPricePerGram) / lastCheckedPricePerGram) * 100);

        if (priceChangePercent >= MARKET_MOVEMENT_THRESHOLD_PERCENT) {
            // Check cooldown
            const now = Date.now();
            if (!lastMarketAlertTime || (now - lastMarketAlertTime > MARKET_ALERT_COOLDOWN_MS)) {
                console.log(`Significant market movement detected: ${priceChangePercent.toFixed(1)}%`);
                lastMarketAlertTime = now; // Update last alert time

                // Find users who want market movement alerts (needs preference check)
                const usersToAlert = await User.find({
                    'notificationPreferences.email.market_movement': true // Check preference
                    // Add checks for push notification preferences later
                }).select('_id'); // Only need user IDs

                for (const user of usersToAlert) {
                     await createNotification(user._id, 'market_movement', {
                        title: `Gold Market Alert: ${priceChangePercent.toFixed(1)}% Change`,
                        message: `The gold price has changed by approximately ${priceChangePercent.toFixed(1)}% recently. Current price: ${formatCurrency(currentPricePerGram)}/g.`,
                        link: '/market'
                    });
                }
            } else {
                 console.log('Market movement detected, but within cooldown period.');
            }
        }
    }
    // Update last checked price for the next run
    lastCheckedPricePerGram = currentPricePerGram;


    // --- 2. User-Defined Price Alerts ---
    // Find users with active price alerts
    const usersWithAlerts = await User.find({
        'priceAlerts.isActive': true
    }).select('_id email priceAlerts'); // Select necessary fields

    for (const user of usersWithAlerts) {
        for (const alert of user.priceAlerts) {
            if (!alert.isActive) continue; // Skip inactive alerts

            let triggered = false;
            if (alert.condition === 'below' && currentPricePerGram <= alert.targetPriceLKRPerGram) {
                triggered = true;
            } else if (alert.condition === 'above' && currentPricePerGram >= alert.targetPriceLKRPerGram) {
                triggered = true;
            }

            if (triggered) {
                 console.log(`Triggering alert for user ${user._id}: ${alert.condition} ${alert.targetPriceLKRPerGram}`);
                // Prevent spam: Ideally, update lastTriggered on the alert subdoc.
                // For simplicity now, we just create the notification. A real app needs spam prevention.

                await createNotification(user._id, 'price_alert', {
                    title: `Price Alert Triggered! (${alert.condition} ${formatCurrency(alert.targetPriceLKRPerGram)}/g)`,
                    message: `Gold price is now ${formatCurrency(currentPricePerGram)}/g, which triggered your alert set for ${alert.condition} ${formatCurrency(alert.targetPriceLKRPerGram)}/g.`,
                    link: '/trade', // Link to trade page
                    metadata: {
                        targetPrice: alert.targetPriceLKRPerGram,
                        currentPrice: currentPricePerGram,
                        condition: alert.condition
                    }
                });

                // Deactivate the alert after triggering to prevent repeats (or add lastTriggered logic)
                alert.isActive = false;
                // Mark modified might be needed if just updating subdoc field
                user.markModified('priceAlerts');
            }
        }
        // Save user only if any of their alerts were deactivated
         if (user.isModified('priceAlerts')) {
             await user.save();
         }
    }
    console.log('Price alert check finished.');
};

// Helper needed locally or imported
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);

module.exports = { checkPriceAlerts };