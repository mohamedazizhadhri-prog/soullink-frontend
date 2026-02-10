"use client";

import React, { useState } from "react";
import styles from "./TopNavigation.module.css";
import { Search, Bell, Settings, User, Eclipse } from "lucide-react";
import Link from "next/link";
import { NotificationPopover } from "./NotificationPopover";

export function TopNavigation() {
    const [showNotifications, setShowNotifications] = useState(false);

    return (
        <>
            <header className={styles.header}>
                {/* Branding */}
                <Link href="/" className={styles.logoArea} style={{ textDecoration: 'none' }} data-singularity-target="logo">
                    <Eclipse className={styles.logoIcon} size={28} />
                    <span>SoulLink</span>
                </Link>

                {/* Search */}
                <div className={styles.searchArea} data-singularity-target="search">
                    <input
                        type="text"
                        placeholder="Search connections, servers, games..."
                        className={styles.searchInput}
                    />
                </div>

                {/* Actions */}
                <div className={styles.actionsArea}>
                    <button
                        className={styles.actionBtn}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        <span className={styles.badge}>3</span>
                    </button>
                    <Link href="/settings" className={styles.actionBtn}>
                        <Settings size={20} />
                    </Link>
                    <Link href="/profile" className={styles.avatar} style={{ overflow: 'hidden' }}>
                        <img
                            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop"
                            alt="Profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </Link>
                </div>
            </header>

            {showNotifications && <NotificationPopover onClose={() => setShowNotifications(false)} />}
        </>
    );
}
