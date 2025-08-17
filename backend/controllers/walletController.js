// backend/controllers/walletController.js
const mongoose = require('mongoose'); // <-- IMPORT MONGOOSE for ObjectId
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const { createNotification } = require('../services/notificationService');

// Helper function for formatting currency
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value || 0);

// @desc    Simulate depositing funds into user's cash wallet
// @route   POST /api/wallet/deposit
// @access  Private
const depositFunds = async (req, res) => {
    const { amountLKR, promoCode } = req.body;
    const userId = req.user._id;

    // Validation
    const depositAmount = Number(amountLKR);
    if (!amountLKR || isNaN(depositAmount) || depositAmount <= 0) {
        return res.status(400).json({ message: 'Invalid deposit amount.' });
    }
    if (depositAmount > 1000000) {
        return res.status(400).json({ message: 'Deposit amount exceeds maximum limit for simulation.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        let bonusAmount = 0;
        let promoDescription = '';
        let appliedPromoCode = null;

        // --- Promo Code Validation & Application Logic ---
        if (promoCode) {
            const codeDetails = await PromoCode.findOne({
                code: promoCode.toUpperCase(),
                promoType: 'DEPOSIT_BONUS',
                isActive: true,
                expiresAt: { $gte: new Date() }
            });

            if (codeDetails) {
                appliedPromoCode = codeDetails; // Store the valid code object
                if (codeDetails.bonusType === 'PERCENTAGE_DEPOSIT') {
                    bonusAmount = depositAmount * (codeDetails.bonusValue / 100);
                } else if (codeDetails.bonusType === 'FLAT_LKR_DEPOSIT') {
                    bonusAmount = codeDetails.bonusValue;
                }
                promoDescription = ` (Promo '${codeDetails.code}' applied)`;
            } else {
                // If an invalid code is sent, we should reject the transaction to avoid confusion.
                return res.status(400).json({ message: `Promo code '${promoCode}' is invalid or expired.` });
            }
        }
        
        const totalCredited = depositAmount + bonusAmount;
        user.cashBalanceLKR += totalCredited;

        // Add main deposit transaction record
        user.transactions.push({
            _id: new mongoose.Types.ObjectId(),
            type: 'deposit',
            amountLKR: depositAmount,
            description: `Deposited ${formatCurrency(depositAmount)} via simulation${promoDescription}`,
            status: 'completed'
        });
        
        // If there was a bonus, add a separate bonus transaction for clarity
        if (bonusAmount > 0 && appliedPromoCode) {
             user.transactions.push({
                _id: new mongoose.Types.ObjectId(),
                type: 'bonus',
                amountLKR: bonusAmount,
                description: `Bonus from Promo: ${appliedPromoCode.description}`,
                status: 'completed'
            });
            // Important: Update usage count for the promo code
            appliedPromoCode.timesUsed += 1;
            await appliedPromoCode.save();
        }

        const updatedUser = await user.save();
        const newTransaction = updatedUser.transactions[updatedUser.transactions.length - 1];

        try {
            await createNotification(userId, 'transaction_deposit', {
                title: 'Deposit Confirmed',
                message: `Your deposit of ${formatCurrency(depositAmount)} was successful. Total credited to your wallet: ${formatCurrency(totalCredited)}.`,
                link: '/wallet',
                metadata: { transactionId: newTransaction._id }
            });
        } catch (notificationError) {
            console.error("Error creating deposit notification:", notificationError);
        }

        res.status(200).json({
            message: `Deposit successful! Total ${formatCurrency(totalCredited)} credited to your wallet.`,
            newCashBalanceLKR: updatedUser.cashBalanceLKR,
            transaction: newTransaction
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
    const { amountLKR, bankDetails } = req.body;
    const userId = req.user._id;

    // Validation
    if (!amountLKR || isNaN(amountLKR) || Number(amountLKR) <= 0) {
        return res.status(400).json({ message: 'Invalid withdrawal amount.' });
    }
     if (!bankDetails || !bankDetails.accountNumber || !bankDetails.bankName) {
        return res.status(400).json({ message: 'Valid bank details are required for withdrawal.' });
     }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.cashBalanceLKR < Number(amountLKR)) {
            return res.status(400).json({ message: 'Insufficient wallet balance.' });
        }

        user.cashBalanceLKR -= Number(amountLKR);

        user.transactions.push({
            _id: new mongoose.Types.ObjectId(), // Keep generating ObjectId
            type: 'withdrawal',
            amountLKR: Number(amountLKR),
            description: `Withdrawal request for ${Number(amountLKR).toFixed(2)} LKR to Acc: ${bankDetails.accountNumber}`,
            status: 'pending'
        });

        const updatedUser = await user.save();
        const newTransaction = updatedUser.transactions[updatedUser.transactions.length - 1];

         try {
            await createNotification(userId, 'transaction_withdrawal_request', {
                title: 'Withdrawal Requested',
                message: `Your withdrawal request for ${formatCurrency(newTransaction.amountLKR)} has been submitted and is pending processing.`,
                link: '/wallet',
                metadata: { transactionId: newTransaction._id }
            });
        } catch (notificationError) {
            console.error("Error creating withdrawal request notification:", notificationError);
        }

        res.status(200).json({
            message: 'Withdrawal request submitted successfully (Simulated). Funds will be processed.',
            newCashBalanceLKR: updatedUser.cashBalanceLKR,
            transaction: newTransaction
        });

    } catch (error) {
        console.error("Error during withdrawal:", error);
        res.status(500).json({ message: 'Server Error during withdrawal process.' });
    }
};


module.exports = { depositFunds, withdrawFunds };