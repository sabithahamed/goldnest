// backend/controllers/investmentController.js
const User = require('../models/User');
const mongoose = require('mongoose');
const { getGoldMarketSummary } = require('../utils/goldDataUtils'); // Import summary function
const { createNotification } = require('../services/notificationService'); // Import notification service

// Helper function for formatting currency (can be moved to a utils file if used elsewhere)
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);

// @desc    Make a new investment (with optional auto-payment setup)
// @route   POST /api/investments/invest
// @access  Private (Requires authentication)
const makeInvestment = async (req, res) => {
    const { amountLKR, saveAsAuto, frequency } = req.body;
    const userId = req.user._id;

    // --- Basic Validation ---
    // Using Number() explicitly for clarity and consistency
    const investmentAmount = Number(amountLKR);
    if (isNaN(investmentAmount) || investmentAmount <= 0 || investmentAmount < 100) {
        return res.status(400).json({ message: 'Invalid investment amount (min Rs. 100).' });
    }

    // --- Auto Payment Frequency Validation ---
    const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    if (saveAsAuto && (!frequency || !validFrequencies.includes(frequency))) {
        return res.status(400).json({ message: 'Invalid frequency selected for automatic payment.' });
    }

    try {
        // --- Get Current Gold Price ---
        const marketSummary = getGoldMarketSummary(); // Assuming this is synchronous or handles its own async if needed
        const currentPricePerGram = marketSummary.latestPricePerGram;

        if (!currentPricePerGram || currentPricePerGram <= 0) {
            console.error("CRITICAL: Failed to get valid gold price for investment calculation.");
            return res.status(500).json({ message: 'Could not determine current gold price. Please try again later.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // --- Calculation ---
        const amountGrams = investmentAmount / currentPricePerGram; // Use dynamic price

        // --- Update User Document ---
        // 1. Update Gold Balance
        user.goldBalanceGrams += amountGrams;

        // 2. Add Transaction Record
        user.transactions.push({
            _id: new mongoose.Types.ObjectId(), // Generate explicit ID for transaction
            type: 'investment',
            amountGrams: amountGrams,
            amountLKR: investmentAmount,
            pricePerGramLKR: currentPricePerGram, // Store the price used for this transaction
            timestamp: new Date(), // Explicitly set timestamp
            description: `Invested Rs. ${investmentAmount.toFixed(2)} @ ~${currentPricePerGram.toFixed(0)} LKR/g`, // Add price context
        });

        // 3. Save Automatic Payment (if requested and not already existing)
        let autoPaymentMessage = ''; // Initialize message part for auto payment
        let existingAutoPayment = false; // Flag to track if auto payment existed

        if (saveAsAuto === true && frequency) {
            existingAutoPayment = user.automaticPayments.find(
                p => p.frequency === frequency && p.amountLKR === investmentAmount
            );

            if (!existingAutoPayment) {
                user.automaticPayments.push({
                    _id: new mongoose.Types.ObjectId(), // Generate explicit ID
                    frequency: frequency,
                    amountLKR: investmentAmount,
                    createdAt: new Date() // Add creation timestamp
                });
                console.log(`Auto payment added: ${frequency}, ${investmentAmount}`);
                autoPaymentMessage = `Automatic ${frequency} payment saved.`;
            } else {
                console.log(`Auto payment already exists, skipping add: ${frequency}, ${investmentAmount}`);
                autoPaymentMessage = `Automatic ${frequency} payment already exists.`;
                // Optionally update existing auto-payment last attempted/succeeded timestamp if needed in future
            }
        }

        const updatedUser = await user.save();

        // Get the latest transaction (safer than relying on index if parallel ops happen, though unlikely here)
        // Ensure this references the UPDATED user document's transaction array
        const newTransaction = updatedUser.transactions[updatedUser.transactions.length - 1];

        // --- Create Notification ---
        // Ensure newTransaction is valid before creating notification
        if (newTransaction) {
           try {
                await createNotification(userId, 'transaction_buy', {
                    title: 'Investment Successful',
                    message: `You successfully invested ${formatCurrency(newTransaction.amountLKR)} and received ${newTransaction.amountGrams.toFixed(4)}g of gold.`,
                    link: '/wallet', // Link to wallet history page
                    metadata: { transactionId: newTransaction._id.toString() } // Ensure ID is stringified if needed by frontend/service
                });
                console.log(`Notification created for user ${userId} for transaction ${newTransaction._id}`);
           } catch (notificationError) {
               // Log the notification error but don't fail the whole request
               // The investment itself was successful.
               console.error(`Failed to create notification for user ${userId} after investment:`, notificationError);
               // Optionally, you could add a flag to the response indicating notification failure
           }
        } else {
             console.error(`CRITICAL: Could not find the latest transaction for user ${userId} after investment save.`);
             // Handle this error case if necessary, though it shouldn't happen normally
        }

        // --- Success Response ---
        res.status(200).json({
            message: `Investment successful! ${autoPaymentMessage}`.trim(),
            newGoldBalanceGrams: updatedUser.goldBalanceGrams,
            transaction: newTransaction, // Send back the newly created transaction
            updatedUserInfo: { // Return comprehensive user info as before
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                nic: updatedUser.nic,
                address: updatedUser.address,
                city: updatedUser.city,
                goldBalanceGrams: updatedUser.goldBalanceGrams,
                automaticPayments: updatedUser.automaticPayments,
                earnedBadgeIds: updatedUser.earnedBadgeIds,
                challengeProgress: updatedUser.challengeProgress,
                // Consider adding other relevant fields if needed by the frontend
            }
        });

    } catch (error) {
        console.error('Investment processing error:', error);
        // More specific error handling if possible (e.g., distinguish DB errors from logic errors)
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: 'Data validation failed.', details: error.message });
        }
        res.status(500).json({ message: 'Server error during investment process.' });
    }
};

module.exports = { makeInvestment };