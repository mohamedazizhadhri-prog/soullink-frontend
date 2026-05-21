'use client';

/**
 * Moderation Sidebar Navigation
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../admin/AdminSidebar.module.css'; // reuse admin sidebar styles

const NAV_ITEMS = [
    { label: 'Dashboard',   href: '/moderation',             icon: '🛡️' },
    { label: 'Feedback',    href: '/moderation/feedback',    icon: '💬' },
    { label: 'Back to App', href: '/match',                  icon: '←' },
];

export default function ModerationSidebar() {
    const pathname = usePathname();
    return (
        <nav className={styles.sidebar} aria-label="Moderation navigation">
            <div className={styles.brand}>
                <span className={styles.brandIcon}>🛡️</span>
                <span className={styles.brandText}>SoulLink<strong> Mod</strong></span>
            </div>
            <ul className={styles.navList} role="list">
                {NAV_ITEMS.map(item => {
                    const active = pathname === item.href;
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
        </nav>
    );
}
