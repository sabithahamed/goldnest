// src/app/transaction-history/page.jsx
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

const TRANSACTIONS_PER_PAGE = 10;

export default function TransactionHistoryPage() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [transactionFilter, setTransactionFilter] = useState('all');
    const [transactionSearch, setTransactionSearch] = useState('');
    const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('date');
    const [sortDirection, setSortDirection] = useState(-1);

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
                const message = err.response?.data?.message || 'Failed to load transaction history.';
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

    // Filtered and Sorted Transactions
    const filteredTransactions = useMemo(() => {
        return (userData?.transactions || [])
            .filter((tx) => {
                const typeMatch =
                    transactionFilter === 'all' ||
                    tx.type.toLowerCase() === transactionFilter.toLowerCase().replace(' ', '_');
                const searchTerm = transactionSearch.toLowerCase();
                const searchMatch =
                    !searchTerm ||
                    formatDate(tx.date).toLowerCase().includes(searchTerm) ||
                    (tx.amountLKR && formatCurrency(tx.amountLKR).toLowerCase().includes(searchTerm)) ||
                    (tx.amountGrams && formatGrams(tx.amountGrams).toLowerCase().includes(searchTerm));
                return typeMatch && searchMatch;
            })
            .sort((a, b) => {
                if (sortColumn === 'date') {
                    return sortDirection * (new Date(b.date) - new Date(a.date));
                }
                return 0; // Add more sorting columns if needed
            });
    }, [userData?.transactions, transactionFilter, transactionSearch, sortColumn, sortDirection]);

    const totalTransactionPages = Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const start = (currentTransactionPage - 1) * TRANSACTIONS_PER_PAGE;
        return filteredTransactions.slice(start, start + TRANSACTIONS_PER_PAGE);
    }, [filteredTransactions, currentTransactionPage]);

    // Render Transaction Row
    const renderTransactionRow = (tx, index) => {
        let cashAmountDisplay = '—';
        let cashClass = '';
        let goldAmountDisplay = '—';
        let goldClass = '';
        let rateDisplay = '—';
        let feeDisplay = '—';
        let totalDisplay = 'N/A';
        const status = tx.status?.toLowerCase() || 'completed';

        switch (tx.type) {
            case 'deposit':
                cashAmountDisplay = `+ ${formatCurrency(tx.amountLKR)}`;
                cashClass = 'positive';
                totalDisplay = formatCurrency(tx.amountLKR);
                break;
            case 'withdrawal':
                cashAmountDisplay = `- ${formatCurrency(tx.amountLKR)}`;
                cashClass = 'negative';
                totalDisplay = formatCurrency(tx.amountLKR);
                break;
            case 'investment':
                cashAmountDisplay = `- ${formatCurrency(tx.amountLKR)}`;
                cashClass = 'negative';
                goldAmountDisplay = `+ ${tx.amountGrams?.toFixed(2)} g`;
                goldClass = 'positive';
                rateDisplay = tx.amountGrams > 0 ? `${formatCurrency(tx.amountLKR / tx.amountGrams)}/g` : 'N/A';
                totalDisplay = formatCurrency(tx.amountLKR);
                break;
            case 'sell_gold':
                cashAmountDisplay = `+ ${formatCurrency(tx.amountLKR)}`;
                cashClass = 'positive';
                goldAmountDisplay = `- ${tx.amountGrams?.toFixed(2)} g`;
                goldClass = 'negative';
                rateDisplay = tx.amountGrams > 0 ? `${formatCurrency(tx.amountLKR / tx.amountGrams)}/g` : 'N/A';
                totalDisplay = formatCurrency(tx.amountLKR);
                break;
            case 'redemption':
                goldAmountDisplay = `- ${tx.amountGrams?.toFixed(2)} g`;
                goldClass = 'negative';
                feeDisplay = tx.feeLKR ? `- ${formatCurrency(tx.feeLKR)}` : '—';
                totalDisplay = `${tx.amountGrams?.toFixed(2)} g`;
                break;
            case 'bonus':
                cashAmountDisplay = tx.amountLKR ? `+ ${formatCurrency(tx.amountLKR)}` : '—';
                if (cashAmountDisplay !== '—') cashClass = 'positive';
                goldAmountDisplay = tx.amountGrams ? `+ ${tx.amountGrams?.toFixed(2)} g` : '—';
                if (goldAmountDisplay !== '—') goldClass = 'positive';
                totalDisplay = cashAmountDisplay !== '—' ? cashAmountDisplay : goldAmountDisplay;
                break;
            case 'fee':
                cashAmountDisplay = tx.amountLKR ? `- ${formatCurrency(tx.amountLKR)}` : '—';
                if (cashAmountDisplay !== '—') cashClass = 'negative';
                feeDisplay = formatCurrency(tx.feeLKR);
                totalDisplay = formatCurrency(tx.amountLKR);
                break;
            default:
                cashAmountDisplay = tx.amountLKR ? formatCurrency(tx.amountLKR) : '—';
                goldAmountDisplay = tx.amountGrams ? `${tx.amountGrams.toFixed(2)} g` : '—';
                totalDisplay = cashAmountDisplay !== '—' ? cashAmountDisplay : goldAmountDisplay;
        }

        return (
            <tr key={tx._id || index}>
                <td data-label="Date">{formatDate(tx.date)}</td>
                <td data-label="Type" className="capitalize">
                    {tx.type?.replace('_', ' ')}
                </td>
                <td data-label="Cash Amount" className={cashClass}>
                    {cashAmountDisplay}
                </td>
                <td data-label="Gold Amount" className={goldClass}>
                    {goldAmountDisplay}
                </td>
                <td data-label="Rate">{rateDisplay}</td>
                <td data-label="Discount/Fee">{feeDisplay}</td>
                <td data-label="Total">{totalDisplay}</td>
                <td data-label="Status">
                    <span className={`status-badge ${status}`}>{status}</span>
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
            setSortDirection(-1);
        }
    };

    return (
        <>
            <NavbarInternal />
            <section className="wallet bg-[#f5f5f5]">
                <div className="card">
                    <h3>Transaction History</h3>
                    <div className="transaction-history">
                        <div className="table-controls">
                            <div className="form-group">
                                <label htmlFor="type-filter">Filter by Type:</label>
                                <select
                                    id="type-filter"
                                    value={transactionFilter}
                                    onChange={(e) => {
                                        setTransactionFilter(e.target.value);
                                        setCurrentTransactionPage(1);
                                    }}
                                    aria-label="Filter transaction history by type"
                                >
                                    <option value="all">All</option>
                                    <option value="deposit">Deposit</option>
                                    <option value="investment">Buy Gold</option>
                                    <option value="sell_gold">Sell Gold</option>
                                    <option value="withdrawal">Withdrawal</option>
                                    <option value="redemption">Redemption</option>
                                    <option value="bonus">Bonus</option>
                                    <option value="fee">Fee</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="transaction-search">Search:</label>
                                <input
                                    type="text"
                                    id="transaction-search"
                                    placeholder="Search by date or amount"
                                    value={transactionSearch}
                                    onChange={(e) => {
                                        setTransactionSearch(e.target.value);
                                        setCurrentTransactionPage(1);
                                    }}
                                    aria-label="Search transactions by date or amount"
                                />
                            </div>
                        </div>
                        <table id="transaction-history-table">
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
                                    <th scope="col">Type</th>
                                    <th scope="col">Cash Amount</th>
                                    <th scope="col">Gold Amount</th>
                                    <th scope="col">Rate</th>
                                    <th scope="col">Discount/Fee</th>
                                    <th scope="col">Total</th>
                                    <th scope="col">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(TRANSACTIONS_PER_PAGE)].map((_, i) => (
                                        <TransactionRowSkeleton key={i} cols={8} />
                                    ))
                                ) : error && !userData ? (
                                    <tr>
                                        <td colSpan="8" className="error-message text-center">
                                            {error}
                                        </td>
                                    </tr>
                                ) : paginatedTransactions.length > 0 ? (
                                    paginatedTransactions.map(renderTransactionRow)
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="empty-message text-center">
                                            No transactions match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {!loading && totalTransactionPages > 1 && (
                            <div className="pagination">
                                <span>
                                    Page {currentTransactionPage} of {totalTransactionPages}
                                </span>
                                <div className="pagination-arrows">
                                    <button
                                        className="btn btn-secondary btn-small"
                                        onClick={() => setCurrentTransactionPage((p) => Math.max(1, p - 1))}
                                        disabled={currentTransactionPage === 1}
                                        aria-label="Previous page"
                                    >
                                        «
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-small"
                                        onClick={() =>
                                            setCurrentTransactionPage((p) =>
                                                Math.min(totalTransactionPages, p + 1)
                                            )
                                        }
                                        disabled={currentTransactionPage === totalTransactionPages}
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