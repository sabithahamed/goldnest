'use client'; // Needed for hooks and client-side logic in layout

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link'; // For navigation links

// --- Simple Placeholder Components (Replace with actual later) ---
const GoldNestLogo = () => <span className="font-bold text-xl text-yellow-600">GoldNest</span>; // Placeholder Logo
const NotificationIcon = () => <button className="p-2">🔔</button>; // Placeholder Icon
const ProfileIcon = ({ onLogout }) => ( // Placeholder Icon with logout
    <div className="relative">
       <button className="p-2">👤</button>
       {/* Basic Dropdown idea - refine later */}
       {/* <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
           <a href="#profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Manage Profile</a>
           <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
               Log Out
           </button>
       </div> */}
        <button
            onClick={onLogout} // Simple direct logout for now
            className="ml-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2 rounded"
        >
            Logout
        </button>
    </div>
);


export default function DashboardLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // Get current path

   const handleLogout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userToken');
        setIsLoggedIn(false); // Update state
        router.push('/login');
   };

  useEffect(() => {
    // Authentication check (similar to the page check)
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/login');
    } else {
      setIsLoggedIn(true);
      setLoading(false);
    }
  }, [router]); // Re-run if router changes

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Loading Application...</p></div>;
  }

  // Only render layout and children if logged in
  if (!isLoggedIn) {
      // This prevents rendering children before redirect finishes
      return null;
  }

  // Function to check if a link is active
  const isActive = (path) => pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50"> {/* Use flex column */}
      {/* --- Header --- */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
           <Link href="/dashboard">
                <GoldNestLogo />
            </Link>
          {/* Navigation Links (Match your UI) */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/market" className={`px-3 py-2 rounded ${isActive('/market') ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'}`}>Market</Link>
            <Link href="/invest" className={`px-3 py-2 rounded ${isActive('/invest') ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'}`}>Invest</Link>
            <Link href="/wallet" className={`px-3 py-2 rounded ${isActive('/wallet') ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'}`}>Wallet</Link>
            <Link href="/settings" className={`px-3 py-2 rounded ${isActive('/settings') ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'}`}>Settings</Link>
            <Link href="/dashboard" className={`px-3 py-2 rounded font-semibold ${isActive('/dashboard') ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}>Dashboard</Link> {/* Highlight Dashboard */}
          </div>
          {/* Right side icons */}
          <div className="flex items-center space-x-2">
            <NotificationIcon />
            <ProfileIcon onLogout={handleLogout} /> {/* Pass logout handler */}
          </div>
           {/* Add Mobile Menu button here if needed */}
        </nav>
      </header>

      {/* --- Main Content Area --- */}
      {/* children represents the content of the specific page (e.g., dashboard/page.jsx) */}
      <main className="flex-grow container mx-auto px-4 py-8">
         {children}
      </main>

      {/* --- Footer --- */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-gray-500 text-sm">
            {/* Replicate footer from your UI (Page 2, etc.) */}
            <div className="flex justify-center space-x-4 mb-2">
                 {/* Add social media icons/links */}
            </div>
           Copyright @ CodeMavericks 2025. All rights reserved.
        </div>
       </footer>
    </div>
  );
}