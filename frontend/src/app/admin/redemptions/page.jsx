// src/app/admin/redemptions/page.jsx
'use client'; // This directive applies to all components in this file

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Redemptions.module.css';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

const ManageRedemptionModal = ({ redemption, onClose, onUpdate }) => {
    // ... (The code for the Modal component remains exactly the same as before)
     const [status, setStatus] = useState(redemption.status);
    const [trackingNumber, setTrackingNumber] = useState(redemption.trackingNumber || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const updates = { status };
        if (trackingNumber) {
            updates.trackingNumber = trackingNumber;
        }
        await onUpdate(redemption._id, updates);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Manage Redemption</h2>
                <div className={styles.modalDetails}>
                    <p><strong>Request ID:</strong> {redemption._id}</p>
                    <p><strong>User:</strong> {redemption.user?.name} ({redemption.user?.email})</p>
                    <p><strong>Item:</strong> {redemption.itemDescription}</p>
                    <p><strong>Shipping To:</strong> {redemption.shippingName}, {redemption.shippingAddress}, {redemption.shippingCity}</p>
                </div>
                <div className={styles.modalForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="status" className={styles.formLabel}>Update Status:</label>
                        <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className={styles.formSelect}>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    {(status === 'shipped' || status === 'delivered') && (
                        <div className={styles.formGroup}>
                            <label htmlFor="trackingNumber" className={styles.formLabel}>Tracking Number:</label>
                            <input type="text" id="trackingNumber" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter courier tracking number" className={styles.formInput}/>
                        </div>
                    )}
                </div>
                <div className={styles.modalActions}>
                    <button onClick={onClose} className={`${styles.modalButton} ${styles.modalButtonCancel}`}>Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className={`${styles.modalButton} ${styles.modalButtonSave}`}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </div>
        </div>
    );
};

// This is the client component that uses the hook
function RedemptionManagementClient() {
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedRedemption, setSelectedRedemption] = useState(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

    const fetchRedemptions = useCallback(async () => {
        setLoading(true);
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        const token = adminInfo?.token;
        if (!token) { router.push('/gn-admin-portal'); return; }
        try {
            const config = { headers: { Authorization: `Bearer ${token}` }, params: { page, limit: 10, status: statusFilter } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.get(`${backendUrl}/api/admin/redemptions`, config);
            setRedemptions(data.redemptions);
            setTotalPages(data.totalPages);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch requests.');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, router]);

    useEffect(() => {
        fetchRedemptions();
    }, [fetchRedemptions]);

    const handleUpdateRedemption = async (id, updates) => {
        // ... (This function remains the same)
    };

    const handleFilterChange = (e) => {
        setPage(1);
        setStatusFilter(e.target.value);
        router.push(`/admin/redemptions?status=${e.target.value}`, { scroll: false });
    };

    const getStatusClass = (status) => {
        const statusClass = status ? status.toLowerCase() : 'default';
        return styles[`status${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}`] || '';
    };

    return (
        <>
            <div className={styles.pageWrapper}>
                <h1 className={styles.header}>Redemption Management</h1>
                <div className={styles.filterBar}>
                    <label htmlFor="status-filter" className={styles.filterLabel}>Filter by Status:</label>
                    <select id="status-filter" value={statusFilter} onChange={handleFilterChange} className={styles.filterSelect}>
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <div className={styles.tableContainer}>
                    <table className={styles.redemptionsTable}>
                        <thead>
                            <tr><th>Date</th><th>User</th><th>Item</th><th>Total Grams</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className={styles.emptyMessage}>Loading redemptions...</td></tr>
                            ) : redemptions.length > 0 ? (
                                redemptions.map(r => (
                                    <tr key={r._id}>
                                        <td>{formatDate(r.createdAt)}</td>
                                        <td className={styles.userCell}>{r.user?.name || 'N/A'} <span>{r.user?.email}</span></td>
                                        <td>{r.itemDescription}</td>
                                        <td>{r.totalGrams.toFixed(4)} g</td>
                                        <td><span className={`${styles.statusBadge} ${getStatusClass(r.status)}`}>{r.status}</span></td>
                                        <td><button onClick={() => setSelectedRedemption(r)} className={styles.actionButton}>Manage</button></td>
                                    </tr>
                                ))
                            ) : (
                               <tr><td colSpan="6" className={styles.emptyMessage}>No requests found for this filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && totalPages > 1 && (
                     <div className={styles.paginationControls}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={styles.paginationButton}>Previous</button>
                        <span className={styles.paginationInfo}>Page {page} of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={styles.paginationButton}>Next</button>
                    </div>
                )}
            </div>
            {selectedRedemption && <ManageRedemptionModal redemption={selectedRedemption} onClose={() => setSelectedRedemption(null)} onUpdate={handleUpdateRedemption}/>}
        </>
    );
}

// This is the main exported page component
export default function RedemptionManagementPage() {
    return (
        // This Suspense boundary is the key to fixing the build error.
        // It tells Next.js to show a fallback while the client component loads and reads the URL parameters.
        <Suspense fallback={<div className="p-6">Loading Redemption Page...</div>}>
            <RedemptionManagementClient />
        </Suspense>
    );
}