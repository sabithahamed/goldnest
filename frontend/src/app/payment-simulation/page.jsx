// src/app/payment-simulation/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import styles from './PaymentSimulation.module.css';

const formatCurrency = (value) => {
    if (value === null || isNaN(value)) return 'LKR 0.00';
    return `LKR ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function PaymentSimulationPage() {
    const router = useRouter();
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const detailsString = sessionStorage.getItem('paymentDetails');
        if (detailsString) {
            setPaymentDetails(JSON.parse(detailsString));
            // sessionStorage.removeItem('paymentDetails'); // Don't remove yet
        } else {
            setError("Payment details not found. Redirecting...");
            // Redirect to deposit as it's the most common entry point
            setTimeout(() => router.push('/deposit'), 2000);
        }
    }, [router]);
    
    const handleConfirmPayment = async () => {
        if (!paymentDetails) {
            setError("Payment details are missing.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                setError("Authentication error. Please log in again.");
                setLoading(false);
                return;
            }

            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            
            // The logic now differentiates based on which sessionStorage item is present
            const investmentDetailsString = sessionStorage.getItem('investmentDetails');
            const depositDetailsString = sessionStorage.getItem('paymentDetails');

            if (investmentDetailsString) { // This is a direct GOLD PURCHASE
                const investmentDetails = JSON.parse(investmentDetailsString);
                const payload = { 
                    ...investmentDetails,
                    paymentSource: 'direct' // Assuming a field to denote direct card payment
                };
                await axios.post(`${backendUrl}/api/investments/invest`, payload, config);
                sessionStorage.removeItem('investmentDetails');
            } else if (depositDetailsString) { // This is a WALLET DEPOSIT
                // The paymentDetails from state already has the structured data
                const payload = { 
                    amountLKR: paymentDetails.amountToPay, 
                    promoCode: paymentDetails.promoToApply 
                };
                await axios.post(`${backendUrl}/api/wallet/deposit`, payload, config);
            } else {
                throw new Error("No payment details found in session.");
            }

            // Clean up session storage and redirect on success
            sessionStorage.removeItem('paymentDetails');
            router.push('/payment-success');
        } catch (err) {
            setError(err.response?.data?.message || 'Payment processing failed. Please try again.');
            setLoading(false);
        }
    };

    if (!paymentDetails) {
        return (
            <main className={styles.pageWrapper}>
                 <div className={styles.paymentCard}>
                    <p className="text-center">{error || "Loading payment details..."}</p>
                 </div>
            </main>
        );
    }

    return (
        <main className={styles.pageWrapper}>
            <div className={styles.paymentCard}>
                <div className={styles.header}>
                    <div className="flex justify-center items-center gap-4 mb-4">
                        <Image src="/payhere-logo.png" alt="PayHere" width={128} height={32} />
                    </div>
                    <h2 className={styles.title}>Secure Payment</h2>
                    <p className={styles.subtitle}>You are paying to GoldNest</p>
                </div>
                
                {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}

                <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Payment Amount:</span>
                        <span className={styles.summaryValue}>{formatCurrency(paymentDetails?.amountToPay || 0)}</span>
                    </div>
                     {paymentDetails?.bonusAmount > 0 && (
                        <div className={`${styles.summaryRow} text-green-600`}>
                           <span className={styles.summaryLabel}>Promo Bonus:</span>
                           <span className={styles.summaryValue}>+{formatCurrency(paymentDetails.bonusAmount)}</span>
                        </div>
                     )}
                </div>

                <p className={styles.disclaimer}>
                    This is a simulated payment gateway for demonstration purposes.
                </p>

                <button 
                    onClick={handleConfirmPayment}
                    disabled={loading || !paymentDetails}
                    className={styles.confirmButton}
                >
                    {loading ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i>Processing...</>
                    ) : (
                        `Confirm Payment of ${formatCurrency(paymentDetails?.amountToPay || 0)}`
                    )}
                </button>
                 <button 
                    onClick={() => router.back()}
                    className={styles.cancelButton}
                >
                    Cancel and return
                </button>
            </div>
        </main>
    );
}