// backend/services/gamificationService.js
// REMOVE: const { BADGES, CHALLENGES, getActiveChallenges, getAllBadges } = require('../config/gamification'); // Old config import removed
const BadgeDefinition = require('../models/BadgeDefinition'); // <-- IMPORT MODEL (As requested, though not directly used in this function)
const ChallengeDefinition = require('../models/ChallengeDefinition'); // <-- IMPORT MODEL (As requested, though not directly used in this function)
// REMOVE createNotification import - Was not present, remains not present as intended.

/**
 * Helper function to get the start of the current month or week.
 * @param {('month'|'week')} period - The period to get the start of.
 * @returns {Date|null} The start date or null if period is invalid.
 */
const getStartOf = (period) => {
    const now = new Date();
    if (period === 'month') {
        // Start of the current month (e.g., Aug 1st, 00:00:00)
        return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (period === 'week') {
        // Start of the current week (Monday, 00:00:00)
        const currentDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        // Calculate difference to get to the previous Monday
        // If today is Sunday (0), diff = date - 0 - 6 = date - 6 (previous Monday)
        // If today is Monday (1), diff = date - 1 + 1 = date (this Monday)
        // If today is Tuesday (2), diff = date - 2 + 1 = date - 1 (previous Monday)
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const monday = new Date(now.getFullYear(), now.getMonth(), diff);
        return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0);
    }
    console.warn(`[GS] getStartOf called with invalid period: ${period}`);
    return null;
};


/**
 * Calculates potential gamification changes based on user state using provided definitions.
 * Returns only the *deltas*: newly earned badge IDs, newly completed challenge IDs,
 * stars to potentially add, and the full calculated progress map *if* it differs.
 * Does NOT perform database fetches/saves or send notifications.
 *
 * @param {object} user - The user object (must include transactions, earnedBadgeIds, completedChallengeIds, challengeProgress).
 * @param {Array<object>} allBadges - Array of BadgeDefinition objects fetched from DB.
 * @param {Array<object>} activeChallenges - Array of active ChallengeDefinition objects fetched from DB.
 * @returns {object} An object containing:
 *   - `newBadgeIds` (Array<string>): List of badge IDs newly earned based on criteria.
 *   - `newCompletedChallengeIds` (Array<string>): List of challenge IDs newly completed based on criteria.
 *   - `starsToAdd` (number): Total stars calculated from newly earned items.
 *   - `updatedProgressMap` (Map<string, number> | null): The calculated challenge progress map, ONLY if it differs from the user's existing progress; otherwise null.
 */
// Modified function signature to accept definitions fetched from the caller
const processGamificationState = (user, allBadges, activeChallenges) => {
    // Initial checks for valid user input
    if (!user || !user._id) { // Check for user and user._id for logging
        console.warn("[GS] processGamificationState called with invalid or missing user object.");
        return { newBadgeIds: [], newCompletedChallengeIds: [], starsToAdd: 0, updatedProgressMap: null };
    }
     if (!allBadges || !Array.isArray(allBadges)) {
         console.warn("[GS] processGamificationState called with invalid or missing allBadges array.");
         return { newBadgeIds: [], newCompletedChallengeIds: [], starsToAdd: 0, updatedProgressMap: null };
     }
     if (!activeChallenges || !Array.isArray(activeChallenges)) {
        console.warn("[GS] processGamificationState called with invalid or missing activeChallenges array.");
        return { newBadgeIds: [], newCompletedChallengeIds: [], starsToAdd: 0, updatedProgressMap: null };
     }

    // Use provided user state, ensuring defaults for missing properties
    const transactions = user.transactions || [];
    const existingBadgeIds = new Set(user.earnedBadgeIds || []);
    const existingCompletedChallenges = new Set(user.completedChallengeIds || []);
     // Ensure existingProgress is always a Map for consistent comparison later
    const existingProgress = user.challengeProgress instanceof Map
        ? user.challengeProgress
        : new Map(Object.entries(user.challengeProgress || {})); // Convert from object if needed

    // Initialize structures for calculation
    let currentProgressMap = new Map(); // Calculate fresh progress based on current transactions
    let newBadgeIds = []; // Store IDs only
    let newCompletedChallengeIds = []; // Store IDs only
    let starsToAdd = 0;

    console.log(`[GS Debug] User ${user._id} Start State: Badges=${existingBadgeIds.size}, CompletedC=${existingCompletedChallenges.size}`);
    // console.log(`[GS Debug] Existing Completed Challenges Set:`, Array.from(existingCompletedChallenges)); // Optional verbose log

    // --- Calculate Aggregates from Transactions ---
    let totalInvestmentLKR = 0, totalInvestmentGrams = 0, investmentCount = 0, sellCount = 0, redemptionCount = 0;
    let monthlyInvestLKR = 0, weeklyTradeCount = 0;
    const startOfMonth = getStartOf('month');
    const startOfWeek = getStartOf('week');

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

        // Aggregate based on transaction type
        if (tx.type === 'investment') {
            investmentCount++;
            totalInvestmentLKR += tx.amountLKR || 0;
            totalInvestmentGrams += tx.amountGrams || 0;
            // Check if transaction date is within the current month/week
            if (startOfMonth && txDate >= startOfMonth) monthlyInvestLKR += tx.amountLKR || 0;
            if (startOfWeek && txDate >= startOfWeek) weeklyTradeCount++;
        } else if (tx.type === 'sell_gold') {
            sellCount++;
            // Check if transaction date is within the current week
            if (startOfWeek && txDate >= startOfWeek) weeklyTradeCount++;
        } else if (tx.type === 'redemption') {
            redemptionCount++;
        }
        // Add other transaction types if needed for future badges/challenges
    });

    // --- Check Badges (using definitions from DB) ---
    // REMOVE: const allBadges = getAllBadges(); // No longer needed here
    allBadges.forEach(badge => { // Iterate over badges passed in
        // Basic validation for badge definition
        if (!badge || !badge.badgeId || !badge.criteria) { // Use badgeId
            console.warn(`[GS] Skipping invalid badge definition:`, badge);
            return;
        }
        // Check if the user does NOT already have this badge
        if (!existingBadgeIds.has(badge.badgeId)) { // Use badgeId
            let criteriaMet = false;
            const criteria = badge.criteria;
            try {
                // Evaluate criteria based on calculated aggregates
                // ... (KEEP the switch statement logic for checking criteria types) ...
                switch (criteria.type) {
                    case 'SPECIFIC_TRANSACTION_COUNT':
                        if (criteria.transactionType === 'investment' && investmentCount >= criteria.count) criteriaMet = true;
                        else if (criteria.transactionType === 'redemption' && redemptionCount >= criteria.count) criteriaMet = true;
                        // ... add other specific types if needed (e.g., 'sell_gold')
                        break;
                    case 'TRANSACTION_COUNT': // Generic count, check badge ID for specifics if needed
                        // Note: Using badgeId here might be slightly less readable than the old id,
                        // consider adding a descriptive name field to the BadgeDefinition model if needed.
                        if (badge.badgeId === 'GOLD_STARTER' && (investmentCount + sellCount) >= criteria.count) criteriaMet = true;
                        // Add other generic count badges here based on badgeId
                        break;
                    case 'TOTAL_INVESTMENT_LKR':
                        if (totalInvestmentLKR >= criteria.amount) criteriaMet = true;
                        break;
                    case 'TOTAL_INVESTMENT_GRAMS':
                        if (totalInvestmentGrams >= criteria.amount) criteriaMet = true;
                        break;
                     // Add other criteria types here (e.g., FIRST_INVESTMENT, FIRST_SELL)
                }
            } catch (err) {
                console.error(`[GS Error] User ${user._id}: Evaluating badge ${badge.badgeId} criteria failed:`, err); // Use badgeId
            }

            // If criteria met for a badge the user doesn't have, add it to the list of new badges
            if (criteriaMet) {
                newBadgeIds.push(badge.badgeId); // Use badgeId
                starsToAdd += badge.starsAwarded || 0;
                console.log(`[GS Debug] User ${user._id} -> NEWLY earned badge ID: ${badge.badgeId}`); // Use badgeId
            }
        }
    });

    // --- Calculate Challenge Progress & Check for NEW Completions (using definitions from DB) ---
    // REMOVE: const activeChallenges = getActiveChallenges(); // No longer needed here
    activeChallenges.forEach(challenge => { // Iterate over challenges passed in
         // Basic validation for challenge definition
         if (!challenge || !challenge.challengeId || !challenge.type || !challenge.goal) { // Use challengeId
             console.warn(`[GS] Skipping invalid challenge definition:`, challenge);
             return;
        }

         let currentProgress = 0;
         let progressCalculated = false; // Flag to ensure we only store progress if calculable
         try {
            // Calculate progress based on challenge type and aggregated data
            // ... (KEEP the switch statement logic for calculating progress based on type) ...
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
                // Add other challenge types here (e.g., INVEST_GRAMS_TOTAL, CONSECUTIVE_LOGINS etc.)
            }
         } catch (err) {
            console.error(`[GS Error] User ${user._id}: Calculating progress for challenge ${challenge.challengeId} failed:`, err); // Use challengeId
         }

        if (progressCalculated) {
             // Always store the calculated progress for active challenges
            currentProgressMap.set(challenge.challengeId, currentProgress); // Use challengeId

            // Check if the user has NOT already completed this challenge
            // NOTE: This assumes challenges are not repeatable within their cycle (e.g., once monthly is done, it's done for that month).
            // Add reset logic/checking based on challenge definition if needed (e.g., comparing completion date).
            if (!existingCompletedChallenges.has(challenge.challengeId)) { // Use challengeId
                 // Check if the calculated progress meets or exceeds the challenge goal
                 if (currentProgress >= challenge.goal) {
                     newCompletedChallengeIds.push(challenge.challengeId); // Use challengeId
                     starsToAdd += challenge.starsAwarded || 0;
                     console.log(`[GS Debug] User ${user._id} -> NEWLY completed challenge ID: ${challenge.challengeId} (Progress: ${currentProgress}/${challenge.goal})`); // Use challengeId
                 }
            } else {
                // Optional: Log if challenge was already completed
                // console.log(`[GS Debug] User ${user._id} -> Challenge ${challenge.challengeId} already completed.`);
            }
        }
    });

    // --- Check if the calculated progress map is different from the existing one ---
    let progressChanged = false;
    // Convert the Map from the user's state to a plain object for comparison
    const existingProgressObj = Object.fromEntries(existingProgress);
    // Convert the newly calculated Map to a plain object for comparison
    const currentProgressObj = Object.fromEntries(currentProgressMap);

    // Use JSON.stringify for a simple, albeit potentially less performant/robust, comparison.
    // Assumes key order is consistent, which is generally true for objects derived from Maps in modern JS.
    if (JSON.stringify(existingProgressObj) !== JSON.stringify(currentProgressObj)) {
        progressChanged = true;
        console.log(`[GS Debug] User ${user._id} -> Challenge progress map changed.`);
        // Optional detailed logging:
        // console.log(`[GS Debug] Old Progress:`, existingProgressObj);
        // console.log(`[GS Debug] New Progress:`, currentProgressObj);
    } else {
        // console.log(`[GS Debug] User ${user._id} -> Challenge progress map unchanged.`);
    }

    console.log(`[GS Debug] User ${user._id} Returning Deltas: NewBadgeIDs=${newBadgeIds.length}, NewCompletedChallengeIDs=${newCompletedChallengeIds.length}, StarsToAdd=${starsToAdd}, ProgressChanged=${progressChanged}`);

    // Return only the calculated changes (deltas)
    return {
        newBadgeIds,                 // Array of newly earned badge IDs
        newCompletedChallengeIds,    // Array of newly completed challenge IDs
        starsToAdd,                  // Total stars from new items
        // Return the full calculated progress Map *only* if it differs from the user's existing map
        updatedProgressMap: progressChanged ? currentProgressMap : null
    };
};

// Export only the processing function, as saving/notifications happen elsewhere
module.exports = { processGamificationState };