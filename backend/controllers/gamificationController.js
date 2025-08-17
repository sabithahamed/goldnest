// backend/controllers/gamificationController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const DynamicChallenge = require('../models/DynamicChallenge');
const { createNotification } = require('../services/notificationService');

const claimChallengeReward = async (req, res) => {
    const { challengeId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID format." });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const challenge = await DynamicChallenge.findById(challengeId);
        if (!challenge || !challenge.isActive) {
            return res.status(404).json({ message: "Challenge not found or is not active." });
        }

        // --- ROBUST COMPLETION & CLAIM CHECK (using plain objects) ---
        if (!user.completedChallengeIds.includes(challengeId)) {
            return res.status(400).json({ message: "Challenge not completed yet." });
        }
        
        // Ensure challengeProgress exists as an object
        user.challengeProgress = user.challengeProgress || {}; 
        const claimedKey = `${challengeId}_claimed`;

        if (user.challengeProgress[claimedKey] === true) {
            return res.status(400).json({ message: "Reward has already been claimed." });
        }
        // --- END OF ROBUST CHECK ---

        let notificationMessage = `Reward for "${challenge.name}" claimed! You've officially claimed the ${challenge.rewardValue} stars. Keep it up!`;
        
        // --- APPLY UPDATE using dot notation (most reliable way) ---
        const updatePayload = {
            $set: {
                [`challengeProgress.${claimedKey}`]: true
            }
        };
        
        // Use findByIdAndUpdate for an atomic and reliable update
        const updatedUser = await User.findByIdAndUpdate(userId, updatePayload, { new: true });

        if (!updatedUser) {
            // This should not happen if the user was found earlier, but it's a safe check
            throw new Error("Failed to update user after claim.");
        }
        
        // --- Send notification AFTER successful update ---
        await createNotification(userId.toString(), 'gamification_reward_claimed', {
            title: 'Reward Claimed!',
            message: notificationMessage,
            link: '/gamification'
        });

        res.json({ 
            message: `Reward for "${challenge.name}" claimed successfully!`,
            // Send back the updated progress so the frontend can potentially update without a full refetch
            challengeProgress: updatedUser.challengeProgress 
        });

    } catch (error) {
        console.error(`CRITICAL ERROR claiming reward for user ${userId}, challenge ${challengeId}:`, error);
        res.status(500).json({ message: "Server error claiming reward. Please try again later." });
    }
};

module.exports = { claimChallengeReward };