// backend/config/gamification.js

// --- Define Badge Criteria Types ---
// 'FIRST_ACTION' - e.g., first investment
// 'TOTAL_INVESTMENT_LKR' - e.g., invested > 50000 LKR total
// 'TOTAL_INVESTMENT_GRAMS' - e.g., hold > 10g total bought
// 'TRANSACTION_COUNT' - e.g., 5+ transactions (any type)
// 'SPECIFIC_TRANSACTION_COUNT' - e.g., 3+ 'investment' transactions
// 'REDEEM_COUNT' - e.g., first redemption
// 'STREAK_DAILY_INVEST' - e.g., invest 7 days in a row (More complex - requires daily tracking)

const BADGES = {
  FIRST_NUGGET: {
      id: 'FIRST_NUGGET',
      name: 'First Nugget',
      description: 'Made your first successful gold investment!',
      icon: 'fas fa-medal', // Font Awesome class
      criteria: { type: 'SPECIFIC_TRANSACTION_COUNT', transactionType: 'investment', count: 1 },
      starsAwarded: 1 // Example star value
  },
  GOLD_STARTER: {
      id: 'GOLD_STARTER',
      name: 'Gold Starter',
      description: 'Completed 5 successful transactions (buy/sell).',
      icon: 'fas fa-star',
      criteria: { type: 'TRANSACTION_COUNT', count: 5 }, // Includes buy/sell
      starsAwarded: 1
  },
  PROSPECTOR_50K: {
      id: 'PROSPECTOR_50K',
      name: 'Gold Prospector',
      description: 'Invested over Rs. 50,000 in total.',
      icon: 'fas fa-trophy',
      criteria: { type: 'TOTAL_INVESTMENT_LKR', amount: 50000 },
      starsAwarded: 2
  },
  GRAM_HOARDER_10: {
      id: 'GRAM_HOARDER_10',
      name: 'Gram Hoarder (10g)',
      description: 'Accumulated over 10 grams of gold through investments.',
      icon: 'fas fa-gem',
       // Note: This checks total *bought*, not current balance after selling
      criteria: { type: 'TOTAL_INVESTMENT_GRAMS', amount: 10 },
      starsAwarded: 2
  },
   FIRST_REDEEM: {
       id: 'FIRST_REDEEM',
       name: 'Gold Collector',
       description: 'Successfully redeemed your first physical gold item.',
       icon: 'fas fa-hand-holding-usd', // Example icon
       criteria: { type: 'SPECIFIC_TRANSACTION_COUNT', transactionType: 'redemption', count: 1 },
       starsAwarded: 1
   }
  // Add more badges
};

// --- Define Challenge Types ---
// 'INVEST_LKR_TOTAL' - Invest X LKR overall (tracked ongoing)
// 'INVEST_LKR_MONTHLY' - Invest X LKR this calendar month (resets)
// 'INVEST_LKR_WEEKLY' - Invest X LKR this week (resets)
// 'INVEST_COUNT_MONTHLY' - Make X investments this month
// 'SELL_GRAMS_TOTAL' - Sell X grams total
// Add more as needed

const CHALLENGES = {
  MONTHLY_5K: {
      id: 'MONTHLY_5K',
      name: 'Monthly Saver',
      description: 'Invest Rs. 5,000 within this calendar month.',
      goal: 5000,
      unit: 'LKR',
      type: 'INVEST_LKR_MONTHLY',
      rewardText: 'Bronze Investor Badge eligibility', // Example text reward
      duration: 'monthly',
      starsAwarded: 1 // Award stars on completion
  },
  WEEKLY_TRADER: {
       id: 'WEEKLY_TRADER',
       name: 'Weekly Trader',
       description: 'Complete 3 trades (buy or sell) this week.',
       goal: 3,
       unit: 'count',
       type: 'TRADE_COUNT_WEEKLY', // Need logic for this type
       rewardText: 'Reduced fees next week (simulated)',
       duration: 'weekly',
       starsAwarded: 1
   },
  // Match the 'Prospector' challenge from HTML (treat as ongoing goal)
   PROSPECTOR_CHALLENGE: {
      id: 'PROSPECTOR_CHALLENGE',
      name: 'Prospector Goal',
      description: 'Invest a total of Rs 50,000.', // Use same threshold as badge?
      goal: 50000,
      unit: 'LKR',
      type: 'INVEST_LKR_TOTAL', // Tracks lifetime investment
      rewardText: '1% discount next purchase (Simulated)',
      duration: 'total', // Ongoing
      starsAwarded: 2 // Maybe more stars for a big goal
   }
  // Add more challenges
};

const getActiveChallenges = () => Object.values(CHALLENGES); // Keep simple for now
const getAllBadges = () => Object.values(BADGES);

module.exports = { BADGES, CHALLENGES, getActiveChallenges, getAllBadges };