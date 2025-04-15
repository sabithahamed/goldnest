// backend/models/Redemption.js
const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Link back to the user
    },
    itemDescription: { type: String, required: true }, // e.g., "5g Coin", "10g Bar"
    quantity: { type: Number, required: true, min: 1 },
    totalGrams: { type: Number, required: true },
    deliveryFeeLKR: { type: Number, required: true },
    // Add shipping details collected from user
    shippingName: { type: String, required: true },
    shippingAddress: { type: String, required: true },
    shippingCity: { type: String, required: true },
    shippingPhone: { type: String, required: true },
    // Status and Tracking
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'failed', 'cancelled'],
        default: 'pending'
    },
    trackingNumber: { type: String },
    // Link to the transaction created in User model
    userTransactionId: { type: mongoose.Schema.Types.ObjectId }

}, { timestamps: true }); // Add createdAt/updatedAt

const Redemption = mongoose.model('Redemption', redemptionSchema);
module.exports = Redemption;