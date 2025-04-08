'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Use 'useParams' to get token from URL
import Link from 'next/link';
import axios from 'axios';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const params = useParams(); // Hook to get URL parameters
  const router = useRouter();
  const { token } = params; // Extract the token from the URL
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
    console.log("Attempting password reset for token:", token); // Log token being used

    try {
        const config = {
            headers: { 'Content-Type': 'application/json' },
        };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        console.log(`Sending PUT request to: ${backendUrl}/api/auth/reset-password/${token}`); // Log URL

        const { data } = await axios.put(
            `${backendUrl}/api/auth/reset-password/${token}`,
            { password },
            config
        );

        console.log("Reset password success response:", data); // Log success response
        setMessage(data.message || 'Password reset successfully!');
        setLoading(false);

        setTimeout(() => {
            router.push('/login');
        }, 3000);

    } catch (err) {
        console.error('--- Reset Password Request Error ---'); // Log the error clearly
        // Log detailed Axios error information
        if (err.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error("Error Response Data:", err.response.data);
            console.error("Error Response Status:", err.response.status);
            console.error("Error Response Headers:", err.response.headers);
        } else if (err.request) {
            // The request was made but no response was received
            console.error("Error Request Data:", err.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error Message:', err.message);
        }
        console.error("Full Error Object:", err); // Log the full error

        const errorMessage = err.response?.data?.message || 'Failed to reset password. Token might be invalid or expired.';
        console.log("Setting error state to:", errorMessage); // Log the message being set
        setError(errorMessage); // Ensure setError is called
        setLoading(false);
    }
};

   if (!token) {
       // Should not happen if route is accessed correctly, but good practice
       return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-500">Error: Reset token not found in URL.</p>
                 <Link href="/login" className="ml-4 text-yellow-600 hover:underline">Go to Login</Link>
            </div>
       );
   }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold text-center mb-6">Reset Your Password</h1>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {message && <p className="text-green-600 text-center mb-4">{message}</p>}

        {!message && ( // Only show form if no success message
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                New Password
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                type="password"
                placeholder="Enter new password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between mb-4">
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
        // src/app/reset-password/[token]/page.jsx
        {/* Link displayed on success */}
        {message && (
            <div className="text-center mt-4">
        -        <Link href="/login">
        +        <Link href="/">
                    <span className="inline-block align-baseline font-bold text-sm text-yellow-600 hover:text-yellow-800 cursor-pointer">
        -               Proceed to Login
        +               Go to Homepage
                    </span>
                </Link>
                </Link>
            </div>
        )}
        {/* Link displayed on form */}
        {!message && (
            <div className="text-center mt-4">
        -        <Link href="/login">
        +        <Link href="/">
                    <span className="inline-block align-baseline font-bold text-sm text-yellow-600 hover:text-yellow-800 cursor-pointer">
        -                 Back to Login
        +                 Back to Home
                    </span>
                </Link>
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}