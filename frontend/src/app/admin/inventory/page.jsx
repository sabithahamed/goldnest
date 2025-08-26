// src/app/admin/inventory/page.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './Inventory.module.css';
import PasswordConfirmModal from '../components/PasswordConfirmModal';

// --- MODIFIED: Uses Math.abs() to handle negative numbers for display ---
const formatGrams = (grams) => {
    if (typeof grams !== 'number' || isNaN(grams)) return '0.0000 g';
    // Use Math.abs() so we can manually control the +/- sign in the JSX
    return `${parseFloat(Math.abs(grams)).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})} g`;
};
const formatDate = (dateString) => new Date(dateString).toLocaleString('en-GB');

const InventoryPage = () => {
    // Component State
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [gramsToAdd, setGramsToAdd] = useState('');
    const [notes, setNotes] = useState('');
    const [gramsToReduce, setGramsToReduce] = useState('');
    const [notesToReduce, setNotesToReduce] = useState('');
    const router = useRouter();

    // Security & Modal State
    const [adminRole, setAdminRole] = useState(null); // Initialized to null for permissions gate
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);
    const [isConfirmingAction, setIsConfirmingAction] = useState(false);

    const fetchStats = useCallback(async (token) => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.get(`${backendUrl}/api/admin/inventory/stats`, config);
            setStats(data);
        } catch (err) {
            setError('Failed to load inventory data.');
            if (err.response?.status === 401) { localStorage.removeItem('adminInfo'); router.push('/gn-admin-portal'); }
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        if (!adminInfo || !adminInfo.token) {
            router.push('/gn-admin-portal');
            return;
        }
        setAdminRole(adminInfo.role);
        fetchStats(adminInfo.token);
    }, [fetchStats, router]);
    
    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };

    // --- Action Execution Functions ---
    const executeAddGold = async (password) => {
        setIsConfirmingAction(true);
        setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const payload = { gramsAdded: gramsToAdd, notes, confirmationPassword: password };
            await axios.post(`${backendUrl}/api/admin/inventory/add`, payload, config);
            showSuccessMessage('Gold added to reserve successfully!');
            setGramsToAdd(''); setNotes('');
            await fetchStats(adminInfo.token);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add gold.');
        } finally {
            setIsConfirmingAction(false);
            setIsPasswordModalOpen(false);
        }
    };

    const executeReduceGold = async (password) => {
        setIsConfirmingAction(true);
        setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const payload = { gramsToReduce, notes: notesToReduce, confirmationPassword: password };
            await axios.post(`${backendUrl}/api/admin/inventory/reduce`, payload, config);
            showSuccessMessage('Gold reduced successfully!');
            setGramsToReduce(''); setNotesToReduce('');
            await fetchStats(adminInfo.token);
        } catch (err) { setError(err.response?.data?.message || 'Failed to reduce gold.'); } finally {
            setIsConfirmingAction(false);
            setIsPasswordModalOpen(false);
        }
    };

    // --- Action Initiation Functions ---
    const handleAddGoldInitiation = (e) => {
        e.preventDefault();
        if (adminRole === 'superadmin') {
            executeAddGold("SUPERADMIN_BYPASS");
        } else {
            setActionToConfirm(() => (password) => executeAddGold(password));
            setIsPasswordModalOpen(true);
        }
    };

    const handleReduceGoldInitiation = (e) => {
        e.preventDefault();
        if (!window.confirm("WARNING: Reducing gold will burn tokens from the treasury and cannot be easily undone. Are you sure you want to proceed?")) return;
        
        if (adminRole === 'superadmin') {
            setActionToConfirm(() => (password) => executeReduceGold(password));
            setIsPasswordModalOpen(true);
        } else {
            setError("You do not have permission for this action.");
        }
    };

    // --- Permissions Loading Gate ---
    if (adminRole === null) {
        return <div>Verifying permissions...</div>;
    }
    
    if (loading) return <div>Loading Inventory...</div>;

    const isBalanced = stats && stats.reserveBalance >= 0;
    const isReserveLow = stats && stats.reserveBalance < 100;

    return (
        <>
            <div className={styles.pageWrapper}>
                <h1 className={styles.header}>Inventory Management & Reconciliation</h1>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
                {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</p>}
                
                {adminRole === 'superadmin' && stats && (
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
                )}
                
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Add Physical Gold to Reserve</h2>
                    <form onSubmit={handleAddGoldInitiation} className={styles.addForm}>
                        <div className={styles.formGroup}>
                            <label htmlFor="gramsToAdd" className={styles.formLabel}>Grams Added</label>
                            <input type="number" step="0.001" id="gramsToAdd" value={gramsToAdd} onChange={(e) => setGramsToAdd(e.target.value)} required placeholder="e.g., 1000.0" className={styles.formInput} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="notes" className={styles.formLabel}>Notes (e.g., Supplier, Ref #)</label>
                            <input type="text" id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={styles.formInput} />
                        </div>
                        <button type="submit" disabled={isConfirmingAction} className={styles.addButton}>
                            {isConfirmingAction ? 'Adding...' : 'Add to Vault'}
                        </button>
                    </form>
                </div>

                {adminRole === 'superadmin' && (
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle} style={{ color: '#dc2626' }}>Reduce Physical Gold (Superadmin Only)</h2>
                        <form onSubmit={handleReduceGoldInitiation} className={styles.addForm}>
                            <div className={styles.formGroup}>
                                <label htmlFor="gramsToReduce" className={styles.formLabel}>Grams to Reduce</label>
                                <input type="number" step="0.001" id="gramsToReduce" value={gramsToReduce} onChange={(e) => setGramsToReduce(e.target.value)} required placeholder="e.g., 50.0" className={styles.formInput} />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="notesToReduce" className={styles.formLabel}>Reason / Notes</label>
                                <input type="text" id="notesToReduce" value={notesToReduce} onChange={(e) => setNotesToReduce(e.target.value)} required placeholder="e.g., Audited removal, Ref #123" className={styles.formInput} />
                            </div>
                            <button type="submit" disabled={isConfirmingAction} className={styles.addButton} style={{ backgroundColor: '#dc2626' }}>
                                {isConfirmingAction ? 'Reducing...' : 'Confirm Reduction'}
                            </button>
                        </form>
                    </div>
                )}
                
                <div className={styles.card}>
                     <h2 className={styles.cardTitle}>Recent Inventory Additions</h2>
                     <div className={styles.tableContainer}>
                        <table className={styles.historyTable}>
                            <thead><tr><th>Date</th><th>Admin</th><th>Grams Changed</th><th>Notes</th></tr></thead>
                            <tbody>
                                {stats?.inventoryLogs && stats.inventoryLogs.length > 0 ? (
                                    stats.inventoryLogs.map(log => (
                                        <tr key={log._id}>
                                            <td>{formatDate(log.createdAt)}</td>
                                            <td>{log.adminName}</td>
                                            {/* --- THIS IS THE FINAL FIX for red/green color --- */}
                                            <td className={log.gramsAdded > 0 ? styles.gramsAddedCell : styles.gramsReducedCell}>
                                                {log.gramsAdded > 0 ? '+' : '-'}{formatGrams(log.gramsAdded)}
                                            </td>
                                            <td>{log.notes}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center text-gray-500 py-4">No inventory changes have been logged yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                </div>
            </div>

            {isPasswordModalOpen && (
                <PasswordConfirmModal
                    onCancel={() => setIsPasswordModalOpen(false)}
                    onConfirm={actionToConfirm}
                    isConfirming={isConfirmingAction}
                />
            )}
        </>
    );
};
export default InventoryPage;