// src/app/admin/users/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // <-- IMPORT LINK
import styles from './Users.module.css'; // <-- IMPORT THE NEW CSS MODULE

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
        const token = adminInfo?.token;

        if (!token) {
            router.push('/gn-admin-portal');
            return;
        }

        const fetchUsers = async () => {
            setLoading(true);
            try {
                const config = { 
                    headers: { Authorization: `Bearer ${token}` },
                    params: { page, limit: 10, search: searchTerm } 
                };
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
                const { data } = await axios.get(`${backendUrl}/api/admin/users`, config);
                
                setUsers(data.users);
                setTotalPages(data.totalPages);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch users.');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [page, searchTerm, router]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setSearchTerm(search);
    };

    return (
        <div className={styles.pageWrapper}>
            <h1 className={styles.header}>User Management</h1>

            {/* Search and Filter Bar */}
            <form onSubmit={handleSearch} className={styles.searchForm}>
                <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className={styles.searchInput}
                />
                <button type="submit" className={styles.searchButton}>
                    Search
                </button>
            </form>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* Users Table */}
            <div className={styles.tableContainer}>
                <table className={styles.usersTable}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Gold Balance (g)</th>
                            <th>LKR Balance</th>
                            <th>Date Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="p-4 text-center">Loading users...</td></tr>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.goldBalanceGrams.toFixed(4)}</td>
                                    <td>{new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(user.cashBalanceLKR)}</td>
                                    <td>{formatDate(user.createdAt)}</td>
                                    <td>
                                        {/* --- START MODIFICATION --- */}
                                        <Link href={`/admin/users/${user._id}`} className={styles.viewButton}>
                                            View
                                        </Link>
                                        {/* --- END MODIFICATION --- */}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" className="p-4 text-center text-gray-500">No users found for this search.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                 <div className={styles.paginationControls}>
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page === 1}
                        className={styles.paginationButton}
                    >
                        Previous
                    </button>
                    <span className={styles.paginationInfo}>Page {page} of {totalPages}</span>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        disabled={page === totalPages}
                        className={styles.paginationButton}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;