// src/app/withdraw/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import styles from './Withdraw.module.css';

const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value || 0);

export default function WithdrawPage() {
    const [amountLKR, setAmountLKR] = useState(100);
    const [withdrawMethod, setWithdrawMethod] = useState('bank-transfer');
    const withdrawalFee = Math.max(30); // Example: 1% or Rs. 50 minimum
    
    const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', accountHolder: '' });
    const [paypalEmail, setPaypalEmail] = useState('');

    const [currentBalance, setCurrentBalance] = useState(0);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        const fetchBalance = async () => {
            setLoadingUser(true);
            const token = localStorage.getItem('userToken');
            if (!token) { router.push('/'); return; }
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            try {
                const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
                setCurrentBalance(data.cashBalanceLKR || 0);
            } catch (err) {
                setError("Failed to load current balance.");
                if (err.response?.status === 401) { localStorage.clear(); router.push('/'); }
            } finally {
                setLoadingUser(false);
            }
        };
        fetchBalance();
    }, [router]);

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setError(''); setSuccessMessage(''); setLoading(true);

        if (amountLKR < 100) { setError('Minimum withdrawal is Rs. 100.'); setLoading(false); return; }
        if (amountLKR > currentBalance) { setError('Amount exceeds available balance.'); setLoading(false); return; }

        let detailsToSend = {};
        if (withdrawMethod === 'bank-transfer') {
            if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountHolder) {
                setError('Please fill in all bank details.'); setLoading(false); return;
            }
            detailsToSend = bankDetails;
        } else {
             setError('Selected withdrawal method is not yet supported.'); setLoading(false); return;
        }

        const token = localStorage.getItem('userToken');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.post(`${backendUrl}/api/wallet/withdraw`, { amountLKR, bankDetails: detailsToSend }, config);
            setSuccessMessage(data.message || 'Withdrawal request submitted!');
        } catch (err) {
            setError(err.response?.data?.message || 'Withdrawal failed.');
        } finally {
            setLoading(false);
        }
    };

     const closePopupAndRedirect = () => {
        setSuccessMessage('');
        router.push('/wallet');
    };

    return (
        <>
            <NavbarInternal />
            <main className={styles.pageWrapper}>
                <div className={styles.card}>
                    <h3 className={styles.header}>Withdraw Money</h3>
                    
                    {successMessage && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                            <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
                                <span className="text-5xl text-blue-500 block mb-4">✓</span>
                                <h4 className="text-lg font-semibold mb-3">Withdrawal Submitted!</h4>
                                <p className="text-gray-700 mb-6">{successMessage}</p>
                                <button onClick={closePopupAndRedirect} className="btn btn-primary w-full">
                                    Go to Wallet
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {error && <p className="error text-center mb-4">{error}</p>}

                    <div className={styles.balanceDisplay}>
                        <p className={styles.balanceLabel}>Available to Withdraw</p>
                        {loadingUser ? (
                            <div className="skeleton h-8 w-40 mx-auto mt-1 bg-gray-300 rounded"></div>
                        ) : (
                            <p className={styles.balanceValue}>{formatCurrency(currentBalance)}</p>
                        )}
                    </div>

                    <form onSubmit={handleWithdraw}>
                        <div className={styles.formGroup}>
                            <label htmlFor="withdraw-amount" className={styles.formLabel}>Amount (LKR)</label>
                            <input type="number" id="withdraw-amount" min="100" step="100" required value={amountLKR}
                                onChange={(e) => setAmountLKR(Number(e.target.value))} className={styles.formInput} />
                            {amountLKR > currentBalance && <p className="text-xs text-red-500 mt-1">Amount exceeds available balance.</p>}
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="withdraw-method" className={styles.formLabel}>Withdrawal Method</label>
                            <select id="withdraw-method" value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)} className={styles.formSelect}>
                                <option value="bank-transfer">Bank Transfer (Sri Lanka)</option>
                                <option value="paypal" disabled>PayPal (Coming Soon)</option>
                            </select>
                        </div>

                        {withdrawMethod === 'bank-transfer' && (
                            <div className={styles.bankDetailsSection}>
                                 <h4 className={styles.bankDetailsHeader}>Bank Details</h4>
                                 <div className={styles.formGroup}>
                                     <label htmlFor="accountHolder" className={styles.formLabel}>Account Holder Name</label>
                                     <input type="text" id="accountHolder" value={bankDetails.accountHolder} onChange={(e) => setBankDetails({...bankDetails, accountHolder: e.target.value})} required className={styles.formInput}/>
                                 </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="accountNumber" className={styles.formLabel}>Account Number</label>
                                    <input type="text" id="accountNumber" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})} required className={styles.formInput}/>
                                </div>
                                 <div className={styles.formGroup}>
                                    <label htmlFor="bankName" className={styles.formLabel}>Bank Name</label>
                                    <input type="text" id="bankName" value={bankDetails.bankName} onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})} required className={styles.formInput}/>
                                </div>
                            </div>
                        )}

                        <div className={styles.summary}>
                            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Amount to Withdraw:</span> <span className={styles.summaryValue}>{formatCurrency(amountLKR)}</span></div>
                            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Fees (Estimated):</span> <span className={styles.summaryValue}>{formatCurrency(withdrawalFee)}</span></div>
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}><span>You Will Receive ≈</span> <span>{formatCurrency(Math.max(0, amountLKR - withdrawalFee))}</span></div>
                        </div>

                        <div className={styles.actions}>
                            <button type="submit" className={styles.primaryButton} disabled={loading || loadingUser || !!successMessage || amountLKR > currentBalance}>
                                {loading ? 'Submitting...' : 'Proceed to Withdraw'}
                            </button>
                             <Link href="/wallet" className={`${styles.secondaryButton} ${loading || successMessage ? 'pointer-events-none opacity-50' : ''}`}>
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </main>
            <FooterInternal />
        </>
    );
}