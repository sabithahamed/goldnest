// src/app/withdraw/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import styles from './Withdraw.module.css';
import { useModal } from '@/contexts/ModalContext'; // Import the modal hook

// Helper
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value || 0);

export default function WithdrawPage() {
    const { openGenericModal } = useModal(); // Get the modal function
    const router = useRouter();

    const [amountLKR, setAmountLKR] = useState(100);
    const [withdrawMethod, setWithdrawMethod] = useState('bank-transfer');
    const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', accountHolder: '' });
    
    const [currentBalance, setCurrentBalance] = useState(0);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loading, setLoading] = useState(false);
    
    // REMOVED: Old state for popups and errors is no longer needed
    // const [error, setError] = useState('');
    // const [successMessage, setSuccessMessage] = useState('');

    const withdrawalFee = Math.max(50, amountLKR * 0.01); // Example fee logic

    useEffect(() => {
        const fetchBalance = async () => {
            setLoadingUser(true);
            const token = localStorage.getItem('userToken');
            if (!token) { 
                openGenericModal('Authentication Error', 'Please log in to continue.', 'error');
                router.push('/');
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            try {
                const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
                setCurrentBalance(data.cashBalanceLKR || 0);
            } catch (err) {
                console.error("Error fetching balance:", err);
                openGenericModal('Load Failed', err.response?.data?.message || 'Failed to load your current balance.', 'error');
                if (err.response?.status === 401) { localStorage.clear(); router.push('/'); }
            } finally {
                setLoadingUser(false);
            }
        };
        fetchBalance();
    }, [router, openGenericModal]);

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setLoading(true);

        // --- Validation using Generic Modal ---
        if (amountLKR < 100) {
            openGenericModal('Invalid Amount', 'Minimum withdrawal amount is Rs. 100.', 'error');
            setLoading(false);
            return;
        }
        if (amountLKR > currentBalance) {
            openGenericModal('Insufficient Balance', 'Withdrawal amount exceeds your available balance.', 'error');
            setLoading(false);
            return;
        }
        if (withdrawMethod === 'bank-transfer' && (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountHolder)) {
            openGenericModal('Missing Details', 'Please fill in all bank details for the transfer.', 'error');
            setLoading(false);
            return;
        }
        if (withdrawMethod === 'paypal') {
             openGenericModal('Info', 'PayPal withdrawals are not yet implemented.', 'info');
             setLoading(false);
             return;
        }
        
        const token = localStorage.getItem('userToken');
        if (!token) { 
            openGenericModal('Authentication Error', 'Your session has expired. Please log in again.', 'error');
            setLoading(false);
            return; 
        }

        try {
            const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const payload = { amountLKR, bankDetails };

            const { data } = await axios.post(`${backendUrl}/api/wallet/withdraw`, payload, config);

            // --- Success using Generic Modal ---
            openGenericModal(
                'Request Submitted!',
                data.message || 'Your withdrawal request has been successfully submitted for processing.',
                'success'
            );
            // Redirect after the user closes the modal
            router.push('/wallet');

        } catch (err) {
            // --- Error using Generic Modal ---
            openGenericModal(
                'Withdrawal Failed',
                err.response?.data?.message || 'An unexpected error occurred. Please try again.',
                'error'
            );
            console.error("Withdraw Error:", err);
        } finally {
            setLoading(false);
        }
    };
    
    // REMOVED: The closePopupAndRedirect function is no longer needed.

    return (
        <>
            <NavbarInternal />
            <main className={styles.pageWrapper}>
                <div className={styles.card}>
                    <h3 className={styles.header}>Withdraw Money</h3>
                    
                    {/* REMOVED: The manual success popup and error message JSX are gone. */}

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
                            <button type="submit" className={styles.primaryButton} disabled={loading || loadingUser || amountLKR > currentBalance}>
                                {loading ? 'Submitting...' : 'Proceed to Withdraw'}
                            </button>
                             <Link href="/wallet" className={`${styles.secondaryButton} ${loading ? 'pointer-events-none opacity-50' : ''}`}>
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