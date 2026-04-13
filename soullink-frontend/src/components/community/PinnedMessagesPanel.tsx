"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pin, PinOff, Loader2, MessageSquare } from "lucide-react";
import styles from "./Panels.module.css";
import localStyles from "./PinnedMessagesPanel.module.css";
import api from "@/lib/api";

interface Message {
    id: string;
    content: string;
    createdAt: string;
    isPinned: boolean;
    author: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
    };
}

interface PinnedMessagesPanelProps {
    serverId: string;
    channelId: string;
    onClose: () => void;
    onUnpin?: (messageId: string) => void;
}

export function PinnedMessagesPanel({ serverId, channelId, onClose, onUnpin }: PinnedMessagesPanelProps) {
    const [pins, setPins] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPins = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/communities/${serverId}/channels/${channelId}/pinned`);
            setPins(res.data.data.messages);
        } catch (err) {
            console.error("Failed to fetch pinned messages:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPins();
    }, [serverId, channelId]);

    const handleUnpin = async (messageId: string) => {
        try {
            await api.patch(`/communities/${serverId}/channels/${channelId}/messages/${messageId}/pin`);
            setPins(prev => prev.filter(m => m.id !== messageId));
            if (onUnpin) onUnpin(messageId);
        } catch (err) {
            console.error("Failed to unpin message:", err);
        }
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h3>Pinned Messages</h3>
                <button onClick={onClose} className={styles.closeBtn}>
                    <X size={18} />
                </button>
            </div>

            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <div className={styles.emptyState}>
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                            <p>Searching the archives...</p>
                        </div>
                    ) : pins.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Pin size={32} className="text-white/10" />
                            <p>No secrets pinned here yet.</p>
                        </div>
                    ) : (
                        <div className={localStyles.list}>
                            {pins.map((msg, idx) => (
                                <motion.div 
                                    key={msg.id} 
                                    className={localStyles.pinItem}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <div className={localStyles.itemHeader}>
                                        <div className={localStyles.authorInfo}>
                                            {msg.author.avatarUrl ? (
                                                <img src={msg.author.avatarUrl} alt="" className={localStyles.miniAvatar} />
                                            ) : (
                                                <div className={localStyles.avatarFallback}>{msg.author.displayName[0]}</div>
                                            )}
                                            <div className={localStyles.meta}>
                                                <span className={localStyles.authorName}>{msg.author.displayName}</span>
                                                <span className={localStyles.date}>
                                                    {new Date(msg.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            className={localStyles.unpinBtn} 
                                            onClick={() => handleUnpin(msg.id)}
                                            title="Unpin"
                                        >
                                            <PinOff size={14} />
                                        </button>
                                    </div>
                                    <div className={localStyles.itemBody}>
                                        {msg.content}
                                    </div>
                                    <div className={localStyles.footer}>
                                        <button className={localStyles.jumpBtn}>
                                            <MessageSquare size={12} /> Jump to Message
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
