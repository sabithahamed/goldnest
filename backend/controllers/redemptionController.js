// backend/controllers/redemptionController.js

// --- Make sure all these are imported at the top ---
const Redemption = require('../models/Redemption');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const { updateGamificationOnAction } = require('../services/gamificationTriggerService');
const { getRedemptionFee } = require('../utils/feeUtils'); // Use fee from utils
const mongoose = require('mongoose');

// Helper function for currency formatting
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-CA');


// @desc    Initiate a new gold redemption request
// @route   POST /api/redemptions/request
// @access  Private
const requestRedemption = async (req, res) => {
    // This now matches your frontend payload exactly
    const { itemDescription, quantity, totalGrams, shippingDetails, saveAddressAsDefault } = req.body;
    const userId = req.user._id;

    // --- Validation ---
    if (!itemDescription || !quantity || !totalGrams || Number(quantity) < 1 || Number(totalGrams) <= 0) {
        return res.status(400).json({ message: 'Invalid redemption details provided.' });
    }
    // VALIDATION FIX: Checks for fullName, not name.
    if (!shippingDetails || !shippingDetails.fullName || !shippingDetails.addressLine1 || !shippingDetails.city || !shippingDetails.phone) {
        return res.status(400).json({ message: 'Incomplete shipping details are required.' });
    }

    try {
        const deliveryFee = await getRedemptionFee(); // Get fee from central config

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // --- Balance Checks ---
        if (user.goldBalanceGrams < Number(totalGrams)) {
            return res.status(400).json({ message: 'Insufficient gold balance for redemption.' });
        }
        if (user.cashBalanceLKR < deliveryFee) {
            return res.status(400).json({ message: `Insufficient cash balance for delivery fee (${formatCurrency(deliveryFee)}). Please deposit funds.` });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Create Redemption Record
            const newRedemption = new Redemption({
                user: userId,
                itemDescription,
                quantity: Number(quantity),
                totalGrams: Number(totalGrams),
                deliveryFeeLKR: deliveryFee,
                // MAPPING FIX: Maps fullName, addressLine1 etc. correctly
                shippingName: shippingDetails.fullName,
                shippingAddress: `${shippingDetails.addressLine1}${shippingDetails.addressLine2 ? ', ' + shippingDetails.addressLine2 : ''}`,
                shippingCity: shippingDetails.city,
                shippingPhone: shippingDetails.phone,
                status: 'pending',
            });
            await newRedemption.save({ session });

            // 2. Update User (deduct balances, add transaction, update default address)
            user.goldBalanceGrams -= Number(totalGrams);
            user.cashBalanceLKR -= deliveryFee;
            
            const transactionDesc = `Redeemed ${quantity} x ${itemDescription} (${totalGrams.toFixed(3)}g).`;
            user.transactions.push({
                type: 'redemption',
                amountGrams: Number(totalGrams),
                amountLKR: deliveryFee,
                feeLKR: deliveryFee,
                description: transactionDesc,
                status: 'pending',
                relatedRedemptionId: newRedemption._id
            });
            
            if (saveAddressAsDefault === true) {
                user.defaultShippingAddress = { ...shippingDetails };
            }

            await user.save({ session });

            await session.commitTransaction();
            
            // --- Post-transaction actions (Notifications, Gamification) ---
            createNotification(userId, 'redemption_requested', {
                 title: 'Redemption Requested',
                 message: `Your request to redeem ${itemDescription} is confirmed and processing.`,
                 link: '/wallet',
                 metadata: { redemptionId: newRedemption._id.toString() }
             }).catch(err => console.error("Failed to create redemption notification:", err));

            updateGamificationOnAction(userId, 'redemption', { amountGrams: totalGrams })
              .catch(err => console.error("Failed to trigger gamification on redemption:", err));

            res.status(201).json({
                 message: 'Redemption request submitted successfully!',
                 redemption: newRedemption,
                 transaction: user.transactions[user.transactions.length - 1] // Also return the transaction for the popup
             });

        } catch (error) {
            await session.abortTransaction();
            console.error('Error during redemption transaction:', error);
            res.status(500).json({ message: 'Server error processing redemption. Your balances have not been changed.' });
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error("Error initiating redemption:", error);
        res.status(500).json({ message: 'Server Error.' });
    }
};

// --- ADD THIS FUNCTION BACK IN ---
// @desc    Get user's redemption history
// @route   GET /api/redemptions/history
// @access  Private
const getRedemptionHistory = async (req, res) => {
    try {
        const redemptions = await Redemption.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(redemptions);
    } catch (error) {
        console.error("Error fetching redemption history:", error);
        res.status(500).json({ message: "Server Error getting redemption history." });
    }
};
// --- END OF ADDED FUNCTION ---

module.exports = { requestRedemption, getRedemptionHistory };