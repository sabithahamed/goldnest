// src/components/skeletons/GamificationSkeleton.jsx
import React from 'react';

export const GamificationSkeleton = () => (
  <div className="animate-pulse p-4">
    {/* Placeholder for Stars/Tier Section at the top */}
    <div className="mb-6 mx-auto w-full max-w-2xl">
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div> {/* Title */}
      <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-3"></div> {/* Stars */}
      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div> {/* Tier Text */}
      <div className="h-6 bg-gray-200 rounded w-full mb-2"></div> {/* Progress Bar */}
      <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div> {/* Points to Next Tier */}
    </div>

    {/* Placeholder for Challenges */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded p-4 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div> {/* Name */}
          <div className="h-3 bg-gray-200 rounded w-full"></div> {/* Progress Bar */}
          <div className="h-3 bg-gray-200 rounded w-1/2"></div> {/* Status/Needed */}
          <div className="h-8 bg-gray-200 rounded w-1/3"></div> {/* Button */}
        </div>
      ))}
    </div>
  </div>
);