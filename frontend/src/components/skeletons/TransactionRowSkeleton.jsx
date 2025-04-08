// src/components/skeletons/TransactionRowSkeleton.jsx
import React from 'react';

export const TransactionRowSkeleton = ({ cols = 8 }) => ( // Accept number of columns
    <tr className="skeleton-table-row">
        {[...Array(cols)].map((_, index) => (
            <td key={index} data-label="Loading...">
                {/* Wrap skeleton div to help with alignment/padding */}
                 <div className="skeleton-wrapper">
                    <div className="skeleton skeleton-text skeleton-table-cell"></div>
                 </div>
            </td>
        ))}
    </tr>
);