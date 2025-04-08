// src/components/skeletons/RedeemProgressSkeleton.jsx
import React from 'react';

export const RedeemProgressSkeleton = () => (
    <div className="quick-redeem animate-pulse">
        {[...Array(3)].map((_, index) => ( // Repeat 3 times for 1g, 5g, 10g
            <div key={index} className="redeem-coin-item">
                <div className="skeleton skeleton-circle mx-auto mb-2"></div>
                <div className="skeleton skeleton-text skeleton-text-medium w-3/4 mx-auto"></div>
                <div className="skeleton skeleton-text skeleton-text-short w-1/4 mx-auto"></div>
                <div className="skeleton skeleton-button w-full mt-2"></div>
            </div>
        ))}
    </div>
);
