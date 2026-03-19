"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./ServerView.module.css";
import { Hash, Volume2, ChevronDown, Bell, Users, HelpCircle, Send } from "lucide-react";
import Link from "next/link";
import groupStyles from "./GroupView.module.css";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";

interface Message {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
    };
}

export function ServerView({ server, channelId }: { server: any, channelId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeChannel = server?.channels?.find((c: any) => c.id === channelId) || server?.channels?.[0];

    useEffect(() => {
        if (!activeChannel) return;

        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const response = await api.get(`/communities/${server.id}/channels/${activeChannel.id}/messages`);
                setMessages(response.data.data.messages);
            } catch (err) {
                console.error('Failed to fetch messages:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();

        // Join channel room
        socketService.connect();
        socketService.emit('join:community', { communityId: server.id });

        const handleNewMessage = (data: { channelId: string, message: Message }) => {
            if (data && data.channelId === activeChannel.id) {
                setMessages(prev => [...prev, data.message]);
            }
        };

        socketService.on('community:message', handleNewMessage);

        return () => {
            socketService.off('community:message', handleNewMessage);
        };
    }, [activeChannel?.id, server?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChannel) return;

        const content = newMessage;
        setNewMessage("");

        try {
            await api.post(`/communities/${server.id}/channels/${activeChannel.id}/messages`, { content });
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    if (!server) return null;

    return (
        <div className={styles.container}>
            {/* Channel List Sidebar */}
            <div className={styles.channelList}>
                <div className={styles.serverHeader}>
                    {server.name} <ChevronDown size={16} />
                </div>

                <div className={styles.channelGroup}>
                    <div className={styles.channelLabel}>TEXT CHANNELS</div>
                    {server.channels?.filter((c: any) => c.type === 'TEXT').map((channel: any) => (
                        <Link
                            key={channel.id}
                            href={`/server/${server.id}/${channel.id}`}
                            className={`${styles.channelItem} ${activeChannel?.id === channel.id ? styles.activeChannel : ""}`}
                        >
                            <Hash size={18} /> {channel.name}
                        </Link>
                    ))}

                    <div className={styles.channelLabel} style={{ marginTop: 16 }}>VOICE CHANNELS</div>
                    {server.channels?.filter((c: any) => c.type === 'VOICE').map((channel: any) => (
                        <div key={channel.id} className={styles.channelItem}>
                            <Volume2 size={18} /> {channel.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={styles.chatArea}>
                <header className={styles.chatHeader}>
                    <Hash size={24} className={styles.hashtag} />
                    <span>{activeChannel?.name || "Select Channel"}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, color: 'var(--color-text-secondary)' }}>
                        <Bell size={20} />
                        <Users size={20} />
                        <HelpCircle size={20} />
                    </div>
                </header>

                <div className={styles.messagesScroll}>
                    {messages.length === 0 && !isLoading && (
                        <div className={styles.welcomeBanner}>
                            <h3>Welcome to #{activeChannel?.name}!</h3>
                            <p>This is the start of the #{activeChannel?.name} channel.</p>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div key={msg.id} className={styles.serverMessage}>
                            <div className={styles.userAvatar}>
                                {msg.user.avatarUrl ? (
                                    <img src={msg.user.avatarUrl} alt={msg.user.displayName} />
                                ) : (
                                    <span>{msg.user.displayName[0]}</span>
                                )}
                            </div>
                            <div className={styles.messageContentWrapper}>
                                <div className={styles.userName}>
                                    {msg.user.displayName}
                                    <span className={styles.timestamp}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={styles.messageText}>{msg.content}</div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form className={groupStyles.inputArea} onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        className={groupStyles.inputField}
                        placeholder={`Message #${activeChannel?.name}`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className={styles.sendBtn} style={{ display: 'none' }} />
                </form>
            </div>
        </div>
    );
}
