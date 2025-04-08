// src/components/Navbar.jsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import Image component
import { useModal } from '@/contexts/ModalContext'; // Import useModal hook
import { usePathname } from 'next/navigation'; // To determine active page

// Assuming you have GoldNest.png in the public folder
const logoSrc = "/GoldNest.png";

export default function Navbar() {
    const { openLoginModal } = useModal(); // Get function to open modal
    const pathname = usePathname(); // Get current path

    // Function to determine if a link is active
    const isActive = (path) => pathname === path;

  return (
     <nav className="navbar"> {/* Use class from styles.css */}
        <div className="logo">
             {/* Use next/image for optimization */}
            <Link href="/">
                 <Image src={logoSrc} alt="GoldNest Logo" width={150} height={40} priority /> {/* Adjust width/height */}
             </Link>
        </div>
         {/* Using nav-links class from styles.css */}
        <ul className="nav-links">
            <li><Link href="/" className={isActive('/') ? 'active' : ''}>Home</Link></li>
            <li><Link href="/calculator" className={isActive('/calculator') ? 'active' : ''}>Calculator</Link></li>
            <li><Link href="/market" className={isActive('/market') ? 'active' : ''}>Market</Link></li>
             <li><Link href="/about" className={isActive('/about') ? 'active' : ''}>About</Link></li>
            {/* Updated Login Button */}
            <li>
                 <button onClick={openLoginModal} className="login-btn"> {/* Use class, trigger modal */}
                    Login
                </button>
            </li>
        </ul>
    </nav>
  );
}