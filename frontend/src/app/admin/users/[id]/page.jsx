// src/app/admin/users/[id]/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import styles from './UserDetail.module.css';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

const UserDetailPage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();
    const params = useParams();
    const { id: userId } = params;

    useEffect(() => {
        if (!userId) return;
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        const token = adminInfo?.token;
        if (!token) { router.push('/gn-admin-portal'); return; }
        const fetchUser = async () => {
            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
                const { data } = await axios.get(`${backendUrl}/api/admin/users/${userId}`, config);
                setUser(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch user details.');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [userId, router]);

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };

    const handleToggleLockStatus = async () => {
        const action = user.isLocked ? 'unlock' : 'lock';
        if (!window.confirm(`Are you sure you want to ${action} this account?`)) {
            return;
        }

        setIsUpdatingStatus(true);
        setError('');
        setSuccess('');

        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const token = adminInfo?.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            
            const payload = { isLocked: !user.isLocked };
            const { data } = await axios.put(`${backendUrl}/api/admin/users/${userId}/status`, payload, config);

            setUser(prevUser => ({ ...prevUser, isLocked: data.isLocked }));
            showSuccessMessage(`User account has been successfully ${action}ed.`);

        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${action} account.`);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    if (loading) return <div className="p-6">Loading user details...</div>;
    if (error && !user) return <div className="p-6 text-red-500">Error: {error}</div>;
    if (!user) return <div className="p-6">User not found.</div>;

    return (
        <div className={styles.pageWrapper}>
            <div className="mb-6">
                <Link href="/admin/users" className={styles.backLink}>
                    <i className="fas fa-arrow-left"></i>
                    <span>Back to User List</span>
                </Link>
            </div>
            
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
            {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</p>}

            <div className={styles.mainCard}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h1>{user.name}</h1>
                        <p>{user.email}</p>
                        <p className={styles.userId}>User ID: {user._id}</p>
                    </div>
                    <div className={styles.headerBalances}>
                        <p className={styles.lkrBalance}>{new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(user.cashBalanceLKR)}</p>
                        <p className={styles.goldBalance}>{user.goldBalanceGrams.toFixed(4)} g</p>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>User Details</h2>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailItem}><strong>Date Joined:</strong> <span>{formatDate(user.createdAt)}</span></div>
                        <div className={styles.detailItem}><strong>Last Updated:</strong> <span>{formatDate(user.updatedAt)}</span></div>
                        <div className={styles.detailItem}><strong>Email Verified:</strong> <span>{user.isEmailVerified ? 'Yes' : 'No'}</span></div>
                        <div className={styles.detailItem}><strong>Phone:</strong> <span>{user.phone || 'N/A'}</span></div>
                        <div className={styles.detailItem}><strong>Account Status:</strong> <span>{user.isLocked ? <span className='font-bold text-red-600'>Locked</span> : <span className='font-bold text-green-600'>Active</span>}</span></div>
                        <div className={`${styles.detailItem} col-span-2`}><strong>Address:</strong> <span>{user.address || 'N/A'}</span></div>
                        <div className={`${styles.detailItem} col-span-2`}><strong>Blockchain Address:</strong> <span className={styles.blockchainAddress}>{user.blockchainAddress || 'N/A'}</span></div>
                    </div>
                </div>

                 <div className={`${styles.section} ${styles.actions}`}>
                    <h2 className={styles.sectionTitle}>Admin Actions</h2>
                    <button 
                        onClick={handleToggleLockStatus}
                        disabled={isUpdatingStatus}
                        className={`${styles.actionButton} ${user.isLocked ? styles.unlockButton : styles.lockButton}`}
                    >
                        {isUpdatingStatus ? (
                            <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                        ) : user.isLocked ? (
                            <><i className="fas fa-unlock"></i> Unlock Account</>
                        ) : (
                            <><i className="fas fa-lock"></i> Lock Account</>
                        )}
                    </button>
                </div>

                {/* --- THIS IS THE MISSING SECTION --- */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Recent Transactions ({user.transactions.length})</h2>
                    <div className={styles.tableContainer}>
                        <table className={styles.transactionsTable}>
                             <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Proof</th>
                                </tr>
                            </thead>
                            <tbody>
                                {user.transactions.length > 0 ? (
                                    user.transactions.slice(0, 5).map(tx => (
                                        <tr key={tx._id}>
                                            <td>{formatDate(tx.date)}</td>
                                            <td className="capitalize">{tx.type.replace('_', ' ')}</td>
                                            <td>
                                                {tx.amountLKR ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(tx.amountLKR) : ''}
                                                {tx.amountLKR && tx.amountGrams ? ' ' : ''}
                                                {tx.amountGrams ? `${tx.amountGrams.toFixed(4)} g` : ''}
                                            </td>
                                             <td>
                                                {tx.blockchainTxHash ? (
                                                    <a href={`https://amoy.polygonscan.com/tx/${tx.blockchainTxHash}`} target="_blank" rel="noopener noreferrer" className={styles.txProofLink}>
                                                        View
                                                    </a>
                                                ) : 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="text-gray-500 p-4 text-center">No transactions found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* --- END OF MISSING SECTION --- */}
            </div>
        </div>
    );
};

export default UserDetailPage;