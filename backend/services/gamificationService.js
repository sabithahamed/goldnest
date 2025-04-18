// backend/services/gamificationService.js
const { getActiveChallenges, getAllBadges } = require('../config/gamification'); // Use updated helpers from config

/**
 * Helper function to get the start of the current month or week.
 * @param {('month'|'week')} period - The period to get the start of.
 * @returns {Date|null} The start date or null if period is invalid.
 */
const getStartOf = (period) => {
    const now = new Date();
    if (period === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (period === 'week') {
        const currentDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to Monday
        const monday = new Date(now.getFullYear(), now.getMonth(), diff);
        return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0);
    }
    console.warn(`[GS] getStartOf called with invalid period: ${period}`);
    return null;
};


/**
 * Calculates potential gamification changes based on user state using definitions from config.
 * Returns only the *deltas*: newly earned badge IDs, newly completed challenge IDs,
 * stars to potentially add, and the full calculated progress map *if* it differs.
 * Does NOT perform database fetches/saves or send notifications. Relies on config helpers.
 *
 * @param {object} user - The user object (must include transactions, earnedBadgeIds, completedChallengeIds, challengeProgress).
 * @returns {object} An object containing:
 *   - `newBadgeIds` (Array<string>): List of badge IDs newly earned based on criteria.
 *   - `newCompletedChallengeIds` (Array<string>): List of challenge IDs newly completed based on criteria.
 *   - `starsToAdd` (number): Total stars calculated from newly earned items (badges + challenges).
 *   - `updatedProgressMap` (Map<string, number> | null): The calculated challenge progress map, ONLY if it differs from the user's existing progress; otherwise null.
 */
const processGamificationState = (user) => { // No longer needs definitions passed in
    // Initial checks for valid user input
    if (!user || !user._id) {
        console.warn("[GS] processGamificationState called with invalid or missing user object.");
        return { newBadgeIds: [], newCompletedChallengeIds: [], starsToAdd: 0, updatedProgressMap: null };
    }

    // Use provided user state, ensuring defaults for missing properties
    const transactions = user.transactions || [];
    const existingBadgeIds = new Set(user.earnedBadgeIds || []);
    const existingCompletedChallenges = new Set(user.completedChallengeIds || []);
    const existingProgress = user.challengeProgress instanceof Map
        ? user.challengeProgress
        : new Map(Object.entries(user.challengeProgress || {})); // Convert from object if needed

    // Initialize structures for calculation
    let currentProgressMap = new Map(); // Calculate fresh progress based on current transactions
    let newBadgeIds = [];
    let newCompletedChallengeIds = [];
    let starsToAdd = 0;

    console.log(`[GS Debug] User ${user._id} Start State: Badges=${existingBadgeIds.size}, CompletedC=${existingCompletedChallenges.size}`);

    // --- Calculate Aggregates from Transactions ---
    let totalInvestmentLKR = 0, totalInvestmentGrams = 0, investmentCount = 0, sellCount = 0, redemptionCount = 0;
    let monthlyInvestLKR = 0, weeklyTradeCount = 0;
    const startOfMonth = getStartOf('month');
    const startOfWeek = getStartOf('week');

    // Map to store aggregates for specific period-based challenges (e.g., INVEST_LKR_PERIOD)
    // Key: challengeId, Value: number (aggregated amount/count)
    const periodAggregates = new Map();
    const activePeriodChallenges = getActiveChallenges().filter(c => c.type === 'INVEST_LKR_PERIOD'); // Pre-filter for efficiency

    transactions.forEach(tx => {
        // Basic validation for transaction object and essential fields
        if (!tx || !tx.date || !tx.type) {
            console.warn(`[GS Debug] User ${user._id} Skipping invalid transaction:`, tx);
            return;
        }
        const txDate = new Date(tx.date);
        if (isNaN(txDate.getTime())) {
             console.warn(`[GS Debug] User ${user._id} Skipping transaction with invalid date:`, tx);
             return; // Invalid date check
        }

        // Aggregate based on transaction type (Standard Aggregates)
        if (tx.type === 'investment') {
            investmentCount++;
            const amountLKR = tx.amountLKR || 0;
            const amountGrams = tx.amountGrams || 0;
            totalInvestmentLKR += amountLKR;
            totalInvestmentGrams += amountGrams;
            if (startOfMonth && txDate >= startOfMonth) monthlyInvestLKR += amountLKR;
            if (startOfWeek && txDate >= startOfWeek) weeklyTradeCount++;

            // --- Aggregate for Period-Based Investment Challenges ---
            activePeriodChallenges.forEach(challenge => {
                // Should already be INVEST_LKR_PERIOD type because of pre-filtering
                try {
                    const challengeStart = challenge.startDate ? new Date(challenge.startDate) : null;
                    const challengeEnd = challenge.endDate ? new Date(challenge.endDate) : null;

                    // Check if transaction date falls within the challenge's specific period
                    if ((!challengeStart || txDate >= challengeStart) && (!challengeEnd || txDate <= challengeEnd)) {
                         const currentPeriodTotal = (periodAggregates.get(challenge.id) || 0) + amountLKR;
                         periodAggregates.set(challenge.id, currentPeriodTotal);
                         // console.log(`[GS Debug] User ${user._id} Tx ${tx._id} added ${amountLKR} to period challenge ${challenge.id}. New total: ${currentPeriodTotal}`);
                    }
                } catch(e) {
                    console.error(`[GS Error] User ${user._id}: Error processing period challenge ${challenge.id} dates:`, e);
                }
            });
            // --- End Period Aggregation ---

        } else if (tx.type === 'sell_gold') {
            sellCount++;
            if (startOfWeek && txDate >= startOfWeek) weeklyTradeCount++;
        } else if (tx.type === 'redemption') {
            redemptionCount++;
        }
        // Add other transaction types if needed for future badges/challenges
    });

    // --- Check Badges (using filtered active badges from config) ---
    const activeBadges = getAllBadges(); // Gets only badges where isActive: true
    activeBadges.forEach(badge => {
        if (!badge || !badge.id || !badge.criteria) {
            console.warn(`[GS] Skipping invalid badge definition from config:`, badge);
            return;
        }
        // Check if the user does NOT already have this badge
        if (!existingBadgeIds.has(badge.id)) {
            let criteriaMet = false;
            const criteria = badge.criteria;
            try {
                // Evaluate criteria based on calculated aggregates
                switch (criteria.type) {
                    case 'SPECIFIC_TRANSACTION_COUNT':
                        if (criteria.transactionType === 'investment' && investmentCount >= criteria.count) criteriaMet = true;
                        else if (criteria.transactionType === 'redemption' && redemptionCount >= criteria.count) criteriaMet = true;
                        // ... add other specific types if needed
                        break;
                    case 'TRANSACTION_COUNT': // Generic count - relies on config for which types count
                        if (badge.id === 'GOLD_STARTER' && (investmentCount + sellCount) >= criteria.count) criteriaMet = true;
                        // Add other generic count badges here based on badge.id
                        break;
                    case 'TOTAL_INVESTMENT_LKR':
                        if (totalInvestmentLKR >= criteria.amount) criteriaMet = true;
                        break;
                    case 'TOTAL_INVESTMENT_GRAMS':
                        if (totalInvestmentGrams >= criteria.amount) criteriaMet = true;
                        break;
                     // Add other criteria types here
                }
            } catch (err) {
                console.error(`[GS Error] User ${user._id}: Evaluating badge ${badge.id} criteria failed:`, err);
            }

            if (criteriaMet) {
                newBadgeIds.push(badge.id);
                starsToAdd += badge.starsAwarded || 0;
                console.log(`[GS Debug] User ${user._id} -> NEWLY earned badge ID: ${badge.id}`);
            }
        }
    });

    // --- Calculate Challenge Progress & Check for NEW Completions (using filtered active challenges from config) ---
    const activeChallenges = getActiveChallenges(); // Gets only active/current challenges based on config
    activeChallenges.forEach(challenge => {
         if (!challenge || !challenge.id || !challenge.type || typeof challenge.goal === 'undefined') {
             console.warn(`[GS] Skipping invalid challenge definition from config:`, challenge);
             return;
        }

         let currentProgress = 0;
         let progressCalculated = false; // Flag to ensure we only store progress if calculable
         try {
            // Calculate progress based on challenge type and aggregated data
            switch (challenge.type) {
                case 'INVEST_LKR_MONTHLY':
                    currentProgress = monthlyInvestLKR;
                    progressCalculated = true;
                    break;
                case 'TRADE_COUNT_WEEKLY':
                    currentProgress = weeklyTradeCount;
                    progressCalculated = true;
                    break;
                case 'INVEST_LKR_TOTAL':
                    currentProgress = totalInvestmentLKR;
                    progressCalculated = true;
                    break;
                case 'INVEST_LKR_PERIOD': // Use the pre-calculated period aggregate
                     currentProgress = periodAggregates.get(challenge.id) || 0;
                     progressCalculated = true;
                     break;
                // Add other challenge types here
                // Example: case 'TRANSACTION_COUNT': (if a challenge used this type)
                //    currentProgress = investmentCount + sellCount; // Or specific types based on challenge definition
                //    progressCalculated = true;
                //    break;
            }
         } catch (err) {
            console.error(`[GS Error] User ${user._id}: Calculating progress for challenge ${challenge.id} failed:`, err);
         }

        if (progressCalculated) {
             // Always store the calculated progress for active challenges in the current map
            currentProgressMap.set(challenge.id, currentProgress);

            // Check if the user has NOT already completed this challenge
            // NOTE: This assumes challenges aren't *repeatable* once completed within their cycle.
            // More complex logic needed for repeatable challenges (e.g., check completion timestamp vs. cycle start).
            // Also check if reward has been claimed, as claiming marks completion effectively
            const isAlreadyCompleted = existingCompletedChallenges.has(challenge.id) || existingProgress.get(`${challenge.id}_claimed`) === true;

            if (!isAlreadyCompleted) {
                 // Check if the calculated progress meets or exceeds the challenge goal
                 if (currentProgress >= challenge.goal) {
                     newCompletedChallengeIds.push(challenge.id);
                     // Award stars immediately upon completion detection (claim handles other rewards)
                     starsToAdd += challenge.starsAwarded || 0;
                     console.log(`[GS Debug] User ${user._id} -> NEWLY completed challenge ID: ${challenge.id} (Progress: ${currentProgress}/${challenge.goal})`);
                     // Note: We don't grant non-star rewards here, that happens on claim.
                     // We also don't mark as completed here, that happens in the trigger service after save.
                 }
            } else {
                // Optional: Log if challenge was already completed or claimed
                // console.log(`[GS Debug] User ${user._id} -> Challenge ${challenge.id} already completed or claimed.`);
            }
        }
    });

    // --- Check if the calculated progress map is different from the existing one ---
    let progressChanged = false;
    // Convert the Map from the user's state to a plain object for simple comparison
    // Only compare keys present in the *newly calculated* map, as old keys for inactive challenges are irrelevant now.
    const existingProgressObjFiltered = {};
    for (const key of currentProgressMap.keys()) {
        // Include progress value, claimed status, and discount status for comparison
        existingProgressObjFiltered[key] = existingProgress.get(key);
        if (existingProgress.has(`${key}_claimed`)) existingProgressObjFiltered[`${key}_claimed`] = existingProgress.get(`${key}_claimed`);
        if (existingProgress.has(`${key}_discount_percent`)) existingProgressObjFiltered[`${key}_discount_percent`] = existingProgress.get(`${key}_discount_percent`);
        if (existingProgress.has(`${key}_discount_applied`)) existingProgressObjFiltered[`${key}_discount_applied`] = existingProgress.get(`${key}_discount_applied`);
    }

    // Convert the newly calculated Map + associated flags to a plain object
    const currentProgressObjWithFlags = {};
     for (const [key, value] of currentProgressMap.entries()) {
        currentProgressObjWithFlags[key] = value;
        // Carry over existing claimed/discount flags if they exist, otherwise they are implicitly undefined/false
         if (existingProgress.has(`${key}_claimed`)) currentProgressObjWithFlags[`${key}_claimed`] = existingProgress.get(`${key}_claimed`);
         if (existingProgress.has(`${key}_discount_percent`)) currentProgressObjWithFlags[`${key}_discount_percent`] = existingProgress.get(`${key}_discount_percent`);
         if (existingProgress.has(`${key}_discount_applied`)) currentProgressObjWithFlags[`${key}_discount_applied`] = existingProgress.get(`${key}_discount_applied`);
     }

    // Use JSON.stringify for comparison. Prone to key order issues, but simple.
    // A deep comparison function would be more robust but adds complexity.
    if (JSON.stringify(existingProgressObjFiltered) !== JSON.stringify(currentProgressObjWithFlags)) {
        progressChanged = true;
        console.log(`[GS Debug] User ${user._id} -> Challenge progress map changed.`);
        // Optional detailed logging:
        // console.log(`[GS Debug] Old Progress (Filtered):`, existingProgressObjFiltered);
        // console.log(`[GS Debug] New Progress (w/ Flags):`, currentProgressObjWithFlags);
    } else {
        // console.log(`[GS Debug] User ${user._id} -> Challenge progress map unchanged.`);
    }

    console.log(`[GS Debug] User ${user._id} Returning Deltas: NewBadgeIDs=${newBadgeIds.length}, NewCompletedChallengeIDs=${newCompletedChallengeIds.length}, StarsToAdd=${starsToAdd}, ProgressChanged=${progressChanged}`);

    // Return only the calculated changes (deltas)
    return {
        newBadgeIds,
        newCompletedChallengeIds,
        starsToAdd,
        // Return the full calculated progress Map (values only, not flags) *only* if it differs
        updatedProgressMap: progressChanged ? currentProgressMap : null
    };
};

// Export only the processing function
module.exports = { processGamificationState };