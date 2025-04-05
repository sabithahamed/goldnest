'use client';
import React from 'react';
import Link from 'next/link';
import DashboardLayout from '../dashboard/layout'; // Reuse layout

export default function PaymentSuccessPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center text-center bg-white p-10 rounded shadow">
                {/* Simple Checkmark (can use an SVG later) */}
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Payment Done</h1>
                <p className="text-gray-600 mb-6">Your investment has been processed successfully.</p>
                <Link href="/dashboard">
                    <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded">
                        Go to Dashboard
                    </button>
                </Link>
            </div>
        </DashboardLayout>
    );
}