// src/app/gn-admin-portal/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import styles from './AdminLogin.module.css'; // <-- IMPORT THE NEW CSS MODULE

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'delivery'
  const router = useRouter();

  useEffect(() => {
    const adminInfo = localStorage.getItem('adminInfo');
    if (adminInfo) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

      const { data } = await axios.post(
        `${backendUrl}/api/admin/auth/login`,
        { email, password },
        config
      );

      localStorage.setItem('adminInfo', JSON.stringify(data));
      
      setLoading(false);
      router.push('/admin/dashboard');

    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.loginContainer}>
        <div className={styles.logoContainer}>
          <Image src="/GoldNest.png" alt="GoldNest Logo" width={150} height={50} />
        </div>
        <div style={{
            background: '#fffaf2',
            border: '1px solid #f5d08c',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '0.9rem',
            maxWidth: '320px',
            margin: '0 auto 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
        }}>
            <div style={{ fontWeight: 600, color: '#6b4005', marginBottom: '6px' }}>🔑 Demo Credentials</div>
            <div><strong>Email:</strong> admin@goldnest.lk</div>
            <div><strong>Password:</strong> goldnest1234</div>
        </div>
        <div className={styles.roleSwitcher}>
            <button 
                onClick={() => setActiveTab('admin')}
                className={`${styles.roleButton} ${activeTab === 'admin' ? styles.activeRole : styles.inactiveRole}`}
            >
                Admin
            </button>
            <button 
                onClick={() => setActiveTab('delivery')}
                className={`${styles.roleButton} ${activeTab === 'delivery' ? styles.activeRole : styles.inactiveRole}`}
            >
                Delivery
            </button>
        </div>

        {activeTab === 'admin' && (
            <form onSubmit={handleSubmit} className={styles.loginForm}>
                {error && <p className="text-red-500 text-center text-sm -mt-2 mb-2">{error}</p>}

                <div className={styles.inputGroup}>
                    <i className={`fas fa-user ${styles.inputIcon}`}></i>
                    <input
                      className={styles.inputField}
                      id="email"
                      type="email"
                      placeholder="Username / Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <i className={`fas fa-lock ${styles.inputIcon}`}></i>
                    <input
                      className={styles.inputField}
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                </div>

                <Link href="#" className={styles.forgotPassword}>Forgot Password?</Link>

                <button
                  className={styles.loginButton}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Login'}
                </button>
            </form>
        )}

        {activeTab === 'delivery' && (
            <div className={styles.comingSoon}>
                <p>The Delivery Partner Portal is coming soon.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;