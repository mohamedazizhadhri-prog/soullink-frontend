"use client";

import React, { useState, useEffect } from "react";
import styles from "./TopNavigation.module.css";
import { Eclipse, Settings, Bell, Search } from "lucide-react";
import Link from "next/link";
import { NotificationPopover } from "./NotificationPopover";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";

export function TopNavigation() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/users/me');
                if (response.data.status === 'success') {
                    setAvatarUrl(response.data.data.user.avatarUrl);
                }
            } catch (error) {
                console.error("Failed to fetch user for navigation:", error);
            }
        };

        const fetchUnreadCount = async () => {
            try {
                const response = await api.get('/notifications/unread-count');
                if (response.data.status === 'success') {
                    setUnreadCount(response.data.data.count);
                }
            } catch (error) {
                console.error("Failed to fetch unread count:", error);
            }
        };

        fetchUser();
        fetchUnreadCount();

        // Socket listener for real-time badge updates
        socketService.connect();
        const handleNewNotification = () => {
            setUnreadCount(prev => prev + 1);
        };

        socketService.on('notification:new', handleNewNotification);

        return () => {
            socketService.off('notification:new', handleNewNotification);
        };
    }, []);

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
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </button>
                    <Link href="/settings" className={styles.actionBtn}>
                        <Settings size={20} />
                    </Link>
                    <Link href="/profile" className={styles.avatar} style={{ overflow: 'hidden', display: 'block' }}>
                        <img
                            src={avatarUrl || "/default-avatar.png"}
                            alt="Profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </Link>
                </div>
            </header>

            {showNotifications && (
                <NotificationPopover
                    onClose={() => setShowNotifications(false)}
                    onNotificationsRead={() => setUnreadCount(0)}
                />
            )}
        </>
    );
}
