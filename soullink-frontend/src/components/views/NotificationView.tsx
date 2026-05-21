"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, UserPlus, AtSign, Bell, Check, Trash2, ShieldAlert, ShieldCheck, Trophy, XCircle, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";

export function NotificationView() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            const pendingRes = await api.get('/friends/pending');
            const friendship = pendingRes.data.data.requests.find((r: any) => r.sender.id === senderId);

            if (friendship) {
                await api.patch(`/friends/${friendship.id}/respond`, { action });
            }
            await api.delete(`/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error: any) {
            console.error(`Failed to ${action} friend request:`, error.response?.data?.message || error.message);
            alert(error.response?.data?.message || `Failed to ${action} friend request`);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "mention": return <AtSign size={18} color="#7B68EE" />;
            case "request": return <UserPlus size={18} color="#FFD700" />;
            case "message": return <MessageSquare size={18} color="#00BFFF" />;
            case "request_accepted": return <Check size={18} color="#4CAF50" />;
            case "MODERATION_ACTION": return <ShieldAlert size={18} color="#ff4757" />;
            case "REPORT_RESOLVED": return <ShieldCheck size={18} color="#4CAF50" />;
            case "REPORT_DISMISSED": return <ShieldCheck size={18} color="#999" />;
            case "APPEAL_ACCEPTED": return <Trophy size={18} color="#4CAF50" />;
            case "APPEAL_REJECTED": return <XCircle size={18} color="#ff4757" />;
            default: return <Bell size={18} color="var(--color-text-secondary)" />;
        }
    };

    const isModerationNotification = (type: string) =>
        ['MODERATION_ACTION', 'REPORT_RESOLVED', 'REPORT_DISMISSED', 'APPEAL_ACCEPTED', 'APPEAL_REJECTED'].includes(type);

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Notifications</h1>
                <button
                    onClick={async () => {
                        await api.patch('/notifications/read-all');
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-brand-purple)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                    Mark all as read
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><p>Loading...</p></div>
                ) : notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
                        <Bell size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>No notifications yet.</p>
                    </div>
                ) : (
                    notifications.map(note => (
                        <div
                            key={note.id}
                            onClick={() => handleMarkRead(note.id, note.read)}
                            style={{
                                background: 'var(--color-bg-card)',
                                padding: '16px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                border: note.read ? 'none' : '1px solid rgba(123, 104, 238, 0.3)',
                                boxShadow: note.read ? 'none' : '0 0 10px rgba(123, 104, 238, 0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                        >
                            <div style={{
                                width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                {getIcon(note.type)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 4px 0', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                                    {note.title}
                                </p>
                                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                                    {note.body}
                                </p>

                                {note.type === 'request' && !note.read && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                        <button
                                            onClick={(e) => handleFriendAction(note.id, note.metadata.senderId, 'accept', e)}
                                            style={{ padding: '6px 16px', borderRadius: '6px', background: 'var(--color-brand-purple)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={(e) => handleFriendAction(note.id, note.metadata.senderId, 'decline', e)}
                                            style={{ padding: '6px 16px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-primary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                )}

                                {isModerationNotification(note.type) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); router.push('/my-reports'); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            marginTop: 10, padding: '6px 14px', borderRadius: '6px',
                                            background: 'rgba(123, 104, 238, 0.1)', color: '#7b68ee',
                                            border: '1px solid rgba(123, 104, 238, 0.25)', cursor: 'pointer',
                                            fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s'
                                        }}
                                    >
                                        View Details <ArrowUpRight size={14} />
                                    </button>
                                )}

                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 8, display: 'block' }}>
                                    {new Date(note.createdAt).toLocaleString()}
                                </span>
                            </div>

                            <button
                                onClick={(e) => handleDelete(note.id, e)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 8 }}
                            >
                                <Trash2 size={18} />
                            </button>

                            {!note.read && (
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', position: 'absolute', right: '16px', top: '16px' }}></div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
