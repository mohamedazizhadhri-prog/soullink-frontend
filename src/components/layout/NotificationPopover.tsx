"use client";

import React, { useState } from "react";
import styles from "./NotificationPopover.module.css";
import { NOTIFICATIONS_DATA } from "@/constants/notifications";
import { MessageSquare, UserPlus, AtSign, Bell, X, Filter, Settings as SettingsIcon } from "lucide-react";
import { useNova } from "@/context/NovaContext";

export function NotificationPopover({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<"for-you" | "unreads" | "mentions">("mentions");
    const [hasInteracted, setHasInteracted] = useState(false);
    const { setMood } = useNova();

    const handleClose = () => {
        if (!hasInteracted) {
            setMood('sad');
        }
        onClose();
    };

    const handleTabClick = (tab: "for-you" | "unreads" | "mentions") => {
        setActiveTab(tab);
        setHasInteracted(true);
    };

    const filteredNotifications = NOTIFICATIONS_DATA.filter(n => {
        if (activeTab === "unreads") return !n.read;
        if (activeTab === "mentions") return n.type === "mention";
        return true;
    });

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Bell size={20} />
                        <h2>Inbox</h2>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.iconBtn} title="Filter" onClick={() => setHasInteracted(true)}>
                            <Filter size={18} />
                        </button>
                        <button className={styles.iconBtn} title="Settings" onClick={() => setHasInteracted(true)}>
                            <SettingsIcon size={18} />
                        </button>
                        <button className={styles.iconBtn} onClick={handleClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === "for-you" ? styles.activeTab : ""}`}
                        onClick={() => handleTabClick("for-you")}
                    >
                        For You
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "unreads" ? styles.activeTab : ""}`}
                        onClick={() => handleTabClick("unreads")}
                    >
                        Unreads
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "mentions" ? styles.activeTab : ""}`}
                        onClick={() => handleTabClick("mentions")}
                    >
                        Mentions
                    </button>
                </div>

                {/* Notifications List */}
                <div className={styles.notificationsList}>
                    {filteredNotifications.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Bell size={48} color="var(--color-text-secondary)" />
                            <p>You're all caught up!</p>
                        </div>
                    ) : (
                        filteredNotifications.map(note => (
                            <div key={note.id} className={`${styles.notificationItem} ${!note.read ? styles.unread : ""}`} onClick={() => setHasInteracted(true)}>
                                <button className={styles.closeBtn}>
                                    <X size={14} />
                                </button>
                                <div className={styles.notificationIcon}>
                                    {getIcon(note.type)}
                                </div>
                                <div className={styles.notificationContent}>
                                    <div className={styles.notificationHeader}>
                                        <span className={styles.channelName}>#general</span>
                                        <span className={styles.channelType}>chat • Text Channels</span>
                                    </div>
                                    <div className={styles.notificationBody}>
                                        <strong>{note.author}</strong>
                                        <p className={styles.notificationText}>{note.content}</p>
                                    </div>
                                    <span className={styles.timestamp}>{note.time}</span>
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

const getIcon = (type: string) => {
    switch (type) {
        case "mention": return <AtSign size={16} color="#7B68EE" />;
        case "request": return <UserPlus size={16} color="#FFD700" />;
        case "message": return <MessageSquare size={16} color="#00BFFF" />;
        default: return <Bell size={16} color="var(--color-text-secondary)" />;
    }
};
