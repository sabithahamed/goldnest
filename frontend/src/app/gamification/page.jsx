// src/app/gamification/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import styles from './gamification.module.css';

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

export default function GamificationPage() {
  const [userData, setUserData] = useState(null);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
        if (!data) {
          throw new Error('Failed to load user data.');
        }
        setUserData(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load data.');
        if (err.response?.status === 401) {
          localStorage.clear();
          router.push('/');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const challengeProgressMap = userData?.challengeProgress || {};
  const challenges = userData?.gamificationDefs?.challenges || [];
  const totalStars = userData?.gamificationDefs?.totalStars || 5;
  const currentTier = userData?.gamificationDefs?.currentTier || 0;
  const totalPoints = userData?.gamificationDefs?.gamificationPoints || 0;

  const tierThresholds = [10, 20, 30, 40, 50];
  const pointsToNextTier = currentTier < totalStars
    ? tierThresholds[currentTier] - totalPoints
    : 0;
  const progressToNextTier = currentTier < totalStars
    ? ((totalPoints - (currentTier > 0 ? tierThresholds[currentTier - 1] : 0)) / (tierThresholds[currentTier] - (currentTier > 0 ? tierThresholds[currentTier - 1] : 0))) * 100
    : 100;

  const filteredChallenges = challenges.filter(challenge => {
    const progress = challengeProgressMap[challenge.id] || 0;
    const isCompleted = progress >= (challenge.goal || 1);
    const isClaimed = challengeProgressMap[`${challenge.id}_claimed`] === true;
    if (tab === 'active') return !isCompleted && !isClaimed;
    if (tab === 'completed') return isCompleted && !isClaimed;
    if (tab === 'claimed') return isClaimed;
    return true;
  });

  const renderChallengeCard = (challenge) => {
    const { id, name, description, rewardText, goal = 1, isClaimed, starsAwarded = 1, type, unit } = challenge;
    const progress = challengeProgressMap[id] || 0;
    const progressPercentage = Math.min((progress / goal) * 100, 100);
    const isCompleted = progress >= goal;
    const status = isClaimed ? 'claimed' : isCompleted ? 'completed' : progress > 0 ? 'in-progress' : 'not-started';

    let iconClass = 'fas fa-trophy';
    if (isCompleted) {
      iconClass = 'fas fa-check-circle';
    } else if (type?.includes('REFER')) {
      iconClass = 'fas fa-users';
    } else if (type?.includes('INVEST') || type?.includes('TRADE')) {
      iconClass = 'fas fa-trophy';
    }

    let progressText = 'Not yet started';
    if (isCompleted) {
      progressText = 'Completed!';
    } else if (progress > 0) {
      const needed = Math.max(0, goal - progress);
      if (challenge.unit === 'LKR') {
        progressText = `${formatCurrency(needed)} more`;
      } else if (challenge.unit === 'g') {
        progressText = `${formatGrams(needed)} more`;
      } else {
        progressText = `${needed.toFixed(0)} more`;
      }
    }

    return (
      <div key={id} className={`${styles.challengeCard} ${styles[status]}`}>
        <div className={styles.challengeHeader}>
          <i className={`${iconClass} ${styles.challengeIcon}`}></i>
          <h4>{toTitleCase(name)} <span className={styles.starEarn}>Earn {starsAwarded} star{starsAwarded !== 1 ? 's' : ''}</span></h4>
          <span className={`${styles.statusBadge} ${styles[status]}`}>
            {status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
        <p className={styles.challengeDescription}>{description}</p>
        <p className={styles.challengeReward}>
          <strong>Reward:</strong> {rewardText}
        </p>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <span className={styles.progressText}>
            {progressText}
          </span>
        </div>
        <div className={styles.challengeAction}>
          {isClaimed ? (
            <button className={`${styles.btnSecondary}`} disabled>
              Reward Claimed
            </button>
          ) : isCompleted ? (
            <Link href={`/claim-reward/${id}`} className={`${styles.btnPrimary}`}>
              Claim Reward
            </Link>
          ) : (
            <button className={`${styles.btnSecondary}`} disabled>
              {progress === 0 ? 'Start Challenge' : 'In Progress'}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return (
    <>
      <NavbarInternal />
      <div className={styles.gamification}>
        <div className={styles.header}>
          <h2>Loading...</h2>
        </div>
      </div>
      <FooterInternal />
    </>
  );

  if (error) return (
    <>
      <NavbarInternal />
      <div className={styles.gamification}>
        <div className={styles.header}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
      <FooterInternal />
    </>
  );

  return (
    <>
      <NavbarInternal />
      <section className={styles.gamification}>
        <div className={styles.header}>
          <h2>Your Achievements</h2>
          <p>Complete challenges to earn rewards and grow your gold portfolio!</p>
        </div>
        <div className={styles.starsSection}>
          <div className={styles.starsHeader}>
            <h3>Your Tier</h3>
            <div className={styles.tooltipContainer}>
              <i className={`fas fa-info-circle ${styles.infoIcon}`}></i>
              <span className={styles.tooltipText}>Earn points to advance through tiers!</span>
            </div>
          </div>
          <div className={styles.stars}>
            {[...Array(totalStars)].map((_, i) => (
              <i
                key={i}
                className={`fas fa-star ${i < currentTier ? styles.star : styles.starEmpty}`}
              ></i>
            ))}
          </div>
          <p className={styles.tierText}>
            Tier {currentTier} - {totalPoints} points earned
          </p>
          {currentTier < totalStars ? (
            <>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressToNextTier}%` }}
                ></div>
              </div>
              <p className={styles.progressText}>
                {pointsToNextTier} points to Tier {currentTier + 1}
              </p>
            </>
          ) : (
            <p className={styles.progressText}>Max Tier Reached!</p>
          )}
        </div>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'all' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setTab('all')}
          >
            All
          </button>
          <button
            className={`${styles.tab} ${tab === 'active' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setTab('active')}
          >
            Active
          </button>
          <button
            className={`${styles.tab} ${tab === 'completed' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setTab('completed')}
          >
            Completed
          </button>
          <button
            className={`${styles.tab} ${tab === 'claimed' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setTab('claimed')}
          >
            Claimed
          </button>
        </div>
        <div className={styles.challenges}>
          {filteredChallenges.length > 0 ? (
            filteredChallenges.map(renderChallengeCard)
          ) : (
            <p className="text-center text-gray-500 py-6">No challenges in this category.</p>
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