// src/components/LoginModal.jsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/ModalContext'; // This import is crucial

// Assume icons are in public
const logoSrc = "/GoldNest.png";
const googleIconSrc = "/google-icon.png";
const appleIconSrc = "/apple-icon.png";

export default function LoginModal() {
    // Added openGenericModal to the destructuring
    const { isLoginModalOpen, closeLoginModal, openGenericModal } = useModal(); 
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
                
                // Using openGenericModal to show the error
                openGenericModal(
                    'Verification Required',
                    'Your email is not verified. Please check your email for an OTP or resend.',
                    'error'
                );

                if (userId) {
                    closeLoginModal(); // Close modal before redirecting
                    router.push(`/verify-email?userId=${userId}&email=${encodeURIComponent(email)}`);
                }

            } else {
                // Using openGenericModal for other errors
                openGenericModal(
                    'Login Failed',
                    err.response?.data?.message || 'Login failed. Check credentials.',
                    'error'
                );
            }
        }
    };

    // REPLACED ALERTS
    const handleGoogleSignIn = () => {
        openGenericModal(
            'Feature Not Available',
            'Google Sign-In not implemented yet.',
            'info'
        );
    };
    const handleAppleSignIn = () => {
        openGenericModal(
            'Feature Not Available',
            'Apple Sign-In not implemented yet.',
            'info'
        );
    };

    if (!isLoginModalOpen) {
        return null;
    }

    return (
        // Use classes from styles.css for overlay and modal
        <div id="login-modal" className="modal-overlay">
            <div className="modal">
                <button className="close-btn" onClick={closeLoginModal}>×</button>
                <div className="logo">
                    <Image src={logoSrc} alt="GoldNest Logo" width={120} height={35} />
                </div>
                <h2>Welcome to GoldNest</h2>
                {/* Removed the local error display, as the modal will now handle it */}
                {/* {error && <p id="login-error" className="error">{error}</p>} */}

                <form id="login-form" className="form" onSubmit={handleLogin}>
                    <label htmlFor="email-or-phone">Email or Phone number</label>
                    <input
                        type="email"
                        id="email-or-phone"
                        name="emailOrPhone"
                        placeholder="Email"
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
                    <Link href="/forgot-password" onClick={closeLoginModal}>Forgot password?</Link>
                </p>
                <p className="switch-auth">
                    Don’t have an account?{' '}
                    <Link href="/signup" onClick={closeLoginModal}>Sign up</Link>
                </p>
            </div>
        </div>
    );
}