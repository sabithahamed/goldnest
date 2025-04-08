// src/app/invest/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import InternalPageLayout from '@/components/layouts/InternalPageLayout'; // Correct layout import

// --- Helper Function Placeholders (Implement or import these properly) ---
const formatCurrency = (value, currency = 'LKR', locale = 'en-LK') => {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'Rs. 0.00'; // Or some other default/error display
    }
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatDate = (dateString, options = { dateStyle: 'medium', timeStyle: 'medium' }) => {
    if (!dateString) return 'N/A';
    try {
        // Use 'en-LK' or 'si-LK' or 'ta-LK' as appropriate for Sri Lanka locale if needed specifically
        // Using 'en-GB' as a fallback for wider compatibility if 'en-LK' isn't universally supported
        const locale = Intl.DateTimeFormat.supportedLocalesOf(['en-LK', 'en-GB']).length ? 'en-LK' : 'en-GB';
        return new Intl.DateTimeFormat(locale, options).format(new Date(dateString));
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Invalid Date';
    }
};
// --- End Helper Functions ---

export default function InvestPage() {
    const [amountLKR, setAmountLKR] = useState(100);
    const [saveAsAuto, setSaveAsAuto] = useState(false);
    const [autoFrequency, setAutoFrequency] = useState('daily');
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false); // For investment submission
    const [authLoading, setAuthLoading] = useState(true); // For initial data load
    const [marketData, setMarketData] = useState(null); // State for fetched market data
    const [timingSuggestion, setTimingSuggestion] = useState('Loading suggestion...'); // Keep AI state
    const router = useRouter();

    // Combined useEffect for Auth Check, AI, and Market Data
    useEffect(() => {
        const token = localStorage.getItem('userToken');
        if (!token) {
            console.log("No token found, redirecting to login.");
            router.push('/'); // Redirect to login or home if no token
            return; // Stop execution
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        const fetchData = async () => {
            setAuthLoading(true); // Ensure loading state is true at the start
            try {
                // Attempt to get user info from storage first for quicker UI update
                try {
                    const storedUserInfo = localStorage.getItem('userInfo');
                    if (storedUserInfo) setUserInfo(JSON.parse(storedUserInfo));
                } catch (e) { console.error("Error parsing stored user info", e); }

                // Fetch Auth User, AI Timing, Market Data in parallel
                const [userRes, timingRes, marketRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/users/me`, config).catch(err => { console.warn("Failed to fetch /api/users/me", err); return null; }),
                    axios.get(`${backendUrl}/api/ai/investment-timing`, config),
                    axios.get(`${backendUrl}/api/market/gold-summary`) // Public endpoint
                ]);

                // Update User Info if fetch was successful
                if (userRes && userRes.data) {
                   setUserInfo(userRes.data);
                   // Optionally update localStorage if structure changed significantly
                   // localStorage.setItem('userInfo', JSON.stringify(userRes.data));
                } else if (!userInfo && !(userRes && userRes.data)) {
                    // If fetch failed AND we couldn't get from localStorage, it's an issue
                    throw new Error("User information could not be loaded.");
                }

                // Set AI Suggestion
                setTimingSuggestion(timingRes?.data?.suggestion || 'Suggestion not available.');

                // Set Market Data
                if (marketRes && marketRes.data) {
                    setMarketData(marketRes.data);
                } else {
                    throw new Error("Market data could not be loaded.");
                }

            } catch (err) {
                console.error("Error fetching data for Invest page:", err);
                setError('Failed to load necessary investment data. Please refresh or try again later.');
                if (err.response?.status === 401 || err.message === "User information could not be loaded.") {
                    localStorage.removeItem('userToken'); // Clear potentially invalid token
                    localStorage.removeItem('userInfo');
                    router.push('/'); // Redirect to login on auth error or critical data load failure
                }
                // Set market data to a default/error state
                setMarketData({ latestPricePerGram: 0, latestDate: null });
                setTimingSuggestion('Could not load suggestion.');
            } finally {
                setAuthLoading(false); // Loading finished (success or fail)
            }
        };

        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]); // Dependency array includes router (userInfo removed to avoid loop if storage update triggers re-render)

    // Handle Investment Submission
    const handleInvestment = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        const token = localStorage.getItem('userToken');
        if (!token) {
            setError('Authentication error. Please log in again.');
            setLoading(false);
            router.push('/'); // Use '/' or '/login' as appropriate
            return;
        }

        if (amountLKR < 100) {
            setError('Minimum investment is Rs. 100.');
            setLoading(false);
            return;
        }

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

            const payload = {
                amountLKR: Number(amountLKR),
            };

            if (saveAsAuto) {
                payload.saveAsAuto = true;
                payload.frequency = autoFrequency;
            }

            const { data } = await axios.post(
                `${backendUrl}/api/investments/invest`,
                payload,
                config
            );

            setSuccess(`Investment of Rs. ${amountLKR} successful! ${saveAsAuto ? `Automatic ${autoFrequency} payment saved.` : ''}`);
            console.log('Investment successful:', data);

            // Update user info in state and local storage if the backend returns it
            if (data.updatedUserInfo) {
              localStorage.setItem('userInfo', JSON.stringify(data.updatedUserInfo));
              setUserInfo(data.updatedUserInfo);
            }

            setLoading(false);
            setSaveAsAuto(false); // Reset auto-save checkbox
            // setAmountLKR(100); // Optional: Reset amount
            router.push('/payment-success'); // Redirect on success

        } catch (err) {
            console.error('Investment error:', err);
            setError(
                err.response?.data?.message || 'Investment failed. Please try again.'
            );
            setLoading(false);
        }
    };

    // --- Loading states ---
    // Check authLoading AND marketData has loaded before rendering the main form
    if (authLoading || !marketData) {
        // *** Use InternalPageLayout here ***
        return <InternalPageLayout><div className="p-10 text-center">Loading Investment Data...</div></InternalPageLayout>;
    }

     // --- Calculate Approx Grams Dynamically ---
     const approxGrams = (marketData && marketData.latestPricePerGram > 0)
         ? (amountLKR / marketData.latestPricePerGram)
         : 0;

    // Redirect if user info is somehow still null after loading (edge case, should be caught by useEffect error handling)
    if (!userInfo && !authLoading) {
      console.error("User info not available after load, redirecting.");
       // *** Use InternalPageLayout here ***
      return <InternalPageLayout><div className="p-10 text-center">Authentication error. Redirecting...</div></InternalPageLayout>;
    }

    // *** Main component return, wrapped in InternalPageLayout ***
    return (
        <InternalPageLayout>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Live Price Info (Dynamic) */}
                <div className="md:col-span-1 bg-white p-6 rounded shadow">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        Live Price <span className="text-red-500 ml-2 text-xl animate-pulse">((●))</span>
                    </h2>
                    {/* Placeholder Graph */}
                    <div className="bg-gray-200 h-32 mb-4 flex items-center justify-center text-gray-500 rounded">
                        [Price Chart Placeholder]
                    </div>
                    <div className="text-center bg-gray-800 text-white p-3 rounded mb-4">
                        <p className="text-xs">Live Price</p>
                        <p className="text-xs">As of: {formatDate(marketData.latestDate, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <div className="text-center bg-yellow-400 text-black p-4 rounded mb-4">
                        <p className="text-xl font-bold">{formatCurrency(marketData.latestPricePerGram)}</p>
                        <p className="text-xs">/ gram</p>
                    </div>
                    <div className="border-t pt-4">
                        <h3 className="font-semibold flex items-center">
                            AI Timing Suggestion
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{timingSuggestion}</p>
                    </div>
                </div>

                {/* Right Column: Investment Form */}
                <div className="md:col-span-2 bg-white p-6 rounded shadow">
                    <h2 className="text-2xl font-bold mb-6 text-center text-yellow-600">Invest <span className="text-black">Now !</span></h2>

                    {error && <p className="text-red-500 text-center mb-4 bg-red-100 p-2 rounded">{error}</p>}
                    {success && <p className="text-green-600 text-center mb-4 bg-green-100 p-2 rounded">{success}</p>}

                    {/* Amount Section */}
                    <div className="mb-6">
                        <label htmlFor="amountRange" className="block text-sm font-medium text-gray-700 mb-2">Amount (LKR)</label>
                        <input
                            type="range"
                            id="amountRange" // Unique ID for label association
                            min="100"
                            max="100000" // Adjust max as needed
                            step="100"
                            value={amountLKR}
                            onChange={(e) => setAmountLKR(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mb-2"
                        />
                        <div className="flex justify-between text-xs text-gray-500 px-1">
                            <span>{formatCurrency(100)}</span>
                            <span>{formatCurrency(100000)}</span>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="amountInput" className="sr-only">Enter Amount</label>
                            <input
                                type="number"
                                id="amountInput" // Unique ID
                                value={amountLKR}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setAmountLKR(isNaN(val) ? 0 : val); // Allow temporary empty/invalid input, default to 0
                                }}
                                onBlur={(e) => {
                                    // Ensure minimum value on blur if below threshold or empty
                                    const val = Number(e.target.value);
                                    if (isNaN(val) || val < 100) {
                                        setAmountLKR(100);
                                    }
                                }}
                                min="100"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Enter Amount (Min: Rs. 100)"
                            />
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            Approx. {approxGrams.toFixed(4)} grams
                            {marketData?.latestPricePerGram > 0 ? '' : ' (Live price unavailable)'}
                        </p>
                    </div>

                    {/* Auto Invest Section */}
                    <div className="mb-6 text-sm border-t pt-5 mt-5">
                        <div className="flex items-center mb-3">
                            <input
                                type="checkbox"
                                id="saveAsAuto"
                                className="form-checkbox h-4 w-4 text-yellow-600 transition duration-150 ease-in-out mr-2 cursor-pointer"
                                checked={saveAsAuto}
                                onChange={(e) => setSaveAsAuto(e.target.checked)}
                            />
                            <label htmlFor="saveAsAuto" className="font-medium text-gray-700 cursor-pointer select-none">
                                Save as Automatic Investment
                            </label>
                        </div>
                        {saveAsAuto && (
                            <div className="flex items-center justify-start flex-wrap gap-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                                <span className="text-xs font-medium text-gray-600 mr-2">Frequency:</span>
                                {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                                    <button
                                        key={freq}
                                        type="button"
                                        onClick={() => setAutoFrequency(freq)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                                        ${autoFrequency === freq ? 'bg-yellow-500 text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payment Section */}
                    <div className="mb-6 border-t pt-6">
                        <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
                        <div className="space-y-2">
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="payment" value="payhere" className="form-radio mr-2 text-yellow-600" defaultChecked /> Bank Card / Bank Account - PayHere (Simulated)
                            </label>
                            <label className="flex items-center cursor-pointer opacity-50" title="Coming Soon">
                                <input type="radio" name="payment" value="paypal" className="form-radio mr-2 text-yellow-600" disabled /> Pay from PayPal (Simulated - Disabled)
                            </label>
                            {/* Add more payment options if needed */}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleInvestment}
                        disabled={loading || amountLKR < 100 || !marketData?.latestPricePerGram || authLoading} // Also disable if still in initial load
                        className={`w-full font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline text-white transition-colors duration-200
                        ${loading || amountLKR < 100 || !marketData?.latestPricePerGram || authLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-yellow-500 hover:bg-yellow-600'}`}
                    >
                        {loading ? 'Processing...' : `Pay ${formatCurrency(amountLKR)}`}
                    </button>
                </div>
            </div>
        </InternalPageLayout> // Ensure closing tag matches the opening one
    );
}