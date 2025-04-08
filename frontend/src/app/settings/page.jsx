// src/app/settings/page.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import Image from 'next/image'; // For profile pic
import styles from './SettingsPage.module.css'; // Import the CSS Module

// --- Helper Functions ---
const formatCurrency = (value, currency = 'LKR', locale = 'si-LK') => {
    const number = Number(value);
    if (isNaN(number)) {
        return value; // Return original value if not a valid number
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
        // Fallback basic formatting
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
        return dateString; // Return original string if formatting fails
    }
};
// --- End Helpers ---


export default function SettingsPage() {
    // Default section changed to 'profile' for clarity, can be changed back if needed
    const [activeSection, setActiveSection] = useState('profile');
    const [userData, setUserData] = useState(null);
    const [initialData, setInitialData] = useState(null); // Store initial fetched data for reset
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // For popup
    const router = useRouter();

    // Refs for profile pic
    const fileInputRef = useRef(null);
    const [profilePicPreview, setProfilePicPreview] = useState('/default-profile-pic.png'); // Default image path

    // --- Fetch User Data ---
    useEffect(() => {
        setLoading(true); setError(''); setSuccessMessage('');
        const token = localStorage.getItem('userToken');
        if (!token) { router.push('/'); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        axios.get(`${backendUrl}/api/users/me`, config)
            .then(response => {
                const fetchedData = response.data;
                setUserData(fetchedData);
                setInitialData(fetchedData); // Save for reset functionality
                // Set profile pic preview if available (assuming backend sends URL)
                 // if (fetchedData.profilePictureUrl) {
                 //     setProfilePicPreview(fetchedData.profilePictureUrl);
                 // }
                 // Set theme based on user preference if stored and fetched
                 // if (fetchedData.themePreference === 'dark') {
                 //     document.body.classList.add('dark');
                 // } else {
                 //     document.body.classList.remove('dark');
                 // }
            })
            .catch(err => {
                console.error("Error fetching settings data:", err);
                setError(err.response?.data?.message || "Failed to load user data.");
                if (err.response?.status === 401) { localStorage.clear(); router.push('/'); }
            })
            .finally(() => setLoading(false));
    }, [router]);

     // --- Theme Handling ---
     const handleThemeChange = (selectedTheme) => {
         // Update userData state optimistically if theme is part of user data model
         if (userData) {
             setUserData(prev => ({...prev, themePreference: selectedTheme }));
         }
         if (selectedTheme === 'dark') {
             document.body.classList.add('dark');
             // Add localStorage persistence if desired
             // localStorage.setItem('theme', 'dark');
         } else {
             document.body.classList.remove('dark');
             // localStorage.setItem('theme', 'light');
         }
         // TODO: Add backend call here to save theme preference if needed
         // api.put('/users/profile', { themePreference: selectedTheme }, config)...
         // showSuccessPopup('Theme updated!'); // Maybe show success?
     };
      // Apply theme on initial load if stored locally (example)
      // useEffect(() => {
      //   const savedTheme = localStorage.getItem('theme');
      //   if (savedTheme) handleThemeChange(savedTheme);
      // }, []);

     // --- Profile Picture Simulation ---
     const handleProfilePicChange = (event) => {
         const file = event.target.files[0];
         if (file && file.type.startsWith('image/')) {
             const reader = new FileReader();
             reader.onload = (e) => {
                 setProfilePicPreview(e.target.result);
             };
             reader.readAsDataURL(file);
             // TODO: In a real app, upload file to backend here
             console.log("Profile picture selected:", file.name);
             showSuccessPopup("Profile picture updated (simulated).");
         } else {
             alert("Please select a valid image file.");
         }
     };
     const triggerFileSelect = () => fileInputRef.current?.click();


    // --- Success Popup Logic ---
    const showSuccessPopup = (message) => {
        setSuccessMessage(message || "Changes saved successfully!");
        setTimeout(() => setSuccessMessage(''), 3000); // Auto-hide after 3 seconds
    };


    // --- Render Specific Section ---
    const renderSectionContent = () => {
        if (loading) return <div className="p-5 text-center">Loading settings...</div>;
        if (error) return <div className="p-5 text-center text-red-500">Error: {error}</div>;
        if (!userData) return <div className="p-5 text-center">Could not load user data.</div>;

        switch (activeSection) {
            case 'profile':
                return <GeneralSettingsComponent
                            userData={userData}
                            setUserData={setUserData} // Pass setter to update state
                            initialData={initialData}
                            showSuccess={showSuccessPopup}
                            triggerFileSelect={triggerFileSelect}
                            profilePicPreview={profilePicPreview}
                            fileInputRef={fileInputRef}
                            handleProfilePicChange={handleProfilePicChange}
                            handleThemeChange={handleThemeChange} // Pass theme handler
                            setInitialData={setInitialData} // Pass setInitialData
                        />;
            case 'payment':
                 return <PaymentSettingsComponent showSuccess={showSuccessPopup} />; // Mostly simulated
            case 'security':
                 return <SecuritySettingsComponent showSuccess={showSuccessPopup} />; // Has change password
            case 'price-alerts': // New Case
                return <PriceAlertsComponent showSuccess={showSuccessPopup} />;
            case 'preferences':
                return <PreferencesComponent showSuccess={showSuccessPopup} />; // Simulated
            case 'account':
                 return <AccountSettingsComponent userData={userData} />; // Simulated actions
            case 'help':
                 return <HelpSectionComponent />;
            default:
                // Default to profile section if activeSection is unknown or initial state
                 return <GeneralSettingsComponent
                            userData={userData}
                            setUserData={setUserData}
                            initialData={initialData}
                            showSuccess={showSuccessPopup}
                            triggerFileSelect={triggerFileSelect}
                            profilePicPreview={profilePicPreview}
                            fileInputRef={fileInputRef}
                            handleProfilePicChange={handleProfilePicChange}
                            handleThemeChange={handleThemeChange}
                            setInitialData={setInitialData} // Pass setInitialData
                        />;
        }
    };

    return (
        <>
            <NavbarInternal />
             {/* Use module classes */}
            <section className={styles.settings}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <ul>
                        <li><button onClick={() => setActiveSection('profile')} className={`${styles.sidebarLink} ${activeSection === 'profile' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-user"></i> General Settings</button></li>
                        <li><button onClick={() => setActiveSection('payment')} className={`${styles.sidebarLink} ${activeSection === 'payment' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-credit-card"></i> Payment Settings</button></li>
                        <li><button onClick={() => setActiveSection('security')} className={`${styles.sidebarLink} ${activeSection === 'security' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-shield-alt"></i> Security Settings</button></li>
                        <li><button onClick={() => setActiveSection('price-alerts')} className={`${styles.sidebarLink} ${activeSection === 'price-alerts' ? styles.sidebarLinkActive : ''}`}><i className="fas fa-bell"></i> Price Alerts</button></li> {/* New Sidebar Item */}
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

             {/* Success Popup (Global for Settings) */}
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


// ==============================================
//        SUB-COMPONENTS FOR EACH SECTION
// ==============================================

// --- General Settings Component ---
// Added setInitialData prop
function GeneralSettingsComponent({ userData, setUserData, initialData, showSuccess, triggerFileSelect, profilePicPreview, fileInputRef, handleProfilePicChange, handleThemeChange, setInitialData }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setUserData({ ...userData, [e.target.id]: e.target.value });
    };

     const handleSave = async () => {
        setIsSubmitting(true); setError('');
        const token = localStorage.getItem('userToken');
        if (!token) { setError('Authentication error. Please log in again.'); setIsSubmitting(false); return; }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            // Prepare payload with fields the backend accepts for profile update
             // Current backend (based on old code comment) seems to accept: name, phone, address, city
             // Let's assume we might want to save others like languagePreference, themePreference if backend supports it
             const { name, phone, address, city, state, zipCode, country, languagePreference, themePreference } = userData;
             const payload = {
                name,
                phone,
                address,
                city,
                // Include other fields only if backend accepts them
                // state, zipCode, country, languagePreference, themePreference
            };

             const response = await axios.put(`${backendUrl}/api/users/profile`, payload, config);

             // Update both current state and initial state with the *potentially modified* data returned from backend
             // Or at least update initialData with the successfully saved current userData
             const updatedUserData = { ...userData, ...response.data }; // Merge backend response if it returns updated user
             setUserData(updatedUserData);
             setInitialData(updatedUserData); // Update initialData to reflect the saved state

             showSuccess("General settings saved successfully!");
        } catch (err) {
             setError(err.response?.data?.message || 'Failed to save settings.');
             console.error("Save Profile Error:", err);
        } finally {
             setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        if (initialData) {
            setUserData(initialData); // Reset to initially fetched data
            // Reset theme visually based on initial data
            handleThemeChange(initialData?.themePreference || 'white');
            // Reset profile pic preview (assuming initialData doesn't store preview URL reliably)
            setProfilePicPreview(initialData?.profilePictureUrl || '/default-profile-pic.png');
            setError('');
        }
    };


    // Check if userData exists before rendering form elements
    if (!userData) {
        return <div className="p-4 text-center">Loading user data...</div>;
    }

    return (
        <div id="profile" className={`${styles.tabContent} ${styles.active}`}> {/* Assuming these classes for structure */}
            <h2>General Settings</h2>
            <p className={styles.lastUpdated}>Last Updated: {userData.updatedAt ? formatDate(userData.updatedAt) : 'N/A'}</p>
             {error && <p className={`${styles.error} text-center mb-4`}>{error}</p>} {/* Added error class */}

             {/* Profile Picture */}
            <div className={styles.profilePic}>
                <Image src={profilePicPreview} alt="Profile Picture" id="profile-pic-preview" width={80} height={80} className="rounded-full object-cover border-2 border-gray-300" />
                 <button onClick={triggerFileSelect} className={styles.btnPrimary} type="button">Change Picture</button>
                 <input type="file" id="profile-pic-upload" accept="image/*" ref={fileInputRef} onChange={handleProfilePicChange} style={{ display: 'none' }} />
            </div>

            {/* Form Fields */}
            <div className={styles.formGroup}>
                <label htmlFor="name">Name</label>
                <input type="text" id="name" value={userData.name || ''} onChange={handleChange} required className={styles.inputField} />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input type="email" id="email" value={userData.email || ''} disabled className={`${styles.inputField} ${styles.disabledInput}`} /> {/* Added disabled styles */}
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="phone">Mobile Number</label>
                 <input type="tel" id="phone" name="phone" value={userData.phone || ''} onChange={handleChange} className={styles.inputField} placeholder="+94 XXX XXX XXX" />
                 <small>Format: +94 XXX XXX XXX (or local format)</small>
            </div>
             <div className={styles.formGroup}>
                <label htmlFor="address">Address</label>
                 <textarea id="address" name="address" value={userData.address || ''} onChange={handleChange} className={styles.inputField} rows="3"></textarea>
                 <small>Primary address (e.g., for coin delivery)</small>
             </div>
             {/* Add City, State, Zip, Country fields similarly if needed, binding to userData */}
              {/* Example:
             <div className={styles.formGroup}>
                <label htmlFor="city">City</label>
                <input type="text" id="city" value={userData.city || ''} onChange={handleChange} className={styles.inputField} />
             </div>
             */}

            <div className={styles.formGroup}>
                <label htmlFor="languagePreference">Language</label>
                 <select id="languagePreference" value={userData.languagePreference || 'en-us'} onChange={handleChange} name="languagePreference" className={`${styles.inputField} bg-white`}> {/* Assuming languagePreference field */}
                     <option value="en-us">English (United States)</option>
                     <option value="si-lk">Sinhala (Sri Lanka)</option>
                     <option value="ta-lk">Tamil (Sri Lanka)</option>
                     {/* Add other languages */}
                 </select>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="theme">Theme</label>
                {/* Controlled by document.body class but reflects optimistic userData state */}
                <select
                     id="theme"
                     value={userData?.themePreference || (document.body.classList.contains('dark') ? 'dark' : 'white')}
                     onChange={(e) => handleThemeChange(e.target.value)}
                     className={`${styles.inputField} bg-white`}
                >
                    <option value="white">White</option>
                    <option value="dark">Dark</option>
                </select>
            </div>

            <div className={styles.actionButtons}>
                <button className={`${styles.btnPrimary}`} onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button className={`${styles.btnSecondary}`} onClick={handleReset} disabled={isSubmitting}>Reset</button>
            </div>
        </div>
    );
}


// --- Payment Settings Component (Simulated) ---
function PaymentSettingsComponent({ showSuccess }) {
    const handleSave = () => showSuccess("Payment settings saved (Simulated).");
    const handleReset = () => alert("Resetting payment settings (Simulated).");

    return (
         <div id="payment" className={`${styles.tabContent} ${styles.active}`}>
             <h2>Payment Settings</h2>
              {/* Default payment method selection (UI only) */}
              <div className={styles.formGroup}>
                 <label htmlFor="default-payment">Default Purchase Method</label>
                 <select id="default-payment" className={`${styles.inputField} bg-white`}>
                     <option value="wallet-cash">Wallet Cash</option>
                     <option value="payhere">PayHere (Card/Bank)</option>
                     <option value="paypal">PayPal</option>
                 </select>
             </div>
              <div className={styles.formGroup}>
                 <label htmlFor="default-deposit">Default Sell Proceeds Method</label>
                  <select id="default-deposit" className={`${styles.inputField} bg-white`}>
                     <option value="wallet-cash">Wallet Cash</option>
                     {/* Add other withdrawal options if backend supports */}
                 </select>
              </div>
              {/* Add Auto Payments List Here (using PaymentSettings from previous step if desired) */}
              {/* <PaymentSettings initialAutoPayments={...} onUpdate={...} /> */}
              <p className="text-sm text-gray-500 my-4">Note: Default method selection is simulated.</p>
             <div className={styles.actionButtons}>
                 <button className={`${styles.btnPrimary}`} onClick={handleSave}>Save Changes</button>
                 <button className={`${styles.btnSecondary}`} onClick={handleReset}>Reset</button>
             </div>
         </div>
    );
}


// --- Security Settings Component ---
function SecuritySettingsComponent({ showSuccess }) {
    // State for password change
     const [currentPassword, setCurrentPassword] = useState('');
     const [newPassword, setNewPassword] = useState('');
     const [confirmPassword, setConfirmPassword] = useState('');
     const [pwdLoading, setPwdLoading] = useState(false);
     const [pwdError, setPwdError] = useState('');
     const [pwdSuccess, setPwdSuccess] = useState('');

      // State for simulated toggles
     const [twoFactorEnabled, setTwoFactorEnabled] = useState(false); // Default off
     const [biometricEnabled, setBiometricEnabled] = useState(false); // Default off


     const handleChangePassword = async (e) => {
         e.preventDefault();
         setPwdError(''); setPwdSuccess('');
         if (newPassword !== confirmPassword) { setPwdError('New passwords do not match.'); return; }
         if (newPassword.length < 8) { setPwdError('New password must be at least 8 characters long.'); return; }

         setPwdLoading(true);
         const token = localStorage.getItem('userToken');
         if (!token) { setPwdError('Authentication error. Please log in again.'); setPwdLoading(false); return; }
         const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
         const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

         try {
             await axios.put(`${backendUrl}/api/users/change-password`, { currentPassword, newPassword }, config);
             setPwdSuccess('Password changed successfully!');
             showSuccess('Password changed successfully!'); // Show global popup too
             setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); // Clear fields
             setTimeout(() => setPwdSuccess(''), 5000); // Clear local success message after 5s
         } catch (err) {
             setPwdError(err.response?.data?.message || 'Failed to change password.');
             console.error("Change Password Error:", err);
         } finally {
             setPwdLoading(false);
         }
     };

     // Resetting just the form fields, not toggles
     const handleResetPasswordFields = () => {
         setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
         setPwdError(''); setPwdSuccess('');
     };

     const handleToggle = (setter, currentVal, featureName) => {
         setter(!currentVal);
         alert(`${featureName} toggle is simulated for this demo.`);
         // TODO: In real app, call backend to enable/disable feature
     };


    return (
         <div id="security" className={`${styles.tabContent} ${styles.active}`}>
             <h2>Security Settings</h2>

             {/* Change Password Section */}
              <h3 className={styles.sectionSubheading}>Change Your Password</h3>
              {pwdError && <p className={`${styles.error} text-center mb-4`}>{pwdError}</p>}
              {pwdSuccess && <p className={`${styles.success} text-center mb-4`}>{pwdSuccess}</p>} {/* Add success class */}

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

             {/* Other Security Options Section */}
             <hr className={styles.divider} />
              <h3 className={styles.sectionSubheading}>Additional Security</h3>

             {/* Simulated Security Options */}
             <div className={`${styles.securityOptions} ${styles.formGroup}`}> {/* Reuse formGroup styling */}
                  <label className={styles.checkboxLabel}>
                     <input type="checkbox" id="two-factor" checked={twoFactorEnabled} onChange={() => handleToggle(setTwoFactorEnabled, twoFactorEnabled, 'Two-Factor Authentication')} />
                      Enable Two-Factor Authentication (Simulated)
                      {/* Add info icon if desired */}
                  </label>
                  <label className={styles.checkboxLabel}>
                     <input type="checkbox" id="biometric" checked={biometricEnabled} onChange={() => handleToggle(setBiometricEnabled, biometricEnabled, 'Biometric Login')} />
                      Enable Biometric Login (Simulated)
                  </label>
             </div>
             <p className="text-xs text-gray-500 mt-2">Note: 2FA and Biometric options are simulated.</p>

         </div>
    );
}

// --- Price Alerts Component ---
function PriceAlertsComponent({ showSuccess }) {
    const [alerts, setAlerts] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [errorAlerts, setErrorAlerts] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAlertData, setNewAlertData] = useState({ targetPriceLKRPerGram: '', condition: 'below' });
    const [savingAlert, setSavingAlert] = useState(false);
    const [togglingId, setTogglingId] = useState(null); // Track which alert is being toggled
    const [deletingId, setDeletingId] = useState(null); // Track which alert is being deleted

    // Fetch existing alerts
    useEffect(() => {
        setLoadingAlerts(true); setErrorAlerts('');
        const token = localStorage.getItem('userToken');
        // Added router for potential redirect on 401, although SettingsPage handles global redirect
        // const router = useRouter();
        if (!token) {
             setErrorAlerts("Authentication required. Please log in.");
             setLoadingAlerts(false);
            // router.push('/'); // Or rely on parent's check
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        axios.get(`${backendUrl}/api/users/price-alerts`, config)
            .then(response => setAlerts(response.data || []))
            .catch(err => {
                console.error("Error fetching price alerts:", err);
                setErrorAlerts(err.response?.data?.message || "Could not load price alerts.");
                if (err.response?.status === 401) {
                    // Optional: handle specific 401 here too if needed
                    localStorage.clear();
                    // router.push('/');
                 }
            })
            .finally(() => setLoadingAlerts(false));
    }, []); // Removed router from dependency array as it's not used directly here

    const handleAddAlert = async (e) => {
        e.preventDefault();
        if (!newAlertData.targetPriceLKRPerGram || isNaN(Number(newAlertData.targetPriceLKRPerGram)) || Number(newAlertData.targetPriceLKRPerGram) <= 0) {
            setErrorAlerts("Please enter a valid positive target price.");
            return;
        }
        setSavingAlert(true); setErrorAlerts('');
        const token = localStorage.getItem('userToken');
        if (!token) { setErrorAlerts('Authentication Error.'); setSavingAlert(false); return; }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        // Ensure price is sent as a number
        const payload = {
            ...newAlertData,
            targetPriceLKRPerGram: Number(newAlertData.targetPriceLKRPerGram)
        };

        try {
            const { data: addedAlert } = await axios.post(`${backendUrl}/api/users/price-alerts`, payload, config);
            setAlerts(prev => [...prev, addedAlert]); // Add to list
            setShowAddForm(false); // Hide form
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
         setDeletingId(id); // Indicate loading state for this specific alert
         setErrorAlerts('');
        const token = localStorage.getItem('userToken');
        if (!token) { setErrorAlerts('Authentication Error.'); setDeletingId(null); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

         try {
             await axios.delete(`${backendUrl}/api/users/price-alerts/${id}`, config);
             setAlerts(prev => prev.filter(alert => alert._id !== id)); // Remove from list
             showSuccess("Price alert deleted.");
         } catch (err) {
             setErrorAlerts(err.response?.data?.message || "Failed to delete alert.");
             console.error("Delete Price Alert Error:", err);
         } finally {
             setDeletingId(null);
         }
    };

     const handleToggleActive = async (id, currentStatus) => {
          setTogglingId(id); // Indicate loading state for this specific alert
          setErrorAlerts('');
          const token = localStorage.getItem('userToken');
          if (!token) { setErrorAlerts('Authentication Error.'); setTogglingId(null); return; }
          const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

          try {
               const { data: updatedAlert } = await axios.put(`${backendUrl}/api/users/price-alerts/${id}`, { isActive: !currentStatus }, config);
               setAlerts(prev => prev.map(a => a._id === id ? updatedAlert : a)); // Update list with new status
               showSuccess(`Alert ${updatedAlert.isActive ? 'activated' : 'paused'}.`);
          } catch (err) {
               setErrorAlerts(err.response?.data?.message || "Failed to toggle alert status.");
               console.error("Toggle Price Alert Error:", err);
          } finally {
             setTogglingId(null);
          }
     };


    return (
        <div id="price-alerts" className={`${styles.tabContent} ${styles.active}`}>
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-semibold m-0">Price Alerts</h2> {/* Added font-semibold */}
                <button onClick={() => { setShowAddForm(!showAddForm); setErrorAlerts(''); }} className={styles.btnSecondary}>
                    {showAddForm ? 'Cancel' : '+ Add New Alert'}
                </button>
            </div>
            {errorAlerts && <p className={`${styles.error} text-center mb-4`}>{errorAlerts}</p>}

            {/* Add New Alert Form (Conditional) */}
            {showAddForm && (
                <form onSubmit={handleAddAlert} className="mb-6 p-4 border rounded bg-gray-50 space-y-3">
                    <h4 className="text-md font-semibold">Create New Alert</h4>
                     <div className={styles.formGroup}>
                         <label htmlFor="condition">Alert Condition:</label>
                         <select id="condition" value={newAlertData.condition} onChange={(e) => setNewAlertData({...newAlertData, condition: e.target.value})} className={`${styles.inputField} bg-white`}>
                             <option value="below">Price Drops Below</option>
                             <option value="above">Price Rises Above</option>
                         </select>
                     </div>
                     <div className={styles.formGroup}>
                         <label htmlFor="targetPrice">Target Price (LKR per Gram):</label>
                         <input type="number" id="targetPrice" value={newAlertData.targetPriceLKRPerGram} onChange={(e) => setNewAlertData({...newAlertData, targetPriceLKRPerGram: e.target.value})} required min="1" step="any" className={styles.inputField} placeholder="e.g., 20000"/>
                     </div>
                     <button type="submit" className={styles.btnPrimary} disabled={savingAlert}>
                        {savingAlert ? 'Adding...' : 'Add Alert'}
                    </button>
                </form>
            )}

            {/* List Existing Alerts */}
            <h3 className={styles.sectionSubheading}>Your Alerts</h3>
            <div className="space-y-2">
                {loadingAlerts ? (
                    <p className="text-gray-500">Loading alerts...</p>
                ) : alerts.length > 0 ? (
                    alerts.map(alert => (
                        <div key={alert._id} className="flex justify-between items-center p-3 border rounded-md text-sm bg-white shadow-sm">
                            <div>
                                <span className={`font-medium ${!alert.isActive ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    Notify when price is <span className='font-bold'>{alert.condition}</span> {formatCurrency(alert.targetPriceLKRPerGram, 'LKR')}/g
                                </span>
                                 <p className="text-xs text-gray-500 mt-1">
                                     Status: {alert.isActive ? 'Active' : 'Paused'}
                                     {/* Optional: Add last triggered time if available from backend */}
                                     {/* {alert.lastTriggeredAt && ` | Last triggered: ${formatDate(alert.lastTriggeredAt)}`} */}
                                 </p>
                             </div>
                             <div className="flex items-center space-x-2 md:space-x-3">
                                 {/* Toggle Active Button */}
                                 <button
                                      onClick={() => handleToggleActive(alert._id, alert.isActive)}
                                      disabled={togglingId === alert._id || deletingId === alert._id}
                                      className={`text-xs font-medium px-2 py-1 rounded transition-colors duration-150 ${
                                          alert.isActive
                                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' // Pause button
                                            : 'bg-green-100 text-green-700 hover:bg-green-200' // Activate button
                                      } ${togglingId === alert._id ? 'opacity-50 cursor-wait' : ''}`} // Loading state
                                 >
                                      {togglingId === alert._id ? '...' : (alert.isActive ? 'Pause' : 'Activate')}
                                 </button>
                                 {/* Delete Button */}
                                 <button
                                     onClick={() => handleDeleteAlert(alert._id)}
                                     disabled={togglingId === alert._id || deletingId === alert._id}
                                     className={`text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded transition-colors duration-150 hover:bg-red-100 ${deletingId === alert._id ? 'opacity-50 cursor-wait' : ''}`} // Loading state
                                     title="Delete Alert"
                                >
                                     {deletingId === alert._id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                                     <span className="hidden sm:inline ml-1">{deletingId === alert._id ? '' : 'Delete'}</span> {/* Hide text on small screens */}
                                 </button>
                             </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center p-4 border rounded border-dashed">You haven't set any price alerts yet.</p>
                )}
            </div>
        </div>
    );
}


// --- Account Settings Component (Simulated) ---
function AccountSettingsComponent({ userData }) {
     const handleDeactivate = () => {
         if (window.confirm('Are you sure? Deactivating requires redeeming/selling all assets and may require contacting support to reactivate.')) {
             alert('Account deactivation initiated (Simulated). Please contact support for the next steps.');
             // TODO: Call backend endpoint if implemented e.g., POST /api/users/deactivate-request
         }
     };
     const handleLogout = () => {
          if (window.confirm('Are you sure you want to logout?')) {
             localStorage.removeItem('userToken'); // More specific than clear()
             localStorage.removeItem('userName'); // Clear other relevant session info
             // Optionally clear other local storage items specific to the app
             window.location.href = '/'; // Redirect to home/login
         }
     };

    // Check if userData exists before rendering
    if (!userData) {
        return <div className="p-4 text-center">Loading account data...</div>;
    }

    return (
         <div id="account" className={`${styles.tabContent} ${styles.active}`}>
             <h2>Account</h2>
             <div className={styles.formGroup}>
                 <label>Account Status</label>
                 {/* Add logic here if backend provides different statuses */}
                 <p className="font-medium text-green-600">Active</p>
             </div>
             <div className={styles.formGroup}>
                  <label>Account Created</label>
                  <p>{userData?.createdAt ? formatDate(userData.createdAt) : 'N/A'}</p>
             </div>
              <hr className={styles.divider} />
             <div className={styles.actionButtons}>
                 <button className={styles.btnSecondary} onClick={handleLogout}>Logout</button>
                 <button className={styles.btnDanger} onClick={handleDeactivate}>Deactivate Account</button>
             </div>
              <p className="text-xs text-gray-500 mt-4">Note: Account deactivation is simulated and requires contacting support.</p>
         </div>
    );
}

// --- Help Section Component ---
function HelpSectionComponent() {
    return (
         <div id="help" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Help & Support</h2>
            <p className="text-sm text-gray-600 mb-4">Find answers to common questions or get in touch with our support team.</p>
             <div className={styles.helpLinks}>
                 {/* Replace # with actual links */}
                 <a href="/faq" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-question-circle mr-2"></i> FAQs </a>
                 <a href="/contact-us" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-headset mr-2"></i> Contact Support </a>
                 <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-file-contract mr-2"></i> Terms of Service </a>
                 <a href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-user-shield mr-2"></i> Privacy Policy </a>
                 {/* Add more links as needed */}
             </div>
         </div>
    );
}

// --- Preferences Component (Simulated) ---
function PreferencesComponent({ showSuccess }) {
     const handleSave = () => showSuccess("Preferences saved (Simulated).");
     const handleReset = () => alert("Resetting preferences (Simulated).");

    return (
         <div id="preferences" className={`${styles.tabContent} ${styles.active}`}>
             <h2>Preferences</h2>
              <p className="text-xs text-gray-500 mb-4">Note: All preference settings below are currently simulated for demonstration purposes.</p>

              <div className={`${styles.preferencesGroup} ${styles.formGroup}`}>
                 <h4 className={styles.sectionSubheading}>Notifications</h4>
                 <label className={styles.checkboxLabel}><input type="checkbox" id="email-notifications" defaultChecked/> Email Notifications</label>
                 <label className={`${styles.checkboxLabel} ${styles.disabledLabel}`}><input type="checkbox" id="sms-notifications" disabled /> SMS Notifications (Coming Soon)</label> {/* Example disabled */}
                 <label className={styles.checkboxLabel}><input type="checkbox" id="push-notifications" defaultChecked/> Push Notifications</label>
             </div>

             <hr className={styles.divider} />

              <div className={`${styles.preferencesGroup} ${styles.formGroup}`}>
                 <h4 className={styles.sectionSubheading}>Display</h4>
                 <label htmlFor="currency">Preferred Currency Display</label>
                  <select id="currency" className={`${styles.inputField} bg-white`}>
                     <option value="LKR">LKR (Sri Lankan Rupee)</option>
                     <option value="USD">USD (US Dollar)</option>
                     <option value="EUR" disabled>EUR (Euro - Coming Soon)</option>
                 </select>
             </div>

             <hr className={styles.divider} />

             <div className={styles.actionButtons}>
                 <button className={styles.btnPrimary} onClick={handleSave}>Save Changes</button>
                 <button className={styles.btnSecondary} onClick={handleReset}>Reset Preferences</button>
             </div>
         </div>
    );
}