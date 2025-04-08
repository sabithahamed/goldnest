// src/app/withdraw/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';

// Helpers
const formatCurrency = (value) => { /* ... */ };

export default function WithdrawPage() {
    const [amountLKR, setAmountLKR] = useState(100); // Default to min 100
    const [withdrawMethod, setWithdrawMethod] = useState('bank-transfer');
    // Simulate fees for display (backend doesn't apply fees for now)
    const withdrawalFee = Math.max(50, amountLKR * 0.01); // Example: 1% or Rs. 50 minimum
    const totalWithdrawal = amountLKR; // Amount user enters

    const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', accountHolder: '' }); // For bank transfer
    const [paypalEmail, setPaypalEmail] = useState(''); // For PayPal

    const [currentBalance, setCurrentBalance] = useState(0);
    const [loadingUser, setLoadingUser] = useState(true); // Loading state for user data
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();

    // Fetch current balance
    useEffect(() => {
        const fetchBalance = async () => {
            setLoadingUser(true);
            const token = localStorage.getItem('userToken');
            if (!token) { router.push('/'); return; } // Redirect if not logged in
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            try {
                const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
                setCurrentBalance(data.cashBalanceLKR || 0);
            } catch (err) {
                console.error("Error fetching balance:", err);
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
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (amountLKR < 100) {
            setError('Minimum withdrawal amount is Rs. 100.'); setLoading(false); return;
        }
        if (amountLKR > currentBalance) {
            setError('Withdrawal amount exceeds available balance.'); setLoading(false); return;
        }

        let detailsToSend = {};
        if (withdrawMethod === 'bank-transfer') {
            if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountHolder) {
                setError('Please fill in all bank details for bank transfer.'); setLoading(false); return;
            }
            detailsToSend = bankDetails;
        } else if (withdrawMethod === 'paypal') {
            if (!paypalEmail) {
                 setError('Please enter your PayPal email address.'); setLoading(false); return;
            }
             detailsToSend = { paypalEmail: paypalEmail }; // Send relevant detail
        } else {
             setError('Selected withdrawal method currently not supported for details.'); setLoading(false); return;
             // Handle other methods if necessary
        }


        const token = localStorage.getItem('userToken');
        if (!token) { setError('Authentication error.'); setLoading(false); return; }

        try {
            const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const payload = {
                amountLKR: amountLKR,
                bankDetails: detailsToSend // Send appropriate details object
            };

            const { data } = await axios.post(`${backendUrl}/api/wallet/withdraw`, payload, config);

            setSuccessMessage(data.message || 'Withdrawal request submitted!');
            // Fetch updated balance after success? Or rely on redirect?
            // setCurrentBalance(data.newCashBalanceLKR); // Update balance immediately

        } catch (err) {
            setError(err.response?.data?.message || 'Withdrawal failed. Please try again.');
            console.error("Withdraw Error:", err);
        } finally {
            setLoading(false);
        }
    };

     const closePopupAndRedirect = () => {
        setSuccessMessage('');
        router.push('/wallet'); // Redirect to wallet after closing
    }

    return (
        <>
            <NavbarInternal />
            <section className="wallet"> {/* Common padding */}
                <div className="card max-w-md mx-auto"> {/* Center card */}
                    <h3 className="text-xl font-semibold mb-6 text-center">Withdraw Money</h3>
                    <div className="withdraw-section">

                        {/* --- Success Popup --- */}
                        {successMessage && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                                <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
                                    <span className="text-5xl text-blue-500 block mb-4">✓</span> {/* Different color maybe */}
                                    <h4 className="text-lg font-semibold mb-3">Withdrawal Submitted!</h4>
                                    <p className="text-gray-700 mb-6">{successMessage}</p>
                                    <button onClick={closePopupAndRedirect} className="btn btn-primary w-full">
                                        Go to Wallet
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && <p className="error text-center mb-4">{error}</p>}

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
                                    max={currentBalance} // Set max based on balance
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
                                    {/* Add relevant methods */}
                                    <option value="bank-transfer">Bank Transfer (Sri Lanka)</option>
                                    <option value="paypal">PayPal</option>
                                    {/* <option value="paytm">Paytm</option> */}
                                </select>
                            </div>

                             {/* Conditional Fields based on Method */}
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
                                     {/* Add Branch if needed */}
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
                                <button type="submit" className="btn btn-primary flex-grow" disabled={loading || loadingUser || !!successMessage || amountLKR > currentBalance}>
                                    {loading ? 'Submitting Request...' : 'Proceed to Withdraw'}
                                </button>
                                 <Link href="/wallet" className={`btn btn-secondary flex-grow text-center ${loading || successMessage ? 'pointer-events-none opacity-50' : ''}`}>
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