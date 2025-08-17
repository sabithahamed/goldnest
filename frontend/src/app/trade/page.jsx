'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import Image from 'next/image';
import styles from './TradePage.module.css'; // Assuming your CSS module is named this

// Helper function for formatting currency
const formatCurrency = (value, currency = 'LKR', locale = 'en-LK') => {
    if (value === null || value === undefined || isNaN(value)) {
        // Return a default or placeholder string if value is invalid
        return 'N/A'; // Or `${currency} 0.00` or however you want to handle it
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
        // Fallback for browsers that might not support the locale/currency well
        return `${currency} ${value.toFixed(2)}`;
    }
};

export default function TradePage() {
    // --- State Variables ---
    const [userData, setUserData] = useState(null);
    const [marketData, setMarketData] = useState(null);
    const [feeData, setFeeData] = useState(null); // <-- NEW: State for fee configuration
    const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
    const [amount, setAmount] = useState(tradeType === 'buy' ? 900 : 1); // Default amount, adjusted for buy/sell
    const [paymentMethod, setPaymentMethod] = useState(''); // Selected payment method ('wallet-cash', 'payhere', 'paypal')

    // Auto-Invest State
    const [autoInvest, setAutoInvest] = useState(false); // Is auto-invest enabled?
    const [autoInvestFrequency, setAutoInvestFrequency] = useState('daily'); // 'daily', 'weekly', 'monthly'
    const [autoInvestDate, setAutoInvestDate] = useState(''); // Day of the month (1-28) for monthly

    // Loading & Error States
    const [loading, setLoading] = useState(true); // Single loading state for initial data
    const [submitLoading, setSubmitLoading] = useState(false); // Loading state for trade submission
    const [error, setError] = useState(''); // Error messages for the user

    // Success Popup State (structured for detailed info)
    const [successPopup, setSuccessPopup] = useState({
        show: false,
        title: '',
        gold: '',     // e.g., "0.0417 g"
        total: '',    // e.g., "LKR 918.00"
        method: '',   // e.g., "Wallet Cash"
        autoInvestDetails: '', // e.g., "daily" or "monthly on day 15" or ""
    });

    const router = useRouter();

    // --- Effects ---
    // Fetch initial data (User, Market, Fees) on component mount
    useEffect(() => {
        const token = localStorage.getItem('userToken');
        if (!token) {
            router.push('/'); // Redirect to login if no token
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        const fetchInitialData = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetch all data concurrently, including the new fees endpoint
                const [userRes, marketRes, feeRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/users/me`, config),
                    axios.get(`${backendUrl}/api/market/gold-summary`),
                    axios.get(`${backendUrl}/api/market/fees`), // <-- NEW: Fetch fees
                ]);

                // Basic validation of responses
                if (!userRes.data || !marketRes.data || !feeRes.data) {
                    throw new Error("Missing essential user, market, or fee data.");
                }

                setUserData(userRes.data);
                setMarketData(marketRes.data);
                setFeeData(feeRes.data); // <-- NEW: Set fee data state

            } catch (err) {
                console.error("Error fetching trade page data:", err);
                setError("Failed to load necessary data. Please refresh.");
                // If unauthorized, clear token and redirect to login
                if (err.response?.status === 401) {
                    localStorage.clear();
                    router.push('/');
                }
            } finally {
                // Ensure loading state is turned off regardless of success/failure
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [router]); // Dependency array includes router for navigation


    // --- Derived Data ---
    // Use default/fallback values to prevent errors before data loads
    const goldPricePerGram = marketData?.latestPricePerGram || 0;
    const cashBalance = userData?.cashBalanceLKR ?? 0;
    const goldBalance = userData?.goldBalanceGrams ?? 0;
    
    // --- MODIFIED: Use dynamic fees from state ---
    const buyFeeRate = feeData?.BUY_FEE_PERCENT || 0.02; // Fallback to 2%
    const sellFeeRate = feeData?.SELL_FEE_PERCENT || 0.01; // Fallback to 1%

    // Calculate trade summary based on inputs
    const tradeSummary = useMemo(() => {
        const inputAmount = parseFloat(amount) || 0;
        let calculatedGold = 0, calculatedCash = 0, fee = 0, feeRate = 0;
        let isValid = false, meetsMinimum = false;

        // Ensure gold price is valid before calculating
        if (goldPricePerGram <= 0 || inputAmount <= 0) {
            return { goldAmountStr: 'N/A', feeStr: 'N/A', totalStr: 'N/A', isValid: false, totalCashValue: 0, goldToTrade: 0, meetsMinimum: false, feeRatePercent: 'N/A' };
        }

        if (tradeType === 'buy') {
            feeRate = buyFeeRate;
            calculatedGold = inputAmount / goldPricePerGram;
            fee = inputAmount * feeRate; // Fee based on cash amount
            calculatedCash = inputAmount + fee; // Total cash needed
            meetsMinimum = inputAmount >= 100; // Minimum buy amount
            isValid = meetsMinimum && calculatedGold > 0;
        } else { // tradeType === 'sell'
            feeRate = sellFeeRate;
            calculatedGold = inputAmount; // Input is gold amount
            const grossProceeds = inputAmount * goldPricePerGram;
            fee = grossProceeds * feeRate; // Fee based on cash value
            calculatedCash = grossProceeds - fee; // Net cash received
            meetsMinimum = inputAmount >= 0.001; // Minimum sell amount (in grams)
            isValid = meetsMinimum && calculatedCash > 0;
        }

        return {
            goldAmountStr: `${calculatedGold.toFixed(4)} g`,
            feeStr: formatCurrency(fee),
            totalStr: formatCurrency(calculatedCash),
            isValid: isValid,
            meetsMinimum: meetsMinimum,
            totalCashValue: calculatedCash, // Used for buy validation (total cost)
            goldToTrade: calculatedGold, // Used for sell validation (gold needed)
            feeRatePercent: `${(feeRate * 100).toFixed(2)}%` // <-- NEW: For display
        };
    }, [tradeType, amount, goldPricePerGram, buyFeeRate, sellFeeRate]); // <-- ADDED fee rates as dependencies


    // --- Event Handlers ---
    const handleTradeTypeChange = (e) => {
        const newType = e.target.value;
        setTradeType(newType);
        // Reset amount to default for the new type
        setAmount(newType === 'buy' ? 900 : 1);
        // Reset payment method as available methods might change
        setPaymentMethod('');
        // Clear errors and auto-invest settings
        setError('');
        setAutoInvest(false);
        setAutoInvestFrequency('daily');
        setAutoInvestDate('');
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        // Allow only numbers and a single decimal point
        if (/^[0-9]*\.?[0-9]*$/.test(value)) {
            setAmount(value);
        } else if (value === '') {
            // Allow clearing the input
            setAmount('');
        }
        setError(''); // Clear error on input change
    };

    const handleAmountButtonClick = (valueStr) => {
        // Parse the value from the button text (e.g., "Rs. 1000" or "5 g")
        const value = parseFloat(valueStr.replace(/Rs\. | g|,/g, ''));
        setAmount(isNaN(value) ? '' : value.toString());
        setError(''); // Clear error
    };

    const handleAutoInvestChange = (e) => {
        setAutoInvest(e.target.checked);
        // Optionally reset frequency/date if unchecked, though current logic doesn't
        if (!e.target.checked) {
             setAutoInvestFrequency('daily');
             setAutoInvestDate('');
        }
    };

    const handleAutoInvestFrequencyChange = (e) => {
        setAutoInvestFrequency(e.target.value);
         if (e.target.value !== 'monthly') {
             setAutoInvestDate(''); // Clear date if frequency is not monthly
         }
    };

    const handleAutoInvestDateChange = (e) => {
        setAutoInvestDate(e.target.value);
    };

    const handleConfirmTrade = async () => {
        setError(''); // Clear previous errors
        const currentAmount = parseFloat(amount) || 0;

        // --- Input Validations ---
        if (currentAmount <= 0) {
            setError(`Please enter a valid ${tradeType === 'buy' ? 'amount (Rs.)' : 'gold amount (g)'}.`);
            return;
        }
        // Use derived state for minimum check
        if (!tradeSummary.meetsMinimum) {
            setError(`Minimum ${tradeType === 'buy' ? `amount is ${formatCurrency(100)}` : 'amount is 0.001g'}.`);
            return;
        }
        // General validity check (also implicitly checks goldPricePerGram > 0)
        if (!tradeSummary.isValid) {
            setError(`Invalid trade details. Check amount and current gold price.`);
            return;
        }
        // Payment method selection
        if (!paymentMethod) {
            setError(`Please select a ${tradeType === 'buy' ? 'payment' : 'deposit'} method.`);
            return;
        }

        // --- Balance & Logic Validations ---
        // Check wallet cash balance if buying with wallet
        if (tradeType === 'buy' && paymentMethod === 'wallet-cash' && tradeSummary.totalCashValue > cashBalance) {
            setError(`Insufficient wallet cash. Need ${tradeSummary.totalStr}, but you only have ${formatCurrency(cashBalance)}.`);
            return;
        }
        // Check gold balance if selling
        if (tradeType === 'sell' && tradeSummary.goldToTrade > goldBalance) {
            setError(`Insufficient gold balance. Need ${tradeSummary.goldToTrade.toFixed(4)}g, but you only have ${goldBalance.toFixed(4)}g.`);
            return;
        }

        // --- Auto-Invest Validation (only if buying and checkbox checked) ---
        let autoInvestText = ''; // For success popup
        if (tradeType === 'buy' && autoInvest) {
            if (!autoInvestFrequency) {
                 setError('Please select a frequency for auto-investment.'); return;
            }
            if (autoInvestFrequency === 'monthly' && (!autoInvestDate || Number(autoInvestDate) < 1 || Number(autoInvestDate) > 28)) {
                setError('Please select a valid day (1-28) for monthly auto-investment.'); return;
            }
            // Prepare text for success popup
             autoInvestText = autoInvestFrequency === 'monthly'
                 ? `monthly on day ${autoInvestDate}`
                 : autoInvestFrequency;
        }
        // --- End Auto-Invest Validation ---


        // --- API Call ---
        setSubmitLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) { // Re-check token just before API call
            setError('Authentication error. Please log in again.');
            setSubmitLoading(false);
            router.push('/');
            return;
        }
        // Standard config for authenticated requests
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            let responseData;
            let successTitle = '';
            let successMessage = '';
            // Determine readable payment method name for success popup
            let successMethod = '';
            if (paymentMethod === 'wallet-cash') successMethod = 'Wallet Cash';
            else if (paymentMethod === 'payhere') successMethod = 'Card / Bank (PayHere)';
            else if (paymentMethod === 'paypal') successMethod = 'PayPal';

            // --- Prepare Payload based on Trade Type ---
            if (tradeType === 'buy') {
                 // Build the payload, including auto-invest details if enabled
                 const buyPayload = {
                    amountLKR: currentAmount,
                 };
                 if (autoInvest) {
                    buyPayload.saveAsAuto = true; // Should be boolean true
                    buyPayload.frequency = autoInvestFrequency;
                    if (autoInvestFrequency === 'monthly') {
                        buyPayload.dayOfMonth = Number(autoInvestDate); // Ensure number
                    }
                 }

                 console.log(">>> Frontend: Sending BUY payload:", JSON.stringify(buyPayload));

                 successTitle = 'Investment Successful!';
                 const { data } = await axios.post(`${backendUrl}/api/investments/invest`, buyPayload, config);
                 responseData = data;
                 successMessage = responseData.message || 'Investment completed.';

                 setUserData(prev => {
                     if (data.updatedUserInfo) {
                         console.log("Updating userData with full updatedUserInfo from backend.");
                         return data.updatedUserInfo;
                     }
                     if (!prev) return null;
                     console.log("Partially updating userData based on transaction response.");
                     return {
                         ...prev,
                         goldBalanceGrams: data.newGoldBalanceGrams ?? prev.goldBalanceGrams,
                         cashBalanceLKR: paymentMethod === 'wallet-cash'
                             ? (data.newCashBalanceLKR ?? prev.cashBalanceLKR)
                             : prev.cashBalanceLKR,
                         transactions: [...(prev.transactions || []), data.transaction].filter(Boolean),
                         automaticPayments: (buyPayload.saveAsAuto && !data.updatedUserInfo && data.newAutomaticPayment)
                             ? [...(prev.automaticPayments || []), data.newAutomaticPayment].filter(Boolean)
                             : prev.automaticPayments
                     };
                 });

            } else { // tradeType === 'sell'
                successTitle = 'Sale Successful!';
                const sellPayload = {
                    amountGrams: currentAmount
                };
                console.log(">>> Frontend: Sending SELL payload:", JSON.stringify(sellPayload));
                const { data } = await axios.post(`${backendUrl}/api/sell/gold`, sellPayload, config);
                responseData = data;
                successMessage = responseData.message || 'Sale completed.';

                setUserData(prev => {
                     if (!prev) return null;
                     return {
                         ...prev,
                         goldBalanceGrams: data.newGoldBalanceGrams ?? prev.goldBalanceGrams,
                         cashBalanceLKR: data.newCashBalanceLKR ?? prev.cashBalanceLKR,
                         transactions: [...(prev.transactions || []), data.transaction].filter(Boolean),
                     };
                 });
            }

            setSuccessPopup({
                show: true,
                title: successTitle,
                gold: tradeSummary.goldAmountStr,
                total: tradeSummary.totalStr,
                method: successMethod,
                autoInvestDetails: autoInvestText,
            });

            setAmount('');
            setAutoInvest(false);
            setAutoInvestFrequency('daily');
            setAutoInvestDate('');
            setPaymentMethod('');

        } catch (err) {
            setError(err.response?.data?.message || `${tradeType === 'buy' ? 'Investment' : 'Sale'} failed. Please try again.`);
            console.error("Trade Error:", err.response || err);
        } finally {
            setSubmitLoading(false);
        }
    };

    const hideSuccessPopup = () => setSuccessPopup({ ...successPopup, show: false });

    // --- Conditional Rendering for Loading/Error States ---
    if (loading) return (
        <>
            <NavbarInternal />
            <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                <div className={`${styles.card} text-center p-6`}>Loading Trade Data...</div>
            </div>
            <FooterInternal />
        </>
    );

    if (error) return (
        <>
            <NavbarInternal />
            <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                 <div className={`${styles.card} text-center p-6 ${styles.error}`}>Error: {error}</div>
            </div>
            <FooterInternal />
        </>
    );

    if (!userData || !marketData || !feeData || goldPricePerGram <= 0) return (
        <>
            <NavbarInternal />
            <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                <div className={`${styles.card} text-center p-6 text-orange-600`}>
                    Could not load essential trade data. Please try refreshing.
                </div>
            </div>
            <FooterInternal />
        </>
    );

    const amountOptions = tradeType === 'buy' ? [100, 500, 1000, 5000, 10000] : [0.1, 0.5, 1, 5, 10];

    // --- JSX ---
    return (
        <>
            <NavbarInternal />
            <section className={styles.trade}>
                <div className={`${styles.card} ${styles.walletBalance}`}>
                    <h3>Trade Overview</h3>
                    <div className={styles.walletBalanceContent}>
                        <div className={styles.balanceLeft}>
                            <div className={styles.balanceHeader}>
                                <div className={styles.iconCircle}>
                                    <i className={`fas fa-chart-line ${styles.balanceIcon}`}></i>
                                </div>
                                <p>Live Gold Price</p>
                            </div>
                            <h2>{formatCurrency(goldPricePerGram)}/g</h2>
                            {marketData?.trend && marketData.priceChangePercent != null && (
                                <p className={`${styles.highlight} ${marketData.trend === 'up' ? styles.positive : marketData.trend === 'down' ? styles.negative : ''}`}>
                                    {marketData.trend === 'up' ? <i className="fas fa-arrow-up mr-1"></i> : marketData.trend === 'down' ? <i className="fas fa-arrow-down mr-1"></i> : ''}
                                    {marketData.priceChangePercent.toFixed(1)}% today
                                </p>
                            )}
                        </div>
                        <div className={styles.divider}></div>
                        <div className={styles.balanceRight}>
                            <div className={styles.balanceHeader}>
                                <div className={styles.iconCircle}>
                                    <Image src="/gold-icon.png" alt="Gold" width={16} height={16} className={styles.goldIcon} />
                                </div>
                                <p>Your Balances</p>
                            </div>
                            <h2 id="user-balances">{userData ? `${formatCurrency(cashBalance)} | ${goldBalance.toFixed(2)} g` : 'Loading...'}</h2>
                            <p className={styles.recentActivity}>Wallet Cash | Gold Owned</p>
                        </div>
                    </div>
                </div>

                <div className={`${styles.card} ${styles.tradeGoldCard}`}>
                    <h3>Trade Gold</h3>
                    {error && <p className={styles.error} role="alert">{error}</p>}

                    <div className={styles.tradeForm}>
                        <div className={styles.tradeToggle}>
                            <label>
                                <input type="radio" name="trade-type" value="buy" checked={tradeType === 'buy'} onChange={handleTradeTypeChange} /> Buy Gold
                            </label>
                            <label>
                                <input type="radio" name="trade-type" value="sell" checked={tradeType === 'sell'} onChange={handleTradeTypeChange} /> Sell Gold
                            </label>
                        </div>

                        <div className={styles.amountInput}>
                            <div className={styles.formGroup}>
                                <label htmlFor="trade-amount" id="amount-label" className={styles.amountLabel}>
                                    {tradeType === 'buy' ? 'Enter Amount (Rs.)' : 'Enter Gold Amount (g)'}
                                </label>
                                <input
                                    type="number"
                                    id="trade-amount"
                                    value={amount}
                                    min={tradeType === 'buy' ? 100 : 0.01}
                                    step={tradeType === 'buy' ? 100 : 0.01}
                                    onChange={handleAmountChange}
                                    placeholder={tradeType === 'buy' ? 'Min Rs. 100' : 'Min 0.001 g'}
                                    className={styles.inputField}
                                    aria-label="Enter amount to trade"
                                    aria-describedby="amount-label"
                                    required
                                />
                            </div>
                            <div className={styles.amountOptions}>
                                {amountOptions.map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => handleAmountButtonClick(tradeType === 'buy' ? `Rs. ${val}` : `${val} g`)}
                                    >
                                        {tradeType === 'buy' ? `Rs. ${val}` : `${val} g`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tradeType === 'buy' && (
                            <div className={styles.autoInvestOptions} id="auto-invest-options">
                                <div className={`${styles.autoInvestToggle} flex items-center mb-2`}>
                                    <input
                                        type="checkbox"
                                        id="auto-invest-checkbox"
                                        checked={autoInvest}
                                        onChange={handleAutoInvestChange}
                                        className="mr-2 h-4 w-4 accent-yellow-500 cursor-pointer"
                                     />
                                    <label htmlFor="auto-invest-checkbox" className="cursor-pointer select-none text-sm">
                                        Enable Auto-Invest for this amount?
                                    </label>
                                </div>

                                {autoInvest && (
                                    <div id="auto-invest-details" className="mt-1 pl-6 space-y-2 border-l-2 border-gray-200 ml-2 py-2">
                                        <div className="flex items-center">
                                            <label htmlFor="auto-invest-frequency" className="text-sm text-gray-600 mr-2 whitespace-nowrap w-20">Frequency:</label>
                                            <select
                                                id="auto-invest-frequency"
                                                value={autoInvestFrequency}
                                                onChange={handleAutoInvestFrequencyChange}
                                                className={`${styles.inputField} text-sm !py-1 !max-w-[150px] flex-grow`}
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                        {autoInvestFrequency === 'monthly' && (
                                            <div id="monthly-date" className="flex items-center">
                                                <label htmlFor="auto-invest-date" className="text-sm text-gray-600 mr-2 whitespace-nowrap w-20">Day:</label>
                                                <select
                                                    id="auto-invest-date"
                                                    value={autoInvestDate}
                                                    onChange={handleAutoInvestDateChange}
                                                    required
                                                    className={`${styles.inputField} text-sm !py-1 !max-w-[100px] flex-grow`}
                                                >
                                                    <option value="">Select Day</option>
                                                    {[...Array(28)].map((_, i) => (
                                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={styles.paymentMethods} id="payment-methods">
                             <h4>{tradeType === 'buy' ? 'Payment Method' : 'Deposit Proceeds To'}</h4>
                             <label className="flex items-center space-x-2 cursor-pointer my-1">
                                <input
                                    type="radio"
                                    name="payment"
                                    value="wallet-cash"
                                    checked={paymentMethod === 'wallet-cash'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="accent-yellow-500"
                                />
                                <span>Wallet Cash ({formatCurrency(cashBalance)})</span>
                            </label>

                             {tradeType === 'buy' ? (
                                 <>
                                     <label className="flex items-center space-x-2 cursor-pointer my-1">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="payhere"
                                            checked={paymentMethod === 'payhere'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="accent-yellow-500"
                                        />
                                        <span>Card / Bank</span>
                                        <Image src="/payhere-logo.png" alt="Payhere" width={60} height={15} className="ml-1" />
                                    </label>
                                     <label className="flex items-center space-x-2 cursor-pointer my-1">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="paypal"
                                            checked={paymentMethod === 'paypal'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                             className="accent-yellow-500"
                                             disabled
                                        />
                                         <span>PayPal</span>
                                        <Image src="/paypal-icon.png" alt="PayPal" width={60} height={15} className="ml-1"/>
                                    </label>
                                 </>
                             ) : (
                                <>
                                </>
                            )}
                        </div>

                        {parseFloat(amount) > 0 && tradeSummary.isValid && (
                            <div className={styles.tradeSummary}>
                                <p>Gold: <span id="gold-amount" className="font-semibold">{tradeSummary.goldAmountStr}</span></p>
                                <p>Est. Fee: <span id="trade-fee" className="font-semibold">{tradeSummary.feeStr} ({tradeSummary.feeRatePercent})</span></p>
                                <p>Est. Total: <span id="trade-total" className={`font-bold ${tradeType === 'buy' ? '' : styles.positive}`}>
                                    {tradeSummary.totalStr}
                                </span></p>
                            </div>
                        )}

                        <div className={styles.redeemAction}>
                            <button
                                className={`${styles.btnPrimary} w-full max-w-xs`}
                                id="confirm-trade"
                                onClick={handleConfirmTrade}
                                disabled={
                                    submitLoading ||
                                    !tradeSummary.isValid ||
                                    !tradeSummary.meetsMinimum ||
                                    !paymentMethod ||
                                    (tradeType === 'buy' && paymentMethod === 'wallet-cash' && tradeSummary.totalCashValue > cashBalance) ||
                                    (tradeType === 'sell' && tradeSummary.goldToTrade > goldBalance) ||
                                    (tradeType === 'buy' && autoInvest && autoInvestFrequency === 'monthly' && !autoInvestDate)
                                }
                            >
                                {submitLoading ? 'Processing...' : `Confirm ${tradeType === 'buy' ? 'Purchase' : 'Sale'}`}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {successPopup.show && (
                <div className={styles.successPopup} id="trade-success-popup" style={{ display: 'block' }} role="alertdialog" aria-labelledby="success-title" aria-describedby="success-details">
                    <h3 id="success-title">{successPopup.title}</h3>
                    <div id="success-details">
                        <p id="success-gold">Gold Amount: <span className="font-semibold">{successPopup.gold}</span></p>
                        <p id="success-total">Total Value: <span className="font-semibold">{successPopup.total}</span></p>
                        <p id="success-payment">Method: <span className="font-semibold">{successPopup.method}</span></p>
                        {successPopup.autoInvestDetails && (
                            <p id="success-auto-invest">Auto-Invest Setup: <span className="font-semibold capitalize">{successPopup.autoInvestDetails}</span></p>
                        )}
                    </div>
                    <button className={`${styles.btnPrimary} mt-4`} id="success-close" onClick={hideSuccessPopup}>Close</button>
                </div>
            )}

            <FooterInternal />
        </>
    );
}