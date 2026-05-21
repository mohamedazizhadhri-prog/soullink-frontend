"use client";

import React, { useState, useEffect } from "react";
import styles from "./FriendsView.module.css";
import { UserPlus, UserCheck, Clock, Send, MessageSquare, UserMinus, Search, Check, X, Trash2 } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

type Tab = "all" | "pending" | "sent" | "add";

import { useFriendsList } from "@/hooks/useFriendsList";
import { useNovaProactive } from "@/hooks/useNovaProactive";

export function FriendsView() {
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const {
        friends, pending, sent, loading, searchQuery, setSearchQuery,
        handleRespond: baseRespond, handleRemove: handleRemoveBase, handleAddFriend, refresh
    } = useFriendsList();

    const { fireEvent } = useNovaProactive();

    const handleRespond = async (id: string, action: 'accept' | 'decline') => {
        // Capture request data BEFORE the API call clears it from state
        const request = pending.find(r => r.id === id);
        try {
            await baseRespond(id, action);
            // Nova reacts to accepted friend requests
            if (action === 'accept' && request?.sender) {
                fireEvent('friend_accepted', {
                    friendName: request.sender.displayName || 'someone',
                    friendHandle: request.sender.handle || '',
                });
            }
        } catch (e: any) {
            alert(e.response?.data?.message || "Failed to process request");
        }
    };

    const handleRemove = async (fid: string) => {
        if (!confirm("Remove friend?")) return;
        try { await handleRemoveBase(fid); } catch (e) { console.error(e); }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}><UserCheck size={28} className={styles.titleIcon} /><h1>Social Hub</h1></div>
                <div className={styles.tabs}>
                    {["all", "pending", "sent"].map((t: any) => (
                        <button key={t} className={`${styles.tab} ${activeTab === t ? styles.activeTab : ''}`} onClick={() => setActiveTab(t)}>
                            {t.charAt(0).toUpperCase() + t.slice(1)} <span className={styles.tabCount}>{(t === 'all' ? friends : t === 'pending' ? pending : sent).length}</span>
                        </button>
                    ))}
                    <button className={`${styles.tab} ${activeTab === 'add' ? styles.addTabActive : styles.addTab}`} onClick={() => setActiveTab('add')}>Add Friend</button>
                </div>
            </header>
            <div className={styles.content}>
                {loading ? <div className={styles.emptyState}><p>Synchronizing...</p></div> : (
                    <div className={styles.list}>
                        {activeTab === 'all' && (friends.length === 0 ? <p className={styles.emptyState}>No friends yet.</p> : friends.map(u => (
                            <div key={u.id} className={styles.card}>
                                <div className={styles.userInfo}>
                                    <div className={styles.avatar}><img src={u.avatarUrl || "/default-avatar.png"} alt="" /><div className={`${styles.presenceDot} ${styles[u.status?.toLowerCase()] || styles.offline}`}></div></div>
                                    <div className={styles.meta}><span className={styles.name}>{u.displayName}</span><span className={styles.handle}>@{u.handle}</span></div>
                                </div>
                                <div className={styles.cardActions}>
                                    <Link href={`/dm/${u.id}`} className={styles.iconBtn}><MessageSquare size={18} /></Link>
                                    <button onClick={() => handleRemove(u.friendshipId)} className={styles.iconBtn}><UserMinus size={18} /></button>
                                </div>
                            </div>
                        )))}
                        {activeTab === 'pending' && (pending.length === 0 ? <p className={styles.emptyState}>No pending requests.</p> : pending.map(r => (
                            <div key={r.id} className={styles.card}>
                                <div className={styles.userInfo}>
                                    <div className={styles.avatar}><img src={r.sender.avatarUrl || "/default-avatar.png"} alt="" /></div>
                                    <div className={styles.meta}><span className={styles.name}>{r.sender.displayName}</span><span className={styles.typeLabel}>Incoming</span></div>
                                </div>
                                <div className={styles.cardActions}>
                                    <button onClick={() => handleRespond(r.id, 'accept')} className={styles.acceptBtn}><Check size={18} /></button>
                                    <button onClick={() => handleRespond(r.id, 'decline')} className={styles.declineBtn}><X size={18} /></button>
                                </div>
                            </div>
                        )))}
                        {activeTab === 'sent' && (sent.length === 0 ? <p className={styles.emptyState}>No sent requests.</p> : sent.map(r => (
                            <div key={r.id} className={styles.card}>
                                <div className={styles.userInfo}>
                                    <div className={styles.avatar}><img src={r.receiver.avatarUrl || "/default-avatar.png"} alt="" /></div>
                                    <div className={styles.meta}><span className={styles.name}>{r.receiver.displayName}</span><span className={styles.typeLabel}>Outgoing</span></div>
                                </div>
                                <div className={styles.cardActions}><button onClick={() => handleRespond(r.id, 'decline')} className={styles.declineBtn}>Cancel</button></div>
                            </div>
                        )))}
                        {activeTab === 'add' && <div className={styles.addSection}>
                            <h2>Find Souls</h2>
                            <div className={styles.searchBox}>
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Handle..." />
                                <button
                                    onClick={async () => {
                                        try {
                                            await handleAddFriend(searchQuery);
                                            // Nova asks if you know this person
                                            fireEvent('friend_request_sent', {
                                                targetHandle: searchQuery,
                                            });
                                            setActiveTab('sent');
                                        } catch (e: any) {
                                            alert(e.message || "Operation failed");
                                        }
                                    }}
                                    className={styles.searchBtn}
                                >
                                    <Search size={20} />
                                </button>
                            </div>
                        </div>}
                    </div>
                )}
            </div>
        </div>
    );
}
