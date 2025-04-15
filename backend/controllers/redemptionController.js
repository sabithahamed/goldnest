// backend/controllers/redemptionController.js
const Redemption = require('../models/Redemption');
const User = require('../models/User');
const { getDeliveryFee } = require('../utils/feeUtils');
const mongoose = require('mongoose');

// @desc    Initiate a new gold redemption request
// @route   POST /api/redemptions/request
// @access  Private
const requestRedemption = async (req, res) => {
    const { itemDescription, quantity, totalGrams, shippingDetails } = req.body; // e.g., shippingDetails: { name, address, city, phone }
    const userId = req.user._id;

    // --- Validation ---
    if (!itemDescription || !quantity || !totalGrams || Number(quantity) < 1 || Number(totalGrams) <= 0) {
        return res.status(400).json({ message: 'Invalid redemption details provided.' });
    }
     if (!shippingDetails || !shippingDetails.name || !shippingDetails.address || !shippingDetails.city || !shippingDetails.phone) {
        return res.status(400).json({ message: 'Complete shipping details are required.' });
     }

    const deliveryFee = getDeliveryFee();

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // --- Check Sufficient Gold Balance ---
        if (user.goldBalanceGrams < Number(totalGrams)) {
            return res.status(400).json({ message: 'Insufficient gold balance for redemption.' });
        }
         // --- Check Sufficient CASH Balance for Delivery Fee ---
         if (user.cashBalanceLKR < deliveryFee) {
             return res.status(400).json({ message: `Insufficient cash balance for delivery fee (${formatCurrency(deliveryFee)}). Please deposit funds.` });
         }


        // --- Start Transaction (Atomicity) ---
        // For critical operations like this, ideally use MongoDB Transactions
        // For simplicity now, we'll do sequential saves but acknowledge risk
        // const session = await mongoose.startSession();
        // session.startTransaction();

        try {
            // 1. Deduct Gold and Fee from User
            user.goldBalanceGrams -= Number(totalGrams);
            user.cashBalanceLKR -= deliveryFee;

            // 2. Create Redemption Record
             const newRedemption = new Redemption({
                 user: userId,
                 itemDescription,
                 quantity: Number(quantity),
                 totalGrams: Number(totalGrams),
                 deliveryFeeLKR: deliveryFee,
                 shippingName: shippingDetails.name,
                 shippingAddress: shippingDetails.address,
                 shippingCity: shippingDetails.city,
                 shippingPhone: shippingDetails.phone,
                 status: 'pending', // Initial status
             });
             // await newRedemption.save({ session }); // If using transactions
             await newRedemption.save();


            // 3. Add Transaction Record to User
            const transactionDesc = `Redeemed ${quantity} x ${itemDescription} (${totalGrams.toFixed(3)}g). Delivery fee: ${formatCurrency(deliveryFee)}`;
            user.transactions.push({
                type: 'redemption',
                amountGrams: Number(totalGrams),
                amountLKR: deliveryFee, // Store fee here for record keeping
                feeLKR: deliveryFee, // Explicitly store fee
                description: transactionDesc,
                status: 'pending', // Match redemption status
                relatedRedemptionId: newRedemption._id // Link transaction to redemption doc
            });

             // Get the ID of the transaction just pushed
             const addedTransaction = user.transactions[user.transactions.length - 1];
             // Add the user transaction ID back to the redemption doc
             newRedemption.userTransactionId = addedTransaction._id;
             // await newRedemption.save({ session }); // If using transactions
             await newRedemption.save(); // Save again with link


            // Save user changes
            // await user.save({ session }); // If using transactions
            await user.save();

            // If using transactions: await session.commitTransaction();
            // console.log('Redemption transaction committed.');

            // Respond with success
             res.status(201).json({
                 message: 'Redemption request submitted successfully!',
                 redemption: newRedemption,
                 newGoldBalance: user.goldBalanceGrams,
                 newCashBalance: user.cashBalanceLKR
             });

        } catch (error) {
             // If using transactions: await session.abortTransaction();
             console.error('Error during redemption save process:', error);
             // Avoid user balance change if only part of the operation failed without transactions
             // If no transaction support, manual rollback is complex and risky
             res.status(500).json({ message: 'Server error processing redemption. Please try again.' });
        } finally {
            // If using transactions: session.endSession();
        }

    } catch (error) {
        console.error("Error during redemption request:", error);
        res.status(500).json({ message: 'Server Error initiating redemption.' });
    }
};

 // Add functions later to get redemption history, update status (admin), etc.
 // @desc    Get user's redemption history
 // @route   GET /api/redemptions/history
 // @access  Private
 const getRedemptionHistory = async (req, res) => {
     try {
         const redemptions = await Redemption.find({ user: req.user._id }).sort({ createdAt: -1 }); // Find redemptions for the logged-in user
         res.json(redemptions);
     } catch (error) {
         console.error("Error fetching redemption history:", error);
         res.status(500).json({ message: "Server Error getting redemption history." });
     }
 };


// Helper function for currency formatting
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);


module.exports = { requestRedemption, getRedemptionHistory };