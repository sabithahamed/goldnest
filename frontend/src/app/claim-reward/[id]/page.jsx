// src/app/claim-reward/[id]/page.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';

// --- Helper Functions (Keep if used elsewhere, otherwise optional for this component) ---
const formatCurrency = (value, showCurrencySymbol = true) => {
    if (value === null || value === undefined || isNaN(value)) {
        return showCurrencySymbol ? 'Rs. 0.00' : '0.00';
    }
    const options = {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    };
    if (!showCurrencySymbol) {
        options.currencyDisplay = 'code';
    }
    let formatted = new Intl.NumberFormat('en-LK', options).format(value);
    if (!showCurrencySymbol) {
        formatted = formatted.replace('LKR', '').trim();
    } else {
        formatted = formatted.replace('LKR', 'Rs.');
    }
    return formatted;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        };
        return new Date(dateString).toLocaleString('en-US', options);
    } catch (e) {
        console.error('Error formatting date:', dateString, e);
        return 'Invalid Date';
    }
};

const formatGrams = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0g';
    }
    // Use toFixed(3) for potentially smaller rewards like 0.1g
    const fixedValue = Number(value).toFixed(3);
    // Remove trailing zeros after the decimal point if they are beyond the first decimal place
    const formattedValue = parseFloat(fixedValue).toString();
    return `${formattedValue}g`;
};
// --- End Helper Functions ---

export default function ClaimRewardPage() {
    // State
    const [userData, setUserData] = useState(null); // Store full user data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // General error state (used for fetch and claim errors now)
    // Removed claimError state as we are using the general `error` state now
    const [submitLoading, setSubmitLoading] = useState(false); // Loading state for the claim button
    const router = useRouter();
    const { id: challengeId } = useParams(); // Get challengeId from URL

    // --- Fetch User Data (contains challenge definitions and progress) ---
    useEffect(() => {
        setLoading(true);
        setError(''); // Clear errors on load
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const token = localStorage.getItem('userToken');

        const fetchUserData = async () => {
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                router.push('/'); // Redirect to login if no token
                return;
            }
            if (!challengeId) {
                 setError('Challenge ID not found in URL.');
                 setLoading(false);
                 return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                // Fetch USER data (includes gamification definitions and progress)
                const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
                if (!data) {
                    throw new Error("Failed to load user data.");
                }
                setUserData(data);

            } catch (err) {
                console.error('Error fetching user data for claim page:', err);
                const message = err.response?.data?.message || 'Failed to load necessary data.';
                setError(message); // Set general fetch error
                if (err.response?.status === 401 || err.response?.status === 403) {
                    localStorage.clear(); // Clear token on auth error
                    router.push('/'); // Redirect to login
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challengeId, router]); // Depend on challengeId and router

    // --- Find the specific challenge definition ---
    const challenge = useMemo(() => {
        if (!userData || !challengeId) return null;
        // Ensure gamificationDefs and challenges exist
        return userData.gamificationDefs?.challenges?.find(c => c.id === challengeId);
    }, [userData, challengeId]); // Depends on userData and challengeId

    // --- Check if the challenge reward has been claimed (uses UPDATED userData) ---
    const isClaimed = useMemo(() => {
        if (!userData || !challengeId) return false;
        // Directly check the *current* userData state's progress map
        const progress = userData.challengeProgress || {};
        if (progress instanceof Map) {
             return progress.get(`${challengeId}_claimed`) === true;
        }
        // Check for object property
        return progress[`${challengeId}_claimed`] === true;
    }, [userData, challengeId]); // Depend on the userData state itself

    // --- Check if the challenge has been completed ---
    const isCompleted = useMemo(() => {
         if (!userData || !challengeId || !userData.completedChallengeIds) return false;
         // Check if the challenge ID exists in the completed challenges array
         return userData.completedChallengeIds.includes(challengeId);
     }, [userData, challengeId]); // Depends on userData and challengeId


    // --- Claim Reward Action ---
    const handleClaim = async () => {
        setError(''); // Clear previous errors before attempting claim
        setSubmitLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const token = localStorage.getItem('userToken');
        if (!token) {
            setError('Authentication error. Please log in again.');
            setSubmitLoading(false);
            router.push('/');
            return; // Added return
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };

        if (!challengeId) {
            setError("Cannot claim: Challenge ID is missing.");
            setSubmitLoading(false);
            return;
        }

        try {
            const { data } = await axios.post(`${backendUrl}/api/gamification/claim/${challengeId}`, {}, config);

            // --- IMMEDIATE STATE UPDATE (Keep this) ---
            setUserData(prev => {
                 if (!prev) return null; // Should not happen if button was enabled, but safe check

                 // Create a copy based on whether it's a Map or an object
                 const newProgress = prev.challengeProgress instanceof Map
                     ? new Map(prev.challengeProgress)
                     : { ...(prev.challengeProgress || {}) };

                 // Set the claimed flag for the specific challenge
                 if (newProgress instanceof Map) {
                     newProgress.set(`${challengeId}_claimed`, true);
                 } else {
                     newProgress[`${challengeId}_claimed`] = true;
                 }

                 // Return the *new* state object
                 return {
                    ...prev,
                    challengeProgress: newProgress, // Use the updated progress
                    // Optionally update balances based on backend response if reliable
                    // goldBalanceGrams: data.newGoldBalanceGrams ?? prev.goldBalanceGrams,
                    // cashBalanceLKR: data.newCashBalanceLKR ?? prev.cashBalanceLKR,
                 };
            });
            // --- END IMMEDIATE STATE UPDATE ---

            alert(data.message || 'Reward claimed successfully!'); // Show success message from backend

            // Optional: Redirect after a short delay if desired
            // setTimeout(() => router.push('/gamification'), 1500);

        } catch (err) {
            console.error('Error claiming reward:', err.response || err); // Log detailed error

            // --- V V V BETTER ERROR HANDLING V V V ---
            if (err.response && err.response.status === 400 && err.response.data?.message === "Reward already claimed.") {
                // Specific handling for already claimed error
                setError("This reward has already been claimed."); // Set user-friendly message in the general error state
                // No need for alert here, the message below button is enough

                // Update state immediately to reflect claimed status IF it wasn't already updated
                // (Belt-and-suspenders approach)
                setUserData(prev => {
                    if (!prev) return null;

                    const progress = prev.challengeProgress || {};
                    const alreadyMarkedClaimed = progress instanceof Map
                        ? progress.get(`${challengeId}_claimed`) === true
                        : progress[`${challengeId}_claimed`] === true;

                    // Only update if not already marked as claimed in local state
                    if (!alreadyMarkedClaimed) {
                         const newProgress = progress instanceof Map
                             ? new Map(progress)
                             : { ...progress };

                         if (newProgress instanceof Map) {
                             newProgress.set(`${challengeId}_claimed`, true);
                         } else {
                             newProgress[`${challengeId}_claimed`] = true;
                         }
                         return { ...prev, challengeProgress: newProgress };
                    }
                    return prev; // No change needed if already marked claimed
                });
            } else {
                // General error handling for other issues
                const generalErrorMessage = err.response?.data?.message || 'Failed to claim reward. Please try again.';
                setError(generalErrorMessage); // Set general error message
                // alert(generalErrorMessage); // Optional: Show alert for other errors if desired
            }
            // --- ^ ^ ^ END BETTER ERROR HANDLING ^ ^ ^ ---

        } finally {
            setSubmitLoading(false); // Stop loading spinner regardless of outcome
        }
    };

    // --- Render Logic ---

    // Initial Loading State
    if (loading) {
        return (
            <>
                <NavbarInternal />
                <section className="wallet bg-[#f5f5f5] p-6 min-h-[60vh] flex items-center justify-center">
                    <div className="card max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-4">Claim Your Reward</h3>
                        <p className="my-4 text-gray-600">Loading details...</p>
                        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                </section>
                <FooterInternal />
            </>
        );
    }

    // Challenge Not Found State (Check this *before* general error if challenge is crucial)
    if (!challenge && !error) { // Ensure we show fetch error if that happened first
         return (
            <>
                <NavbarInternal />
                <section className="wallet bg-[#f5f5f5] p-6 min-h-[60vh] flex items-center justify-center">
                     <div className="card max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-4 text-orange-600">Reward Not Found</h3>
                        <p className="warning-message my-4 text-orange-700">
                            The details for this reward could not be found. It might be invalid or no longer active.
                        </p>
                        <Link href="/gamification" className="btn btn-secondary mt-4">
                           Back to Rewards
                        </Link>
                    </div>
                </section>
                <FooterInternal />
            </>
        );
    }

    // General Error State (covers fetch errors and now also claim errors)
    // We handle the challenge not found case above specifically
    if (error && !challenge) { // Show general error if challenge couldn't be found *due* to an error
         return (
             <>
                 <NavbarInternal />
                 <section className="wallet bg-[#f5f5f5] p-6 min-h-[60vh] flex items-center justify-center">
                      <div className="card max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-md">
                         <h3 className="text-xl font-semibold mb-4 text-red-600">Error</h3>
                         {/* Display the error message from state */}
                         <p className="error-message my-4 text-red-700">{error}</p>
                         <Link href="/gamification" className="btn btn-secondary mt-4">
                            Back to Rewards
                         </Link>
                     </div>
                 </section>
                 <FooterInternal />
             </>
         );
    }


    // --- Main Content: Display Challenge Details and Claim Button ---
    // Use data from the found challenge object, providing defaults
    const { name = 'Challenge Reward', description = 'You completed a challenge!', rewardText = 'A special reward', icon = 'fa-trophy' } = challenge || {}; // Add default {} if challenge might still be null here

    return (
        <>
            <NavbarInternal />
            <section className="wallet bg-[#f5f5f5] py-10 px-4 sm:px-6 min-h-[70vh]">
                <div className="card max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 md:p-8">
                    <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Claim Your Reward</h3>

                    {/* Display Claim-Specific or Fetch Errors using the `error` state */}
                    {/* This replaces the old `claimError` display */}
                    {error && (
                        <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center" role="alert">
                           {error}
                        </p>
                    )}

                    {/* Render challenge details only if challenge exists */}
                    {challenge ? (
                        <div className="claim-reward flex flex-col items-center text-center">
                            <div className="reward-details mb-6">
                                <i className={`fas ${icon} text-5xl text-yellow-500 mb-4`}></i>
                                <h4 className="text-xl font-semibold text-gray-900">Congratulations!</h4>
                                <p className="text-gray-600 mt-2 text-lg">
                                    {isCompleted
                                        ? <>You've completed the <strong>{name}</strong> challenge!</>
                                        : <>Details for the <strong>{name}</strong> challenge:</>
                                    }
                                    {description && <span className="block text-sm text-gray-500 mt-1">{description}</span>}
                                </p>
                                <p className="mt-3 text-lg">
                                    <strong>Reward:</strong> <span className="text-green-600 font-semibold">{rewardText}</span>
                                </p>
                            </div>

                            <div className="reward-action w-full flex flex-col items-center mt-4">
                                {!isCompleted ? (
                                     <p className="text-orange-600 font-medium text-center px-4 py-2 bg-orange-100 rounded-md w-full">
                                         <i className="fas fa-exclamation-circle mr-2"></i>
                                         Challenge not yet completed.
                                    </p>
                                ) : (
                                    <button
                                        className={`btn btn-primary w-full max-w-xs px-6 py-3 text-lg font-semibold rounded-md transition duration-150 ease-in-out ${
                                            // Button disabled/text logic relies on `isClaimed` which uses the updated `userData` state
                                            (isClaimed || submitLoading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                        id="claim-reward-btn"
                                        onClick={handleClaim}
                                        disabled={isClaimed || submitLoading} // Disable if already claimed (state updated) or submitting
                                    >
                                         {submitLoading ? (
                                             <> {/* Loading Spinner */}
                                                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                 </svg>
                                                 Claiming...
                                             </>
                                         ) : isClaimed ? ( // isClaimed reflects the immediate state update from success OR 400 error handling
                                             <>
                                                <i className="fas fa-check-circle mr-2"></i> Reward Claimed
                                             </>
                                            ) : 'Claim Reward'}
                                    </button>
                                 )}
                             </div>

                             {/* Always show back button */}
                             <Link href="/gamification" className="btn btn-secondary mt-6 inline-block text-blue-600 hover:text-blue-800">
                                 <i className="fas fa-arrow-left mr-2"></i> Back to Rewards
                             </Link>
                        </div>
                    ) : (
                        // Fallback if challenge is null but no major fetch error occurred (should be caught earlier, but safe)
                        <div className="text-center text-gray-600">
                            <p>Could not display reward details.</p>
                            <Link href="/gamification" className="btn btn-secondary mt-4">
                               Back to Rewards
                            </Link>
                        </div>
                    )}
                </div>
            </section>
            <FooterInternal />
        </>
    );
}