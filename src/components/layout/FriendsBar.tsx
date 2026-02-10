import { useRef, useState, useEffect } from "react";
import { motion, useAnimate, stagger, AnimatePresence } from "framer-motion";
import { useNova } from "@/context/NovaContext";
import styles from "./FriendsBar.module.css";
import { Plus } from "lucide-react";
import Link from "next/link";
import { NovaAvatar } from "../ai/NovaAvatar";
import { RainEffect } from "./RainEffect";
import { WaterOverlay } from "./WaterOverlay";

import { FRIENDS_DATA } from "@/constants/friends";

export function FriendsBar() {
    const {
        isPacManMode, setPacManMode, consumedFriendIds, setConsumedFriendIds,
        triggerPacManGulp, isCinematicMode, waterLevel, isStormMode, mood,
        setHomePosition, novaPosition
    } = useNova();
    const [scope, animate] = useAnimate();
    const homeSlotRef = useRef<HTMLDivElement>(null);

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

    // Camera Shake Effect for Laugh
    const shakeStyle = mood === 'laugh' ? {
        animation: `${styles.cameraShake} 0.1s infinite`
    } : {};

    // We need to define the keyframe in CSS or use inline-style-animation via framer if CSS module doesn't support it dynamically.
    // Let's use framer motion animate prop on the div instead for cleaner logic.

    // Sequence Effect
    useEffect(() => {
        if (isPacManMode) {
            const runSequence = async () => {
                setConsumedFriendIds([]);
                const novaEl = document.getElementById('nova-orb-core');
                if (!novaEl) return;

                const novaRect = novaEl.getBoundingClientRect();

                for (const friend of FRIENDS_DATA) {
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
                    setConsumedFriendIds((prev: number[]) => [...prev, friend.id]);
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
            animate(".friendItem", { x: 0, y: 0, scale: 1, opacity: 1 }, { duration: 0.5, type: "spring" });
        }
    }, [isPacManMode, animate, setConsumedFriendIds, triggerPacManGulp, setPacManMode]);

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

            {/* AI Companion Home Slot - Nova is now mounted globally in Shell */}
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

            {/* Friend List - Hidden in Cinematic Mode */}
            {!isCinematicMode && FRIENDS_DATA.map((friend, index) => {
                // Match the submerging logic to the water progression (0-100%)
                const step = 100 / (FRIENDS_DATA.length + 1);
                const friendThreshold = (index + 1) * step;
                const isSubmerged = waterLevel > friendThreshold;

                return (
                    <Link
                        key={friend.id}
                        id={`friend-${friend.id}`}
                        href={`/dm/${friend.name.toLowerCase()}`}
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
                            {/* Speed Trail while flying (simplified CSS border pulse) */}
                            {!consumedFriendIds.includes(friend.id) && isPacManMode && (
                                <motion.div
                                    className={styles.trail}
                                    animate={{ opacity: [0.5, 0], scale: [1, 2] }}
                                    transition={{ repeat: Infinity, duration: 0.3 }}
                                />
                            )}
                            {friend.avatar && (
                                <img src={friend.avatar} alt={friend.name} />
                            )}
                            <div className={`${styles.statusIndicator} ${styles[getStatusClass(friend.status)]}`} />
                        </div>
                        <span className={styles.friendName}>{friend.name}</span>
                    </Link>
                );
            })}

            {/* Add Button - Hidden in Cinematic Mode */}
            {!isCinematicMode && (
                <div className={styles.addBtn} title="Add Friend">
                    <Plus size={20} />
                </div>
            )}
        </motion.div>
    );
}

function getStatusClass(status: string) {
    switch (status) {
        case "online": return "statusOnline";
        case "offline": return "statusOffline";
        default: return "statusOffline";
    }
}

