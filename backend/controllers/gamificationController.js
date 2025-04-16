// backend/controllers/gamificationController.js
const mongoose = require('mongoose'); // Needed for transaction ID and ObjectId validation
const User = require('../models/User');
const ChallengeDefinition = require('../models/ChallengeDefinition'); // <-- IMPORTED MODEL
const { createNotification } = require('../services/notificationService'); // Import notification service

// Helper for currency formatting (ensure this matches your project's standard if you have one elsewhere)
const formatCurrency = (value, currency = 'LKR', locale = 'en-LK') => {
    // Handle potential non-numeric input gracefully
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
        console.warn(`formatCurrency received non-numeric value: ${value}`);
        return String(value); // Return original string or a placeholder
    }
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(numericValue);
    } catch (error) {
        console.error(`Error formatting currency (value: ${value}, currency: ${currency}, locale: ${locale}):`, error);
        // Fallback formatting
        return `${currency} ${numericValue.toFixed(2)}`;
    }
};


// @desc    Claim a reward for a completed challenge
// @route   POST /api/gamification/claim/:challengeId
// @access  Private
const claimChallengeReward = async (req, res) => {
    const { challengeId } = req.params; // This is the string ID like 'MONTHLY_5K'
    const userId = req.user._id; // Assumes authenticated user via middleware

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format.' });
    }
    // No format validation needed for string challengeId unless you have specific rules

    try {
        // --- Fetch User AND Challenge Definition Concurrently ---
        const [user, challenge] = await Promise.all([
            User.findById(userId),
            // Find active definition by the unique string ID field
            ChallengeDefinition.findOne({ challengeId: challengeId, isActive: true })
        ]);
        // --- END Fetch ---

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // Check if the challenge definition was found and is active
        if (!challenge) {
            return res.status(404).json({ message: "Challenge definition not found or is currently inactive." });
        }

        // Ensure user's challenge-related fields exist
        user.completedChallengeIds = user.completedChallengeIds || [];
        user.challengeProgress = user.challengeProgress || new Map();
        user.transactions = user.transactions || []; // Ensure transactions array exists

        // Check if challenge is actually completed by user
        // Use challenge.challengeId from the fetched definition object
        if (!user.completedChallengeIds.includes(challenge.challengeId)) {
            return res.status(400).json({ message: "Challenge not completed yet." });
        }

        // Check if already claimed
        // Use challenge.challengeId for consistency
        if (user.challengeProgress.get(`${challenge.challengeId}_claimed`) === true) {
            return res.status(400).json({ message: "Reward already claimed." });
        }

        let notificationMessage = `Reward for "${challenge.name}" claimed! `;
        let rewardGranted = false; // Flag to track if any reward action was actually taken
        let transactionAdded = false; // Flag to track if a transaction was added

        // --- Apply Actual Reward Based on Type (using data from the fetched 'challenge' object) ---
        switch (challenge.rewardType) {
            case 'BONUS_GOLD':
                if (challenge.rewardValue > 0) {
                    const rewardAmount = Number(challenge.rewardValue);
                    if (!isNaN(rewardAmount)) {
                        user.goldBalanceGrams = (user.goldBalanceGrams || 0) + rewardAmount;
                        // Add a transaction record for the bonus gold
                        user.transactions.push({
                            _id: new mongoose.Types.ObjectId(),
                            type: 'bonus',
                            amountGrams: rewardAmount,
                            // Use challenge.name from the DB object
                            description: `Challenge Reward: ${challenge.name} (+${rewardAmount.toFixed(4)}g)`,
                            status: 'completed',
                            timestamp: new Date()
                        });
                        notificationMessage += `Added ${rewardAmount.toFixed(4)}g gold to your balance.`;
                        rewardGranted = true;
                        transactionAdded = true;
                    } else {
                        // Use challenge.challengeId for logging clarity
                         console.warn(`Invalid rewardValue for BONUS_GOLD challenge ${challenge.challengeId}: ${challenge.rewardValue}`);
                         notificationMessage += `Could not apply gold bonus due to invalid value.`;
                         rewardGranted = true; // Still mark as claimed/acknowledged
                    }
                } else {
                     console.log(`BONUS_GOLD challenge ${challenge.challengeId} claimed, but rewardValue is zero or less.`);
                     notificationMessage += `Acknowledged completion of ${challenge.name}.`;
                     rewardGranted = true; // Mark as claimed even if value is 0
                }
                break;

            case 'BONUS_CASH':
                 if (challenge.rewardValue > 0) {
                     const rewardAmount = Number(challenge.rewardValue);
                      if (!isNaN(rewardAmount)) {
                         user.cashBalanceLKR = (user.cashBalanceLKR || 0) + rewardAmount;
                         // Add a transaction record for the bonus cash
                         user.transactions.push({
                             _id: new mongoose.Types.ObjectId(),
                             type: 'bonus',
                             amountLKR: rewardAmount,
                             // Use challenge.name from the DB object
                             description: `Challenge Reward: ${challenge.name} (+${formatCurrency(rewardAmount)})`,
                             status: 'completed',
                             timestamp: new Date()
                         });
                         notificationMessage += `Added ${formatCurrency(rewardAmount)} to your cash balance.`;
                         rewardGranted = true;
                         transactionAdded = true;
                     } else {
                          console.warn(`Invalid rewardValue for BONUS_CASH challenge ${challenge.challengeId}: ${challenge.rewardValue}`);
                          notificationMessage += `Could not apply cash bonus due to invalid value.`;
                          rewardGranted = true; // Still mark as claimed/acknowledged
                     }
                 } else {
                      console.log(`BONUS_CASH challenge ${challenge.challengeId} claimed, but rewardValue is zero or less.`);
                      notificationMessage += `Acknowledged completion of ${challenge.name}.`;
                      rewardGranted = true; // Mark as claimed even if value is 0
                 }
                 break;

             case 'FEE_DISCOUNT_NEXT_BUY':
                  // Note: Applying this discount requires logic in the purchase/investment controller.
                  // Here, we just mark that the user has earned it.
                  if (challenge.rewardValue > 0 && challenge.rewardValue <= 1) { // Expect value between 0 and 1 (e.g., 0.1 for 10%)
                      const discountPercent = Number(challenge.rewardValue);
                      if (!isNaN(discountPercent)) {
                          // Store discount info using challenge.challengeId as part of the key
                          user.challengeProgress.set(`${challenge.challengeId}_discount_percent`, discountPercent);
                          user.challengeProgress.set(`${challenge.challengeId}_discount_applied`, false); // Flag indicating if used
                          notificationMessage += `You've earned a ${discountPercent * 100}% fee discount on your next gold purchase! It will be applied automatically.`;
                          rewardGranted = true;
                          // No direct transaction here, it's a future potential modification
                      } else {
                          console.warn(`Invalid rewardValue for FEE_DISCOUNT_NEXT_BUY challenge ${challenge.challengeId}: ${challenge.rewardValue}`);
                          notificationMessage += `Could not grant discount due to invalid value.`;
                          rewardGranted = true; // Still mark as claimed/acknowledged
                      }
                  } else {
                      console.log(`FEE_DISCOUNT_NEXT_BUY challenge ${challenge.challengeId} claimed, but rewardValue is invalid or zero.`);
                      notificationMessage += `Acknowledged completion of ${challenge.name}.`;
                      rewardGranted = true; // Mark as claimed
                  }
                  break;

             case 'BADGE_ELIGIBILITY':
                  // This type doesn't grant a direct monetary/gold reward via *this* claim action.
                  // It signifies meeting criteria. Another system (e.g., badge service) might check completion/claim status.
                  // Use challenge.rewardText or challenge.name from the DB object
                  notificationMessage += `You've met the criteria for the "${challenge.rewardText || challenge.name}". Check your badges!`;
                  rewardGranted = true; // Claiming marks it as acknowledged by the user
                  break;

            // Add more cases here for other reward types as needed

            default:
                // Use challenge.challengeId and challenge.rewardType for logging
                console.warn(`Unhandled rewardType "${challenge.rewardType}" for challenge ${challenge.challengeId}`);
                // Use challenge.rewardText or challenge.name from the DB object
                notificationMessage += challenge.rewardText || `Successfully claimed reward for ${challenge.name}.`;
                rewardGranted = true; // Allow claiming even if no specific action defined yet, marking acknowledgement
        }

        // Ensure we proceed only if a reward action was logically taken or acknowledged
        if (!rewardGranted) {
             // This case should ideally not be reached if the switch handles all possibilities including default.
             console.error(`Claim processed for ${challenge.challengeId}, but rewardGranted flag remained false. Review logic.`);
             return res.status(500).json({ message: "Internal error processing reward." });
        }

        // Mark challenge as claimed in progress map using challenge.challengeId
        user.challengeProgress.set(`${challenge.challengeId}_claimed`, true);
        user.markModified('challengeProgress'); // Essential for Map updates

        // Mark transactions as modified only if we potentially added one
        if (transactionAdded) {
            user.markModified('transactions');
        }

        // Save the updated user document
        await user.save();

        // --- Send Specific Notification ---
        try {
             await createNotification(userId.toString(), 'gamification_reward_claimed', {
                 title: 'Reward Claimed!',
                 message: notificationMessage, // Use the message built in the switch statement
                 link: '/gamification', // Example link to gamification page
                 challengeId: challenge.challengeId, // Use the actual challengeId from the definition
                 rewardType: challenge.rewardType // Include rewardType if useful
             });
        } catch (notificationError) {
             console.error(`Failed to send notification for user ${userId} after claiming challenge ${challenge.challengeId}:`, notificationError);
             // Proceed even if notification fails, the reward was granted. Log the error.
        }


        res.json({
             message: `Reward for "${challenge.name}" claimed successfully!`,
             // Optionally return updated balances/state if useful for the frontend
             // newGoldBalanceGrams: user.goldBalanceGrams,
             // newCashBalanceLKR: user.cashBalanceLKR,
             // updatedProgress: Object.fromEntries(user.challengeProgress) // Convert Map for JSON if needed
        });

    } catch (error) {
        // Use the challengeId from params for logging if the DB fetch failed early
        const logChallengeId = challenge ? challenge.challengeId : challengeId;
        console.error(`Claim Reward Error for user ${userId}, challenge ${logChallengeId}:`, error);
        // Avoid sending detailed internal errors to the client
        res.status(500).json({ message: "Server error claiming reward. Please try again later." });
    }
};

module.exports = { claimChallengeReward };