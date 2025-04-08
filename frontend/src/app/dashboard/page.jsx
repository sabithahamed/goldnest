// src/app/dashboard/page.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal'; // Use the shared internal navbar
import FooterInternal from '@/components/FooterInternal'; // Use the shared internal footer
import Image from 'next/image'; // For icons if needed
import styles from './Dashboard.module.css'; // Import CSS Module

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

// Specific skeleton for Gamification List
const GamificationProgressSkeleton = () => (
    <div className={styles.gamification}>
        {[...Array(2)].map((_, i) => ( // Show 2 placeholder items
            <div key={i} className={`${styles.progressItem} opacity-50 space-x-3 p-3 border-b border-gray-200 last:border-b-0`}>
                 <div className="skeleton h-8 w-8 rounded-full bg-gray-300 flex-shrink-0"></div> {/* Icon */}
                 <div className="flex-grow space-y-2">
                    <PlaceholderText width="w-3/4" height="h-4"/> {/* Name */}
                    <div className="skeleton h-2 w-full rounded bg-gray-300"></div> {/* Progress Bar */}
                    <PlaceholderText width="w-1/2" height="h-3"/> {/* Status */}
                 </div>
                 <div className="skeleton h-7 w-20 rounded bg-gray-300"></div> {/* CTA Button */}
            </div>
        ))}
        <div className="flex justify-center mt-3">
            <PlaceholderText width="w-1/3" height="h-5" className="mx-auto"/> {/* See More Link */}
        </div>
    </div>
);

// Skeleton for redeem card
const RedeemProgressSkeleton = () => (
     <div className={`${styles.redeemCoin} animate-pulse text-center py-4`}>
        <div className="skeleton skeleton-circle w-32 h-32 mx-auto mb-4 bg-gray-300"></div> {/* Use class from globals.css if defined, else basic skeleton */}
        <PlaceholderText width="w-1/2" height="h-5" className="mx-auto mb-2"/>
        <PlaceholderText width="w-3/4" height="h-4" className="mx-auto mb-4"/>
         <div className={`${styles.redeemOptions} mt-3 flex justify-center space-x-2`}>
            <div className="skeleton skeleton-button h-8 w-12 bg-gray-300 rounded"></div>
            <div className="skeleton skeleton-button h-8 w-12 bg-gray-300 rounded"></div>
            <div className="skeleton skeleton-button h-8 w-12 bg-gray-300 rounded"></div>
         </div>
     </div>
);
// --- End Skeletons ---


// --- Helper Functions ---
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return 'LKR 0.00'; // Or some other placeholder
    }
    return `LKR ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
     if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
             console.error("Invalid Date object created for:", dateString);
             return 'Invalid Date';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
};

// Helper to format grams consistently
const formatGrams = (value, decimals = 3) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0.000g';
    }
    return `${value.toFixed(decimals)}g`;
};


const TROY_OZ_TO_GRAMS = 31.1034768;
// --- End Helpers ---


export default function DashboardPage() {
    // --- State ---
    const [userData, setUserData] = useState(null);
    const [marketData, setMarketData] = useState(null);
    const [aiOverview, setAiOverview] = useState('');
    const [aiTrend, setAiTrend] = useState('');
    const [aiForecast, setAiForecast] = useState(''); // For CTA card
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    // --- Data Fetching ---
    useEffect(() => {
        setLoading(true); setError('');
        const token = localStorage.getItem('userToken');
        if (!token) { router.push('/'); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        const fetchDashboardData = async () => {
            try {
                // Ensure /users/me returns full profile including gamification
                const [userRes, marketRes, overviewRes, trendRes, forecastRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/users/me`, config),
                    axios.get(`${backendUrl}/api/market/gold-summary`),
                    axios.get(`${backendUrl}/api/ai/dashboard-overview`, config),
                    axios.get(`${backendUrl}/api/ai/trend-summary`),
                    axios.get(`${backendUrl}/api/ai/monthly-forecast`)
                ]);

                 if (!userRes.data || !marketRes.data) {
                    throw new Error("Missing essential user or market data.");
                 }

                setUserData(userRes.data);
                setMarketData(marketRes.data);
                setAiOverview(overviewRes.data?.overview || 'AI overview unavailable.');
                setAiTrend(trendRes.data?.summary || 'AI trend summary unavailable.');
                setAiForecast(forecastRes.data?.forecast || 'N/A'); // Forecast %

            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError(err.response?.data?.message || err.message || "Failed to load dashboard data.");
                if (err.response?.status === 401) { localStorage.clear(); router.push('/'); }
            } finally { setLoading(false); }
        };

        fetchDashboardData();
    }, [router]);

    // --- Derived Data ---
    const goldBalanceGrams = userData?.goldBalanceGrams ?? 0;
    const cashBalanceLKR = userData?.cashBalanceLKR ?? 0; // Keep if needed elsewhere
    const currentPricePerGram = marketData?.latestPricePerGram || 0;
    const goldValueLKR = goldBalanceGrams * currentPricePerGram;

    const lastPurchase = useMemo(() => (userData?.transactions || [])
        .filter(t => t.type === 'investment')
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0],
        [userData?.transactions]
    );

    // TODO: Replace placeholder profit calculation with actual logic based on transactions
    const overallProfit = goldValueLKR * 0.078; // Placeholder 7.8% profit
    const avgPurchasePrice = currentPricePerGram > 0 ? currentPricePerGram / 1.078 : 0; // Placeholder based on current price/profit

    // --- Gamification Data ---
    const challengeProgressMap = useMemo(() => userData?.challengeProgress || {}, [userData?.challengeProgress]);
    const activeChallenges = useMemo(() => userData?.gamificationDefs?.challenges || [], [userData?.gamificationDefs]);
    const earnedBadgeIds = useMemo(() => userData?.earnedBadgeIds || [], [userData?.earnedBadgeIds]); // If needed for display
    const starCount = userData?.starCount ?? 0; // If needed

    // --- Redemption Progress ---
    const getRedeemProgress = (target) => goldBalanceGrams > 0 && target > 0 ? Math.min(100, (goldBalanceGrams / target) * 100) : 0;
    const progress1g = useMemo(() => getRedeemProgress(1), [goldBalanceGrams]);
    const progress5g = useMemo(() => getRedeemProgress(5), [goldBalanceGrams]);
    const progress10g = useMemo(() => getRedeemProgress(10), [goldBalanceGrams]);
    const neededFor10g = useMemo(() => Math.max(0, 10 - goldBalanceGrams), [goldBalanceGrams]);


    // --- Render Logic ---
    const renderLoadingSkeleton = () => (
        <div className={styles.dashboard}>
            {/* Top Row Skeletons */}
            <div className={`${styles.dashboardRow} ${styles.topRow}`}>
                <PlaceholderCard>
                    <PlaceholderTitle width="w-1/3" />
                     <div className="animate-pulse space-y-4 p-4"> {/* Added padding */}
                        <div className="flex items-center space-x-4">
                            <div className="skeleton skeleton-circle w-12 h-12 bg-gray-300"></div>
                            <div className="flex-1 space-y-2">
                                <PlaceholderText width="w-1/2" />
                                <PlaceholderText width="w-3/4" height="h-5" />
                                <PlaceholderText width="w-1/2" />
                            </div>
                        </div>
                        <PlaceholderText width="w-full" height="h-10" /> {/* AI Insight */}
                        <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                            <PlaceholderText width="w-1/3"/>
                            <PlaceholderText width="w-1/2" height="h-5"/>
                            <PlaceholderText width="w-1/3"/>
                            <PlaceholderText width="w-1/2" height="h-5"/>
                            <PlaceholderText width="w-1/3"/>
                            <PlaceholderText width="w-1/2" height="h-5"/>
                        </div>
                        <div className="flex justify-end mt-4">
                            <PlaceholderText width="w-1/4" height="h-8" /> {/* Button Placeholder */}
                        </div>
                    </div>
                 </PlaceholderCard>
                 <PlaceholderCard>
                    <PlaceholderTitle width="w-1/3" />
                    <div className="animate-pulse space-y-4 p-4"> {/* Added padding */}
                         <PlaceholderText width="w-1/4" height="h-5"/>
                         <PlaceholderText width="w-3/4" height="h-8" />
                         <div className="space-y-2">
                            <PlaceholderText width="w-full"/>
                            <PlaceholderText width="w-full"/>
                            <PlaceholderText width="w-full"/>
                         </div>
                         <PlaceholderText width="w-full" height="h-10" /> {/* AI Insight */}
                         <div className="flex justify-end mt-4">
                             <PlaceholderText width="w-1/4" height="h-8" /> {/* Button Placeholder */}
                         </div>
                    </div>
                 </PlaceholderCard>
            </div>
             {/* Middle Row Skeleton */}
            <div className={`${styles.dashboardRow} ${styles.middleRow}`}>
                 <PlaceholderCard>
                     <div className="p-4 flex flex-col items-center sm:flex-row sm:justify-between">
                        <div className='flex-grow mb-3 sm:mb-0 sm:mr-4'>
                            <PlaceholderTitle width="w-3/4" height="h-5"/>
                            <PlaceholderText width="w-full" height="h-4"/>
                        </div>
                         <PlaceholderText width="w-24" height="h-10" className='rounded' /> {/* Button Placeholder */}
                     </div>
                 </PlaceholderCard>
            </div>
             {/* Bottom Row Skeletons */}
            <div className={`${styles.dashboardRow} ${styles.bottomRow}`}>
                 <PlaceholderCard>
                    <PlaceholderTitle width="w-1/2" className="ml-4 mt-4"/>
                    <GamificationProgressSkeleton />
                 </PlaceholderCard>
                 <PlaceholderCard>
                    <PlaceholderTitle width="w-1/3" className="ml-4 mt-4"/>
                    <div className="p-4 space-y-3">
                        <PlaceholderText height="h-5" width="w-full"/>
                        <PlaceholderText height="h-5" width="w-full"/>
                         <div className="flex justify-end mt-2">
                             <PlaceholderText width="w-1/3" height="h-6" /> {/* Button Placeholder */}
                         </div>
                    </div>
                 </PlaceholderCard>
                 <PlaceholderCard>
                     <PlaceholderTitle width="w-1/2" className="ml-4 mt-4"/>
                    <RedeemProgressSkeleton />
                 </PlaceholderCard>
            </div>
        </div>
    );

    // --- Conditional Rendering ---
    if (loading) return <><NavbarInternal />{renderLoadingSkeleton()}<FooterInternal /></>;
    if (error) return <><NavbarInternal /><div className="p-10 text-center text-red-500 card mx-auto my-10 max-w-md">Error: {error}</div><FooterInternal /></>;
    // Added extra check for critical data after loading is false
    if (!userData || !marketData) return <><NavbarInternal /><div className="p-10 text-center text-orange-600 card mx-auto my-10 max-w-md">Could not load dashboard data. Please try again later.</div><FooterInternal /></>;


    // --- Main Render ---
    return (
        <>
            <NavbarInternal />

            <section className={styles.dashboard}>
                {/* --- Top Row (Existing Structure) --- */}
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
                                            {/* Use formatGrams helper */}
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
                                        <p>Overall Profit (Est.)</p>
                                        {/* Keep placeholder or replace */}
                                        <h4>{formatCurrency(overallProfit)} <span className={styles.profitPercentage}>+7.8%</span></h4>
                                    </div>
                                    <div className={styles.averagePrice}>
                                        <p>Average Purchase Price (Est.)</p>
                                        <h4>{formatCurrency(avgPurchasePrice)} /gram</h4>
                                    </div>
                                    <div className={styles.lastPurchase}>
                                        <p>Your last purchase</p>
                                        {/* Use formatGrams helper */}
                                        <h4>{lastPurchase ? `${formatGrams(lastPurchase.amountGrams)} (${formatCurrency(lastPurchase.amountLKR)})` : 'N/A'}</h4>
                                        <p className={styles.date}>{lastPurchase ? formatDate(lastPurchase.date) : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <Link href="/wallet" className={`${styles.btnSecondary} ${styles.seeMore}`}>Go to Wallet <i className="fas fa-arrow-right"></i></Link>
                        </div>
                    </div>

                    {/* Live Price Card */}
                    <div className={styles.card}>
                        <h3>Gold Live Price <span className={styles.carat}>24 Carats</span></h3>
                        <div className={styles.livePrice}>
                             <div className={styles.livePriceSplit}>
                                <div className={styles.priceHistorySection}>
                                    <div className={styles.priceHeader}>
                                        <i className="fas fa-clock"></i>
                                        <p>Today</p>
                                        <p className={styles.date}>{marketData.latestDate ? formatDate(marketData.latestDate) : 'N/A'}</p>
                                    </div>
                                    <h2 className={styles.currentPrice} id="current-price">{formatCurrency(currentPricePerGram)} /g</h2>
                                     <div className={styles.recentPrices}>
                                         {marketData.previousDaysData?.slice(-3).reverse().map((day, idx) => (
                                             <div key={idx} className={styles.recentPriceItem}>
                                                 {/* Consistent date formatting */}
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
                                            <p className={`${styles.priceChange} ${marketData.trend === 'up' ? styles.positive : marketData.trend === 'down' ? styles.negative : ''}`} id="price-change">
                                                {marketData.priceChangePercent?.toFixed(1)}%
                                                 <i className={`fas fa-arrow-${marketData.trend === 'up' ? 'up' : marketData.trend === 'down' ? 'down' : 'right'}`}></i>
                                            </p>
                                        </div>
                                         <div className={`${styles.aiInsight} mt-auto`}>
                                            <span className={styles.aiLabel}>✨ AI Insight</span>
                                            {/* Link wrapped around "Learn More" for better semantics */}
                                            <p>{aiTrend} <Link href="/market" className="text-xs text-blue-600 hover:underline">Learn More</Link></p>
                                         </div>
                                     </div>
                                </div>
                            </div>
                            <Link href="/market" className={`${styles.btnSecondary} ${styles.seeMore}`}>See Full History <i className="fas fa-arrow-right"></i></Link>
                        </div>
                    </div>
                </div>

                {/* --- Middle Row (CTA - Existing Structure) --- */}
                <div className={`${styles.dashboardRow} ${styles.middleRow}`}>
                    <div className={`${styles.card} ${styles.ctaCard}`}>
                        <h3>Buy your gold now with just 2 clicks!</h3>
                        <p><span className={styles.aiLabel}>✨</span> Trend shows potential growth according to next month: <span className={styles.highlight}>{aiForecast}</span>.</p>
                        <Link href="/trade" className={styles.btnPrimary}>Buy Gold</Link>
                    </div>
                </div>

                {/* --- Bottom Row (UPDATED GAMIFICATION & REDEEM) --- */}
                <div className={`${styles.dashboardRow} ${styles.bottomRow}`}>

                    {/* Gamification Card (Dynamic) */}
                    <div className={styles.card}>
                        <h3>Gamification Progress</h3>
                         {/* No need for loading check here as it's handled globally */}
                         {activeChallenges.length > 0 ? (
                            <div className={styles.gamification}>
                                {/* Show first 2 challenges for dashboard brevity */}
                                {activeChallenges.slice(0, 2).map(challenge => {
                                    const currentProgress = challengeProgressMap[challenge.id] || 0;
                                    const goal = challenge.goal || 1; // Avoid division by zero
                                    const progressPercent = goal > 0 ? Math.min(100, (currentProgress / goal) * 100) : (currentProgress > 0 ? 100 : 0);
                                    const isCompleted = currentProgress >= goal;
                                    // Assume claimed status is stored like this, adjust if needed
                                    const isClaimed = challengeProgressMap[`${challenge.id}_claimed`] === true;
                                    // Example claim logic: reward must be 'claimable', completed, and not yet claimed
                                    const canClaim = isCompleted && challenge.rewardType === 'claimable' && !isClaimed;
                                    const needed = Math.max(0, goal - currentProgress);
                                    let progressText = isCompleted
                                        ? 'Completed!'
                                        : `${challenge.unit === 'LKR' ? formatCurrency(needed) : needed.toFixed(0)} ${challenge.unit || ''} more`;
                                    let iconClass = `fas ${isCompleted ? 'fa-check-circle text-green-500' : challenge.icon || 'fa-tasks'}`; // Add completion color

                                    return (
                                         <div key={challenge.id} className={`${styles.progressItem} ${isCompleted ? styles.completed : ''} p-3 border-b border-gray-100 last:border-b-0 flex items-center space-x-3`} data-status={isCompleted ? 'completed' : 'incomplete'}>
                                             <i className={`${iconClass} text-xl w-8 text-center flex-shrink-0`}></i>
                                             {/* Link wrapping the text content */}
                                             <Link href="/wallet#gamification" className={`${styles.progressLink} flex-grow`}>
                                                 <div className={styles.progressText}>
                                                     <p className='font-medium text-sm'>{challenge.name}
                                                        {challenge.starsAwarded > 0 && <span className={styles.starEarn}> Earn {challenge.starsAwarded} ★</span>}
                                                     </p>
                                                     {challenge.rewardText && <p className={`${styles.rewardText} text-xs text-gray-600`}>Reward: {challenge.rewardText}</p>}
                                                     <div className={`${styles.progressBar} mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
                                                         <div className={`${styles.progress} h-full bg-yellow-400 rounded-full`} style={{ width: `${progressPercent}%` }}></div>
                                                     </div>
                                                     <p className="text-xs text-gray-500 mt-1">{progressText}</p>
                                                 </div>
                                             </Link>
                                              {/* CTA Button Area */}
                                              <div className={`${styles.progressCta} flex-shrink-0 ml-auto`}>
                                                 {canClaim ? (
                                                      // TODO: Implement actual claim functionality/link
                                                      <Link href="/claim-reward" className={`btn btn-primary btn-xs ${styles.ctaBtn}`}>Claim</Link>
                                                 ) : isCompleted && !canClaim ? (
                                                      <span className={`${styles.badge} completed-badge text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full`}>Done</span>
                                                 ) : (
                                                     <Link href={challenge.ctaLink || "/trade"} className={`btn btn-secondary btn-xs ${styles.ctaBtn}`}>
                                                         {challenge.ctaText || 'Go'}
                                                     </Link>
                                                 )}
                                             </div>
                                         </div>
                                     );
                                })}
                                 <Link href="/wallet#gamification" className={`btn btn-secondary ${styles.seeMore} block text-center mt-3`}>Go to Rewards <i className="fas fa-arrow-right ml-1"></i></Link>
                            </div>
                         ) : (
                              <p className="text-center text-gray-500 py-6 px-4">No active challenges right now. Keep investing!</p>
                         )}
                    </div>

                    {/* Alerts Card (Kept Placeholder - Implement dynamically if needed) */}
                    <div className={styles.card}>
                        <h3>Alerts</h3>
                        <div className={styles.alerts}>
                            {/* Placeholder/Simulated Alerts */}
                            <div className={styles.alertItem}>
                                <p><strong>Price Alert:</strong> Gold price reached your target!</p>
                                <span className="text-xs text-gray-500">2 hours ago</span>
                            </div>
                            <div className={styles.alertItem}>
                                <p><strong>Redemption Shipped:</strong> Your 5g Coin is on its way.</p>
                                 <span className="text-xs text-gray-500">1 day ago</span>
                            </div>
                             {/* Add more dynamic alerts here */}
                            <Link href="/notifications" className={`${styles.btnSecondary} ${styles.seeMore} block text-center mt-3`}>See All Alerts <i className="fas fa-arrow-right ml-1"></i></Link>
                        </div>
                    </div>

                    {/* Redeem Card (Dynamic Progress) */}
                    <div className={styles.card}>
                        <h3>Redeem Gold Coin</h3>
                         {/* No loading check needed here */}
                         <div className={styles.redeemCoin}>
                            {/* SVG progress circle for 10g */}
                            <div className="relative w-32 h-32 mx-auto mb-3">
                                <svg className="w-full h-full" viewBox="0 0 36 36" transform="rotate(-90)">
                                    <path className="text-gray-200" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path className="text-yellow-400 transition-all duration-500 ease-out" // Added transition
                                        strokeWidth="3"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeLinecap="round" // Rounded cap
                                        strokeDasharray={`${progress10g}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-700">{progress10g.toFixed(0)}%</span>
                                </div>
                             </div>
                            <p className="text-center font-medium text-sm">Progress towards 10g Coin</p>
                            <p className={`${styles.progressText} text-center text-xs text-gray-600 mb-4`}>Need {formatGrams(neededFor10g)} more</p>
                            {/* Redeem Options with dynamic disabling */}
                            <div className={`${styles.redeemOptions} flex justify-center space-x-2`}>
                                 {/* 1g Button/Link */}
                                 <Link
                                     href={progress1g >= 100 ? "/redeem-confirmation/1g/1" : "#"}
                                     className={`btn btn-sm ${progress1g >= 100 ? 'btn-primary' : 'btn-secondary btn-disabled'}`}
                                     aria-disabled={progress1g < 100}
                                     onClick={(e) => { if (progress1g < 100) e.preventDefault(); }}
                                 >1g</Link>
                                 {/* 5g Button/Link */}
                                  <Link
                                     href={progress5g >= 100 ? "/redeem-confirmation/5g/1" : "#"}
                                     className={`btn btn-sm ${progress5g >= 100 ? 'btn-primary' : 'btn-secondary btn-disabled'}`}
                                     aria-disabled={progress5g < 100}
                                     onClick={(e) => { if (progress5g < 100) e.preventDefault(); }}
                                 >5g</Link>
                                 {/* 10g Button/Link */}
                                  <Link
                                     href={progress10g >= 100 ? "/redeem-confirmation/10g/1" : "#"}
                                     className={`btn btn-sm ${progress10g >= 100 ? 'btn-primary' : 'btn-secondary btn-disabled'}`}
                                     aria-disabled={progress10g < 100}
                                     onClick={(e) => { if (progress10g < 100) e.preventDefault(); }}
                                 >10g</Link>
                                 {/* Add global CSS for .btn-disabled { opacity: 0.6; cursor: not-allowed; } */}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <FooterInternal />
        </>
    );
}