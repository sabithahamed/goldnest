// backend/services/gamificationTriggerService.js
const User = require('../models/User');
const { processGamificationState } = require('./gamificationService');
const { createNotification } = require('./notificationService');
const { getAllBadges, getActiveChallenges } = require('../config/gamification'); // Need defs for notifications

/**
 * Fetches user, processes gamification, updates DB, and sends notifications.
 * Called AFTER a relevant action (investment, sell, redeem) is successfully saved.
 * @param {string} userId - The ID of the user who performed the action.
 * @param {string} actionType - Type of action ('investment', 'sell', 'redeem'). Optional.
 * @param {object} actionData - Data related to the action. Optional.
 */
const updateGamificationOnAction = async (userId, actionType = null, actionData = {}) => {
    if (!userId) {
        console.error("[GTS] userId is required for updateGamificationOnAction");
        return;
    }
    console.log(`[GTS Debug] Triggered for user ${userId}, action: ${actionType}`);

    try {
        // 1. Fetch the LATEST user state AFTER the action was saved
        const user = await User.findById(userId); // Fetch fresh data
        if (!user) {
            console.error(`[GTS] User ${userId} not found for gamification update.`);
            return;
        }

        // 2. Process gamification state based on fetched user data
        const updates = processGamificationState(user);

        // 3. Build update payload ONLY if there are changes
        let needsSave = false;
        const updatePayload = {};
        let notificationsToSend = [];

        if (updates.newBadgeIds.length > 0) {
            updatePayload.earnedBadgeIds = Array.from(new Set([...user.earnedBadgeIds, ...updates.newBadgeIds]));
            needsSave = true;
            // Prepare badge notifications
            const allBadgeDefs = getAllBadges();
            updates.newBadgeIds.forEach(id => {
                const badgeDef = allBadgeDefs.find(b => b.id === id);
                if(badgeDef) notificationsToSend.push({ userId, type: 'gamification_badge', details: { title: 'Badge Earned!', message: `Congrats on earning "${badgeDef.name}"! ${badgeDef.description}`, link: '/wallet#gamification', metadata: { badgeId: id } } });
            });
        }
        if (updates.newCompletedChallengeIds.length > 0) {
             updatePayload.completedChallengeIds = Array.from(new Set([...user.completedChallengeIds, ...updates.newCompletedChallengeIds]));
             needsSave = true;
             // Prepare challenge notifications
             const allChallengeDefs = getActiveChallenges();
             updates.newCompletedChallengeIds.forEach(id => {
                  const challengeDef = allChallengeDefs.find(c => c.id === id);
                 if(challengeDef) notificationsToSend.push({ userId, type: 'gamification_challenge', details: { title: 'Challenge Complete!', message: `You completed "${challengeDef.name}"! Reward: ${challengeDef.rewardText}`, link: '/wallet#gamification', metadata: { challengeId: id } } });
             });
        }
        if (updates.starsToAdd > 0) {
            updatePayload.starCount = (user.starCount || 0) + updates.starsToAdd;
            needsSave = true;
        }
        if (updates.updatedProgressMap) {
            updatePayload.challengeProgress = updates.updatedProgressMap;
            needsSave = true;
        }

        // 4. Save to DB if necessary
        if (needsSave) {
            console.log(`[GTS Debug] Saving gamification updates for ${userId}:`, updatePayload);
            const updateResult = await User.updateOne({ _id: userId }, { $set: updatePayload });
             console.log(`[GTS Debug] Save result for ${userId}:`, updateResult);

             if (updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0) {
                 // 5. Send Notifications ONLY after successful save
                  console.log(`[GTS Debug] Sending ${notificationsToSend.length} gamification notifications for ${userId}.`);
                  for (const { userId: uid, type, details } of notificationsToSend) {
                     await createNotification(uid, type, details);
                  }
             } else {
                  console.warn(`[GTS Debug] Gamification save attempted for ${userId} but no documents were modified.`);
             }
        } else {
             console.log(`[GTS Debug] No gamification updates needed for ${userId} after action ${actionType}.`);
        }

    } catch (error) {
        console.error(`[GTS ERROR] Failed to update gamification for user ${userId}:`, error);
        // Don't crash the original action, just log the gamification error
    }
};

module.exports = { updateGamificationOnAction };