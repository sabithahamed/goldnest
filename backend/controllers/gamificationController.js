// backend/controllers/gamificationController.js
const User = require('../models/User');
const { CHALLENGES } = require('../config/gamification'); // Need challenge defs

// @desc    Claim a reward for a completed challenge
// @route   POST /api/gamification/claim/:challengeId
// @access  Private
const claimChallengeReward = async (req, res) => {
    const { challengeId } = req.params;
    const userId = req.user._id;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        // Find the challenge definition
        const challenge = CHALLENGES[challengeId]; // Assumes CHALLENGES uses ID as key
        if (!challenge) return res.status(404).json({ message: "Challenge definition not found." });

        // Check if challenge is actually completed by user
        const completedChallenges = user.completedChallengeIds || [];
        if (!completedChallenges.includes(challengeId)) {
            return res.status(400).json({ message: "Challenge not completed yet." });
        }

        // Check if reward is claimable and not already claimed (needs enhancement)
        // For now, assume any completed challenge can be "claimed" once via this endpoint
        // We need a way to mark it as claimed. Let's add to challengeProgress map.
         const progressMap = user.challengeProgress || new Map();
         if (progressMap.get(`${challengeId}_claimed`) === true) {
             return res.status(400).json({ message: "Reward already claimed." });
         }

         // --- Apply Reward ---
         // This is where you'd grant the actual bonus (e.g., add cash, add gold bonus transaction)
         // For demo, we just mark as claimed and maybe send notification
         console.log(`User ${userId} claimed reward for challenge ${challengeId}. Reward: ${challenge.rewardText}`);
         // Example: Add a small gold bonus
         // user.goldBalanceGrams += 0.01; // Example bonus
         // user.transactions.push({ type: 'bonus', amountGrams: 0.01, description: `Reward for ${challenge.name}` });

         // Mark as claimed in progress map
         user.challengeProgress.set(`${challengeId}_claimed`, true);
         user.markModified('challengeProgress'); // Essential for Map updates
         await user.save();

         res.json({ message: `Reward for "${challenge.name}" claimed successfully!` });


    } catch (error) {
        console.error("Claim Reward Error:", error);
        res.status(500).json({ message: "Server error claiming reward." });
    }
};

module.exports = { claimChallengeReward };