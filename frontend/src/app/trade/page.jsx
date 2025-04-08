'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import Image from 'next/image';
import styles from './TradePage.module.css';

const formatCurrency = (value, currency = 'LKR', locale = 'en-LK') => {
    if (value === null || value === undefined || isNaN(value)) {
        return 'N/A';
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
        return `${currency} ${value.toFixed(2)}`;
    }
};

export default function TradePage() {
    const [userData, setUserData] = useState(null);
    const [marketData, setMarketData] = useState(null);
    const [tradeType, setTradeType] = useState('buy');
    const [amount, setAmount] = useState(tradeType === 'buy' ? 900 : 1);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [timingSuggestion, setTimingSuggestion] = useState('Loading suggestion...');
    const [autoInvest, setAutoInvest] = useState(false);
    const [autoInvestFrequency, setAutoInvestFrequency] = useState('daily');
    const [autoInvestDate, setAutoInvestDate] = useState('');

    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingMarket, setLoadingMarket] = useState(true);
    const [loadingSuggestion, setLoadingSuggestion] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [successPopup, setSuccessPopup] = useState({
        show: false,
        title: '',
        gold: '',
        total: '',
        method: '',
        autoInvestDetails: '',
    });

    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('userToken');
        if (!token) {
            router.push('/');
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        const fetchInitialData = async () => {
            setLoadingUser(true);
            setLoadingMarket(true);
            setLoadingSuggestion(true);
            setError('');
            try {
                const [userRes, marketRes, timingRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/users/me`, config),
                    axios.get(`${backendUrl}/api/market/gold-summary`),
                    axios.get(`${backendUrl}/api/ai/investment-timing`, config),
                ]);

                if (!userRes.data || !marketRes.data) {
                    throw new Error("Missing essential user or market data.");
                }

                setUserData(userRes.data);
                setMarketData(marketRes.data);
                setTimingSuggestion(timingRes.data?.suggestion || 'Suggestion currently unavailable.');
            } catch (err) {
                console.error("Error fetching trade page data:", err);
                setError("Failed to load necessary data. Please refresh.");
                setTimingSuggestion('Could not load suggestion.');
                if (err.response?.status === 401) {
                    localStorage.clear();
                    router.push('/');
                }
            } finally {
                setLoadingUser(false);
                setLoadingMarket(false);
                setLoadingSuggestion(false);
            }
        };
        fetchInitialData();
    }, [router]);

    const goldPricePerGram = marketData?.latestPricePerGram || 21563;
    const cashBalance = userData?.cashBalanceLKR ?? 50000;
    const goldBalance = userData?.goldBalanceGrams ?? 6.27;
    const feeRate = 0.02;

    const tradeSummary = useMemo(() => {
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
            fee = inputAmount * feeRate;
            calculatedCash = inputAmount + fee;
            meetsMinimum = inputAmount >= 100;
            isValid = meetsMinimum && calculatedGold > 0;
        } else {
            calculatedGold = inputAmount;
            calculatedCash = inputAmount * goldPricePerGram;
            fee = calculatedCash * feeRate;
            calculatedCash -= fee;
            meetsMinimum = inputAmount >= 0.01;
            isValid = meetsMinimum && calculatedCash > 0;
        }

        return {
            goldAmountStr: `${calculatedGold.toFixed(4)} g`,
            feeStr: formatCurrency(fee),
            totalStr: formatCurrency(calculatedCash),
            isValid: isValid,
            meetsMinimum: meetsMinimum,
            totalCashValue: calculatedCash,
            goldToTrade: calculatedGold,
        };
    }, [tradeType, amount, goldPricePerGram, feeRate]);

    const handleTradeTypeChange = (e) => {
        const newType = e.target.value;
        setTradeType(newType);
        setAmount(newType === 'buy' ? 900 : 1);
        setPaymentMethod('');
        setError('');
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (/^[0-9]*\.?[0-9]*$/.test(value)) {
            setAmount(value);
        } else if (value === '') {
            setAmount('');
        }
        setError('');
    };

    const handleAmountButtonClick = (valueStr) => {
        const value = parseFloat(valueStr.replace(/Rs\. | g|,/g, ''));
        setAmount(isNaN(value) ? '' : value.toString());
        setError('');
    };

    const handleAutoInvestChange = (e) => {
        setAutoInvest(e.target.checked);
    };

    const handleAutoInvestFrequencyChange = (e) => {
        setAutoInvestFrequency(e.target.value);
    };

    const handleAutoInvestDateChange = (e) => {
        setAutoInvestDate(e.target.value);
    };

    const handleConfirmTrade = async () => {
        setError('');
        const currentAmount = parseFloat(amount) || 0;

        if (currentAmount <= 0) {
            setError(`Please enter a valid ${tradeType === 'buy' ? 'amount' : 'gold amount'}.`);
            return;
        }
        if (!tradeSummary.meetsMinimum) {
            setError(`Minimum ${tradeType === 'buy' ? `amount is ${formatCurrency(100)}` : 'amount is 0.01g'}.`);
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

        setSubmitLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
            setError('Authentication error. Please log in again.');
            setSubmitLoading(false);
            router.push('/');
            return;
        }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            let responseData;
            let successTitle = '';
            let successMethod = paymentMethod === 'wallet-cash' ? 'Wallet Cash' : paymentMethod === 'payhere' ? 'Card Payment through Payhere' : 'PayPal';

            let autoInvestText = '';
            if (tradeType === 'buy' && autoInvest) {
                if (autoInvestFrequency === 'monthly' && !autoInvestDate) {
                    setError('Please select a date for monthly auto-investment.');
                    setSubmitLoading(false);
                    return;
                }
                autoInvestText = autoInvestFrequency === 'monthly' ? `${autoInvestFrequency} on day ${autoInvestDate}` : autoInvestFrequency;
            }

            if (tradeType === 'buy') {
                successTitle = 'Payment Done';
                const payload = { amountLKR: parseFloat(amount) };
                const { data } = await axios.post(`${backendUrl}/api/investments/invest`, payload, config);
                responseData = data;
                setUserData(prev => ({
                    ...prev,
                    goldBalanceGrams: data.newGoldBalanceGrams,
                    cashBalanceLKR: paymentMethod === 'wallet-cash' ? data.newCashBalanceLKR : prev?.cashBalanceLKR,
                    transactions: [...(prev?.transactions || []), data.transaction],
                }));
            } else {
                successTitle = 'Deposited';
                const payload = { amountGrams: parseFloat(amount) };
                const { data } = await axios.post(`${backendUrl}/api/sell/gold`, payload, config);
                responseData = data;
                setUserData(prev => ({
                    ...prev,
                    goldBalanceGrams: data.newGoldBalanceGrams,
                    cashBalanceLKR: data.newCashBalanceLKR,
                    transactions: [...(prev?.transactions || []), data.transaction],
                }));
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
        } catch (err) {
            setError(err.response?.data?.message || `Trade failed. Please try again.`);
            console.error("Trade Error:", err.response || err);
        } finally {
            setSubmitLoading(false);
        }
    };

    const hideSuccessPopup = () => setSuccessPopup({ ...successPopup, show: false });

    const isLoading = loadingUser || loadingMarket || loadingSuggestion;
    if (isLoading) return (
        <>
            <NavbarInternal />
            <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                <div className={`${styles.card} text-center p-6`}>Loading Trade Data...</div>
            </div>
            <FooterInternal />
        </>
    );

    if (error && !userData && !marketData) return (
        <>
            <NavbarInternal />
            <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                <div className={`${styles.card} text-center p-6 ${styles.error}`}>Error: {error}</div>
            </div>
            <FooterInternal />
        </>
    );

    if (!userData || !marketData || goldPricePerGram <= 0) return (
        <>
            <NavbarInternal />
            <div className="flex justify-center items-center min-h-[calc(100vh-120px)] p-4">
                <div className={`${styles.card} text-center p-6 text-orange-600`}>Could not load essential trade data (User: {userData ? 'OK' : 'Failed'}, Market: {marketData ? 'OK' : 'Failed'}, Price: {goldPricePerGram > 0 ? 'OK' : 'Zero/Failed'}). Please try refreshing.</div>
            </div>
            <FooterInternal />
        </>
    );

    // Updated quick amount options
    const amountOptions = tradeType === 'buy' ? [100, 500, 1000, 5000, 10000] : [0.1, 0.5, 1, 5, 10];

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
                                    {marketData.trend === 'up' ? 'Up' : marketData.trend === 'down' ? 'Down' : ''} {marketData.priceChangePercent.toFixed(1)}% today
                                </p>
                            )}
                            <p className={styles.recentActivity}>{timingSuggestion}</p>
                        </div>
                        <div className={styles.divider}></div>
                        <div className={styles.balanceRight}>
                            <div className={styles.balanceHeader}>
                                <div className={styles.iconCircle}>
                                    <Image src="/gold-icon.png" alt="Gold" width={16} height={16} className={styles.goldIcon} />
                                </div>
                                <p>Your Balances</p>
                            </div>
                            <h2 id="user-balances">{formatCurrency(cashBalance)} | {goldBalance.toFixed(2)} g</h2>
                            <p className={styles.recentActivity}>Cash | Gold Owned</p>
                        </div>
                    </div>
                </div>

                <div className={`${styles.card} ${styles.tradeGoldCard}`}>
                    <h3>Trade Gold</h3>
                    {error && <p className={styles.error}>{error}</p>}
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
                                    placeholder={tradeType === 'buy' ? 'Min Rs. 100' : 'Min 0.01 g'}
                                    className={styles.inputField}
                                    aria-label="Enter amount to trade"
                                />
                            </div>
                            <div className={styles.amountOptions}>
                                {amountOptions.map(val => (
                                    <button key={val} onClick={() => handleAmountButtonClick(tradeType === 'buy' ? `Rs. ${val}` : `${val} g`)}>
                                        {tradeType === 'buy' ? `Rs. ${val}` : `${val} g`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tradeType === 'buy' && (
                            <div className={styles.autoInvestOptions} id="auto-invest-options">
                                <div className={styles.autoInvestToggle}>
                                    <label htmlFor="auto-invest">Enable Auto-Invest</label>
                                    <input type="checkbox" id="auto-invest" checked={autoInvest} onChange={handleAutoInvestChange} />
                                </div>
                                {autoInvest && (
                                    <div id="auto-invest-details">
                                        <label>Frequency</label>
                                        <select id="auto-invest-frequency" value={autoInvestFrequency} onChange={handleAutoInvestFrequencyChange}>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                        {autoInvestFrequency === 'monthly' && (
                                            <div id="monthly-date" className="mt-2">
                                                <label>Select Date</label>
                                                <select id="auto-invest-date" value={autoInvestDate} onChange={handleAutoInvestDateChange}>
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
                            <h4>{tradeType === 'buy' ? 'Payment Method' : 'Deposit Method'}</h4>
                            <label>
                                <input
                                    type="radio"
                                    name="payment"
                                    value="wallet-cash"
                                    checked={paymentMethod === 'wallet-cash'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                Wallet Cash
                            </label>
                            {tradeType === 'buy' ? (
                                <>
                                    <label>
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="payhere"
                                            checked={paymentMethod === 'payhere'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        />
                                        Card Payment through Payhere <Image src="/paytm-icon.png" alt="Payhere" width={60} height={15} />
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="paypal"
                                            checked={paymentMethod === 'paypal'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        />
                                        PayPal <Image src="/paypal-icon.png" alt="PayPal" width={60} height={15} />
                                    </label>
                                </>
                            ) : (
                                <label>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="paypal"
                                        checked={paymentMethod === 'paypal'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    PayPal <Image src="/paypal-icon.png" alt="PayPal" width={60} height={15} />
                                </label>
                            )}
                        </div>

                        {parseFloat(amount) > 0 && tradeSummary.isValid && (
                            <div className={styles.tradeSummary}>
                                <p>Gold to Trade: <span id="gold-amount" className="font-semibold">{tradeSummary.goldAmountStr}</span></p>
                                <p>Fee: <span id="trade-fee" className="font-semibold">{tradeSummary.feeStr} (2%)</span></p>
                                <p>Total: <span id="trade-total" className={`font-bold ${tradeType === 'buy' ? styles.positive : styles.negative}`}>{tradeSummary.totalStr}</span></p>
                            </div>
                        )}

                        <div className={styles.redeemAction}>
                            <button
                                className={`${styles.btnPrimary} w-full max-w-xs`}
                                id="confirm-trade"
                                onClick={handleConfirmTrade}
                                disabled={submitLoading || !tradeSummary.isValid || !tradeSummary.meetsMinimum || (tradeType === 'buy' && paymentMethod === 'wallet-cash' && tradeSummary.totalCashValue > cashBalance) || (tradeType === 'sell' && tradeSummary.goldToTrade > goldBalance)}
                            >
                                {submitLoading ? 'Processing...' : 'Confirm Trade'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {successPopup.show && (
                <div className={styles.successPopup} id="trade-success-popup" style={{ display: 'block' }}>
                    <h3 id="success-title">{successPopup.title}</h3>
                    <p id="success-gold">Gold Amount: {successPopup.gold}</p>
                    <p id="success-total">Total: {successPopup.total}</p>
                    <p id="success-payment">Via: {successPopup.method}</p>
                    {successPopup.autoInvestDetails && (
                        <p id="success-auto-invest">Auto-Invest: {successPopup.autoInvestDetails}</p>
                    )}
                    <button className={styles.btnPrimary} id="success-close" onClick={hideSuccessPopup}>Close</button>
                </div>
            )}

            <FooterInternal />
        </>
    );
}