// src/app/admin/settings/page.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './Settings.module.css';

const AdminSettingsPage = () => {
    const [settings, setSettings] = useState({
        BUY_FEE_PERCENT: '',
        SELL_FEE_PERCENT: ''
    });
    // NEW State for the gold price form
    const [goldPriceEntry, setGoldPriceEntry] = useState({ date: '', price: '' });
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingPrice, setIsAddingPrice] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

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
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        if (!adminInfo?.token) {
            router.push('/gn-admin-portal');
        } else {
            fetchSettings(adminInfo.token);
        }
    }, [router, fetchSettings]);

    const handleSettingChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };
    
    // NEW handler for the gold price form
    const handlePriceEntryChange = (e) => {
        const { name, value } = e.target;
        setGoldPriceEntry(prev => ({ ...prev, [name]: value }));
    };

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };

    const handleSaveFeeSettings = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        const payload = {
            BUY_FEE_PERCENT: parseFloat(settings.BUY_FEE_PERCENT) / 100,
            SELL_FEE_PERCENT: parseFloat(settings.SELL_FEE_PERCENT) / 100
        };
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            await axios.put(`${backendUrl}/api/admin/settings`, payload, config);
            showSuccessMessage('Fee settings updated successfully!');
            fetchSettings(adminInfo.token);
        } catch (err) {
            setError('Failed to save fee settings.');
        } finally {
            setIsSaving(false);
        }
    };
    
    // NEW handler to add a gold price entry
    const handleAddPrice = async (e) => {
        e.preventDefault();
        setIsAddingPrice(true);
        setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            await axios.post(`${backendUrl}/api/admin/settings/gold-price`, goldPriceEntry, config);
            showSuccessMessage(`Gold price for ${goldPriceEntry.date} added successfully!`);
            setGoldPriceEntry({ date: '', price: '' }); // Reset form
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add gold price.');
        } finally {
            setIsAddingPrice(false);
        }
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <div className={styles.pageWrapper}>
            <h1 className={styles.header}>Platform Settings</h1>
            
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-6">{error}</p>}
            {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-6">{success}</p>}

            {/* NEW: Gold Price Entry Form */}
            <form onSubmit={handleAddPrice} className={styles.card}>
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
                    <button type="submit" disabled={isAddingPrice} className={styles.submitButton}>
                        {isAddingPrice ? 'Adding...' : 'Add Price Entry'}
                    </button>
                </div>
            </form>

            {/* Financial Parameters Form (Fees Only) */}
            <form onSubmit={handleSaveFeeSettings} className={styles.card}>
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
                    <button type="submit" disabled={isSaving} className={styles.submitButton}>
                        {isSaving ? 'Saving...' : 'Save Fee Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminSettingsPage;