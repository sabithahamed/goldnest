// src/components/LoginModal.jsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/ModalContext';

// Assume icons are in public
const logoSrc = "/GoldNest.png";
const googleIconSrc = "/google-icon.png"; // Ensure these exist
const appleIconSrc = "/apple-icon.png";   // Ensure these exist

export default function LoginModal() {
    const { isLoginModalOpen, closeLoginModal } = useModal();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Please enter both email and password.');
            setLoading(false);
            return;
        }

        try {
            const config = { headers: { 'Content-Type': 'application/json' } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const { data } = await axios.post(`${backendUrl}/api/auth/login`, { email, password }, config);

            localStorage.setItem('userInfo', JSON.stringify(data));
            localStorage.setItem('userToken', data.token);
            setLoading(false);
            closeLoginModal();
            router.push('/dashboard');

        } catch (err) {
            setLoading(false);
            // --- Check for specific 403 Forbidden (Email Not Verified) ---
            if (err.response && err.response.status === 403 && err.response.data?.verificationNeeded) {
                const userId = err.response.data.userId; // Get userId from error response
                setError(`Email not verified. Please check your email for an OTP or resend.`);
                // Option 1: Just show error in modal
                // Option 2: Automatically redirect to verify page
                if (userId) {
                    closeLoginModal(); // Close modal before redirecting
                    router.push(`/verify-email?userId=${userId}&email=${encodeURIComponent(email)}`);
                } else {
                    // Fallback if userId wasn't returned in error
                    setError('Email not verified. Please check your email or try signing up again.');
                }
            } else {
                // --- Handle other errors (e.g., 401 Invalid Credentials) ---
                setError(err.response?.data?.message || 'Login failed. Check credentials.');
            }
        }
    };

    // Placeholder Social Logins
    const handleGoogleSignIn = () => alert("Google Sign-In not implemented yet.");
    const handleAppleSignIn = () => alert("Apple Sign-In not implemented yet.");

    if (!isLoginModalOpen) {
        return null;
    }

    return (
        // Use classes from styles.css for overlay and modal
        <div id="login-modal" className="modal-overlay">
            <div className="modal">
                <button className="close-btn" onClick={closeLoginModal}>×</button> {/* Close button */}
                <div className="logo">
                    <Image src={logoSrc} alt="GoldNest Logo" width={120} height={35} />
                </div>
                <h2>Welcome to GoldNest</h2>

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
                    <div><strong>Email:</strong> test@goldnest.lk</div>
                    <div><strong>Password:</strong> goldnest-test</div>
                </div>

                {error && <p id="login-error" className="error">{error}</p>} {/* Display errors */}

                <form id="login-form" className="form" onSubmit={handleLogin}>
                    <label htmlFor="email-or-phone">Email or Phone number</label>
                    <input
                        type="email" // Changed to email for consistency with backend
                        id="email-or-phone"
                        name="emailOrPhone"
                        placeholder="Email" // Changed placeholder
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <label htmlFor="login-password">Password</label>
                    <input
                        type="password"
                        id="login-password"
                        name="password"
                        placeholder="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging In...' : 'Log In'}
                    </button>
                </form>

                <div className="divider">or</div>
                <button className="social-btn" onClick={handleGoogleSignIn}>
                    <Image src={googleIconSrc} alt="Google" width={20} height={20} /> Continue with Google
                </button>
                <button className="social-btn" onClick={handleAppleSignIn}>
                    <Image src={appleIconSrc} alt="Apple" width={20} height={20} /> Continue with Apple
                </button>

                <p className="switch-auth">
                    {/* Still link to forgot-password page */}
                    <Link href="/forgot-password" onClick={closeLoginModal}>Forgot password?</Link>
                </p>
                <p className="switch-auth">
                    Don’t have an account?{' '}
                    {/* Link to signup page */}
                    <Link href="/signup" onClick={closeLoginModal}>Sign up</Link>
                </p>
            </div>
        </div>
    );
}