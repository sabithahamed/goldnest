'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true); // Start loading
  const router = useRouter();

  useEffect(() => {
    // --- Authentication Check ---
    const storedUserInfo = localStorage.getItem('userInfo');
    const token = localStorage.getItem('userToken'); // Also check for token

    if (!storedUserInfo || !token) {
      // If no user info or token, redirect to login
      router.push('/login');
    } else {
      try {
         // Parse the stored user info
         const parsedInfo = JSON.parse(storedUserInfo);
         setUserInfo(parsedInfo);
      } catch (error) {
          console.error("Failed to parse user info from localStorage", error);
          // If parsing fails, treat as unauthenticated
          localStorage.removeItem('userInfo');
          localStorage.removeItem('userToken');
          router.push('/login');
      } finally {
         setLoading(false); // Stop loading once check is done
      }
    }
  }, [router]); // Dependency array includes router

  const handleLogout = () => {
    // Clear stored authentication data
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userToken');
    // Redirect to login page
    router.push('/login');
  };

  // --- Loading State ---
  if (loading) {
    return (
       <div className="flex justify-center items-center min-h-screen">
           <p>Loading...</p> {/* Replace with a better spinner/loader later */}
       </div>
    );
  }

  // --- Render Dashboard Content ---
  // Only renders if loading is false and userInfo is set (due to the check in useEffect)
  return (
    <div className="min-h-screen bg-gray-100 p-8"> {/* Basic page styling */}
      {/* --- Header (Simplified) --- */}
      <header className="bg-white shadow p-4 mb-8 flex justify-between items-center">
        <h1 className="text-xl font-bold">GoldNest Dashboard</h1>
         {/* You can add the Navbar items from your UI here later */}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </header>

      {/* --- Main Content Area --- */}
      <div className="bg-white shadow rounded p-6">
        {userInfo ? (
          <>
            <h2 className="text-2xl mb-4">Welcome, {userInfo.name}!</h2>
            <p className="mb-2">Email: {userInfo.email}</p>
            <p className="mb-2">Phone: {userInfo.phone || 'Not Provided'}</p>
            <p className="mb-2">Current Gold Balance: {userInfo.goldBalanceGrams?.toFixed(4) || '0.0000'} grams</p>
             {/* Add more dashboard elements based on page 25 of your UI */}
             {/* Example: Display live price (static for now) */}
             <div className="mt-6 p-4 border rounded bg-yellow-50">
                 <h3 className="font-semibold">Gold Live Price (Static Example)</h3>
                 <p className="text-2xl text-yellow-600">Rs. 323,212.22 / 10g</p> {/* Example value */}
             </div>
             {/* Add Gamification/Alerts/Redeem sections as static placeholders */}
             <div className="mt-6">
                 <h3 className="font-semibold mb-2">Gamification Progress (Placeholder)</h3>
                 <div className="p-4 border rounded bg-blue-50">Show progress bars here...</div>
             </div>
          </>
        ) : (
           // This should ideally not be reached if the useEffect redirect works
           <p>Error loading user data.</p>
        )}
      </div>

       {/* --- Footer (Simplified) --- */}
       <footer className="mt-8 text-center text-gray-500 text-sm">
            Copyright @ CodeMavericks 2025. All rights reserved. {/* Match your UI */}
        </footer>
    </div>
  );
}