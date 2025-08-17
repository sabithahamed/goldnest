// src/app/reset-password/[token]/page.jsx
'use client';

import React, { useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';

// Import the standard Navbar and Footer for a consistent look
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const params = useParams();
  const router = useRouter();
  const { token } = params;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!password || !confirmPassword) {
        setError('Please enter and confirm your new password.');
        return;
    }
    if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
    }
    if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
    }

    setLoading(true);

    try {
        const config = { headers: { 'Content-Type': 'application/json' } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        const { data } = await axios.put(
            `${backendUrl}/api/auth/reset-password/${token}`,
            { password },
            config
        );

        setMessage(data.message || 'Password reset successfully! You can now log in.');
        
        setTimeout(() => {
            router.push('/'); // Redirect to home, where they can open the login modal
        }, 3000);

    } catch (err) {
        const errorMessage = err.response?.data?.message || 'Failed to reset password. The link may be invalid or expired.';
        setError(errorMessage);
    } finally {
        setLoading(false);
    }
  };

  if (!token) {
    return (
        <div className="auth-container">
            <h2 className="text-xl font-bold">Invalid Link</h2>
            <p className="error">Password reset token not found in URL.</p>
            <Link href="/" className="font-medium text-yellow-600 hover:text-yellow-800">
                Go to Homepage
            </Link>
        </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="logo">
        <Image src="/GoldNest.png" alt="GoldNest Logo" width={120} height={35} />
      </div>
      <h2 className="text-xl font-bold mb-6">Set a New Password</h2>

      {error && <p className="error text-center mb-4">{error}</p>}
      {message && <p className="text-green-600 text-center mb-4">{message}</p>}

      {!message && (
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="password">New Password</label>
          <input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          
          <button
            type="submit"
            disabled={loading}
            className="submit-btn mt-4"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}

      <div className="switch-auth mt-2 text-sm">
        <Link href="/">
          <span className="font-medium text-yellow-600 hover:text-yellow-800 cursor-pointer">
            ← Back to Home
          </span>
        </Link>
      </div>
    </div>
  );
}

// --- Main Export with Suspense Boundary ---
export default function ResetPasswordPage() {
    return (
        <>
            <Navbar />
            <main className="flex items-center justify-center flex-grow bg-gray-50 p-4">
                <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                    <ResetPasswordContent />
                </Suspense>
            </main>
            <Footer />
        </>
    );
}