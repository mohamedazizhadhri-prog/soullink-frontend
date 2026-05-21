"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WatchCursor } from '@/hooks/useWatchParty';

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

interface YouTubePlayerProps {
    videoId: string | null;
    isPlaying: boolean;
    timestamp: number;
    isLeader: boolean;
    cursors?: Map<string, WatchCursor>;
    onStateChange?: (state: { isPlaying: boolean; timestamp: number }) => void;
    onReady?: () => void;
    onCursorMove?: (x: number, y: number) => void;
}

export function YouTubePlayer({
    videoId,
    isPlaying,
    timestamp,
    isLeader,
    cursors,
    onStateChange,
    onReady,
    onCursorMove,
}: YouTubePlayerProps) {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isApiReady, setIsApiReady] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(!isLeader); // Guests start muted for instant autoplay
    const [apiLoadAttempt, setApiLoadAttempt] = useState(0);
    const [apiLoadError, setApiLoadError] = useState<string | null>(null);

    // Track the current videoId loaded in the player to avoid duplicate loads
    const loadedVideoIdRef = useRef<string | null>(null);

    // Monitor mute state
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current?.isMuted) {
                setIsMuted(playerRef.current.isMuted());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleUnmute = () => {
        if (playerRef.current) {
            playerRef.current.unMute();
            playerRef.current.playVideo();
            playerRef.current.seekTo(timestamp, true);
            setIsMuted(false);
        }
    };

    // Load YouTube API with retry logic
    useEffect(() => {
        if (window.YT && window.YT.Player) {
            setIsApiReady(true);
            setApiLoadError(null);
            return;
        }

        const scriptId = 'youtube-iframe-api-script';
        // Remove any previously-failed script tag so we can re-insert cleanly
        const existing = document.getElementById(scriptId);
        if (existing) existing.remove();

        const tag = document.createElement('script');
        tag.id = scriptId;
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        let timeoutId: number;

        window.onYouTubeIframeAPIReady = () => {
            clearTimeout(timeoutId);
            console.log("[WP-PLAYER] YT API Ready");
            setIsApiReady(true);
            setApiLoadError(null);
        };

        // If the callback hasn't fired within 8s, consider it a failure
        timeoutId = window.setTimeout(() => {
            if (!window.YT?.Player) {
                const msg = apiLoadAttempt >= 2
                    ? "Unable to reach YouTube. Please check your internet connection."
                    : "YouTube player failed to load. Retrying...";
                setApiLoadError(msg);
                if (apiLoadAttempt < 2) {
                    setApiLoadAttempt(prev => prev + 1);
                }
            }
        }, 8000);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [apiLoadAttempt]);

    // Initialize player ONCE when API is ready (not tied to videoId)
    useEffect(() => {
        if (!isApiReady || !containerRef.current || playerRef.current) return;

        console.log("[WP-PLAYER] Initializing YT Player (no video yet)");
        setError(null);

        playerRef.current = new window.YT.Player(containerRef.current, {
            height: '100%',
            width: '100%',
            videoId: '', // Start empty — we'll load the video separately
            playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                mute: isLeader ? 0 : 1,
                origin: typeof window !== 'undefined' ? window.location.origin : undefined,
                enablejsapi: 1,
                widget_referrer: typeof window !== 'undefined' ? window.location.origin : undefined,
            },
            events: {
                onReady: (event: any) => {
                    console.log("[WP-PLAYER] Player Ready");
                    setIsPlayerReady(true);
                    if (onReady) onReady();
                },
                onStateChange: (event: any) => {
                    if (isLeader) {
                        const state = {
                            isPlaying: event.data === window.YT.PlayerState.PLAYING,
                            timestamp: event.target.getCurrentTime(),
                        };
                        onStateChange?.(state);
                    }
                },
                onError: (e: any) => {
                    console.error("[WP-PLAYER] YT Error:", e.data);
                    if (e.data === 101 || e.data === 150) {
                        setError("This video cannot be played in embedded players. Please pick another video!");
                    } else {
                        setError("An error occurred with the YouTube player.");
                    }
                }
            }
        });

        // Only destroy on unmount — never on videoId change
        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
                setIsPlayerReady(false);
                loadedVideoIdRef.current = null;
            }
        };
    }, [isApiReady]); // Intentionally NOT depending on videoId

    // Handle videoId change — load via API instead of recreating player
    useEffect(() => {
        if (!isPlayerReady || !playerRef.current) return;

        // Clear error when a new video is selected
        if (videoId && error) setError(null);

        if (!videoId) {
            // No video — stop playback
            try {
                if (playerRef.current.getCurrentTime?.() > 0) {
                    playerRef.current.pauseVideo?.();
                }
            } catch (_) {}
            loadedVideoIdRef.current = null;
            return;
        }

        // Skip if already playing this exact video
        if (loadedVideoIdRef.current === videoId) {
            console.log("[WP-PLAYER] Already playing this video, skipping load");
            return;
        }

        console.log("[WP-PLAYER] Loading video:", videoId, "at", timestamp);
        loadedVideoIdRef.current = videoId;

        try {
            if (playerRef.current.loadVideoById) {
                playerRef.current.loadVideoById({
                    videoId,
                    startSeconds: timestamp || 0
                });
                if (isPlaying) {
                    playerRef.current.playVideo();
                    // Retry if autoplay blocked
                    setTimeout(() => {
                        if (playerRef.current && playerRef.current.getPlayerState?.() !== 1) {
                            console.log("[WP-PLAYER] Autoplay blocked, retrying...");
                            playerRef.current.playVideo();
                        }
                    }, 1000);
                }
            }
        } catch (e) {
            console.error("[WP-PLAYER] Error loading video:", e);
        }
    }, [videoId, isPlayerReady]);

    // Sync play/pause
    useEffect(() => {
        if (!isPlayerReady || !playerRef.current) return;
        try {
            const state = playerRef.current.getPlayerState?.();
            if (isPlaying && state !== 1) {
                playerRef.current.playVideo?.();
            }
            else if (!isPlaying && state === 1) {
                playerRef.current.pauseVideo?.();
            }
        } catch (_) {}
    }, [isPlaying, isPlayerReady]);

    // Sync timestamp drift (>2.5s)
    useEffect(() => {
        if (!isPlayerReady || !playerRef.current?.getCurrentTime) return;
        try {
            const drift = Math.abs(playerRef.current.getCurrentTime() - timestamp);
            if (drift > 2.5) {
                playerRef.current.seekTo(timestamp, true);
            }
        } catch (_) {}
    }, [timestamp, isPlayerReady]);

    // Mouse-move cursor broadcasting
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!onCursorMove || !wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onCursorMove(x, y);
    }, [onCursorMove]);

    return (
        <div
            ref={wrapperRef}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
            }}
            onMouseMove={handleMouseMove}
        >
            {/* YouTube player — always present for correct sizing */}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                }}
            />

            {/* Muted/Autoplay blocked overlay */}
            {isMuted && isPlaying && videoId && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 100,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    gap: 15,
                }}>
                    <div style={{ fontSize: '2rem' }}>🔊</div>
                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Video is playing muted to keep you in sync</div>
                    <button
                        onClick={handleUnmute}
                        style={{
                            background: '#7B68EE', color: '#fff',
                            border: 'none', borderRadius: '30px',
                            padding: '16px 32px', fontWeight: 800,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                            boxShadow: '0 8px 25px rgba(123, 104, 238, 0.4)',
                            fontSize: '1.1rem',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Click to Sync & Play
                    </button>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Playback will start immediately with sound</p>
                </div>
            )}

            {/* YouTube API load failure overlay */}
            {apiLoadError && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 100,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(10, 10, 18, 0.95)', color: '#fff', gap: 16,
                    padding: '40px', textAlign: 'center'
                }}>
                    <span style={{ fontSize: '3rem' }}>🌐</span>
                    <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#ff4757' }}>Connection Issue</p>
                    <p style={{ fontSize: '1rem', opacity: 0.8, margin: 0, maxWidth: '400px' }}>{apiLoadError}</p>
                    {apiLoadAttempt >= 2 && (
                        <button
                            onClick={() => { setApiLoadError(null); setApiLoadAttempt(0); }}
                            style={{
                                background: '#7B68EE', color: '#fff', border: 'none',
                                borderRadius: '30px', padding: '12px 28px', fontWeight: 700,
                                cursor: 'pointer', fontSize: '1rem',
                            }}
                        >
                            Retry Connection
                        </button>
                    )}
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 100,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(10, 10, 18, 0.95)', color: '#fff', gap: 16,
                    padding: '40px', textAlign: 'center'
                }}>
                    <span style={{ fontSize: '3rem' }}>⚠️</span>
                    <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#ff4757' }}>Embedding Restricted</p>
                    <p style={{ fontSize: '1rem', opacity: 0.8, margin: 0, maxWidth: '400px' }}>{error}</p>
                    <p style={{ fontSize: '0.85rem', color: '#7B68EE' }}>Pick another video from the sidebar!</p>
                </div>
            )}

            {/* Empty-state overlay */}
            {!videoId && !error && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: '#0A0A12', color: '#A0A0B5', gap: 8,
                }}>
                    <span style={{ fontSize: '3rem' }}>🎬</span>
                    {isLeader ? (
                        <>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Ready for a Watch Party?</p>
                            <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>Browse or search for a video to begin</p>
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Waiting for host...</p>
                            <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>The host will pick a video for everyone to watch</p>
                        </>
                    )}
                </div>
            )}

            {/* Cursor overlays */}
            {cursors && Array.from(cursors.values()).map(cursor => (
                <div
                    key={cursor.userId}
                    style={{
                        position: 'absolute',
                        left: `${cursor.x}%`,
                        top: `${cursor.y}%`,
                        zIndex: 10,
                        pointerEvents: 'none',
                        transform: 'translate(-4px, -4px)',
                        transition: 'left 0.05s linear, top 0.05s linear',
                    }}
                >
                    {/* Cursor dot */}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                            d="M4 2L16 9.5L10 10.5L7.5 16L4 2Z"
                            fill={cursor.color}
                            stroke="#fff"
                            strokeWidth="1"
                        />
                    </svg>
                    {/* Name label */}
                    <div style={{
                        position: 'absolute',
                        top: '18px',
                        left: '8px',
                        background: cursor.color,
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                    }}>
                        {cursor.displayName.split(' ')[0]}
                    </div>
                </div>
            ))}
        </div>
    );
}
