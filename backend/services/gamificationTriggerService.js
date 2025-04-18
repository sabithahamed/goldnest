// backend/services/gamificationTriggerService.js
const User = require('../models/User');
// Import the core processing logic (which now uses config internally)
const { processGamificationState } = require('./gamificationService');
// Import the notification service
const { createNotification } = require('./notificationService');
// Import directly from config ONLY for generating notification text
const { BADGES, CHALLENGES } = require('../config/gamification');

/**
 * Fetches user, processes gamification state based on config definitions,
 * updates the user document in the DB, and sends notifications for new achievements.
 * Called AFTER a relevant action (investment, sell, redeem, etc.) is successfully saved.
 *
 * @param {string} userId - The ID of the user who performed the action.
 * @param {string} actionType - Type of action ('investment', 'sell', 'redeem', etc.). Optional, used for logging.
 * @param {object} actionData - Data related to the action. Optional, might be used by processGamificationState in future.
 */
const updateGamificationOnAction = async (userId, actionType = null, actionData = {}) => {
    if (!userId) {
        console.error("[GTS] userId is required for updateGamificationOnAction");
        return;
    }
    console.log(`[GTS Debug] Triggered for user ${userId}, action: ${actionType || 'N/A'}`);

    try {
        // --- 1. Fetch LATEST User State ---
        // Fetch the full User object, not lean(), as we compare against its state and update it
        const user = await User.findById(userId);

        // Validate fetched user
        if (!user) {
            console.error(`[GTS] User ${userId} not found for gamification update.`);
            return; // Cannot proceed without user
        }
        // --- END Fetch ---

        // --- 2. Process gamification state (uses config definitions internally) ---
        // processGamificationState now gets definitions from config via its helpers
        // Assuming processGamificationState signature is now just processGamificationState(user)
        // Pass actionType/actionData if processGamificationState needs them
        const updates = processGamificationState(user /*, actionType, actionData */); // Adjust if needed
        // --- END Process ---

        // --- 3. Build update payload ONLY if there are changes detected ---
        let needsSave = false;
        const updatePayload = {};
        let notificationsToSend = [];

        // Check for new Badges
        if (updates && updates.newBadgeIds && updates.newBadgeIds.length > 0) {
            const currentBadges = user.earnedBadgeIds || [];
            // Filter out badges the user *already* has (robustness check)
            const badgesToAdd = updates.newBadgeIds.filter(id => !currentBadges.includes(id));

            if (badgesToAdd.length > 0) {
                updatePayload.earnedBadgeIds = [...currentBadges, ...badgesToAdd]; // Combine existing and newly earned unique badges
                needsSave = true;

                // Prepare badge notifications (use imported config definitions for text)
                badgesToAdd.forEach(id => {
                    const badgeDef = BADGES[id]; // Get definition from imported config object
                    if (badgeDef) {
                        notificationsToSend.push({
                            userId,
                            type: 'gamification_badge',
                            details: {
                                title: 'Badge Earned!',
                                message: `Congrats on earning the "${badgeDef.name}" badge! ${badgeDef.description}`,
                                link: '/wallet#gamification', // Link to gamification section
                                metadata: { badgeId: id }
                            }
                        });
                    } else {
                        // Log a warning if a badge ID from updates doesn't exist in config (shouldn't happen ideally)
                        console.warn(`[GTS] Could not find badge definition in config for newly earned badge ID: ${id} for user ${userId}`);
                    }
                });
            }
        }

        // Check for new Completed Challenges
        if (updates && updates.newCompletedChallengeIds && updates.newCompletedChallengeIds.length > 0) {
            const currentChallenges = user.completedChallengeIds || [];
            // Filter out challenges the user *already* has (robustness check)
            const challengesToAdd = updates.newCompletedChallengeIds.filter(id => !currentChallenges.includes(id));

            if (challengesToAdd.length > 0) {
                updatePayload.completedChallengeIds = [...currentChallenges, ...challengesToAdd]; // Combine existing and newly completed unique challenges
                needsSave = true;

                // Prepare challenge notifications (use imported config definitions for text)
                challengesToAdd.forEach(id => {
                    const challengeDef = CHALLENGES[id]; // Get definition from imported config object
                    if (challengeDef) {
                        notificationsToSend.push({
                            userId,
                            type: 'gamification_challenge',
                            details: {
                                title: 'Challenge Complete!',
                                message: `You completed the "${challengeDef.name}" challenge! Reward: ${challengeDef.rewardText || 'Check your progress!'}`,
                                link: '/wallet#gamification', // Link to gamification section
                                metadata: { challengeId: id }
                            }
                        });
                    } else {
                         // Log a warning if a challenge ID from updates doesn't exist in config
                         console.warn(`[GTS] Could not find challenge definition in config for newly completed challenge ID: ${id} for user ${userId}`);
                    }
                });
            }
        }

        // Check for Star updates
        if (updates && updates.starsToAdd > 0) {
            // Safely add stars to existing count (defaulting to 0 if undefined/null)
            updatePayload.starCount = (user.starCount || 0) + updates.starsToAdd;
            needsSave = true;
            // Optional: Add a notification for significant star earnings if desired
        }

        // Check for Challenge Progress updates
        if (updates && updates.updatedProgressMap) {
            // Assume processGamificationState only returns updatedProgressMap if there are changes.
            // Ensure User model schema's challengeProgress field can handle a Map.
            // If it expects a plain Object, use: Object.fromEntries(updates.updatedProgressMap)
            updatePayload.challengeProgress = updates.updatedProgressMap;
            needsSave = true;
        }

        // --- 4. Save to DB if necessary ---
        if (needsSave) {
            console.log(`[GTS Debug] Saving gamification updates for ${userId}:`, JSON.stringify(updatePayload));
            // Use updateOne for efficiency, applying only the changes in updatePayload
            const updateResult = await User.updateOne({ _id: userId }, { $set: updatePayload });
            console.log(`[GTS Debug] Save result for ${userId}:`, updateResult);

            if (updateResult.matchedCount > 0 && updateResult.modifiedCount > 0) {
                // --- 5. Send Notifications ONLY after successful save and modification ---
                if (notificationsToSend.length > 0) {
                    console.log(`[GTS Debug] Sending ${notificationsToSend.length} gamification notifications for ${userId}.`);
                    // Send notifications concurrently
                    await Promise.all(notificationsToSend.map(({ userId: uid, type, details }) =>
                        createNotification(uid, type, details)
                    ));
                    console.log(`[GTS Debug] Notifications sent for ${userId}.`);
                } else {
                     console.log(`[GTS Debug] Gamification state updated for ${userId}, but no new badges/challenges triggered notifications.`);
                }
            } else if (updateResult.matchedCount > 0 && updateResult.modifiedCount === 0) {
                // This might happen if the calculated state matches the existing DB state exactly
                console.warn(`[GTS Debug] Gamification update matched user ${userId} but no fields were modified. Payload:`, JSON.stringify(updatePayload));
            } else {
                // This means the user ID provided didn't match any document during the update attempt
                console.error(`[GTS Debug] Failed to find user ${userId} during gamification save operation.`);
            }
        } else {
            console.log(`[GTS Debug] No gamification updates needed for ${userId} after action ${actionType || 'N/A'}.`);
        }

    } catch (error) {
        console.error(`[GTS ERROR] Unexpected error during gamification update for user ${userId}:`, error);
        // Log the error but avoid rethrowing to prevent crashing the primary action (e.g., investment)
    }
};

module.exports = { updateGamificationOnAction };