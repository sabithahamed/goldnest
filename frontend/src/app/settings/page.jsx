// frontend/src/app/settings/page.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import Image from 'next/image'; // Ensure Image is imported
import styles from './SettingsPage.module.css';

// --- Helper Functions ---
const formatCurrency = (value, currency = 'LKR', locale = 'si-LK') => {
    const number = Number(value);
    if (isNaN(number)) {
        return value;
    }
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(number);
    } catch (error) {
        console.warn("Currency formatting error:", error);
        return `${currency} ${number.toFixed(2)}`;
    }
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (error) {
        console.warn("Date formatting error:", error);
        return dateString;
    }
};
// --- End Helpers ---

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');
    const [userData, setUserData] = useState(null);
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();

    // State for profile picture preview/URL - managed here
    const [profilePicPreview, setProfilePicPreview] = useState('/default-avatar.png'); // Default placeholder
    const fileInputRef = useRef(null); // Ref stays here

    useEffect(() => {
        setLoading(true);
        setError('');
        setSuccessMessage('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            router.push('/');
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        axios.get(`${backendUrl}/api/users/me`, config)
            .then(response => {
                const fetchedData = response.data;
                setUserData(fetchedData);
                setInitialData(fetchedData);
                // Set initial preview from fetched data or default
                setProfilePicPreview(fetchedData?.profilePictureUrl || '/default-avatar.png');
            })
            .catch(err => {
                console.error("Error fetching settings data:", err);
                setError(err.response?.data?.message || "Failed to load user data.");
                if (err.response?.status === 401) {
                    localStorage.clear();
                    router.push('/');
                }
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleThemeChange = (selectedTheme) => {
        if (userData) {
            setUserData(prev => ({ ...prev, themePreference: selectedTheme }));
            // Optionally: Add API call here to save theme preference to backend
        }
        // Apply theme immediately to the body
        if (typeof window !== 'undefined') {
            if (selectedTheme === 'dark') {
                document.body.classList.add('dark');
                // Consider saving preference to localStorage too for persistence across refreshes
                // localStorage.setItem('themePreference', 'dark');
            } else {
                document.body.classList.remove('dark');
                // localStorage.setItem('themePreference', 'white');
            }
        }
    };

    // Trigger file input click
    const triggerFileSelect = () => fileInputRef.current?.click();

    // Show success popup message
    const showSuccessPopup = (message) => {
        setSuccessMessage(message || "Changes saved successfully!");
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const renderSectionContent = () => {
        if (loading) return <div className="p-5 text-center">Loading settings...</div>;
        if (error && activeSection !== 'profile') return <div className="p-5 text-center text-red-500">Error: {error}</div>; // Show general error for non-profile sections
        if (!userData && !loading) return <div className="p-5 text-center">Could not load user data.</div>;

        switch (activeSection) {
            case 'profile':
                return <GeneralSettingsComponent
                    userData={userData}
                    setUserData={setUserData}
                    initialData={initialData}
                    showSuccess={showSuccessPopup}
                    triggerFileSelect={triggerFileSelect}
                    profilePicPreview={profilePicPreview} // Pass state
                    setProfilePicPreview={setProfilePicPreview} // Pass setter
                    fileInputRef={fileInputRef} // Pass ref
                    handleThemeChange={handleThemeChange} // Pass theme handler
                    setInitialData={setInitialData} // Pass initial data setter
                />;
            case 'payment':
                return <PaymentSettingsComponent showSuccess={showSuccessPopup} />;
            case 'security':
                return <SecuritySettingsComponent showSuccess={showSuccessPopup} />;
            case 'price-alerts':
                return <PriceAlertsComponent showSuccess={showSuccessPopup} />;
            case 'preferences':
                return <PreferencesComponent showSuccess={showSuccessPopup} />;
            case 'account':
                return <AccountSettingsComponent userData={userData} />;
            case 'help':
                return <HelpSectionComponent />;
            default:
                // Fallback to profile section
                 return <GeneralSettingsComponent
                            userData={userData}
                            setUserData={setUserData}
                            initialData={initialData}
                            showSuccess={showSuccessPopup}
                            triggerFileSelect={triggerFileSelect}
                            profilePicPreview={profilePicPreview}
                            setProfilePicPreview={setProfilePicPreview}
                            fileInputRef={fileInputRef}
                            handleThemeChange={handleThemeChange}
                            setInitialData={setInitialData}
                        />;
        }
    };

    return (
        <>
            <NavbarInternal />
            <section className={styles.settings}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <ul>
                        <li><button onClick={() => setActiveSection('profile')} className={`${styles.sidebarLink} ${activeSection === 'profile' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-user"></i> General Settings</button></li>
                        <li><button onClick={() => setActiveSection('payment')} className={`${styles.sidebarLink} ${activeSection === 'payment' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-credit-card"></i> Payment Settings</button></li>
                        <li><button onClick={() => setActiveSection('security')} className={`${styles.sidebarLink} ${activeSection === 'security' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-shield-alt"></i> Security Settings</button></li>
                        <li><button onClick={() => setActiveSection('price-alerts')} className={`${styles.sidebarLink} ${activeSection === 'price-alerts' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-bell"></i> Price Alerts</button></li>
                        <li><button onClick={() => setActiveSection('preferences')} className={`${styles.sidebarLink} ${activeSection === 'preferences' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-sliders-h"></i> Preferences</button></li>
                        <li><button onClick={() => setActiveSection('account')} className={`${styles.sidebarLink} ${activeSection === 'account' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-user-cog"></i> Account</button></li>
                        <li><button onClick={() => setActiveSection('help')} className={`${styles.sidebarLink} ${activeSection === 'help' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-question-circle"></i> Help</button></li>
                    </ul>
                </div>
                {/* Main Content Area */}
                <div className={styles.settingsContent}>
                    {renderSectionContent()}
                </div>
            </section>
            {/* Success Popup */}
            {successMessage && (
                <div className={styles.successPopup} style={{ display: 'block' }}>
                    <h3>Success!</h3>
                    <p>{successMessage}</p>
                    <button className={`${styles.btnPrimary} mt-4`} onClick={() => setSuccessMessage('')}>Close</button>
                </div>
            )}
            <FooterInternal />
        </>
    );
}


// --- General Settings Component (Handles Profile Picture Upload) ---
function GeneralSettingsComponent({
    userData,
    setUserData,
    initialData,
    showSuccess,
    triggerFileSelect,
    profilePicPreview, // Received from parent
    setProfilePicPreview, // Received from parent
    fileInputRef, // Received from parent
    handleThemeChange, // Received from parent
    setInitialData // Received from parent
}) {
    const [isSubmitting, setIsSubmitting] = useState(false); // For saving text fields
    const [error, setError] = useState(''); // Specific error for this section
    const [isUploading, setIsUploading] = useState(false); // State for upload loading

    // Handles changes to text input fields
    const handleChange = (e) => {
        // Prevent controlled/uncontrolled warning if initial value is null/undefined
        const value = e.target.value ?? '';
        setUserData({ ...userData, [e.target.id]: value });
    };

    // --- UPDATED Profile Picture Change Handler ---
    const handleProfilePicChange = async (event) => {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            alert("Please select a valid image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // Example: Limit file size to 5MB
             alert("File is too large. Please select an image smaller than 5MB.");
             return;
         }


        // 1. Show Preview Immediately
        const reader = new FileReader();
        reader.onload = (e) => {
            setProfilePicPreview(e.target.result); // Update preview state (passed from parent)
        };
        reader.readAsDataURL(file);

        // 2. Prepare for Upload
        setIsUploading(true);
        setError(''); // Clear previous errors in this section
        const token = localStorage.getItem('userToken');
        if (!token) {
            setError('Authentication error. Please log in again.');
            setIsUploading(false);
            return;
        }
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        // 3. Create FormData
        const formData = new FormData();
        formData.append('profilePic', file); // Key 'profilePic' MUST match backend (e.g., upload.single('profilePic'))

        // 4. Make API Call
        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data', // Important for file uploads
                    Authorization: `Bearer ${token}`,
                },
            };
            const { data } = await axios.post(
                `${backendUrl}/api/users/profile-picture`, // Endpoint for picture upload ONLY
                formData,
                config
            );

            // 5. Handle Success
            showSuccess(data.message || "Profile picture updated!");
            // Update user data state with the new URL from backend
            const newUrl = data.profilePictureUrl; // Assuming backend returns this key
            if (!newUrl) {
                 console.warn("Backend did not return a profilePictureUrl.");
                 setError("Upload succeeded but failed to get new image URL.");
                 // Optionally revert preview if URL is missing
                 setProfilePicPreview(initialData?.profilePictureUrl || '/default-avatar.png');
            } else {
                 // Update main userData state
                 setUserData(prev => ({ ...prev, profilePictureUrl: newUrl }));
                 // Also update initialData so reset works correctly after successful upload
                 setInitialData(prev => ({ ...prev, profilePictureUrl: newUrl }));
                 // Ensure preview state also reflects the *final* saved URL
                 setProfilePicPreview(newUrl);
            }

        } catch (err) {
            console.error("Profile Picture Upload Error:", err);
            const errorMessage = err.response?.data?.message || 'Failed to upload profile picture.';
            setError(errorMessage);
            // Revert preview to the *last known good* state (from initialData) if upload fails
            setProfilePicPreview(initialData?.profilePictureUrl || '/default-avatar.png');
        } finally {
            setIsUploading(false);
             // Clear the file input value so the same file can be selected again if needed after an error
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    // --- END UPDATED Handler ---

    // Handles saving non-image profile data (name, phone, etc.)
    const handleSave = async () => {
        setIsSubmitting(true);
        setError('');
        const token = localStorage.getItem('userToken');
        if (!token) {
             setError('Authentication error. Please log in again.');
             setIsSubmitting(false);
             return;
        }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
             // Extract only the fields managed by the /profile endpoint
             const { name, phone, address, city, languagePreference, themePreference } = userData || {}; // Ensure userData exists
             const payload = { name, phone, address, city, languagePreference, themePreference }; // Add theme/language if saved here

            const response = await axios.put(`${backendUrl}/api/users/profile`, payload, config); // Endpoint for general profile data

             // Update state with response, but keep the potentially updated profilePicUrl from separate upload
            const updatedProfileData = response.data;
            setUserData(prev => ({
                ...prev,
                ...updatedProfileData, // Update with data from this endpoint
                profilePictureUrl: prev.profilePictureUrl // Keep the picture URL from the upload state/previous state
            }));
            // Update initialData as well to reflect the saved state
            setInitialData(prev => ({
                ...prev,
                ...updatedProfileData,
                profilePictureUrl: prev.profilePictureUrl // Keep picture URL consistent
            }));

            showSuccess("General settings saved successfully!");
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save settings.');
            console.error("Save Profile Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Resets form fields to initial data
    const handleReset = () => {
        if (initialData) {
            setUserData(initialData); // Reset text fields etc.
            handleThemeChange(initialData?.themePreference || 'white'); // Reset theme using handler
            // Reset preview to the *initial* fetched URL or default
            setProfilePicPreview(initialData?.profilePictureUrl || '/default-avatar.png');
            setError(''); // Clear errors
        }
    };

    // Render loading state if userData hasn't loaded yet (should be handled by parent, but good fallback)
    if (!userData) return <div className="p-4 text-center">Loading user data...</div>;

    // Determine the correct image source to display
    // Priority: Local preview (profilePicPreview if it's a data URL) > Saved URL (userData) > Default
    const imageSrc = profilePicPreview || '/default-avatar.png'; // Use state directly as it's updated on load, select, and upload success/fail

    return (
        <div id="profile" className={`${styles.tabContent} ${styles.active}`}>
            <h2>General Settings</h2>
            <p className={styles.lastUpdated}>Last Updated: {userData.updatedAt ? formatDate(userData.updatedAt) : 'N/A'}</p>
            {/* Display errors specific to this section */}
            {error && <p className={`${styles.error} text-center mb-4`}>{error}</p>}

            {/* Profile Picture Section */}
            <div className={styles.profilePic}>
                <Image
                    key={imageSrc} // Add key to force re-render if src changes drastically (e.g., error fallback)
                    src={imageSrc}
                    alt="Profile Picture"
                    id="profile-pic-preview"
                    width={80} height={80}
                    className="rounded-full object-cover border-2 border-gray-300"
                    priority={true} // Prioritize loading the profile pic
                    onError={(e) => {
                        // Fallback if the image URL (even the default one somehow) fails
                        console.warn(`Error loading image: ${imageSrc}, falling back to default.`);
                        e.target.src = '/default-avatar.png'; // Set src directly on the img element
                         // Optionally update state ONLY if the failed src wasn't already the default
                        if (imageSrc !== '/default-avatar.png') {
                            setProfilePicPreview('/default-avatar.png');
                        }
                    }}
                />
                <button
                    onClick={triggerFileSelect}
                    className={styles.btnPrimary}
                    type="button"
                    disabled={isUploading} // Disable button while uploading
                >
                    {isUploading ? 'Uploading...' : 'Change Picture'}
                </button>
                {/* Hidden file input */}
                <input
                    type="file"
                    id="profile-pic-upload"
                    accept="image/png, image/jpeg, image/gif, image/webp" // Be more specific with accepted types
                    ref={fileInputRef}
                    onChange={handleProfilePicChange}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Other Form Fields */}
            <div className={styles.formGroup}>
                <label htmlFor="name">Name</label>
                <input type="text" id="name" value={userData.name || ''} onChange={handleChange} required className={styles.inputField} />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input type="email" id="email" value={userData.email || ''} disabled className={`${styles.inputField} ${styles.disabledInput}`} />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="phone">Mobile Number</label>
                <input type="tel" id="phone" name="phone" value={userData.phone || ''} onChange={handleChange} className={styles.inputField} placeholder="+94 XXX XXX XXX" />
                <small>Format: +94 XXX XXX XXX (or local format)</small>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="address">Address</label>
                <textarea id="address" name="address" value={userData.address || ''} onChange={handleChange} className={styles.inputField} rows="3"></textarea>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="languagePreference">Language</label>
                <select id="languagePreference" value={userData.languagePreference || 'en-us'} onChange={handleChange} name="languagePreference" className={`${styles.inputField} bg-white`}>
                    <option value="en-us">English (United States)</option>
                    <option value="si-lk">Sinhala (Sri Lanka)</option>
                    <option value="ta-lk">Tamil (Sri Lanka)</option>
                </select>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="themePreference">Theme</label>
                <select
                    id="themePreference" // Use the state key if saving this field
                    value={userData?.themePreference || (typeof window !== 'undefined' && document.body.classList.contains('dark') ? 'dark' : 'white')}
                    onChange={(e) => {
                        handleChange(e); // Update state via standard handler if saved via PUT /profile
                        handleThemeChange(e.target.value); // Also apply theme immediately
                    }}
                    className={`${styles.inputField} bg-white`}
                >
                    <option value="white">White</option>
                    <option value="dark">Dark</option>
                </select>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
                <button
                    className={`${styles.btnPrimary}`}
                    onClick={handleSave} // Saves text fields
                    disabled={isSubmitting || isUploading} // Disable save during text submission OR image upload
                >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    className={`${styles.btnSecondary}`}
                    onClick={handleReset}
                    disabled={isSubmitting || isUploading} // Disable reset during any operation
                >
                    Reset
                </button>
            </div>
        </div>
    );
}


// --- Payment Settings Component ---
function PaymentSettingsComponent({ showSuccess }) {
    const [autoInvestPlans, setAutoInvestPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [errorPlans, setErrorPlans] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPlanData, setNewPlanData] = useState({
        amountLKR: '',
        frequency: 'daily',
        date: '', // Keep state field as 'date' for simplicity in form handling
        paymentMethod: 'wallet-cash',
    });
    const [savingPlan, setSavingPlan] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // --- Base URL for Autopayments API ---
    const AUTOPAY_API_URL = '/api/users/autopayments'; // <-- CORRECT BASE URL

    useEffect(() => {
        setLoadingPlans(true);
        setErrorPlans('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            setErrorPlans("Authentication required. Please log in.");
            setLoadingPlans(false);
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        // --- Use Correct GET URL ---
        axios.get(`${backendUrl}${AUTOPAY_API_URL}`, config)
            .then(response => setAutoInvestPlans(response.data || []))
            .catch(err => {
                console.error("Error fetching auto-invest plans:", err);
                setErrorPlans(err.response?.data?.message || "Could not load auto-invest plans.");
            })
            .finally(() => setLoadingPlans(false));
    }, []); // Empty dependency array is correct here

    const handleAddPlan = async (e) => {
        e.preventDefault();
        const amount = Number(newPlanData.amountLKR);
        if (!amount || amount < 100) {
            setErrorPlans("Please enter a valid amount (minimum Rs. 100).");
            return;
        }
        if (newPlanData.frequency === 'monthly' && !newPlanData.date) {
            setErrorPlans("Please select a day of the month for monthly auto-investment.");
            return;
        }
        setSavingPlan(true);
        setErrorPlans('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            setErrorPlans('Authentication Error.');
            setSavingPlan(false);
            return;
        }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            // Create payload, converting 'date' state to 'dayOfMonth' for the API
            const payload = {
                amountLKR: amount,
                frequency: newPlanData.frequency,
                paymentMethod: newPlanData.paymentMethod,
                // Add dayOfMonth only if frequency is monthly and date is selected
                dayOfMonth: newPlanData.frequency === 'monthly' ? Number(newPlanData.date) : undefined,
            };
             // Remove undefined fields potentially not expected by backend (like dayOfMonth when not monthly)
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);


            // --- Use Correct POST URL ---
            const { data: addedPlan } = await axios.post(`${backendUrl}${AUTOPAY_API_URL}`, payload, config);

            setAutoInvestPlans(prev => [...prev, addedPlan]);
            setShowAddForm(false);
            setNewPlanData({ amountLKR: '', frequency: 'daily', date: '', paymentMethod: 'wallet-cash' }); // Reset form
            showSuccess("Auto-Invest plan added successfully!");
        } catch (err) {
            setErrorPlans(err.response?.data?.message || "Failed to add auto-invest plan.");
            console.error("Add Auto-Invest Plan Error:", err);
        } finally {
            setSavingPlan(false);
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        setTogglingId(id);
        setErrorPlans('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            setErrorPlans('Authentication Error.');
            setTogglingId(null);
            return;
        }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            // --- Use Correct PUT URL ---
            const { data: updatedPlan } = await axios.put(`${backendUrl}${AUTOPAY_API_URL}/${id}`, { isActive: !currentStatus }, config);
            setAutoInvestPlans(prev => prev.map(plan => plan._id === id ? updatedPlan : plan));
            showSuccess(`Auto-Invest plan ${updatedPlan.isActive ? 'activated' : 'paused'}.`);
        } catch (err) {
            setErrorPlans(err.response?.data?.message || "Failed to toggle auto-invest plan status.");
            console.error("Toggle Auto-Invest Plan Error:", err);
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm("Are you sure you want to delete this auto-invest plan?")) return;
        setDeletingId(id);
        setErrorPlans('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            setErrorPlans('Authentication Error.');
            setDeletingId(null);
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            // --- Use Correct DELETE URL ---
            await axios.delete(`${backendUrl}${AUTOPAY_API_URL}/${id}`, config);
            setAutoInvestPlans(prev => prev.filter(plan => plan._id !== id));
            showSuccess("Auto-Invest plan deleted.");
        } catch (err) {
            setErrorPlans(err.response?.data?.message || "Failed to delete auto-invest plan.");
            console.error("Delete Auto-Invest Plan Error:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const handleReset = () => {
        setShowAddForm(false);
        setNewPlanData({ amountLKR: '', frequency: 'daily', date: '', paymentMethod: 'wallet-cash' });
        setErrorPlans('');
    };

     return (
        <div id="payment" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Payment Settings</h2>
            <div className={styles.formGroup}>
                <label htmlFor="default-payment">Default Purchase Method</label>
                <select id="default-payment" className={`${styles.inputField} bg-white`}>
                    <option value="wallet-cash">Wallet Cash</option>
                    <option value="payhere" disabled>PayHere (Card/Bank) - Coming Soon</option>
                    <option value="paypal" disabled>PayPal - Coming Soon</option>
                </select>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="default-deposit">Default Sell Proceeds Method</label>
                <select id="default-deposit" className={`${styles.inputField} bg-white`}>
                    <option value="wallet-cash">Wallet Cash</option>
                </select>
            </div>
            <div className={styles.autoInvestSection}>
                <div className="flex justify-between items-center mb-4">
                    <h3>Auto-Invest Plans</h3>
                    <button onClick={() => { setShowAddForm(!showAddForm); setErrorPlans(''); }} className={styles.btnSecondary}>
                        {showAddForm ? 'Cancel' : '+ Add Auto-Invest'}
                    </button>
                </div>
                {errorPlans && <p className={`${styles.error} text-center mb-4`}>{errorPlans}</p>}
                {showAddForm && (
                    <form onSubmit={handleAddPlan} className={styles.autoInvestForm}>
                        <h4>Create New Auto-Invest Plan</h4>
                        <div className={styles.formGroup}>
                            <label htmlFor="auto-invest-amount">Amount (Rs.)</label>
                            <input
                                type="number"
                                id="auto-invest-amount"
                                value={newPlanData.amountLKR}
                                onChange={(e) => setNewPlanData({ ...newPlanData, amountLKR: e.target.value })}
                                min="100"
                                step="100"
                                required
                                className={styles.inputField}
                                placeholder="Min Rs. 100"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="auto-invest-frequency">Frequency</label>
                            <select
                                id="auto-invest-frequency"
                                value={newPlanData.frequency}
                                onChange={(e) => setNewPlanData({ ...newPlanData, frequency: e.target.value })}
                                className={`${styles.inputField} bg-white`}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        {/* Correctly show date select ONLY for monthly */}
                        {newPlanData.frequency === 'monthly' && (
                            <div className={styles.formGroup}>
                                <label htmlFor="auto-invest-date">Day of Month</label> {/* Changed label */}
                                <select
                                    id="auto-invest-date" // Keep ID same as state key for simplicity
                                    value={newPlanData.date} // State name 'date' holds the day number
                                    onChange={(e) => setNewPlanData({ ...newPlanData, date: e.target.value })}
                                    className={`${styles.inputField} bg-white`}
                                    required // Make it required if monthly is selected
                                >
                                    <option value="">Select Day (1-28)</option>
                                    {[...Array(28)].map((_, i) => ( // Limit to 28 for safety
                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className={styles.formGroup}>
                            <label htmlFor="auto-invest-payment">Payment Method</label>
                            <select
                                id="auto-invest-payment"
                                value={newPlanData.paymentMethod}
                                onChange={(e) => setNewPlanData({ ...newPlanData, paymentMethod: e.target.value })}
                                className={`${styles.inputField} bg-white`}
                            >
                                <option value="wallet-cash">Wallet Cash</option>
                                {/* Future options if implemented */}
                                {/* <option value="payhere" disabled>PayHere (Card/Bank)</option> */}
                                {/* <option value="paypal" disabled>PayPal</option> */}
                            </select>
                        </div>
                        <div className={styles.actionButtons}>
                            <button type="submit" className={styles.btnPrimary} disabled={savingPlan}>
                                {savingPlan ? 'Adding...' : 'Add Plan'}
                            </button>
                            <button type="button" className={styles.btnSecondary} onClick={handleReset} disabled={savingPlan}>
                                Clear
                            </button>
                        </div>
                    </form>
                )}
                <h3 className={styles.sectionSubheading}>Your Auto-Invest Plans</h3>
                <div className={styles.autoInvestList}>
                     {loadingPlans ? (
                         <p className="text-gray-500 dark:text-gray-400 text-center p-4">Loading plans...</p>
                     ) : errorPlans && !autoInvestPlans.length ? ( // Show error only if list is empty and error exists
                         <p className={`${styles.error} text-center p-4`}>{errorPlans}</p>
                     ) : autoInvestPlans.length > 0 ? (
                         autoInvestPlans.map(plan => (
                            <div key={plan._id} className={styles.autoInvestItem}>
                                 <div>
                                      <p className={`font-medium ${!plan.isActive ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                           {formatCurrency(plan.amountLKR)} {plan.frequency}
                                           {/* Display dayOfMonth if available */}
                                           {plan.frequency === 'monthly' && plan.dayOfMonth ? ` on day ${plan.dayOfMonth}` : ''}
                                      </p>
                                      <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${!plan.isActive ? 'line-through' : ''}`}>
                                          {/* Display payment method if available, fallback or simple text */}
                                          Payment: {plan.paymentMethod === 'wallet-cash' ? 'Wallet Cash' : (plan.paymentMethod || 'N/A')} | Status: {plan.isActive ? 'Active' : 'Paused'}
                                      </p>
                                  </div>
                                  <div className={styles.autoInvestActions}>
                                      {/* Toggle Button */}
                                      <button
                                          onClick={() => handleToggleActive(plan._id, plan.isActive)}
                                          disabled={togglingId === plan._id || deletingId === plan._id}
                                          className={`text-xs font-medium px-2 py-1 rounded transition-colors duration-150 ${
                                              plan.isActive
                                                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-600'
                                                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-600'
                                          } ${togglingId === plan._id ? 'opacity-50 cursor-wait' : ''}`}
                                      >
                                          {togglingId === plan._id ? '...' : (plan.isActive ? 'Pause' : 'Activate')}
                                      </button>
                                      {/* Delete Button */}
                                      <button
                                          onClick={() => handleDeletePlan(plan._id)}
                                          disabled={togglingId === plan._id || deletingId === plan._id}
                                          className={`text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded transition-colors duration-150 hover:bg-red-100 dark:hover:bg-red-700 dark:hover:text-white ${deletingId === plan._id ? 'opacity-50 cursor-wait' : ''}`}
                                          title="Delete Plan"
                                      >
                                          {deletingId === plan._id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                                          <span className="hidden sm:inline ml-1">{deletingId === plan._id ? '' : 'Delete'}</span>
                                      </button>
                                  </div>
                             </div>
                         ))
                     ) : (
                         <p className="text-gray-500 dark:text-gray-400 text-center p-4 border rounded border-dashed border-gray-300 dark:border-gray-600">You haven't set any auto-invest plans yet.</p>
                     )}
                </div>
            </div>
            <p className="text-sm text-gray-500 my-4">Note: Default method selection is simulated for display.</p>
            <div className={styles.actionButtons}>
                <button className={`${styles.btnPrimary}`} onClick={() => showSuccess("Default payment settings saved (Simulated).")}>Save Defaults</button>
                {/* <button className={`${styles.btnSecondary}`} onClick={() => alert("Resetting default payment settings (Simulated).")}>Reset Defaults</button> */}
            </div>
        </div>
    );
}

// --- Security Settings Component (Unchanged from original provided code) ---
function SecuritySettingsComponent({ showSuccess }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false); // Example state
    const [biometricEnabled, setBiometricEnabled] = useState(false); // Example state

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdError('');
        setPwdSuccess('');
        if (newPassword !== confirmPassword) {
            setPwdError('New passwords do not match.');
            return;
        }
        if (newPassword.length < 8) { // Basic validation
            setPwdError('New password must be at least 8 characters long.');
            return;
        }

        setPwdLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
            setPwdError('Authentication error. Please log in again.');
            setPwdLoading(false);
            return;
        }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            // Assuming your backend endpoint takes current and new password
            await axios.put(`${backendUrl}/api/users/change-password`, { currentPassword, newPassword }, config);
            setPwdSuccess('Password changed successfully!');
            showSuccess('Password changed successfully!'); // Show global success popup
            // Clear fields on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPwdSuccess(''), 5000); // Clear local success message after a delay
        } catch (err) {
            setPwdError(err.response?.data?.message || 'Failed to change password.');
            console.error("Change Password Error:", err);
        } finally {
            setPwdLoading(false);
        }
    };

     const handleResetPasswordFields = () => {
         setCurrentPassword('');
         setNewPassword('');
         setConfirmPassword('');
         setPwdError('');
         setPwdSuccess('');
     };

     // Simulated toggle handler
    const handleToggle = (setter, currentVal, featureName) => {
        setter(!currentVal);
        // In a real app, you would make an API call here to update the setting
        // For now, just show a simulation message
        alert(`${featureName} toggle is simulated. State changed locally.`);
        // You might want to show a proper success/error message instead of alert
        // showSuccess(`${featureName} setting ${!currentVal ? 'enabled' : 'disabled'} (Simulated).`);
    };


     return (
        <div id="security" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Security Settings</h2>
            <h3 className={styles.sectionSubheading}>Change Your Password</h3>
            {/* Display local messages for password change */}
            {pwdError && <p className={`${styles.error} text-center mb-4`}>{pwdError}</p>}
            {pwdSuccess && <p className={`${styles.success} text-center mb-4`}>{pwdSuccess}</p>}
            <form onSubmit={handleChangePassword}>
                <div className={styles.formGroup}>
                    <label htmlFor="current-password">Current Password</label>
                    <input type="password" id="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={styles.inputField} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="new-password">New Password</label>
                    <input type="password" id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={styles.inputField} />
                    <small>Minimum 8 characters</small>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="confirm-password">Confirm New Password</label>
                    <input type="password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={styles.inputField} />
                </div>
                <div className={styles.actionButtons}>
                    <button type="submit" className={`${styles.btnPrimary}`} disabled={pwdLoading}>
                        {pwdLoading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button type="button" className={`${styles.btnSecondary}`} onClick={handleResetPasswordFields} disabled={pwdLoading}>
                        Clear Fields
                    </button>
                </div>
            </form>

            <hr className={styles.divider} />

            <h3 className={styles.sectionSubheading}>Additional Security</h3>
            <div className={`${styles.securityOptions} ${styles.formGroup}`}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        id="two-factor"
                        checked={twoFactorEnabled}
                        onChange={() => handleToggle(setTwoFactorEnabled, twoFactorEnabled, 'Two-Factor Authentication')}
                    />
                    Enable Two-Factor Authentication (Simulated)
                </label>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        id="biometric"
                        checked={biometricEnabled}
                        onChange={() => handleToggle(setBiometricEnabled, biometricEnabled, 'Biometric Login')}
                    />
                     Enable Biometric Login (Simulated)
                </label>
            </div>
             <p className="text-xs text-gray-500 mt-2">Note: 2FA and Biometric options are simulated and only change state locally.</p>
        </div>
    );
}

// --- Price Alerts Component (Unchanged from original provided code) ---
function PriceAlertsComponent({ showSuccess }) {
    const [alerts, setAlerts] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [errorAlerts, setErrorAlerts] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAlertData, setNewAlertData] = useState({ targetPriceLKRPerGram: '', condition: 'below' });
    const [savingAlert, setSavingAlert] = useState(false);
    const [togglingId, setTogglingId] = useState(null); // ID of alert being toggled
    const [deletingId, setDeletingId] = useState(null); // ID of alert being deleted

    useEffect(() => {
        setLoadingAlerts(true);
        setErrorAlerts('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            setErrorAlerts("Authentication required. Please log in.");
            setLoadingAlerts(false);
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        axios.get(`${backendUrl}/api/users/price-alerts`, config)
            .then(response => setAlerts(response.data || []))
            .catch(err => {
                console.error("Error fetching price alerts:", err);
                setErrorAlerts(err.response?.data?.message || "Could not load price alerts.");
            })
            .finally(() => setLoadingAlerts(false));
    }, []);

    const handleAddAlert = async (e) => {
        e.preventDefault();
        if (!newAlertData.targetPriceLKRPerGram || isNaN(Number(newAlertData.targetPriceLKRPerGram)) || Number(newAlertData.targetPriceLKRPerGram) <= 0) {
            setErrorAlerts("Please enter a valid positive target price.");
            return;
        }
        setSavingAlert(true);
        setErrorAlerts('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            setErrorAlerts('Authentication Error.');
            setSavingAlert(false);
            return;
        }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        const payload = {
            ...newAlertData,
            targetPriceLKRPerGram: Number(newAlertData.targetPriceLKRPerGram)
        };

        try {
            const { data: addedAlert } = await axios.post(`${backendUrl}/api/users/price-alerts`, payload, config);
            setAlerts(prev => [...prev, addedAlert]);
            setShowAddForm(false);
            setNewAlertData({ targetPriceLKRPerGram: '', condition: 'below' }); // Reset form
            showSuccess("Price alert added successfully!");
        } catch (err) {
            setErrorAlerts(err.response?.data?.message || "Failed to add alert.");
            console.error("Add Price Alert Error:", err);
        } finally {
            setSavingAlert(false);
        }
    };

    const handleDeleteAlert = async (id) => {
        if (!window.confirm("Are you sure you want to delete this price alert?")) return;
        setDeletingId(id); // Set deleting state for this specific alert
        setErrorAlerts('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            setErrorAlerts('Authentication Error.');
            setDeletingId(null);
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            await axios.delete(`${backendUrl}/api/users/price-alerts/${id}`, config);
            setAlerts(prev => prev.filter(alert => alert._id !== id)); // Remove from state
            showSuccess("Price alert deleted.");
        } catch (err) {
            setErrorAlerts(err.response?.data?.message || "Failed to delete alert.");
            console.error("Delete Price Alert Error:", err);
        } finally {
            setDeletingId(null); // Clear deleting state
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        setTogglingId(id); // Set toggling state for this specific alert
        setErrorAlerts('');
        const token = localStorage.getItem('userToken');
        if (!token) {
            setErrorAlerts('Authentication Error.');
            setTogglingId(null);
            return;
        }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            // Assuming the backend expects { isActive: boolean } in the body for PUT request
            const { data: updatedAlert } = await axios.put(`${backendUrl}/api/users/price-alerts/${id}`, { isActive: !currentStatus }, config);
            setAlerts(prev => prev.map(a => a._id === id ? updatedAlert : a)); // Update the specific alert in state
            showSuccess(`Alert ${updatedAlert.isActive ? 'activated' : 'paused'}.`);
        } catch (err) {
            setErrorAlerts(err.response?.data?.message || "Failed to toggle alert status.");
            console.error("Toggle Price Alert Error:", err);
        } finally {
            setTogglingId(null); // Clear toggling state
        }
    };

    return (
        <div id="price-alerts" className={`${styles.tabContent} ${styles.active}`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold m-0">Price Alerts</h2>
                <button onClick={() => { setShowAddForm(!showAddForm); setErrorAlerts(''); }} className={styles.btnSecondary}>
                    {showAddForm ? 'Cancel' : '+ Add New Alert'}
                </button>
            </div>
            {/* Display errors specific to this section */}
            {errorAlerts && <p className={`${styles.error} text-center mb-4`}>{errorAlerts}</p>}

            {/* Add Alert Form */}
            {showAddForm && (
                <form onSubmit={handleAddAlert} className="mb-6 p-4 border rounded bg-gray-50 dark:bg-gray-700 space-y-3">
                    <h4 className="text-md font-semibold">Create New Alert</h4>
                    <div className={styles.formGroup}>
                        <label htmlFor="condition">Alert Condition:</label>
                        <select id="condition" value={newAlertData.condition} onChange={(e) => setNewAlertData({ ...newAlertData, condition: e.target.value })} className={`${styles.inputField} bg-white dark:bg-gray-600 dark:text-white`}>
                            <option value="below">Price Drops Below</option>
                            <option value="above">Price Rises Above</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="targetPrice">Target Price (LKR per Gram):</label>
                        <input type="number" id="targetPrice" value={newAlertData.targetPriceLKRPerGram} onChange={(e) => setNewAlertData({ ...newAlertData, targetPriceLKRPerGram: e.target.value })} required min="1" step="any" className={styles.inputField} placeholder="e.g., 20000" />
                    </div>
                    <button type="submit" className={styles.btnPrimary} disabled={savingAlert}>
                        {savingAlert ? 'Adding...' : 'Add Alert'}
                    </button>
                </form>
            )}

            {/* List of Existing Alerts */}
            <h3 className={styles.sectionSubheading}>Your Alerts</h3>
            <ul className={styles.alertsList}>
                {loadingAlerts ? (
                    <li className="text-gray-500 dark:text-gray-400">Loading alerts...</li>
                ) : alerts.length > 0 ? (
                    alerts.map(alert => (
                        <li key={alert._id}>
                            <div>
                                <p className={`font-medium ${!alert.isActive ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                    Notify when price is <span className="font-bold">{alert.condition}</span> {formatCurrency(alert.targetPriceLKRPerGram, 'LKR')}/g
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Status: {alert.isActive ? 'Active' : 'Paused'}</p>
                            </div>
                             {/* Action Buttons for each alert */}
                            <div className={styles.actionButtons}>
                                <button
                                    onClick={() => handleToggleActive(alert._id, alert.isActive)}
                                    disabled={togglingId === alert._id || deletingId === alert._id} // Disable if toggling or deleting this alert
                                    className={`${styles.btnSecondary} ${
                                        alert.isActive
                                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-600' // Style for 'Pause'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-600' // Style for 'Activate'
                                    } ${togglingId === alert._id ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {togglingId === alert._id ? '...' : (alert.isActive ? 'Pause' : 'Activate')}
                                </button>
                                <button
                                    onClick={() => handleDeleteAlert(alert._id)}
                                    disabled={togglingId === alert._id || deletingId === alert._id} // Disable if toggling or deleting this alert
                                    className={`${styles.btnDanger} ${deletingId === alert._id ? 'opacity-50 cursor-wait' : ''}`}
                                    title="Delete Alert"
                                >
                                     {/* Show spinner if deleting this specific alert */}
                                    {deletingId === alert._id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                                    <span className="hidden sm:inline ml-1">{deletingId === alert._id ? '' : 'Delete'}</span>
                                </button>
                            </div>
                        </li>
                    ))
                ) : (
                    <li className="text-gray-500 dark:text-gray-400 text-center p-4 border rounded border-dashed border-gray-300 dark:border-gray-600">You haven't set any price alerts yet.</li>
                )}
            </ul>
        </div>
    );
}


// --- Preferences Component (Unchanged from original provided code) ---
function PreferencesComponent({ showSuccess }) {
     // Example states for preferences (not saved to backend in this version)
     const [prefEmail, setPrefEmail] = useState(true);
     const [prefPush, setPrefPush] = useState(true);
     const [prefCurrency, setPrefCurrency] = useState('LKR');
     // Add initial state loading from localStorage or userData if preferences are saved

    const handleSave = () => {
        // In a real app, gather state values (prefEmail, prefPush, prefCurrency)
        // and send them to a backend endpoint to save preferences.
        // Example payload: { notifications: { email: prefEmail, push: prefPush }, display: { currency: prefCurrency } }
        // axios.put('/api/users/preferences', payload, config)...
        showSuccess("Preferences saved (Simulated).");
        // Optionally save to localStorage for persistence:
        // localStorage.setItem('userPreferences', JSON.stringify({ email: prefEmail, push: prefPush, currency: prefCurrency }));
    };

    const handleReset = () => {
        // Reset state to defaults
        setPrefEmail(true);
        setPrefPush(true);
        setPrefCurrency('LKR');
        // Optionally clear localStorage
        // localStorage.removeItem('userPreferences');
        alert("Resetting preferences to default (Simulated).");
    };

    return (
        <div id="preferences" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Preferences</h2>
            <p className="text-xs text-gray-500 mb-4">Note: All preference settings below are currently simulated.</p>

            {/* Notifications Preferences */}
            <div className={`${styles.preferencesGroup} ${styles.formGroup}`}>
                <h4 className={styles.sectionSubheading}>Notifications</h4>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" id="email-notifications" checked={prefEmail} onChange={(e) => setPrefEmail(e.target.checked)} />
                     Email Notifications
                </label>
                <label className={`${styles.checkboxLabel} ${styles.disabledLabel}`}>
                    <input type="checkbox" id="sms-notifications" disabled />
                    SMS Notifications (Coming Soon)
                </label>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" id="push-notifications" checked={prefPush} onChange={(e) => setPrefPush(e.target.checked)} />
                    Push Notifications
                </label>
            </div>

            <hr className={styles.divider} />

            {/* Display Preferences */}
            <div className={`${styles.preferencesGroup} ${styles.formGroup}`}>
                <h4 className={styles.sectionSubheading}>Display</h4>
                <label htmlFor="currency">Preferred Currency Display</label>
                <select id="currency" value={prefCurrency} onChange={(e) => setPrefCurrency(e.target.value)} className={`${styles.inputField} bg-white dark:bg-gray-600 dark:text-white`}>
                    <option value="LKR">LKR (Sri Lankan Rupee)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR" disabled>EUR (Euro - Coming Soon)</option>
                </select>
            </div>

            <hr className={styles.divider} />

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
                <button className={styles.btnPrimary} onClick={handleSave}>Save Changes</button>
                <button className={styles.btnSecondary} onClick={handleReset}>Reset Preferences</button>
            </div>
        </div>
    );
}

// --- Account Settings Component (Unchanged from original provided code) ---
function AccountSettingsComponent({ userData }) {
    const handleDeactivate = () => {
        // Add more checks here if needed (e.g., check balance)
        if (window.confirm('Are you sure you want to deactivate your account? This action is irreversible through the app and requires contacting support. Ensure all assets are sold or redeemed.')) {
            // In a real app, you might call a backend endpoint:
            // axios.post('/api/users/deactivate', {}, config)...
            // For now, simulate and inform the user.
            alert('Account deactivation requested (Simulated). Please follow up with support if required.');
             // Optionally logout after simulated request
             // localStorage.removeItem('userToken');
             // localStorage.removeItem('userName');
             // window.location.href = '/';
        }
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userName'); // Clear any other relevant user data
             // Optionally clear other session/local storage items related to the user
            window.location.href = '/'; // Redirect to home/login page
        }
    };

    // Handle cases where userData might still be loading or null
    if (!userData) {
        return <div className="p-4 text-center">Loading account data...</div>;
    }

    return (
        <div id="account" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Account</h2>
            <div className={styles.formGroup}>
                <label>Account Status</label>
                {/* You might get status from userData if available, e.g., userData.status */}
                <p className="font-medium text-green-600 dark:text-green-400">Active</p>
            </div>
            <div className={styles.formGroup}>
                <label>Account Created</label>
                <p>{userData?.createdAt ? formatDate(userData.createdAt) : 'N/A'}</p>
            </div>
            {/* Add other account info if needed */}
            {/* <div className={styles.formGroup}>
                <label>User ID</label>
                <p className="text-xs text-gray-500">{userData?._id || 'N/A'}</p>
            </div> */}

            <hr className={styles.divider} />

            <div className={styles.actionButtons}>
                <button className={styles.btnSecondary} onClick={handleLogout}>Logout</button>
                <button className={styles.btnDanger} onClick={handleDeactivate}>Deactivate Account</button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Note: Account deactivation is a serious action and may require contacting support to finalize or reverse.</p>
        </div>
    );
}

// --- Help Section Component (Unchanged from original provided code) ---
function HelpSectionComponent() {
    return (
        <div id="help" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Help & Support</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Find answers to common questions or get in touch with our support team.</p>
            <div className={styles.helpLinks}>
                {/* Use Next.js Link for internal navigation if FAQ is a page */}
                {/* import Link from 'next/link'; */}
                {/* <Link href="/faq" passHref legacyBehavior>
                    <a className={styles.helpLinkItem} target="_blank" rel="noopener noreferrer"> <i className="fas fa-question-circle mr-2"></i> FAQs </a>
                </Link> */}
                 {/* Using regular anchor tag for external links or sections on the same page */}
                <a href="/#faq" className={styles.helpLinkItem}> <i className="fas fa-question-circle mr-2"></i> FAQs </a>
                <a href="mailto:info.goldnest@gmail.com" className={styles.helpLinkItem}> <i className="fas fa-headset mr-2"></i> Contact Support </a>
                <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-file-contract mr-2"></i> Terms of Service </a>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-user-shield mr-2"></i> Privacy Policy </a>
                {/* Add links to knowledge base, tutorials, etc. */}
            </div>
        </div>
    );
}