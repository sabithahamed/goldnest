// src/app/admin/management/page.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './Management.module.css'; // <-- IMPORT THE NEW CSS MODULE

const formatDate = (dateString) => new Date(dateString).toLocaleString('en-GB');

const AdminManagementPage = () => {
    const [admins, setAdmins] = useState([]);
    const [logs, setLogs] = useState([]);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'support' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    const fetchData = useCallback(async (token) => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const [adminsRes, logsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/admin/management/accounts`, config),
                axios.get(`${backendUrl}/api/admin/management/audit-log`, config),
            ]);
            setAdmins(adminsRes.data);
            setLogs(logsRes.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load data. You may not have superadmin permissions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        if (!adminInfo?.token) {
            router.push('/gn-admin-portal');
        } else if (adminInfo.role !== 'superadmin') {
            setError("Access Denied: You must be a Super Admin to view this page.");
            setLoading(false);
        } else {
            fetchData(adminInfo.token);
        }
    }, [router, fetchData]);

    const handleInputChange = (e) => {
        setNewAdmin(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setIsSaving(true); setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.post(`${backendUrl}/api/admin/management/accounts`, newAdmin, config);
            setAdmins(prev => [...prev, data]);
            showSuccessMessage('New admin created successfully!');
            setNewAdmin({ name: '', email: '', password: '', role: 'support' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create admin.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div>Loading Management Console...</div>;
    if (error) return <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>;

    return (
        <div className={styles.pageWrapper}>
            <h1 className={styles.header}>Admin Management</h1>
            {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-6">{success}</p>}
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-6">{error}</p>}

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Create New Admin User</h2>
                <form onSubmit={handleCreateAdmin} className={styles.createForm}>
                    <input name="name" value={newAdmin.name} onChange={handleInputChange} placeholder="Full Name" required className={styles.formInput}/>
                    <input name="email" type="email" value={newAdmin.email} onChange={handleInputChange} placeholder="Email Address" required className={styles.formInput}/>
                    <input name="password" type="password" value={newAdmin.password} onChange={handleInputChange} placeholder="Initial Password" required className={styles.formInput}/>
                    <select name="role" value={newAdmin.role} onChange={handleInputChange} className={styles.formSelect}>
                        <option value="support">Support</option>
                        <option value="finance">Finance</option>
                    </select>
                    <button type="submit" disabled={isSaving} className={styles.createButton}>
                        {isSaving ? 'Creating...' : 'Create Admin'}
                    </button>
                </form>
            </div>
            
            <div className={styles.widgetsGrid}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Admin Accounts</h2>
                    <ul className={styles.list}>
                        {admins.length > 0 ? admins.map(admin => (
                            <li key={admin._id} className={styles.listItem}>
                                <div>
                                    <p className={styles.name}>{admin.name}</p>
                                    <p className={styles.email}>{admin.email}</p>
                                </div>
                                <span className={styles.roleBadge}>{admin.role}</span>
                            </li>
                        )) : <p>No other admin accounts found.</p>}
                    </ul>
                </div>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Recent Admin Actions</h2>
                    <ul className={styles.list}>
                         {logs.length > 0 ? logs.map(log => (
                            <li key={log._id} className={styles.listItem}>
                                <div>
                                    <p className={styles.logAction}><span className="font-semibold">{log.adminName}</span> {log.action}</p>
                                    <p className={styles.logDate}>{formatDate(log.createdAt)}</p>
                                </div>
                            </li>
                        )) : <p>No actions logged yet.</p>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminManagementPage;