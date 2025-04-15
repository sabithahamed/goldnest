// backend/controllers/investmentController.js
const mongoose = require('mongoose'); // Needed for ObjectId generation and DB interaction
const User = require('../models/User');
const { getGoldMarketSummary } = require('../utils/goldDataUtils');
const { updateGamificationOnAction } = require('../services/gamificationTriggerService');
const { createNotification } = require('../services/notificationService');
const { calculateBuyFee } = require('../utils/feeUtils'); // Import the fee calculation function

// Helper function for formatting currency (kept from old code as it's used in notification)
const formatCurrency = (value) => {
    // Basic fallback if Intl is not fully supported or for zero values
    if (typeof value !== 'number' || isNaN(value)) {
        return 'LKR 0.00';
    }
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);
};

// @desc    Make a new investment (and optionally set up auto-invest)
// @route   POST /api/investments/invest
// @access  Private (Requires authentication)
const makeInvestment = async (req, res) => {
    // --- V V V ENSURE THIS CODE BLOCK IS PRESENT AND CORRECT V V V ---
    try {
        const { amountLKR, saveAsAuto, frequency } = req.body; // Get amount, auto-save flag, and frequency
        const userId = req.user._id; // Get user ID from protect middleware

        // --- Basic Validation ---
        const investmentAmount = Number(amountLKR); // Ensure it's a number
        if (isNaN(investmentAmount) || investmentAmount < 100) { // Min investment check
            return res.status(400).json({ message: 'Invalid investment amount. Minimum is LKR 100.' });
        }
        // Validate frequency if saveAsAuto is true
        if (saveAsAuto === true) { // Explicitly check boolean true
            if (!frequency || !['daily', 'weekly', 'monthly'].includes(frequency)) {
                return res.status(400).json({ message: 'Invalid frequency selected for automatic payment.' });
            }
            // Note: The 'new changes' didn't specify dayOfMonth validation for 'monthly',
            // so it's omitted here to match the request. Consider adding it back for robustness.
        }

        // --- Get current user data and market price ---
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const marketSummary = getGoldMarketSummary(); // Assuming sync or handles its own async
        if (!marketSummary || !marketSummary.latestPricePerGram || marketSummary.latestPricePerGram <= 0) {
            console.error("Investment Error: Could not fetch valid market price.");
            return res.status(500).json({ message: 'Could not fetch current gold market price. Please try again later.' });
        }
        const pricePerGram = marketSummary.latestPricePerGram;

        // --- FEE CALCULATION (THIS LINE SHOULD NOW WORK) ---
        const feeLKR = calculateBuyFee(investmentAmount); // Calculate fee based on amount intended for gold
        // --- ^ ^ ^ NO CHANGE NEEDED HERE ^ ^ ^ ---

        const totalCostLKR = investmentAmount + feeLKR; // User pays investment amount + fee

        // --- Check if user has enough cash balance ---
        if (user.cashBalanceLKR < totalCostLKR) {
            // Provide specific error message including required amount and fee
            return res.status(400).json({
                message: `Insufficient funds. Required: ${formatCurrency(totalCostLKR)} (Investment: ${formatCurrency(investmentAmount)} + Fee: ${formatCurrency(feeLKR)}), Available: ${formatCurrency(user.cashBalanceLKR)}`
            });
        }

        // --- Calculate gold amount purchased ---
        // Calculation based on the investmentAmount (amount intended for gold)
        const amountGrams = investmentAmount / pricePerGram;

        // --- Update User Balances ---
        user.cashBalanceLKR -= totalCostLKR;
        user.goldBalanceGrams += amountGrams;

        // --- Create Transaction Record ---
        const transaction = {
            _id: new mongoose.Types.ObjectId(), // Generate unique ID for the transaction
            type: 'investment',
            amountLKR: investmentAmount, // The amount invested in gold
            amountGrams: amountGrams,
            feeLKR: feeLKR, // Store the calculated fee
            pricePerGramLKR: pricePerGram, // Store the rate used
            timestamp: new Date(), // Store the time of the transaction
            // Updated description to include fee and match structure
            description: `Invested ${formatCurrency(investmentAmount)} for ${amountGrams.toFixed(4)}g gold (+ ${formatCurrency(feeLKR)} fee)`,
            status: 'completed' // Assume instant completion for simulation
        };
        user.transactions.push(transaction);

        // --- Handle Automatic Payment Setup (if requested) ---
        let autoInvestMessage = ''; // Message for response
        if (saveAsAuto === true) {
            const newAutoPayment = {
                _id: new mongoose.Types.ObjectId(), // Give it a unique ID
                frequency: frequency,
                amountLKR: investmentAmount, // Amount to be invested each time
                createdAt: new Date(),
                isActive: true, // Assume active by default
                // Note: 'dayOfMonth' handling from old code is omitted as per 'new changes' structure
                // Consider adding logic here if monthly payments need a specific day
            };
            // Ensure automaticPayments array exists
            if (!Array.isArray(user.automaticPayments)) {
                 user.automaticPayments = [];
            }
            // Note: The 'new changes' didn't include a duplicate check like the old code.
            // Adding the payment directly as per the 'new changes' structure.
            user.automaticPayments.push(newAutoPayment);
            user.markModified('automaticPayments'); // Important for Mongoose to detect array push
            console.log(`[InvestCtrl] Added auto-payment for user ${userId}: ${frequency}, ${formatCurrency(investmentAmount)} LKR`);
            autoInvestMessage = ` Automatic investment for ${formatCurrency(investmentAmount)} ${frequency} was set up.`;
        }

        // --- Save User ---
        const updatedUser = await user.save(); // Save all changes

        // --- Find the Saved Transaction (using ID for reliability) ---
        const savedTransaction = updatedUser.transactions.find(t => t._id.equals(transaction._id));

        // --- Trigger Post-Action Services (Gamification, Notifications) ---
         if (savedTransaction) {
             try {
                // Pass investment amount (excluding fee) and grams for gamification rules
                await updateGamificationOnAction(userId, 'investment', {
                    amountLKR: savedTransaction.amountLKR,
                    amountGrams: savedTransaction.amountGrams,
                    feeLKR: savedTransaction.feeLKR // Pass fee if needed
                });
             } catch (gamificationError) {
                 console.error(`[Gamification ERROR] User ${userId} investment: ${gamificationError.message}`);
                 // Log error but don't fail the whole transaction
             }
             try {
                 await createNotification(userId, 'transaction_buy', {
                     title: 'Investment Successful',
                     // Updated message to include fee, matching transaction description
                     message: `You invested ${formatCurrency(savedTransaction.amountLKR)} (+ ${formatCurrency(savedTransaction.feeLKR)} fee) and received ${savedTransaction.amountGrams.toFixed(4)}g of gold. Total ${formatCurrency(totalCostLKR)} deducted.`,
                     link: '/wallet', // Link to wallet history page
                     metadata: {
                         transactionId: savedTransaction._id.toString(), // Ensure ID is string
                         amountLKR: savedTransaction.amountLKR,
                         amountGrams: savedTransaction.amountGrams,
                         feeLKR: savedTransaction.feeLKR
                     }
                 });
             } catch (notificationError) {
                 console.error(`[Notification ERROR] User ${userId} investment: ${notificationError.message}`);
             }
         } else {
            console.error(`CRITICAL: Could not find saved transaction ${transaction._id} for user ${userId} after investment.`);
         }


        // --- Send Success Response ---
        res.status(200).json({
            // Updated message to include total cost and fee, plus auto-invest status
            message: `Investment successful! ${formatCurrency(totalCostLKR)} deducted (incl. ${formatCurrency(feeLKR)} fee).${autoInvestMessage}`.trim(),
            newCashBalanceLKR: updatedUser.cashBalanceLKR,
            newGoldBalanceGrams: updatedUser.goldBalanceGrams,
            transaction: savedTransaction || null, // Return the newly added transaction (or null if not found)
            updatedUserInfo: { // Send back relevant parts for frontend update
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                cashBalanceLKR: updatedUser.cashBalanceLKR,
                goldBalanceGrams: updatedUser.goldBalanceGrams,
                transactions: updatedUser.transactions, // Send updated transactions array
                automaticPayments: updatedUser.automaticPayments, // Send updated autopayments
                // Include gamification fields if needed from old code's response structure
                earnedBadgeIds: updatedUser.earnedBadgeIds,
                challengeProgress: updatedUser.challengeProgress instanceof Map ? Object.fromEntries(updatedUser.challengeProgress) : updatedUser.challengeProgress || {},
                completedChallengeIds: updatedUser.completedChallengeIds,
                starCount: updatedUser.starCount
            }
        });

    // --- V V V ENSURE THIS CATCH BLOCK IS PRESENT AND CORRECT V V V ---
    } catch (error) {
        console.error('Investment processing error:', error); // Log the full error
        // Check for specific Mongoose validation errors if needed
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        // Handle insufficient funds based on the specific error message we throw
        if (error.message.startsWith('Insufficient funds')) {
            return res.status(400).json({ message: error.message }); // Use the detailed message from the check
        }
        res.status(500).json({ message: 'Server error during investment processing. Please try again.' });
    }
};


// Export the controller function
module.exports = { makeInvestment };