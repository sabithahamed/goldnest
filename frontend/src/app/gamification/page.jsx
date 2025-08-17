// src/app/gamification/page.jsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import styles from './gamification.module.css';

// --- Helper Functions ---
const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const toTitleCase = (str) => str?.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) || '';

export default function GamificationPage() {
    const [userData, setUserData] = useState(null);
    const [tab, setTab] = useState('active');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [claimingId, setClaimingId] = useState(null); // To show spinner on a specific button
    const router = useRouter();

    const fetchUserData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError('');
        const token = localStorage.getItem('userToken');
        if (!token) { router.push('/'); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        try {
            const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
            setUserData(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load data.');
            if (err.response?.status === 401) { localStorage.clear(); router.push('/'); }
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchUserData(true);
    }, [fetchUserData]);

    useEffect(() => {
        const handleFocus = () => fetchUserData(false);
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchUserData]);
    
    const challengeProgress = useMemo(() => userData?.challengeProgress || {}, [userData]);
    const completedIds = useMemo(() => new Set(userData?.completedChallengeIds || []), [userData]);
    const allChallenges = useMemo(() => userData?.gamificationDefs?.challenges || [], [userData]);
    
    const filteredChallenges = useMemo(() => {
        return allChallenges.filter(challenge => {
            if (!challenge?._id) return false;
            const id = challenge._id;
            const isCompleted = completedIds.has(id);
            const isClaimed = challengeProgress[`${id}_claimed`] === true;

            switch (tab) {
                case 'active': return !isCompleted;
                case 'completed': return isCompleted && !isClaimed;
                case 'claimed': return isClaimed;
                default: return false;
            }
        });
    }, [tab, allChallenges, completedIds, challengeProgress]);

    const handleClaim = async (challengeId) => {
        setClaimingId(challengeId); // Show spinner on the specific button
        try {
            const token = localStorage.getItem('userToken');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            await axios.post(`${backendUrl}/api/gamification/claim/${challengeId}`, {}, config);
            await fetchUserData(false); // Refetch all data to get the latest state
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to claim reward.');
        } finally {
            setClaimingId(null); // Hide spinner
        }
    };
    
    // --- Star/Tier Calculation ---
    const totalStars = userData?.starCount ?? 0;
    const tierThresholds = [10, 20, 30, 40, 50]; 
    const maxTierLevel = tierThresholds.length;
    let currentTierLevel = 0;
    for (let i = 0; i < tierThresholds.length; i++) {
        if (totalStars >= tierThresholds[i]) {
            currentTierLevel = i + 1;
        } else {
            break;
        }
    }
    const starsForCurrentTierStart = currentTierLevel > 0 ? tierThresholds[currentTierLevel - 1] : 0;
    const starsForNextTier = currentTierLevel < maxTierLevel ? tierThresholds[currentTierLevel] : totalStars;
    const starsNeededForNextTier = currentTierLevel < maxTierLevel ? Math.max(0, starsForNextTier - totalStars) : 0;
    const starsInCurrentTierRange = starsForNextTier - starsForCurrentTierStart;
    const progressToNextTier = (currentTierLevel < maxTierLevel && starsInCurrentTierRange > 0)
        ? Math.max(0, Math.min(100, ((totalStars - starsForCurrentTierStart) / starsInCurrentTierRange) * 100))
        : (currentTierLevel >= maxTierLevel ? 100 : 0);

    if (loading) return (
        <>
            <NavbarInternal />
            <div className={styles.gamification}><div className={styles.header}><h2>Loading Your Achievements...</h2></div></div>
            <FooterInternal />
        </>
    );
    if (error) return (
        <>
            <NavbarInternal />
            <div className={styles.gamification}><div className={styles.header}><h2>Error Loading Achievements</h2><p className={styles.errorMessage}>{error}</p></div></div>
            <FooterInternal />
        </>
    );
    if (!userData) return (
        <>
            <NavbarInternal />
            <div className={styles.gamification}><div className={styles.header}><h2>Achievements</h2><p>Could not load user data.</p></div></div>
            <FooterInternal />
        </>
    );
    
    return (
        <>
            <NavbarInternal />
            <section className={styles.gamification}>
                <div className={styles.header}>
                     <h2>Your Achievements</h2>
                     <p>Complete challenges, earn stars, claim rewards, and climb the tiers!</p>
                </div>

                <div className={styles.starsSection}>
                    <div className={styles.starsHeader}>
                        <h3>Your Star Tier</h3>
                        <div className={styles.tooltipContainer}>
                            <i className={`fas fa-info-circle ${styles.infoIcon}`}></i>
                            <span className={styles.tooltipText}>Earn stars by completing challenges to advance through tiers! More stars unlock better benefits.</span>
                        </div>
                    </div>
                    <div className={styles.stars}>
                        {[...Array(maxTierLevel)].map((_, i) => (
                            <i key={i} className={`fas fa-star ${i < currentTierLevel ? styles.star : styles.starEmpty}`}></i>
                        ))}
                    </div>
                    <p className={styles.tierText}>
                        Tier {currentTierLevel} - {totalStars} star{totalStars !== 1 ? 's' : ''} earned
                    </p>
                    {currentTierLevel < maxTierLevel ? (
                        <>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${progressToNextTier}%` }}></div>
                            </div>
                            <p className={styles.progressText}>
                                {starsNeededForNextTier} star{starsNeededForNextTier !== 1 ? 's' : ''} to Tier {currentTierLevel + 1}
                                {' '}({tierThresholds[currentTierLevel]} total stars required)
                            </p>
                        </>
                    ) : (
                        <p className={styles.progressText}>Max Tier Reached! Congratulations!</p>
                    )}
                </div>

                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`} onClick={() => setTab('active')}>Active</button>
                    <button className={`${styles.tab} ${tab === 'completed' ? styles.tabActive : ''}`} onClick={() => setTab('completed')}>Ready to Claim</button>
                    <button className={`${styles.tab} ${tab === 'claimed' ? styles.tabActive : ''}`} onClick={() => setTab('claimed')}>Claimed</button>
                </div>

                <div className={styles.challenges}>
                    {filteredChallenges.length > 0 ? (
                        filteredChallenges.map(challenge => {
                            const id = challenge._id;
                            const progress = challengeProgress[id] || 0;
                            const isCompleted = completedIds.has(id);
                            const isClaimed = challengeProgress[`${id}_claimed`] === true;
                            const progressPercent = challenge.goal > 0 ? Math.min(100, (progress / challenge.goal) * 100) : 0;
                            
                            return (
                                <div key={id} className={`${styles.challengeCard} ${isClaimed ? styles.claimed : isCompleted ? styles.completed : ''}`}>
                                    <div className={styles.challengeHeader}>
                                        <i className={`fas ${isClaimed ? 'fa-check-double' : isCompleted ? 'fa-check-circle' : 'fa-trophy'} ${styles.challengeIcon}`}></i>
                                        <div className={styles.challengeTitleContainer}>
                                            <h4>{toTitleCase(challenge.name)}</h4>
                                            {challenge.rewardValue > 0 && <span className={styles.starEarn}>Earn {challenge.rewardValue} star{challenge.rewardValue > 1 ? 's' : ''}</span>}
                                        </div>
                                    </div>
                                    <p className={styles.challengeDescription}>{challenge.description}</p>
                                    <p className={styles.challengeReward}><strong>Reward:</strong> {challenge.rewardText}</p>
                                    
                                    {!isCompleted && !isClaimed && (
                                        <div className={styles.progressContainer}>
                                            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div></div>
                                            <span className={styles.progressText}>{formatCurrency(challenge.goal - progress)} more to go</span>
                                        </div>
                                    )}

                                    <div className={styles.challengeAction}>
                                        {isCompleted && !isClaimed ? (
                                            <button id={`claim-btn-${id}`} onClick={() => handleClaim(id)} className={styles.btnPrimary} disabled={claimingId === id}>
                                                {claimingId === id ? <><i className="fas fa-spinner fa-spin"></i> Claiming...</> : 'Claim Reward'}
                                            </button>
                                        ) : isClaimed ? (
                                            <button className={styles.btnSecondary} disabled>Reward Claimed</button>
                                        ) : (
                                            <Link href="/trade" className={styles.btnSecondary}>Invest Now</Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className={styles.noChallengesMessage}>
                           No challenges found in the '{tab === 'completed' ? 'Ready to Claim' : toTitleCase(tab)}' category.
                        </p>
                    )}
                </div>
                 <Link href="/dashboard" className={styles.backButton}>
                     Back to Dashboard <i className="fas fa-arrow-right"></i>
                 </Link>
            </section>
            <FooterInternal />
        </>
    );
}