// src/app/gamification/page.jsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import styles from './gamification.module.css'; // Assuming styles are defined here

// --- Helper Functions (Copied from original, ensure these are correct) ---
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return 'Rs. 0.00';
    }
    return `Rs. ${value.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatGrams = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0.00g';
    }
    return `${value.toFixed(decimals)}g`;
};

const toTitleCase = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Note: formatDate was mentioned but not provided or used in the logic below.
// Add it here if needed elsewhere.
// const formatDate = (dateString) => { /* ... implementation ... */ };
// --- End Helper Functions ---

export default function GamificationPage() {
    const [userData, setUserData] = useState(null); // User data + gamification state + definitions
    const [tab, setTab] = useState('active');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    // --- Fetch User Data Function ---
    const fetchUserData = useCallback(async (showLoadingIndicator = true) => {
        if (showLoadingIndicator) setLoading(true);
        setError('');
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const token = localStorage.getItem('userToken');

        if (!token) {
            // No need to set error here, just redirect
            router.push('/'); // Redirect to login or home
            return; // Stop execution
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
            if (!data) throw new Error("No user data received.");
            console.log("--- Fetched User Data on /gamification ---");
            // Use JSON.stringify for potentially complex objects/maps in logs
            console.log("Raw challengeProgress:", JSON.stringify(data.challengeProgress));
            console.log("Completed IDs:", JSON.stringify(data.completedChallengeIds));
            setUserData(data); // Update the state with fresh data
        } catch (err) {
            console.error('Error fetching user data on /gamification:', err);
            const errorMessage = err.response?.data?.message || 'Failed to load data.';
            setError(errorMessage);
            if (err.response?.status === 401) {
                 // Clear potentially invalid token and redirect
                 localStorage.removeItem('userToken'); // More specific than clear()
                 router.push('/');
            }
        } finally {
            // Only stop loading if we were showing the indicator
            if (showLoadingIndicator) setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Removed router dependency - it doesn't change, prevents potential loops

    // --- Initial Data Fetch ---
    useEffect(() => {
        fetchUserData(true); // Initial load with spinner
    }, [fetchUserData]); // Depends on the stable fetchUserData


    // --- Refetch on Window Focus ---
    useEffect(() => {
        const handleFocus = () => {
            console.log("Window focused, refetching data for /gamification...");
            // Refetch without the main loading spinner for a smoother UX
            // but allow the UI to update based on the new data.
            fetchUserData(false);
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchUserData]); // Depend on the stable fetch function


    // --- Derived State using useMemo ---
    // Use optional chaining and provide defaults for robustness
    const challengeProgressData = useMemo(() => userData?.challengeProgress ?? {}, [userData?.challengeProgress]);
    const completedChallengeIdsSet = useMemo(() => new Set(userData?.completedChallengeIds ?? []), [userData?.completedChallengeIds]);
    const allDefinedChallenges = useMemo(() => userData?.gamificationDefs?.challenges ?? [], [userData?.gamificationDefs]);


    // --- Filtering Logic ---
    const filteredChallenges = useMemo(() => {
        // Log the raw data *before* filtering for debugging
        console.log(`Filtering for tab: ${tab}. Current Progress Data: ${JSON.stringify(challengeProgressData)}, Completed IDs: ${JSON.stringify(Array.from(completedChallengeIdsSet))}`);
        return allDefinedChallenges.filter(challenge => {
            if (!challenge || !challenge.id) return false; // Safety check

            const isCompleted = completedChallengeIdsSet.has(challenge.id);
            // Check the claimed flag directly from the progress data object
            const isClaimed = challengeProgressData[`${challenge.id}_claimed`] === true;

            let show = false;
            switch (tab) {
                case 'active':
                    // Show ONLY if NOT completed (implies not claimed either, as completed is a prerequisite for claiming)
                    show = !isCompleted;
                    break;
                case 'completed': // UI Label: "Ready to Claim"
                    // Show if completed AND NOT claimed
                    show = isCompleted && !isClaimed;
                    break;
                case 'claimed':
                    // Show if claimed flag is true
                    show = isClaimed;
                    break;
                // 'all' case removed as per the UI change
                default: // Fallback to active if tab state is unexpected
                    show = !isCompleted;
            }
            // Optional detailed log per challenge
            // console.log(`Filter check - Challenge: ${challenge.id}, Completed: ${isCompleted}, Claimed: ${isClaimed}, Show in Tab '${tab}': ${show}`);
            return show;
        });
    }, [allDefinedChallenges, challengeProgressData, completedChallengeIdsSet, tab]); // Dependencies are correct


    // --- Star/Tier Calculation ---
    const totalStars = userData?.starCount ?? 0;
    // Define thresholds (ensure this matches backend or design)
    const tierThresholds = [10, 20, 30, 40, 50]; // Example: Tier 1 = 10+, Tier 2 = 20+, etc.
    const maxTierLevel = tierThresholds.length; // Max tier is 5 in this example

    let currentTierLevel = 0; // Start at tier 0
    for (let i = 0; i < tierThresholds.length; i++) {
        if (totalStars >= tierThresholds[i]) {
            currentTierLevel = i + 1; // Tier levels are 1-based
        } else {
            break; // Stop when the threshold isn't met
        }
    }

    const starsForCurrentTierStart = currentTierLevel > 0 ? tierThresholds[currentTierLevel - 1] : 0;
    const starsForNextTier = currentTierLevel < maxTierLevel ? tierThresholds[currentTierLevel] : totalStars; // If max tier, next target is irrelevant
    const starsNeededForNextTier = currentTierLevel < maxTierLevel ? Math.max(0, starsForNextTier - totalStars) : 0;
    const starsInCurrentTierRange = starsForNextTier - starsForCurrentTierStart;

    // Calculate progress percentage towards the *next* tier
    const progressToNextTier = (currentTierLevel < maxTierLevel && starsInCurrentTierRange > 0)
        ? Math.max(0, Math.min(100, ((totalStars - starsForCurrentTierStart) / starsInCurrentTierRange) * 100))
        : (currentTierLevel >= maxTierLevel ? 100 : 0); // Show 100% if max tier, 0% if range is 0 or invalid

    // --- End Star/Tier ---


    // --- Render Challenge Card ---
    const renderChallengeCard = (challenge) => {
        if (!challenge || !challenge.id) return null; // Basic validation

        const { id, name, description, rewardText, goal = 1, starsAwarded = 1, type, unit, rewardType } = challenge;

        // Get status based on the *current* userData state derived values for this render cycle
        // Note: challengeProgressData and completedChallengeIdsSet are already memoized based on userData
        const progress = challengeProgressData[id] || 0;
        const isCompleted = completedChallengeIdsSet.has(id);
        const isClaimed = challengeProgressData[`${id}_claimed`] === true;

        const progressPercentage = goal > 0 ? Math.min((progress / goal) * 100, 100) : (isCompleted || progress > 0 ? 100 : 0);
        const canClaim = isCompleted && !isClaimed; // Allow claim if completed & not yet claimed

        // Determine status based on the derived booleans
        let status = 'active'; // Default: Not started
        if (isClaimed) status = 'claimed';
        else if (isCompleted) status = 'completed'; // Represents 'Ready to Claim' state visually
        else if (progress > 0) status = 'in-progress'; // Started but not finished

        // Determine icon based on status
        let iconClass = 'fas fa-trophy'; // Default for active/in-progress
        if (status === 'claimed') iconClass = 'fas fa-check-double';
        else if (status === 'completed') iconClass = 'fas fa-check-circle'; // Ready to claim

        // Determine progress text based on status
        let progressText = 'Not yet started';
         if (status === 'claimed') {
             progressText = 'Reward Claimed';
         } else if (status === 'completed') {
             // This specific text is shown only when the card is in 'completed' state
             progressText = 'Completed! Ready to Claim.';
         } else if (status === 'in-progress') {
             const needed = Math.max(0, goal - progress);
             if (unit === 'LKR') progressText = `${formatCurrency(needed)} more`;
             else if (unit === 'g') progressText = `${formatGrams(needed)} more`;
             // Handle cases where goal might not be an integer (though less common)
             else if (goal > 1) progressText = `${needed % 1 !== 0 ? needed.toFixed(1) : needed.toFixed(0)} more`;
             else progressText = 'In Progress'; // e.g., for boolean tasks goal=1, progress=0
         } else { // Active but 0 progress
             if (unit === 'LKR') progressText = `Complete ${formatCurrency(goal)} task`;
             else if (unit === 'g') progressText = `Complete ${formatGrams(goal)} task`;
             else if (goal > 1) progressText = `Complete ${goal.toFixed(0)} tasks`;
             else progressText = 'Start the challenge';
         }

        // Determine action button/link
        let actionElement = null;
        if (canClaim) { // Highest priority: Offer claim if possible
            actionElement = (
                <Link href={`/claim-reward/${id}`} className={`${styles.btnPrimary}`}>Claim Reward</Link>
            );
        } else if (isClaimed) { // If already claimed
            actionElement = (
                <button className={`${styles.btnSecondary}`} disabled>Reward Claimed</button>
            );
        } else if (isCompleted) { // If completed but somehow not claimable (shouldn't happen with current logic, but safe fallback)
             actionElement = (
                <button className={`${styles.btnSecondary}`} disabled>Completed</button>
            );
        } else { // Still active / in-progress
             // Determine appropriate link based on challenge type (example)
            let actionLink = "/trade"; // Default link
            if (type?.toUpperCase().includes('REFER')) actionLink = "/referral";
            else if (type?.toUpperCase().includes('KYC')) actionLink = "/kyc"; // Example
            else if (type?.toUpperCase().includes('DEPOSIT')) actionLink = "/deposit"; // Example

            actionElement = (
                <Link href={actionLink} className={`${styles.btnSecondary}`}>
                    {progress === 0 ? 'Start Challenge' : 'Continue'}
                </Link>
            );
        }


        // --- Card JSX Structure ---
        return (
            <div key={id} className={`${styles.challengeCard} ${styles[status.replace('-', '')]}`}>
                <div className={styles.challengeHeader}>
                    <i className={`${iconClass} ${styles.challengeIcon}`}></i>
                    <div className={styles.challengeTitleContainer}>
                        <h4>{toTitleCase(name)}</h4>
                        {/* Display star reward concisely */}
                        {starsAwarded > 0 && <span className={styles.starEarn}>Earn {starsAwarded} star{starsAwarded !== 1 ? 's' : ''}</span>}
                    </div>
                     {/* Use status for badge text, convert 'completed' to 'READY TO CLAIM' */}
                     <span className={`${styles.statusBadge} ${styles[status.replace('-', '')]}`}>
                          {status === 'completed' ? 'READY TO CLAIM' : status.replace('-', ' ').toUpperCase()}
                     </span>
                </div>
                <p className={styles.challengeDescription}>{description}</p>
                 {/* Ensure reward text exists before rendering */}
                 {rewardText && (
                    <p className={styles.challengeReward}>
                        <strong>Reward:</strong> {rewardText}
                    </p>
                 )}

                {/* Progress Bar Logic: Hide if claimed or completed (ready to claim) */}
                 {status !== 'claimed' && status !== 'completed' && goal > 0 && (
                      <div className={styles.progressContainer}>
                           <div className={styles.progressBar}>
                               <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }}></div>
                           </div>
                           {/* Show dynamic progress text only when bar is visible */}
                           <span className={styles.progressText}>{progressText}</span>
                      </div>
                  )}

                 {/* Show specific text if claimed or ready to claim, even without the bar */}
                 {status === 'claimed' && (
                     <div className={styles.progressContainer}>
                        {/* Add specific styling if needed */}
                        <span className={`${styles.progressText} ${styles.claimedText}`}>{progressText}</span>
                    </div>
                 )}
                 {status === 'completed' && ( // Show "Ready to Claim" text clearly when applicable
                     <div className={styles.progressContainer}>
                         {/* Add specific styling if needed */}
                        <span className={`${styles.progressText} ${styles.readyToClaimText}`}>{progressText}</span>
                    </div>
                 )}


                <div className={styles.challengeAction}>
                    {actionElement}
                </div>
            </div>
        );
    };


    // --- Loading/Error/Main Render ---
    // Use simpler inline messages for loading/error as per the new code snippet suggestion
    if (loading && !userData) { // Show full loading only if no data is present yet
        return (
            <>
                <NavbarInternal />
                {/* Simplified loading message */}
                <div className={styles.gamification}> {/* Keep main container for layout consistency */}
                     <div className={`${styles.header} ${styles.centered}`}>
                        <h2>Loading Your Achievements...</h2>
                        <div className={styles.loadingSpinner}></div> {/* Optional: keep spinner if defined */}
                    </div>
                </div>
                <FooterInternal />
            </>
        );
    }

    if (error) {
        return (
            <>
                <NavbarInternal />
                 {/* Simplified error message */}
                 <div className={styles.gamification}>
                    <div className={`${styles.header} ${styles.centered}`}>
                        <h2>Error Loading Achievements</h2>
                        {/* Use the CSS module style for error messages */}
                        <p className={styles.errorMessage}>{error}</p>
                         <Link href="/dashboard" className={styles.backButton}>
                             Go Back to Dashboard
                         </Link>
                    </div>
                 </div>
                <FooterInternal />
            </>
        );
    }

    // Safeguard against rendering without data (should be caught by loading/error)
    if (!userData) {
        return (
            <>
                <NavbarInternal />
                 <div className={styles.gamification}>
                     <div className={`${styles.header} ${styles.centered}`}>
                        <h2>Achievements</h2>
                        {/* Use a CSS module style for this message */}
                        <p className={styles.noDataMessage}>Could not load user data. Please try again later.</p>
                         <Link href="/dashboard" className={styles.backButton}>
                             Go Back to Dashboard
                         </Link>
                    </div>
                 </div>
                <FooterInternal />
            </>
        );
    }


    // --- Main Component Render ---
    return (
        <>
            <NavbarInternal />
            <section className={styles.gamification}>
                {/* Header */}
                <div className={styles.header}>
                     <h2>Your Achievements</h2>
                     <p>Complete challenges, earn stars, claim rewards, and climb the tiers!</p>
                 </div>

                {/* Star Tier Section (using updated calculations) */}
                 <div className={styles.starsSection}>
                      <div className={styles.starsHeader}>
                          <h3>Your Star Tier</h3>
                          {/* Optional: Tooltip from original code */}
                          <div className={styles.tooltipContainer}>
                            <i className={`fas fa-info-circle ${styles.infoIcon}`}></i>
                            <span className={styles.tooltipText}>Earn stars by completing challenges to advance through tiers! More stars unlock better benefits.</span>
                          </div>
                      </div>
                      <div className={styles.stars}>
                          {/* Render stars based on maxTierLevel and currentTierLevel */}
                          {[...Array(maxTierLevel)].map((_, i) => (
                              <i key={i} className={`fas fa-star ${i < currentTierLevel ? styles.star : styles.starEmpty}`}></i>
                          ))}
                      </div>
                      <p className={styles.tierText}>
                          Tier {currentTierLevel} - {totalStars} star{totalStars !== 1 ? 's' : ''} earned
                      </p>
                      {/* Show progress to next tier only if not max tier */}
                      {currentTierLevel < maxTierLevel ? (
                           <>
                               <div className={styles.progressBar}> {/* Tier progress bar */}
                                   <div className={styles.progressFill} style={{ width: `${progressToNextTier}%` }}></div>
                               </div>
                               <p className={styles.progressText}>
                                   {starsNeededForNextTier} star{starsNeededForNextTier !== 1 ? 's' : ''} to Tier {currentTierLevel + 1}
                                   {/* Show total required for next tier clearly */}
                                   {' '}({tierThresholds[currentTierLevel]} total stars required)
                               </p>
                           </>
                      ) : (
                          // Message for max tier reached
                          <p className={styles.progressText}>Max Tier Reached! Congratulations!</p>
                      )}
                 </div>

                {/* Tabs - 'All' tab removed */}
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${tab === 'active' ? styles.tabActive : styles.tabInactive}`} onClick={() => setTab('active')}>Active</button>
                    <button className={`${styles.tab} ${tab === 'completed' ? styles.tabActive : styles.tabInactive}`} onClick={() => setTab('completed')}>Ready to Claim</button>
                    <button className={`${styles.tab} ${tab === 'claimed' ? styles.tabActive : styles.tabInactive}`} onClick={() => setTab('claimed')}>Claimed</button>
                </div>

                {/* Challenge Grid */}
                <div className={styles.challenges}>
                    {filteredChallenges.length > 0 ? (
                        filteredChallenges.map(renderChallengeCard)
                    ) : (
                        // Consistent 'no challenges' message using CSS module
                        <p className={styles.noChallengesMessage}>
                            {/* Dynamic text based on the current tab */}
                           No challenges found in the '{tab === 'completed' ? 'Ready to Claim' : toTitleCase(tab)}' category.
                        </p>
                    )}
                </div>

                 {/* Back Button */}
                 <Link href="/dashboard" className={styles.backButton}>
                     Back to Dashboard <i className="fas fa-arrow-right"></i>
                 </Link>
            </section>
            <FooterInternal />
        </>
    );
}