"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./TopNavigation.module.css";
import { Eclipse, Settings, Bell } from "lucide-react";
import Link from "next/link";
import { NotificationPopover } from "./NotificationPopover";
import { ParticleConduit, ConduitNotification } from "./ParticleConduit";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";

export function TopNavigation() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [conduitNotif, setConduitNotif] = useState<ConduitNotification | null>(null);
    const [bellShaking, setBellShaking] = useState(false);
    const [bellGlowing, setBellGlowing] = useState(false);
    const [showAccretionBadge, setShowAccretionBadge] = useState(false);

    const logoRef = useRef<HTMLAnchorElement>(null);
    const bellRef = useRef<HTMLButtonElement>(null);

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

        // Socket listener for real-time notification events
        socketService.connect();

        const handleNewNotification = (data: any) => {
            // Increment unread count immediately
            setUnreadCount(prev => prev + 1);

            // Only trigger Particle Conduit for non-message notifications
            // Message notifications are handled by the DM/chat UI
            const notifType = data?.type || data?.notification?.type || '';
            if (notifType !== 'message') {
                const conduitData: ConduitNotification = {
                    id: data?.id || data?.notification?.id || Date.now().toString(),
                    type: notifType,
                    title: data?.title || data?.notification?.title || 'New Notification',
                    body: data?.body || data?.notification?.body || '',
                    avatarUrl: data?.avatarUrl || data?.metadata?.avatarUrl || data?.notification?.avatarUrl,
                };
                setConduitNotif(conduitData);
            }
        };

        const handleForceLogout = (data: any) => {
            console.warn("Forced logout received:", data);
            localStorage.removeItem('sl_token');
            localStorage.removeItem('sl_user');
            window.location.href = '/suspended';
        };

        socketService.on('notification:new', handleNewNotification);
        socketService.on('auth:force_logout', handleForceLogout);

        return () => {
            socketService.off('notification:new', handleNewNotification);
            socketService.off('auth:force_logout', handleForceLogout);
        };
    }, []);

    /* ── Callback when Particle Conduit animation finishes ──────────────── */
    const handleConduitComplete = useCallback(() => {
        // Trigger bell shake + glow
        setBellShaking(true);
        setBellGlowing(true);
        setShowAccretionBadge(true);

        // Clear bell effects after animation
        setTimeout(() => {
            setBellShaking(false);
            setBellGlowing(false);
        }, 600);
    }, []);

    /* ── When notifications are read, reset badge style ─────────────────── */
    const handleNotificationsRead = useCallback(() => {
        setUnreadCount(0);
        setShowAccretionBadge(false);
    }, []);

    return (
        <>
            <header className={styles.header} data-onboarding-anchor="top-nav">
                {/* Branding */}
                <Link
                    href="/friends"
                    className={styles.logoArea}
                    style={{ textDecoration: 'none' }}
                    data-singularity-target="logo"
                    ref={logoRef}
                >
                    <Eclipse className={styles.logoIcon} size={28} />
                    <span>SoulLink</span>
                </Link>

                {/* ── Particle Conduit Animation Layer ────────────────────── */}
                <div className={styles.conduitLayer}>
                    <ParticleConduit
                        notification={conduitNotif}
                        logoRef={logoRef}
                        bellRef={bellRef}
                        onAnimationComplete={handleConduitComplete}
                    />
                </div>

                {/* Actions */}
                <div className={styles.actionsArea} data-onboarding-anchor="top-nav-actions">
                    <button
                        ref={bellRef}
                        className={`${styles.actionBtn} ${bellShaking ? styles.bellShake : ''} ${bellGlowing ? styles.bellGlow : ''}`}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className={`${showAccretionBadge ? styles.accretionBadge : styles.badge}`}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
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
                    onNotificationsRead={handleNotificationsRead}
                />
            )}
        </>
    );
}
