// backend/models/BadgeDefinition.js
const mongoose = require('mongoose');

const criteriaSchema = new mongoose.Schema({
    type: { type: String, required: true }, // e.g., 'SPECIFIC_TRANSACTION_COUNT', 'TOTAL_INVESTMENT_LKR'
    // Add fields specific to criteria types
    transactionType: { type: String }, // For 'SPECIFIC_TRANSACTION_COUNT'
    count: { type: Number },           // For count-based criteria
    amount: { type: Number },          // For amount-based criteria (LKR or Grams)
}, { _id: false }); // No separate ID for sub-schema

const badgeDefinitionSchema = new mongoose.Schema({
    badgeId: { type: String, required: true, unique: true }, // Use the unique ID like 'FIRST_NUGGET'
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, default: 'fas fa-medal' }, // Font Awesome class
    criteria: { type: criteriaSchema, required: true },
    starsAwarded: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true } // To enable/disable badges
}, { timestamps: true });

module.exports = mongoose.model('BadgeDefinition', badgeDefinitionSchema);