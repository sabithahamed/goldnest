// backend/models/DynamicChallenge.js
const mongoose = require('mongoose');

const dynamicChallengeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ['INVEST_LKR_PERIOD'], // Start with one type, can add more later
    required: true,
  },
  goal: { type: Number, required: true }, // e.g., 10000 LKR
  rewardText: { type: String, required: true },
  rewardType: {
    type: String,
    enum: ['BONUS_STARS'], // Start with one reward type
    required: true
  },
  rewardValue: { type: Number, required: true }, // e.g., 15 stars
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const DynamicChallenge = mongoose.model('DynamicChallenge', dynamicChallengeSchema);
module.exports = DynamicChallenge;