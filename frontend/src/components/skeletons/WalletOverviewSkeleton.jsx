// src/components/skeletons/WalletOverviewSkeleton.jsx
import React from 'react';

export const WalletOverviewSkeleton = () => (
    <div className="wallet-balance-content animate-pulse"> {/* Use pulse on container */}
        {/* Left Side (Cash) */}
        <div className="balance-left">
            <div className="balance-header">
                <div className="skeleton skeleton-icon-circle"></div>
                <div className="skeleton skeleton-text skeleton-text-short"></div>
            </div>
            <div className="skeleton skeleton-title w-3/4 mx-auto"></div> {/* Wider title */}
            <div className="skeleton skeleton-text skeleton-text-medium mx-auto"></div>
            <div className="balance-buttons">
                <div className="skeleton skeleton-button"></div>
                <div className="skeleton skeleton-button"></div>
            </div>
        </div>
        <div className="divider"></div>
        {/* Right Side (Gold) */}
        <div className="balance-right">
             <div className="balance-header">
                 <div className="skeleton skeleton-icon-circle"></div>
                <div className="skeleton skeleton-text skeleton-text-short"></div>
            </div>
            <div className="skeleton skeleton-title w-1/2 mx-auto"></div>
            <div className="skeleton skeleton-text skeleton-text-medium mx-auto"></div>
             <div className="skeleton skeleton-text skeleton-text-medium mx-auto"></div>
             <div className="skeleton skeleton-button w-3/4 mx-auto"></div>
        </div>
    </div>
);