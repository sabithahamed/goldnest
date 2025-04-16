// src/app/claim-reward/[id]/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';

// Helper Functions
const formatCurrency = (value, showCurrencySymbol = true) => {
    if (value === null || value === undefined || isNaN(value)) {
        return showCurrencySymbol ? 'Rs. 0.00' : '0.00';
    }
    const options = {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    };
    if (!showCurrencySymbol) {
        options.currencyDisplay = 'code';
    }
    let formatted = new Intl.NumberFormat('en-LK', options).format(value);
    if (!showCurrencySymbol) {
        formatted = formatted.replace('LKR', '').trim();
    } else {
        formatted = formatted.replace('LKR', 'Rs.');
    }
    return formatted;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        };
        return new Date(dateString).toLocaleString('en-US', options);
    } catch (e) {
        console.error('Error formatting date:', dateString, e);
        return 'Invalid Date';
    }
};

const formatGrams = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0g';
    }
    return `${Number(value).toFixed(1)}g`;
};

export default function ClaimRewardPage() {
    const [reward, setReward] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isClaimed, setIsClaimed] = useState(false);
    const router = useRouter();
    const { id } = useParams();

    // Data Fetching
    useEffect(() => {
        setLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const token = localStorage.getItem('userToken');

        const fetchReward = async () => {
            setError('');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                router.push('/');
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                // Assuming an endpoint for reward details
                const res = await axios.get(`${backendUrl}/api/rewards/${id}`, config);
                setReward(res.data);
                setIsClaimed(res.data.isClaimed || false);
            } catch (err) {
                console.error('Error fetching reward details:', err);
                const message = err.response?.data?.message || 'Failed to load reward details.';
                setError(message);
                if (err.response?.status === 401) {
                    localStorage.clear();
                    router.push('/');
                }
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchReward();
        }
    }, [id, router]);

    // Claim Reward
    const handleClaim = async () => {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const token = localStorage.getItem('userToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            await axios.post(`${backendUrl}/api/rewards/claim/${id}`, {}, config);
            setIsClaimed(true);
            alert(`Reward claimed successfully! ${reward.rewardText} has been added to your wallet.`);
        } catch (err) {
            console.error('Error claiming reward:', err);
            alert('Failed to claim reward.');
        }
    };

    if (loading) {
        return (
            <>
                <NavbarInternal />
                <section className="wallet bg-[#f5f5f5]">
                    <div className="card">
                        <h3>Claim Your Reward</h3>
                        <p>Loading...</p>
                    </div>
                </section>
                <FooterInternal />
            </>
        );
    }

    if (error || !reward) {
        return (
            <>
                <NavbarInternal />
                <section className="wallet bg-[#f5f5f5]">
                    <div className="card">
                        <h3>Claim Your Reward</h3>
                        <p className="error-message">{error || 'Reward not found.'}</p>
                    </div>
                </section>
                <FooterInternal />
            </>
        );
    }

    const { name = 'Gold Collector', description = 'Redeem your first 5g Coin', rewardText = '0.1g of bonus gold' } =
        reward;

    return (
        <>
            <NavbarInternal />
            <section className="wallet bg-[#f5f5f5]">
                <div className="card">
                    <h3>Claim Your Reward</h3>
                    <div className="claim-reward">
                        <div className="reward-details">
                            <i className="fas fa-trophy reward-icon"></i>
                            <h4>Congratulations!</h4>
                            <p>
                                You&apos;ve completed the <strong>{name}</strong> goal by {description.toLowerCase()}.
                            </p>
                            <p>
                                <strong>Reward:</strong> {rewardText}
                            </p>
                        </div>
                        <div className="reward-action">
                            <button
                                className="btn btn-primary"
                                id="claim-reward-btn"
                                onClick={handleClaim}
                                disabled={isClaimed}
                            >
                                {isClaimed ? 'Reward Claimed' : 'Claim Reward'}
                            </button>
                            <Link href="/wallet" className="btn btn-secondary">
                                Back to Wallet
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            <FooterInternal />
        </>
    );
}