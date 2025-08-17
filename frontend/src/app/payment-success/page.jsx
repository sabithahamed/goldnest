// src/app/payment-success/page.jsx
'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PaymentSuccess.module.css'; // <-- IMPORT THE NEW CSS MODULE

export default function PaymentSuccessPage() {
    const router = useRouter();

    // Automatically redirect to the wallet after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/wallet');
        }, 5000);

        // Cleanup timer if the component unmounts (e.g., user clicks the button first)
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <main className={styles.pageWrapper}>
            <div className={styles.successCard}>
                <div className={styles.iconWrapper}>
                    <i className={`fas fa-check ${styles.icon}`}></i>
                </div>
                <h1 className={styles.title}>Payment Successful!</h1>
                <p className={styles.subtitle}>
                    Your deposit has been confirmed and your wallet balance is updated.
                </p>
                <Link href="/wallet" className={styles.actionButton}>
                    Go to Wallet Now
                </Link>
                <div className={styles.redirectInfo}>
                    <p>You will be automatically redirected shortly...</p>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill}></div>
                    </div>
                </div>
            </div>
        </main>
    );
}