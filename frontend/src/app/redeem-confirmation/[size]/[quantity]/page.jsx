// src/app/redeem-confirmation/[size]/[quantity]/page.jsx
'use client'; // MUST be the very first line for client components within

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Client hooks
import Link from 'next/link';
import axios from 'axios';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';

// --- Helper Functions & Constants ---
const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'LKR 0.00';
    return `LKR ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper to format date (adjust format as needed)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Example format: "Sep 15, 2024" - adjust options for desired output
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            // timeZone: 'UTC' // Optional: Specify timezone if needed
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return dateString; // Return original string if formatting fails
    }
};


const GRAMS_PER_ITEM = {
    '1g': 1,
    '5g': 5,
    '10g': 10,
    // Add bars if they exist, e.g., '100g-bar': 100
};
const REDEMPTION_FEES = {
    '1g': 150,
    '5g': 250,
    '10g': 400,
    // '100g-bar': 1000, // Example fee for a bar
    'default': 500 // Fallback fee
};
// --- End Helpers ---


// --- Client Component Containing Hooks and Logic ---
function RedeemConfirmationContent() {
    const router = useRouter();
    const params = useParams(); // Get dynamic route params { size, quantity }

    // Ensure params are valid strings before using them
    const itemSize = typeof params?.size === 'string' ? params.size : '';
    const quantityParam = typeof params?.quantity === 'string' ? params.quantity : '1';
    const quantity = parseInt(quantityParam || '1', 10); // Default to 1 if parsing fails

    // Calculate derived values safely
    const gramsForItem = GRAMS_PER_ITEM[itemSize] || 0;
    const gramsRequired = gramsForItem * quantity;
    const feePerItem = REDEMPTION_FEES[itemSize] || REDEMPTION_FEES['default'];
    const shippingFee = feePerItem * quantity;


    const [userData, setUserData] = useState(null);
    const [shippingDetails, setShippingDetails] = useState({
        fullName: '', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '', phone: ''
    });
    const [saveAddress, setSaveAddress] = useState(true); // Default to true initially
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false); // For button state
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showProcessingPopup, setShowProcessingPopup] = useState(false); // State for processing popup
    const [finalDeliveryDate, setFinalDeliveryDate] = useState(null); // State to hold calculated date for success popup

    // Fetch user data to prefill address
    useEffect(() => {
        // --- Parameter Validation ---
        if (!itemSize || !(itemSize in GRAMS_PER_ITEM) || isNaN(quantity) || quantity <= 0) {
            setError("Invalid redemption item or quantity specified.");
            setLoading(false);
            return; // Stop fetching if params are bad
        }

        const fetchUserData = async () => {
            setLoading(true); setError('');
            const token = localStorage.getItem('userToken');
            if (!token) {
                setError("Authentication required. Redirecting to login...");
                setTimeout(() => router.push('/'), 2000);
                setLoading(false);
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

            try {
                const { data } = await axios.get(`${backendUrl}/api/users/me`, config);
                setUserData(data);

                // --- Pre-fill Logic ---
                let addressToPrefill = {
                    fullName: data.name || '',
                    phone: data.phone || '',
                    addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: ''
                };

                if (data.defaultShippingAddress) {
                    addressToPrefill = {
                        ...addressToPrefill,
                        ...data.defaultShippingAddress
                    };
                    setSaveAddress(false); // If using default, don't re-save by default
                } else {
                    setSaveAddress(true); // If entering new, default to saving it
                }
                setShippingDetails(addressToPrefill);

            } catch (err) {
                setError("Failed to load user data. Please try refreshing.");
                console.error("Error fetching user data:", err);
                 if (err.response?.status === 401) {
                    localStorage.removeItem('userToken');
                    setError("Session expired. Redirecting to login...");
                    setTimeout(() => router.push('/'), 2000);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [router, itemSize, quantity]); // Dependencies remain the same

    const handleInputChange = (e) => {
        setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
        setSaveAddress(true); // If user starts editing any field, assume they want to save the changes
    };

    const handleConfirmRedemption = async (e) => {
        e.preventDefault();
        setError('');
        // --- Frontend Validation ---
        if (!shippingDetails.fullName || !shippingDetails.addressLine1 || !shippingDetails.city || !shippingDetails.zipCode || !shippingDetails.country || !shippingDetails.phone) {
            setError("Please fill in all required shipping details.");
            return;
        }
        if (!userData || userData.goldBalanceGrams < gramsRequired) {
            setError("Insufficient gold balance for this redemption.");
            return;
        }
        if (!userData || userData.cashBalanceLKR < shippingFee) {
            setError(`Insufficient cash balance for fees (${formatCurrency(shippingFee)}). Please top up.`);
            return;
        }
         if (gramsRequired <= 0) {
             setError("Invalid redemption item configuration.");
             return;
         }
        // --- End Frontend Validation ---

        // --- Start backend process and show processing popup ---
        setSubmitLoading(true);     // Indicate backend call is happening (for button)
        setShowProcessingPopup(true); // Show the processing animation popup

        const token = localStorage.getItem('userToken');
        if (!token) {
            setError("Authentication error. Please log in again.");
            setSubmitLoading(false);
            setShowProcessingPopup(false); // Hide popup on auth error
            return;
        }

        try {
            const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            const payload = {
                itemSize: itemSize,
                quantity: quantity,
                shippingDetails: shippingDetails,
                saveAddressAsDefault: saveAddress
            };

            const { data } = await axios.post(`${backendUrl}/api/redeem`, payload, config);

            // --- BACKEND SUCCESS ---
            // Get estimated delivery date from the response transaction
            // ** Adjust 'data.transaction?.estimatedDeliveryDate' if your backend structure differs **
            const estimatedDate = data.transaction?.estimatedDeliveryDate;
            setFinalDeliveryDate(estimatedDate); // Store for success message

            // Simulate realistic processing time (e.g., 3 seconds) AFTER backend confirms
            setTimeout(() => {
                setShowProcessingPopup(false); // Hide processing popup
                // Construct success message with date
                const formattedDate = formatDate(estimatedDate);
                const dateMessagePart = formattedDate !== 'N/A' ? ` Estimated delivery around ${formattedDate}.` : '';
                setSuccessMessage(
                    (data.message || `Redemption for ${quantity} x ${itemSize} confirmed!`) + dateMessagePart
                ); // Show success popup
                setSubmitLoading(false); // Stop main button loading *after* delay
            }, 3000); // 3-second delay

        } catch (err) {
            setError(err.response?.data?.message || 'Redemption failed. Please check your balances and address, then try again.');
            console.error("Redemption Error:", err);
            setShowProcessingPopup(false); // Hide processing popup on error
            setSubmitLoading(false); // Stop loading on error
        }
        // REMOVED finally block - loading state is handled inside timeout/catch
    };

    const closeSuccessPopup = () => {
        setSuccessMessage('');
        router.push('/wallet'); // Redirect after closing popup
    }

    // --- Render Logic ---
    if (loading) return <div className="p-10 text-center card">Loading confirmation details...</div>;

    // Show persistent error if initial param validation failed or critical fetch error
    if ((error && !userData && !successMessage) || (gramsRequired <= 0 && !loading)) {
         const errorMessage = (gramsRequired <= 0 && !loading)
            ? "Invalid redemption item selected. Please go back and choose a valid item."
            : error;
         return <div className="p-10 text-center text-red-500 card">{errorMessage}</div>;
    }


    return (
        <div className="card">
            <h3>Redeem Confirmation</h3>
            <div className="redeem-confirmation">
                {error && !successMessage && <p className="error text-center mb-4">{error}</p>}

                {/* --- Processing Popup/Modal --- */}
                {showProcessingPopup && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                        <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
                            {/* Simple Spinner */}
                             <svg className="animate-spin h-12 w-12 text-yellow-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                            <h4 className="text-lg font-semibold mb-2">Processing Redemption...</h4>
                            <p className="text-sm text-gray-600">Calculating estimated delivery date and confirming details. Please wait.</p>
                            {/* No button needed here, it closes automatically */}
                        </div>
                    </div>
                )}

                 {/* --- Success Popup/Modal --- */}
                {successMessage && (
                   <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"> {/* Use slightly darker overlay */}
                        <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
                            <span className="text-6xl text-green-500 block mb-4">✓</span>
                            <h4 className="text-xl font-semibold mb-3">Success!</h4>
                             {/* Display the dynamic success message state */}
                             <p className="text-gray-700 mb-6">{successMessage}</p>
                             {/* Optionally display date separately if preferred
                             {finalDeliveryDate && (
                                 <p className="text-sm text-gray-500 mb-6">Estimated Delivery: {formatDate(finalDeliveryDate)}</p>
                             )}
                             */}
                            <button onClick={closeSuccessPopup} className="btn btn-primary w-full">
                                Go to Wallet
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Form - Render only if userData is loaded and not showing success */}
                {userData && !successMessage && (
                   <form id="redeem-confirmation-form" onSubmit={handleConfirmRedemption}>
                       {/* --- Redemption Summary (No changes) --- */}
                       <div className="redeem-summary mb-4 border border-gray-200 p-4 rounded">
                           <h4 className="text-lg font-semibold mb-2">Redemption Summary</h4>
                           <p><strong>Item:</strong> {itemSize} {GRAMS_PER_ITEM[itemSize] > 10 ? 'Bar' : 'Coin'}</p>
                           <p><strong>Quantity:</strong> {quantity}</p>
                           <p><strong>Total Gold Deducted:</strong> {gramsRequired.toFixed(3)} g</p>
                           <p><strong>Shipping & Handling Fees:</strong> {formatCurrency(shippingFee)}</p>
                           <hr className="my-3"/>
                           <p><strong>Available Gold:</strong> {userData?.goldBalanceGrams?.toFixed(3) ?? 'N/A'} g</p>
                           <p><strong>Available Cash:</strong> {formatCurrency(userData?.cashBalanceLKR ?? 0)}</p>
                       </div>

                       {/* --- Delivery Details (Always Editable) --- */}
                       <div className="delivery-details border border-gray-200 p-4 rounded">
                           <div className="flex justify-between items-center mb-3">
                               <h4 className="text-lg font-semibold">Delivery Details</h4>
                           </div>

                           {/* Address Fields (Inputs) */}
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
                                   <input type="tel" id="phone" name="phone" required value={shippingDetails.phone} onChange={handleInputChange} className="form-input mt-1 block w-full" placeholder="Include country code if applicable"/>
                               </div>
                           </div>

                           {/* Save Address Checkbox */}
                           <div className="mt-4">
                               <label htmlFor="saveAddress" className="flex items-center text-sm text-gray-700 cursor-pointer">
                                   <input
                                       type="checkbox"
                                       id="saveAddress"
                                       checked={saveAddress}
                                       onChange={(e) => setSaveAddress(e.target.checked)}
                                       className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500 mr-2"
                                   />
                                   Save this address as my default for future redemptions
                               </label>
                           </div>
                       </div>

                       {/* Form Actions */}
                       <div className="form-actions mt-6 flex flex-col sm:flex-row gap-3">
                           <button
                               type="submit"
                               className="btn btn-primary flex-grow"
                               disabled={submitLoading || !!successMessage || showProcessingPopup} // Disable during submit, success, or processing popup
                           >
                               {submitLoading ? ( // Show spinner only when submitLoading is true (API call active)
                                    <>
                                        {/* Loading Spinner SVG */}
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                               ) : 'Confirm Redemption'}
                           </button>
                           <Link href="/wallet" className={`btn btn-secondary flex-grow text-center ${submitLoading || successMessage || showProcessingPopup ? 'pointer-events-none opacity-50' : ''}`}>
                                Cancel
                            </Link> {/* Disable cancel link visually during processing/success */}
                       </div>
                   </form>
                )}
            </div>
        </div>
    );
}


// --- Main Export (Server Component Context, renders Client Component via Suspense) ---
export default function RedeemConfirmationPage() {
    // This outer component is server-rendered initially.
    // It sets up the layout and uses Suspense to handle the client part.
    return (
        <>
            <NavbarInternal />
            <section className="wallet"> {/* Using common padding/styling class */}
                <Suspense fallback={
                    /* Simple Card-like fallback */
                    <div className="card">
                         <h3>Redeem Confirmation</h3>
                         <div className="p-10 text-center">Loading Confirmation Details...</div>
                    </div>
                }>
                    {/* Render the component that uses client hooks */}
                    <RedeemConfirmationContent />
                </Suspense>
            </section>
            <FooterInternal />
        </>
    );
}