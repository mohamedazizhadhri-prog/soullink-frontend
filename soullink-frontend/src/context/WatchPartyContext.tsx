"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import { WatchInvite, WatchSession, WatchMember, WatchReaction } from '@/types/watch-party.types';

interface WatchPartyContextValue {
    invite: WatchInvite | null;
    clearInvite: () => void;
    activeSession: WatchSession | null;
    setSession: (session: WatchSession | null) => void;
}

const WatchPartyContext = createContext<WatchPartyContextValue | null>(null);

export function useWatchPartyContext() {
    const ctx = useContext(WatchPartyContext);
    if (!ctx) throw new Error("useWatchPartyContext must be used inside WatchPartyProvider");
    return ctx;
}

export function WatchPartyProvider({ children }: { children: React.ReactNode }) {
    const [invite, setInvite] = useState<WatchInvite | null>(null);
    const [activeSession, setActiveSession] = useState<WatchSession | null>(null);

    const clearInvite = useCallback(() => setInvite(null), []);
    const setSession = useCallback((session: WatchSession | null) => setActiveSession(session), []);

    useEffect(() => {
        // Listen for global watch party invites
        const handleInvited = (data: WatchInvite) => {
            console.log("[WatchParty] Received invite:", data);
            setInvite(data);
        };

        socketService.on('watch:invited', handleInvited);

        return () => {
            socketService.off('watch:invited', handleInvited);
        };
    }, []);

    return (
        <WatchPartyContext.Provider value={{ invite, clearInvite, activeSession, setSession }}>
            {children}
        </WatchPartyContext.Provider>
    );
}
