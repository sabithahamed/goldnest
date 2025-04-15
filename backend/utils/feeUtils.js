// backend/utils/feeUtils.js
const { getFeeConfig } = require('../config/fees');

/**
 * Calculates the fee for buying gold based on the LKR amount.
 * @param {number} amountLKR - The amount in LKR being invested.
 * @returns {number} The calculated fee in LKR.
 */
const calculateBuyFee = (amountLKR) => {
    if (typeof amountLKR !== 'number' || amountLKR <= 0) {
        return 0; // No fee for invalid or zero amount
    }
    const feeConfig = getFeeConfig(); // Get the fee percentages/values
    const fee = amountLKR * feeConfig.BUY_GOLD_PERCENTAGE;
    // Optional: Add rounding if needed, e.g., Math.round(fee * 100) / 100 for 2 decimal places
    return fee;
};

/**
 * Calculates the fee for selling gold based on the LKR value received.
 * @param {number} receivedLKR - The amount in LKR received from selling gold (before fee).
 * @returns {number} The calculated fee in LKR.
 */
const calculateSellFee = (receivedLKR) => {
    if (typeof receivedLKR !== 'number' || receivedLKR <= 0) {
        return 0;
    }
    const feeConfig = getFeeConfig();
    const fee = receivedLKR * feeConfig.SELL_GOLD_PERCENTAGE;
    return fee;
};

/**
 * Gets the flat redemption delivery fee.
 * @returns {number} The redemption delivery fee in LKR.
 */
const getRedemptionFee = () => {
    const feeConfig = getFeeConfig();
    return feeConfig.REDEMPTION_DELIVERY_LKR;
}

// Export the functions so they can be used elsewhere
module.exports = {
    calculateBuyFee,
    calculateSellFee,
    getRedemptionFee
    // Export other fee calculation functions if you create them
};