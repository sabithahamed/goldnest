// backend/services/gamificationTriggerService.js
const User = require('../models/User');
const BadgeDefinition = require('../models/BadgeDefinition'); // <-- IMPORT MODEL
const ChallengeDefinition = require('../models/ChallengeDefinition'); // <-- IMPORT MODEL
const { processGamificationState } = require('./gamificationService'); // Assumes this service is updated to accept definitions
const { createNotification } = require('./notificationService');

/**
 * Fetches user, active gamification definitions, processes gamification state,
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
        // --- Fetch User AND Active Gamification Definitions Concurrently ---
        const [user, activeBadgeDefs, activeChallengeDefs] = await Promise.all([
             User.findById(userId).lean(), // Fetch fresh user data. .lean() can be slightly faster if we only read. Remove if modification needed before processing.
             BadgeDefinition.find({ isActive: true }).lean(), // Fetch active badge definitions
             ChallengeDefinition.find({ isActive: true }).lean() // Fetch active challenge definitions
        ]).catch(err => {
            // Handle potential errors during the parallel fetch
            console.error(`[GTS ERROR] Failed to fetch user or gamification definitions for user ${userId}:`, err);
            return [null, null, null]; // Return nulls to indicate failure
        });
        // --- END Fetch ---

        // Validate fetched data
        if (!user) {
            console.error(`[GTS] User ${userId} not found for gamification update.`);
            return; // Cannot proceed without user
        }
        // Log warnings if definitions couldn't be fetched, but proceed if user exists
        if (!activeBadgeDefs) console.warn("[GTS] Failed to fetch active badge definitions. Gamification processing might be incomplete.");
        if (!activeChallengeDefs) console.warn("[GTS] Failed to fetch active challenge definitions. Gamification processing might be incomplete.");

        // Provide empty arrays as defaults if fetching failed
        const badgesToProcess = activeBadgeDefs || [];
        const challengesToProcess = activeChallengeDefs || [];

        // --- Process gamification state (PASS fetched definitions) ---
        // NOTE: gamificationService.processGamificationState MUST be updated
        // to accept these definitions as arguments.
        const updates = processGamificationState(user, badgesToProcess, challengesToProcess, actionType, actionData);
        // --- END Process ---

        // 3. Build update payload ONLY if there are changes detected by processGamificationState
        let needsSave = false;
        const updatePayload = {};
        let notificationsToSend = [];

        // Check for new Badges
        if (updates && updates.newBadgeIds && updates.newBadgeIds.length > 0) {
            // Ensure unique badges are added to the user's existing list
            const currentBadges = user.earnedBadgeIds || [];
            updatePayload.earnedBadgeIds = Array.from(new Set([...currentBadges, ...updates.newBadgeIds]));
            needsSave = true;

            // Prepare badge notifications (Use fetched definitions)
             updates.newBadgeIds.forEach(id => {
                 // Find the definition using the ID returned by processGamificationState
                 // Assuming the ID stored in newBadgeIds matches the 'badgeId' field in BadgeDefinition model
                 const badgeDef = badgesToProcess.find(b => b.badgeId === id);
                if(badgeDef) {
                     notificationsToSend.push({
                         userId,
                         type: 'gamification_badge',
                         details: {
                             title: 'Badge Earned!',
                             message: `Congrats on earning the "${badgeDef.name}" badge! ${badgeDef.description}`,
                             link: '/wallet#gamification', // Consider making links dynamic if needed
                             metadata: { badgeId: id }
                         }
                     });
                } else {
                     console.warn(`[GTS] Could not find badge definition for newly earned badge ID: ${id} for user ${userId}`);
                }
            });
        }

        // Check for new Completed Challenges
        if (updates && updates.newCompletedChallengeIds && updates.newCompletedChallengeIds.length > 0) {
             // Ensure unique challenges are added to the user's existing list
             const currentChallenges = user.completedChallengeIds || [];
             updatePayload.completedChallengeIds = Array.from(new Set([...currentChallenges, ...updates.newCompletedChallengeIds]));
             needsSave = true;

             // Prepare challenge notifications (Use fetched definitions)
             updates.newCompletedChallengeIds.forEach(id => {
                  // Find the definition using the ID returned by processGamificationState
                  // Assuming the ID stored in newCompletedChallengeIds matches the 'challengeId' field in ChallengeDefinition model
                  const challengeDef = challengesToProcess.find(c => c.challengeId === id);
                 if(challengeDef) {
                      notificationsToSend.push({
                          userId,
                          type: 'gamification_challenge',
                          details: {
                              title: 'Challenge Complete!',
                              message: `You completed the "${challengeDef.name}" challenge! Reward: ${challengeDef.rewardText || 'Check your progress!'}`,
                              link: '/wallet#gamification', // Consider making links dynamic if needed
                              metadata: { challengeId: id }
                          }
                      });
                 } else {
                      console.warn(`[GTS] Could not find challenge definition for newly completed challenge ID: ${id} for user ${userId}`);
                 }
             });
        }

        // Check for Star updates
        if (updates && updates.starsToAdd > 0) {
            // Safely add stars to existing count (defaulting to 0 if undefined)
            updatePayload.starCount = (user.starCount || 0) + updates.starsToAdd;
            needsSave = true;
            // Optionally, add a notification for star earnings if significant?
            // e.g., if (updates.starsToAdd > 5) { /* create notification */ }
        }

        // Check for Challenge Progress updates
        if (updates && updates.updatedProgressMap) {
             // Check if the progress map actually changed to avoid unnecessary writes
             // This requires a deep comparison, which can be complex. A simpler check
             // might be just to always set it if updates.updatedProgressMap exists.
             // For robustness, assume processGamificationState only returns it if changed.
            updatePayload.challengeProgress = updates.updatedProgressMap;
            needsSave = true;
        }

        // 4. Save to DB if necessary
        if (needsSave) {
            console.log(`[GTS Debug] Saving gamification updates for ${userId}:`, JSON.stringify(updatePayload)); // Stringify for cleaner logs of objects
            // Use updateOne to apply the changes based on the built payload
            const updateResult = await User.updateOne({ _id: userId }, { $set: updatePayload });
             console.log(`[GTS Debug] Save result for ${userId}:`, updateResult);

             if (updateResult.matchedCount > 0 && updateResult.modifiedCount > 0) {
                 // 5. Send Notifications ONLY after successful save and modification
                  console.log(`[GTS Debug] Sending ${notificationsToSend.length} gamification notifications for ${userId}.`);
                  // Use Promise.all for potentially faster notification sending (if async)
                  await Promise.all(notificationsToSend.map(({ userId: uid, type, details }) =>
                      createNotification(uid, type, details)
                  ));
                  console.log(`[GTS Debug] Notifications sent for ${userId}.`);
             } else if (updateResult.matchedCount > 0 && updateResult.modifiedCount === 0) {
                  console.warn(`[GTS Debug] Gamification update matched user ${userId} but no fields were modified. Payload:`, JSON.stringify(updatePayload));
             } else {
                  console.error(`[GTS Debug] Failed to find user ${userId} during gamification save operation.`);
             }
        } else {
             console.log(`[GTS Debug] No gamification updates needed for ${userId} after action ${actionType || 'N/A'}.`);
        }

    } catch (error) {
        console.error(`[GTS ERROR] Unexpected error during gamification update for user ${userId}:`, error);
        // Log the error but don't rethrow, as this service should ideally not
        // crash the primary operation (like investment saving) that triggered it.
    }
};

module.exports = { updateGamificationOnAction };