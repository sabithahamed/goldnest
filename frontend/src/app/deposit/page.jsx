// src/app/deposit/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';

// Helpers
const formatCurrency = (value) => { /* ... */ };

export default function DepositPage() {
    const [amountLKR, setAmountLKR] = useState(100); // Default to min 100
    const [paymentMethod, setPaymentMethod] = useState('payhere'); // Default, use PayHere/PayPal/etc.
    const [promoCode, setPromoCode] = useState('');
    // Simulate fees for display (backend doesn't apply fees on deposit for now)
    const depositFee = amountLKR * 0.00; // Example: 0% fee for deposit simulation
    const totalDeposit = amountLKR; // Total is just the amount for now

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();

    // Fetch current balance if needed for display (optional)
    // const [currentBalance, setCurrentBalance] = useState(0);
    // useEffect(() => { /* fetch /api/users/me */ }, []);

    const handleDeposit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (amountLKR < 100) {
            setError('Minimum deposit amount is Rs. 100.');
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('userToken');
        if (!token) {
            setError('Authentication error. Please log in.');
            setLoading(false);
            return;
        }

        try {
            const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const payload = { amountLKR: amountLKR };

            const { data } = await axios.post(`${backendUrl}/api/wallet/deposit`, payload, config);

            setSuccessMessage(data.message || 'Deposit successful! Balance updated.');
            // Don't redirect immediately, show success

        } catch (err) {
            setError(err.response?.data?.message || 'Deposit failed. Please try again.');
            console.error("Deposit Error:", err);
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
            <section className="wallet"> {/* Using common class for padding */}
                <div className="card max-w-md mx-auto"> {/* Center card */}
                    <h3 className="text-xl font-semibold mb-6 text-center">Deposit Money</h3>
                    <div className="deposit-section">

                        {/* --- Success Popup --- */}
                        {successMessage && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                                <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
                                    <span className="text-5xl text-green-500 block mb-4">✓</span>
                                    <h4 className="text-lg font-semibold mb-3">Deposit Successful!</h4>
                                    <p className="text-gray-700 mb-6">{successMessage}</p>
                                    <button onClick={closePopupAndRedirect} className="btn btn-primary w-full">
                                        Go to Wallet
                                    </button>
                                </div>
                            </div>
                        )}

                         {error && <p className="error text-center mb-4">{error}</p>}

                        <form id="deposit-form" onSubmit={handleDeposit}>
                            <div className="form-group">
                                <label htmlFor="deposit-amount" className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR):</label>
                                <input
                                    type="number"
                                    id="deposit-amount"
                                    name="deposit-amount"
                                    min="100"
                                    step="100"
                                    required
                                    value={amountLKR}
                                    onChange={(e) => setAmountLKR(Number(e.target.value))}
                                    className="input-field w-full"
                                    aria-label="Enter deposit amount in rupees"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700 mb-1">Payment Method (Simulated):</label>
                                <select
                                    id="payment-method"
                                    name="payment-method"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="input-field w-full bg-white" // Ensure background for select
                                    aria-label="Select payment method"
                                >
                                     {/* Use relevant local providers */}
                                    <option value="payhere">PayHere (Card/Bank)</option>
                                    <option value="frimi">FriMi</option>
                                     <option value="ezcash">Dialog ezCash</option>
                                    <option value="paypal">PayPal</option>
                                    {/* Add other simulated options */}
                                </select>
                                 <p className="text-xs text-gray-500 mt-1">Note: Payment gateway integration is simulated.</p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="promo-code" className="block text-sm font-medium text-gray-700 mb-1">Promo Code (Optional):</label>
                                <input
                                    type="text"
                                    id="promo-code"
                                    name="promo-code"
                                    placeholder="Enter promo code"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    className="input-field w-full"
                                    aria-label="Enter promo code if applicable"
                                />
                            </div>
                            <div className="deposit-summary border-t pt-4 mt-4 text-sm space-y-1">
                                <p>Total Deposit: <span id="total-deposit" className="font-medium">{formatCurrency(totalDeposit)}</span></p>
                                <p>Fees (Simulated): <span id="deposit-fees" className="font-medium">{formatCurrency(depositFee)}</span></p>
                            </div>
                            <div className="form-actions mt-6 flex flex-col sm:flex-row gap-3">
                                <button type="submit" className="btn btn-primary flex-grow" disabled={loading || !!successMessage}>
                                    {loading ? 'Processing...' : 'Proceed to Deposit'}
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