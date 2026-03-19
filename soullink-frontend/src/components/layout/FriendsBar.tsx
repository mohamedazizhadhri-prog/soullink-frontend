import React, { useRef, useState, useEffect } from "react";
import { motion, useAnimate, stagger, AnimatePresence } from "framer-motion";
import { useNovaState, useNovaDispatch } from "@/context/NovaContext";
import styles from "./FriendsBar.module.css";
import { Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { NovaAvatar } from "../ai/NovaAvatar";
import { RainEffect } from "./RainEffect";
import { WaterOverlay } from "./WaterOverlay";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";
import { AddFriendModal } from "../modals/AddFriendModal";

interface Friend {
    id: string;
    friendshipId: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    status: 'ONLINE' | 'AWAY' | 'DO_NOT_DISTURB' | 'OFFLINE';
}

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
    const [scope, animate] = useAnimate();
    const homeSlotRef = useRef<HTMLDivElement>(null);

    // Fetch Friends
    useEffect(() => {
        const fetchFriends = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/friends');
                setFriends(response.data.data.friends);
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
            api.get('/friends').then(res => {
                setFriends(res.data.data.friends);
            }).catch(console.error);
        };

        socketService.on('presence:update', handlePresenceUpdate);
        socketService.on('friend:accepted', handleFriendListChanged);
        socketService.on('friend:request', handleFriendListChanged);

        return () => {
            socketService.off('presence:update', handlePresenceUpdate);
            socketService.off('friend:accepted', handleFriendListChanged);
            socketService.off('friend:request', handleFriendListChanged);
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

    // Sequence Effect
    useEffect(() => {
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
    }, [isPacManMode, animate, friends, setConsumedFriendIds, triggerPacManGulp, setPacManMode]);

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
            {!isCinematicMode && friends.map((friend, index) => {
                const step = 100 / (friends.length + 1);
                const friendThreshold = (index + 1) * step;
                const isSubmerged = waterLevel > friendThreshold;

                return (
                    <Link
                        key={friend.id}
                        id={`friend-${friend.id}`}
                        href={`/dm/${friend.id}`}
                        className={`${styles.friendItem} friendItem`}
                        data-singularity-target="friend"
                        style={{
                            textDecoration: 'none',
                            opacity: consumedFriendIds.includes(friend.id) ? 0 : 1,
                            transition: 'opacity 0.1s, filter 0.5s ease',
                            filter: isSubmerged ? 'blur(1px) brightness(0.9) saturate(1.2) hue-rotate(190deg)' : 'none'
                        }}
                    >
                        <div className={styles.friendAvatar}>
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
                        </div>
                        <span className={styles.friendName}>{friend.displayName}</span>
                    </Link>
                );
            })}

            {/* Loading Skeleton */}
            {!isCinematicMode && isLoading && (
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
