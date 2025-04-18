// backend/services/autoPaymentService.js
const mongoose = require('mongoose');
const User = require('../models/User');
const { getGoldMarketSummary } = require('../utils/goldDataUtils');
const { calculateBuyFee } = require('../utils/feeUtils');
const { createNotification } = require('./notificationService');

// Helper for currency formatting (consistent with other files)
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);

/**
 * Processes a single auto-investment plan for a user.
 * Modifies the user object directly (call user.save() later).
 * @param {Document<User>} user - The Mongoose user document.
 * @param {object} plan - The specific auto-payment plan object from the user's array.
 * @returns {Promise<boolean>} - True if investment was processed (or attempted), false if skipped due to error fetching price.
 */
const processAutoInvestment = async (user, plan) => {
    console.log(`[AutoInvest] Processing plan ${plan._id} for user ${user._id}: ${plan.frequency} ${formatCurrency(plan.amountLKR)}`);

    try {
        // 1. Get Market Price
        const marketSummary = getGoldMarketSummary();
        if (!marketSummary?.latestPricePerGram || marketSummary.latestPricePerGram <= 0) {
            console.error(`[AutoInvest] Error: Could not fetch valid market price for user ${user._id}, plan ${plan._id}. Skipping.`);
            // Optionally notify user about market data issue? For now, just skip.
            return false; // Indicate skipped due to market data error
        }
        const pricePerGram = marketSummary.latestPricePerGram;

        // 2. Calculate Costs & Check Funds
        const investmentAmount = plan.amountLKR;
        const feeLKR = calculateBuyFee(investmentAmount);
        const totalCostLKR = investmentAmount + feeLKR;

        if (user.cashBalanceLKR < totalCostLKR) {
            console.log(`[AutoInvest] Insufficient funds for user ${user._id}, plan ${plan._id}. Required: ${formatCurrency(totalCostLKR)}, Available: ${formatCurrency(user.cashBalanceLKR)}`);
            // --- Send Failure Notification ---
            await createNotification(user._id, 'autopay_failed', { // Ensure 'autopay_failed' is in Notification model enum
                title: 'Auto-Invest Failed: Insufficient Funds',
                message: `Your scheduled ${plan.frequency} investment of ${formatCurrency(plan.amountLKR)} failed due to insufficient wallet balance. Required: ${formatCurrency(totalCostLKR)}.`,
                link: '/deposit' // Link to deposit page
            });
            // Optional: Deactivate the plan after N failures? For now, just notify.
            // plan.isActive = false; // Example deactivation
            return true; // Processed (attempted) but failed due to funds
        }

        // 3. Sufficient Funds - Process Investment
        const amountGrams = investmentAmount / pricePerGram;

        // 4. Update User Balances
        user.cashBalanceLKR -= totalCostLKR;
        user.goldBalanceGrams += amountGrams;

        // 5. Create Transaction Record
        const description = `Automatic ${plan.frequency} investment: ${formatCurrency(investmentAmount)} for ${amountGrams.toFixed(4)}g gold (+ ${formatCurrency(feeLKR)} fee)`;
        const transaction = {
            _id: new mongoose.Types.ObjectId(),
            type: 'investment', // Keep type as investment for consistency? Or use 'auto_investment'? Let's stick with 'investment'.
            amountLKR: investmentAmount,
            amountGrams: amountGrams,
            feeLKR: feeLKR,
            pricePerGramLKR: pricePerGram,
            timestamp: new Date(), // Use current time for execution time
            date: new Date(),      // Redundant but ensure 'date' exists if needed elsewhere
            description: description,
            status: 'completed',
            // Optional: Link to the auto-payment plan ID
            // relatedAutoPaymentId: plan._id
        };
        user.transactions.push(transaction);

        console.log(`[AutoInvest] SUCCESS: Processed plan ${plan._id} for user ${user._id}. Deducted ${formatCurrency(totalCostLKR)}, Added ${amountGrams.toFixed(4)}g.`);

        // 6. Send Success Notification
        await createNotification(user._id, 'autopay_success', { // Ensure 'autopay_success' is in Notification model enum
            title: 'Auto-Invest Successful!',
            message: `Your scheduled ${plan.frequency} investment of ${formatCurrency(investmentAmount)} was successful! Added ${amountGrams.toFixed(4)}g gold.`,
            link: '/wallet', // Link to wallet
            metadata: { transactionId: transaction._id.toString() }
        });

        return true; // Processed successfully

    } catch (error) {
        console.error(`[AutoInvest] CRITICAL Error processing plan ${plan._id} for user ${user._id}:`, error);
        // Log critical errors but don't stop the whole job for other users
        // Optionally send a system notification or specific user error notification
        try {
             await createNotification(user._id, 'autopay_failed', {
                 title: 'Auto-Invest Failed: System Error',
                 message: `We encountered an error processing your scheduled ${plan.frequency} investment of ${formatCurrency(plan.amountLKR)}. Please check your account or contact support.`,
                 link: '/wallet'
             });
        } catch (notifyError) {
             console.error(`[AutoInvest] Failed to send system error notification to user ${user._id}`, notifyError);
        }
        return false; // Indicate processing failed due to system error
    }
};


/**
 * Finds and executes all scheduled auto-payments that are due today.
 */
const executeScheduledPayments = async () => {
    console.log(`[AutoInvest] Starting daily execution job at ${new Date().toISOString()}`);
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const currentDayOfMonth = today.getDate(); // 1-31

    try {
        // Find users with at least one active auto-payment plan
        // Use lean() for performance if we don't need full Mongoose documents initially,
        // but we need to modify/save, so we fetch full documents.
        const usersWithActivePlans = await User.find({
            'automaticPayments.isActive': true
        });

        console.log(`[AutoInvest] Found ${usersWithActivePlans.length} users with active plans.`);

        let plansProcessedCount = 0;
        let usersModifiedCount = 0;

        for (const user of usersWithActivePlans) {
            let userModified = false; // Track if this specific user needs saving

            for (const plan of user.automaticPayments) {
                if (!plan.isActive) continue; // Skip inactive plans

                let isDue = false;
                switch (plan.frequency) {
                    case 'daily':
                        isDue = true;
                        break;
                    case 'weekly':
                        // Execute weekly plans on a specific day, e.g., Monday (1)
                        if (currentDayOfWeek === 1) {
                             isDue = true;
                        }
                        break;
                    case 'monthly':
                         // Execute monthly plans on the specified dayOfMonth
                         // Model ensures dayOfMonth is max 28, handling short months.
                         if (currentDayOfMonth === plan.dayOfMonth) {
                             isDue = true;
                         }
                         // Optional: Handle "last day of month" logic if needed, requires more complex date math
                        break;
                }

                if (isDue) {
                    console.log(`[AutoInvest] Plan ${plan._id} for user ${user._id} is due today.`);
                    const processed = await processAutoInvestment(user, plan);
                    if (processed) { // If processed (success or insufficient funds failure)
                        plansProcessedCount++;
                        // Mark user as modified if balances/transactions changed (processAutoInvestment modifies the user object)
                        // Mongoose's isModified() should detect changes made within processAutoInvestment
                        if (user.isModified()) { // More reliable check
                             userModified = true;
                        }
                    }
                     // If !processed, it means a system error occurred (e.g., price fetch), don't modify user state further for this plan run
                }
            } // End loop through plans for one user

            // Save the user ONLY if modifications occurred
            if (userModified) {
                 try {
                     await user.save();
                     usersModifiedCount++;
                     console.log(`[AutoInvest] Successfully saved updates for user ${user._id}`);
                 } catch(saveError) {
                      console.error(`[AutoInvest] FAILED to save user ${user._id} after processing plans:`, saveError);
                      // Handle save error - maybe retry? Log detailed info.
                 }
            }
        } // End loop through users

        console.log(`[AutoInvest] Finished execution job. Processed ${plansProcessedCount} due plans for ${usersModifiedCount} users.`);

    } catch (error) {
        console.error('[AutoInvest] CRITICAL ERROR during executeScheduledPayments job:', error);
    }
};


// Optional: Reminder Function (Not implemented fully, just structure)
const sendPaymentReminders = async () => {
     console.log(`[AutoInvest] Running reminder job at ${new Date().toISOString()}`);
     // Logic: Find users with plans due *tomorrow*.
     // Send notifications of type 'autopay_reminder'.
     // Requires calculating tomorrow's date/day checks similar to executeScheduledPayments.
     console.log('[AutoInvest] Reminder job logic not fully implemented.');
 };


module.exports = {
    executeScheduledPayments,
    sendPaymentReminders // Export even if not fully implemented yet
};