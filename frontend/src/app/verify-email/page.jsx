// src/app/verify-email/page.jsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Use useSearchParams
import Link from 'next/link';
import axios from 'axios';
import Navbar from '@/components/Navbar'; // Optional: Include layout if desired
import Footer from '@/components/Footer'; // Optional: Include layout if desired

// --- Component to read search params ---
// Next.js requires Suspense boundary for useSearchParams
function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams(); // Hook to get URL query parameters

    const [otp, setOtp] = useState('');
    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Extract userId and email from URL query params on component mount
        const urlUserId = searchParams.get('userId');
        const urlEmail = searchParams.get('email');
        if (urlUserId) setUserId(urlUserId);
        if (urlEmail) setEmail(urlEmail);

        if (!urlUserId) {
            setError("User ID missing. Cannot verify email.");
             // Optionally redirect to signup or login if critical info missing
             // router.push('/signup');
        } else {
             setMessage(`An OTP has been sent to ${decodeURIComponent(urlEmail || 'your email')}. Please enter it below.`);
        }
    }, [searchParams, router]);


    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        if (!userId || !otp || otp.length !== 6) { // Basic OTP validation
            setError('Please enter a valid 6-digit OTP.');
            setLoading(false);
            return;
        }

        try {
            const config = { headers: { 'Content-Type': 'application/json' } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

            const { data } = await axios.post(
                `${backendUrl}/api/auth/verify-email`,
                { userId, otp },
                config
            );

            // --- Verification SUCCESS ---
            setMessage('Email verified successfully! Redirecting...');
            // Store user info and token received from backend
            localStorage.setItem('userInfo', JSON.stringify(data)); // Backend sends user info + token on successful verify
            localStorage.setItem('userToken', data.token);
            setLoading(false);

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);

        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Invalid or expired OTP.');
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
         setError('');
         setMessage('');
         setResendLoading(true);

         if (!email) { // Need email to resend
              setError('Cannot resend OTP without a valid email address.');
              setResendLoading(false);
              return;
         }

         try {
             const config = { headers: { 'Content-Type': 'application/json' } };
             const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
             const { data } = await axios.post(
                 `${backendUrl}/api/auth/resend-verification`,
                 { email }, // Backend endpoint uses email to find user
                 config
             );
             setMessage(data.message || 'New OTP sent successfully.');

         } catch (err) {
              setError(err.response?.data?.message || 'Failed to resend OTP.');
         } finally {
             setResendLoading(false);
         }
     };

    return (
        <>
            {/* Optional Navbar/Footer */}
            {/* <Navbar /> */}

            {/* Use styles consistent with login/signup */}
            <div className="auth-container" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2>Verify Your Email</h2>
                <p className="text-center text-sm text-gray-600 mb-6">
                   {message || `Enter the 6-digit OTP sent to ${decodeURIComponent(email || 'your email')}.`}
                </p>

                {error && <p className="error text-center mb-4">{error}</p>}

                <form onSubmit={handleVerify} className="form">
                    <label htmlFor="otp">Enter OTP</label>
                    <input
                        type="text" // Use text for easier input on some devices
                        id="otp"
                        name="otp"
                        placeholder="6-Digit Code"
                        maxLength="6"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // Allow only numbers
                        required
                        style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2em' }}
                    />
                    <button type="submit" className="submit-btn" disabled={loading || !userId}>
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <p className="switch-auth mt-4 text-sm">
                    Didn't receive the OTP?{' '}
                    <button onClick={handleResendOtp} disabled={resendLoading || !email} className="link-btn disabled:opacity-50 disabled:cursor-not-allowed">
                        {resendLoading ? 'Sending...' : 'Resend OTP'}
                    </button>
                </p>
                 <p className="switch-auth mt-2 text-sm">
                     <Link href="/signup">Back to Signup</Link>
                 </p>
            </div>

            {/* <Footer /> */}
        </>
    );
}

// --- Main Export with Suspense Boundary ---
export default function VerifyEmailPage() {
    // Suspense is required to use useSearchParams in App Router Pages
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}