// backend/models/ChallengeDefinition.js
const mongoose = require('mongoose');

const challengeDefinitionSchema = new mongoose.Schema({
    challengeId: { type: String, required: true, unique: true }, // Use the unique ID like 'MONTHLY_5K'
    name: { type: String, required: true },
    description: { type: String, required: true },
    goal: { type: Number, required: true },
    unit: { type: String, required: true }, // 'LKR', 'grams', 'count'
    type: { type: String, required: true }, // 'INVEST_LKR_MONTHLY', 'TRADE_COUNT_WEEKLY', etc.
    rewardText: { type: String }, // Descriptive text for display
    duration: { type: String, enum: ['monthly', 'weekly', 'total', 'event'], required: true }, // 'total' means ongoing
    starsAwarded: { type: Number, default: 0 },
    // Reward Details
    rewardType: { type: String }, // e.g., 'BONUS_GOLD', 'BONUS_CASH', 'FEE_DISCOUNT_NEXT_BUY', 'BADGE_ELIGIBILITY'
    rewardValue: { type: Number }, // Amount/percentage for the reward
    // Activation Control
    isActive: { type: Boolean, default: true }, // Can admin enable/disable?
    startDate: { type: Date }, // Optional: For event-based challenges
    endDate: { type: Date },   // Optional: For event-based challenges
}, { timestamps: true });

module.exports = mongoose.model('ChallengeDefinition', challengeDefinitionSchema);