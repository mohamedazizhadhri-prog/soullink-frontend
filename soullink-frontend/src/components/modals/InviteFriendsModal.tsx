"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Loader2, Search } from "lucide-react";
import styles from "./InviteFriendsModal.module.css";
import api from "@/lib/api";

interface Friend {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    onlineStatus: string;
}

interface InviteFriendsModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverId: string;
    inviteCode: string;
}

export function InviteFriendsModal({ isOpen, onClose, serverId, inviteCode }: InviteFriendsModalProps) {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const fetchSuggestions = async () => {
            try {
                setIsLoading(true);
                const res = await api.get(`/communities/${serverId}/invite-suggestions`);
                setFriends(res.data.data.suggestions);
            } catch (err) {
                console.error("Failed to fetch invite suggestions:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSuggestions();
    }, [isOpen, serverId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = (friendId: string) => {
        // Mark as invited in UI (notification would be sent via backend in a full implementation)
        setInvitedIds(prev => new Set(prev).add(friendId));
    };

    const filtered = friends.filter(f =>
        f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.handle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className={styles.modal}
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className={styles.header}>
                            <h2>Invite Friends</h2>
                            <p>Share the invite code or pick friends to invite</p>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.inviteCodeSection}>
                            <input
                                className={styles.inviteCodeInput}
                                value={inviteCode}
                                readOnly
                            />
                            <button className={styles.copyBtn} onClick={handleCopy}>
                                {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                            </button>
                        </div>

                        <div className={styles.divider}>or invite a friend</div>

                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder="Search friends..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className={styles.friendsList}>
                            {isLoading ? (
                                <div className={styles.loading}>
                                    <Loader2 size={24} className="animate-spin" />
                                </div>
                            ) : filtered.length > 0 ? (
                                filtered.map(friend => (
                                    <div key={friend.id} className={styles.friendItem}>
                                        {friend.avatarUrl ? (
                                            <img src={friend.avatarUrl} alt="" className={styles.friendAvatar} />
                                        ) : (
                                            <div className={styles.friendAvatarFallback}>
                                                {friend.displayName[0]}
                                            </div>
                                        )}
                                        <div className={styles.friendInfo}>
                                            <div className={styles.friendName}>{friend.displayName}</div>
                                            <div className={styles.friendHandle}>@{friend.handle}</div>
                                        </div>
                                        <button
                                            className={`${styles.inviteBtn} ${invitedIds.has(friend.id) ? styles.invited : ""}`}
                                            onClick={() => handleInvite(friend.id)}
                                            disabled={invitedIds.has(friend.id)}
                                        >
                                            {invitedIds.has(friend.id) ? "Invited" : "Invite"}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.empty}>
                                    {searchQuery ? "No friends match your search" : "All your friends are already here!"}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
