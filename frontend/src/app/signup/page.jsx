'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    nic: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { name, email, phone, address, city, nic, password, confirmPassword } = formData;

    // Basic Validations
    if (!name || !email || !phone || !password || !confirmPassword) {
       setError('Please fill in all required fields.');
       setLoading(false);
       return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
     if (password.length < 8) { // Match your UI text
       setError('Password must be at least 8 characters long.');
       setLoading(false);
       return;
     }
    if (!agreeTerms) {
      setError('You must agree to the Terms of Service & Privacy Policy.');
      setLoading(false);
      return;
    }

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

      // Send only the necessary fields to the backend register endpoint
      const { data } = await axios.post(
        `${backendUrl}/api/auth/register`,
        { name, email, password, phone, nic, address, city }, // Send all relevant fields
        config
      );

      // --- Success ---
      console.log('Signup successful:', data);
      // Store user info and token (same as login)
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('userToken', data.token);

      setLoading(false);
      // Redirect to dashboard
      router.push('/dashboard');

    } catch (err) {
      // --- Error ---
       console.error('Signup error:', err);
      setError(
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : 'Signup failed. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome to GoldNest</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Your name</label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3" id="name" type="text" placeholder="First & last name" onChange={handleChange} value={formData.name} required />
          </div>
          {/* Email */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3" id="email" type="email" placeholder="abc@example.com" onChange={handleChange} value={formData.email} required />
          </div>
          {/* Phone */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">Phone number</label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3" id="phone" type="tel" placeholder="07xxxxxxxx" onChange={handleChange} value={formData.phone} required />
          </div>
          {/* Address */}
          <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">Address</label>
              <input className="shadow appearance-none border rounded w-full py-2 px-3" id="address" type="text" onChange={handleChange} value={formData.address} />
          </div>
          {/* City */}
           <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">City</label>
              <input className="shadow appearance-none border rounded w-full py-2 px-3" id="city" type="text" onChange={handleChange} value={formData.city} />
          </div>
          {/* NIC */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nic">NIC number</label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3" id="nic" type="text" onChange={handleChange} value={formData.nic} />
          </div>
          {/* Password */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3" id="password" type="password" placeholder="At least 8 characters" onChange={handleChange} value={formData.password} required />
          </div>
          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">Re-enter password</label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3" id="confirmPassword" type="password" onChange={handleChange} value={formData.confirmPassword} required />
          </div>
          {/* Terms Checkbox */}
          <div className="mb-6">
              <label className="flex items-center">
                  <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-yellow-600" // Style checkbox
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                      By creating an account you agree to our{' '}
                      <Link href="/terms"><span className="text-yellow-600 hover:underline cursor-pointer">Terms of Service</span></Link> &{' '}
                      <Link href="/privacy"><span className="text-yellow-600 hover:underline cursor-pointer">Privacy Policy</span></Link>.
                  </span>
              </label>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create'}
            </button>
          </div>
            {/* Add social signups if needed */}
          <div className="text-center mt-4">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/login">
              <span className="font-bold text-yellow-600 hover:text-yellow-800 cursor-pointer">
                Log In
              </span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}