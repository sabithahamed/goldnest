// src/app/dashboard/page.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import styles from './Dashboard.module.css';

// --- Skeleton Components ---
const PlaceholderText = ({ width = 'w-full', height = 'h-4', className = '' }) => (
  <div className={`skeleton skeleton-text ${width} ${height} mb-1 ${className}`}></div>
);

const PlaceholderTitle = ({ width = 'w-1/2', height = 'h-6', className = '' }) => (
  <div className={`skeleton skeleton-title ${width} ${height} mb-3 ${className}`}></div>
);

const PlaceholderCard = ({ children }) => (
  <div className={`${styles.card} animate-pulse`}>{children}</div>
);

const GamificationProgressSkeleton = () => (
  <div className={styles.gamification}>
    {[...Array(2)].map((_, i) => (
      <div
        key={i}
        className={`${styles.progressItem} opacity-50 space-x-3 p-3 border-b border-gray-200 last:border-b-0`}
      >
        <div className="skeleton h-8 w-8 rounded-full bg-gray-300 flex-shrink-0"></div>
        <div className="flex-grow space-y-2">
          <PlaceholderText width="w-3/4" height="h-4" />
          <div className="skeleton h-2 w-full rounded bg-gray-300"></div>
          <PlaceholderText width="w-1/2" height="h-3" />
        </div>
        <div className="skeleton h-7 w-20 rounded bg-gray-300"></div>
      </div>
    ))}
    <div className="flex justify-center mt-3">
      <PlaceholderText width="w-1/3" height="h-5" className="mx-auto" />
    </div>
  </div>
);

const RedeemProgressSkeleton = () => (
  <div className={`${styles.redeemCoin} animate-pulse text-center py-4`}>
    <div className="relative w-32 h-32 mx-auto mb-2">
      <div className="skeleton skeleton-circle w-full h-full bg-gray-300"></div>
    </div>
    <PlaceholderText width="w-16" height="h-6" className="mx-auto mb-2" />
    <PlaceholderText width="w-24" height="h-4" className="mx-auto mb-4" />
    <div className={`${styles.redeemOptions} flex justify-center space-x-2`}>
      <div className="skeleton skeleton-button h-8 w-16 bg-gray-300 rounded"></div>
      <div className="skeleton skeleton-button h-8 w-16 bg-gray-300 rounded"></div>
      <div className="skeleton skeleton-button h-8 w-16 bg-gray-300 rounded"></div>
    </div>
  </div>
);

// --- Helper Functions ---
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'Rs. 0.00';
  }
  return `Rs. ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const formatGrams = (value, decimals = 3) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.000g';
  }
  return `${value.toFixed(decimals)}g`;
};

const TROY_OZ_TO_GRAMS = 31.1034768;

export default function DashboardPage() {
  // --- State ---
  const [userData, setUserData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [aiOverview, setAiOverview] = useState('');
  const [aiTrend, setAiTrend] = useState('');
  const [aiForecast, setAiForecast] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // State for alerts
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState('');

  // --- Data Fetching ---
  useEffect(() => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

    const fetchDashboardData = async () => {
      try {
        const [userRes, marketRes, overviewRes, trendRes, forecastRes] = await Promise.all([
          axios.get(`${backendUrl}/api/users/me`, config),
          axios.get(`${backendUrl}/api/market/gold-summary`),
          axios.get(`${backendUrl}/api/ai/dashboard-overview`, config),
          axios.get(`${backendUrl}/api/ai/trend-summary`),
          axios.get(`${backendUrl}/api/ai/monthly-forecast`),
        ]);

        if (!userRes.data || !marketRes.data) {
          throw new Error('Missing essential user or market data.');
        }

        setUserData(userRes.data);
        setMarketData(marketRes.data);
        setAiOverview(
          overviewRes.data?.overview ||
            'A significant improvement from the past month which helped improve your average price.'
        );
        setAiTrend(
          trendRes.data?.summary ||
            'Gold prices are rising. Consider buying now as prices may increase by 3% tomorrow.'
        );
        setAiForecast(forecastRes.data?.forecast || '2.1%');
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard data.');
        if (err.response?.status === 401) {
          localStorage.clear();
          router.push('/');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  // Fetch alerts
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    const config = { headers: { Authorization: `Bearer ${token}` } };
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

    const fetchAlerts = async () => {
      setLoadingAlerts(true);
      setAlertsError('');
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/notifications?limit=3&sort=-createdAt`,
          config
        );
        setAlerts(data.notifications || []);
      } catch (err) {
        console.error('Error fetching alerts:', err.response?.data?.message || err.message);
        setAlertsError('Failed to load alerts.');
      } finally {
        setLoadingAlerts(false);
      }
    };

    fetchAlerts();
  }, []);

  // --- Derived Data ---
  const goldBalanceGrams = userData?.goldBalanceGrams ?? 6.27;
  const currentPricePerGram = marketData?.latestPricePerGram || 21567.5;
  const goldValueLKR = goldBalanceGrams * currentPricePerGram;

  const lastPurchase = useMemo(
    () =>
      (userData?.transactions || [])
        .filter((t) => t.type === 'investment')
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || {
        amountGrams: 0.124,
        amountLKR: 3023.0,
        date: '2025-03-12',
      },
    [userData?.transactions]
  );

  const overallProfit = goldValueLKR * 0.078;
  const avgPurchasePrice = 4532.76;

  // --- Gamification Data ---
  const challengeProgressMap = useMemo(
    () => userData?.challengeProgress || {},
    [userData?.challengeProgress]
  );
  const activeChallenges = useMemo(
    () =>
      userData?.gamificationDefs?.challenges || [
        {
          id: 'invest_5000',
          name: 'Invest a total of Rs 5,000',
          goal: 5000,
          currentProgress: 2279,
          starsAwarded: 1,
          rewardText: 'Bronze Investor Badge',
          ctaText: 'Invest Now',
          ctaLink: '/trade',
          icon: 'fa-trophy',
          unit: 'LKR',
        },
        {
          id: 'invest_1000_week',
          name: 'Invest Rs 1,000 in a week',
          goal: 1000,
          currentProgress: 1000,
          starsAwarded: 1,
          rewardText: '0.1g Bonus Gold',
          rewardType: 'claimable',
          ctaText: 'View Reward',
          ctaLink: '/claim-reward',
          icon: 'fa-check-circle',
          unit: 'LKR',
        },
      ],
    [userData?.gamificationDefs]
  );

  // --- Redemption Progress ---
  const getRedeemProgress = (target) =>
    goldBalanceGrams > 0 && target > 0 ? Math.min(100, (goldBalanceGrams / target) * 100) : 0;
  const progress1g = useMemo(() => getRedeemProgress(1), [goldBalanceGrams]);
  const progress5g = useMemo(() => getRedeemProgress(5), [goldBalanceGrams]);
  const progress10g = useMemo(() => getRedeemProgress(10), [goldBalanceGrams]);
  const neededFor10g = useMemo(() => Math.max(0, 10 - goldBalanceGrams), [goldBalanceGrams]);

  // --- Render Logic ---
  const renderLoadingSkeleton = () => (
    <div className={styles.dashboard}>
      <div className={`${styles.dashboardRow} ${styles.topRow}`}>
        <PlaceholderCard>
          <PlaceholderTitle width="w-1/3" />
          <div className="animate-pulse space-y-4 p-4">
            <div className="flex items-center space-x-4">
              <div className="skeleton skeleton-circle w-12 h-12 bg-gray-300"></div>
              <div className="flex-1 space-y-2">
                <PlaceholderText width="w-1/2" />
                <PlaceholderText width="w-3/4" height="h-5" />
                <PlaceholderText width="w-1/2" />
              </div>
            </div>
            <PlaceholderText width="w-full" height="h-10" />
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
              <PlaceholderText width="w-1/3" />
              <PlaceholderText width="w-1/2" height="h-5" />
              <PlaceholderText width="w-1/3" />
              <PlaceholderText width="w-1/2" height="h-5" />
              <PlaceholderText width="w-1/3" />
              <PlaceholderText width="w-1/2" height="h-5" />
            </div>
            <div className="flex justify-end mt-4">
              <PlaceholderText width="w-1/4" height="h-8" />
            </div>
          </div>
        </PlaceholderCard>
        <PlaceholderCard>
          <PlaceholderTitle width="w-1/3" />
          <div className="animate-pulse space-y-4 p-4">
            <PlaceholderText width="w-1/4" height="h-5" />
            <PlaceholderText width="w-3/4" height="h-8" />
            <div className="space-y-2">
              <PlaceholderText width="w-full" />
              <PlaceholderText width="w-full" />
              <PlaceholderText width="w-full" />
            </div>
            <PlaceholderText width="w-full" height="h-10" />
            <div className="flex justify-end mt-4">
              <PlaceholderText width="w-1/4" height="h-8" />
            </div>
          </div>
        </PlaceholderCard>
      </div>
      <div className={`${styles.dashboardRow} ${styles.middleRow}`}>
        <PlaceholderCard>
          <div className="p-4 flex flex-col items-center sm:flex-row sm:justify-between">
            <div className="flex-grow mb-3 sm:mb-0 sm:mr-4">
              <PlaceholderTitle width="w-3/4" height="h-5" />
              <PlaceholderText width="w-full" height="h-4" />
            </div>
            <PlaceholderText width="w-24" height="h-10" className="rounded" />
          </div>
        </PlaceholderCard>
      </div>
      <div className={`${styles.dashboardRow} ${styles.bottomRow}`}>
        <PlaceholderCard>
          <PlaceholderTitle width="w-1/2" className="ml-4 mt-4" />
          <GamificationProgressSkeleton />
        </PlaceholderCard>
        <PlaceholderCard>
          <PlaceholderTitle width="w-1/3" className="ml-4 mt-4" />
          <div className="p-4 space-y-3">
            <PlaceholderText height="h-5" width="w-full" />
            <PlaceholderText height="h-5" width="w-full" />
            <PlaceholderText height="h-5" width="w-full" />
            <div className="flex justify-end mt-2">
              <PlaceholderText width="w-1/3" height="h-6" />
            </div>
          </div>
        </PlaceholderCard>
        <PlaceholderCard>
          <PlaceholderTitle width="w-1/2" className="ml-4 mt-4" />
          <RedeemProgressSkeleton />
        </PlaceholderCard>
      </div>
    </div>
  );

  // --- Conditional Rendering ---
  if (loading)
    return (
      <>
        <NavbarInternal />
        {renderLoadingSkeleton()}
        <FooterInternal />
      </>
    );
  if (error)
    return (
      <>
        <NavbarInternal />
        <div className="p-10 text-center text-red-500 card mx-auto my-10 max-w-md">
          Error: {error}
        </div>
        <FooterInternal />
      </>
    );
  if (!userData || !marketData)
    return (
      <>
        <NavbarInternal />
        <div className="p-10 text-center text-orange-600 card mx-auto my-10 max-w-md">
          Could not load dashboard data. Please try again later.
        </div>
        <FooterInternal />
      </>
    );

  // --- Main Render ---
  return (
    <>
      <NavbarInternal />
      <section className={styles.dashboard}>
        {/* Top Row */}
        <div className={`${styles.dashboardRow} ${styles.topRow}`}>
          {/* Gold Holdings Card */}
          <div className={styles.card}>
            <h3>Your Gold Holdings</h3>
            <div className={styles.goldHoldings}>
              <div className={styles.goldHoldingsSplit}>
                <div className={styles.totalOwnedSection}>
                  <div className={styles.totalOwned}>
                    <Image src="/gold-icon.png" alt="Gold Icon" width={48} height={48} />
                    <div>
                      <p>Total Owned</p>
                      <h2>{formatGrams(goldBalanceGrams)}</h2>
                      <p className={styles.highlight}>{formatCurrency(goldValueLKR)}</p>
                    </div>
                  </div>
                  <div className={styles.aiInsight}>
                    <span className={styles.aiLabel}>✨ AI Insight</span>
                    <p>{aiOverview}</p>
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <div className={styles.profit}>
                    <p>Overall Profit</p>
                    <h4>
                      {formatCurrency(overallProfit)}{' '}
                      <span className={styles.profitPercentage}>+7.8%</span>
                    </h4>
                  </div>
                  <div className={styles.averagePrice}>
                    <p>Average Purchase Price</p>
                    <h4>{formatCurrency(avgPurchasePrice)} /gram</h4>
                  </div>
                  <div className={styles.lastPurchase}>
                    <p>Your last purchase</p>
                    <h4>
                      {lastPurchase
                        ? `${formatGrams(lastPurchase.amountGrams)} (${formatCurrency(
                            lastPurchase.amountLKR
                          )})`
                        : 'N/A'}
                    </h4>
                    <p className={styles.date}>
                      {lastPurchase ? formatDate(lastPurchase.date) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <Link href="/wallet" className={`${styles.btnSecondary} ${styles.seeMore}`}>
                Go to Wallet <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>

          {/* Live Price Card */}
          <div className={styles.card}>
            <h3>
              Gold Live Price <span className={styles.carat}>24 Carats</span>
            </h3>
            <div className={styles.livePrice}>
              <div className={styles.livePriceSplit}>
                <div className={styles.priceHistorySection}>
                  <div className={styles.priceHeader}>
                    <i className="fas fa-clock"></i>
                    <p>Today</p>
                    <p className={styles.date}>
                      {marketData.latestDate ? formatDate(marketData.latestDate) : '20th March 2025'}
                    </p>
                  </div>
                  <h2 className={styles.currentPrice}>{formatCurrency(currentPricePerGram)} /g</h2>
                  <div className={styles.recentPrices}>
                    {(marketData.previousDaysData?.slice(-3).reverse() || [
                      { date: '2025-03-18', pricePerOz: 24500 * TROY_OZ_TO_GRAMS },
                      { date: '2025-03-19', pricePerOz: 24750 * TROY_OZ_TO_GRAMS },
                      { date: '2025-03-20', pricePerOz: 25000 * TROY_OZ_TO_GRAMS },
                    ]).map((day, idx) => (
                      <div key={idx} className={styles.recentPriceItem}>
                        <p>{formatDate(day.date)}</p>
                        <span>{formatCurrency(day.pricePerOz / TROY_OZ_TO_GRAMS)} /g</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.trendSection}>
                  <div className={styles.trend}>
                    <div className={styles.trendHeader}>
                      <i className="fas fa-chart-line"></i>
                      <p
                        className={`${styles.priceChange} ${
                          marketData.trend === 'up'
                            ? styles.positive
                            : marketData.trend === 'down'
                            ? styles.negative
                            : ''
                        }`}
                      >
                        {marketData.priceChangePercent?.toFixed(1) || 2.4}%
                        <i
                          className={`fas fa-arrow-${
                            marketData.trend === 'up'
                              ? 'up'
                              : marketData.trend === 'down'
                              ? 'down'
                              : 'right'
                          }`}
                        ></i>
                      </p>
                    </div>
                    <div className={styles.trendMetrics}>
                      <div className={styles.trendMetric}>
                        <p>This Week</p>
                        <span className={styles.positive}>+5.2%</span>
                      </div>
                      <div className={styles.trendMetric}>
                        <p>This Month</p>
                        <span className={styles.positive}>+8.1%</span>
                      </div>
                    </div>
                    <div className={styles.prediction}>
                      <p>
                        Predicted Tomorrow: <span>Rs. 25,750.00 /g (+3%)</span>
                      </p>
                    </div>
                    <div className={styles.aiInsight}>
                      <span className={styles.aiLabel}>✨ AI Insight</span>
                      <p>
                        {aiTrend} <Link href="/market" className={styles.aiLink}>Learn More</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Link href="/market" className={`${styles.btnSecondary} ${styles.seeMore}`}>
                See Full History <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>

        {/* Middle Row */}
        <div className={`${styles.dashboardRow} ${styles.middleRow}`}>
          <div className={`${styles.card} ${styles.ctaCard}`}>
            <h3>Buy your gold now with just 2 clicks!</h3>
            <p>
              <span className={styles.aiLabel}>✨</span> Trend shows potential growth according to
              next month: <span className={styles.highlight}>{aiForecast}</span>.
            </p>
            <Link href="/trade" className={styles.btnPrimary}>
              Buy Gold
            </Link>
          </div>
        </div>

        {/* Bottom Row */}
        <div className={`${styles.dashboardRow} ${styles.bottomRow}`}>
          {/* Gamification Card */}
          <div className={styles.card}>
            <h3>Gamification Progress</h3>
            {activeChallenges.length > 0 ? (
              <div className={styles.gamification}>
                {activeChallenges.slice(0, 2).map((challenge) => {
                  const currentProgress =
                    challengeProgressMap[challenge.id] || challenge.currentProgress || 0;
                  const goal = challenge.goal || 1;
                  const progressPercent =
                    goal > 0 ? Math.min(100, (currentProgress / goal) * 100) : currentProgress > 0 ? 100 : 0;
                  const isCompleted = currentProgress >= goal;
                  const isClaimed = challengeProgressMap[`${challenge.id}_claimed`] === true;
                  const canClaim = isCompleted && challenge.rewardType === 'claimable' && !isClaimed;
                  const needed = Math.max(0, goal - currentProgress);
                  const progressText = isCompleted
                    ? 'Completed!'
                    : `${
                        challenge.unit === 'LKR' ? formatCurrency(needed) : needed.toFixed(0)
                      } ${challenge.unit || ''} more`;
                  const iconClass = `fas ${isCompleted ? 'fa-check-circle' : challenge.icon || 'fa-trophy'}`;

                  return (
                    <div
                      key={challenge.id}
                      className={`${styles.progressItem} ${isCompleted ? styles.completed : ''}`}
                      data-status={isCompleted ? 'completed' : 'incomplete'}
                    >
                      <Link href="/gamification" className={styles.progressLink}>
                        <i className={`${iconClass} ${isCompleted ? 'text-green-500' : ''}`}></i>
                        <div className={styles.progressText}>
                          <p>
                            {challenge.name}
                            {challenge.starsAwarded > 0 && (
                              <span className={styles.starEarn}>
                                {' '}
                                Earn {challenge.starsAwarded} ★
                              </span>
                            )}
                          </p>
                          {challenge.rewardText && (
                            <p className={styles.rewardText}>
                              Reward: {challenge.rewardText}
                              {isCompleted && isClaimed && (
                                <span className={styles.badge}>Claimed</span>
                              )}
                            </p>
                          )}
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progress}
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <p>{progressText}</p>
                        </div>
                      </Link>
                      <div className={styles.progressCta}>
                        {canClaim ? (
                          <Link href="/claim-reward" className={styles.ctaBtn}>
                            Claim
                          </Link>
                        ) : isCompleted && !canClaim ? (
                          <span className={styles.badge}>Done</span>
                        ) : (
                          <Link
                            href={challenge.ctaLink || '/trade'}
                            className={styles.ctaBtn}
                          >
                            {challenge.ctaText || 'Go'}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Link
                  href="/gamification"
                  className={`${styles.btnSecondary} ${styles.seeMore}`}
                >
                  Go to Rewards <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6 px-4">
                No active challenges right now. Keep investing!
              </p>
            )}
          </div>

          {/* Alerts Card */}
          <div className={styles.card}>
            <h3>Alerts</h3>
            <div className={styles.alerts}>
              {loadingAlerts ? (
                <p className="text-center text-gray-500 py-4 text-sm">Loading alerts...</p>
              ) : alertsError ? (
                <p className="text-center text-red-500 py-4 text-sm">{alertsError}</p>
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert._id} className={styles.alertItem}>
                    <p>
                      <strong>{alert.title}:</strong> {alert.message}
                    </p>
                    <span>{formatDate(alert.createdAt)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm">No recent alerts.</p>
              )}
              <Link href="/notifications" className={`${styles.btnSecondary} ${styles.seeMore}`}>
                See All Alerts <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>

          {/* Redeem Card */}
          <div className={styles.card}>
            <h3>Redeem Gold Coin</h3>
            <div className={styles.redeemCoin}>
              <div className={styles.progressCircle}>
                <svg className={styles.progressRing} viewBox="0 0 36 36">
                  <circle
                    className={styles.progressRingBackground}
                    cx="18"
                    cy="18"
                    r="16"
                    strokeWidth="4"
                  />
                  <circle
                    className={styles.progressRingFill}
                    cx="18"
                    cy="18"
                    r="16"
                    strokeWidth="4"
                    strokeDasharray="100, 100"
                    strokeDashoffset={100 - progress10g}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <Image
                  src="/gold-icon.png"
                  alt="Gold Coin"
                  width={80}
                  height={80}
                  className={styles.goldIcon}
                />
              </div>
              <p className={styles.progressPercentage}>{progress10g.toFixed(0)}%</p>
              <p className={styles.progressText}>Need {formatGrams(neededFor10g)} more</p>
              <div className={styles.redeemOptions}>
                <Link
                  href={progress1g >= 100 ? '/redeem-confirmation/1g/1' : '#'}
                  className={`${styles.btnSecondary} ${
                    progress1g < 100 ? styles.btnDisabled : styles.btnActive
                  }`}
                  aria-disabled={progress1g < 100}
                  onClick={(e) => {
                    if (progress1g < 100) e.preventDefault();
                  }}
                >
                  1g
                </Link>
                <Link
                  href={progress5g >= 100 ? '/redeem-confirmation/5g/1' : '#'}
                  className={`${styles.btnSecondary} ${
                    progress5g < 100 ? styles.btnDisabled : styles.btnActive
                  }`}
                  aria-disabled={progress5g < 100}
                  onClick={(e) => {
                    if (progress5g < 100) e.preventDefault();
                  }}
                >
                  5g
                </Link>
                <Link
                  href={progress10g >= 100 ? '/redeem-confirmation/10g/1' : '#'}
                  className={`${styles.btnSecondary} ${
                    progress10g < 100 ? styles.btnDisabled : styles.btnActive
                  }`}
                  aria-disabled={progress10g < 100}
                  onClick={(e) => {
                    if (progress10g < 100) e.preventDefault();
                  }}
                >
                  10g
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <FooterInternal />
    </>
  );
}