// backend/controllers/promoController.js
const PromoCode = require('../models/PromoCode');

// @desc    Validate a promo code for a specific purpose
// @route   POST /api/promos/validate
// @access  Private (User)
const validatePromoCode = async (req, res) => {
    const { code, promoType } = req.body; // e.g., promoType: 'DEPOSIT_BONUS'

    if (!code || !promoType) {
        return res.status(400).json({ message: 'Promo code and type are required.' });
    }

    try {
        const promoCode = await PromoCode.findOne({
            code: code.toUpperCase(),
            promoType: promoType, // Check that it's for the correct purpose
            isActive: true,
            expiresAt: { $gte: new Date() } // Check that it hasn't expired
        });

        if (!promoCode) {
            return res.status(404).json({ message: 'Invalid or expired promo code.' });
        }

        // Add more checks here if needed (e.g., check total usage limit)

        // If valid, send back the code details so the frontend can calculate the bonus
        res.json({
            message: 'Promo code is valid!',
            code: promoCode.code,
            description: promoCode.description,
            bonusType: promoCode.bonusType,
            bonusValue: promoCode.bonusValue,
        });

    } catch (error) {
        console.error("Error validating promo code:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { validatePromoCode };