// src/components/Navbar.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useModal } from '@/contexts/ModalContext';
import { usePathname } from 'next/navigation';

const logoSrc = "/GoldNest.png";

export default function Navbar() {
    const { openLoginModal } = useModal();
    const pathname = usePathname();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false); // State for hamburger menu

    const navLinksRef = useRef(null);
    const hamburgerRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('userToken');
        if (token) {
            setIsLoggedIn(true);
        } else {
            setIsLoggedIn(false);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isNavOpen &&
                hamburgerRef.current && !hamburgerRef.current.contains(event.target) &&
                navLinksRef.current && !navLinksRef.current.contains(event.target)
            ) {
                setIsNavOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNavOpen]);

    const isActive = (path) => pathname === path;

    const toggleMobileNav = () => {
        setIsNavOpen(prev => !prev);
    };

    const handleNavLinkClick = () => {
        if (isNavOpen) {
            setIsNavOpen(false);
        }
    };

    return (
     <nav className="navbar">
        {/* Hamburger Button */}
        <button
            ref={hamburgerRef}
            className="hamburger"
            aria-label="Toggle navigation menu"
            aria-expanded={isNavOpen}
            aria-controls="nav-links-list"
            onClick={toggleMobileNav}
        >
            <i className={`fas ${isNavOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>

        <div className="logo">
            <Link href="/" onClick={handleNavLinkClick}>
                 <Image src={logoSrc} alt="GoldNest Logo" width={150} height={40} priority />
             </Link>
        </div>
        <ul id="nav-links-list" ref={navLinksRef} className={`nav-links ${isNavOpen ? 'nav-active' : ''}`}>
            <li><Link href="/" className={isActive('/') ? 'active' : ''} onClick={handleNavLinkClick}>Home</Link></li>
            <li><Link href="/calculator" className={isActive('/calculator') ? 'active' : ''} onClick={handleNavLinkClick}>Calculator</Link></li>
            <li><Link href="/market" className={isActive('/market') ? 'active' : ''} onClick={handleNavLinkClick}>Market</Link></li>
            <li><Link href="/about" className={isActive('/about') ? 'active' : ''} onClick={handleNavLinkClick}>About</Link></li>
            
            {/* --- NEW: Conditional Rendering Logic --- */}
            <li>
                {isLoggedIn ? (
                    // If logged in, show a "Dashboard" link
                    <Link href="/dashboard" className="login-btn" onClick={handleNavLinkClick}>
                        Dashboard
                    </Link>
                ) : (
                    // If not logged in, show the "Login" button
                    <button onClick={() => { openLoginModal(); handleNavLinkClick(); }} className="login-btn">
                        Login
                    </button>
                )}
            </li>
        </ul>
    </nav>
  );
}
