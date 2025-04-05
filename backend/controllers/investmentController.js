const User = require('../models/User');

// --- Configuration (Simulated) ---
// TODO: Consider moving this to a config file or .env
const SIMULATED_GOLD_PRICE_PER_GRAM_LKR = 11000; // Example: Rs. 11,000 per gram

// @desc    Make a new investment
// @route   POST /api/investments/invest
// @access  Private (Requires authentication)
const makeInvestment = async (req, res) => {
    const { amountLKR } = req.body; // Get investment amount in LKR from request body
    const userId = req.user._id; // Get user ID from the authenticated request (added by protect middleware)

    // --- Basic Validation ---
    if (!amountLKR || isNaN(amountLKR) || Number(amountLKR) <= 0) {
        return res.status(400).json({ message: 'Invalid investment amount provided.' });
    }
    // You might add a minimum investment check like in your proposal (e.g., >= 100 LKR)
     if (Number(amountLKR) < 100) {
          return res.status(400).json({ message: 'Investment amount must be at least Rs. 100.' });
     }


    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // --- Calculation ---
        const amountGrams = Number(amountLKR) / SIMULATED_GOLD_PRICE_PER_GRAM_LKR;

        // --- Update User Document ---
        user.goldBalanceGrams += amountGrams;

        // Add transaction record (keep it simple)
        user.transactions.push({
            type: 'investment',
            amountGrams: amountGrams,
            amountLKR: Number(amountLKR),
            // Date is defaulted by the schema
            description: `Invested Rs. ${amountLKR.toFixed(2)} for ${amountGrams.toFixed(4)}g gold`,
        });

        // Save the updated user document
        const updatedUser = await user.save();

        // --- Success Response ---
        // Send back relevant updated info (e.g., new balance and maybe the last transaction)
        res.status(200).json({
            message: 'Investment successful!',
            newGoldBalanceGrams: updatedUser.goldBalanceGrams,
            transaction: updatedUser.transactions[updatedUser.transactions.length - 1], // Send the latest transaction
            // Send updated user data subset for localStorage update on frontend
            updatedUserInfo: {
                 _id: updatedUser._id,
                 name: updatedUser.name,
                 email: updatedUser.email,
                 phone: updatedUser.phone,
                 nic: updatedUser.nic,
                 address: updatedUser.address,
                 city: updatedUser.city,
                 goldBalanceGrams: updatedUser.goldBalanceGrams,
                 // Don't send the whole transaction history every time
            }
        });

    } catch (error) {
        console.error('Investment processing error:', error);
        res.status(500).json({ message: 'Server error during investment process.' });
    }
};

module.exports = { makeInvestment };