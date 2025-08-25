// src/app/admin/management/history/page.jsx
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './History.module.css';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

const formatDuration = (minutes) => {
    if (minutes === null || typeof minutes === 'undefined') return 'N/A';
    if (minutes < 1) return '< 1 min';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
};

// --- THIS IS THE FULLY UPDATED FUNCTION ---
const renderActionDetails = (log) => {
    const details = log.details || {};
    // Use startsWith for role updates to catch any email
    if (log.action.startsWith('Updated admin role for')) {
        return `Changed role from '${details.from}' to '${details.to}'`;
    }

    switch(log.action) {
        case 'Created new admin account':
            return `Created '${details.role}' admin: ${details.newAdminEmail}`;
        case 'Deleted admin account':
            return `Deleted admin: ${details.deletedAdminEmail}`;
        case 'Added physical gold to reserve':
            return `Added ${details.gramsAdded}g to vault. Notes: "${details.notes || 'N/A'}"`;
        case 'Created new challenge':
            return `Created challenge: "${details.name}"`;
        case 'Deleted challenge':
            return `Deleted challenge: "${details.name}"`;
        case 'Created new promo code':
            return `Created promo code: ${details.code}`;
        case 'Deleted promo code':
            return `Deleted promo code: ${details.code}`;
        case 'Updated platform settings':
            return `Updated keys: ${(details.updatedKeys || []).join(', ')}`;
        case 'Added gold price entry':
            return `Added price for ${details.date}: ${details.price} LKR`;
        case 'Updated redemption status':
            let statusText = `Set status to '${details.status}' for Redemption ID: ${log.targetId}`;
            if (details.trackingNumber) {
                statusText += ` (Tracking: ${details.trackingNumber})`;
            }
            return statusText;
        case 'Set user lock status to true':
            return `Locked account for User ID: ${log.targetId}`;
        case 'Set user lock status to false':
            return `Unlocked account for User ID: ${log.targetId}`;
        case `Undid action: "Updated platform settings"`:
            return `Restored platform settings.`;
        case `Undid action: "Deleted challenge"`:
            return `Restored a deleted challenge.`;
        case `Undid action: "Added physical gold to reserve"`:
            return `Reverted an inventory addition.`;
        default:
            return log.action;
    }
};

const AdminAuditLogPage = () => {
    // Data states
    const [sessions, setSessions] = useState([]);
    const [actions, setActions] = useState([]);
    
    // Simplified filter states
    const [filters, setFilters] = useState({
        startDate: '',
        role: 'all',
        searchQuery: ''
    });

    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const initialLoad = useRef(true);
    const [adminInfo, setAdminInfo] = useState(null);
    const [undoingId, setUndoingId] = useState(null);

    // Main data fetching function
    const fetchData = useCallback(async (token) => {
        if (!initialLoad.current) setLoading(true);
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` }, params: filters };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

            const [sessionsRes, actionsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/admin/management/sessions`, config),
                axios.get(`${backendUrl}/api/admin/management/actions`, config)
            ]);
            
            setSessions(sessionsRes.data);
            setActions(actionsRes.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load history data.');
        } finally {
            setLoading(false);
            initialLoad.current = false;
        }
    }, [filters]);

    // Initial load and filter-triggered refetch
    useEffect(() => {
        const adminData = JSON.parse(localStorage.getItem('adminInfo'));
        if (!adminData?.token) {
            router.push('/gn-admin-portal'); return;
        }
        if (adminData.role !== 'superadmin') {
            setError("Access Denied: Super Admin only."); setLoading(false); return;
        }
        
        setAdminInfo(adminData);

        const timer = setTimeout(() => {
            fetchData(adminData.token);
        }, 500);

        return () => clearTimeout(timer);
    }, [router, fetchData, filters]);
    useEffect(() => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        
        const doRefresh = () => {
            if (adminInfo?.token) {
                console.log('Refresh event received, refetching data for Audit Log page...');
                fetchData(adminInfo.token);
            }
        };

        window.addEventListener('refreshAdminData', doRefresh);

        // Cleanup: remove the event listener when the component unmounts
        return () => {
            window.removeEventListener('refreshAdminData', doRefresh);
        };
    }, [fetchData]);
    
    const handleFilterChange = (e) => {
        setFilters(prev => ({...prev, [e.target.name]: e.target.value }));
    };

    const handleUndoAction = async (logId) => {
        if (!window.confirm("Are you sure you want to undo this action?")) return;
        setUndoingId(logId);
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            await axios.post(`${backendUrl}/api/admin/management/actions/${logId}/undo`, {}, config);
            await fetchData(adminInfo.token);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to undo action.');
        } finally {
            setUndoingId(null);
        }
    };

    if (error && initialLoad.current) return <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>;

    return (
        <div className={styles.pageWrapper}>
            <h1 className={styles.header}>Admin Audit Log</h1>
            <div className={styles.filterBar}>
                <div className={`${styles.filterGroup} ${styles.searchGroup}`}>
                    <label htmlFor="searchQuery">Search Action</label>
                    <input type="text" name="searchQuery" id="searchQuery" placeholder="e.g., deleted, created, locked..." value={filters.searchQuery} onChange={handleFilterChange} />
                </div>
                <div className={styles.filterGroup}>
                    <label htmlFor="role">Filter by Role</label>
                    <select name="role" id="role" value={filters.role} onChange={handleFilterChange}>
                        <option value="all">All Roles</option>
                        <option value="superadmin">Superadmin</option>
                        <option value="support">Support</option>
                        <option value="finance">Finance</option>
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label htmlFor="startDate">Show Actions Since</label>
                    <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} />
                </div>
            </div>

            {loading && <div>Loading history...</div>}
            
            {!loading && (
                <div className={styles.tablesGrid}>
                    <div className={styles.tableCard}>
                        <h2 className={styles.cardTitle}>Admin Action History</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.historyTable}>
                                <thead><tr><th>Date</th><th>Admin</th><th>Email</th><th>Role</th><th>Action Details</th></tr></thead>
                                <tbody>
                                    {actions.length > 0 ? actions.map(log => (
                                        <tr key={log._id}>
                                            <td>{formatDate(log.createdAt)}</td>
                                            <td>{log.adminName}</td>
                                            <td>{log.adminEmail}</td>
                                            <td><span className={styles.roleBadge}>{log.adminDetails.role}</span></td>
                                            <td className={styles.actionCell}>{renderActionDetails(log)}</td>
                                        </tr>
                                    )) : <tr><td colSpan="6" className={styles.emptyMessage}>No actions found for this filter.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className={styles.tableCard}>
                        <h2 className={styles.cardTitle}>Session History (Logins/Logouts)</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.historyTable}>
                                <thead><tr><th>Admin</th><th>Email</th><th>Status</th><th>Login Time</th><th>Logout Time</th><th>Duration</th></tr></thead>
                                <tbody>
                                    {sessions.length > 0 ? sessions.map(s => (
                                        <tr key={s._id}>
                                            <td>{s.adminName}</td>
                                            <td>{s.adminEmail}</td>
                                            <td><span className={`${styles.statusBadge} ${styles[`status${s.status}`]}`}>{s.status.replace('_', ' ')}</span></td>
                                            <td>{formatDate(s.loginTime)}</td>
                                            <td>{formatDate(s.logoutTime)}</td>
                                            <td>{formatDuration(s.durationMinutes)}</td>
                                        </tr>
                                    )) : <tr><td colSpan="6" className={styles.emptyMessage}>No sessions found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAuditLogPage;