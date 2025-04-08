'use client'; // Needed for the FAQ useEffect hook

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';

// Add these imports at the top of your HomePage component file
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faSyncAlt } from '@fortawesome/free-solid-svg-icons'; // Import solid icons
import { faLightbulb, faStar } from '@fortawesome/free-regular-svg-icons'; // Import regular icons


// --- FAQ Data (Optional: move to separate file/structure later) ---
const faqData = [
    { id: 1, q: "What is this Platform?", a: "A web based digital platform enabling you to invest gold starting Rs. 100, leveraging blockchain for security and AI insights for smarter investment choices." },
    { id: 2, q: "How does it work?", a: "Sign up, verify your identity, add funds, choose the amount of gold to buy, track your portfolio, and redeem as physical gold whenever you wish." },
    { id: 3, q: "Is my money safe?", a: "Yes, your digital gold is backed by physical gold stored in secure vaults, audited regularly, and transactions are secured by blockchain technology." },
    { id: 4, q: "How do I START INVESTING?", a: "Click \"Get Started\", complete the simple registration process, deposit funds using our supported payment methods, and make your first gold purchase." },
    { id: 5, q: "Can I get physical gold?", a: "Absolutely. You can request delivery of your accumulated gold in the form of certified coins or bars, subject to minimum quantity requirements and delivery charges." },
    { id: 6, q: "Why gold?", a: "Gold is traditionally considered a safe-haven asset, a hedge against inflation, and a valuable diversification tool for investment portfolios." },
    { id: 7, q: "What's the CATCH?", a: "There's no catch. We aim to provide a transparent, secure, and accessible way to invest in gold. We charge nominal transaction and storage fees, which are clearly outlined." }
];

// --- FAQ Item Component ---
function FaqItem({ item, isActive, onClick }) {
    return (
        <div className="faq-item">
            <button className={`faq-question ${isActive ? 'active' : ''}`} onClick={onClick}>
                <span className="faq-number">{item.id}</span> {item.q}
                {/* Add plus/minus icon based on state */}
                <span className="faq-toggle-icon">{isActive ? '-' : '+'}</span>
            </button>
            {/* Conditional rendering or use CSS for display */}
            <div className="faq-answer" style={{ display: isActive ? 'block' : 'none' }}>
                <p>{item.a}</p>
            </div>
        </div>
    );
}


export default function HomePage() {
    const [activeIndex, setActiveIndex] = useState(0); // Start with first FAQ open

    const handleFaqClick = (index) => {
        setActiveIndex(activeIndex === index ? null : index); // Toggle or close if same clicked
    };


    // Note: The marquee/slider animation needs CSS (`styles.css`) to work.
    // The JS from the original HTML for FAQ is replaced by React state logic above.

    return (
        <> {/* Use Fragment to return multiple elements */}
            <Navbar activePage="home" /> {/* Pass active page prop */}

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <h1>Start investing in Gold with just Rs.100</h1>
                    <p>Secure, transparent, and rewarding - powered by blockchain and AI.</p>
                    {/* Link Get Started to signup page */}
                    <Link href="/signup" className="cta-btn">Get Started</Link>
                </div>
            </section>

            {/* Hero Images Slider */}
            <section className="hero-image-slider-container">
                <div className="hero-image-slides">
                    {/* Update image paths to use / */}
                    <Image src="/1.png" alt="Gold Coins Stack" width={300} height={200} />
                    <Image src="/2.png" alt="Gold Pouring" width={300} height={200} />
                    <Image src="/3.png" alt="Gold Bar" width={300} height={200} />
                    <Image src="/4.png" alt="Gold Coins" width={300} height={200} />
                    {/* Set 2 for looping */}
                    <Image src="/1.png" alt="Gold Coins Stack" width={300} height={200} />
                    <Image src="/2.png" alt="Gold Pouring" width={300} height={200} />
                    <Image src="/3.png" alt="Gold Bar" width={300} height={200} />
                    <Image src="/4.png" alt="Gold Coins" width={300} height={200} />
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <div className="feature-item">
                    <i className="fas fa-lock"></i>
                    <h3>Blockchain Secured</h3>
                </div>
                <div className="feature-item">
                    <i className="fas fa-cubes"></i>
                    <h3>Audited Reserves</h3>
                </div>
                <div className="feature-item">
                    <i className="fas fa-microchip"></i>
                    <h3>Smart Insights</h3>
                </div>
            </section>

            {/* Why Choose GoldNest Section */}
            <section className="why-choose">
                <h2>Why Chose GoldNest?</h2>
                <div className="why-choose-grid">
                    {/* Add items using classes from styles.css */}
                     <div className="why-choose-item">
                         <div className="icon-bg"> <i className="fas fa-wallet"></i></div>
                         <h3>Micro Investments</h3>
                         <p>Start with just Rs.100</p>
                     </div>
                     <div className="why-choose-item">
                         <div className="icon-bg"><i className="fas fa-sync-alt"></i></div>
                         <h3>Redeem Physical Gold</h3>
                         <p>Convert Digital holdings into physical gold</p>
                     </div>
                     <div className="why-choose-item">
                         <div className="icon-bg"><i className="far fa-lightbulb"></i></div>
                         <h3>AI Insights</h3>
                         <p>Data-backed Investment sign</p>
                     </div>
                     <div className="why-choose-item">
                         {/* Assuming icon class was 'far fa-star' */}
                         <div className="icon-bg"><i className="far fa-star"></i></div>
                         {/* Updated text based on your Figma UI description */}
                         <h3>Gamified Savings</h3>
                         <p>Earn badges as you save!</p>
                     </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="faq">
                <h2>Frequently Asked Questions</h2>
                <div className="faq-container">
                    {faqData.map((item, index) => (
                        <FaqItem
                            key={item.id}
                            item={item}
                            isActive={activeIndex === index}
                            onClick={() => handleFaqClick(index)}
                        />
                    ))}
                </div>
            </section>

            {/* Call to Action Section */}
            <section className="cta-section">
                <h2>Start investing now</h2>
                {/* Link to signup page */}
                <Link href="/signup" className="cta-btn">Get Started</Link>
            </section>

            <Footer /> {/* Include Footer component */}
        </>
    );
}