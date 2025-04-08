// backend/controllers/walletController.js
const User = require('../models/User');
const { createNotification } = require('../services/notificationService'); // Added import

// Helper function for formatting currency
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);

// @desc    Simulate depositing funds into user's cash wallet
// @route   POST /api/wallet/deposit
// @access  Private
const depositFunds = async (req, res) => {
    const { amountLKR } = req.body;
    const userId = req.user._id;

    // Validation
    if (!amountLKR || isNaN(amountLKR) || Number(amountLKR) <= 0) {
        return res.status(400).json({ message: 'Invalid deposit amount.' });
    }
    // Add a reasonable maximum if desired for simulation
    if (Number(amountLKR) > 1000000) { // Example max
         return res.status(400).json({ message: 'Deposit amount exceeds maximum limit for simulation.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update cash balance
        user.cashBalanceLKR += Number(amountLKR);

        // Add transaction record
        user.transactions.push({
            type: 'deposit',
            amountLKR: Number(amountLKR),
            description: `Deposited ${Number(amountLKR).toFixed(2)} LKR via simulation`,
            status: 'completed' // Deposits usually complete immediately
        });

        const updatedUser = await user.save();
        const newTransaction = updatedUser.transactions[updatedUser.transactions.length - 1];

        // --- Start: New Notification Logic ---
        try {
            await createNotification(userId, 'transaction_deposit', {
                title: 'Deposit Confirmed',
                message: `Your deposit of ${formatCurrency(newTransaction.amountLKR)} has been successfully added to your wallet.`,
                link: '/wallet',
                metadata: { transactionId: newTransaction._id }
            });
        } catch (notificationError) {
             // Log the notification error but don't fail the main operation
            console.error("Error creating deposit notification:", notificationError);
        }
        // --- End: New Notification Logic ---

        res.status(200).json({
            message: 'Deposit successful (Simulated).',
            newCashBalanceLKR: updatedUser.cashBalanceLKR,
            transaction: newTransaction // Use the extracted transaction
        });

    } catch (error) {
        console.error("Error during deposit:", error);
        res.status(500).json({ message: 'Server Error during deposit process.' });
    }
};

// @desc    Simulate withdrawing funds from user's cash wallet
// @route   POST /api/wallet/withdraw
// @access  Private
const withdrawFunds = async (req, res) => {
    const { amountLKR, bankDetails } = req.body; // Assuming bankDetails might be needed later
    const userId = req.user._id;

    // Validation
    if (!amountLKR || isNaN(amountLKR) || Number(amountLKR) <= 0) {
        return res.status(400).json({ message: 'Invalid withdrawal amount.' });
    }
     // Add bank detail validation if implementing further
     if (!bankDetails || !bankDetails.accountNumber || !bankDetails.bankName) { // Example details needed
        return res.status(400).json({ message: 'Valid bank details are required for withdrawal.' });
     }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check sufficient balance
        if (user.cashBalanceLKR < Number(amountLKR)) {
            return res.status(400).json({ message: 'Insufficient wallet balance.' });
        }

        // Update cash balance
        user.cashBalanceLKR -= Number(amountLKR);

        // Add transaction record - mark as pending initially for realism
        user.transactions.push({
            type: 'withdrawal',
            amountLKR: Number(amountLKR),
            description: `Withdrawal request for ${Number(amountLKR).toFixed(2)} LKR to Acc: ${bankDetails.accountNumber}`, // Include some detail
            status: 'pending' // Simulate processing time
        });

        const updatedUser = await user.save();
        const newTransaction = updatedUser.transactions[updatedUser.transactions.length - 1];

        // --- Start: New Notification Logic ---
         try {
            await createNotification(userId, 'transaction_withdrawal_request', {
                title: 'Withdrawal Requested',
                message: `Your withdrawal request for ${formatCurrency(newTransaction.amountLKR)} has been submitted and is pending processing.`,
                link: '/wallet',
                metadata: { transactionId: newTransaction._id }
            });
        } catch (notificationError) {
             // Log the notification error but don't fail the main operation
            console.error("Error creating withdrawal request notification:", notificationError);
        }
        // --- End: New Notification Logic ---

        // Simulate processing delay/completion later if needed. For now, respond immediately.
        // In a real app, this might trigger an async process.

        res.status(200).json({
            message: 'Withdrawal request submitted successfully (Simulated). Funds will be processed.',
            newCashBalanceLKR: updatedUser.cashBalanceLKR,
            transaction: newTransaction // Use the extracted transaction
        });

    } catch (error) {
        console.error("Error during withdrawal:", error);
        res.status(500).json({ message: 'Server Error during withdrawal process.' });
    }
};


module.exports = { depositFunds, withdrawFunds };