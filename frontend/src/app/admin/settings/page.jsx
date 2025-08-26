// src/app/admin/settings/page.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './Settings.module.css';
import PasswordConfirmModal from '../components/PasswordConfirmModal';

const AdminSettingsPage = () => {
    // Component State
    const [settings, setSettings] = useState({ BUY_FEE_PERCENT: '', SELL_FEE_PERCENT: '' });
    const [goldPriceEntry, setGoldPriceEntry] = useState({ date: '', price: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    // Security & Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [adminRole, setAdminRole] = useState('');
    const [isConfirmingAction, setIsConfirmingAction] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);

    const fetchSettings = useCallback(async (token) => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.get(`${backendUrl}/api/admin/settings`, config);
            const displaySettings = {
                ...data.settings,
                BUY_FEE_PERCENT: data.settings.BUY_FEE_PERCENT ? data.settings.BUY_FEE_PERCENT * 100 : '',
                SELL_FEE_PERCENT: data.settings.SELL_FEE_PERCENT ? data.settings.SELL_FEE_PERCENT * 100 : ''
            };
            setSettings(prev => ({ ...prev, ...displaySettings }));
        } catch (err) {
            setError('Failed to load settings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const adminInfoString = localStorage.getItem('adminInfo');
        if (!adminInfoString) {
            router.push('/gn-admin-portal');
        } else {
            const adminInfo = JSON.parse(adminInfoString);
            setAdminRole(adminInfo.role);
            fetchSettings(adminInfo.token);
        }
    }, [router, fetchSettings]);

    // Input Handlers
    const handleSettingChange = (e) => setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handlePriceEntryChange = (e) => setGoldPriceEntry(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };

    // --- Action Execution Functions ---
    const executeSaveFeeSettings = async (password) => {
        setIsConfirmingAction(true);
        setError('');
        const payload = {
            BUY_FEE_PERCENT: parseFloat(settings.BUY_FEE_PERCENT) / 100,
            SELL_FEE_PERCENT: parseFloat(settings.SELL_FEE_PERCENT) / 100,
            confirmationPassword: password
        };
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            await axios.put(`${backendUrl}/api/admin/settings`, payload, config);
            showSuccessMessage('Fee settings updated successfully!');
            fetchSettings(adminInfo.token);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save fee settings.');
        } finally {
            setIsConfirmingAction(false);
            setShowConfirmModal(false);
        }
    };

    const executeAddPrice = async (password) => {
        setIsConfirmingAction(true);
        setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const payload = { ...goldPriceEntry, confirmationPassword: password };
            await axios.post(`${backendUrl}/api/admin/settings/gold-price`, payload, config);
            showSuccessMessage(`Gold price for ${goldPriceEntry.date} added successfully!`);
            setGoldPriceEntry({ date: '', price: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add gold price.');
        } finally {
            setIsConfirmingAction(false);
            setShowConfirmModal(false);
        }
    };

    // --- Action Initiation Functions ---
    const handleSaveFeeInitiation = (e) => {
        e.preventDefault();
        if (adminRole === 'superadmin') {
            executeSaveFeeSettings("SUPERADMIN_BYPASS");
        } else {
            setActionToConfirm(() => (password) => executeSaveFeeSettings(password));
            setShowConfirmModal(true);
        }
    };

    const handleAddPriceInitiation = (e) => {
        e.preventDefault();
        if (adminRole === 'superadmin') {
            executeAddPrice("SUPERADMIN_BYPASS");
        } else {
            setActionToConfirm(() => (password) => executeAddPrice(password));
            setShowConfirmModal(true);
        }
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <>
            <div className={styles.pageWrapper}>
                <h1 className={styles.header}>Platform Settings</h1>
                
                {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-6">{error}</p>}
                {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-6">{success}</p>}

                <form onSubmit={handleAddPriceInitiation} className={styles.card}>
                    <h2 className={styles.cardTitle}>Add Daily Gold Price</h2>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="date" className={styles.formLabel}>Date</label>
                            <p className={styles.formDescription}>Select the date for this price entry.</p>
                            <input type="date" name="date" id="date"
                                value={goldPriceEntry.date} onChange={handlePriceEntryChange} required
                                className={styles.formInput} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="price" className={styles.formLabel}>Price (LKR per Gram)</label>
                            <p className={styles.formDescription}>Enter the closing market price for the selected date.</p>
                            <input type="number" step="0.01" name="price" id="price"
                                value={goldPriceEntry.price} onChange={handlePriceEntryChange} required
                                className={styles.formInput} />
                        </div>
                    </div>
                    <div className={styles.formActions}>
                        <button type="submit" disabled={isConfirmingAction} className={styles.submitButton}>
                            {isConfirmingAction ? 'Adding...' : 'Add Price Entry'}
                        </button>
                    </div>
                </form>

                <form onSubmit={handleSaveFeeInitiation} className={styles.card}>
                    <h2 className={styles.cardTitle}>Financial Parameters</h2>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="BUY_FEE_PERCENT" className={styles.formLabel}>Buy Fee (%)</label>
                            <p className={styles.formDescription}>The commission percentage charged on user buy orders.</p>
                            <input type="number" step="0.01" name="BUY_FEE_PERCENT" id="BUY_FEE_PERCENT"
                                value={settings.BUY_FEE_PERCENT || ''} 
                                onChange={handleSettingChange} required placeholder="e.g., 1.5"
                                className={styles.formInput} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="SELL_FEE_PERCENT" className={styles.formLabel}>Sell Fee (%)</label>
                            <p className={styles.formDescription}>The commission percentage charged on user sell orders.</p>
                            <input type="number" step="0.01" name="SELL_FEE_PERCENT" id="SELL_FEE_PERCENT"
                                value={settings.SELL_FEE_PERCENT || ''} 
                                onChange={handleSettingChange} required placeholder="e.g., 0.75"
                                className={styles.formInput} />
                        </div>
                    </div>
                    <div className={styles.formActions}>
                        <button type="submit" disabled={isConfirmingAction} className={styles.submitButton}>
                            {isConfirmingAction ? 'Saving...' : 'Save Fee Settings'}
                        </button>
                    </div>
                </form>
            </div>

            {showConfirmModal && (
                <PasswordConfirmModal
                    onCancel={() => setShowConfirmModal(false)}
                    onConfirm={actionToConfirm}
                    isConfirming={isConfirmingAction}
                />
            )}
        </>
    );
};
export default AdminSettingsPage;