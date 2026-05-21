'use client';

/**
 * Admin Sidebar Navigation
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';
import {
    LayoutDashboard,
    Users,
    Flag,
    Scale,
    Globe,
    ScrollText,
    BarChart2,
    Settings,
    ShieldCheck,
    MessageSquare,
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Overview',     href: '/admin',              icon: <LayoutDashboard size={16} /> },
    { label: 'Users',        href: '/admin/users',         icon: <Users           size={16} /> },
    { label: 'Reports',      href: '/admin/reports',       icon: <Flag            size={16} /> },
    { label: 'Appeals',      href: '/admin/appeals',       icon: <Scale           size={16} /> },
    { label: 'Communities',  href: '/admin/communities',   icon: <Globe           size={16} /> },
    { label: 'Audit Logs',   href: '/admin/audit-logs',    icon: <ScrollText      size={16} /> },
    { label: 'Analytics',    href: '/admin/analytics',     icon: <BarChart2       size={16} /> },
    { label: 'Feedback',     href: '/admin/feedback',      icon: <MessageSquare   size={16} /> },
    { label: 'Settings',     href: '/admin/settings',      icon: <Settings        size={16} /> },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <nav className={styles.sidebar} aria-label="Admin navigation">
            <div className={styles.brand}>
                <ShieldCheck size={18} className={styles.brandIcon} />
                <span className={styles.brandText}>SoulLink<strong> Admin</strong></span>
            </div>

            <ul className={styles.navList} role="list">
                {NAV_ITEMS.map(item => {
                    const active = pathname === item.href ||
                        (item.href !== '/admin' && pathname.startsWith(item.href));
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`${styles.navItem} ${active ? styles.active : ''}`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                                <span className={styles.navLabel}>{item.label}</span>
                                {active && <span className={styles.activeBar} aria-hidden="true" />}
                            </Link>
                        </li>
                    );
                })}
            </ul>

            <div className={styles.footer}>
                <Link href="/match" className={styles.exitLink}>
                    ← Back to App
                </Link>
            </div>
        </nav>
    );
}
