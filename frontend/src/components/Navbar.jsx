// src/components/Navbar.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useModal } from '@/contexts/ModalContext';
import { usePathname } from 'next/navigation';

// Assuming GoldNest.png is in the public folder
const logoSrc = "/GoldNest.png";

export default function Navbar() {
  const { openLoginModal } = useModal();
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navLinksRef = useRef(null);
  const hamburgerRef = useRef(null);

  // Handle click outside to close mobile nav
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isNavOpen &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target) &&
        navLinksRef.current &&
        !navLinksRef.current.contains(event.target)
      ) {
        setIsNavOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNavOpen]);

  const toggleMobileNav = () => {
    setIsNavOpen((prev) => !prev);
  };

  const handleNavLinkClick = () => {
    if (isNavOpen) {
      setIsNavOpen(false);
    }
  };

  const isActive = (path) => pathname === path;

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

      {/* Logo */}
      <div className="logo">
        <Link href="/" onClick={handleNavLinkClick}>
          <Image src={logoSrc} alt="GoldNest Logo" width={120} height={35} priority />
        </Link>
      </div>

      {/* Navigation Links */}
      <ul
        id="nav-links-list"
        ref={navLinksRef}
        className={`nav-links ${isNavOpen ? 'nav-active' : ''}`}
      >
        <li>
          <Link
            href="/"
            className={isActive('/') ? 'active' : ''}
            onClick={handleNavLinkClick}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/calculator"
            className={isActive('/calculator') ? 'active' : ''}
            onClick={handleNavLinkClick}
          >
            Calculator
          </Link>
        </li>
        <li>
          <Link
            href="/market"
            className={isActive('/market') ? 'active' : ''}
            onClick={handleNavLinkClick}
          >
            Market
          </Link>
        </li>
        <li>
          <Link
            href="/about"
            className={isActive('/about') ? 'active' : ''}
            onClick={handleNavLinkClick}
          >
            About
          </Link>
        </li>
        <li>
          <button
            onClick={() => {
              openLoginModal();
              handleNavLinkClick();
            }}
            className="login-btn"
          >
            Login
          </button>
        </li>
      </ul>
    </nav>
  );
}