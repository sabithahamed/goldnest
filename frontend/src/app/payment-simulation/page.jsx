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
            // DO NOT clear storage here, the backend needs the promo code
        } else {
            setError("Payment details not found. Redirecting...");
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
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            
            // Send the amount to pay and the promo to apply
            const payload = { 
                amountLKR: paymentDetails.amountToPay, 
                promoCode: paymentDetails.promoToApply 
            };

            await axios.post(`${backendUrl}/api/wallet/deposit`, payload, config);
            
            // Clear storage AFTER successful API call
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
                        <span className={styles.summaryValue}>{formatCurrency(paymentDetails.amountToPay)}</span>
                    </div>
                     {paymentDetails.bonus > 0 && (
                        <div className={`${styles.summaryRow} text-green-600`}>
                           <span className={styles.summaryLabel}>Promo Bonus:</span>
                           <span className={styles.summaryValue}>+{formatCurrency(paymentDetails.bonus)}</span>
                        </div>
                     )}
                </div>

                <p className={styles.disclaimer}>
                    This is a simulated payment gateway for demonstration purposes.
                </p>

                <button 
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className={styles.confirmButton}
                >
                    {loading ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i>Processing...</>
                    ) : (
                        `Confirm Payment of ${formatCurrency(paymentDetails.amountToPay)}`
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