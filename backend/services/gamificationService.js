// backend/services/gamificationService.js
const { BADGES, CHALLENGES, getActiveChallenges, getAllBadges } = require('../config/gamification');
const { createNotification } = require('./notificationService'); // Import notification service

// --- Helper: Get start of current month/week ---
const getStartOf = (period) => {
    const now = new Date();
    if (period === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'week') {
        // Adjust to make Monday the start of the week (getDay() returns 0 for Sun, 1 for Mon...)
        const currentDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust when Sunday
        const monday = new Date(now.setDate(diff));
        return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
    }
    return null; // For 'total' or unknown
};

// --- Main Processing Function (Called by getUserProfile or specific event triggers) ---
// Calculates current progress and checks for new badges/challenges based on historical data
// Returns calculated progress, list of newly earned badges, list of newly completed challenges, and star updates
const processGamificationState = async (user) => { // Make async to await notification creation
    if (!user || !user.transactions) {
        return { newEarnedBadgeIds: [], newlyCompletedChallengeIds: [], updatedProgress: {}, starsToAdd: 0 };
    }

    const transactions = user.transactions || [];
    const existingBadgeIds = new Set(user.earnedBadgeIds || []);
    // Ensure challengeProgress is a Map for easier updates
    const existingProgress = user.challengeProgress instanceof Map ? user.challengeProgress : new Map(Object.entries(user.challengeProgress || {}));
    const completedChallengeIds = new Set(user.completedChallengeIds || []); // Track completed challenges to avoid re-awarding/notifying for non-resetting ones

    let updatedProgress = new Map(existingProgress); // Copy existing progress
    let newEarnedBadgeIds = [];
    let newlyCompletedChallengeIds = []; // Track newly completed challenges in this run
    let starsToAdd = 0;

    // --- Calculate Aggregates from Transactions ---
    let totalInvestmentLKR = 0;
    let totalInvestmentGrams = 0;
    let investmentCount = 0;
    let sellCount = 0;
    let redemptionCount = 0;
    let depositCount = 0;
    let withdrawalCount = 0;

    let monthlyInvestLKR = 0;
    let weeklyInvestLKR = 0; // Added for potential weekly challenges
    let monthlyInvestCount = 0;
    let weeklyTradeCount = 0; // Combined investment/sell for weekly trade challenge

    const startOfMonth = getStartOf('month');
    const startOfWeek = getStartOf('week');

    transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        if (tx.type === 'investment') {
            investmentCount++;
            totalInvestmentLKR += tx.amountLKR || 0;
            totalInvestmentGrams += tx.amountGrams || 0;
            if (startOfMonth && txDate >= startOfMonth) {
                monthlyInvestLKR += tx.amountLKR || 0;
                monthlyInvestCount++;
            }
             if (startOfWeek && txDate >= startOfWeek) {
                weeklyInvestLKR += tx.amountLKR || 0; // Track weekly LKR investment
                weeklyTradeCount++; // Count investment as a trade
            }
        } else if (tx.type === 'sell_gold') {
            sellCount++;
             if (startOfWeek && txDate >= startOfWeek) {
                weeklyTradeCount++; // Count sell as a trade
            }
        } else if (tx.type === 'redemption') {
            redemptionCount++;
        } else if (tx.type === 'deposit') {
            depositCount++;
        } else if (tx.type === 'withdrawal') {
            withdrawalCount++;
        }
        // Add other transaction types if needed for future badges/challenges
    });
    const totalTransactionCount = transactions.length; // General count


    // --- Check Badges ---
    const allBadges = getAllBadges();
    for (const badge of allBadges) { // Use for...of for potential async operations
        if (!existingBadgeIds.has(badge.id)) { // Only check if not already earned
            let criteriaMet = false;
            const criteria = badge.criteria;

            try {
                switch (criteria.type) {
                    case 'SPECIFIC_TRANSACTION_COUNT':
                        if (criteria.transactionType === 'investment' && investmentCount >= criteria.count) criteriaMet = true;
                        if (criteria.transactionType === 'redemption' && redemptionCount >= criteria.count) criteriaMet = true;
                        if (criteria.transactionType === 'deposit' && depositCount >= criteria.count) criteriaMet = true;
                        if (criteria.transactionType === 'withdrawal' && withdrawalCount >= criteria.count) criteriaMet = true;
                        // Add other specific types
                        break;
                    case 'TRANSACTION_COUNT':
                         // Check specific trades if needed for badge 'GOLD_STARTER' or others
                         if (badge.id === 'GOLD_STARTER' && (investmentCount + sellCount) >= criteria.count) criteriaMet = true;
                         // Example: Generic overall transaction count badge
                         // else if (totalTransactionCount >= criteria.count) criteriaMet = true;
                        break;
                    case 'TOTAL_INVESTMENT_LKR':
                        if (totalInvestmentLKR >= criteria.amount) criteriaMet = true;
                        break;
                    case 'TOTAL_INVESTMENT_GRAMS':
                        if (totalInvestmentGrams >= criteria.amount) criteriaMet = true;
                        break;
                    // Add other criteria checks (e.g., consecutive days login - needs login history)
                }

                if (criteriaMet) {
                    newEarnedBadgeIds.push(badge.id);
                    starsToAdd += badge.starsAwarded || 0;
                    console.log(`User ${user._id} earned badge: ${badge.id}`);

                    // !! Trigger Notification Hook Here (Badge Earned) !!
                    await createNotification(user._id, 'gamification_badge', {
                        title: 'Badge Earned!',
                        message: `Congratulations! You've earned the "${badge.name}" badge: ${badge.description}`,
                        link: '/wallet#gamification', // Link to gamification section in frontend
                        metadata: { badgeId: badge.id }
                    });
                }
            } catch (error) {
                 console.error(`Error processing badge ${badge.id} for user ${user._id}:`, error);
                 // Decide if you want to stop processing or just log and continue
            }
        }
    } // End of badge check loop

    // --- Calculate Challenge Progress ---
    const activeChallenges = getActiveChallenges();
    for (const challenge of activeChallenges) { // Use for...of for potential async operations
        let currentProgress = 0;
        const goal = challenge.goal;
        let shouldUpdate = true; // Flag to decide if progress needs recalculating
        let isNewlyCompleted = false; // Flag for notification triggering

        // Note: Proper reset logic (e.g., tracking last completion date) is complex and not fully implemented here.
        // This implementation recalculates progress based on current data snapshot relative to start of week/month.
        // For non-resetting challenges (like total investment), completion check prevents re-rewarding.

        try {
            switch (challenge.type) {
                case 'INVEST_LKR_MONTHLY':
                    currentProgress = monthlyInvestLKR;
                    break;
                case 'TRADE_COUNT_WEEKLY':
                    currentProgress = weeklyTradeCount;
                    break;
                case 'INVEST_LKR_TOTAL': // Example for ongoing Prospector Goal
                    currentProgress = totalInvestmentLKR;
                    // Progress always reflects total, update needed. Completion check prevents re-rewarding.
                    break;
                 case 'INVEST_COUNT_MONTHLY': // Example
                     currentProgress = monthlyInvestCount;
                     break;
                 case 'INVEST_LKR_WEEKLY': // Example
                     currentProgress = weeklyInvestLKR;
                     break;
                // Add other challenge type calculations
                default:
                    console.warn(`Unknown challenge type: ${challenge.type}`);
                    shouldUpdate = false; // Don't update unknown types
                    break;
            }

            // Update the progress map if recalculation is intended
            if (shouldUpdate) {
                // Always update the progress value based on latest calculation
                updatedProgress.set(challenge.id, currentProgress);

                // Check for completion: progress meets goal AND not already completed (for non-resetting)
                // OR if it's a resetting challenge, completion logic might need date checks (simplified here)
                const alreadyCompleted = completedChallengeIds.has(challenge.id);

                // Simple check: Complete if goal met and *either* it's resetting *or* wasn't completed before.
                // More robust logic needed for true resets based on time periods.
                if (currentProgress >= goal && (!alreadyCompleted || challenge.resets)) {
                    console.log(`User ${user._id} potentially completed challenge: ${challenge.id} (Progress: ${currentProgress}, Goal: ${goal}, AlreadyCompleted: ${alreadyCompleted}, Resets: ${challenge.resets})`);

                    // Award stars and notify ONLY if it's the first time completing (or first time this period for resetting challenges)
                    // Simple check: Award if not in the main completed set yet.
                    if (!alreadyCompleted) {
                        isNewlyCompleted = true;
                        newlyCompletedChallengeIds.push(challenge.id); // Mark as newly completed in this run
                        starsToAdd += challenge.starsAwarded || 0; // Add stars for completion
                        console.log(`User ${user._id} confirmed completed challenge: ${challenge.id}, awarding ${challenge.starsAwarded} stars.`);

                        // !! Trigger Notification Hook Here (Challenge Completed) !!
                        await createNotification(user._id, 'gamification_challenge', {
                            title: 'Challenge Complete!',
                            message: `You've completed the "${challenge.name}" challenge! Reward: ${challenge.rewardText || `${challenge.starsAwarded} stars`}`, // Use rewardText or fallback
                            link: '/wallet#gamification',
                            metadata: { challengeId: challenge.id }
                        });
                    }
                    // TODO: For resetting challenges, add logic here to update a 'lastCompletedTimestamp' for the challenge
                    // in the user's progress data to allow re-completion after the reset period.
                }
            }
        } catch (error) {
             console.error(`Error processing challenge ${challenge.id} for user ${user._id}:`, error);
             // Log and continue with the next challenge
        }

    } // End of challenge processing loop


    return {
        newEarnedBadgeIds, // IDs of badges earned in *this* run
        newlyCompletedChallengeIds, // IDs of challenges completed in *this* run
        updatedProgress: Object.fromEntries(updatedProgress), // Convert Map back to object for storage/response
        starsToAdd // Stars gained in *this* run (from badges + challenges)
    };
};


module.exports = { processGamificationState };