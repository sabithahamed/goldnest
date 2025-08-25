// frontend/src/app/settings/page.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import Image from 'next/image';
import styles from './SettingsPage.module.css';
import { useModal } from '@/contexts/ModalContext';

// --- Helper Functions ---
const formatCurrency = (value, currency = 'LKR', locale = 'si-LK') => {
    const number = Number(value);
    if (isNaN(number)) return value;
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
    } catch (error) {
        console.warn("Currency formatting error:", error);
        return `${currency} ${number.toFixed(2)}`;
    }
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        console.warn("Date formatting error:", error);
        return dateString;
    }
};

// --- Main Settings Page Component ---
export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');
    const [userData, setUserData] = useState(null);
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    const fileInputRef = useRef(null);
    const [profilePicPreview, setProfilePicPreview] = useState('/default-profile-pic.png');

    useEffect(() => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('userToken');
        if (!token) { router.push('/'); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        axios.get(`${backendUrl}/api/users/me`, config)
            .then(response => {
                const fetchedData = response.data;
                setUserData(fetchedData);
                setInitialData(fetchedData);
                setProfilePicPreview(fetchedData.profilePictureUrl || '/default-profile-pic.png');
            })
            .catch(err => {
                console.error("Error fetching settings data:", err);
                setError(err.response?.data?.message || "Failed to load user data.");
                if (err.response?.status === 401) { localStorage.clear(); router.push('/'); }
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleThemeChange = (selectedTheme) => {
        if (userData) {
            setUserData(prev => ({ ...prev, themePreference: selectedTheme }));
        }
        if (selectedTheme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    };

    const handleProfilePicChange = (event) => {
        // This function would contain the upload logic. For now, it's simulated.
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setProfilePicPreview(e.target.result);
            reader.readAsDataURL(file);
            // In a real app, you would call an upload API here and then update the user data.
        }
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    const renderSectionContent = () => {
        if (loading) return <div className="p-5 text-center">Loading settings...</div>;
        if (error) return <div className="p-5 text-center text-red-500">Error: {error}</div>;
        if (!userData) return <div className="p-5 text-center">Could not load user data.</div>;

        switch (activeSection) {
            case 'profile':
                return <GeneralSettingsComponent
                    userData={userData}
                    setUserData={setUserData}
                    initialData={initialData}
                    triggerFileSelect={triggerFileSelect}
                    profilePicPreview={profilePicPreview}
                    fileInputRef={fileInputRef}
                    handleProfilePicChange={handleProfilePicChange}
                    handleThemeChange={handleThemeChange}
                    setInitialData={setInitialData}
                />;
            case 'payment':
                // Pass activeSection to trigger data loading inside the component
                return <PaymentSettingsComponent activeSection={activeSection} />;
            case 'security':
                return <SecuritySettingsComponent />;
            case 'price-alerts':
                return <PriceAlertsComponent />;
            case 'preferences':
                return <PreferencesComponent />;
            case 'account':
                return <AccountSettingsComponent userData={userData} />;
            case 'help':
                return <HelpSectionComponent />;
            default:
                return <GeneralSettingsComponent
                    userData={userData}
                    setUserData={setUserData}
                    initialData={initialData}
                    triggerFileSelect={triggerFileSelect}
                    profilePicPreview={profilePicPreview}
                    fileInputRef={fileInputRef}
                    handleProfilePicChange={handleProfilePicChange}
                    handleThemeChange={handleThemeChange}
                    setInitialData={setInitialData}
                />;
        }
    };

    return (
        <>
            <NavbarInternal />
            <section className={styles.settings}>
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
                <div className={styles.settingsContent}>
                    {renderSectionContent()}
                </div>
            </section>
            <FooterInternal />
        </>
    );
}

// --- General Settings Component ---
function GeneralSettingsComponent({ userData, setUserData, initialData, triggerFileSelect, profilePicPreview, fileInputRef, handleProfilePicChange, handleThemeChange, setInitialData }) {
    const { openGenericModal } = useModal();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setUserData({ ...userData, [e.target.id]: e.target.value });

    const handleSave = async () => {
        setIsSubmitting(true);
        setError('');
        const token = localStorage.getItem('userToken');
        if (!token) { setError('Authentication error. Please log in again.'); setIsSubmitting(false); return; }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            const { name, phone, address, city } = userData;
            const payload = { name, phone, address, city };
            const response = await axios.put(`${backendUrl}/api/users/profile`, payload, config);
            const updatedUserData = { ...userData, ...response.data };
            setUserData(updatedUserData);
            setInitialData(updatedUserData);
            openGenericModal("Success", "General settings saved successfully!", "success");
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save settings.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        if (initialData) {
            setUserData(initialData);
            handleThemeChange(initialData?.themePreference || 'white');
            setError('');
        }
    };

    if (!userData) return <div className="p-4 text-center">Loading user data...</div>;

    return (
        <div id="profile" className={`${styles.tabContent} ${styles.active}`}>
            <h2>General Settings</h2>
            <p className={styles.lastUpdated}>Last Updated: {userData.updatedAt ? formatDate(userData.updatedAt) : 'N/A'}</p>
            {error && <p className={`${styles.error} text-center mb-4`}>{error}</p>}
            <div className={styles.profilePic}>
                <Image src={profilePicPreview} alt="Profile Picture" width={80} height={80} className="rounded-full object-cover border-2 border-gray-300" />
                <button onClick={triggerFileSelect} className={styles.btnPrimary} type="button">Change Picture</button>
                <input type="file" id="profile-pic-upload" accept="image/*" ref={fileInputRef} onChange={handleProfilePicChange} style={{ display: 'none' }} />
            </div>
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
                    <option value="si-lk" disabled>Sinhala (coming soon)</option>
                    <option value="ta-lk" disabled>Tamil (coming soon)</option>
                </select>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="theme">Theme</label>
                <select id="theme" value={userData?.themePreference || 'white'} onChange={(e) => handleThemeChange(e.target.value)} className={`${styles.inputField} bg-white`}>
                    <option value="white" defaultChecked>White</option>
                    <option value="dark" disabled >Dark(coming soon)</option>
                </select>
            </div>
            <div className={styles.actionButtons}>
                <button className={`${styles.btnPrimary}`} onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

// --- CORRECTED Payment Settings Component ---
function PaymentSettingsComponent({ activeSection }) {
    const { openGenericModal, openConfirmModal } = useModal();
    
    const [autoInvestPlans, setAutoInvestPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false); // Start as false
    const [errorPlans, setErrorPlans] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPlanData, setNewPlanData] = useState({
        amountLKR: '', frequency: 'daily', date: '', paymentMethod: 'wallet-cash',
    });
    
    const [savingPlan, setSavingPlan] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const AUTOPAY_API_URL = '/api/users/autopayments';
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

    // Fetch data only when this component's section is active
    useEffect(() => {
        const fetchPlans = () => {
            setLoadingPlans(true);
            setErrorPlans('');
            const token = localStorage.getItem('userToken');
            if (!token) {
                setErrorPlans("Authentication required.");
                setLoadingPlans(false);
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };

            axios.get(`${backendUrl}${AUTOPAY_API_URL}`, config)
                .then(response => {
                    setAutoInvestPlans(response.data || []);
                })
                .catch(err => {
                    console.error("Error fetching auto-invest plans:", err);
                    setErrorPlans(err.response?.data?.message || "Could not load auto-invest plans.");
                })
                .finally(() => {
                    setLoadingPlans(false);
                });
        };

        if (activeSection === 'payment') {
            fetchPlans();
        }
    }, [activeSection]);

    const handleAddPlan = async (e) => {
        e.preventDefault();
        const amount = Number(newPlanData.amountLKR);
        if (!amount || amount < 100) { setErrorPlans("Minimum amount is Rs. 100."); return; }
        if (newPlanData.frequency === 'monthly' && !newPlanData.date) { setErrorPlans("Please select a day for monthly plans."); return; }

        setSavingPlan(true);
        setErrorPlans('');
        const token = localStorage.getItem('userToken');
        if (!token) { setErrorPlans('Authentication Error.'); setSavingPlan(false); return; }
        
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        
        try {
            const payload = {
                amountLKR: amount,
                frequency: newPlanData.frequency,
                dayOfMonth: newPlanData.frequency === 'monthly' ? Number(newPlanData.date) : undefined,
                paymentMethod: newPlanData.paymentMethod,
            };

            const { data: addedPlan } = await axios.post(`${backendUrl}${AUTOPAY_API_URL}`, payload, config);
            
            setAutoInvestPlans(prev => [...prev, addedPlan]);

            setShowAddForm(false);
            setNewPlanData({ amountLKR: '', frequency: 'daily', date: '', paymentMethod: 'wallet-cash' });
            openGenericModal("Success", "Auto-Invest plan added successfully!", "success");
        } catch (err) {
            setErrorPlans(err.response?.data?.message || "Failed to add plan.");
        } finally {
            setSavingPlan(false);
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        setTogglingId(id);
        setErrorPlans('');
        const token = localStorage.getItem('userToken');
        if (!token) { setErrorPlans('Authentication Error.'); setTogglingId(null); return; }
        const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };

        try {
            const { data: updatedPlan } = await axios.put(`${backendUrl}${AUTOPAY_API_URL}/${id}`, { isActive: !currentStatus }, config);

            setAutoInvestPlans(prev => prev.map(plan => 
                plan._id === id ? updatedPlan : plan
            ));

            openGenericModal("Success", `Auto-Invest plan ${updatedPlan.isActive ? 'activated' : 'paused'}.`, "success");
        } catch (err) {
            setErrorPlans(err.response?.data?.message || "Failed to toggle status.");
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeletePlan = (id) => {
        openConfirmModal('Confirm Deletion', 'Are you sure you want to delete this plan?', async () => {
            setDeletingId(id);
            setErrorPlans('');
            const token = localStorage.getItem('userToken');
            if (!token) { setErrorPlans('Authentication Error.'); setDeletingId(null); return; }
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                await axios.delete(`${backendUrl}${AUTOPAY_API_URL}/${id}`, config);
                setAutoInvestPlans(prev => prev.filter(plan => plan._id !== id));
                openGenericModal("Success", "Auto-Invest plan deleted.", "success");
            } catch (err) {
                setErrorPlans(err.response?.data?.message || "Failed to delete plan.");
            } finally {
                setDeletingId(null);
            }
        });
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
                    <option value="payhere">PayHere (Card/Bank)</option>
                    <option value="paypal">PayPal</option>
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
                                type="number" id="auto-invest-amount"
                                value={newPlanData.amountLKR}
                                onChange={(e) => setNewPlanData({ ...newPlanData, amountLKR: e.target.value })}
                                min="100" step="100" required className={styles.inputField} placeholder="Min Rs. 100"
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
                        {newPlanData.frequency === 'monthly' && (
                            <div className={styles.formGroup}>
                                <label htmlFor="auto-invest-date">Day of Month</label>
                                <select
                                    id="auto-invest-date" value={newPlanData.date}
                                    onChange={(e) => setNewPlanData({ ...newPlanData, date: e.target.value })}
                                    className={`${styles.inputField} bg-white`} required
                                >
                                    <option value="">Select Day (1-28)</option>
                                    {[...Array(28)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className={styles.formGroup}>
                            <label htmlFor="auto-invest-payment">Payment Method</label>
                            <select
                                id="auto-invest-payment" value={newPlanData.paymentMethod}
                                onChange={(e) => setNewPlanData({ ...newPlanData, paymentMethod: e.target.value })}
                                className={`${styles.inputField} bg-white`}
                            >
                                <option value="wallet-cash">Wallet Cash</option>
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
                        <p className="text-gray-500">Loading plans...</p>
                    ) : autoInvestPlans.length > 0 ? (
                        autoInvestPlans.map(plan => (
                            <div key={plan._id} className={styles.autoInvestItem}>
                                <div>
                                    <p className={!plan.isActive ? styles.inactive : ''}>
                                        {formatCurrency(plan.amountLKR)} {plan.frequency}
                                        {plan.frequency === 'monthly' && plan.dayOfMonth ? ` on day ${plan.dayOfMonth}` : ''}
                                    </p>
                                    <p className={`text-xs text-gray-500 ${!plan.isActive ? styles.inactive : ''}`}>
                                        Payment: {plan.paymentMethod === 'wallet-cash' ? 'Wallet Cash' : 'N/A'} | Status: {plan.isActive ? 'Active' : 'Paused'}
                                    </p>
                                </div>
                                <div className={styles.autoInvestActions}>
                                    <button
                                        onClick={() => handleToggleActive(plan._id, plan.isActive)}
                                        disabled={togglingId === plan._id || deletingId === plan._id}
                                        className={`${styles.btnSecondary} ${plan.isActive ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} ${togglingId === plan._id ? 'opacity-50 cursor-wait' : ''}`}
                                    >
                                        {togglingId === plan._id ? '...' : (plan.isActive ? 'Pause' : 'Activate')}
                                    </button>
                                    <button
                                        onClick={() => handleDeletePlan(plan._id)}
                                        disabled={togglingId === plan._id || deletingId === plan._id}
                                        className={`${styles.btnDanger} ${deletingId === plan._id ? 'opacity-50 cursor-wait' : ''}`}
                                        title="Delete Plan"
                                    >
                                        {deletingId === plan._id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                                        <span className="hidden sm:inline ml-1">{deletingId === plan._id ? '' : 'Delete'}</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center p-4 border rounded border-dashed">You haven't set any auto-invest plans yet.</p>
                    )}
                </div>
            </div>
            <p className="text-sm text-gray-500 my-4">Note: Default method selection is simulated.</p>
            <div className={styles.actionButtons}>
                <button className={`${styles.btnPrimary}`} onClick={() => openGenericModal("Info", "Payment settings saved (Simulated).", "info")}>Save Changes</button>
                <button className={`${styles.btnSecondary}`} onClick={() => openGenericModal("Info", "Resetting payment settings (Simulated).", "info")}>Reset</button>
            </div>
        </div>
    );
}

// --- Security, Price Alerts, Account, Help, and Preferences components remain unchanged ---
function SecuritySettingsComponent() {
    const { openGenericModal } = useModal(); // Use hook directly
    // ... all other states from the original component
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdError('');
        setPwdSuccess('');
        if (newPassword !== confirmPassword) {
            setPwdError('New passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
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
            await axios.put(`${backendUrl}/api/users/change-password`, { currentPassword, newPassword }, config);
            setPwdSuccess('Password changed successfully!');
            openGenericModal("Success", "Password changed successfully!", "success"); // UPDATED
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPwdSuccess(''), 5000);
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

    const handleToggle = (setter, currentVal, featureName) => {
        setter(!currentVal);
        // REPLACED window.alert with generic modal
        openGenericModal("Info", `${featureName} toggle is simulated for this demo.`, "info");
    };

    return (
        // JSX for SecuritySettingsComponent remains largely the same...
        <div id="security" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Security Settings</h2>
            <h3 className={styles.sectionSubheading}>Change Your Password</h3>
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
                    <input type="checkbox" id="two-factor" checked={twoFactorEnabled} onChange={() => handleToggle(setTwoFactorEnabled, twoFactorEnabled, 'Two-Factor Authentication')} />
                    Enable Two-Factor Authentication (Simulated)
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
function PriceAlertsComponent() {
    const { openGenericModal, openConfirmModal } = useModal(); // ADD openConfirmModal
    const [alerts, setAlerts] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [errorAlerts, setErrorAlerts] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAlertData, setNewAlertData] = useState({ targetPriceLKRPerGram: '', condition: 'below' });
    const [savingAlert, setSavingAlert] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

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
            setNewAlertData({ targetPriceLKRPerGram: '', condition: 'below' });
            openGenericModal("Success", "Price alert added successfully!", "success");
        } catch (err) {
            setErrorAlerts(err.response?.data?.message || "Failed to add alert.");
            console.error("Add Price Alert Error:", err);
        } finally {
            setSavingAlert(false);
        }
    };

    const handleDeleteAlert = (id) => {
        // CORRECTED: Use openConfirmModal
        openConfirmModal(
            'Confirm Deletion',
            'Are you sure you want to delete this price alert?',
            async () => {
                setDeletingId(id);
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
                    setAlerts(prev => prev.filter(alert => alert._id !== id));
                    openGenericModal("Success", "Price alert deleted.", "success");
                } catch (err) {
                    setErrorAlerts(err.response?.data?.message || "Failed to delete alert.");
                    console.error("Delete Price Alert Error:", err);
                } finally {
                    setDeletingId(null);
                }
            }
        );
    };

    const handleToggleActive = async (id, currentStatus) => {
        setTogglingId(id);
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
            const { data: updatedAlert } = await axios.put(`${backendUrl}/api/users/price-alerts/${id}`, { isActive: !currentStatus }, config);
            setAlerts(prev => prev.map(a => a._id === id ? updatedAlert : a));
            openGenericModal("Success", `Alert ${updatedAlert.isActive ? 'activated' : 'paused'}.`, "success");
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
                <h2 className="text-xl font-semibold m-0">Price Alerts</h2>
                <button onClick={() => { setShowAddForm(!showAddForm); setErrorAlerts(''); }} className={styles.btnSecondary}>
                    {showAddForm ? 'Cancel' : '+ Add New Alert'}
                </button>
            </div>
            {errorAlerts && <p className={`${styles.error} text-center mb-4`}>{errorAlerts}</p>}
            {showAddForm && (
                <form onSubmit={handleAddAlert} className="mb-6 p-4 border rounded bg-gray-50 space-y-3">
                    <h4 className="text-md font-semibold">Create New Alert</h4>
                    <div className={styles.formGroup}>
                        <label htmlFor="condition">Alert Condition:</label>
                        <select id="condition" value={newAlertData.condition} onChange={(e) => setNewAlertData({ ...newAlertData, condition: e.target.value })} className={`${styles.inputField} bg-white`}>
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
            <h3 className={styles.sectionSubheading}>Your Alerts</h3>
            <ul className={styles.alertsList}>
                {loadingAlerts ? (
                    <li className="text-gray-500">Loading alerts...</li>
                ) : alerts.length > 0 ? (
                    alerts.map(alert => (
                        <li key={alert._id}>
                            <div>
                                <p className={`font-medium ${!alert.isActive ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    Notify when price is <span className="font-bold">{alert.condition}</span> {formatCurrency(alert.targetPriceLKRPerGram, 'LKR')}/g
                                </p>
                                <p className="text-gray-500 text-xs mt-1">Status: {alert.isActive ? 'Active' : 'Paused'}</p>
                            </div>
                            <div className={styles.actionButtons}>
                                <button 
                                    onClick={() => handleToggleActive(alert._id, alert.isActive)}
                                    disabled={togglingId === alert._id || deletingId === alert._id}
                                    className={`${styles.btnSecondary} ${
                                        alert.isActive
                                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    } ${togglingId === alert._id ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {togglingId === alert._id ? '...' : (alert.isActive ? 'Pause' : 'Activate')}
                                </button>
                                <button
                                    onClick={() => handleDeleteAlert(alert._id)}
                                    disabled={togglingId === alert._id || deletingId === alert._id}
                                    className={`${styles.btnDanger} ${deletingId === alert._id ? 'opacity-50 cursor-wait' : ''}`}
                                    title="Delete Alert"
                                >
                                    {deletingId === alert._id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                                    <span className="hidden sm:inline ml-1">{deletingId === alert._id ? '' : 'Delete'}</span>
                                </button>
                            </div>
                        </li>
                    ))
                ) : (
                    <li className="text-gray-500 text-center p-4 border rounded border-dashed">You haven't set any price alerts yet.</li>
                )}
            </ul>
        </div>
    );
}

// --- Account Settings Component ---
function AccountSettingsComponent({ userData }) {
    const { openGenericModal, openConfirmModal } = useModal();

    const handleDeactivate = () => {
        openConfirmModal(
            'Confirm Deactivation',
            'Are you sure? This may require contacting support to reactivate.',
            () => {
                openGenericModal("Deactivation Initiated", "Account deactivation initiated (Simulated). Please contact support.", "info");
            }
        );
    };

    const handleLogout = () => {
        openConfirmModal(
            'Confirm Logout',
            'Are you sure you want to log out?',
            () => {
                localStorage.removeItem('userToken');
                localStorage.removeItem('userName');
                window.location.href = '/';
            }
        );
    };
    
    if (!userData) {
        return <div className="p-4 text-center">Loading account data...</div>;
    }

    return (
        <div id="account" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Account</h2>
            <div className={styles.formGroup}>
                <label>Account Status</label>
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
                <a href="/#faq" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-question-circle mr-2"></i> FAQs </a>
                <a href="mailto:info.goldnest@gmail.com" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-headset mr-2"></i> Contact Support </a>
                <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-file-contract mr-2"></i> Terms of Service </a>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.helpLinkItem}> <i className="fas fa-user-shield mr-2"></i> Privacy Policy </a>
            </div>
        </div>
    );
}

// --- Preferences Component ---
function PreferencesComponent() {
    const { openGenericModal } = useModal();

    const handleSave = () => openGenericModal("Success", "Preferences saved (Simulated).", "success");
    const handleReset = () => openGenericModal("Info", "Resetting preferences (Simulated).", "info");

    return (
        <div id="preferences" className={`${styles.tabContent} ${styles.active}`}>
            <h2>Preferences</h2>
            <p className="text-xs text-gray-500 mb-4">Note: All preference settings below are currently simulated for demonstration purposes.</p>
            <div className={`${styles.preferencesGroup} ${styles.formGroup}`}>
                <h4 className={styles.sectionSubheading}>Notifications</h4>
                <label className={styles.checkboxLabel}><input type="checkbox" id="email-notifications" defaultChecked /> Email Notifications</label>
                <label className={`${styles.checkboxLabel} ${styles.disabledLabel}`}><input type="checkbox" id="sms-notifications" disabled /> SMS Notifications (Coming Soon)</label>
                <label className={styles.checkboxLabel}><input type="checkbox" id="push-notifications" defaultChecked /> Push Notifications</label>
            </div>
            <hr className={styles.divider} />
            <div className={`${styles.preferencesGroup} ${styles.formGroup}`}>
                <h4 className={styles.sectionSubheading}>Display</h4>
                <label htmlFor="currency">Preferred Currency Display</label>
                <select id="currency" className={`${styles.inputField} bg-white`}>
                    <option value="LKR">LKR (Sri Lankan Rupee)</option>
                    <option value="" disabled>--- Coming Soon ---</option>
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