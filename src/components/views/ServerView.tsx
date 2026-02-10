"use client";

import React from "react";
import styles from "./ServerView.module.css";
import { Hash, Volume2, ChevronDown, Bell, Users, HelpCircle } from "lucide-react";
import Link from "next/link";
import groupStyles from "./GroupView.module.css"; // Reuse input styles

export function ServerView({ server, channelId }: { server?: any, channelId?: string }) {
    // Default to first server/channel if not provided
    const displayServer = server || { name: "Select Server", channels: [] };
    const activeChannel = displayServer.channels.find((c: any) => c.id === channelId) || displayServer.channels[0] || { name: "none" };

    return (
        <div className={styles.container}>
            {/* Channel List Sidebar */}
            <div className={styles.channelList}>
                <div className={styles.serverHeader}>
                    {displayServer.name} <ChevronDown size={16} />
                </div>

                {/* Group channels by their 'group' property */}
                {Object.entries(
                    displayServer.channels.reduce((acc: any, channel: any) => {
                        if (!acc[channel.group]) acc[channel.group] = [];
                        acc[channel.group].push(channel);
                        return acc;
                    }, {})
                ).map(([group, channels]: [string, any]) => (
                    <div key={group} className={styles.channelGroup}>
                        <div className={styles.channelLabel}>{group}</div>
                        {channels.map((channel: any) => (
                            <Link
                                key={channel.id}
                                href={`/server/${displayServer.id}/${channel.id}`}
                                className={`${styles.channelItem} ${activeChannel.id === channel.id ? styles.activeChannel : ""}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                {channel.type === "voice" ? <Volume2 size={18} /> : <Hash size={18} />} {channel.name}
                            </Link>
                        ))}
                    </div>
                ))}
            </div>

            {/* Main Chat Area */}
            <div className={styles.chatArea}>
                <header className={styles.chatHeader}>
                    <Hash size={24} className={styles.hashtag} />
                    <span>{activeChannel.name}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, color: 'var(--color-text-secondary)' }}>
                        <Bell size={20} />
                        <Users size={20} />
                        <HelpCircle size={20} />
                    </div>
                </header>

                <div className={styles.messagesScroll}>
                    <div className={styles.welcomeBanner}>
                        <h3>Welcome to #{activeChannel.name}!</h3>
                        <p>This is the start of the #{activeChannel.name} channel. Connect with others in {displayServer.name}!</p>
                    </div>

                    <div className={styles.serverMessage}>
                        <div className={styles.userAvatar}></div>
                        <div className={styles.messageContentWrapper}>
                            <div className={styles.userName}>Nova AI <span className={styles.timestamp}>Today at 10:00 AM</span></div>
                            <div className={styles.messageText}>Welcome everyone to the {activeChannel.name} channel!</div>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className={groupStyles.inputArea}>
                    <input type="text" className={groupStyles.inputField} placeholder={`Message #${activeChannel.name}`} />
                </div>
            </div>
        </div>
    );
}
