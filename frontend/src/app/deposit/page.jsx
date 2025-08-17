// src/app/deposit/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import { useModal } from '@/contexts/ModalContext'; // Import useModal hook

// Helpers
const formatCurrency = (value) => { 
    // This is a helper function you've defined, leaving it as-is.
    if (typeof value !== 'number') return 'Rs. 0.00';
    return `Rs. ${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export default function DepositPage() {
    const { openGenericModal } = useModal(); // Added openGenericModal
    const [amountLKR, setAmountLKR] = useState(100);
    const [paymentMethod, setPaymentMethod] = useState('payhere');
    const [promoCode, setPromoCode] = useState('');
    const depositFee = amountLKR * 0.00;
    const totalDeposit = amountLKR;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // No need for successMessage state anymore, as the modal will handle it.
    const router = useRouter();

    const handleDeposit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (amountLKR < 100) {
            // Using the new generic modal for validation error
            openGenericModal(
                'Invalid Amount',
                'Minimum deposit amount is Rs. 100.',
                'error'
            );
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('userToken');
        if (!token) {
            // Using the new generic modal for auth error
            openGenericModal(
                'Authentication Error',
                'Please log in to make a deposit.',
                'error'
            );
            setLoading(false);
            return;
        }

        try {
            const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const payload = { amountLKR: amountLKR };

            const { data } = await axios.post(`${backendUrl}/api/wallet/deposit`, payload, config);

            // SUCCESS: Use the generic modal
            openGenericModal(
                'Deposit Successful!',
                data.message || 'Deposit successful! Your balance has been updated.',
                'success'
            );

            // You can also add a logic to redirect after the user closes the modal
            // We can do this with a prop in the GenericModal or by changing the close function.
            // For now, let's keep it simple and just show the message.

        } catch (err) {
            // ERROR: Use the generic modal for API errors
            openGenericModal(
                'Deposit Failed',
                err.response?.data?.message || 'Deposit failed. Please try again.',
                'error'
            );
            console.error("Deposit Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // This function is no longer needed since the modal's internal close button will call onClose.
    // const closePopupAndRedirect = () => {
    //     setSuccessMessage('');
    //     router.push('/wallet');
    // }

    return (
        <>
            <NavbarInternal />
            <section className="wallet">
                <div className="card max-w-md mx-auto">
                    <h3 className="text-xl font-semibold mb-6 text-center">Deposit Money</h3>
                    <div className="deposit-section">

                        {/* REMOVED: The manual success popup is no longer needed */}
                        {/* {successMessage && (
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
                        )} */}
                        
                        {/* REMOVED: The local error message is no longer needed */}
                        {/* {error && <p className="error text-center mb-4">{error}</p>} */}

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
                                    className="input-field w-full bg-white"
                                    aria-label="Select payment method"
                                >
                                    <option value="payhere">PayHere (Card/Bank)</option>
                                    <option value="frimi">FriMi</option>
                                    <option value="ezcash">Dialog ezCash</option>
                                    <option value="paypal">PayPal</option>
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
                                <button type="submit" className="btn btn-primary flex-grow" disabled={loading}>
                                    {loading ? 'Processing...' : 'Proceed to Deposit'}
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