"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket';
import { WatchMember, WatchReaction } from '@/types/watch-party.types';
import { aiService } from '@/services/aiService';

export interface WatchCursor {
    userId: string;
    displayName: string;
    x: number; // 0–100 percentage relative to player
    y: number;
    color: string;
}

// Deterministic color from userId
const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#C9B1FF', '#FF8E53', '#00D2D3', '#FF9FF3'];
function colorForUser(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
    return USER_COLORS[hash % USER_COLORS.length];
}

export interface JoinNotification {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    timestamp: number;
}

export function useWatchParty(sessionId: string) {
    const [members, setMembers] = useState<WatchMember[]>([]);
    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timestamp, setTimestamp] = useState(0);
    const [isLeader, setIsLeader] = useState(false);
    const [reactions, setReactions] = useState<WatchReaction[]>([]);
    const [cursors, setCursors] = useState<Map<string, WatchCursor>>(new Map());
    const [joinNotifications, setJoinNotifications] = useState<JoinNotification[]>([]);

    const isLeaderRef = useRef(false);
    const videoIdRef = useRef<string | null>(null);
    const membersRef = useRef<WatchMember[]>([]);
    const cursorThrottleRef = useRef<number>(0);
    const cursorTimersRef = useRef<Map<string, number>>(new Map());
    const hasReceivedSyncRef = useRef(false);
    const leaveDebounceRef = useRef<number | null>(null);
    // Tracks last video Nova commented on — prevents duplicate reactions
    const lastNotifiedVideoRef = useRef<string | null>(null);

    // Nova reacts to new videos after a 15-second settle delay
    useEffect(() => {
        if (!videoId || !videoTitle) return;
        if (videoId === lastNotifiedVideoRef.current) return;

        const timer = setTimeout(() => {
            lastNotifiedVideoRef.current = videoId;
            aiService.sendEvent('watching_youtube', {
                videoTitle: videoTitle || 'a video',
                videoId,
            }).catch(() => {});
        }, 15000);

        return () => clearTimeout(timer);
    }, [videoId, videoTitle]);

    useEffect(() => {
        isLeaderRef.current = isLeader;
    }, [isLeader]);

    useEffect(() => {
        videoIdRef.current = videoId;
    }, [videoId]);

    // Join session on mount
    useEffect(() => {
        if (!sessionId) return;

        const handleSync = (data: any) => {
            const myId = socketService.getUserId();
            console.log("[WP-HOOK] 🔄 RECEIVED STATE SYNC:", data);
            hasReceivedSyncRef.current = true;
            videoIdRef.current = data.videoId ?? null;
            setVideoId(data.videoId ?? null);
            setVideoTitle(data.videoTitle ?? null);
            setIsPlaying(data.isPlaying ?? false);
            setTimestamp(data.timestamp ?? 0);
            setIsLeader(data.hostId === myId);
        };

        const handleMemberJoined = (member: WatchMember) => {
            setMembers(prev => {
                if (prev.find(m => m.userId === member.userId)) return prev;
                const newMembers = [...prev, member];
                membersRef.current = newMembers;
                return newMembers;
            });
            // Show join notification to the host/existing members
            const notif: JoinNotification = {
                id: `${member.userId}-${Date.now()}`,
                displayName: member.displayName || 'Someone',
                avatarUrl: member.avatarUrl || null,
                timestamp: Date.now(),
            };
            setJoinNotifications(prev => [...prev, notif]);
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                setJoinNotifications(prev => prev.filter(n => n.id !== notif.id));
            }, 5000);
        };

        const handleMemberLeft = ({ userId }: { userId: string }) => {
            setMembers(prev => {
                const newMembers = prev.filter(m => m.userId !== userId);
                membersRef.current = newMembers;
                return newMembers;
            });
            setCursors(prev => {
                const next = new Map(prev);
                next.delete(userId);
                return next;
            });
        };

        const handlePlay = ({ timestamp }: { timestamp: number }) => {
            setIsPlaying(true);
            setTimestamp(timestamp);
        };

        const handlePause = ({ timestamp }: { timestamp: number }) => {
            setIsPlaying(false);
            setTimestamp(timestamp);
        };

        const handleSeek = ({ timestamp }: { timestamp: number }) => {
            setTimestamp(timestamp);
        };

        const handleVideoChanged = (data: any) => {
            console.log("WP VIDEO CHANGED:", data);
            const isNewVideo = videoIdRef.current !== data.videoId;
            videoIdRef.current = data.videoId ?? null;
            setVideoId(data.videoId ?? null);
            setVideoTitle(data.title ?? null);
            // Only reset playback state if this is a genuinely new video.
            // When a guest joins, state-sync already has the correct timestamp
            // and isPlaying; this event is just to ensure the player loads.
            if (isNewVideo) {
                setIsPlaying(true);
                setTimestamp(0);
            }
        };

        const handleReaction = (reaction: WatchReaction) => {
            setReactions(prev => [...prev.slice(-20), reaction]);
        };

        const handleHeartbeat = (data: any) => {
            if (!isLeaderRef.current) {
                setIsPlaying(data.isPlaying);
                setTimestamp(data.timestamp);
            }
        };

        const handleRequestSync = () => {
            if (isLeaderRef.current) {
                console.log("[WP-HOOK] 📢 POKE RECEIVED: Broadcasting state as Host");
                socketService.emit('watch:change-video', { 
                    sessionId, 
                    videoId: videoIdRef.current, 
                    title: videoTitle, 
                    thumbnail: null 
                });
                if (isPlaying) emitPlay(0);
                else emitPause(0);
            }
        };

        const handleCursor = (data: { userId: string; displayName: string; x: number; y: number }) => {
            setCursors(prev => {
                const next = new Map(prev);
                next.set(data.userId, {
                    userId: data.userId,
                    displayName: data.displayName,
                    x: data.x,
                    y: data.y,
                    color: colorForUser(data.userId),
                });
                return next;
            });
            // Auto-remove cursor after 15s of no movement
            const existing = cursorTimersRef.current.get(data.userId);
            if (existing) clearTimeout(existing);
            cursorTimersRef.current.set(data.userId, window.setTimeout(() => {
                setCursors(prev => {
                    const next = new Map(prev);
                    next.delete(data.userId);
                    return next;
                });
                cursorTimersRef.current.delete(data.userId);
            }, 15000));
        };

        const handleEnded = () => {
            // Soft-reset state instead of hard redirect — lets the UI show
            // a "session ended" overlay rather than abruptly leaving the page.
            setVideoId(null);
            setVideoTitle(null);
            setIsPlaying(false);
            setTimestamp(0);
            setMembers([]);
            setCursors(new Map());
        };

        // 1. Register listeners FIRST
        socketService.on('watch:state-sync', handleSync);
        socketService.on('watch:member-joined', handleMemberJoined);
        socketService.on('watch:member-left', handleMemberLeft);
        socketService.on('watch:play', handlePlay);
        socketService.on('watch:pause', handlePause);
        socketService.on('watch:seek', handleSeek);
        socketService.on('watch:video-changed', handleVideoChanged);
        socketService.on('watch:reaction', handleReaction);
        socketService.on('watch:heartbeat', handleHeartbeat);
        socketService.on('watch:cursor', handleCursor);
        socketService.on('watch:ended', handleEnded);
        socketService.on('watch:request-sync', handleRequestSync);

        // Reconnect handler: re-join session after socket reconnect
        const handleReconnect = () => {
            console.log("[WP-HOOK] 🔄 Socket reconnected, re-joining session:", sessionId);
            socketService.emit('watch:join', { sessionId });
        };
        socketService.on('connect', handleReconnect);

        // Cancel any pending leave from a previous Strict Mode cycle
        if (leaveDebounceRef.current) {
            clearTimeout(leaveDebounceRef.current);
            leaveDebounceRef.current = null;
        }

        // 2. Then EMIT join
        console.log("[WP-HOOK] 🚀 EMITTING JOIN FOR SESSION:", sessionId);
        socketService.emit('watch:join', { sessionId });

        // Hammer logic: if no videoId after 4s, ask again — but only if we
        // haven't received a sync yet (avoids unnecessary re-requests).
        const hammerTimeout = setTimeout(() => {
            if (!hasReceivedSyncRef.current && !videoIdRef.current) {
                console.log("[WP-HOOK] 🔨 NO VIDEO DETECTED AFTER 4s - FORCING RE-SYNC...");
                socketService.emit('watch:request-sync', { sessionId });
            }
        }, 4000);

        return () => {
            clearTimeout(hammerTimeout);
            // Clear all cursor expiry timers
            for (const timer of cursorTimersRef.current.values()) clearTimeout(timer);
            cursorTimersRef.current.clear();
            console.log("[WP-HOOK] 🚪 SCHEDULING LEAVE FOR SESSION:", sessionId);
            // Debounce leave to survive React Strict Mode's mount→unmount→remount
            // cycle (typically <100ms). If the component remounts quickly, the
            // new effect will cancel this timeout and re-join instead.
            leaveDebounceRef.current = window.setTimeout(() => {
                socketService.emit('watch:leave', { sessionId });
                leaveDebounceRef.current = null;
            }, 200);
            socketService.off('watch:state-sync', handleSync);
            socketService.off('watch:member-joined', handleMemberJoined);
            socketService.off('watch:member-left', handleMemberLeft);
            socketService.off('watch:play', handlePlay);
            socketService.off('watch:pause', handlePause);
            socketService.off('watch:seek', handleSeek);
            socketService.off('watch:video-changed', handleVideoChanged);
            socketService.off('watch:reaction', handleReaction);
            socketService.off('watch:heartbeat', handleHeartbeat);
            socketService.off('watch:cursor', handleCursor);
            socketService.off('watch:ended', handleEnded);
            socketService.off('watch:request-sync', handleRequestSync);
            socketService.off('connect', handleReconnect);
        };
    }, [sessionId]);

    const emitPlay = useCallback((ts: number) => {
        socketService.emit('watch:play', { sessionId, timestamp: ts });
    }, [sessionId]);

    const emitPause = useCallback((ts: number) => {
        socketService.emit('watch:pause', { sessionId, timestamp: ts });
    }, [sessionId]);

    const emitSeek = useCallback((ts: number) => {
        socketService.emit('watch:seek', { sessionId, timestamp: ts });
    }, [sessionId]);

    const changeVideo = useCallback((vId: string, title: string, thumb: string) => {
        // Optimistic update
        setVideoId(vId);
        setVideoTitle(title);
        setIsPlaying(true);
        setTimestamp(0);
        socketService.emit('watch:change-video', { sessionId, videoId: vId, title, thumbnail: thumb });
    }, [sessionId]);

    const sendReaction = useCallback((emoji: string) => {
        socketService.emit('watch:reaction', { sessionId, emoji });
    }, [sessionId]);

    const inviteFriends = useCallback((userIds: string[]) => {
        socketService.emit('watch:invite', { sessionId, targetUserIds: userIds });
    }, [sessionId]);

    // Throttled cursor emitter — max 20 events/sec
    const emitCursor = useCallback((x: number, y: number) => {
        const now = Date.now();
        if (now - cursorThrottleRef.current < 50) return;
        cursorThrottleRef.current = now;
        socketService.emit('watch:cursor', { sessionId, x, y });
    }, [sessionId]);

    const clearJoinNotification = useCallback((id: string) => {
        setJoinNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return {
        members,
        videoId,
        videoTitle,
        isPlaying,
        timestamp,
        isLeader,
        reactions,
        cursors,
        joinNotifications,
        emitPlay,
        emitPause,
        emitSeek,
        changeVideo,
        sendReaction,
        inviteFriends,
        emitCursor,
        clearJoinNotification,
    };
}
