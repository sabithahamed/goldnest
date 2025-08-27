// src/app/admin/inventory/page.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './Inventory.module.css';

const formatGrams = (grams) => {
    // --- FIX: Correctly handle 0 and other falsy values ---
    if (typeof grams !== 'number' || isNaN(grams)) return '0.0000 g';
    return `${parseFloat(grams).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})} g`;
};
const formatDate = (dateString) => new Date(dateString).toLocaleString('en-GB');

const InventoryPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // --- NEW: State for success messages ---
    const [success, setSuccess] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [gramsToAdd, setGramsToAdd] = useState('');
    const [notes, setNotes] = useState('');
    const router = useRouter();

    // --- UPDATED: fetchStats is now a standalone function to be reused ---
    const fetchStats = useCallback(async () => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        const token = adminInfo?.token;
        if (!token) {
            router.push('/gn-admin-portal');
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.get(`${backendUrl}/api/admin/inventory/stats`, config);
            setStats(data);
        } catch (err) {
            setError('Failed to load inventory data.');
            // --- NEW: Gracefully handle token expiration ---
            if (err.response?.status === 401) {
                localStorage.removeItem('adminInfo');
                router.push('/gn-admin-portal');
            }
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);
    
    // --- NEW: Helper function to show temporary success messages ---
    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };

    const handleAddGold = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        setError('');
        setSuccess(''); // Clear previous messages

        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            await axios.post(`${backendUrl}/api/admin/inventory/add`, { gramsAdded: gramsToAdd, notes }, config);
            
            showSuccessMessage('Gold added to reserve successfully!'); // <-- Show success message
            setGramsToAdd('');
            setNotes('');
            await fetchStats(); // Use the standalone function to refetch stats
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add gold.');
        } finally {
            setIsAdding(false);
        }
    };

    if (loading) return <div>Loading Inventory...</div>;

    const isBalanced = stats && stats.reserveBalance >= 0;
    const isReserveLow = stats && stats.reserveBalance < 100;

    return (
        <div className={styles.pageWrapper}>
            <h1 className={styles.header}>Inventory Management & Reconciliation</h1>
            {/* --- Display error and success messages --- */}
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
            {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</p>}
            
            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${isBalanced ? styles.statusBalanced : styles.statusImbalance}`}>
                    <h3>Reconciliation Status</h3>
                    <p>{isBalanced ? 'BALANCED' : 'IMBALANCE'}</p>
                    <p className={styles.statusSubtext}>{isBalanced ? 'Physical gold meets or exceeds tokenized gold.' : 'CRITICAL: Tokenized gold exceeds physical reserves!'}</p>
                </div>
                <div className={`${styles.statCard} ${styles.infoCard}`}>
                    <h3>Total Physical Gold Held</h3>
                    <p>{formatGrams(stats?.totalPhysicalGold)}</p>
                </div>
                <div className={`${styles.statCard} ${styles.infoCard}`}>
                    <h3>Total User-Owned (Tokenized)</h3>
                    <p>{formatGrams(stats?.totalTokenizedGold)}</p>
                </div>
                <div className={`${styles.reserveCard} ${isReserveLow ? styles.reserveLow : styles.reserveNormal}`}>
                    <h3>Platform Reserve Balance (Available for Sale)</h3>
                    <p>{formatGrams(stats?.reserveBalance)}</p>
                    {isReserveLow && <p className={styles.alertText}>RESERVE LOW: PLEASE PURCHASE MORE PHYSICAL GOLD!</p>}
                </div>
            </div>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Add Physical Gold to Reserve</h2>
                <form onSubmit={handleAddGold} className={styles.addForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="gramsToAdd" className={styles.formLabel}>Grams Added</label>
                        <input type="number" step="0.001" id="gramsToAdd" value={gramsToAdd} onChange={(e) => setGramsToAdd(e.target.value)} required placeholder="e.g., 1000.0" className={styles.formInput} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="notes" className={styles.formLabel}>Notes (e.g., Supplier, Ref #)</label>
                        <input type="text" id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={styles.formInput} />
                    </div>
                    <button type="submit" disabled={isAdding} className={styles.addButton}>
                        {isAdding ? 'Adding...' : 'Add to Vault'}
                    </button>
                </form>
            </div>
            
            <div className={styles.card}>
                 <h2 className={styles.cardTitle}>Recent Inventory Additions</h2>
                 <div className={styles.tableContainer}>
                    <table className={styles.historyTable}>
                        <thead><tr><th>Date</th><th>Admin</th><th>Grams Added</th><th>Notes</th></tr></thead>
                        <tbody>
                            {/* --- Added check for empty array --- */}
                            {stats?.inventoryLogs && stats.inventoryLogs.length > 0 ? (
                                stats.inventoryLogs.map(log => (
                                    <tr key={log._id}>
                                        <td>{formatDate(log.createdAt)}</td>
                                        <td>{log.adminName}</td>
                                        <td className={styles.gramsAddedCell}>+{formatGrams(log.gramsAdded)}</td>
                                        <td>{log.notes}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center text-gray-500 py-4">No inventory additions have been logged yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default InventoryPage;