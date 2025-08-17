// backend/controllers/adminPromoController.js
const PromoCode = require('../models/PromoCode');

const getPromoCodes = async (req, res) => {
    try {
        const promoCodes = await PromoCode.find({}).sort({ createdAt: -1 });
        res.json(promoCodes);
    } catch (error) {
        res.status(500).json({ message: "Error fetching promo codes." });
    }
};

const createPromoCode = async (req, res) => {
    try {
        const { code } = req.body;
        // Check if code already exists
        const existingCode = await PromoCode.findOne({ code: code.toUpperCase() });
        if (existingCode) {
            return res.status(400).json({ message: "This promo code already exists." });
        }

        const newPromoCode = new PromoCode(req.body);
        await newPromoCode.save();
        res.status(201).json(newPromoCode);
    } catch (error) {
        res.status(400).json({ message: "Error creating promo code.", error: error.message });
    }
};

const deletePromoCode = async (req, res) => {
    try {
        const promoCode = await PromoCode.findById(req.params.id);
        if (promoCode) {
            await PromoCode.deleteOne({ _id: req.params.id });
            res.json({ message: 'Promo code removed' });
        } else {
            res.status(404).json({ message: 'Promo code not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getPromoCodes,
    createPromoCode,
    deletePromoCode,
};