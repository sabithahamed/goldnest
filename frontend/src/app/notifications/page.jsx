// src/app/notifications/page.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';

// --- Helper Functions ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        if (diffSeconds < 60) return 'Just now';
        const diffMinutes = Math.round(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

// NEW: Helper to get an icon based on notification type
const getNotificationIcon = (type) => {
    switch (type) {
        case 'transaction_buy':
        case 'transaction_deposit':
            return { icon: 'fa-arrow-down', color: 'text-green-500', bg: 'bg-green-100' };
        case 'transaction_sell':
        case 'transaction_withdrawal_request':
            return { icon: 'fa-arrow-up', color: 'text-red-500', bg: 'bg-red-100' };
        case 'redemption_requested':
        case 'redemption_shipped':
            return { icon: 'fa-box-open', color: 'text-blue-500', bg: 'bg-blue-100' };
        case 'gamification_badge':
        case 'gamification_challenge':
            return { icon: 'fa-trophy', color: 'text-yellow-500', bg: 'bg-yellow-100' };
        case 'price_alert':
        case 'market_movement':
            return { icon: 'fa-chart-line', color: 'text-indigo-500', bg: 'bg-indigo-100' };
        case 'security_password_change':
            return { icon: 'fa-shield-alt', color: 'text-gray-600', bg: 'bg-gray-200' };
        case 'account_welcome':
            return { icon: 'fa-hands-helping', color: 'text-purple-500', bg: 'bg-purple-100' };
        default:
            return { icon: 'fa-bell', color: 'text-gray-500', bg: 'bg-gray-100' };
    }
};

// --- Main Component ---
export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState('all');
    const router = useRouter();

    const fetchNotifications = useCallback(async (page = 1, currentFilter = 'all') => {
        setLoading(true); setError('');
        const token = localStorage.getItem('userToken');
        if (!token) { router.push('/'); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const limit = 15;

        try {
            const params = { page, limit, unread: currentFilter === 'unread' };
            const { data } = await axios.get(`${backendUrl}/api/notifications`, { ...config, params });

            setNotifications(data.notifications || []);
            setCurrentPage(data.currentPage || 1);
            setTotalPages(data.totalPages || 1);
            setUnreadCount(data.unreadCount || 0);

        } catch (err) {
             console.error("Error fetching notifications:", err);
             setError(err.response?.data?.message || "Failed to load notifications.");
             if (err.response?.status === 401) { localStorage.clear(); router.push('/'); }
        } finally {
             setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchNotifications(currentPage, filter);
    }, [currentPage, filter, fetchNotifications]);

    const handleMarkAllRead = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) return;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        try {
            await axios.put(`${backendUrl}/api/notifications/read-all`, {}, config);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            if (filter === 'unread') {
                 fetchNotifications(1, 'unread');
            }
        } catch (err) {
            console.error("Error marking all read:", err);
            alert("Failed to mark notifications as read.");
        }
    };

     const handleMarkOneRead = async (id, link) => {
         const token = localStorage.getItem('userToken');
         if (!token) return;
         const config = { headers: { Authorization: `Bearer ${token}` } };
         const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
         try {
            const originalNotifications = [...notifications];
            const isCurrentlyUnread = notifications.find(n => n._id === id && !n.isRead);
            if (isCurrentlyUnread) {
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            
            // Navigate first for better perceived performance
            if (link) router.push(link);

            await axios.put(`${backendUrl}/api/notifications/${id}/read`, {}, config);

         } catch (err) {
             console.error("Error marking one read:", err);
             // Rollback is complex with navigation, a full refetch might be simpler on error
             fetchNotifications(currentPage, filter);
         }
     };

    return (
        <>
            <NavbarInternal />
            <section className="wallet container mx-auto px-4 py-8">
                <div className="card">
                     <div className="notificationHeader">
                         <div className="headerContent">
                            <i className="fas fa-bell headerIcon"></i>
                            <h2 className="headerTitle">Notifications</h2>
                         </div>
                          {unreadCount > 0 && (
                              <button onClick={handleMarkAllRead} className="markAllReadButton">Mark all as read</button>
                          )}
                     </div>

                     {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                     
                     <div className="filterControls">
                         <label htmlFor="filter-select" className="filterLabel">Show:</label>
                          <select id="filter-select" value={filter} onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }} className="filterSelect">
                             <option value="all">All</option>
                             <option value="unread">Unread ({unreadCount})</option>
                         </select>
                     </div>

                     <div className="notificationListPage">
                         {loading ? (
                             [...Array(5)].map((_, i) => (
                                 <div key={i} className="notificationItemPage skeletonItem">
                                     <div className="notificationIconSkeleton"></div>
                                     <div className="notificationContent">
                                        <div className="skeleton h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                                        <div className="skeleton h-3 bg-gray-200 rounded w-full"></div>
                                        <div className="skeleton h-3 bg-gray-200 rounded w-1/4 mt-2"></div>
                                     </div>
                                 </div>
                            ))
                         ) : notifications.length > 0 ? (
                             notifications.map(notif => {
                                const { icon, color, bg } = getNotificationIcon(notif.type);
                                return (
                                 <div key={notif._id} className={`notificationItemPage ${!notif.isRead ? 'unread' : ''}`}>
                                     <div className={`notificationIcon ${bg}`}>
                                         <i className={`fas ${icon} ${color}`}></i>
                                     </div>
                                     <div className="notificationContent">
                                         <h4 className="notificationTitle">{notif.title}</h4>
                                         <p className="notificationMessage">{notif.message}</p>
                                         <p className="notificationTime">{formatDate(notif.createdAt)}</p>
                                     </div>
                                     <div className="notificationActions">
                                         {!notif.isRead && <div className="unreadDot" title="Unread"></div>}
                                         {notif.link && (
                                              <button onClick={() => handleMarkOneRead(notif._id, notif.link)} className="btn btn-secondary btn-small text-xs">
                                                  View
                                              </button>
                                          )}
                                     </div>
                                 </div>
                                );
                             })
                         ) : (
                            <div className="emptyState">
                                <i className="fas fa-envelope-open-text emptyIcon"></i>
                                <h4 className="emptyTitle">All Caught Up!</h4>
                                <p className="emptyText">You have no {filter === 'unread' ? 'unread' : ''} notifications.</p>
                            </div>
                         )}
                     </div>

                     {!loading && totalPages > 1 && (
                        <div className="pagination mt-6 flex justify-center items-center text-sm">
                            <button className="btn btn-secondary btn-small mr-2" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>« Prev</button>
                            <span>Page {currentPage} of {totalPages}</span>
                            <button className="btn btn-secondary btn-small ml-2" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next »</button>
                        </div>
                    )}
                </div>
            </section>
            <FooterInternal />
        </>
    );
}