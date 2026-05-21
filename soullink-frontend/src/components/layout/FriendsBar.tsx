import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion, useAnimate } from "framer-motion";
import { useNovaState, useNovaDispatch } from "@/context/NovaContext";
import styles from "./FriendsBar.module.css";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { RainEffect } from "./RainEffect";
import { WaterOverlay } from "./WaterOverlay";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";
import { AddFriendModal } from "../modals/AddFriendModal";
import { useOnboardingOptional } from "@/context/OnboardingContext";
import { DEMO_FRIENDS, isDemoEntityId } from "@/lib/onboardingDemo";

interface Friend {
    id: string;
    friendshipId: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    status: 'ONLINE' | 'AWAY' | 'DO_NOT_DISTURB' | 'OFFLINE';
    unreadCount: number;
    lastMessageTimestamp: number;
    rapidHits: number;
}

type DMIncoming = {
    message?: {
        id?: string;
        senderId?: string;
        receiverId?: string;
        createdAt?: string;
    };
    sender?: {
        id?: string;
    };
};

export function FriendsBarComponent() {
    const {
        isPacManMode, consumedFriendIds, isCinematicMode,
        waterLevel, mood, isNightMode
    } = useNovaState();
    const {
        setPacManMode, setConsumedFriendIds, triggerPacManGulp,
        setHomePosition
    } = useNovaDispatch();

    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [promotedFriendId, setPromotedFriendId] = useState<string | null>(null);
    const [orbImpactLevel, setOrbImpactLevel] = useState<1 | 2>(1);
    const [orbRippleKey, setOrbRippleKey] = useState(0);
    const [scope, animate] = useAnimate();
    const homeSlotRef = useRef<HTMLDivElement>(null);
    const lastHitByFriendRef = useRef<Record<string, number>>({});
    const friendsRef = useRef<Friend[]>([]);
    const onboarding = useOnboardingOptional();

    useEffect(() => {
        friendsRef.current = friends;
    }, [friends]);

    const hydrateFriendsWithLatestActivity = async (
        baseFriends: Omit<Friend, "unreadCount" | "lastMessageTimestamp" | "rapidHits">[],
        previous?: Friend[]
    ): Promise<Friend[]> => {
        const prevMap = new Map((previous ?? []).map((f) => [f.id, f]));
        const withActivity = await Promise.all(
            baseFriends.map(async (friend) => {
                let latestTs = prevMap.get(friend.id)?.lastMessageTimestamp ?? 0;
                try {
                    const convoRes = await api.get(`/chat/${friend.id}?limit=1`);
                    const latestMessage = convoRes?.data?.data?.messages?.[0];
                    if (latestMessage?.createdAt) {
                        latestTs = new Date(latestMessage.createdAt).getTime();
                    }
                } catch {
                    // Keep existing timestamp fallback when conversation fetch fails.
                }

                return {
                    ...friend,
                    unreadCount: prevMap.get(friend.id)?.unreadCount ?? 0,
                    rapidHits: prevMap.get(friend.id)?.rapidHits ?? 0,
                    lastMessageTimestamp: latestTs,
                };
            })
        );

        return withActivity.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
    };

    // Fetch Friends
    useEffect(() => {
        const fetchFriends = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/friends');
                const baseFriends = response.data.data.friends as Omit<Friend, "unreadCount" | "lastMessageTimestamp" | "rapidHits">[];
                const hydrated = await hydrateFriendsWithLatestActivity(baseFriends);
                setFriends(hydrated);
            } catch (err) {
                console.error('Failed to fetch friends:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFriends();
    }, []);

    // Socket Presence + Friend Updates
    useEffect(() => {
        socketService.connect();

        const handlePresenceUpdate = ({ userId, status }: { userId: string, status: Friend['status'] }) => {
            setFriends(prev => prev.map(f => f.id === userId ? { ...f, status } : f));
        };

        const handleFriendListChanged = () => {
            // Re-fetch friends when a request is accepted (by us or by them)
            api.get('/friends').then(async (res) => {
                const baseFriends = res.data.data.friends as Omit<Friend, "unreadCount" | "lastMessageTimestamp" | "rapidHits">[];
                const hydrated = await hydrateFriendsWithLatestActivity(baseFriends, friendsRef.current);
                setFriends(hydrated);
            }).catch(console.error);
        };

        const handleIncomingDM = (payload: DMIncoming) => {
            const incoming = payload.message ?? payload;
            const senderId = incoming.senderId ?? payload.sender?.id;
            if (!senderId) return;

            const eventTimestamp = incoming.createdAt ? new Date(incoming.createdAt).getTime() : Date.now();
            const now = Date.now();
            const rapidWindowMs = 1200;

            setFriends((prev) => {
                if (!prev.some((f) => f.id === senderId)) return prev;

                const previousHit = lastHitByFriendRef.current[senderId] ?? 0;
                const isRapid = now - previousHit < rapidWindowMs;
                lastHitByFriendRef.current[senderId] = now;

                const next = prev.map((friend) => {
                    if (friend.id !== senderId) return friend;
                    const unreadCount = friend.unreadCount + 1;
                    const rapidHits = isRapid ? Math.min(friend.rapidHits + 1, 5) : 1;

                    setOrbImpactLevel((unreadCount >= 5 || rapidHits >= 3) ? 2 : 1);
                    setPromotedFriendId(senderId);
                    setOrbRippleKey((k) => k + 1);

                    return {
                        ...friend,
                        unreadCount,
                        rapidHits,
                        lastMessageTimestamp: Math.max(friend.lastMessageTimestamp, eventTimestamp || now),
                    };
                });

                return next.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
            });
        };

        socketService.on('presence:update', handlePresenceUpdate);
        socketService.on('friend:accepted', handleFriendListChanged);
        socketService.on('friend:request', handleFriendListChanged);
        socketService.on('dm:message', handleIncomingDM);

        return () => {
            socketService.off('presence:update', handlePresenceUpdate);
            socketService.off('friend:accepted', handleFriendListChanged);
            socketService.off('friend:request', handleFriendListChanged);
            socketService.off('dm:message', handleIncomingDM);
        };
    }, []);


    // Measure Home Position Slot
    useEffect(() => {
        const updateHome = () => {
            if (homeSlotRef.current) {
                const rect = homeSlotRef.current.getBoundingClientRect();
                setHomePosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }
        };
        updateHome();
        window.addEventListener('resize', updateHome);
        return () => window.removeEventListener('resize', updateHome);
    }, [setHomePosition]);

    // Sequence Effect (skip during scripted tour — overlay drives Pac-Man visuals + gulp only)
    useEffect(() => {
        if (onboarding?.isTourActive) return;
        if (isPacManMode && friends.length > 0) {
            const runSequence = async () => {
                setConsumedFriendIds([]);
                const novaEl = document.getElementById('nova-orb-core');
                if (!novaEl) return;

                const novaRect = novaEl.getBoundingClientRect();

                for (const friend of friends) {
                    const friendId = `friend-${friend.id}`;
                    const friendEl = document.getElementById(friendId);
                    if (!friendEl) continue;

                    const friendRect = friendEl.getBoundingClientRect();
                    const deltaX = (novaRect.left + novaRect.width / 2) - (friendRect.left + friendRect.width / 2);
                    const deltaY = (novaRect.top + novaRect.height / 2) - (friendRect.top + friendRect.height / 2);

                    // 1. Fly to Nova (FASTER)
                    await animate(`#${friendId}`,
                        { x: deltaX, y: deltaY, scale: 0.5, zIndex: 100 },
                        { duration: 0.35, ease: "backIn" }
                    );

                    // 2. Collision / Consume
                    setConsumedFriendIds((prev: (string | number)[]) => [...prev, friend.id]);
                    triggerPacManGulp();

                    // 3. Brief pause before next (FASTER)
                    await new Promise(r => setTimeout(r, 100));
                }

                // Finish
                setTimeout(() => {
                    setPacManMode(false);
                }, 800);
            };

            runSequence();
        } else {
            // Reset animations
            if (scope.current?.querySelector(".friendItem")) {
                animate(".friendItem", { x: 0, y: 0, scale: 1, opacity: 1 }, { duration: 0.5, type: "spring" });
            }
        }
    }, [isPacManMode, animate, friends, setConsumedFriendIds, triggerPacManGulp, setPacManMode, onboarding?.isTourActive]);

    useEffect(() => {
        if (!promotedFriendId) return;
        const clear = setTimeout(() => setPromotedFriendId(null), 850);
        return () => clearTimeout(clear);
    }, [promotedFriendId]);

    useEffect(() => {
        if (!orbRippleKey) return;
        const orb = document.getElementById("nova-orb-core");
        if (!orb) return;

        const intense = orbImpactLevel === 2;
        orb.animate(
            [
                { transform: "translateX(0px) scale(1,1)", filter: "drop-shadow(0 0 0px rgba(125, 108, 255, 0.0))" },
                { transform: intense ? "translateX(-5px) scale(1.2,0.82)" : "translateX(-3px) scale(1.12,0.9)", filter: "drop-shadow(0 0 12px rgba(125, 108, 255, 0.85))" },
                { transform: intense ? "translateX(2px) scale(0.9,1.15)" : "translateX(1px) scale(0.95,1.08)", filter: "drop-shadow(0 0 8px rgba(125, 108, 255, 0.65))" },
                { transform: "translateX(0px) scale(1,1)", filter: "drop-shadow(0 0 0px rgba(125, 108, 255, 0.0))" }
            ],
            {
                duration: intense ? 700 : 520,
                easing: intense ? "cubic-bezier(0.12, 0.85, 0.2, 1.25)" : "cubic-bezier(0.2, 0.9, 0.3, 1.1)"
            }
        );
    }, [orbRippleKey, orbImpactLevel]);

    const orderedFriends = useMemo(
        () => [...friends].sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp),
        [friends]
    );

    const railFriends =
        onboarding?.isTourActive && onboarding?.isDemoWorldVisible
            ? DEMO_FRIENDS
            : orderedFriends;

    const handleFriendOpen = (id: string) => {
        if (isDemoEntityId(id)) return;
        setFriends((prev) =>
            prev.map((f) => (f.id === id ? { ...f, unreadCount: 0, rapidHits: 0 } : f))
        );
    };

    return (
        <motion.div
            className={styles.friendsBar}
            ref={scope}
            animate={mood === 'laugh' ? { x: [-1, 1, -1], y: [-1, 1, -1], transition: { duration: 0.1, repeat: Infinity } } : { x: 0, y: 0 }}
            style={{
                backgroundColor: isCinematicMode ? 'transparent' : (isPacManMode ? '#000' : 'var(--color-bg-app)'),
                transition: 'background-color 0.5s ease',
                borderBottom: isCinematicMode ? 'none' : '1px solid var(--color-border)',
                zIndex: isCinematicMode ? 160 : 100
            }}
        >
            <div className={styles.waterClipper}>
                <RainEffect />
                <WaterOverlay />
            </div>

            {isNightMode && (
                <div className={styles.starField}>
                    {[...Array(25)].map((_, i) => (
                        <div
                            key={i}
                            className={styles.celestialStar}
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 2 + 1}px`,
                                height: `${Math.random() * 2 + 1}px`,
                                '--duration': `${2 + Math.random() * 4}s`
                            } as any}
                        />
                    ))}
                </div>
            )}

            {/* AI Companion Home Slot */}
            <div
                ref={homeSlotRef}
                className={styles.orbDock}
                data-onboarding-anchor="nova-home"
                style={{
                    width: 64,
                    height: 64,
                    marginRight: 8,
                    position: 'relative',
                    zIndex: 170,
                    flexShrink: 0
                }}
            />

            {/* Friend List */}
            {!isCinematicMode && (
                <div className={styles.friendsScroller} data-onboarding-anchor="friends-rail">
                    <div className={styles.friendsRail}>
                        {railFriends.map((friend, index) => {
                            const step = 100 / (railFriends.length + 1);
                            const isDemoFriend = isDemoEntityId(friend.id);
                            const friendThreshold = (index + 1) * step;
                            const isSubmerged = waterLevel > friendThreshold;
                            const isPromoted = promotedFriendId === friend.id;
                            const unreadLarge = friend.unreadCount >= 5;

                            return (
                                <motion.div
                                    layout
                                    key={friend.id}
                                    animate={isPromoted
                                        ? {
                                            x: [0, -8, -14, -6, 0],
                                            y: [0, -9, -13, -5, 0],
                                            scale: [1, 1.12, unreadLarge ? 1.18 : 1.15, 1.04, 1],
                                            rotate: [0, -5, 6, -2, 0]
                                        }
                                        : {
                                            scale: promotedFriendId ? [1, 0.95, 1] : 1,
                                            x: promotedFriendId ? [0, 1.5, 0] : 0
                                        }}
                                    transition={{
                                        layout: {
                                            type: "spring",
                                            stiffness: unreadLarge ? 500 : 420,
                                            damping: unreadLarge ? 26 : 30,
                                            mass: unreadLarge ? 0.75 : 0.95,
                                            delay: isPromoted ? 0 : Math.min(index * 0.06, 0.35),
                                        },
                                        duration: isPromoted ? (unreadLarge ? 0.7 : 0.55) : 0.32,
                                        delay: isPromoted ? 0 : Math.min(index * 0.05, 0.25),
                                        ease: "easeOut"
                                    }}
                                >
                                    <Link
                                        id={`friend-${friend.id}`}
                                        href={isDemoFriend ? '#' : `/dm/${friend.id}`}
                                        className={`${styles.friendItem} friendItem`}
                                        data-singularity-target="friend"
                                        onClick={(e) => {
                                            if (isDemoFriend) e.preventDefault();
                                            handleFriendOpen(friend.id);
                                        }}
                                        style={{
                                            textDecoration: 'none',
                                            opacity: consumedFriendIds.includes(friend.id) ? 0 : 1,
                                            transition: 'opacity 0.1s, filter 0.5s ease',
                                            filter: isSubmerged ? 'blur(1px) brightness(0.9) saturate(1.2) hue-rotate(190deg)' : 'none'
                                        }}
                                    >
                                        <motion.div
                                            className={styles.friendAvatar}
                                            whileHover={{ scale: 1.07, y: -2 }}
                                            transition={{ type: "spring", stiffness: 380, damping: 20 }}
                                        >
                                            {!consumedFriendIds.includes(friend.id) && isPacManMode && (
                                                <motion.div
                                                    className={styles.trail}
                                                    animate={{ opacity: [0.5, 0], scale: [1, 2] }}
                                                    transition={{ repeat: Infinity, duration: 0.3 }}
                                                />
                                            )}
                                            {friend.avatarUrl ? (
                                                <img src={friend.avatarUrl} alt={friend.displayName} />
                                            ) : (
                                                <div className={styles.avatarPlaceholder}>
                                                    {friend.displayName[0]}
                                                </div>
                                            )}
                                            <div className={`${styles.statusIndicator} ${styles[getStatusClass(friend.status)]}`} />

                                            {friend.unreadCount > 0 && (
                                                <motion.span
                                                    className={`${styles.unreadBadge} ${friend.rapidHits >= 3 ? styles.unreadBurst : ""}`}
                                                    key={`${friend.id}-${friend.unreadCount}-${friend.rapidHits}`}
                                                    initial={{ scale: 0, y: 6, opacity: 0 }}
                                                    animate={{ scale: [0, 1.24, 0.96, 1], y: [6, -4, 0], opacity: 1 }}
                                                    transition={{
                                                        duration: friend.unreadCount >= 5 ? 0.52 : 0.4,
                                                        ease: "easeOut"
                                                    }}
                                                >
                                                    {friend.unreadCount > 99 ? "99+" : friend.unreadCount}
                                                </motion.span>
                                            )}
                                        </motion.div>
                                        <span className={styles.friendName}>{friend.displayName}</span>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Loading Skeleton */}
            {!isCinematicMode && isLoading && !(onboarding?.isTourActive && onboarding?.isDemoWorldVisible) && orderedFriends.length === 0 && (
                <div className={styles.skeletonContainer}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className={styles.skeletonItem} />
                    ))}
                </div>
            )}

            {/* Add Button */}
            {!isCinematicMode && (
                <div
                    className={styles.addBtn}
                    title="Add Friend"
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <UserPlus size={20} />
                </div>
            )}

            {orbRippleKey > 0 && (
                <motion.div
                    key={`orb-ripple-${orbRippleKey}`}
                    className={styles.orbImpactRipple}
                    initial={{ scale: 0.5, opacity: 0.7 }}
                    animate={{ scale: orbImpactLevel === 2 ? 1.8 : 1.5, opacity: 0 }}
                    transition={{ duration: orbImpactLevel === 2 ? 0.75 : 0.55, ease: "easeOut" }}
                />
            )}

            <AddFriendModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </motion.div>
    );
}

function getStatusClass(status: string) {
    switch (status) {
        case "ONLINE": return "statusOnline";
        case "OFFLINE": return "statusOffline";
        case "AWAY": return "statusAway";
        case "DO_NOT_DISTURB": return "statusDND";
        default: return "statusOffline";
    }
}

export const FriendsBar = React.memo(FriendsBarComponent);
