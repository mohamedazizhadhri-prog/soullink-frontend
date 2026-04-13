"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Loader2, Search, UserPlus, Users } from "lucide-react";
import styles from "./Panels.module.css";
import localStyles from "./InviteFriendsPanel.module.css";
import api from "@/lib/api";

interface Friend {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    onlineStatus: string;
}

interface InviteFriendsPanelProps {
    serverId: string;
    inviteCode: string;
    onClose: () => void;
}

export function InviteFriendsPanel({ serverId, inviteCode, onClose }: InviteFriendsPanelProps) {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!serverId) return;
        const fetchSuggestions = async () => {
            try {
                setIsLoading(true);
                const res = await api.get(`/communities/${serverId}/invite-suggestions`);
                setFriends(res.data.data.suggestions || []);
            } catch (err) {
                console.error("Failed to fetch invite suggestions:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSuggestions();
    }, [serverId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = (friendId: string) => {
        setInvitedIds(prev => new Set(prev).add(friendId));
    };

    const filtered = friends.filter(f =>
        f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.handle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h3>Invite Allies</h3>
                <button onClick={onClose} className={styles.closeBtn}>
                    <X size={18} />
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Share Code</div>
                    <div className={localStyles.inviteCodeSection}>
                        <input
                            className={localStyles.inviteCodeInput}
                            value={inviteCode}
                            readOnly
                        />
                        <button className={localStyles.copyBtn} onClick={handleCopy}>
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    {copied && <p className={localStyles.copySuccess}>Code synchronized to clipboard ✓</p>}
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Recruit Friends</div>
                    <div className={localStyles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Find a soul..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className={localStyles.friendsList}>
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                <div className={styles.emptyState}>
                                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                                    <p>Scanning the network...</p>
                                </div>
                            ) : filtered.length > 0 ? (
                                filtered.map((friend, idx) => (
                                    <motion.div 
                                        key={friend.id} 
                                        className={localStyles.friendItem}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                    >
                                        <div className={localStyles.friendAvatarWrapper}>
                                            {friend.avatarUrl ? (
                                                <img src={friend.avatarUrl} alt="" className={localStyles.friendAvatar} />
                                            ) : (
                                                <div className={localStyles.friendAvatarFallback}>
                                                    {friend.displayName[0]}
                                                </div>
                                            )}
                                            <div className={localStyles.presenceDot} data-status={friend.onlineStatus} />
                                        </div>
                                        <div className={localStyles.friendInfo}>
                                            <div className={localStyles.friendName}>{friend.displayName}</div>
                                            <div className={localStyles.friendHandle}>@{friend.handle}</div>
                                        </div>
                                        <button
                                            className={`${localStyles.inviteBtn} ${invitedIds.has(friend.id) ? localStyles.invited : ""}`}
                                            onClick={() => handleInvite(friend.id)}
                                            disabled={invitedIds.has(friend.id)}
                                        >
                                            {invitedIds.has(friend.id) ? "Sent" : <UserPlus size={16} />}
                                        </button>
                                    </motion.div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    <Users size={32} className="text-white/10" />
                                    <p>{searchQuery ? "No souls match your search" : "All your connections are here!"}</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
