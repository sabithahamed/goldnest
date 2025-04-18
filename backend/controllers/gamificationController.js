// backend/controllers/gamificationController.js
const mongoose = require('mongoose'); // Needed for transaction ID, ObjectId validation
const User = require('../models/User');
const { CHALLENGES } = require('../config/gamification'); // Use config directly
const { createNotification } = require('../services/notificationService'); // Import notification service

// Helper for currency formatting (Robust version from original code)
const formatCurrency = (value, currency = 'LKR', locale = 'en-LK') => {
    // Handle potential non-numeric input gracefully
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
        console.warn(`[formatCurrency] Received non-numeric value: ${value}`);
        return String(value) || `${currency} ???`; // Avoid formatting non-numbers
    }
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(numericValue);
    } catch (error) {
        console.error(`[formatCurrency] Error formatting (value: ${value}, currency: ${currency}, locale: ${locale}):`, error);
        // Fallback formatting
        return `${currency} ${numericValue.toFixed(2)}`;
    }
};


// @desc    Claim a reward for a completed challenge
// @route   POST /api/gamification/claim/:challengeId
// @access  Private
const claimChallengeReward = async (req, res) => {
    const { challengeId } = req.params; // This is the string ID like 'MONTHLY_5K'
    const userId = req.user?._id; // Assumes authenticated user via middleware

    console.log(`[Claim Reward] User ${userId} attempting to claim challenge ${challengeId}`); // Log entry

    // --- Basic Input Validation ---
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.log(`[Claim Reward] Invalid or missing user ID: ${userId}`);
        return res.status(400).json({ message: 'Invalid or missing user ID.' });
    }
    // No specific format validation needed for string challengeId unless you have specific rules

    try {
        // --- Fetch User ---
        const user = await User.findById(userId);
        if (!user) {
             console.log(`[Claim Reward] User ${userId} not found.`);
             return res.status(404).json({ message: "User not found." });
        }

        // --- Get Challenge Definition ---
        const challenge = CHALLENGES[challengeId]; // Get definition directly from config object

        // Check if challenge exists in config AND if it's currently active
        const now = new Date();
        const isActive = challenge && // Does the challenge definition exist?
                         (challenge.isActive !== false) && // Is it explicitly not inactive? (Defaults to active if undefined)
                         (!challenge.startDate || new Date(challenge.startDate) <= now) && // Is start date in the past (or not set)?
                         (!challenge.endDate || new Date(challenge.endDate) >= now);      // Is end date in the future (or not set)?

        if (!challenge || !isActive) {
             const challengeIdentifier = challenge ? `"${challenge.name}" (${challengeId})` : challengeId;
             console.log(`[Claim Reward] Challenge ${challengeIdentifier} not found or inactive for user ${userId}.`);
            return res.status(404).json({ message: "Challenge definition not found or is not active." });
        }

        // --- Ensure user's challenge-related fields exist (defensive programming) ---
        user.completedChallengeIds = user.completedChallengeIds || [];
        // challengeProgress handled more robustly below
        user.transactions = user.transactions || []; // Ensure transactions array exists

        // --- Check Completion Status ---
        if (!user.completedChallengeIds.includes(challengeId)) {
            console.log(`[Claim Reward] User ${userId} has not completed challenge ${challengeId}.`);
            return res.status(400).json({ message: "Challenge not completed yet." });
        }

        // --- V V V REVISED & ROBUST CLAIM CHECK V V V ---
        let progressMap = user.challengeProgress;
        // Ensure challengeProgress exists and is treated as a Map
        if (!progressMap) {
            user.challengeProgress = new Map();
            progressMap = user.challengeProgress;
            console.log(`[Claim Reward] Initialized challengeProgress Map for user ${userId}.`);
        } else if (!(progressMap instanceof Map)) {
            // If somehow stored as object, convert it
            console.warn(`[Claim Reward] Converting challengeProgress from Object to Map for user ${userId}.`);
            progressMap = new Map(Object.entries(progressMap || {})); // Use || {} for safety
            user.challengeProgress = progressMap; // Ensure user object has the Map
        }

        const claimedKey = `${challengeId}_claimed`;
        const claimedValue = progressMap.get(claimedKey);

        // Check if the value is *specifically* boolean true OR the number 1
        // This handles the current bad data (1) and the correct future state (true)
        const alreadyClaimed = claimedValue === true || claimedValue === 1;

        console.log(`[Claim Reward] Checking claim status for ${challengeId}. Key: ${claimedKey}, Value: ${claimedValue}, Type: ${typeof claimedValue}, Already Claimed Check Result: ${alreadyClaimed}`); // Added Type log

        // Log a warning if the data type is wrong (number 1 instead of boolean true)
        if (claimedValue === 1) {
            console.warn(`[Claim Reward] WARNING: Claimed flag for ${userId}, challenge ${challengeId} is stored as number 1, should be boolean true.`);
        }

        if (alreadyClaimed) {
            console.log(`[Claim Reward] BLOCKING Re-claim: User ${userId}, Challenge ${challengeId}. Existing value: ${claimedValue}`);
            return res.status(400).json({ message: "Reward already claimed." });
        }
        // --- ^ ^ ^ END REVISED CLAIM CHECK ^ ^ ^ ---


        // --- Apply Reward Logic ---
        let notificationMessage = `Reward for "${challenge.name}" claimed! `;
        let rewardGranted = false; // Flag to track if any reward action was actually taken
        let transactionAdded = false; // Flag to track if a transaction was added

        switch (challenge.rewardType) {
            case 'BONUS_GOLD':
                if (challenge.rewardValue > 0) {
                    const rewardAmount = Number(challenge.rewardValue);
                    if (!isNaN(rewardAmount)) {
                        user.goldBalanceGrams = (user.goldBalanceGrams || 0) + rewardAmount;
                        user.transactions.push({
                            _id: new mongoose.Types.ObjectId(), // Generate new ID
                            type: 'bonus',
                            amountGrams: rewardAmount,
                            description: `Challenge Reward: ${challenge.name} (+${rewardAmount.toFixed(4)}g)`,
                            status: 'completed',
                            timestamp: new Date()
                        });
                        notificationMessage += `Added ${rewardAmount.toFixed(4)}g gold to your balance.`;
                        rewardGranted = true;
                        transactionAdded = true;
                    } else {
                         console.warn(`[Claim Reward] Invalid rewardValue for BONUS_GOLD challenge ${challengeId}: ${challenge.rewardValue}`);
                         notificationMessage += `Could not apply gold bonus due to invalid value.`;
                         rewardGranted = true; // Still mark as claimed/acknowledged
                    }
                } else {
                     console.log(`[Claim Reward] BONUS_GOLD challenge ${challengeId} claimed, but rewardValue is zero or less.`);
                     notificationMessage += `Acknowledged completion of ${challenge.name}.`;
                     rewardGranted = true; // Mark as claimed even if value is 0
                }
                break;

            case 'BONUS_CASH':
                 if (challenge.rewardValue > 0) {
                     const rewardAmount = Number(challenge.rewardValue);
                      if (!isNaN(rewardAmount)) {
                         user.cashBalanceLKR = (user.cashBalanceLKR || 0) + rewardAmount;
                         user.transactions.push({
                             _id: new mongoose.Types.ObjectId(), // Generate new ID
                             type: 'bonus',
                             amountLKR: rewardAmount,
                             description: `Challenge Reward: ${challenge.name} (+${formatCurrency(rewardAmount)})`,
                             status: 'completed',
                             timestamp: new Date()
                         });
                         notificationMessage += `Added ${formatCurrency(rewardAmount)} to your cash balance.`;
                         rewardGranted = true;
                         transactionAdded = true;
                     } else {
                          console.warn(`[Claim Reward] Invalid rewardValue for BONUS_CASH challenge ${challengeId}: ${challenge.rewardValue}`);
                          notificationMessage += `Could not apply cash bonus due to invalid value.`;
                          rewardGranted = true; // Still mark as claimed/acknowledged
                     }
                 } else {
                      console.log(`[Claim Reward] BONUS_CASH challenge ${challengeId} claimed, but rewardValue is zero or less.`);
                      notificationMessage += `Acknowledged completion of ${challenge.name}.`;
                      rewardGranted = true; // Mark as claimed even if value is 0
                 }
                 break;

             case 'FEE_DISCOUNT_NEXT_BUY':
                  // Ensure rewardValue is a valid percentage (0 < value <= 1)
                  if (challenge.rewardValue > 0 && challenge.rewardValue <= 1) {
                      const discountPercent = Number(challenge.rewardValue);
                      if (!isNaN(discountPercent)) {
                          // Set new flags (Map.set overwrites existing keys if they exist)
                          user.challengeProgress.set(`${challengeId}_discount_percent`, discountPercent);
                          user.challengeProgress.set(`${challengeId}_discount_applied`, false); // Explicitly set to false
                          notificationMessage += `You've earned a ${discountPercent * 100}% fee discount on your next gold purchase! It will be applied automatically.`;
                          rewardGranted = true;
                          // No direct transaction here, but progress map is modified
                      } else {
                          console.warn(`[Claim Reward] Invalid rewardValue for FEE_DISCOUNT_NEXT_BUY challenge ${challengeId}: ${challenge.rewardValue}`);
                          notificationMessage += `Could not grant discount due to invalid value.`;
                          rewardGranted = true; // Still mark as claimed/acknowledged
                      }
                  } else {
                      console.log(`[Claim Reward] FEE_DISCOUNT_NEXT_BUY challenge ${challengeId} claimed, but rewardValue is invalid (must be > 0 and <= 1) or zero.`);
                      notificationMessage += `Acknowledged completion of ${challenge.name}.`;
                      rewardGranted = true; // Mark as claimed
                  }
                  break;

             case 'BADGE_ELIGIBILITY':
                  notificationMessage += `You've met the criteria for "${challenge.rewardText || challenge.name}". Check your badges!`;
                  rewardGranted = true; // Claiming marks it as acknowledged
                  break;

            // Add more cases here for other reward types as needed

            default:
                console.warn(`[Claim Reward] Unhandled rewardType "${challenge.rewardType}" for challenge ${challengeId}`);
                notificationMessage += challenge.rewardText || `Successfully claimed reward for ${challenge.name}.`;
                rewardGranted = true; // Allow claiming even if no specific action defined yet
        }

        // --- Mark as Claimed & Save (Only AFTER successful reward logic or if rewardGranted is true) ---
         if (rewardGranted) {
             // --- SET CLAIMED FLAG (Explicitly boolean true) ---
             // Map type was already ensured/corrected before the claim check
             user.challengeProgress.set(claimedKey, true); // <-- ENSURE THIS IS BOOLEAN true

             // --- Mark Modified Paths ---
             user.markModified('challengeProgress'); // ESSENTIAL for nested Map updates
             if (transactionAdded) {
                 user.markModified('transactions'); // Mark if transactions array changed
             }

             // --- Save User ---
             console.log(`[Claim Reward] Saving user ${userId} with ${claimedKey} set to boolean true.`);
             await user.save();
             console.log(`[Claim Reward] User ${userId} saved successfully.`);

             // --- Send notification AFTER successful save ---
             try {
                  await createNotification(userId.toString(), 'gamification_reward_claimed', {
                      title: 'Reward Claimed!',
                      message: notificationMessage, // Use the message built in the switch statement
                      link: '/gamification', // Example link
                      challengeId: challengeId,
                      rewardType: challenge.rewardType,
                      rewardValue: challenge.rewardValue // Include value if useful
                  });
                  console.log(`[Claim Reward] Notification sent successfully for user ${userId}, challenge ${challengeId}.`);
             } catch (notificationError) {
                  // Log the error but don't fail the entire request because of notification failure
                  console.error(`[Claim Reward] Error creating notification for user ${userId}, challenge ${challengeId} (non-critical):`, notificationError);
             }

             res.json({
                  message: `Reward for "${challenge.name}" claimed successfully!`,
                 // Optionally return updated state if needed by frontend
                 // newGoldBalanceGrams: user.goldBalanceGrams,
                 // newCashBalanceLKR: user.cashBalanceLKR,
             });

         } else {
             // This case should ideally not be reached if the switch covers all possibilities or defaults handle it.
             console.error(`[Claim Reward] Reward action failed or was not defined for challenge ${challengeId}, user ${userId} (rewardGranted=false).`);
             // Don't save the claimed flag if reward granting failed unexpectedly
             return res.status(500).json({ message: "Failed to process reward action. Please contact support if this persists." });
         }

    } catch (error) {
        console.error(`[Claim Reward] General Error claiming reward for user ${userId}, challenge ${challengeId}:`, error);
        // Check for specific Mongoose validation errors if needed
        if (error.name === 'ValidationError') {
             console.error("[Claim Reward] Mongoose Validation Error:", error.errors);
             return res.status(400).json({ message: "Validation error saving user data.", details: error.message });
        }
        res.status(500).json({ message: "Server error claiming reward. Please try again later." });
    }
};

module.exports = { claimChallengeReward };