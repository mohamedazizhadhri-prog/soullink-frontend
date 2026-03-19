"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus, Check, Loader2, Clock } from 'lucide-react';
import styles from './AddFriendModal.module.css';
import api from '@/lib/api';

interface UserSearchResult {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
}

interface AddFriendModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sentRequests, setSentRequests] = useState<string[]>([]);
    const [pendingIncoming, setPendingIncoming] = useState<string[]>([]);
    const [existingFriends, setExistingFriends] = useState<string[]>([]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        try {
            setIsSearching(true);
            const [searchRes, sentRes, pendingRes, friendsRes] = await Promise.all([
                api.get(`/users/search?q=${searchQuery}`),
                api.get('/friends/sent'),
                api.get('/friends/pending'),
                api.get('/friends')
            ]);

            setResults(searchRes.data.data.users);
            setSentRequests(sentRes.data.data.requests.map((r: any) => r.receiver.id));
            setPendingIncoming(pendingRes.data.data.requests.map((r: any) => r.sender.id));
            setExistingFriends(friendsRes.data.data.friends.map((f: any) => f.id));
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const sendRequest = async (userId: string) => {
        try {
            await api.post('/friends/request', { receiverId: userId });
            setSentRequests(prev => [...prev, userId]);
        } catch (err: any) {
            console.error('Failed to send friend request:', err.response?.data?.message || err.message);
            alert(err.response?.data?.message || 'Failed to send friend request');
        }
    };

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
                    >
                        <div className={styles.header}>
                            <h2>Add Friend</h2>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSearch} className={styles.searchBox}>
                            <Search className={styles.searchIcon} size={18} />
                            <input
                                type="text"
                                placeholder="Search by handle or display name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" disabled={isSearching}>
                                {isSearching ? <Loader2 className={styles.spin} size={18} /> : 'Search'}
                            </button>
                        </form>

                        <div className={styles.results}>
                            {results.length > 0 ? (
                                results.map(user => (
                                    <div key={user.id} className={styles.userRow}>
                                        <div className={styles.userInfo}>
                                            <div className={styles.avatar}>
                                                {user.avatarUrl ? (
                                                    <img src={user.avatarUrl} alt={user.displayName} />
                                                ) : (
                                                    <span>{user.displayName[0]}</span>
                                                )}
                                            </div>
                                            <div className={styles.names}>
                                                <span className={styles.displayName}>{user.displayName}</span>
                                                <span className={styles.handle}>@{user.handle}</span>
                                            </div>
                                        </div>
                                        {existingFriends.includes(user.id) ? (
                                            <div className={styles.friendsBadge}>
                                                <Check size={16} /> Friends
                                            </div>
                                        ) : sentRequests.includes(user.id) ? (
                                            <div className={styles.sentBadge}>
                                                <Clock size={16} /> Pending
                                            </div>
                                        ) : pendingIncoming.includes(user.id) ? (
                                            <div className={styles.pendingBadge}>
                                                <UserPlus size={16} /> Accept?
                                            </div>
                                        ) : (
                                            <button
                                                className={styles.addRequestBtn}
                                                onClick={() => sendRequest(user.id)}
                                            >
                                                <UserPlus size={16} /> Request
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                searchQuery && !isSearching && (
                                    <div className={styles.empty}>No users found.</div>
                                )
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
