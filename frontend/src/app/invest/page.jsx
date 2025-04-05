'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import DashboardLayout from '../dashboard/layout'; // Adjust path if layout is moved

// --- Placeholder/Static Data (match UI) ---
const LIVE_PRICE_EXAMPLE = "323,212.22"; // Rs per 10g? Or per g? Let's assume per 10g for display
const LIVE_PRICE_DATE = "20th March 2025 16:18:21"; // Static Date from UI
const SIMULATED_GOLD_PRICE_PER_GRAM_LKR = 11000; // Match backend simulation for display consistency

export default function InvestPage() {
  const [amountLKR, setAmountLKR] = useState(100); // Default to min Rs. 100
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); // Loading state for auth check
  const router = useRouter();

  // --- Authentication & User Info Fetch ---
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    const token = localStorage.getItem('userToken');
    if (!storedUserInfo || !token) {
      router.push('/login'); // Redirect if not logged in
    } else {
      try {
        setUserInfo(JSON.parse(storedUserInfo));
      } catch(e) {
        console.error("Error parsing user info", e);
        localStorage.clear();
        router.push('/login');
      } finally {
         setAuthLoading(false); // Finish auth check loading
      }
    }
  }, [router]);


   // --- Handle Investment Submission ---
  const handleInvestment = async () => {
      setError('');
      setSuccess('');
      setLoading(true);

      const token = localStorage.getItem('userToken');
      if (!token) {
          setError('Authentication error. Please log in again.');
          setLoading(false);
          router.push('/login');
          return;
      }
       if (amountLKR < 100) {
            setError('Minimum investment is Rs. 100.');
            setLoading(false);
            return;
       }


      try {
          const config = {
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`, // Send the token
              },
          };
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

          const { data } = await axios.post(
              `${backendUrl}/api/investments/invest`,
              { amountLKR: Number(amountLKR) }, // Send amount as number
              config
          );

          // --- Success ---
          setSuccess(`Investment of Rs. ${amountLKR} successful!`);
          console.log('Investment successful:', data);

          // Update localStorage with the latest user info from backend
          localStorage.setItem('userInfo', JSON.stringify(data.updatedUserInfo));
          setUserInfo(data.updatedUserInfo); // Update state for immediate reflection (optional)

          setLoading(false);
          // Optional: Clear the amount field or redirect
          // setAmountLKR(100);
          router.push('/payment-success'); // Redirect to a success page (page 20)

      } catch (err) {
          // --- Error ---
          console.error('Investment error:', err);
          setError(
              err.response && err.response.data && err.response.data.message
                  ? err.response.data.message
                  : 'Investment failed. Please try again.'
          );
          setLoading(false);
      }
  };

   // --- Loading States ---
   if (authLoading) {
       return <div className="flex justify-center items-center min-h-screen"><p>Checking authentication...</p></div>;
   }
  // If user info failed to load after auth check
   if (!userInfo) {
        // This case might happen if localStorage parsing failed after initial check
         console.error("User info not available after auth check.");
         // Redirect again just in case
         router.push('/login');
         return <div className="flex justify-center items-center min-h-screen"><p>Redirecting to login...</p></div>;
   }


  // --- Render Invest Page Content ---
  return (
     // Use DashboardLayout to wrap the content
     <DashboardLayout>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Left Column: Live Price Info (Static) */}
              <div className="md:col-span-1 bg-white p-6 rounded shadow">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                      Live Price <span className="text-red-500 ml-2 text-xl">((●))</span> {/* Mimic UI */}
                  </h2>
                  {/* Placeholder Graph - Use an image or a simple div */}
                   <div className="bg-gray-200 h-32 mb-4 flex items-center justify-center text-gray-500">
                       [Static Price Chart Placeholder]
                   </div>
                   <div className="text-center bg-gray-800 text-white p-3 rounded mb-4">
                       <p className="text-xs">Live Price Now</p>
                       <p className="text-xs">{LIVE_PRICE_DATE}</p>
                   </div>
                  <div className="text-center bg-yellow-400 text-black p-4 rounded mb-4">
                      <p className="text-xl font-bold">Rs. {LIVE_PRICE_EXAMPLE}</p>
                      <p className="text-xs">/ 10g (Example)</p>
                  </div>
                   <div className="border-t pt-4">
                       <h3 className="font-semibold flex items-center">
                           Suitable time to Buy <span className="text-green-500 ml-2">✔</span> {/* Mimic UI */}
                       </h3>
                       <p className="text-sm text-gray-600 mt-1">
                           According to the recent trend, the price is increasing, so it's better to buy during a dip for a better investment opportunity.
                       </p>
                   </div>
              </div>

              {/* Right Column: Investment Form */}
              <div className="md:col-span-2 bg-white p-6 rounded shadow">
                  <h2 className="text-2xl font-bold mb-6 text-center text-yellow-600">Invest <span className="text-black">Now !</span></h2>

                  {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                  {success && <p className="text-green-600 text-center mb-4">{success}</p>}

                  {/* Amount Section */}
                  <div className="mb-6">
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">Amount (LKR)</label>
                      <input
                          type="range"
                          min="100"
                          max="100000" // Example max
                          step="100"
                          value={amountLKR}
                          onChange={(e) => setAmountLKR(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mb-2"
                      />
                      <div className="flex justify-between text-xs text-gray-500 px-1">
                          <span>Rs. 100</span>
                          <span>Rs. 500</span>
                          <span>Rs. 1,000</span>
                          <span>Rs. 10,000</span>
                          <span>Rs. 100,000</span>
                      </div>
                       <div className="mt-4">
                          <label htmlFor="amountInput" className="sr-only">Enter Amount</label>
                           <input
                               type="number"
                               id="amountInput"
                               value={amountLKR}
                               onChange={(e) => setAmountLKR(Number(e.target.value) || 0)}
                               min="100"
                               className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                               placeholder="Enter Amount: Rs."
                           />
                       </div>
                       <p className="text-sm text-gray-600 mt-2">
                            Approx. {(amountLKR / SIMULATED_GOLD_PRICE_PER_GRAM_LKR).toFixed(4)} grams
                       </p>
                  </div>

                   {/* Add Auto Invest / Calculator Buttons (UI only for now) */}
                   <div className="flex items-center justify-between mb-6 text-sm">
                      <label className="flex items-center">
                          <input type="checkbox" className="form-checkbox mr-2" /> Save as Automatic Invest
                      </label>
                       {/* Add Daily/Weekly/etc buttons here - non-functional for now */}
                       <button type="button" className="text-yellow-600 hover:underline">Open Calculator</button>
                   </div>


                  {/* Payment Section (Simulated) */}
                  <div className="mb-6 border-t pt-6">
                      <h3 className="text-lg font-semibold mb-3">Payment</h3>
                      <div className="space-y-2">
                          <label className="flex items-center">
                              <input type="radio" name="payment" className="form-radio mr-2" defaultChecked/> Bank Card / Bank Account - PayHere (Simulated)
                          </label>
                          <label className="flex items-center">
                              <input type="radio" name="payment" className="form-radio mr-2" /> Pay from PayPal (Simulated)
                          </label>
                      </div>
                  </div>

                  {/* Submit Button */}
                  <button
                      onClick={handleInvestment}
                      disabled={loading || amountLKR < 100}
                      className={`w-full font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline text-white ${loading || amountLKR < 100 ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                  >
                      {loading ? 'Processing...' : 'Pay'}
                  </button>
              </div>
          </div>
       </DashboardLayout> // Close DashboardLayout
  );
}