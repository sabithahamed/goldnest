// backend/models/PromoCode.js
const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  bonusType: {
    type: String,
    enum: ['PERCENTAGE_DEPOSIT', 'FLAT_LKR_DEPOSIT'],
    required: true,
  },
  bonusValue: {
    type: Number,
    required: true, // e.g., 0.10 for 10% or 500 for LKR 500
  },
  maxUsage: {
    type: Number,
    default: 1, // Default to single use per user
  },
  totalUsageLimit: {
    type: Number, // Overall limit for this code
    default: null, // null means unlimited
  },
  timesUsed: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);
module.exports = PromoCode;