// src/app/about/page.jsx
'use client'; // Needed for useModal hook

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar'; // Import shared Navbar
import Footer from '@/components/Footer'; // Import shared Footer
import { useModal } from '@/contexts/ModalContext'; // Import useModal

export default function AboutPage() {
    const { openLoginModal } = useModal(); // Get modal opener

  return (
    <>
      <Navbar /> {/* Use shared Navbar */}

       {/* Use class names from styles.css */}
       <main className="about-page-content">
           <div className="about-container">
                <h1>About GoldNest</h1>
                <section className="about-section mission-section">
                    <h2>Our mission</h2>
                    <p>
                        At GoldNest, we're on a mission to make gold investing accessible to everyone in Sri Lanka. Starting
                        with just Rs. 100 through <span className="highlight">micro-investments</span>, enjoy gamified savings with badges as you grow your
                        wealth, and get <span className="highlight">AI-driven insights</span> to make smart decisions—all backed by blockchain for security
                        and transparency.
                    </p>
                </section>
                <section className="about-section why-gold-section">
                    <h2>Why Gold?</h2>
                    <p>
                        Gold has been a trusted store of value for centuries, offering stability and protection against
                        inflation. With GoldNest, you can invest in digital gold tokens backed by audited physical gold,
                        redeemable for physical coins anytime.
                    </p>
                </section>
            </div>
       </main>

       {/* Use class names from styles.css */}
       <section className="cta-section about-cta">
            <h2>Ready to Start Investing</h2>
            {/* Use button to trigger modal */}
            <button onClick={openLoginModal} className="cta-btn">Get started</button>
        </section>

      <Footer /> {/* Use shared Footer */}
    </>
  );
}