// src/app/admin/redemptions/page.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation'; // <-- IMPORT useSearchParams
import styles from './Redemptions.module.css';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

// --- REPLACE THE ENTIRE ManageRedemptionModal COMPONENT WITH THIS ---
const ManageRedemptionModal = ({ redemption, onClose, onUpdate }) => {
    const [status, setStatus] = useState(redemption.status);
    const [trackingNumber, setTrackingNumber] = useState(redemption.trackingNumber || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Pass only the fields that have changed to avoid sending empty tracking number
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
                            <input
                                type="text"
                                id="trackingNumber"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Enter courier tracking number"
                                className={styles.formInput}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.modalActions}>
                    <button onClick={onClose} className={`${styles.modalButton} ${styles.modalButtonCancel}`}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className={`${styles.modalButton} ${styles.modalButtonSave}`}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const RedemptionManagementPage = () => {
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const router = useRouter();
    const searchParams = useSearchParams(); // <-- HOOK to read URL params

    // --- MODIFIED: Initialize statusFilter from URL parameter ---
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

    // --- NEW: State for managing the modal ---
    const [selectedRedemption, setSelectedRedemption] = useState(null);

    const fetchRedemptions = useCallback(async () => {
        setLoading(true);
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        const token = adminInfo?.token;

        if (!token) {
            router.push('/gn-admin-portal');
            return;
        }

        try {
            const config = { 
                headers: { Authorization: `Bearer ${token}` },
                params: { page, limit: 10, status: statusFilter } 
            };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.get(`${backendUrl}/api/admin/redemptions`, config);

            setRedemptions(data.redemptions);
            setTotalPages(data.totalPages);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch redemption requests.');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, router]);

    useEffect(() => {
        fetchRedemptions();
    }, [fetchRedemptions]);

    // --- NEW: Handler to update a redemption ---
    const handleUpdateRedemption = async (id, updates) => {
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const token = adminInfo?.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

            await axios.put(`${backendUrl}/api/admin/redemptions/${id}`, updates, config);
            
            // Refresh the list to show the updated status
            fetchRedemptions();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update redemption.');
        }
    };

    const handleFilterChange = (e) => {
        setPage(1);
        setStatusFilter(e.target.value);
        // Optional: Update URL without reloading page
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
                    <select 
                        id="status-filter"
                        value={statusFilter}
                        onChange={handleFilterChange}
                        className={styles.filterSelect}
                    >
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
                            <tr>
                                <th>Date</th>
                                <th>User</th>
                                <th>Item</th>
                                <th>Total Grams</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
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
                                        <td>
                                            <span className={`${styles.statusBadge} ${getStatusClass(r.status)}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td>
                                            {/* NEW: Button opens the modal */}
                                            <button onClick={() => setSelectedRedemption(r)} className={styles.actionButton}>Manage</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                               <tr><td colSpan="6" className={styles.emptyMessage}>No redemption requests found for this filter.</td></tr>
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
            
            {/* NEW: Render the modal conditionally */}
            {selectedRedemption && (
                <ManageRedemptionModal 
                    redemption={selectedRedemption}
                    onClose={() => setSelectedRedemption(null)}
                    onUpdate={handleUpdateRedemption}
                />
            )}
        </>
    );
};

export default RedemptionManagementPage;