// src/app/notifications/page.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarInternal from '@/components/NavbarInternal';
import FooterInternal from '@/components/FooterInternal';
import { TransactionRowSkeleton } from '@/components/skeletons/TransactionRowSkeleton'; // Reuse skeleton

// Helpers
const formatCurrency = (value) => { /* ... */ };
const formatDate = (dateString) => { /* ... */ };

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState('all'); // 'all', 'unread'
    const router = useRouter();

    const fetchNotifications = useCallback(async (page = 1, currentFilter = 'all') => {
        setLoading(true); setError('');
        const token = localStorage.getItem('userToken');
        if (!token) { router.push('/'); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
        const limit = 15; // Notifications per page

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]); // Include router, but not page/filter as they trigger refetch directly

     // Fetch on initial load and when filter/page changes
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
            // Refetch or update local state
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            // Optionally refetch if filter is 'unread'
            if (filter === 'unread') {
                 fetchNotifications(1, 'unread'); // Go back to page 1 of unread (now empty)
            }
        } catch (err) {
            console.error("Error marking all read:", err);
            alert("Failed to mark notifications as read.");
        }
    };

     const handleMarkOneRead = async (id) => {
         const token = localStorage.getItem('userToken');
         if (!token) return;
         const config = { headers: { Authorization: `Bearer ${token}` } };
         const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
         try {
              // Optimistic UI update
             const originalNotifications = [...notifications];
             const isCurrentlyUnread = notifications.find(n => n._id === id && !n.isRead);
             setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
              if(isCurrentlyUnread) setUnreadCount(prev => Math.max(0, prev - 1));

             await axios.put(`${backendUrl}/api/notifications/${id}/read`, {}, config);
             // No need to refetch on success if optimistic update is good

         } catch (err) {
             console.error("Error marking one read:", err);
              // Rollback optimistic update on error
              setNotifications(originalNotifications);
              if(isCurrentlyUnread) setUnreadCount(prev => prev + 1); // Add count back
             alert("Failed to mark notification as read.");
         }
     };

    return (
        <>
            <NavbarInternal />
            <section className="wallet container mx-auto px-4 py-8"> {/* Use consistent padding */}
                <div className="card">
                     <div className="flex justify-between items-center mb-6 border-b pb-3">
                         <h2 className="text-2xl font-semibold m-0">Notifications</h2>
                          {unreadCount > 0 && (
                              <button onClick={handleMarkAllRead} className="btn btn-secondary btn-small">Mark all as read</button>
                          )}
                     </div>

                     {error && <p className="error-message mb-4">{error}</p>}

                     {/* Filter (Optional) */}
                     <div className="mb-4">
                         <label className="mr-2 text-sm font-medium">Show:</label>
                          <select value={filter} onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }} className="input-field bg-white inline-block w-auto text-sm">
                             <option value="all">All</option>
                             <option value="unread">Unread ({unreadCount})</option>
                         </select>
                     </div>

                     {/* Notification List */}
                     <div className="notification-list-page space-y-3">
                         {loading ? (
                             [...Array(5)].map((_, i) => ( // Skeleton rows
                                 <div key={i} className="notification-item-page animate-pulse p-4 border rounded-lg space-y-2">
                                     <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                     <div className="h-3 bg-gray-200 rounded w-full"></div>
                                     <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                 </div>
                            ))
                         ) : notifications.length > 0 ? (
                             notifications.map(notif => (
                                 <div key={notif._id} className={`notification-item-page p-4 border rounded-lg ${!notif.isRead ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
                                     <div className="flex justify-between items-start gap-2">
                                         <div>
                                             <h4 className={`font-semibold ${!notif.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{notif.title}</h4>
                                             <p className={`text-sm mt-1 ${!notif.isRead ? 'text-gray-700' : 'text-gray-500'}`}>{notif.message}</p>
                                             <p className="text-xs text-gray-400 mt-2">{formatDate(notif.createdAt)}</p>
                                         </div>
                                         <div className="flex-shrink-0 space-x-2">
                                             {notif.link && (
                                                  <Link href={notif.link} className="btn btn-secondary btn-small text-xs" onClick={() => handleMarkOneRead(notif._id)}>
                                                      View
                                                  </Link>
                                              )}
                                             {!notif.isRead && (
                                                 <button onClick={() => handleMarkOneRead(notif._id)} title="Mark as read" className="text-gray-400 hover:text-blue-600">
                                                     <i className="fas fa-check"></i>
                                                 </button>
                                             )}
                                             {/* Add delete button if needed */}
                                         </div>
                                     </div>
                                 </div>
                             ))
                         ) : (
                             <p className="text-center text-gray-500 py-6">No notifications {filter === 'unread' ? 'are unread' : 'found'}.</p>
                         )}
                     </div>

                     {/* Pagination */}
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

// Define basic message styles in globals.css if needed
// .error-message { color: red; ... }
// .warning-message { color: orange; ... }
// .empty-message { color: grey; ... }
// .notification-item-page { ... }