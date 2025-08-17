// src/app/redeem-confirmation/[size]/[quantity]/page.jsx
'use client'; 

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import { useModal } from '@/contexts/ModalContext';

// --- Helper Functions & Constants (Unchanged) ---
const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'LKR 0.00';
    return `LKR ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
        console.error("Error formatting date:", error);
        return dateString;
    }
};

const GRAMS_PER_ITEM = { '1g': 1, '5g': 5, '10g': 10 };
const REDEMPTION_FEES = { '1g': 150, '5g': 250, '10g': 400, 'default': 500 };

// --- Client Component ---
function RedeemConfirmationContent() {
    const router = useRouter();
    const params = useParams();
    const { openGenericModal } = useModal();

    const itemSize = typeof params?.size === 'string' ? params.size : '';
    const quantity = parseInt(params?.quantity || '1', 10);

    const gramsForItem = GRAMS_PER_ITEM[itemSize] || 0;
    const gramsRequired = gramsForItem * quantity;
    const shippingFee = (REDEMPTION_FEES[itemSize] || REDEMPTION_FEES['default']) * quantity;

    const [userData, setUserData] = useState(null);
    const [shippingDetails, setShippingDetails] = useState({
        fullName: '', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '', phone: ''
    });
    const [saveAddress, setSaveAddress] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    useEffect(() => {
        if (!itemSize || !gramsRequired || quantity <= 0) {
            openGenericModal("Invalid Item", "The redemption item or quantity is invalid. Please go back and try again.", "error");
            router.push('/wallet');
            return;
        }

        const fetchUserData = async () => {
            setLoading(true);
            const token = localStorage.getItem('userToken');
            if (!token) {
                openGenericModal("Authentication Error", "Please log in to continue.", "error");
                router.push('/');
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

            try {
                const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
                setUserData(data);

                let addressToPrefill = { fullName: data.name || '', phone: data.phone || '', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' };
                if (data.defaultShippingAddress) {
                    addressToPrefill = { ...addressToPrefill, ...data.defaultShippingAddress };
                    setSaveAddress(false);
                }
                setShippingDetails(addressToPrefill);

            } catch (err) {
                openGenericModal("Error", "Failed to load user data. Please try refreshing.", "error");
                console.error("Error fetching user data:", err);
                 if (err.response?.status === 401) {
                    localStorage.clear();
                    router.push('/');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = (e) => {
        setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
        setSaveAddress(true);
    };

    const handleConfirmRedemption = async (e) => {
        e.preventDefault();
        
        if (!shippingDetails.fullName || !shippingDetails.addressLine1 || !shippingDetails.city || !shippingDetails.zipCode || !shippingDetails.country || !shippingDetails.phone) {
            openGenericModal("Missing Details", "Please fill in all required shipping details.", "error");
            return;
        }
        if (!userData || userData.goldBalanceGrams < gramsRequired) {
            openGenericModal("Error", "Insufficient gold balance for this redemption.", "error");
            return;
        }
        if (!userData || userData.cashBalanceLKR < shippingFee) {
            openGenericModal("Error", `Insufficient cash balance for fees (${formatCurrency(shippingFee)}).`, "error");
            return;
        }

        setSubmitLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
            openGenericModal("Authentication Error", "Please log in again.", "error");
            setSubmitLoading(false);
            return;
        }

        try {
            const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            
            // This payload is sent to the backend. It must match what the controller expects.
            const payload = { 
                itemDescription: `${quantity} x ${itemSize} ${gramsForItem > 10 ? 'Bar' : 'Coin'}`,
                quantity: quantity,
                totalGrams: gramsRequired,
                shippingDetails: shippingDetails,
                // saveAddressAsDefault is handled by a different endpoint now
            };

            // **** THIS IS THE FIX: Changed the API endpoint URL ****
            const { data } = await axios.post(`${backendUrl}/api/redemptions/request`, payload, config);

            const estimatedDate = data.redemption?.createdAt; // Use createdAt as a stand-in for delivery date
            const formattedDate = formatDate(new Date(new Date(estimatedDate).getTime() + 5 * 24 * 60 * 60 * 1000)); // Simulate +5 days
            const successMsg = `${data.message || 'Redemption confirmed!'} Estimated delivery is around ${formattedDate}.`;
            
            openGenericModal("Success!", successMsg, "success");
            router.push('/wallet');

        } catch (err) {
            openGenericModal(
                "Redemption Failed",
                err.response?.data?.message || 'An unexpected error occurred. Please try again.',
                "error"
            );
            console.error("Redemption Error:", err);
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center card">Loading confirmation details...</div>;
    if (!userData) return <div className="p-10 text-center text-red-500 card">Could not load user data.</div>;

    return (
        <div className="card">
            <h3>Redeem Confirmation</h3>
            <div className="redeem-confirmation">
                <form id="redeem-confirmation-form" onSubmit={handleConfirmRedemption}>
                    <div className="redeem-summary mb-4 border border-gray-200 p-4 rounded">
                        <h4 className="text-lg font-semibold mb-2">Redemption Summary</h4>
                        <p><strong>Item:</strong> {itemSize} {gramsForItem > 10 ? 'Bar' : 'Coin'}</p>
                        <p><strong>Quantity:</strong> {quantity}</p>
                        <p><strong>Total Gold Deducted:</strong> {gramsRequired.toFixed(3)} g</p>
                        <p><strong>Shipping & Handling Fees:</strong> {formatCurrency(shippingFee)}</p>
                        <hr className="my-3"/>
                        <p><strong>Available Gold:</strong> {userData.goldBalanceGrams?.toFixed(3) ?? 'N/A'} g</p>
                        <p><strong>Available Cash:</strong> {formatCurrency(userData.cashBalanceLKR ?? 0)}</p>
                    </div>

                    <div className="delivery-details border border-gray-200 p-4 rounded">
                        <h4 className="text-lg font-semibold mb-3">Delivery Details</h4>
                        <div className="space-y-3">
                            <div className="form-group">
                                <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">Full Name:</label>
                                <input type="text" id="full-name" name="fullName" required value={shippingDetails.fullName} onChange={handleInputChange} className="form-input mt-1 block w-full" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="address-line1" className="block text-sm font-medium text-gray-700">Address Line 1:</label>
                                <input type="text" id="address-line1" name="addressLine1" required value={shippingDetails.addressLine1} onChange={handleInputChange} className="form-input mt-1 block w-full" />
                            </div>
                             <div className="form-group">
                                <label htmlFor="address-line2" className="block text-sm font-medium text-gray-700">Address Line 2 (Optional):</label>
                                <input type="text" id="address-line2" name="addressLine2" value={shippingDetails.addressLine2} onChange={handleInputChange} className="form-input mt-1 block w-full" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                               <div className="form-group">
                                   <label htmlFor="city" className="block text-sm font-medium text-gray-700">City:</label>
                                   <input type="text" id="city" name="city" required value={shippingDetails.city} onChange={handleInputChange} className="form-input mt-1 block w-full" />
                               </div>
                               <div className="form-group">
                                   <label htmlFor="state" className="block text-sm font-medium text-gray-700">State/Province:</label>
                                   <input type="text" id="state" name="state" value={shippingDetails.state} onChange={handleInputChange} className="form-input mt-1 block w-full" />
                               </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="form-group">
                                    <label htmlFor="zip-code" className="block text-sm font-medium text-gray-700">Zip/Postal Code:</label>
                                    <input type="text" id="zip-code" name="zipCode" required value={shippingDetails.zipCode} onChange={handleInputChange} className="form-input mt-1 block w-full" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country:</label>
                                    <input type="text" id="country" name="country" required value={shippingDetails.country} onChange={handleInputChange} className="form-input mt-1 block w-full" />
                                </div>
                            </div>
                           <div className="form-group">
                               <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number:</label>
                               <input type="tel" id="phone" name="phone" required value={shippingDetails.phone} onChange={handleInputChange} className="form-input mt-1 block w-full" placeholder="Include country code"/>
                           </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="saveAddress" className="flex items-center text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" id="saveAddress" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500 mr-2" />
                                Save this address as my default for future redemptions
                            </label>
                        </div>
                    </div>

                    <div className="form-actions mt-6 flex flex-col sm:flex-row gap-3">
                        <button type="submit" className="btn btn-primary flex-grow" disabled={submitLoading}>
                            {submitLoading ? 'Processing...' : 'Confirm Redemption'}
                        </button>
                        <Link href="/wallet" className={`btn btn-secondary flex-grow text-center ${submitLoading ? 'pointer-events-none opacity-50' : ''}`}>
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Main Export with Suspense Boundary ---
export default function RedeemConfirmationPage() {
    return (
        <>
            <NavbarInternal />
            <section className="wallet">
                <Suspense fallback={<div className="p-10 text-center card">Loading...</div>}>
                    <RedeemConfirmationContent />
                </Suspense>
            </section>
            <FooterInternal />
        </>
    );
}