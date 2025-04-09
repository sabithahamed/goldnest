// src/components/NavbarInternal.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios'; // Import axios

// Assuming logo is in /public
const logoSrc = "/GoldNest.png";

// Helper function to format dates (can be moved to a utils file)
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        // Example: Use relative time if possible, fallback to simple date/time
        const date = new Date(dateString);
        const now = new Date();
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        const diffMinutes = Math.round(diffSeconds / 60);
        const diffHours = Math.round(diffMinutes / 60);
        const diffDays = Math.round(diffHours / 24);

        if (diffSeconds < 60) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        // Fallback for older dates
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return ''; // Return empty string if date is invalid
    }
};


export default function NavbarInternal() {
    const [isNavOpen, setIsNavOpen] = useState(false); // For mobile hamburger menu
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [userName, setUserName] = useState('User');
    const [userEmail, setUserEmail] = useState('');
    const pathname = usePathname();
    const router = useRouter();

    // --- New State for Notifications ---
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    // --- End New State ---

    // Refs for dropdowns and buttons
    const profileDropdownRef = useRef(null);
    const profileButtonRef = useRef(null);
    const notificationDropdownRef = useRef(null);
    const notificationButtonRef = useRef(null);
    const navLinksRef = useRef(null);
    const hamburgerRef = useRef(null);

    // Effect for fetching user info and initial unread count
    useEffect(() => {
        const token = localStorage.getItem('userToken');
        const storedUserInfo = localStorage.getItem('userInfo');

        // Set user info from localStorage
        if (storedUserInfo) {
            try {
                const info = JSON.parse(storedUserInfo);
                setUserName(info.name || 'User');
                setUserEmail(info.email || '');
            } catch (e) {
                console.error("Failed to parse user info from localStorage:", e);
            }
        }

        // Fetch initial unread count if logged in
        if (token) {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            // Use count=true or similar more efficient endpoint if available, otherwise fetch 1
            axios.get(`${backendUrl}/api/notifications?limit=1&unread=true`, config)
                .then(response => {
                    // Assuming the API returns an object like { unreadCount: 5 }
                    setUnreadCount(response.data?.unreadCount || 0);
                })
                .catch(err => console.error("Error fetching initial unread count:", err.response?.data?.message || err.message));
        }
        // Intentionally empty dependency array to run only once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect for handling clicks outside dropdowns/mobile nav
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close Profile Dropdown
            if (
                isProfileOpen &&
                profileButtonRef.current && !profileButtonRef.current.contains(event.target) &&
                profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)
            ) {
                setIsProfileOpen(false);
            }

            // Close Notifications Dropdown
            if (
                isNotificationsOpen &&
                notificationButtonRef.current && !notificationButtonRef.current.contains(event.target) &&
                notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)
            ) {
                setIsNotificationsOpen(false);
            }

            // Close Hamburger menu
            if (
                isNavOpen &&
                hamburgerRef.current && !hamburgerRef.current.contains(event.target) &&
                navLinksRef.current && !navLinksRef.current.contains(event.target)
            ) {
                 setIsNavOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNavOpen, isProfileOpen, isNotificationsOpen]); // Dependencies ensure correct state checking

    // --- Fetch Recent Notifications when Dropdown Opens ---
    const fetchRecentNotifications = async () => {
        // Avoid fetching if already loading, not logged in, or dropdown isn't open
        const token = localStorage.getItem('userToken');
        if (loadingNotifications || !token || !isNotificationsOpen) return;
        // Optional: Avoid refetch if already have data (uncomment if desired)
        // if (recentNotifications.length > 0) return;

        setLoadingNotifications(true);
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
             // Fetch last 5 notifications (or adjust limit as needed)
             const { data } = await axios.get(`${backendUrl}/api/notifications?limit=5&sort=-createdAt`, config);
             setRecentNotifications(data.notifications || []);
             // Update unread count from this response as well, ensuring consistency
             setUnreadCount(data.unreadCount || 0);
        } catch (err) {
             console.error("Error fetching recent notifications:", err.response?.data?.message || err.message);
             // Optionally show an error message to the user in the dropdown
             setRecentNotifications([]); // Clear potentially stale data on error
        } finally {
             setLoadingNotifications(false);
        }
    };

    // Trigger fetch when notification dropdown state changes to open
    useEffect(() => {
        if (isNotificationsOpen) {
             fetchRecentNotifications();
        } else {
             // Optional: Clear recent notifications when closing to force refresh on reopen
             // setRecentNotifications([]);
        }
        // Dependency array ensures this runs when isNotificationsOpen changes
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNotificationsOpen]);


    // --- Mark as Read Logic ---
    const handleMarkAllRead = async () => {
         const token = localStorage.getItem('userToken');
         if (!token || unreadCount === 0) return; // Don't run if no token or nothing to mark

         const config = { headers: { Authorization: `Bearer ${token}` } };
         const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
         try {
             // Make the API call to mark all as read
             await axios.put(`${backendUrl}/api/notifications/read-all`, {}, config);

             // Update state locally immediately for better UX
             setRecentNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
             setUnreadCount(0);
             // Maybe keep the dropdown open briefly or close it? Closing seems reasonable.
             // setIsNotificationsOpen(false); // Let user close it manually or click elsewhere
         } catch (err) {
             console.error("Error marking all read:", err.response?.data?.message || err.message);
             // Provide user feedback (e.g., using a toast notification library)
             alert("Failed to mark notifications as read. Please try again.");
         }
    };

    // --- Toggles and Handlers (mostly unchanged) ---

    const toggleMobileNav = () => {
        setIsNavOpen(prev => !prev);
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
    };

    const toggleProfile = () => {
        setIsProfileOpen(prev => !prev);
        if (!isProfileOpen) { // If opening profile, close notifications
            setIsNotificationsOpen(false);
        }
    };

    const toggleNotifications = () => {
        setIsNotificationsOpen(prev => !prev);
         if (!isNotificationsOpen) { // If opening notifications, close profile
             setIsProfileOpen(false);
         }
         // Note: Fetching logic is now handled by the useEffect watching isNotificationsOpen
    };

    const handleNavLinkClick = () => {
         if (isNavOpen) {
             setIsNavOpen(false);
         }
     };

    const handleProfileActionClick = () => {
         setIsProfileOpen(false);
         handleNavLinkClick();
     };

    // Modified to potentially handle single notification read later
    const handleNotificationActionClick = (notification = null) => {
        // TODO: Implement mark single notification as read API call if needed
        // if (notification && !notification.isRead) {
        //    markOneAsRead(notification._id); // Hypothetical function
        // }

        // If the notification has a link and it's not just '#', navigate
        if (notification?.link && notification.link !== '#') {
             router.push(notification.link); // Navigate using Next Router
        }

        // Always close dropdown and mobile nav
        setIsNotificationsOpen(false);
        handleNavLinkClick(); // Closes mobile nav if open
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userToken');
        setUserName('User'); // Reset state
        setUserEmail('');
        setUnreadCount(0); // Reset notifications
        setRecentNotifications([]);
        setIsProfileOpen(false); // Close dropdowns
        setIsNotificationsOpen(false);
        if (isNavOpen) setIsNavOpen(false); // Close mobile nav
        router.push('/'); // Redirect to home/login page
    };

    const isActive = (path) => pathname === path;

    // --- JSX Structure ---
    return (
        <nav className="navbar">
            {/* Logo */}
            <div className="logo">
                <Link href="/dashboard" onClick={handleNavLinkClick}>
                     <Image src={logoSrc} alt="GoldNest Logo" width={120} height={35} priority />
                 </Link>
            </div>

            {/* Hamburger Button */}
            <button
                ref={hamburgerRef}
                className="hamburger"
                aria-label="Toggle navigation menu"
                aria-expanded={isNavOpen}
                aria-controls="nav-links-list"
                onClick={toggleMobileNav}
            >
                <i className={`fas ${isNavOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </button>

            {/* Navigation Links */}
            <ul
                id="nav-links-list"
                ref={navLinksRef}
                className={`nav-links ${isNavOpen ? 'nav-active' : ''}`}
            >
                {/* Main Navigation Links */}
                 <li><Link href="/dashboard" className={isActive('/dashboard') ? 'active' : ''} onClick={handleNavLinkClick}>Dashboard</Link></li>
                 <li><Link href="/marketinternal" className={isActive('/marketinternal') ? 'active' : ''} onClick={handleNavLinkClick}>Market</Link></li>
                 <li><Link href="/trade" className={isActive('/trade') ? 'active' : ''} onClick={handleNavLinkClick}>Trade</Link></li>
                 <li><Link href="/wallet" className={isActive('/wallet') ? 'active' : ''} onClick={handleNavLinkClick}>Wallet</Link></li>
                 <li><Link href="/settings" className={isActive('/settings') ? 'active' : ''} onClick={handleNavLinkClick}>Settings</Link></li>

                {/* Notification Item */}
                 <li style={{ position: 'relative' }}> {/* Use ref on the button inside for click outside logic */}
                     <button
                        ref={notificationButtonRef} // Ref on the button
                        className="notification-btn"
                        aria-label="View notifications"
                        aria-expanded={isNotificationsOpen}
                        aria-controls="notification-dropdown"
                        onClick={toggleNotifications}
                     >
                        <i className="fas fa-bell"></i>
                        {/* Display unread count badge only if count > 0 */}
                        {unreadCount > 0 && (
                           <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>
                    {/* Notification Dropdown */}
                    {isNotificationsOpen && (
                        <div
                            id="notification-dropdown"
                            ref={notificationDropdownRef} // Ref on the dropdown content
                            className="notification-dropdown" // Ensure your CSS styles this appropriately
                        >
                            {/* Dropdown Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}> {/* Basic flex layout */}
                                 <h4>Notifications</h4>
                                {/* Show "Mark all read" only if there are unread notifications */}
                                {unreadCount > 0 && (
                                     <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-blue-600 hover:underline" // Example styling - adapt as needed
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem' }}
                                     >
                                        Mark all read
                                     </button>
                                )}
                             </div>

                            {/* Notification List */}
                            <div className="notification-list">
                              {loadingNotifications ? (
                                  <p className="text-xs text-gray-500 text-center py-4">Loading...</p> /* Centered loading text */
                              ) : recentNotifications.length > 0 ? (
                                   recentNotifications.map(notif => (
                                       // Use a button or div if the whole item isn't a link, but wrap clickable parts
                                       <div
                                            key={notif._id}
                                            className={`notification-item ${!notif.isRead ? 'font-semibold' : 'text-gray-600'}`} /* Style unread differently */
                                            style={{ borderBottom: '1px solid #eee', padding: '0.5rem 0', cursor: 'pointer' }}
                                            onClick={() => handleNotificationActionClick(notif)} // Make the whole item clickable
                                        >
                                            {/* Link might not be needed if the whole item handles click */}
                                            {/* <Link href={notif.link || '#'} onClick={() => handleNotificationActionClick(notif)}> */}
                                               <p style={{ fontWeight: !notif.isRead ? 'bold' : 'normal', marginBottom: '0.25rem' }}>{notif.title}</p>
                                               <p className="text-xs" style={{ marginBottom: '0.25rem' }}>{notif.message}</p>
                                            {/* </Link> */}
                                           <p className="notification-time text-xs text-gray-500">{formatDate(notif.createdAt)}</p>
                                       </div>
                                   ))
                              ) : (
                                   <p className="text-xs text-gray-500 text-center py-4">No recent notifications.</p> /* Centered message */
                              )}
                            </div>

                            {/* Footer Link */}
                            {/* Use handleNotificationActionClick without args for general links */}
                            <Link href="/notifications" className="btn btn-secondary btn-small mt-3 w-full" onClick={() => handleNotificationActionClick()}>
                                See All Notifications
                            </Link>
                        </div>
                    )}
                 </li>

                 {/* Profile Item */}
                 <li style={{ position: 'relative' }}>
                     <button
                        ref={profileButtonRef} // Ref on the button
                        className="profile-btn"
                        aria-label="User Profile"
                        aria-expanded={isProfileOpen}
                        aria-controls="profile-dropdown"
                        onClick={toggleProfile}
                    >
                        <i className="fas fa-user-circle"></i>
                    </button>
                    {/* Profile Dropdown */}
                    {isProfileOpen && (
                        <div
                            id="profile-dropdown"
                            ref={profileDropdownRef} // Ref on the dropdown content
                            className="profile-dropdown" // Ensure CSS styles this
                        >
                             <div className="profile-info" style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                <p><strong>{userName}</strong></p>
                                <p className="text-sm text-gray-600">{userEmail}</p>
                            </div>
                             <Link href="/settings" className="btn btn-secondary btn-small mb-2 w-full block text-center" onClick={handleProfileActionClick}>
                                 Go to Settings
                             </Link>
                             <button onClick={handleLogout} className="btn btn-danger btn-small w-full">
                                Logout
                            </button>
                        </div>
                    )}
                 </li>
            </ul>
        </nav>
    );
}