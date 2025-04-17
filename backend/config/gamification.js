// backend/config/gamification.js

// --- Define Badge Criteria Types ---
// 'FIRST_ACTION' - e.g., first investment
// 'TOTAL_INVESTMENT_LKR' - e.g., invested > 50000 LKR total
// 'TOTAL_INVESTMENT_GRAMS' - e.g., hold > 10g total bought
// 'TRANSACTION_COUNT' - e.g., 5+ transactions (any type)
// 'SPECIFIC_TRANSACTION_COUNT' - e.g., 3+ 'investment' transactions, first redemption
// 'REDEEM_COUNT' - e.g., first redemption (Redundant if using SPECIFIC_TRANSACTION_COUNT)
// 'STREAK_DAILY_INVEST' - e.g., invest 7 days in a row (More complex - requires daily tracking)
// Add more as needed...

const BADGES = {
    FIRST_NUGGET: {
        id: 'FIRST_NUGGET',
        name: 'First Nugget',
        description: 'Made your first successful gold investment!',
        icon: 'fas fa-medal', // Font Awesome class
        criteria: { type: 'SPECIFIC_TRANSACTION_COUNT', transactionType: 'investment', count: 1 },
        starsAwarded: 1,
        isActive: true // Added isActive
    },
    GOLD_STARTER: {
        id: 'GOLD_STARTER',
        name: 'Gold Starter',
        description: 'Completed 5 successful transactions (buy/sell).',
        icon: 'fas fa-star',
        criteria: { type: 'TRANSACTION_COUNT', count: 5 }, // Includes buy/sell
        starsAwarded: 1,
        isActive: true // Added isActive
    },
    PROSPECTOR_50K: {
        id: 'PROSPECTOR_50K',
        name: 'Gold Prospector',
        description: 'Invested over Rs. 50,000 in total.',
        icon: 'fas fa-trophy',
        criteria: { type: 'TOTAL_INVESTMENT_LKR', amount: 50000 },
        starsAwarded: 2,
        isActive: true // Added isActive
    },
    GRAM_HOARDER_10: {
        id: 'GRAM_HOARDER_10',
        name: 'Gram Hoarder (10g)',
        description: 'Accumulated over 10 grams of gold through investments.',
        icon: 'fas fa-gem',
         // Note: This checks total *bought*, not current balance after selling
        criteria: { type: 'TOTAL_INVESTMENT_GRAMS', amount: 10 },
        starsAwarded: 2,
        isActive: true // Added isActive
    },
     FIRST_REDEEM: {
         id: 'FIRST_REDEEM',
         name: 'Gold Collector',
         description: 'Successfully redeemed your first physical gold item.',
         icon: 'fas fa-hand-holding-usd', // Example icon
         criteria: { type: 'SPECIFIC_TRANSACTION_COUNT', transactionType: 'redemption', count: 1 },
         starsAwarded: 1,
         isActive: true // Added isActive
     }
    // Add more badges here, remembering to include isActive
};

// --- Define Challenge Types ---
// 'INVEST_LKR_TOTAL' - Invest X LKR overall (tracked ongoing)
// 'INVEST_LKR_MONTHLY' - Invest X LKR this calendar month (resets)
// 'INVEST_LKR_WEEKLY' - Invest X LKR this week (resets)
// 'INVEST_LKR_PERIOD' - Invest X LKR within a specific date range (uses startDate/endDate)
// 'INVEST_COUNT_MONTHLY' - Make X investments this month
// 'SELL_GRAMS_TOTAL' - Sell X grams total
// 'TRADE_COUNT_WEEKLY' - Make X trades (buy/sell) this week (resets)
// Add more as needed...

// --- Define Reward Types ---
// 'BONUS_GOLD' - Awards bonus gold (value in grams)
// 'BONUS_CASH' - Awards cash to user's wallet (value in currency, e.g., LKR)
// 'FEE_DISCOUNT_NEXT_BUY' - % discount on fees for the next buy transaction (value as decimal, e.g., 0.10 for 10%)
// 'BONUS_STARS' - Awards extra gamification stars (value is number of stars)
// Add more as needed...

const CHALLENGES = {
    MONTHLY_5K: {
        id: 'MONTHLY_5K',
        name: 'Monthly Saver',
        description: 'Invest Rs. 5,000 within this calendar month.',
        goal: 5000,
        unit: 'LKR',
        type: 'INVEST_LKR_MONTHLY',
        rewardText: '+0.05g Bonus Gold', // Descriptive text
        duration: 'monthly', // Helps FE understand reset period
        starsAwarded: 1,
        // --- Reward Details ---
        rewardType: 'BONUS_GOLD', // Type of reward
        rewardValue: 0.05,        // Value (grams in this case)
        // --- Activation & Timing ---
        isActive: true,           // Is this challenge currently active?
        startDate: null,          // Start date (ISO format or null for always active)
        endDate: null             // End date (ISO format or null for always active)
    },
    WEEKLY_TRADER: {
         id: 'WEEKLY_TRADER',
         name: 'Weekly Trader',
         description: 'Complete 3 trades (buy or sell) this week.',
         goal: 3,
         unit: 'count',
         type: 'TRADE_COUNT_WEEKLY', // Need logic for this type
         rewardText: '10% Fee Discount on Next Buy',
         duration: 'weekly',
         starsAwarded: 1,
         // --- Reward Details ---
         rewardType: 'FEE_DISCOUNT_NEXT_BUY',
         rewardValue: 0.10, // Value (10% as decimal)
         // --- Activation & Timing ---
         isActive: true,
         startDate: null,
         endDate: null
     },
    PROSPECTOR_CHALLENGE: {
        id: 'PROSPECTOR_CHALLENGE',
        name: 'Prospector Goal',
        description: 'Invest a total of Rs 50,000.',
        goal: 50000,
        unit: 'LKR',
        type: 'INVEST_LKR_TOTAL', // Tracks lifetime investment
        rewardText: '+ Rs. 100 Wallet Bonus',
        duration: 'total', // Ongoing
        starsAwarded: 2,
         // --- Reward Details ---
        rewardType: 'BONUS_CASH', // Type
        rewardValue: 100, // Value (LKR in this case)
         // --- Activation & Timing ---
        isActive: true,
        startDate: null,
        endDate: null
     },
     // --- Example Seasonal Challenge ---
     NEW_YEAR_INVEST_FEST: {
          id: 'NEW_YEAR_INVEST_FEST',
          name: 'New Year Invest Fest',
          description: 'Invest Rs. 10,000 between Jan 1st and Jan 15th, 2025.',
          goal: 10000,
          unit: 'LKR',
          type: 'INVEST_LKR_PERIOD', // Requires logic checking transactions within dates
          rewardText: '+15 Stars',
          duration: 'event', // Indicates a specific period
          starsAwarded: 15, // Can be 0 if rewardType is BONUS_STARS
          // --- Reward Details ---
          rewardType: 'BONUS_STARS',
          rewardValue: 15,
          // --- Activation & Timing ---
          isActive: true,
          startDate: '2025-01-01T00:00:00.000Z', // Start Date (ISO Format UTC recommended)
          endDate: '2025-01-15T23:59:59.999Z'     // End Date (ISO Format UTC recommended)
      },
      // --- Example Inactive Challenge ---
      OLD_CHALLENGE: {
           id: 'OLD_CHALLENGE',
           name: 'Old Event (Inactive)',
           description: 'This was a past event.',
           goal: 1,
           unit: 'count',
           type: 'TRANSACTION_COUNT', // Example type
           rewardText: 'No reward',
           duration: 'event',
           starsAwarded: 0,
           // --- Reward Details ---
           rewardType: 'NONE', // Example for no direct reward
           rewardValue: 0,
           // --- Activation & Timing ---
           isActive: false, // <-- Set to false to disable
           startDate: '2024-01-01T00:00:00.000Z',
           endDate: '2024-01-31T23:59:59.999Z'
       }
    // Add more challenges here, including all new fields
};

// --- Helper Functions to get ACTIVE definitions ---

/**
 * Returns an array of challenge definitions that are currently active.
 * Checks the `isActive` flag and the `startDate` and `endDate` if present.
 * @returns {Array<Object>} Array of active challenge objects.
 */
const getActiveChallenges = () => {
    const now = new Date();
    return Object.values(CHALLENGES).filter(challenge => {
        if (!challenge.isActive) {
            return false; // Not active flag
        }
        // Check date range if specified
        // Note: Assumes startDate and endDate are valid ISO date strings if not null
        if (challenge.startDate && new Date(challenge.startDate) > now) {
            return false; // Challenge hasn't started yet
        }
        if (challenge.endDate && new Date(challenge.endDate) < now) {
            return false; // Challenge has already ended
        }
        return true; // Active and within date range (or no dates specified)
    });
};

/**
 * Returns an array of all badge definitions that are marked as active.
 * Filters based on the `isActive` flag.
 * @returns {Array<Object>} Array of active badge objects.
 */
const getAllBadges = () => {
    // Filter out inactive badges. Modify this if you want to show inactive ones (e.g., greyed out) in the UI.
     return Object.values(BADGES).filter(badge => badge.isActive);
    // To return ALL badges (including inactive):
    // return Object.values(BADGES);
};


module.exports = {
    BADGES,              // Raw definitions (useful for admin panels or specific lookups)
    CHALLENGES,          // Raw definitions
    getActiveChallenges, // Use this in services to get currently relevant challenges
    getAllBadges         // Use this in services to get currently relevant badges
};