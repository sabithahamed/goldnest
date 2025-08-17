// src/app/deposit/page.jsx
'use client';

import React, { useState, useMemo } from 'react'; // <-- FIXED IMPORT
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import styles from './Deposit.module.css';

const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value || 0);

export default function DepositPage() {
    const [amountLKR, setAmountLKR] = useState(100);
    const [paymentMethod, setPaymentMethod] = useState('payhere');
    const [promoCode, setPromoCode] = useState('');
    const [promoDetails, setPromoDetails] = useState(null);
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');
    const [isCheckingPromo, setIsCheckingPromo] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    
    const handleCheckPromo = async () => {
        if (!promoCode.trim()) { setPromoError("Please enter a code."); return; }
        setIsCheckingPromo(true);
        setPromoError(''); setPromoSuccess(''); setPromoDetails(null);
        try {
            const token = localStorage.getItem('userToken');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.post(`${backendUrl}/api/promos/validate`, { code: promoCode, promoType: 'DEPOSIT_BONUS' }, config);
            setPromoDetails(data);
            setPromoSuccess(data.description || "Promo code applied!");
        } catch (err) {
            setPromoError(err.response?.data?.message || "Invalid code.");
        } finally {
            setIsCheckingPromo(false);
        }
    };
    
    const bonusAmount = useMemo(() => {
        if (!promoDetails || !amountLKR) return 0;
        if (promoDetails.bonusType === 'PERCENTAGE_DEPOSIT') return amountLKR * (promoDetails.bonusValue / 100);
        if (promoDetails.bonusType === 'FLAT_LKR_DEPOSIT') return promoDetails.bonusValue;
        return 0;
    }, [promoDetails, amountLKR]);
    
    const totalCredited = amountLKR + bonusAmount;

    const handleProceedToPayment = (e) => {
        e.preventDefault();
        setError('');
        if (amountLKR < 100) { setError('Minimum deposit is Rs. 100.'); return; }
        
        sessionStorage.setItem('paymentDetails', JSON.stringify({
            amountToPay: amountLKR,
            bonus: bonusAmount,
            totalCredit: totalCredited,
            promoToApply: promoDetails ? promoDetails.code : ''
        }));
        router.push('/payment-simulation');
    };

    return (
        <>
            <NavbarInternal />
            <main className={styles.pageWrapper}>
                <div className={styles.card}>
                    <h3 className={styles.header}>Deposit Money</h3>
                    {error && <p className="error text-center mb-4">{error}</p>}
                    <form onSubmit={handleProceedToPayment}>
                        <div className={styles.formGroup}>
                            <label htmlFor="deposit-amount" className={styles.formLabel}>Amount to Pay (LKR)</label>
                            <input type="number" id="deposit-amount" min="100" step="100" required value={amountLKR}
                                onChange={(e) => setAmountLKR(Number(e.target.value))} className={styles.formInput} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="payment-method" className={styles.formLabel}>Payment Method</label>
                            <select id="payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={styles.formSelect}>
                                <option value="payhere">PayHere (Card/Bank)</option>
                                <option value="frimi" disabled>FriMi (Coming Soon)</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="promo-code" className={styles.formLabel}>Promo Code (Optional)</label>
                            <div className={styles.promoContainer}>
                                <input type="text" id="promo-code" placeholder="Enter promo code" value={promoCode}
                                    onChange={(e) => { setPromoCode(e.target.value); setPromoSuccess(''); setPromoError(''); setPromoDetails(null); }}
                                    className={`${styles.formInput} ${styles.promoInput}`} />
                                <button type="button" onClick={handleCheckPromo} disabled={isCheckingPromo || promoSuccess}
                                    className={`${styles.applyButton} ${promoSuccess ? styles.appliedButton : ''}`}>
                                    {isCheckingPromo ? '...' : promoSuccess ? '✓ Applied' : 'Apply'}
                                </button>
                            </div>
                            {promoError && <p className={`${styles.promoMessage} ${styles.promoError}`}>{promoError}</p>}
                            {promoSuccess && <p className={`${styles.promoMessage} ${styles.promoSuccess}`}>{promoSuccess}</p>}
                        </div>
                        <div className={styles.summary}>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>You Pay:</span>
                                <span className={styles.summaryValue}>{formatCurrency(amountLKR)}</span>
                            </div>
                            {bonusAmount > 0 && (
                                <div className={`${styles.summaryRow} ${styles.summaryBonus}`}>
                                    <span>Promo Bonus:</span> 
                                    <span>+{formatCurrency(bonusAmount)}</span>
                                </div>
                            )}
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                <span>Total Credited to Wallet:</span> 
                                <span>{formatCurrency(totalCredited)}</span>
                            </div>
                        </div>
                        <div className={styles.actions}>
                            <button type="submit" className={styles.primaryButton}>Proceed to Payment</button>
                            <Link href="/wallet" className={styles.secondaryButton}>Cancel</Link>
                        </div>
                    </form>
                </div>
            </main>
            <FooterInternal />
        </>
    );
}