"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useChat } from '@/hooks/useChat';
import { YouTubePlayer } from '@/components/watch-party/YouTubePlayer';
import { YouTubeBrowse } from '@/components/watch-party/YouTubeBrowse';
import { socketService } from '@/lib/socket';
import styles from './WatchPartyPage.module.css';

/* ── Helpers ─────────────────────────────────────────────── */

/** Extract partner ID from a DM watch-party session ID.
 *  Format: wp_<userA>_<userB>  ( underscores from roomId colons ) */
function getPartnerId(sessionId: string): string | null {
    if (!sessionId.startsWith('wp_')) return null;
    const parts = sessionId.slice(3).split('_');
    const myId = socketService.getUserId();
    return parts.find(id => id !== myId) || null;
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ── Chat Panel (sub-component so hooks are safe) ────────── */

function ChatPanel({ receiverId }: { receiverId: string }) {
    const { messages, friend, isTyping, handleUnifiedSend } = useChat(receiverId);
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim()) return;
        handleUnifiedSend(input.trim());
        setInput('');
    };

    const myId = socketService.getUserId();

    return (
        <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>
                <div className={styles.chatHeaderLeft}>
                    <div className={styles.chatHeaderAvatar}>
                        {friend?.avatarUrl ? (
                            <img src={friend.avatarUrl} alt={friend.displayName} />
                        ) : (
                            <span>{friend?.displayName?.[0] || '?'}</span>
                        )}
                    </div>
                    <div className={styles.chatHeaderInfo}>
                        <span className={styles.chatHeaderName}>{friend?.displayName || 'Chat'}</span>
                        {isTyping && <span className={styles.chatTyping}>typing…</span>}
                    </div>
                </div>
            </div>

            <div className={styles.chatMessages}>
                {messages.length === 0 ? (
                    <div className={styles.chatEmpty}>
                        <span className={styles.chatEmptyEmoji}>👋</span>
                        <p>No messages yet.</p>
                        <p className={styles.chatEmptySub}>Say hi while you watch!</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMine = msg.senderId === myId;
                        return (
                            <div
                                key={msg.id}
                                className={`${styles.chatMessage} ${isMine ? styles.chatMine : ''}`}
                            >
                                <div className={styles.chatBubble}>{msg.content}</div>
                                <span className={styles.chatTime}>{formatTime(msg.createdAt)}</span>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div className={styles.chatInputArea}>
                <input
                    className={styles.chatInput}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message…"
                />
                <button
                    className={styles.chatSendBtn}
                    onClick={handleSend}
                    disabled={!input.trim()}
                    aria-label="Send message"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

/* ── Main Page ───────────────────────────────────────────── */

export default function WatchPartyPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const partnerId = useMemo(() => getPartnerId(sessionId), [sessionId]);

    const {
        members,
        videoId,
        videoTitle,
        isPlaying,
        timestamp,
        isLeader,
        emitPlay,
        emitPause,
        changeVideo,
    } = useWatchParty(sessionId);

    const [showBrowse, setShowBrowse] = useState(false);

    /* Auto-open browse for leader when no video */
    useEffect(() => {
        if (!videoId && isLeader) setShowBrowse(true);
        else if (videoId) setShowBrowse(false);
    }, [videoId, isLeader]);

    const handleVideoSelect = (vId: string, title: string, thumbnail: string) => {
        changeVideo(vId, title, thumbnail);
        setShowBrowse(false);
    };

    const handlePlayerStateChange = (state: { isPlaying: boolean; timestamp: number }) => {
        if (state.isPlaying !== isPlaying) {
            if (state.isPlaying) emitPlay(state.timestamp);
            else emitPause(state.timestamp);
        }
    };

    return (
        <div className={styles.page}>
            {/* ── Header ─────────────────────────────── */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                    </button>
                    <span className={styles.brand}>🎬 Watch Party</span>
                </div>

                <div className={styles.headerRight}>
                    {isLeader && (
                        <button
                            className={`${styles.findBtn} ${showBrowse ? styles.findBtnActive : ''}`}
                            onClick={() => setShowBrowse(s => !s)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            {showBrowse ? 'Close Browse' : 'Find Video'}
                        </button>
                    )}
                    <button className={styles.leaveBtn} onClick={() => router.push('/')}>
                        Leave
                    </button>
                </div>
            </header>

            {/* ── Main Content ───────────────────────── */}
            <main className={styles.main}>
                {/* Left: Video + Info */}
                <div className={styles.videoArea}>
                    <div className={styles.playerWrap}>
                        <YouTubePlayer
                            videoId={videoId}
                            isPlaying={isPlaying}
                            timestamp={timestamp}
                            isLeader={isLeader}
                            onStateChange={handlePlayerStateChange}
                        />
                    </div>

                    {/* Video metadata row */}
                    <div className={styles.videoInfo}>
                        <h1 className={styles.videoTitle}>
                            {videoTitle || 'Select a video to start watching together'}
                        </h1>

                        <div className={styles.videoMeta}>
                            <div className={styles.membersRow}>
                                {members.map(m => (
                                    <div key={m.userId} className={styles.memberChip} title={m.displayName}>
                                        {m.avatarUrl ? (
                                            <img src={m.avatarUrl} alt={m.displayName} />
                                        ) : (
                                            <div className={styles.chipPlaceholder}>{m.displayName[0]}</div>
                                        )}
                                        <span className={styles.memberName}>{m.displayName}</span>
                                        {m.userId === members[0]?.userId && (
                                            <span className={styles.hostBadge}>Host</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className={styles.statusBadge}>
                                {isLeader ? (
                                    <>
                                        <span className={styles.statusDot} style={{ background: '#FFD700' }} />
                                        You are hosting
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.statusDot} style={{ background: '#48BB78' }} />
                                        Synced with host
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar (chat or browse) */}
                <aside className={`${styles.sidebar} ${showBrowse ? styles.sidebarWide : ''}`}>
                    {showBrowse ? (
                        <YouTubeBrowse onSelect={handleVideoSelect} />
                    ) : partnerId ? (
                        <ChatPanel receiverId={partnerId} />
                    ) : (
                        <div className={styles.membersFallback}>
                            <h3>Session Members</h3>
                            {members.map(m => (
                                <div key={m.userId} className={styles.fallbackMember}>
                                    {m.displayName}
                                </div>
                            ))}
                        </div>
                    )}
                </aside>
            </main>
        </div>
    );
}
