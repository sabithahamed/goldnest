// src/app/admin/layout.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './AdminLayout.module.css';

const AdminLayout = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [adminRole, setAdminRole] = useState('');

  useEffect(() => {
    // Check for admin info in local storage
    const adminInfoString = localStorage.getItem('adminInfo');
    if (!adminInfoString) {
      // If no admin info, redirect to the login portal
      router.push('/gn-admin-portal');
    } else {
      // If admin info exists, parse it and set the role
      const adminInfo = JSON.parse(adminInfoString);
      setAdminRole(adminInfo.role);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminInfo');
    router.push('/gn-admin-portal');
  };

  const navItems = [
    { href: '/admin/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { href: '/admin/users', icon: 'fa-users', label: 'Users' },
    { href: '/admin/inventory', icon: 'fa-warehouse', label: 'Inventory' },
    { href: '/admin/redemptions', icon: 'fa-box-open', label: 'Redemptions' },
    { href: '/admin/gamification', icon: 'fa-trophy', label: 'Gamification' },
    { href: '/admin/promos', icon: 'fa-tags', label: 'Promo Codes' },
    { href: '/admin/settings', icon: 'fa-cog', label: 'Settings' },
  ];

  return (
    <div className={styles.adminLayoutWrapper}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          GoldNest Admin
        </div>
        <nav className={styles.sidebarNav}>
          <ul>
            {navItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${pathname === item.href ? styles.navLinkActive : ''}`}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}

            {/* Conditionally rendered link for superadmins */}
            {adminRole === 'superadmin' && (
              <li>
                <Link
                  href="/admin/management"
                  className={`${styles.navLink} ${pathname.startsWith('/admin/management') ? styles.navLinkActive : ''}`}
                >
                  <i className="fas fa-user-shield"></i>
                  <span>Admin Management</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;