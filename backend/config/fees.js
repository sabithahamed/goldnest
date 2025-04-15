// backend/config/fees.js

// All percentages are stored as decimals (e.g., 1% = 0.01)
const FEES = {
    BUY_GOLD_PERCENTAGE: 0.01,   // 1%
    SELL_GOLD_PERCENTAGE: 0.005,  // 0.5%
    REDEMPTION_DELIVERY_LKR: 2000, // Rs. 2000 flat fee
    // Add other fees later if needed (e.g., withdrawal_fee_fixed, withdrawal_fee_percentage)
};

// Function to easily access fees (allows for future updates, e.g., fetching from DB)
const getFeeConfig = () => {
    // In the future, this could fetch dynamic values from a database or another source.
    // For now, it just returns the constant object.
    return FEES;
};

module.exports = {
    getFeeConfig
};