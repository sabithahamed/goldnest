// src/app/admin-password-setup/[token]/page.jsx
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import styles from './AdminPasswordSetup.module.css'; // We will create this file next

const AdminPasswordSetupPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { token } = params;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const endpoint = `${backendUrl}/api/admin/auth/reset-password/${token}`;
            
            const { data } = await axios.put(endpoint, { password });
            
            setSuccess(data.message);
            // Redirect to the admin login page after a short delay
            setTimeout(() => {
                router.push('/gn-admin-portal');
            }, 3000);

        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred. The link may be invalid or expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formWrapper}>
                <h1 className={styles.title}>Set Up Your Admin Account</h1>
                <p className={styles.subtitle}>Create a secure password to access the GoldNest admin panel.</p>

                {success ? (
                    <div className={styles.successBox}>
                        <p>{success}</p>
                        <p>Redirecting you to the login page...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <p className={styles.errorText}>{error}</p>}
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="password">New Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter at least 8 characters"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Re-enter your password"
                            />
                        </div>

                        <button type="submit" disabled={loading} className={styles.submitButton}>
                            {loading ? 'Setting Password...' : 'Set Password and Continue'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AdminPasswordSetupPage;