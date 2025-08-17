// backend/utils/feeUtils.js
const Setting = require('../models/Setting');

// Default fees in case they are not in the DB yet
const DEFAULT_FEES = {
    BUY_FEE_PERCENT: 0.01,   // 1%
    SELL_FEE_PERCENT: 0.005,  // 0.5%
    REDEMPTION_DELIVERY_LKR: 2000,
};

let feeCache = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache fees for 5 minutes

/**
 * Clears the fee cache, forcing a refetch from the database on the next call.
 */
const invalidateFeeCache = () => {
    feeCache = null;
    cacheTimestamp = null;
    console.log('[Cache] Fee cache invalidated.');
};

/**
 * Fetches the latest fee configuration from the database, with caching.
 * @returns {Promise<object>} The fee configuration object.
 */
const getFeeConfig = async () => {
    const now = Date.now();
    // Use cache if it's fresh
    if (feeCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION_MS)) {
        return feeCache;
    }

    try {
        const settings = await Setting.find({ key: { $in: ['BUY_FEE_PERCENT', 'SELL_FEE_PERCENT', 'REDEMPTION_DELIVERY_LKR'] } });
        
        const config = { ...DEFAULT_FEES }; // Start with defaults

        settings.forEach(setting => {
            if (typeof setting.value === 'number') {
                config[setting.key] = setting.value;
            }
        });

        feeCache = config; // Update cache
        cacheTimestamp = now;
        return config;

    } catch (error) {
        console.error("Error fetching fee settings from DB, using default fees.", error);
        return DEFAULT_FEES; // Fallback to defaults on error
    }
};

/**
 * Calculates the fee for buying gold based on the LKR amount.
 * @param {number} amountLKR - The amount in LKR being invested.
 * @returns {Promise<number>} The calculated fee in LKR.
 */
const calculateBuyFee = async (amountLKR) => {
    if (typeof amountLKR !== 'number' || amountLKR <= 0) return 0;
    const feeConfig = await getFeeConfig();
    return amountLKR * feeConfig.BUY_FEE_PERCENT;
};

/**
 * Calculates the fee for selling gold based on the LKR value received.
 * @param {number} receivedLKR - The amount in LKR received from selling gold.
 * @returns {Promise<number>} The calculated fee in LKR.
 */
const calculateSellFee = async (receivedLKR) => {
    if (typeof receivedLKR !== 'number' || receivedLKR <= 0) return 0;
    const feeConfig = await getFeeConfig();
    return receivedLKR * feeConfig.SELL_FEE_PERCENT;
};

/**
 * Gets the flat redemption delivery fee.
 * @returns {Promise<number>} The redemption delivery fee in LKR.
 */
const getRedemptionFee = async () => {
    const feeConfig = await getFeeConfig();
    return feeConfig.REDEMPTION_DELIVERY_LKR;
};

module.exports = {
    calculateBuyFee,
    calculateSellFee,
    getRedemptionFee,
    getFeeConfig,
    invalidateFeeCache, // Export the new function
};