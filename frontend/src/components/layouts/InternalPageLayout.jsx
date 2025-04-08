// src/components/layouts/InternalPageLayout.jsx
import React from 'react';
import NavbarInternal from '@/components/NavbarInternal'; // Adjust path if needed
import FooterInternal from '@/components/FooterInternal'; // Adjust path if needed

// This is a simple wrapper layout for authenticated pages
export default function InternalPageLayout({ children }) {
  return (
    <>
      <NavbarInternal />
      {/* Apply common padding/container class if desired */}
      <main className="wallet container mx-auto px-4 py-8 min-h-screen"> {/* Example common styling */}
         {children} {/* Renders the actual page content */}
      </main>
      <FooterInternal />
    </>
  );
}