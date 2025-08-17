// src/app/forgot-password/page.jsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';

// Using the same Navbar and Footer as the homepage for consistency
import Navbar from '@/components/Navbar'; 
import Footer from '@/components/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
        setError('Please enter a valid email address.');
        return;
    }

    setLoading(true);
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
      const payload = { email: email.trim() };
      const { data } = await axios.post(`${backendUrl}/api/auth/forgot-password`, payload, config);
      setMessage(data.message || 'If an account with that email exists, a password reset link has been sent.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
      setEmail(e.target.value);
      if (error) setError('');
      if (message) setMessage('');
  };

  return (
    <>
      <Navbar />
      {/* CORRECTED: Replaced the old layout with a centered, card-based layout */}
      <main className="flex items-center justify-center flex-grow bg-gray-50 p-4">
        <div className="auth-container"> {/* Using the same container class as signup */}
          <div className="logo">
            <Image src="/GoldNest.png" alt="GoldNest Logo" width={120} height={35} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-2">Forgot Your Password?</h2>
          <p className="text-sm text-gray-600 mb-6">
            Enter your email and we'll send you a link to get back into your account.
          </p>

          {error && <p className="error text-center mb-4">{error}</p>}
          {message && <p className="text-green-600 text-center mb-4">{message}</p>}

          {!message && (
            <form noValidate onSubmit={handleSubmit} className="form">
              <label htmlFor="email">Email Address</label>
              <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={handleInput}
                  required
              />
              <button
                type="submit"
                disabled={loading}
                className="submit-btn mt-4" // Use the consistent submit button class
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="switch-auth mt-2 text-sm">
            <Link href="/" className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}