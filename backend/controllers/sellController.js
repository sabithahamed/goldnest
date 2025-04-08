// backend/controllers/sellController.js
const User = require('../models/User');
const { getGoldMarketSummary } = require('../utils/goldDataUtils'); // Need current price
const { createNotification } = require('../services/notificationService'); // Added for notifications

// Helper function for formatting currency (can be moved to a utils file if used elsewhere)
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);

// @desc    Sell user's gold
// @route   POST /api/sell/gold
// @access  Private
const sellGold = async (req, res) => {
    const { amountGrams } = req.body; // User specifies how many grams to sell
    const userId = req.user._id;

    // Validation
    if (!amountGrams || isNaN(amountGrams) || Number(amountGrams) <= 0) {
        return res.status(400).json({ message: 'Invalid amount of grams to sell.' });
    }
    // Add minimum sell amount if desired (e.g., 0.01 grams)
    if (Number(amountGrams) < 0.001) {
        return res.status(400).json({ message: 'Minimum sell amount is 0.001 grams.' });
    }

    try {
        // --- Get Current Gold Price ---
        const marketSummary = getGoldMarketSummary(); // In a real app, fetch this dynamically if needed
        const currentPricePerGram = marketSummary.latestPricePerGram; // Assuming this holds the *selling* price

        if (!currentPricePerGram || currentPricePerGram <= 0) {
            console.error("Could not determine current gold selling price from market summary:", marketSummary);
            return res.status(500).json({ message: 'Could not determine current gold selling price. Please try again later.' });
        }

        // --- Get User ---
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // --- Check Sufficient Gold Balance ---
        // Use a small tolerance for floating point comparisons if necessary
        const requiredGrams = Number(amountGrams);
        if (user.goldBalanceGrams < requiredGrams) {
            return res.status(400).json({ message: `Insufficient gold balance. You have ${user.goldBalanceGrams.toFixed(4)}g, but tried to sell ${requiredGrams.toFixed(4)}g.` });
        }

        // --- Calculation ---
        const proceedsLKR = requiredGrams * currentPricePerGram;
        // Consider adding a small transaction fee/spread here in a real app
        // Example: const fee = proceedsLKR * 0.005; // 0.5% fee
        // const finalProceeds = proceedsLKR - fee;

        // --- Update Balances (Atomic operation recommended in production - see notes below) ---
        user.goldBalanceGrams -= requiredGrams;
        user.cashBalanceLKR += proceedsLKR; // Add proceeds to cash wallet

        // --- Add Transaction Record ---
        // Note: The transaction details are added *before* saving, so they are part of the atomic save.
        const transactionData = {
            type: 'sell_gold',
            amountGrams: requiredGrams, // Record grams sold
            amountLKR: proceedsLKR, // Record LKR received (before fees if any)
            pricePerGram: currentPricePerGram, // Store the price used for this transaction
            description: `Sold ${requiredGrams.toFixed(4)}g gold @ ~${currentPricePerGram.toFixed(0)} LKR/g`,
            status: 'completed' // Selling is usually instant
            // Consider adding fee details if applicable: feeLKR: fee
        };
        user.transactions.push(transactionData);

        const updatedUser = await user.save();

        // Get the newly created transaction (it's the last one in the array)
        // Mongoose adds _id automatically to subdocuments when saved.
        const newTransaction = updatedUser.transactions[updatedUser.transactions.length - 1];

        // --- Create notification ---
        try {
            await createNotification(userId, 'transaction_sell', {
                title: 'Sale Successful',
                message: `You successfully sold ${newTransaction.amountGrams.toFixed(4)}g of gold for ${formatCurrency(newTransaction.amountLKR)}. Funds added to wallet.`,
                link: '/wallet', // Or perhaps '/transactions' or a specific transaction detail page
                metadata: { transactionId: newTransaction._id } // Pass the ID of the saved transaction
            });
        } catch (notificationError) {
            // Log the notification error, but don't fail the main request
            console.error(`Failed to create notification for user ${userId} after successful gold sale:`, notificationError);
            // Optionally, queue this notification for retry later
        }

        // --- Success Response ---
        res.status(200).json({
            message: `Successfully sold ${requiredGrams.toFixed(4)}g of gold.`,
            newGoldBalanceGrams: updatedUser.goldBalanceGrams,
            newCashBalanceLKR: updatedUser.cashBalanceLKR,
            transaction: newTransaction // Send back the details of the transaction just created
        });

    } catch (error) {
        console.error("Error during gold sell:", error);
        // More specific error handling can be added here (e.g., validation errors from Mongoose)
        res.status(500).json({ message: 'Server Error during gold sell process.' });
    }
};

module.exports = { sellGold };

/*
Notes on Atomicity:
In a high-concurrency production environment, the sequence of:
1. Check balance
2. Calculate proceeds
3. Update balance
4. Save user
needs to be atomic to prevent race conditions (e.g., two sell requests processing simultaneously using the same initial balance).
Strategies:
a) Pessimistic Locking: Lock the user document before reading/writing.
b) Optimistic Locking: Use Mongoose's versioning (`__v` field) to detect concurrent modifications and retry if necessary.
c) Database Transactions: If using a database that supports transactions (like MongoDB replica sets/sharded clusters starting v4.0), wrap the find, update, and save operations within a transaction. This is generally the most robust approach.
The current code doesn't implement these, assuming lower concurrency for simplicity.
*/