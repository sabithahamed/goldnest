// src/components/NavbarInternal.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';

const logoSrc = "/GoldNest.png";

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
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
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

export default function NavbarInternal() {
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [userName, setUserName] = useState('User');
    const [userEmail, setUserEmail] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const profileDropdownRef = useRef(null);
    const profileButtonRef = useRef(null);
    const notificationDropdownRef = useRef(null);
    const notificationButtonRef = useRef(null);
    const navLinksRef = useRef(null);
    const hamburgerRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('userToken');
        const storedUserInfo = localStorage.getItem('userInfo');

        if (storedUserInfo) {
            try {
                const info = JSON.parse(storedUserInfo);
                setUserName(info.name || 'User');
                setUserEmail(info.email || '');
            } catch (e) {
                console.error("Failed to parse user info from localStorage:", e);
            }
        }

        if (token) {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
            axios.get(`${backendUrl}/api/notifications?limit=1&unread=true`, config)
                .then(response => {
                    setUnreadCount(response.data?.unreadCount || 0);
                })
                .catch(err => console.error("Error fetching initial unread count:", err.response?.data?.message || err.message));
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isProfileOpen &&
                profileButtonRef.current && !profileButtonRef.current.contains(event.target) &&
                profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)
            ) {
                setIsProfileOpen(false);
            }

            if (
                isNotificationsOpen &&
                notificationButtonRef.current && !notificationButtonRef.current.contains(event.target) &&
                notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)
            ) {
                setIsNotificationsOpen(false);
            }

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
    }, [isNavOpen, isProfileOpen, isNotificationsOpen]);

    const fetchRecentNotifications = async () => {
        const token = localStorage.getItem('userToken');
        if (loadingNotifications || !token || !isNotificationsOpen) return;

        setLoadingNotifications(true);
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

        try {
            const { data } = await axios.get(`${backendUrl}/api/notifications?limit=5&sort=-createdAt`, config);
            setRecentNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (err) {
            console.error("Error fetching recent notifications:", err.response?.data?.message || err.message);
            setRecentNotifications([]);
        } finally {
            setLoadingNotifications(false);
        }
    };

    useEffect(() => {
        if (isNotificationsOpen) {
            fetchRecentNotifications();
        }
    }, [isNotificationsOpen]);

    const handleMarkAllRead = async () => {
        const token = localStorage.getItem('userToken');
        if (!token || unreadCount === 0) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        try {
            await axios.put(`${backendUrl}/api/notifications/read-all`, {}, config);
            setRecentNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking all read:", err.response?.data?.message || err.message);
            alert("Failed to mark notifications as read. Please try again.");
        }
    };

    const toggleMobileNav = () => {
        setIsNavOpen(prev => !prev);
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
    };

    const toggleProfile = () => {
        setIsProfileOpen(prev => !prev);
        if (!isProfileOpen) {
            setIsNotificationsOpen(false);
        }
    };

    const toggleNotifications = () => {
        setIsNotificationsOpen(prev => !prev);
        if (!isNotificationsOpen) {
            setIsProfileOpen(false);
        }
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

    const handleNotificationActionClick = (notification = null) => {
        if (notification?.link && notification.link !== '#') {
            router.push(notification.link);
        }
        setIsNotificationsOpen(false);
        handleNavLinkClick();
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userToken');
        setUserName('User');
        setUserEmail('');
        setUnreadCount(0);
        setRecentNotifications([]);
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
        if (isNavOpen) setIsNavOpen(false);
        router.push('/');
    };

    const isActive = (path) => pathname === path;

    return (
        <nav className="navbar">
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

            {/* Logo */}
            <div className="logo">
                <Link href="/dashboard" onClick={handleNavLinkClick}>
                    <Image src={logoSrc} alt="GoldNest Logo" width={120} height={35} priority />
                </Link>
            </div>

            {/* Action Buttons (Notification + Profile) */}
            <div className="action-buttons">
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                        ref={notificationButtonRef}
                        className="notification-btn"
                        aria-label="View notifications"
                        aria-expanded={isNotificationsOpen}
                        aria-controls="notification-dropdown"
                        onClick={toggleNotifications}
                    >
                        <i className="fas fa-bell"></i>
                        {unreadCount > 0 && (
                            <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <div
                            id="notification-dropdown"
                            ref={notificationDropdownRef}
                            className="notification-dropdown"
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h4>Notifications</h4>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-blue-600 hover:underline"
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="notification-list">
                                {loadingNotifications ? (
                                    <p className="text-xs text-gray-500 text-center py-4">Loading...</p>
                                ) : recentNotifications.length > 0 ? (
                                    recentNotifications.map(notif => (
                                        <div
                                            key={notif._id}
                                            className={`notification-item ${!notif.isRead ? 'font-semibold' : 'text-gray-600'}`}
                                            style={{ borderBottom: '1px solid #eee', padding: '0.5rem 0', cursor: 'pointer' }}
                                            onClick={() => handleNotificationActionClick(notif)}
                                        >
                                            <p style={{ fontWeight: !notif.isRead ? 'bold' : 'normal', marginBottom: '0.25rem' }}>{notif.title}</p>
                                            <p className="text-xs" style={{ marginBottom: '0.25rem' }}>{notif.message}</p>
                                            <p className="notification-time text-xs text-gray-500">{formatDate(notif.createdAt)}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-500 text-center py-4">No recent notifications.</p>
                                )}
                            </div>
                            <Link href="/notifications" className="btn btn-secondary btn-small mt-3 w-full" onClick={() => handleNotificationActionClick()}>
                                See All Notifications
                            </Link>
                        </div>
                    )}
                </div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                        ref={profileButtonRef}
                        className="profile-btn"
                        aria-label="User Profile"
                        aria-expanded={isProfileOpen}
                        aria-controls="profile-dropdown"
                        onClick={toggleProfile}
                    >
                        <i className="fas fa-user-circle"></i>
                    </button>
                    {isProfileOpen && (
                        <div
                            id="profile-dropdown"
                            ref={profileDropdownRef}
                            className="profile-dropdown"
                        >
                            <div className="profile-info" style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                <p><strong>{userName}</strong></p>
                                <p className="text-sm text-gray-600">{userEmail}</p>
                            </div>
                            <Link href="/settings" className="btn btn-secondary btn-small mb-2 w-full block text-center" onClick={handleProfileActionClick}>
                                Settings
                            </Link>
                            <button onClick={handleLogout} className="btn btn-primary btn-small w-full">
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Links */}
            <ul
                id="nav-links-list"
                ref={navLinksRef}
                className={`nav-links ${isNavOpen ? 'nav-active' : ''}`}
            >
                <li><Link href="/dashboard" className={isActive('/dashboard') ? 'active' : ''} onClick={handleNavLinkClick}>Dashboard</Link></li>
                <li><Link href="/marketinternal" className={isActive('/marketinternal') ? 'active' : ''} onClick={handleNavLinkClick}>Market</Link></li>
                <li><Link href="/trade" className={isActive('/trade') ? 'active' : ''} onClick={handleNavLinkClick}>Trade</Link></li>
                <li><Link href="/wallet" className={isActive('/wallet') ? 'active' : ''} onClick={handleNavLinkClick}>Wallet</Link></li>
                <li><Link href="/settings" className={isActive('/settings') ? 'active' : ''} onClick={handleNavLinkClick}>Settings</Link></li>
            </ul>
        </nav>
    );
}