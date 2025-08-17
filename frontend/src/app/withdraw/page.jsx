// src/app/withdraw/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import { useModal } from '@/contexts/ModalContext';

// Helpers
const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'Rs. 0.00';
    return `Rs. ${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export default function WithdrawPage() {
    const { openGenericModal } = useModal();
    const [amountLKR, setAmountLKR] = useState(100);
    const [withdrawMethod, setWithdrawMethod] = useState('bank-transfer');
    const withdrawalFee = Math.max(50, amountLKR * 0.01);
    const totalWithdrawal = amountLKR;

    const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', accountHolder: '' });
    const [paypalEmail, setPaypalEmail] = useState('');

    const [currentBalance, setCurrentBalance] = useState(0);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchBalance = async () => {
            setLoadingUser(true);
            const token = localStorage.getItem('userToken');
            if (!token) { 
                openGenericModal('Authentication Error', 'Please log in to view your balance.', 'error');
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
                const errorMessage = err.response?.data?.message || 'Failed to load current balance. Please check your network connection.';
                openGenericModal('Error', errorMessage, 'error');
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

        // Check for minimum amount first
        if (amountLKR < 100) {
            openGenericModal('Invalid Amount', 'Minimum withdrawal amount is Rs. 100.', 'error');
            setLoading(false);
            return;
        }

        // Check for withdrawal method
        if (withdrawMethod === 'paypal') {
            openGenericModal('PayPal Withdrawals', 'PayPal withdrawals are not yet implemented.', 'info');
            setLoading(false);
            return;
        }

        if (amountLKR > currentBalance) {
            openGenericModal('Insufficient Balance', 'Withdrawal amount exceeds available balance.', 'error');
            setLoading(false);
            return;
        }

        let payload;
        if (withdrawMethod === 'bank-transfer') {
            if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountHolder) {
                openGenericModal('Missing Details', 'Please fill in all bank details for bank transfer.', 'error');
                setLoading(false);
                return;
            }
            payload = {
                amountLKR: amountLKR,
                bankDetails: bankDetails
            };
        } else {
            // This case should not be hit with the new logic, but kept as a fallback
            openGenericModal('Unsupported Method', 'Selected withdrawal method currently not supported.', 'error');
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('userToken');
        if (!token) { 
            openGenericModal('Authentication Error', 'Authentication error. Please log in.', 'error');
            setLoading(false);
            return; 
        }

        try {
            const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

            const { data } = await axios.post(`${backendUrl}/api/wallet/withdraw`, payload, config);

            openGenericModal(
                'Withdrawal Submitted!',
                data.message || 'Your withdrawal request has been successfully submitted.',
                'success'
            );

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Withdrawal failed. Please check your network or try again later.';
            openGenericModal(
                'Withdrawal Failed',
                errorMessage,
                'error'
            );
            console.error("Withdraw Error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <NavbarInternal />
            <section className="wallet">
                <div className="card max-w-md mx-auto">
                    <h3 className="text-xl font-semibold mb-6 text-center">Withdraw Money</h3>
                    <div className="withdraw-section">
                        <form id="withdraw-form" onSubmit={handleWithdraw}>
                            <div className="form-group mb-4 p-3 bg-gray-50 rounded border">
                                <p className="text-sm text-gray-600">Available Balance:</p>
                                {loadingUser ? (
                                    <div className="skeleton skeleton-text skeleton-text-medium h-6 mt-1"></div>
                                ) : (
                                    <span id="available-balance" className="text-lg font-semibold">{formatCurrency(currentBalance)}</span>
                                )}
                            </div>
                            <div className="form-group">
                                <label htmlFor="withdraw-amount" className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR):</label>
                                <input
                                    type="number"
                                    id="withdraw-amount"
                                    name="withdraw-amount"
                                    min="100"
                                    step="100"
                                    required
                                    value={amountLKR}
                                    onChange={(e) => setAmountLKR(Number(e.target.value))}
                                    className="input-field w-full"
                                    aria-label="Enter withdrawal amount in rupees"
                                    max={currentBalance}
                                />
                                {amountLKR > currentBalance && <p className="text-xs text-red-500 mt-1">Amount exceeds available balance.</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="withdraw-method" className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Method:</label>
                                <select
                                    id="withdraw-method"
                                    name="withdraw-method"
                                    value={withdrawMethod}
                                    onChange={(e) => setWithdrawMethod(e.target.value)}
                                    className="input-field w-full bg-white"
                                    aria-label="Select withdrawal method"
                                >
                                    <option value="bank-transfer">Bank Transfer (Sri Lanka)</option>
                                    <option value="paypal">PayPal</option>
                                </select>
                            </div>

                            {withdrawMethod === 'bank-transfer' && (
                                <div className="space-y-3 border p-3 rounded mt-2 bg-gray-50">
                                    <h4 className="text-sm font-medium text-gray-600">Bank Details</h4>
                                    <div className="form-group">
                                        <label htmlFor="accountHolder" className="block text-xs font-medium text-gray-700 mb-1">Account Holder Name:</label>
                                        <input type="text" id="accountHolder" value={bankDetails.accountHolder} onChange={(e) => setBankDetails({...bankDetails, accountHolder: e.target.value})} required className="input-field w-full text-sm"/>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="accountNumber" className="block text-xs font-medium text-gray-700 mb-1">Account Number:</label>
                                        <input type="text" id="accountNumber" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})} required className="input-field w-full text-sm"/>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="bankName" className="block text-xs font-medium text-gray-700 mb-1">Bank Name:</label>
                                        <input type="text" id="bankName" value={bankDetails.bankName} onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})} required className="input-field w-full text-sm"/>
                                    </div>
                                </div>
                            )}
                            {withdrawMethod === 'paypal' && (
                                <div className="space-y-3 border p-3 rounded mt-2 bg-gray-50">
                                    <h4 className="text-sm font-medium text-gray-600">PayPal Details</h4>
                                    <div className="form-group">
                                        <label htmlFor="paypalEmail" className="block text-xs font-medium text-gray-700 mb-1">PayPal Email:</label>
                                        <input type="email" id="paypalEmail" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} required className="input-field w-full text-sm"/>
                                    </div>
                                </div>
                            )}

                            <div className="withdraw-summary border-t pt-4 mt-4 text-sm space-y-1">
                                <p>Amount to Withdraw: <span id="total-withdraw" className="font-medium">{formatCurrency(totalWithdrawal)}</span></p>
                                <p>Fees (Estimated): <span id="withdraw-fees" className="font-medium">{formatCurrency(withdrawalFee)}</span></p>
                                <p className="font-semibold">You Will Receive ≈ <span className="font-bold">{formatCurrency(Math.max(0, totalWithdrawal - withdrawalFee))}</span></p>
                            </div>
                            <div className="form-actions mt-6 flex flex-col sm:flex-row gap-3">
                                <button type="submit" className="btn btn-primary flex-grow" disabled={loading || loadingUser || amountLKR > currentBalance}>
                                    {loading ? 'Submitting Request...' : 'Proceed to Withdraw'}
                                </button>
                                <Link href="/wallet" className={`btn btn-secondary flex-grow text-center ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                                    Cancel
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
            <FooterInternal />
        </>
    );
}