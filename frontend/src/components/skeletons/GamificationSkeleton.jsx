// src/components/skeletons/GamificationSkeleton.jsx
import React from 'react';

// Basic skeleton for the Gamification/Rewards section
export const GamificationSkeleton = () => (
    <div className="animate-pulse p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Placeholder for Challenges */}
         <div className="space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div> {/* Title */}
            {/* Skeleton Challenge Item */}
            {[...Array(2)].map((_, i) => (
                <div key={i} className="border rounded p-3 space-y-2">
                     <div className="h-4 bg-gray-200 rounded w-3/4"></div> {/* Name */}
                     <div className="h-3 bg-gray-200 rounded w-full"></div> {/* Progress Bar */}
                     <div className="h-3 bg-gray-200 rounded w-1/2"></div> {/* Status/Needed */}
                </div>
            ))}
        </div>

         {/* Placeholder for Badges/Stars */}
        <div className="space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div> {/* Title */}
             <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-3"></div> {/* Stars */}
             {/* Skeleton Badges */}
             <div className="flex flex-wrap gap-3 justify-center">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded p-2 w-20 space-y-1 flex flex-col items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div> {/* Icon */}
                        <div className="h-3 bg-gray-200 rounded w-full"></div> {/* Name */}
                     </div>
                 ))}
            </div>
        </div>
    </div>
);