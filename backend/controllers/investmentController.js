// backend/controllers/investmentController.js
const mongoose = require('mongoose'); // Needed for ObjectId generation and DB interaction
const User = require('../models/User');
const { getGoldMarketSummary } = require('../utils/goldDataUtils');
const { updateGamificationOnAction } = require('../services/gamificationTriggerService');
const { createNotification } = require('../services/notificationService');
const { calculateBuyFee } = require('../utils/feeUtils'); // Import the base fee calculation function

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
    // --- V V V START OF INVESTMENT PROCESS V V V ---
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
            // Note: Consider adding dayOfMonth validation for 'monthly' if needed later.
        }

        // --- Get current user data (including challengeProgress for discount) and market price ---
        const user = await User.findById(userId); // Fetch the user WITH challengeProgress
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const marketSummary = getGoldMarketSummary(); // Assuming sync or handles its own async
        if (!marketSummary || !marketSummary.latestPricePerGram || marketSummary.latestPricePerGram <= 0) {
            console.error("Investment Error: Could not fetch valid market price.");
            return res.status(500).json({ message: 'Could not fetch current gold market price. Please try again later.' });
        }
        const pricePerGram = marketSummary.latestPricePerGram;

        // --- Calculate Base Fee ---
        let feeLKR = calculateBuyFee(investmentAmount); // Calculate initial fee
        let appliedDiscountPercent = 0; // Track if a discount was applied
        let appliedDiscountChallengeId = null; // Track which challenge provided the discount

        // --- V V V APPLY FEE DISCOUNT LOGIC V V V ---
        let bestDiscount = 0;
        let discountChallengeIdToApply = null;

        // Check if challengeProgress exists and is a Map
        if (user.challengeProgress && user.challengeProgress instanceof Map) {
            // Iterate through the user's challenge progress map
            for (const [key, value] of user.challengeProgress.entries()) {
                // Check for unclaimed discount flags (e.g., 'CHALLENGEID_discount_applied': false)
                if (key.endsWith('_discount_applied') && value === false) {
                     const challengeId = key.replace('_discount_applied', '');
                     const discountPercentKey = `${challengeId}_discount_percent`;
                     const discountPercentValue = user.challengeProgress.get(discountPercentKey); // Use a different var name

                     // If a discount % exists for this challenge and it's better than current best
                     // Ensure discountPercentValue is treated as a percentage (e.g., 0.1 for 10%)
                     if (typeof discountPercentValue === 'number' && discountPercentValue > bestDiscount) {
                         bestDiscount = discountPercentValue; // Store the percentage value (e.g., 0.1)
                         discountChallengeIdToApply = challengeId;
                     }
                }
            }
        }

        // If a usable discount was found, apply it
        if (discountChallengeIdToApply && bestDiscount > 0) {
             const originalFee = feeLKR; // Keep original fee for logging/reference
             appliedDiscountPercent = bestDiscount; // Store the applied discount rate (e.g., 0.1)
             appliedDiscountChallengeId = discountChallengeIdToApply; // Store for marking as used
             const discountAmount = feeLKR * appliedDiscountPercent; // Calculate the discount value
             feeLKR -= discountAmount; // Reduce the fee
             feeLKR = Math.max(0, feeLKR); // Ensure fee doesn't go below zero

             console.log(`Applied ${appliedDiscountPercent * 100}% discount from challenge ${appliedDiscountChallengeId}. Original fee: ${formatCurrency(originalFee)}, New fee: ${formatCurrency(feeLKR)}`);

             // --- Mark the discount as applied in user's progress map ---
             user.challengeProgress.set(`${appliedDiscountChallengeId}_discount_applied`, true);
             user.markModified('challengeProgress'); // IMPORTANT: Mark map as modified for Mongoose save
        }
        // --- ^ ^ ^ END APPLY FEE DISCOUNT LOGIC ^ ^ ^ ---

        // --- Calculate Total Cost (Investment + potentially discounted Fee) ---
        const totalCostLKR = investmentAmount + feeLKR;

        // --- Check if user has enough cash balance ---
        if (user.cashBalanceLKR < totalCostLKR) {
            // Provide specific error message including required amount and potentially discounted fee
            const feeMessage = appliedDiscountPercent > 0
                ? `${formatCurrency(feeLKR)} (after ${appliedDiscountPercent * 100}% discount)`
                : formatCurrency(feeLKR);
            return res.status(400).json({
                message: `Insufficient funds. Required: ${formatCurrency(totalCostLKR)} (Investment: ${formatCurrency(investmentAmount)} + Fee: ${feeMessage}), Available: ${formatCurrency(user.cashBalanceLKR)}`
            });
        }

        // --- Calculate gold amount purchased ---
        // Calculation based on the investmentAmount (amount intended for gold)
        const amountGrams = investmentAmount / pricePerGram;

        // --- Update User Balances ---
        user.cashBalanceLKR -= totalCostLKR;
        user.goldBalanceGrams += amountGrams;

        // --- Create Transaction Record ---
        let description = `Invested ${formatCurrency(investmentAmount)} for ${amountGrams.toFixed(4)}g gold (+ ${formatCurrency(feeLKR)} fee)`;
        if (appliedDiscountPercent > 0) { // Append discount info to description
            description += ` - Discount Applied: ${appliedDiscountPercent * 100}%`;
        }
        const transaction = {
            _id: new mongoose.Types.ObjectId(), // Generate unique ID for the transaction
            type: 'investment',
            amountLKR: investmentAmount, // The amount invested in gold
            amountGrams: amountGrams,
            feeLKR: feeLKR, // Store the potentially discounted fee
            pricePerGramLKR: pricePerGram, // Store the rate used
            timestamp: new Date(), // Store the time of the transaction
            description: description, // Use the updated description
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
                // Note: 'dayOfMonth' handling is omitted as per 'new changes' structure
            };
            // Ensure automaticPayments array exists
            if (!Array.isArray(user.automaticPayments)) {
                 user.automaticPayments = [];
            }
            // Adding the payment directly
            user.automaticPayments.push(newAutoPayment);
            user.markModified('automaticPayments'); // Important for Mongoose to detect array push
            console.log(`[InvestCtrl] Added auto-payment for user ${userId}: ${frequency}, ${formatCurrency(investmentAmount)} LKR`);
            autoInvestMessage = ` Automatic investment for ${formatCurrency(investmentAmount)} ${frequency} was set up.`;
        }

        // --- Save User (saves balance, transaction, auto-payment, AND applied discount flag in challengeProgress) ---
        const updatedUser = await user.save(); // Save all changes

        // --- Find the Saved Transaction (using ID for reliability) ---
        const savedTransaction = updatedUser.transactions.find(t => t._id.equals(transaction._id));

        // --- Trigger Post-Action Services (Gamification, Notifications) ---
         if (savedTransaction) {
             try {
                // Pass investment amount (excluding fee), grams, and fee for gamification rules
                await updateGamificationOnAction(userId, 'investment', {
                    amountLKR: savedTransaction.amountLKR,
                    amountGrams: savedTransaction.amountGrams,
                    feeLKR: savedTransaction.feeLKR, // Pass potentially discounted fee
                    discountApplied: appliedDiscountPercent > 0 // Pass flag if discount used
                });
             } catch (gamificationError) {
                 console.error(`[Gamification ERROR] User ${userId} investment: ${gamificationError.message}`);
                 // Log error but don't fail the whole transaction
             }
             try {
                 // Modify notification message if discount was applied
                 let notifyMsg = `You invested ${formatCurrency(savedTransaction.amountLKR)} (+ ${formatCurrency(savedTransaction.feeLKR)} fee) and received ${savedTransaction.amountGrams.toFixed(4)}g of gold. Total ${formatCurrency(totalCostLKR)} deducted.`;
                 if (appliedDiscountPercent > 0) {
                      notifyMsg += ` A ${appliedDiscountPercent * 100}% fee discount was applied!`;
                 }
                 await createNotification(userId, 'transaction_buy', {
                     title: 'Investment Successful',
                     message: notifyMsg, // Use the potentially updated message
                     link: '/wallet', // Link to wallet history page
                     metadata: {
                         transactionId: savedTransaction._id.toString(), // Ensure ID is string
                         amountLKR: savedTransaction.amountLKR,
                         amountGrams: savedTransaction.amountGrams,
                         feeLKR: savedTransaction.feeLKR,
                         discountAppliedPercent: appliedDiscountPercent // Store discount info if needed
                     }
                 });
             } catch (notificationError) {
                 console.error(`[Notification ERROR] User ${userId} investment: ${notificationError.message}`);
             }
         } else {
            console.error(`CRITICAL: Could not find saved transaction ${transaction._id} for user ${userId} after investment.`);
         }


        // --- Send Success Response ---
        // Construct the main success message, including discount info if applicable
        let successMessage = `Investment successful! ${formatCurrency(totalCostLKR)} deducted (incl. ${formatCurrency(feeLKR)} fee`;
        if (appliedDiscountPercent > 0) {
            successMessage += ` after ${appliedDiscountPercent * 100}% discount`;
        }
        successMessage += `).${autoInvestMessage}`;

        res.status(200).json({
            message: successMessage.trim(),
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
                // Include gamification fields, especially the updated challengeProgress
                earnedBadgeIds: updatedUser.earnedBadgeIds,
                challengeProgress: updatedUser.challengeProgress instanceof Map ? Object.fromEntries(updatedUser.challengeProgress) : updatedUser.challengeProgress || {}, // Send updated map
                completedChallengeIds: updatedUser.completedChallengeIds,
                starCount: updatedUser.starCount
            }
        });

    // --- V V V CATCH BLOCK FOR ERROR HANDLING V V V ---
    } catch (error) {
        console.error('Investment processing error:', error); // Log the full error
        // Check for specific Mongoose validation errors if needed
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        // Check if it's our specific insufficient funds error
        if (error.message.startsWith('Insufficient funds')) {
            // The message is already constructed with details, so just send it
            return res.status(400).json({ message: error.message });
        }
        // Generic server error
        res.status(500).json({ message: 'Server error during investment processing. Please try again.' });
    }
};


// Export the controller function
module.exports = { makeInvestment };