// src/app/redeem-details/[id]/page.jsx
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

export default function RedeemDetailsPage() {
    const [redemption, setRedemption] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const { id } = useParams();

    // Data Fetching
    useEffect(() => {
        setLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const token = localStorage.getItem('userToken');

        const fetchRedemption = async () => {
            setError('');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                router.push('/');
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                // Assuming an endpoint for redemption details
                const res = await axios.get(`${backendUrl}/api/redemptions/${id}`, config);
                setRedemption(res.data);
            } catch (err) {
                console.error('Error fetching redemption details:', err);
                const message = err.response?.data?.message || 'Failed to load redemption details.';
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
            fetchRedemption();
        }
    }, [id, router]);

    // Cancel Redemption
    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel this redemption?')) return;

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const token = localStorage.getItem('userToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            await axios.post(`${backendUrl}/api/redemptions/${id}/cancel`, {}, config);
            setRedemption((prev) => ({ ...prev, status: 'cancelled' }));
            alert('Redemption cancelled successfully.');
        } catch (err) {
            console.error('Error cancelling redemption:', err);
            alert('Failed to cancel redemption.');
        }
    };

    if (loading) {
        return (
            <>
                <NavbarInternal />
                <section className="wallet bg-[#f5f5f5]">
                    <div className="card">
                        <h3>Redeem Details</h3>
                        <p>Loading...</p>
                    </div>
                </section>
                <FooterInternal />
            </>
        );
    }

    if (error || !redemption) {
        return (
            <>
                <NavbarInternal />
                <section className="wallet bg-[#f5f5f5]">
                    <div className="card">
                        <h3>Redeem Details</h3>
                        <p className="error-message">{error || 'Redemption not found.'}</p>
                    </div>
                </section>
                <FooterInternal />
            </>
        );
    }

    const {
        itemDescription = `${formatGrams(redemption.amountGrams)} Item`,
        quantity = 1,
        amountGrams,
        feeLKR,
        status = 'pending',
        date,
        trackingNumber = '—',
        shippingAddress = {
            name: 'John Doe',
            line1: '123 Gold Street, Apt 4B',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India',
            phone: '+91 98765 43210',
        },
    } = redemption;

    return (
        <>
            <NavbarInternal />
            <section className="wallet bg-[#f5f5f5]">
                <div className="card">
                    <h3>Redeem Details</h3>
                    <div className="redeem-details">
                        <div className="detail-item">
                            <p>
                                <strong>Item:</strong> {itemDescription}
                            </p>
                            <p>
                                <strong>Quantity:</strong> {quantity}
                            </p>
                            <p>
                                <strong>Total Gold:</strong> {amountGrams ? formatGrams(amountGrams) : 'N/A'}
                            </p>
                            <p>
                                <strong>Fees:</strong> {feeLKR ? formatCurrency(feeLKR) : 'Rs. 0.00'}
                            </p>
                            <p>
                                <strong>Status:</strong>{' '}
                                <span className={`status-badge ${status.toLowerCase()}`} id="redeem-status">
                                    {status}
                                </span>
                            </p>
                            <p>
                                <strong>Date:</strong> {formatDate(date)}
                            </p>
                            <p>
                                <strong>Tracking Number:</strong>{' '}
                                {trackingNumber !== '—' ? (
                                    <a href="#" className="tracking-link">
                                        {trackingNumber}
                                    </a>
                                ) : (
                                    trackingNumber
                                )}
                            </p>
                        </div>
                        <div className="divider"></div>
                        <div className="detail-item">
                            <h4>Shipping Address</h4>
                            <p>{shippingAddress.name}</p>
                            <p>{shippingAddress.line1}</p>
                            <p>
                                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                            </p>
                            <p>{shippingAddress.country}</p>
                            <p>{shippingAddress.phone}</p>
                        </div>
                        <div className="redeem-actions">
                            <button
                                className="btn btn-secondary"
                                id="cancel-redeem"
                                style={{ display: status.toLowerCase() === 'pending' ? 'inline-block' : 'none' }}
                                onClick={handleCancel}
                            >
                                Cancel Redemption
                            </button>
                            <Link href="/wallet" className="btn btn-primary">
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