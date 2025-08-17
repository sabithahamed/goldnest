// src/components/Navbar.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useModal } from '@/contexts/ModalContext';
import { usePathname } from 'next/navigation';

const logoSrc = "/GoldNest.png";

export default function Navbar() {
    const { openLoginModal } = useModal();
    const pathname = usePathname();

    // --- NEW: State to track login status ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // --- NEW: useEffect to check login status on component mount ---
    useEffect(() => {
        // This code runs on the client-side after the component loads
        const token = localStorage.getItem('userToken');
        if (token) {
            setIsLoggedIn(true);
        } else {
            setIsLoggedIn(false);
        }
    }, []); // The empty dependency array [] means this runs only once on mount

    const isActive = (path) => pathname === path;

    return (
     <nav className="navbar">
        <div className="logo">
            <Link href="/">
                 <Image src={logoSrc} alt="GoldNest Logo" width={150} height={40} priority />
             </Link>
        </div>
        <ul className="nav-links">
            <li><Link href="/" className={isActive('/') ? 'active' : ''}>Home</Link></li>
            <li><Link href="/calculator" className={isActive('/calculator') ? 'active' : ''}>Calculator</Link></li>
            <li><Link href="/market" className={isActive('/market') ? 'active' : ''}>Market</Link></li>
            <li><Link href="/about" className={isActive('/about') ? 'active' : ''}>About</Link></li>
            
            {/* --- NEW: Conditional Rendering Logic --- */}
            <li>
                {isLoggedIn ? (
                    // If logged in, show a "Dashboard" link
                    <Link href="/dashboard" className="login-btn">
                        Dashboard
                    </Link>
                ) : (
                    // If not logged in, show the "Login" button
                    <button onClick={openLoginModal} className="login-btn">
                        Login
                    </button>
                )}
            </li>
        </ul>
    </nav>
  );
}