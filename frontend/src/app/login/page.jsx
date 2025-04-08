'use client'; // Required for hooks like useState, useEffect, useRouter in App Router

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import axios from 'axios'; // Or use fetch

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError(''); // Clear previous errors
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Adjust the URL to your backend endpoint
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
      const { data } = await axios.post(
        `${backendUrl}/api/auth/login`,
        { email, password },
        config
      );

      // --- Success ---
      console.log('Login successful:', data);
      // Store user info and token in localStorage (simple approach for now)
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('userToken', data.token); // Store token separately if needed

      setLoading(false);
      // Redirect to dashboard (assuming '/dashboard' route)
      router.push('/dashboard'); // Use router.push for navigation

    } catch (err) {
      // --- Error ---
      console.error('Login error:', err);
      setError(
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : 'Login failed. Please check your credentials.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100"> {/* Basic centering */}
      <div className="p-8 bg-white rounded shadow-md w-full max-w-md"> {/* Basic card */}
        {/* Replace with your GoldNest Logo Component/Image if you have one */}
        <h1 className="text-2xl font-bold text-center mb-6">Welcome to GoldNest</h1>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email or Phone number {/* Assuming backend uses email */}
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email" // Use type="email" for basic validation
              placeholder="Email/Phone"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required // HTML5 validation
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between mb-4">
            <button
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </div>
          {/* Add "or" separator and social logins if needed - functionality later */}
          <div className="text-center mb-4">
             {/* Add Google/Apple buttons here - make them simple buttons for now */}
             <button type="button" className="border rounded p-2 w-full mb-2">Continue with Google</button>
             <button type="button" className="border rounded p-2 w-full">Continue with Apple</button>
          </div>
          <div className="text-center">
            <Link href="/forgot-password"> {/* Ensure this points to the correct route */}
                <span className="inline-block align-baseline font-bold text-sm text-yellow-600 hover:text-yellow-800 cursor-pointer">
                Forgot password?
                </span>
            </Link>
          </div>
          <div className="text-center mt-4">
            <span className="text-gray-600">Don't have an account? </span>
            <Link href="/signup">
              <span className="font-bold text-yellow-600 hover:text-yellow-800 cursor-pointer">
                Sign up
              </span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}