// src/app/redeem-history/page.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import { TransactionRowSkeleton } from '@/components/skeletons/TransactionRowSkeleton';

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

const REDEEMS_PER_PAGE = 3;

export default function RedeemHistoryPage() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [redeemFilter, setRedeemFilter] = useState('all');
    const [redeemSearch, setRedeemSearch] = useState('');
    const [currentRedeemPage, setCurrentRedeemPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('date');
    const [sortDirection, setSortDirection] = useState(-1); // -1 for descending, 1 for ascending

    const router = useRouter();

    // Data Fetching
    useEffect(() => {
        setLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const token = localStorage.getItem('userToken');

        const fetchData = async () => {
            setError('');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                router.push('/');
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                const userRes = await axios.get(`${backendUrl}/api/users/me`, config);
                setUserData(userRes.data);
            } catch (err) {
                console.error('Error fetching user data:', err);
                const message = err.response?.data?.message || 'Failed to load redeem history.';
                setError(message);
                if (err.response?.status === 401) {
                    localStorage.clear();
                    router.push('/');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    // Filtered and Sorted Redemptions
    const filteredRedemptions = useMemo(() => {
        return (userData?.transactions || [])
            .filter((tx) => tx.type === 'redemption')
            .filter((tx) => {
                const statusMatch = redeemFilter === 'all' || tx.status?.toLowerCase() === redeemFilter.toLowerCase();
                const searchTerm = redeemSearch.toLowerCase();
                const searchMatch =
                    !searchTerm ||
                    formatDate(tx.date).toLowerCase().includes(searchTerm) ||
                    (tx.itemDescription || '').toLowerCase().includes(searchTerm);
                return statusMatch && searchMatch;
            })
            .sort((a, b) => {
                if (sortColumn === 'date') {
                    return sortDirection * (new Date(b.date) - new Date(a.date));
                }
                return 0; // Add more sorting columns if needed
            });
    }, [userData?.transactions, redeemFilter, redeemSearch, sortColumn, sortDirection]);

    const totalRedeemPages = Math.ceil(filteredRedemptions.length / REDEEMS_PER_PAGE);
    const paginatedRedemptions = useMemo(() => {
        const start = (currentRedeemPage - 1) * REDEEMS_PER_PAGE;
        return filteredRedemptions.slice(start, start + REDEEMS_PER_PAGE);
    }, [filteredRedemptions, currentRedeemPage]);

    // Render Redemption Row
    const renderRedeemRow = (tx, index) => {
        const itemDesc = tx.itemDescription || `${formatGrams(tx.amountGrams)} Item`;
        const quantity = tx.quantity || 1;
        const totalGold = tx.amountGrams ? formatGrams(tx.amountGrams) : 'N/A';
        const fees = tx.feeLKR ? formatCurrency(tx.feeLKR) : 'Rs. 0.00';
        const status = tx.status?.toLowerCase() || 'pending';
        const tracking = tx.trackingNumber || '—';

        return (
            <tr key={tx._id || index}>
                <td data-label="Date">{formatDate(tx.date)}</td>
                <td data-label="Item">{itemDesc}</td>
                <td data-label="Quantity">{quantity}</td>
                <td data-label="Total Gold">{totalGold}</td>
                <td data-label="Fees">{fees}</td>
                <td data-label="Status">
                    <span className={`status-badge ${status}`}>{status}</span>
                </td>
                <td data-label="Tracking Number">
                    {tracking !== '—' ? (
                        <a href="#" className="tracking-link">
                            {tracking}
                        </a>
                    ) : (
                        tracking
                    )}
                </td>
                <td data-label="Details">
                    <Link href={`/redeem-details/${tx._id}`} className="btn btn-secondary btn-small">
                        View Details
                    </Link>
                </td>
            </tr>
        );
    };

    // Handle Sorting
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection((prev) => -prev);
        } else {
            setSortColumn(column);
            setSortDirection(-1); // Default to descending
        }
    };

    return (
        <>
            <NavbarInternal />
            <section className="wallet bg-[#f5f5f5]">
                <div className="card">
                    <h3>Redeem History</h3>
                    <div className="redeem-history">
                        <div className="table-controls">
                            <div className="form-group">
                                <label htmlFor="status-filter">Filter by Status:</label>
                                <select
                                    id="status-filter"
                                    value={redeemFilter}
                                    onChange={(e) => {
                                        setRedeemFilter(e.target.value);
                                        setCurrentRedeemPage(1);
                                    }}
                                    aria-label="Filter redeem history by status"
                                >
                                    <option value="all">All</option>
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="redeem-search">Search:</label>
                                <input
                                    type="text"
                                    id="redeem-search"
                                    placeholder="Search by date or item"
                                    value={redeemSearch}
                                    onChange={(e) => {
                                        setRedeemSearch(e.target.value);
                                        setCurrentRedeemPage(1);
                                    }}
                                    aria-label="Search redemptions by date or item"
                                />
                            </div>
                        </div>
                        <table id="redeem-history-table">
                            <thead>
                                <tr>
                                    <th
                                        scope="col"
                                        className={`sortable ${sortColumn === 'date' ? (sortDirection === 1 ? 'asc' : 'desc') : ''}`}
                                        data-sort="date"
                                        onClick={() => handleSort('date')}
                                    >
                                        Date <i className="fas fa-sort"></i>
                                    </th>
                                    <th scope="col">Item</th>
                                    <th scope="col">Quantity</th>
                                    <th scope="col">Total Gold</th>
                                    <th scope="col">Fees</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Tracking Number</th>
                                    <th scope="col">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(REDEEMS_PER_PAGE)].map((_, i) => (
                                        <TransactionRowSkeleton key={i} cols={8} />
                                    ))
                                ) : error && !userData ? (
                                    <tr>
                                        <td colSpan="8" className="error-message text-center">
                                            {error}
                                        </td>
                                    </tr>
                                ) : paginatedRedemptions.length > 0 ? (
                                    paginatedRedemptions.map(renderRedeemRow)
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="empty-message text-center">
                                            No redemption history found
                                            {redeemFilter !== 'all' ? ' for this status' : ''}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {!loading && totalRedeemPages > 1 && (
                            <div className="pagination">
                                <span>
                                    Page {currentRedeemPage} of {totalRedeemPages}
                                </span>
                                <div className="pagination-arrows">
                                    <button
                                        className="btn btn-secondary btn-small"
                                        onClick={() => setCurrentRedeemPage((p) => Math.max(1, p - 1))}
                                        disabled={currentRedeemPage === 1}
                                        aria-label="Previous page"
                                    >
                                        «
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-small"
                                        onClick={() =>
                                            setCurrentRedeemPage((p) => Math.min(totalRedeemPages, p + 1))
                                        }
                                        disabled={currentRedeemPage === totalRedeemPages}
                                        aria-label="Next page"
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        )}
                        <Link href="/wallet" className="btn btn-secondary see-more">
                            Back to Wallet <i className="fas fa-arrow-right"></i>
                        </Link>
                    </div>
                </div>
            </section>
            <FooterInternal />
        </>
    );
}