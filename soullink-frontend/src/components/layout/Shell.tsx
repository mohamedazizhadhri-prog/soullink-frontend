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
import { WebRTCProvider, useWebRTCContext } from "@/context/WebRTCContext";
import { WatchPartyProvider } from "@/context/WatchPartyContext";
import { CallOverlay } from "@/components/chat/CallOverlay";
import { WatchPartyInviteToast } from "@/components/watch-party/WatchPartyInviteToast";

interface ShellProps {
    children: React.ReactNode;
}

export function Shell({ children }: { children: React.ReactNode }) {
    return (
        <WebRTCProvider>
            <WatchPartyProvider>
                <ShellContent>{children}</ShellContent>
            </WatchPartyProvider>
        </WebRTCProvider>
    );
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
    const showHomeSidebar = !pathname.startsWith('/server') && !isAuthPage;

    // Access the single global WebRTC instance
    const { oneToOne } = useWebRTCContext();

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

            {/* Watch Party Global Invite */}
            {!isAuthPage && <WatchPartyInviteToast />}

            {/* Global Incoming Call Notification — driven by single WebRTCContext */}
            {!isAuthPage && oneToOne.incomingCall && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 10000,
                    animation: 'slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                    <CallOverlay
                        status="ringing"
                        callType={oneToOne.incomingCall.callType}
                        duration={0}
                        localStream={null}
                        remoteStream={null}
                        participants={[]}
                        isMuted={false}
                        isVideoOff={false}
                        isScreenSharing={false}
                        callerName={oneToOne.incomingCall.caller.displayName}
                        callerAvatar={oneToOne.incomingCall.caller.avatarUrl}
                        mode="1:1"
                        onAccept={() => oneToOne.acceptCall()}
                        onReject={() => oneToOne.rejectCall()}
                        onEnd={() => oneToOne.rejectCall()}
                        onToggleMute={() => {}}
                        onToggleVideo={() => {}}
                        onToggleScreenShare={() => {}}
                    />
                </div>
            )}

            {/* Active 1:1 call overlay (when accepted from global notification) */}
            {!isAuthPage && oneToOne.callStatus !== 'idle' && !oneToOne.incomingCall && (
                <CallOverlay
                    status={oneToOne.callStatus}
                    callType={oneToOne.callType}
                    duration={oneToOne.callDuration}
                    localStream={oneToOne.localStream}
                    remoteStream={oneToOne.remoteStream}
                    participants={[]}
                    isMuted={oneToOne.isMuted}
                    isVideoOff={oneToOne.isVideoOff}
                    isScreenSharing={oneToOne.isScreenSharing}
                    callerName={oneToOne.incomingCall ? (oneToOne.incomingCall as any)?.caller?.displayName : undefined}
                    callerAvatar={null}
                    mode="1:1"
                    onEnd={oneToOne.endCall}
                    onToggleMute={oneToOne.toggleMute}
                    onToggleVideo={oneToOne.toggleVideo}
                    onToggleScreenShare={oneToOne.toggleScreenShare}
                />
            )}

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

