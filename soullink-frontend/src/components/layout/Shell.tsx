"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TopNavigation } from "./TopNavigation";
import { FriendsBar } from "./FriendsBar";
import { ServerSidebar } from "./ServerSidebar";
import { HomeSidebar } from "./HomeSidebar";
import { NovaProvider, useNovaState } from "@/context/NovaContext";
import { NovaPanel } from "@/components/ai/NovaPanel";
import { FocusOverlay } from "@/components/ai/FocusOverlay";
import { EatSpitOverlay } from "./EatSpitOverlay";
import { NovaAvatar } from "@/components/ai/NovaAvatar";
import { NovaSearchAndDestroy } from "@/components/ai/NovaSearchAndDestroy";
import { NovaSingularityOverlay } from "@/components/ai/NovaSingularityOverlay";

interface ShellProps {
    children: React.ReactNode;
}

export function Shell({ children }: { children: React.ReactNode }) {
    return <ShellContent>{children}</ShellContent>;
}

const MemoizedTopNavigation = React.memo(TopNavigation);
const MemoizedFriendsBar = React.memo(FriendsBar);
const MemoizedServerSidebar = React.memo(ServerSidebar);
const MemoizedHomeSidebar = React.memo(HomeSidebar);
const MemoizedNovaPanel = React.memo(NovaPanel);

function ShellContent({ children }: ShellProps) {
    const pathname = usePathname();
    const { isCinematicMode, mood, isSauronMode, isNightMode } = useNovaState();
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    // Show HomeSidebar for non-server routes
    const showHomeSidebar = !pathname.startsWith('/server') && !isAuthPage;

    // Memoize children to prevent page re-renders on layout pulses
    const memoizedChildren = React.useMemo(() => children, [children]);

    return (
        <div
            className={`${mood === 'crazy' ? 'globalCrazyShake' : ''} ${mood === 'cursed' ? 'globalCursedTheme bloodyGlow' : ''}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'visible',
                position: 'relative',
                transition: 'all 0.5s ease',
                backgroundColor: isNightMode ? 'transparent' : 'var(--color-bg-app)'
            }}
        >
            {mood === 'crazy' && <div className="glitchOverlay" />}
            <FocusOverlay />

            <div style={{ position: 'relative', zIndex: isCinematicMode ? 160 : 10 }}>
                {!isCinematicMode && !isAuthPage && <MemoizedTopNavigation />}
                {!isAuthPage && <MemoizedFriendsBar />}
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                {!isCinematicMode && !isAuthPage && <MemoizedServerSidebar />}
                {(showHomeSidebar || isCinematicMode) && <MemoizedHomeSidebar />}
                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    position: 'relative',
                    opacity: isCinematicMode ? 0 : 1,
                    visibility: isCinematicMode ? 'hidden' : 'visible',
                    transition: 'opacity 0.3s ease'
                }}>
                    {memoizedChildren}
                </main>
            </div>

            {/* Nova Control Panel - Hidden in Cinematic Mode */}
            {!isCinematicMode && (
                <div style={{ position: 'relative', zIndex: 110 }}>
                    <MemoizedNovaPanel />
                </div>
            )}

            {/* Eat & Spit Overlay */}
            {!isAuthPage && <EatSpitOverlay />}

            {/* Global Nova Avatar mounting to escape sidebar stacking context */}
            {!isAuthPage && <NovaAvatar />}

            {/* Search & Destroy Logic */}
            {!isAuthPage && <NovaSearchAndDestroy />}

            {/* Singularity Overlay */}
            {!isAuthPage && <NovaSingularityOverlay />}

            {/* Sauron Mordor Vignette — dark volcanic gradient, center stays visible */}
            <AnimatePresence>
                {isSauronMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: `radial-gradient(ellipse at var(--nova-x, 50%) var(--nova-y, 50%), 
                                transparent 0%, 
                                rgba(40, 5, 0, 0.3) 25%, 
                                rgba(20, 2, 0, 0.6) 50%, 
                                rgba(5, 0, 0, 0.85) 80%, 
                                rgba(0, 0, 0, 0.95) 100%)`,
                            zIndex: 100,
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* GOOD NIGHT Celestial Sky — starry midnight overlay */}
            <AnimatePresence>
                {isNightMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'linear-gradient(to bottom, #0a0a2e 0%, #1a1a4e 100%)',
                            zIndex: 0, // Behind content but in front of body
                            pointerEvents: 'none',
                        }}
                    >
                        {/* Static Milky Way */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.05) 0%, transparent 60%)',
                            filter: 'blur(50px)',
                            transform: 'rotate(-15deg) scale(2)'
                        }} />

                        {/* Stars would be added here or via CSS in sidebars as requested */}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

