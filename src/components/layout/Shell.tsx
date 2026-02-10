"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { TopNavigation } from "./TopNavigation";
import { FriendsBar } from "./FriendsBar";
import { ServerSidebar } from "./ServerSidebar";
import { HomeSidebar } from "./HomeSidebar";
import { NovaProvider, useNova } from "@/context/NovaContext";
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
    return (
        <NovaProvider>
            <>
                <NovaSingularityOverlay />
                <ShellContent>{children}</ShellContent>
            </>
        </NovaProvider>
    );
}

function ShellContent({ children }: ShellProps) {
    const pathname = usePathname();
    const { isCinematicMode, mood } = useNova();
    // Show HomeSidebar for non-server routes
    const showHomeSidebar = !pathname.startsWith('/server');

    return (
        <div
            className={`${mood === 'crazy' ? 'globalCrazyShake' : ''} ${mood === 'cursed' ? 'globalCursedTheme bloodyGlow' : ''}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'visible',
                position: 'relative',
                transition: 'all 0.5s ease'
            }}
        >
            {mood === 'crazy' && <div className="glitchOverlay" />}
            <FocusOverlay />

            <div style={{ position: 'relative', zIndex: isCinematicMode ? 160 : 10 }}>
                {!isCinematicMode && <TopNavigation />}
                <FriendsBar />
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {!isCinematicMode && <ServerSidebar />}
                {(showHomeSidebar || isCinematicMode) && <HomeSidebar />}
                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    position: 'relative',
                    opacity: isCinematicMode ? 0 : 1,
                    visibility: isCinematicMode ? 'hidden' : 'visible',
                    transition: 'opacity 0.3s ease'
                }}>
                    {children}
                </main>
            </div>

            {/* Nova Control Panel - Hidden in Cinematic Mode */}
            {!isCinematicMode && (
                <div style={{ position: 'relative', zIndex: 110 }}>
                    <NovaPanel />
                </div>
            )}

            {/* Eat & Spit Overlay */}
            <EatSpitOverlay />

            {/* Global Nova Avatar mounting to escape sidebar stacking context */}
            <NovaAvatar />

            {/* Search & Destroy Logic */}
            <NovaSearchAndDestroy />
        </div>
    );
}

