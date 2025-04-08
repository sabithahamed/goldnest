// src/app/trade/page.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
// Removed Link import as it wasn't used directly in the return
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import Image from 'next/image';
import styles from './TradePage.module.css'; // Import the CSS Module

// Helpers - Assuming formatCurrency is defined elsewhere or implemented here
const formatCurrency = (value, currency = 'LKR', locale = 'en-LK') => {
    if (value === null || value === undefined || isNaN(value)) {
        return 'N/A'; // Or some default like 'Rs. 0.00'
    }
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch (error) {
        console.error("Error formatting currency:", error);
        // Fallback formatting
        return `${currency} ${value.toFixed(2)}`;
    }
};
// const TROY_OZ_TO_GRAMS = 31.1034768; // Keep if needed elsewhere

export default function TradePage() {
    // --- State ---
    const [userData, setUserData] = useState(null);
    const [marketData, setMarketData] = useState(null);
    const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
    const [amount, setAmount] = useState(tradeType === 'buy' ? 100 : 0.1); // Initial amount based on type
    const [paymentMethod, setPaymentMethod] = useState('wallet-cash'); // Default 'wallet-cash'
    const [timingSuggestion, setTimingSuggestion] = useState('Loading suggestion...'); // State for AI suggestion - ADDED

    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingMarket, setLoadingMarket] = useState(true);
    const [loadingSuggestion, setLoadingSuggestion] = useState(true); // Separate loading for suggestion - ADDED
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [successPopup, setSuccessPopup] = useState({ // State for success popup
        show: false,
        title: '',
        gold: '',
        total: '',
        method: ''
    });

    const router = useRouter();

    // --- Fetch Initial Data ---
    useEffect(() => {
        const token = localStorage.getItem('userToken');
        if (!token) { router.push('/'); return; } // Redirect if not logged in
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        const fetchInitialData = async () => {
            setLoadingUser(true); setLoadingMarket(true); setLoadingSuggestion(true); setError(''); // Include suggestion loading
            try {
                // Fetch user, market, and AI timing suggestion in parallel - UPDATED
                const [userRes, marketRes, timingRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/users/me`, config),
                    axios.get(`${backendUrl}/api/market/gold-summary`),
                    axios.get(`${backendUrl}/api/ai/investment-timing`, config) // Fetch timing suggestion
                ]);

                 // Check critical data first
                 if (!userRes.data || !marketRes.data) {
                    throw new Error("Missing essential user or market data.");
                 }

                setUserData(userRes.data);
                setMarketData(marketRes.data);
                setTimingSuggestion(timingRes.data?.suggestion || 'Suggestion currently unavailable.'); // Set suggestion state - ADDED

            } catch (err) {
                console.error("Error fetching trade page data:", err);
                setError("Failed to load necessary data. Please refresh.");
                setTimingSuggestion('Could not load suggestion.'); // Set error state for suggestion - ADDED
                if (err.response?.status === 401) { localStorage.clear(); router.push('/'); }
            } finally {
                setLoadingUser(false); setLoadingMarket(false); setLoadingSuggestion(false); // Include suggestion loading - UPDATED
            }
        };
        fetchInitialData();
    }, [router]);

    // --- Derived Values & Calculations ---
    // Keep existing derived values logic - goldPricePerGram, cashBalance, goldBalance, feeRate)
    const goldPricePerGram = marketData?.latestPricePerGram || 0;
    const cashBalance = userData?.cashBalanceLKR ?? 0;
    const goldBalance = userData?.goldBalanceGrams ?? 0;
    const feeRate = 0.02; // Example 2% fee - synchronize with backend if possible

    // Recalculate trade summary whenever relevant state changes
    const tradeSummary = useMemo(() => {
        // Keep existing useMemo logic for tradeSummary
        const inputAmount = parseFloat(amount) || 0;
        let calculatedGold = 0;
        let calculatedCash = 0;
        let fee = 0;
        let isValid = false;
        let meetsMinimum = false;

        if (goldPricePerGram <= 0) {
            return { goldAmountStr: 'N/A', feeStr: 'N/A', totalStr: 'N/A', isValid: false, totalCashValue: 0, goldToTrade: 0, meetsMinimum: false };
        }

        if (tradeType === 'buy') {
            calculatedGold = inputAmount / goldPricePerGram;
            fee = inputAmount * feeRate; // Fee on cash amount
            calculatedCash = inputAmount + fee;
            meetsMinimum = inputAmount >= 100; // Min buy amount LKR
            isValid = meetsMinimum && calculatedGold > 0;
        } else { // Sell
            calculatedGold = inputAmount;
            calculatedCash = inputAmount * goldPricePerGram;
            fee = calculatedCash * feeRate; // Fee on cash generated
            calculatedCash -= fee; // Deduct fee from proceeds
            meetsMinimum = inputAmount >= 0.001; // Min sell amount grams
            isValid = meetsMinimum && calculatedCash > 0;
        }

        return {
            goldAmountStr: `${calculatedGold.toFixed(4)} g`,
            feeStr: formatCurrency(fee),
            totalStr: formatCurrency(calculatedCash),
            isValid: isValid,
            meetsMinimum: meetsMinimum, // Added for easier validation message
            totalCashValue: calculatedCash, // Actual LKR cost (buy) or LKR received (sell)
            goldToTrade: calculatedGold // Actual grams involved
        };
    }, [tradeType, amount, goldPricePerGram, feeRate]);


    // --- Event Handlers ---
    // Keep existing handlers: handleTradeTypeChange, handleAmountChange, handleAmountButtonClick)
    const handleTradeTypeChange = (e) => {
        const newType = e.target.value;
        setTradeType(newType);
        setAmount(newType === 'buy' ? '' : ''); // Clear amount on type switch
        setPaymentMethod('wallet-cash');
        setError('');
    };

    const handleAmountChange = (e) => {
        // Allow decimal input but handle potential non-numeric values gracefully
        const value = e.target.value;
        // Basic validation to prevent non-numeric characters (except '.')
        if (/^[0-9]*\.?[0-9]*$/.test(value)) {
           setAmount(value);
        } else if (value === '') {
             setAmount(''); // Allow clearing the input
        }
        setError('');
    };

    const handleAmountButtonClick = (valueStr) => {
        const value = parseFloat(valueStr.replace(/Rs\. | g|,/g, '')); // Handle commas too
        setAmount(isNaN(value) ? '' : value.toString()); // Set as string
        setError('');
    };

    const handleConfirmTrade = async () => {
        // Keep most of existing handleConfirmTrade logic
        setError('');
        const currentAmount = parseFloat(amount) || 0; // Parse amount for validation

        if (currentAmount <= 0) {
             setError(`Please enter a valid ${tradeType === 'buy' ? 'amount' : 'gold amount'}.`);
            return;
        }
        if (!tradeSummary.meetsMinimum) {
             setError(`Minimum ${tradeType === 'buy' ? `amount is ${formatCurrency(100)}` : 'amount is 0.001g'}.`);
             return;
        }
         if (!tradeSummary.isValid) {
             setError(`Invalid trade details. Check amount and price.`);
             return;
         }
        if (!paymentMethod) {
             setError(`Please select a ${tradeType === 'buy' ? 'payment' : 'deposit'} method.`);
             return;
        }

        // Balance Checks
        if (tradeType === 'buy' && paymentMethod === 'wallet-cash' && tradeSummary.totalCashValue > cashBalance) {
             setError(`Insufficient wallet cash. Need ${tradeSummary.totalStr}, have ${formatCurrency(cashBalance)}.`);
            return;
        }
        if (tradeType === 'sell' && tradeSummary.goldToTrade > goldBalance) {
             setError(`Insufficient gold balance. Need ${tradeSummary.goldToTrade.toFixed(4)}g, have ${goldBalance.toFixed(4)}g.`);
            return;
        }
         if (tradeType === 'sell' && paymentMethod !== 'wallet-cash') {
              setError(`Selling gold currently only deposits proceeds to your Wallet Cash balance.`);
              return;
         }

        // --- API Call Logic ---
        setSubmitLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) { setError('Authentication error. Please log in again.'); setSubmitLoading(false); router.push('/'); return; }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            let responseData;
            let successTitle = '';
            let successMethod = paymentMethod === 'wallet-cash' ? 'Wallet Cash' : 'External (Simulated)'; // Simplified method text

            if (tradeType === 'buy') {
                 // --- BUY LOGIC ---
                 successTitle = 'Purchase Successful!';
                  if (paymentMethod !== 'wallet-cash') {
                     console.warn("Simulating external payment method:", paymentMethod);
                      successMethod = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) + ' (Simulated)'; // Capitalize
                  }
                 const payload = { amountLKR: parseFloat(amount) }; // Send LKR amount user entered
                 const { data } = await axios.post(`${backendUrl}/api/investments/invest`, payload, config);
                 responseData = data;
                 setUserData(prev => ({
                      ...prev,
                      goldBalanceGrams: data.newGoldBalanceGrams,
                      cashBalanceLKR: paymentMethod === 'wallet-cash' ? data.newCashBalanceLKR : prev?.cashBalanceLKR,
                      transactions: [...(prev?.transactions || []), data.transaction]
                  }));

            } else {
                 // --- SELL LOGIC ---
                 successTitle = 'Sale Successful!';
                 successMethod = 'Wallet Cash'; // Proceeds always go to wallet for now
                 const payload = { amountGrams: parseFloat(amount) }; // Send GRAM amount user entered
                 const { data } = await axios.post(`${backendUrl}/api/sell/gold`, payload, config);
                 responseData = data;
                  setUserData(prev => ({
                      ...prev,
                      goldBalanceGrams: data.newGoldBalanceGrams,
                      cashBalanceLKR: data.newCashBalanceLKR,
                      transactions: [...(prev?.transactions || []), data.transaction]
                  }));
            }

            // Show success popup
            setSuccessPopup({
                 show: true,
                 title: successTitle,
                 gold: tradeSummary.goldAmountStr,
                 total: tradeSummary.totalStr,
                 method: successMethod
             });
             // Reset amount after successful trade
             setAmount(''); // Clear amount


        } catch (err) {
            setError(err.response?.data?.message || `Trade failed. Please try again.`);
            console.error("Trade Error:", err.response || err);
        } finally {
            setSubmitLoading(false);
        }
    };

    const hideSuccessPopup = () => setSuccessPopup({ ...successPopup, show: false });

    // --- Loading / Initial Error States ---
    const isLoading = loadingUser || loadingMarket || loadingSuggestion; // Include suggestion loading - UPDATED
    if (isLoading) return (
        <>
            <NavbarInternal />
            {/* Use card style for loading message */}
            <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                <div className={`${styles.card} text-center p-6`}>Loading Trade Data...</div>
            </div>
            <FooterInternal />
        </>
    );
    // Enhanced Error Display
    if (error && !userData && !marketData) return (
         <>
            <NavbarInternal />
             <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                 <div className={`${styles.card} text-center p-6 ${styles.error}`}>Error: {error}</div>
             </div>
            <FooterInternal />
        </>
    );
    // Specific message if data load failed partially or price is zero
     if (!userData || !marketData || goldPricePerGram <= 0) return (
          <>
             <NavbarInternal />
             <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                 <div className={`${styles.card} text-center p-6 text-orange-600`}>Could not load essential trade data (User: {userData ? 'OK' : 'Failed'}, Market: {marketData ? 'OK' : 'Failed'}, Price: {goldPricePerGram > 0 ? 'OK' : 'Zero/Failed'}). Please try refreshing.</div>
             </div>
             <FooterInternal />
         </>
     );


    // --- RENDER ---
    return (
        <>
            <NavbarInternal />
            {/* Use the main class name from the CSS module */}
            <section className={styles.trade}>
                {/* Trade Overview Card */}
                {/* Combined module classes for card and specific variant */}
                <div className={`${styles.card} ${styles.walletBalance}`}>
                    <h3>Trade Overview</h3>
                    <div className={styles.walletBalanceContent}>
                        <div className={styles.balanceLeft}>
                            <div className={styles.balanceHeader}>
                                <div className={styles.iconCircle}>
                                    {/* Using Font Awesome class directly */}
                                    <i className={`fas fa-chart-line ${styles.balanceIcon}`}></i>
                                </div>
                                <p>Live Gold Price</p>
                            </div>
                            <h2>{formatCurrency(goldPricePerGram)}/g</h2>
                            {marketData?.trend && marketData.priceChangePercent != null && ( // Check if data exists
                                <p className={`${styles.highlight} ${marketData.trend === 'up' ? styles.positive : marketData.trend === 'down' ? styles.negative : ''}`}>
                                    {marketData.trend === 'up' ? '▲' : marketData.trend === 'down' ? '▼' : '▬'} {marketData.priceChangePercent.toFixed(1)}% today
                                </p>
                            )}
                            {/* --- Display AI Timing Suggestion - ADDED --- */}
                            <p className={`${styles.recentActivity} mt-2 border-t pt-2`}> {/* Adjust styling as needed */}
                                <i className="fas fa-lightbulb mr-1 text-yellow-500"></i> {/* Optional Icon */}
                                {timingSuggestion}
                            </p>
                        </div>

                        {/* Optional Divider - uncomment if desired and styled */}
                        {/* <div className={styles.divider}></div> */}

                        <div className={styles.balanceRight}>
                            <div className={styles.balanceHeader}>
                                <div className={styles.iconCircle}>
                                    <Image src="/gold-icon.png" alt="Gold" width={16} height={16} className={styles.goldIcon}/>
                                </div>
                                <p>Your Balances</p>
                            </div>
                            <h2 id="user-balances">{formatCurrency(cashBalance)} | {goldBalance.toFixed(4)} g</h2>
                            <p className={styles.recentActivity}>Cash | Gold Owned</p>
                        </div>
                    </div>
                </div>

                {/* Trade Form Card */}
                <div className={styles.card}>
                    <h3>Trade Gold</h3>
                    {/* Display general form error */}
                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.tradeForm}>
                        {/* Buy/Sell Toggle */}
                        <div className={styles.tradeToggle}>
                            <label>
                                <input type="radio" name="trade-type" value="buy" checked={tradeType === 'buy'} onChange={handleTradeTypeChange} /> Buy Gold
                            </label>
                            <label>
                                <input type="radio" name="trade-type" value="sell" checked={tradeType === 'sell'} onChange={handleTradeTypeChange} /> Sell Gold
                            </label>
                        </div>

                        {/* Amount Input */}
                        <div className={styles.amountInput}>
                            {/* Use formGroup class if defined and needed */}
                            <div className={styles.formGroup}>
                                <label htmlFor="trade-amount" id="amount-label" className="block text-sm font-medium text-gray-700 mb-1 text-center">
                                    {tradeType === 'buy' ? 'Enter Amount (LKR)' : 'Enter Gold Amount (g)'}
                                </label>
                                <input
                                    type="number" // Keep type number for better mobile keyboards
                                    id="trade-amount"
                                    value={amount}
                                    min={tradeType === 'buy' ? 100 : 0.001}
                                    step={tradeType === 'buy' ? 100 : 0.01}
                                    onChange={handleAmountChange}
                                    placeholder={tradeType === 'buy' ? `Min ${formatCurrency(100)}` : 'Min 0.001 g'}
                                    // Apply the inputField style from module
                                    className={styles.inputField}
                                    aria-label="Enter amount to trade"
                                />
                            </div>
                            {/* Combine module class with utility class */}
                            <div className={`${styles.amountOptions}`}>
                                 {tradeType === 'buy' ?
                                    [100, 500, 1000, 2000, 5000].map(val => (
                                        <button key={val} onClick={() => handleAmountButtonClick(`Rs. ${val}`)}>Rs. {val.toLocaleString()}</button>
                                    )) :
                                    [0.1, 0.5, 1, 2, 5].map(val => (
                                        <button key={val} onClick={() => handleAmountButtonClick(`${val} g`)}>{val} g</button>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Payment/Deposit Methods */}
                        <div className={styles.paymentMethods} id="payment-methods">
                            <h4>{tradeType === 'buy' ? 'Payment Method' : 'Deposit To'}</h4>
                            <label>
                                <input type="radio" name="payment" value="wallet-cash" checked={paymentMethod === 'wallet-cash'} onChange={(e) => setPaymentMethod(e.target.value)} />
                                 Wallet Cash ({formatCurrency(cashBalance)})
                            </label>
                             {tradeType === 'buy' && ( // Only show external options for buying
                                <>
                                <label>
                                    <input type="radio" name="payment" value="payhere" checked={paymentMethod === 'payhere'} onChange={(e) => setPaymentMethod(e.target.value)} disabled/> {/* Disabled for now */}
                                     Card / Bank (Soon) {/* <Image src="/payhere-logo.png" alt="Payhere" width={60} height={15} /> */}
                                </label>
                                 {/* <label>
                                     <input type="radio" name="payment" value="paypal" checked={paymentMethod === 'paypal'} onChange={(e) => setPaymentMethod(e.target.value)} disabled/>
                                     PayPal (Soon) <Image src="/paypal-icon.png" alt="PayPal" width={60} height={15} />
                                 </label> */}
                                 </>
                             )}
                              {tradeType === 'sell' && ( // Message for selling
                                 <p className="text-xs text-gray-500 pl-6">Proceeds will be added to Wallet Cash.</p>
                             )}
                        </div>

                        {/* Trade Summary - Conditionally render based on valid amount */}
                         {parseFloat(amount) > 0 && tradeSummary.isValid && (
                             <div className={styles.tradeSummary}>
                                 <p>{tradeType === 'buy' ? 'Gold You Will Receive:' : 'Cash You Will Receive:'} <span id="gold-amount" className="font-semibold">{tradeType === 'buy' ? tradeSummary.goldAmountStr : tradeSummary.totalStr}</span></p>
                                 <p>Est. Fee: <span id="trade-fee" className="font-semibold">{tradeSummary.feeStr}</span></p>
                                 <p className="font-bold mt-2">{tradeType === 'buy' ? 'Total Cost:' : 'Net Proceeds:'} <span id="trade-total" className={`font-bold ${tradeType === 'buy' ? styles.negative : styles.positive}`}>{tradeSummary.totalStr}</span></p>
                             </div>
                         )}

                        {/* Action Button Container */}
                        {/* Use module style for container */}
                        <div className={styles.redeemAction}>
                            <button
                                // Combine module style with utility classes if needed
                                className={`${styles.btnPrimary} w-full max-w-xs`}
                                id="confirm-trade"
                                onClick={handleConfirmTrade}
                                disabled={submitLoading || !tradeSummary.isValid || !tradeSummary.meetsMinimum || (tradeType === 'buy' && paymentMethod === 'wallet-cash' && tradeSummary.totalCashValue > cashBalance) || (tradeType === 'sell' && tradeSummary.goldToTrade > goldBalance)}
                            >
                                {submitLoading ? 'Processing...' : `Confirm ${tradeType === 'buy' ? 'Buy' : 'Sell'}`}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

             {/* Success Popup */}
             {successPopup.show && (
                 // Use module style for the popup container
                 <div className={styles.successPopup} id="trade-success-popup" style={{ display: 'block' }}> {/* Keep style display for visibility control */}
                     <h3 id="success-title">{successPopup.title}</h3>
                     {/* Display amounts clearly */}
                     {tradeType === 'buy' ? (
                         <>
                            <p>Purchased: <span id="success-gold" className="font-semibold">{successPopup.gold}</span></p>
                            <p>Total Cost: <span id="success-total" className="font-semibold">{successPopup.total}</span></p>
                         </>
                     ) : (
                        <>
                            <p>Sold: <span id="success-gold" className="font-semibold">{successPopup.gold}</span></p>
                            <p>Proceeds: <span id="success-total" className="font-semibold">{successPopup.total}</span></p>
                         </>
                     )}
                     <p id="success-payment">Method: {successPopup.method}</p>
                     {/* Use module style for the close button */}
                     <button className={styles.btnPrimary} id="success-close" onClick={hideSuccessPopup}>Close</button>
                 </div>
             )}

            <FooterInternal />
        </>
    );
}