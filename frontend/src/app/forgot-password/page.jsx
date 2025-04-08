// src/app/forgot-password/page.jsx
'use client'; // Required for hooks

import React, { useState } from 'react';
import Link from 'next/link'; // Use Link for navigation
import axios from 'axios';

// Optional: Add Navbar/Footer imports back if you want to include them
// import Navbar from '@/components/Navbar';
// import Footer from '@/components/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Removed: const [showToken, setShowToken] = useState('');

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form action
    setMessage('');
    setError('');
    // Removed: setShowToken('');
    setLoading(true);

    // Basic email validation (optional, can add more robust checks)
    if (!email.trim()) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
    }


    // Hide error instantly if validation passes
    setError('');

    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

      const payload = { email: email.trim() };

      const { data } = await axios.post(
        `${backendUrl}/api/auth/forgot-password`,
        payload,
        config
      );

      // Update success message - instructs user to check email
      setMessage(data.message || 'If an account exists, a password reset link has been sent. Please check your email (including spam folder).');
      // Removed logic to set showToken

      setLoading(false);
      setEmail(''); // Clear email field on success

    } catch (err) {
      console.error('Forgot Password request error:', err);
      // Try to get specific error from backend, otherwise show generic one
      setError(err.response?.data?.message || 'Failed to process request. Please try again.');
      setLoading(false);
    }
  };

  // Function to hide error when user types
  const handleInput = (e) => {
      setEmail(e.target.value);
      if (error) {
          setError(''); // Clear error on input
      }
      if (message) {
          setMessage(''); // Clear success message on new input
      }
  };

  return (
    <>
      {/* Optional: <Navbar /> */}

      {/* Simplified container using flexbox for centering */}
      <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
        <div className="p-8 bg-white rounded shadow-md w-full max-w-md">
          <h1 className="text-xl md:text-2xl font-bold text-center mb-4">Forgot Your Password?</h1>
          <p className="text-center text-sm text-gray-600 mb-6">
            No worries! Enter the email address associated with your account, and we'll send you a link to reset your password if an account is found.
          </p>

          {/* Display error message */}
          {error && <p id="fp-error" className="text-red-500 text-center mb-4 text-sm">{error}</p>}

          {/* Display success message */}
          {message && <p className="text-green-600 text-center mb-4 text-sm">{message}</p>}

          {/* Removed: Demo Token Display Block */}

          {/* Display form only if no success message */}
          {!message && (
            <form id="forgotPasswordForm" noValidate onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 sr-only">Email Address</label> {/* Added sr-only if placeholder is descriptive enough */}
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={handleInput} // Use updated handler
                        required // Added basic HTML5 validation
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        aria-describedby="fp-error" // Link error message for accessibility
                    />
                 </div>

                {/* Removed: Optional Phone number input */}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition duration-150 ease-in-out"
              >
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          )}

          {/* Back to Home Link */}
          <div className="text-center mt-6 text-sm">
             <Link href="/">
               <span className="font-medium text-yellow-600 hover:text-yellow-800 cursor-pointer">
                 Back to Home
               </span>
             </Link>
             {/* Or if using ModalContext and Navbar/Footer are present: */}
             {/* <span className="text-gray-600"> | Remembered password? </span>
             <button onClick={openLoginModal} className="font-medium text-yellow-600 hover:text-yellow-800 focus:outline-none">Login</button> */}
          </div>
        </div>
      </div>

      {/* Optional: <Footer /> */}
    </>
  );
}