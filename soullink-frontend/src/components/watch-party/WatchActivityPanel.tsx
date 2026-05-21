"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Minimize2, Search, Tv, MessageCircle, Send, Users } from 'lucide-react';
import { useWatchParty } from '@/hooks/useWatchParty';
import { YouTubePlayer } from './YouTubePlayer';
import { YouTubeBrowse } from './YouTubeBrowse';
import styles from './WatchActivityPanel.module.css';

interface WatchActivityPanelProps {
    sessionId: string;
    onClose: () => void;
    receiverId?: string;
    messages?: any[];
    friend?: any;
    isTyping?: boolean;
    onSendMessage?: (text: string) => void;
    onTyping?: (isTyping: boolean) => void;
}

type SideTab = 'browse' | 'chat';

export function WatchActivityPanel({
    sessionId,
    onClose,
    receiverId,
    messages = [],
    friend,
    isTyping,
    onSendMessage,
    onTyping,
}: WatchActivityPanelProps) {
    const {
        videoId,
        videoTitle,
        isPlaying,
        timestamp,
        isLeader,
        members,
        joinNotifications,
        emitPlay,
        emitPause,
        changeVideo,
        clearJoinNotification,
    } = useWatchParty(sessionId);

    const [sideTab, setSideTab] = useState<SideTab>('browse');
    const [minimized, setMinimized] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-switch to chat for non-leaders when video starts
    useEffect(() => {
        if (!isLeader && videoId && sideTab === 'browse') {
            setSideTab('chat');
        }
    }, [isLeader, videoId, sideTab]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (sideTab === 'chat' && chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages, sideTab, isTyping]);

    const handleVideoSelect = useCallback((vId: string, title: string, thumbnail: string) => {
        changeVideo(vId, title, thumbnail);
        setSideTab('chat');
    }, [changeVideo]);

    const handlePlayerStateChange = useCallback((state: { isPlaying: boolean; timestamp: number }) => {
        if (state.isPlaying !== isPlaying) {
            if (state.isPlaying) emitPlay(state.timestamp);
            else emitPause(state.timestamp);
        }
    }, [isPlaying, emitPlay, emitPause]);

    const handleSendChat = () => {
        const text = chatInput.trim();
        if (!text || !onSendMessage) return;
        onSendMessage(text);
        setChatInput('');
        if (onTyping) onTyping(false);
    };

    const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendChat();
            return;
        }
        if (onTyping) {
            onTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => onTyping(false), 1500);
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (minimized) {
        return (
            <div className={styles.minimizedBar}>
                <Tv size={16} className={styles.miniIcon} />
                <span className={styles.miniTitle}>{videoTitle || 'Watch Party'}</span>
                <div className={styles.miniMembers}>
                    {members.slice(0, 3).map(m => (
                        <div key={m.userId} className={styles.miniAvatar} title={m.displayName}>
                            {m.avatarUrl
                                ? <img src={m.avatarUrl} alt={m.displayName} />
                                : <span>{m.displayName[0]}</span>
                            }
                        </div>
                    ))}
                    {members.length > 3 && <div className={styles.miniAvatar}>+{members.length - 3}</div>}
                </div>
                <button className={styles.miniBtn} onClick={() => setMinimized(false)} title="Expand">↑</button>
                <button className={styles.miniBtn} onClick={onClose} title="Close"><X size={14} /></button>
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            {/* ── Join Notification Toasts ──────────── */}
            <div className={styles.toastContainer}>
                {joinNotifications.map(notif => (
                    <div key={notif.id} className={styles.toast}>
                        <Users size={14} />
                        <span>{notif.displayName} joined the watch party!</span>
                    </div>
                ))}
            </div>

            {/* ── Header ─────────────────────────────── */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Tv size={16} className={styles.headerIcon} />
                    <span className={styles.headerTitle}>
                        {videoTitle ? (
                            <span className={styles.nowPlaying} title={videoTitle}>▶ {videoTitle}</span>
                        ) : 'YouTube Watch Party'}
                    </span>
                    {!isLeader && videoId && (
                        <span className={styles.syncBadge}>
                            <span className={styles.syncDot} />
                            Synced
                        </span>
                    )}
                </div>
                <div className={styles.headerMembers}>
                    {members.map(m => (
                        <div key={m.userId} className={styles.avatar} title={m.displayName}>
                            {m.avatarUrl
                                ? <img src={m.avatarUrl} alt={m.displayName} />
                                : <span>{m.displayName[0]}</span>
                            }
                        </div>
                    ))}
                    {members.length > 0 && (
                        <span className={styles.memberCount}>{members.length} watching</span>
                    )}
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.iconBtn} onClick={() => setMinimized(true)} title="Minimize">
                        <Minimize2 size={15} />
                    </button>
                    <button className={styles.iconBtn} onClick={onClose} title="Close">
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* ── Body ───────────────────────────────── */}
            {!videoId ? (
                /* Full-width browse before video is selected */
                <div className={styles.fullBrowse}>
                    <YouTubeBrowse onSelect={handleVideoSelect} variant="wide" />
                </div>
            ) : (
                /* Split view: player + sidebar when video is active */
                <div className={styles.body}>
                    {/* Player area */}
                    <div className={styles.playerArea}>
                        <YouTubePlayer
                            videoId={videoId}
                            isPlaying={isPlaying}
                            timestamp={timestamp}
                            isLeader={isLeader}
                            onStateChange={handlePlayerStateChange}
                        />
                    </div>

                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        {/* Tabs */}
                        <div className={styles.tabs}>
                            <button
                                className={`${styles.tab} ${sideTab === 'browse' ? styles.tabActive : ''}`}
                                onClick={() => setSideTab('browse')}
                            >
                                <Search size={13} /> Browse
                            </button>
                            <button
                                className={`${styles.tab} ${sideTab === 'chat' ? styles.tabActive : ''}`}
                                onClick={() => setSideTab('chat')}
                            >
                                <MessageCircle size={13} /> Chat
                            </button>
                        </div>

                        <div className={styles.sideContent}>
                            {sideTab === 'browse' ? (
                                <YouTubeBrowse onSelect={handleVideoSelect} variant="sidebar" />
                            ) : (
                                <div className={styles.chatPanel}>
                                    {/* Messages */}
                                    <div className={styles.chatMessages} ref={chatScrollRef}>
                                        {messages.length === 0 ? (
                                            <div className={styles.chatEmpty}>
                                                <MessageCircle size={32} />
                                                <p>No messages yet</p>
                                                <span>Start chatting while you watch</span>
                                            </div>
                                        ) : (
                                            messages.map((msg: any) => {
                                                const isOwn = msg.senderId !== receiverId;
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`${styles.chatBubble} ${isOwn ? styles.chatBubbleOwn : styles.chatBubbleFriend}`}
                                                    >
                                                        {!isOwn && (
                                                            <span className={styles.chatSender}>
                                                                {friend?.displayName || 'Friend'}
                                                            </span>
                                                        )}
                                                        <span className={styles.chatText}>{msg.content}</span>
                                                        <span className={styles.chatTime}>{formatTime(msg.createdAt)}</span>
                                                    </div>
                                                );
                                            })
                                        )}
                                        {isTyping && (
                                            <div className={`${styles.chatBubble} ${styles.chatBubbleFriend}`}>
                                                <span className={styles.chatSender}>{friend?.displayName || 'Friend'}</span>
                                                <span className={styles.typingIndicator}>
                                                    <span />
                                                    <span />
                                                    <span />
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Chat Input */}
                                    <div className={styles.chatInputArea}>
                                        <textarea
                                            className={styles.chatTextarea}
                                            placeholder="Type a message..."
                                            rows={1}
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={handleChatKeyDown}
                                        />
                                        <button
                                            className={styles.chatSendBtn}
                                            onClick={handleSendChat}
                                            disabled={!chatInput.trim()}
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
