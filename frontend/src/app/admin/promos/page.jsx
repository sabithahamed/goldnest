// src/app/admin/promos/page.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './Promos.module.css'; // <-- IMPORT THE NEW CSS MODULE

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PromoCodeManagementPage = () => {
    const [promoCodes, setPromoCodes] = useState([]);
    const [newPromoCode, setNewPromoCode] = useState({
        code: '', description: '', 
        promoType: 'DEPOSIT_BONUS', // <-- ADD THIS
        bonusType: 'PERCENTAGE_DEPOSIT',
        bonusValue: '', expiresAt: ''
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    const fetchPromoCodes = useCallback(async (token) => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.get(`${backendUrl}/api/admin/promos`, config);
            setPromoCodes(data);
        } catch (err) {
            setError('Failed to load promo codes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        if (!adminInfo?.token) {
            router.push('/gn-admin-portal');
        } else {
            fetchPromoCodes(adminInfo.token);
        }
    }, [router, fetchPromoCodes]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'code') {
            finalValue = value.toUpperCase().replace(/\s/g, '');
        }
        setNewPromoCode(prev => ({ ...prev, [name]: finalValue }));
    };

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };
    
    const handleCreatePromoCode = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.post(`${backendUrl}/api/admin/promos`, newPromoCode, config);
            setPromoCodes(prev => [data, ...prev]);
            showSuccessMessage('New promo code created successfully!');
            setNewPromoCode({ code: '', description: '', bonusType: 'PERCENTAGE_DEPOSIT', bonusValue: '', expiresAt: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create promo code.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeletePromoCode = async (id) => {
        if (!window.confirm("Are you sure you want to delete this promo code?")) return;
        setDeletingId(id);
        setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            await axios.delete(`${backendUrl}/api/admin/promos/${id}`, config);
            setPromoCodes(prev => prev.filter(p => p._id !== id));
            showSuccessMessage('Promo code deleted!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete promo code.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <h1 className={styles.header}>Promo Code Management</h1>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-6">{error}</p>}
            {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-6">{success}</p>}

            <form onSubmit={handleCreatePromoCode} className={styles.card}>
                <h2 className={styles.cardTitle}>Create New Promo Code</h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="code">Promo Code</label>
                        <input name="code" id="code" value={newPromoCode.code} onChange={handleInputChange} placeholder="e.g., WELCOME10" required className={styles.formInput} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="description">Description</label>
                        <input name="description" id="description" value={newPromoCode.description} onChange={handleInputChange} placeholder="10% off first deposit" required className={styles.formInput} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="bonusType">Bonus Type</label>
                        <select name="bonusType" id="bonusType" value={newPromoCode.bonusType} onChange={handleInputChange} className={styles.formSelect}>
                            <option value="PERCENTAGE_DEPOSIT">Percentage Deposit Bonus</option>
                            <option value="FLAT_LKR_DEPOSIT">Flat LKR Deposit Bonus</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="bonusValue">Bonus Value</label>
                        <input name="bonusValue" id="bonusValue" type="number" value={newPromoCode.bonusValue} onChange={handleInputChange} placeholder="e.g., 10 for 10% or 500 for LKR" required className={styles.formInput} />
                    </div>
                    {/* --- NEW DROPDOWN --- */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="promoType">Promo For</label>
                        <select name="promoType" id="promoType" value={newPromoCode.promoType} onChange={handleInputChange} className={styles.formSelect}>
                            <option value="DEPOSIT_BONUS">Deposit Bonus</option>
                            <option value="PURCHASE_BONUS" disabled>Purchase Bonus (Coming Soon)</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="expiresAt">Expiry Date</label>
                        <input name="expiresAt" id="expiresAt" type="date" value={newPromoCode.expiresAt} onChange={handleInputChange} required className={styles.formInput} />
                    </div>
                </div>
                 <div className={styles.formActions}>
                    <button type="submit" disabled={isSaving} className={styles.submitButton}>
                        {isSaving ? 'Creating...' : 'Create Promo Code'}
                    </button>
                </div>
            </form>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Existing Promo Codes</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.promoTable}>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Description</th>
                                <th>Bonus</th>
                                <th>Expires At</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr>
                            ) : promoCodes.map(p => (
                                <tr key={p._id}>
                                    <td className={styles.code}>{p.code}</td>
                                    <td>{p.description}</td>
                                    <td>{p.bonusType === 'PERCENTAGE_DEPOSIT' ? `${p.bonusValue}%` : `LKR ${p.bonusValue}`}</td>
                                    <td>{formatDate(p.expiresAt)}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${new Date(p.expiresAt) < new Date() ? styles.statusExpired : styles.statusActive}`}>
                                            {new Date(p.expiresAt) < new Date() ? 'Expired' : 'Active'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => handleDeletePromoCode(p._id)} disabled={deletingId === p._id} className="text-red-600 hover:text-red-800 disabled:opacity-50">
                                            {deletingId === p._id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     { !loading && promoCodes.length === 0 && <p className="text-center text-gray-500 py-6">No promo codes have been created yet.</p>}
                </div>
            </div>
        </div>
    );
};

export default PromoCodeManagementPage;