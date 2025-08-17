// backend/services/gamificationTriggerService.js
const User = require('../models/User');
const { processGamificationState } = require('./gamificationService');
const { createNotification } = require('./notificationService');
const { BADGES } = require('../config/gamification'); // Badges are still static from config
const DynamicChallenge = require('../models/DynamicChallenge'); // <-- NEW: Import DB model

const updateGamificationOnAction = async (userId, actionType = null, actionData = {}) => {
    if (!userId) {
        console.error("[GTS] userId is required for updateGamificationOnAction");
        return;
    }
    
    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`[GTS] User ${userId} not found.`);
            return;
        }

        // processGamificationState is now async, so we must await it
        const updates = await processGamificationState(user);

        let needsSave = false;
        const updatePayload = {};
        
        // --- Badge logic remains the same ---
        if (updates?.newBadgeIds?.length > 0) {
            // ... (no changes here)
        }

        // --- Challenge logic is now ASYNCHRONOUS ---
        if (updates?.newCompletedChallengeIds?.length > 0) {
            const currentChallenges = user.completedChallengeIds || [];
            const challengesToAdd = updates.newCompletedChallengeIds.filter(id => !currentChallenges.includes(id));

            if (challengesToAdd.length > 0) {
                updatePayload.completedChallengeIds = [...currentChallenges, ...challengesToAdd];
                needsSave = true;

                // Create notifications by fetching details from the DB
                // Use a for...of loop to handle async/await correctly
                for (const id of challengesToAdd) {
                    const challengeDef = await DynamicChallenge.findById(id).lean(); // <-- NEW: Fetch from DB
                    if (challengeDef) {
                        await createNotification(userId, 'gamification_challenge', {
                            title: 'Challenge Complete!',
                            message: `You completed the "${challengeDef.name}" challenge! Reward: ${challengeDef.rewardText}`,
                            link: '/gamification',
                            metadata: { challengeId: id }
                        });
                    }
                }
            }
        }

        // Star and Progress updates logic remains the same
        if (updates?.starsToAdd > 0) {
            updatePayload.starCount = (user.starCount || 0) + updates.starsToAdd;
            needsSave = true;
        }
        if (updates?.updatedProgressMap) {
            updatePayload.challengeProgress = updates.updatedProgressMap;
            needsSave = true;
        }

        if (needsSave) {
            await User.updateOne({ _id: userId }, { $set: updatePayload });
            // Note: Notification sending was moved inside the loop above
        }

    } catch (error) {
        console.error(`[GTS ERROR] during gamification update for user ${userId}:`, error);
    }
};

module.exports = { updateGamificationOnAction };