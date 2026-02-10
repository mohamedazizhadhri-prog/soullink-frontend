"use client";

import React from "react";
import styles from "./Dashboard.module.css";
import { NOTIFICATIONS_DATA } from "@/constants/notifications";
import { MessageSquare, UserPlus, AtSign, Bell } from "lucide-react";

export function NotificationView() {
    const getIcon = (type: string) => {
        switch (type) {
            case "mention": return <AtSign size={18} color="#7B68EE" />;
            case "request": return <UserPlus size={18} color="#FFD700" />;
            case "message": return <MessageSquare size={18} color="#00BFFF" />;
            default: return <Bell size={18} color="var(--color-text-secondary)" />;
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 700 }}>Notifications</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {NOTIFICATIONS_DATA.map(note => (
                    <div
                        key={note.id}
                        style={{
                            background: 'var(--color-bg-card)',
                            padding: '16px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            border: note.read ? 'none' : '1px solid rgba(123, 104, 238, 0.3)',
                            boxShadow: note.read ? 'none' : '0 0 10px rgba(123, 104, 238, 0.1)'
                        }}
                    >
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {getIcon(note.type)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0 }}>
                                <strong style={{ color: 'var(--color-text-primary)' }}>{note.author}</strong> {note.content}
                            </p>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{note.time}</span>
                        </div>
                        {!note.read && (
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand-purple)' }}></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
