// src/app/admin/gamification/page.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './Gamification.module.css';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

const GamificationManagementPage = () => {
    const [challenges, setChallenges] = useState([]);
    const [newChallenge, setNewChallenge] = useState({
        name: '', description: '', type: 'INVEST_LKR_PERIOD', goal: '',
        rewardText: '', rewardType: 'BONUS_STARS', rewardValue: '',
        startDate: '', endDate: ''
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    const fetchChallenges = useCallback(async (token) => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.get(`${backendUrl}/api/admin/gamification`, config);
            setChallenges(data);
        } catch (err) {
            setError('Failed to load challenges.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        if (!adminInfo?.token) {
            router.push('/gn-admin-portal');
        } else {
            fetchChallenges(adminInfo.token);
        }
    }, [router, fetchChallenges]);

    const handleNewChallengeChange = (e) => {
        const { name, value } = e.target;
        setNewChallenge(prev => ({ ...prev, [name]: value }));
    };

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };

    const handleCreateChallenge = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.post(`${backendUrl}/api/admin/gamification`, newChallenge, config);
            setChallenges(prev => [data, ...prev]);
            showSuccessMessage('New challenge created successfully!');
            setNewChallenge({ name: '', description: '', type: 'INVEST_LKR_PERIOD', goal: '', rewardText: '', rewardType: 'BONUS_STARS', rewardValue: '', startDate: '', endDate: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create challenge. Please check all fields.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteChallenge = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this challenge?")) {
            return;
        }
        setDeletingId(id);
        setError('');
        try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            const config = { headers: { Authorization: `Bearer ${adminInfo.token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            await axios.delete(`${backendUrl}/api/admin/gamification/${id}`, config);
            
            setChallenges(prev => prev.filter(c => c._id !== id));
            showSuccessMessage('Challenge deleted successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete challenge.');
        } finally {
            setDeletingId(null);
        }
    };

    // No need for a separate loading return here, as it's handled within the table now.
    // if (loading) return <div>Loading gamification settings...</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-800">Gamification Management</h1>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-6">{error}</p>}
            {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-6">{success}</p>}
            
            <form onSubmit={handleCreateChallenge} className={styles.card}>
                 <h2 className={styles.cardTitle}>Create New Dynamic Challenge</h2>
                <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.fullSpan}`}>
                        <label htmlFor="name" className={styles.formLabel}>Challenge Name</label>
                        <input name="name" id="name" value={newChallenge.name} onChange={handleNewChallengeChange} placeholder="e.g., New Year Invest Fest" required className={styles.formInput} />
                    </div>
                     <div className={`${styles.formGroup} ${styles.fullSpan}`}>
                        <label htmlFor="description" className={styles.formLabel}>Description</label>
                        <input name="description" id="description" value={newChallenge.description} onChange={handleNewChallengeChange} placeholder="e.g., Invest Rs. 10,000 to earn a bonus!" required className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label htmlFor="goal" className={styles.formLabel}>Goal (in LKR)</label>
                        <input name="goal" id="goal" type="number" value={newChallenge.goal} onChange={handleNewChallengeChange} placeholder="e.g., 10000" required className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label htmlFor="rewardValue" className={styles.formLabel}>Reward (Stars)</label>
                        <input name="rewardValue" id="rewardValue" type="number" value={newChallenge.rewardValue} onChange={handleNewChallengeChange} placeholder="e.g., 15" required className={styles.formInput} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullSpan}`}>
                        <label htmlFor="rewardText" className={styles.formLabel}>Reward Text</label>
                         <input name="rewardText" id="rewardText" value={newChallenge.rewardText} onChange={handleNewChallengeChange} placeholder="e.g., +15 Bonus Stars" required className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label htmlFor="startDate" className={styles.formLabel}>Start Date</label>
                        <input name="startDate" id="startDate" type="date" value={newChallenge.startDate} onChange={handleNewChallengeChange} required className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label htmlFor="endDate" className={styles.formLabel}>End Date</label>
                        <input name="endDate" id="endDate" type="date" value={newChallenge.endDate} onChange={handleNewChallengeChange} required className={styles.formInput} />
                    </div>
                 </div>
                 <div className={styles.formActions}>
                    <button type="submit" disabled={isSaving} className={styles.submitButton}>
                        {isSaving ? 'Creating...' : 'Create Challenge'}
                    </button>
                </div>
            </form>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Existing Dynamic Challenges</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.challengesTable}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Goal (LKR)</th>
                                <th>Reward</th>
                                <th>Period</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center text-gray-500 py-6">Loading challenges...</td>
                                </tr>
                            ) : challenges.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center text-gray-500 py-6">No dynamic challenges have been created yet.</td>
                                </tr>
                            ) : (
                                challenges.map(c => (
                                    <tr key={c._id}>
                                        <td className={styles.name}>{c.name}</td>
                                        <td>{new Intl.NumberFormat().format(c.goal)}</td>
                                        <td>{c.rewardText}</td>
                                        <td>{formatDate(c.startDate)} - {formatDate(c.endDate)}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${new Date(c.endDate) < new Date() ? styles.statusExpired : styles.statusActive}`}>
                                                {new Date(c.endDate) < new Date() ? 'Expired' : 'Active'}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => handleDeleteChallenge(c._id)}
                                                disabled={deletingId === c._id}
                                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                title="Delete Challenge"
                                            >
                                                {deletingId === c._id ? (
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                ) : (
                                                    <i className="fas fa-trash-alt"></i>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GamificationManagementPage;