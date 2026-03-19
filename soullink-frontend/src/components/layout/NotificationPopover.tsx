"use client";

import React, { useState, useEffect } from "react";
import styles from "./NotificationPopover.module.css";
import { MessageSquare, UserPlus, AtSign, Bell, X, Filter, Check, Trash2 } from "lucide-react";
import { useNova } from "@/context/NovaContext";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";

export function NotificationPopover({ onClose, onNotificationsRead }: { onClose: () => void, onNotificationsRead?: () => void }) {
    const [activeTab, setActiveTab] = useState<"all" | "unreads">("all");
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { setMood } = useNova();

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            if (response.data.status === 'success') {
                setNotifications(response.data.data.notifications);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        const handleNewNotification = (notification: any) => {
            setNotifications(prev => [notification, ...prev]);
        };
        socketService.on('notification:new', handleNewNotification);
        return () => socketService.off('notification:new', handleNewNotification);
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            if (onNotificationsRead) onNotificationsRead();
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const handleMarkRead = async (id: string, isRead: boolean) => {
        if (isRead) return;
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const handleFriendAction = async (notificationId: string, senderId: string, action: 'accept' | 'decline', e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // Find friendship by senderId
            const pendingRes = await api.get('/friends/pending');
            const friendship = pendingRes.data.data.requests.find((r: any) => r.sender.id === senderId);

            if (friendship) {
                await api.patch(`/friends/${friendship.id}/respond`, { action });
                // Delete the notification after action
                await api.delete(`/notifications/${notificationId}`);
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            } else {
                // If not found, maybe it was processed elsewhere, just delete notification
                await api.delete(`/notifications/${notificationId}`);
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            }
        } catch (error: any) {
            console.error(`Failed to ${action} friend request:`, error.response?.data?.message || error.message);
            alert(error.response?.data?.message || `Failed to ${action} request`);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === "unreads") return !n.read;
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case "mention": return <AtSign size={16} color="#7B68EE" />;
            case "request": return <UserPlus size={16} color="#FFD700" />;
            case "message": return <MessageSquare size={16} color="#00BFFF" />;
            case "request_accepted": return <Check size={16} color="#4CAF50" />;
            default: return <Bell size={16} color="var(--color-text-secondary)" />;
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Bell size={20} />
                        <h2>Inbox</h2>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.iconBtn} title="Mark all as read" onClick={handleMarkAllRead}>
                            <Filter size={18} />
                        </button>
                        <button className={styles.iconBtn} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === "all" ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab("all")}
                    >
                        For You
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "unreads" ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab("unreads")}
                    >
                        Unreads
                    </button>
                </div>

                {/* Notifications List */}
                <div className={styles.notificationsList}>
                    {loading ? (
                        <div className={styles.emptyState}><p>Loading...</p></div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Bell size={48} color="var(--color-text-secondary)" />
                            <p>You're all caught up!</p>
                        </div>
                    ) : (
                        filteredNotifications.map(note => (
                            <div
                                key={note.id}
                                className={`${styles.notificationItem} ${!note.read ? styles.unread : ""}`}
                                onClick={() => handleMarkRead(note.id, note.read)}
                            >
                                <button className={styles.closeBtn} onClick={(e) => handleDelete(note.id, e)}>
                                    <Trash2 size={14} />
                                </button>
                                <div className={styles.notificationIcon}>
                                    {getIcon(note.type)}
                                </div>
                                <div className={styles.notificationContent}>
                                    <div className={styles.notificationBody}>
                                        <strong className={styles.noteTitle}>{note.title}</strong>
                                        <p className={styles.notificationText}>{note.body}</p>
                                    </div>

                                    {note.type === 'request' && !note.read && (
                                        <div className={styles.actions}>
                                            <button
                                                className={styles.acceptBtn}
                                                onClick={(e) => handleFriendAction(note.id, note.metadata.senderId, 'accept', e)}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className={styles.declineBtn}
                                                onClick={(e) => handleFriendAction(note.id, note.metadata.senderId, 'decline', e)}
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}

                                    <span className={styles.timestamp}>
                                        {new Date(note.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                {!note.read && <div className={styles.unreadDot}></div>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
