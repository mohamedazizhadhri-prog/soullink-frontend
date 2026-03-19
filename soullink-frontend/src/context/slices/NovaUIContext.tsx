"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { NovaMood, NovaEmote, NovaMessage, NovaStatus } from "@/types/nova.types";

interface NovaUIState {
    mood: NovaMood;
    status: NovaStatus;
    isTracking: boolean;
    emote: NovaEmote;
    messages: NovaMessage[];
    pulseTrigger: number;
    isCinematicMode: boolean;
    isChatDisabled: boolean;
}

interface NovaUIDispatch {
    setMood: (mood: NovaMood) => void;
    setStatus: (status: NovaStatus) => void;
    setTracking: (v: boolean) => void;
    triggerEmote: (emote: NovaEmote) => void;
    addMessage: (text: string, sender?: 'nova' | 'user') => void;
    loadMessages: (msgs: NovaMessage[]) => void;
    clearMessages: () => void;
    setCinematicMode: (v: boolean) => void;
    setChatDisabled: (v: boolean) => void;
}

const UIStateContext = createContext<NovaUIState>(null!);
const UIDispatchContext = createContext<NovaUIDispatch>(null!);

export function NovaUIProvider({ children }: { children: React.ReactNode }) {
    const [mood, setMood] = useState<NovaMood>("neutral");
    const [status, setStatus] = useState<NovaStatus>("online");
    const [isTracking, setTracking] = useState(true);
    const [emote, setEmote] = useState<NovaEmote>(null);
    const [messages, setMessages] = useState<NovaMessage[]>([]);
    const [pulseTrigger, setPulseTrigger] = useState(0);
    const [isCinematicMode, setCinematicMode] = useState(false);
    const [isChatDisabled, setChatDisabled] = useState(false);

    const triggerEmote = useCallback((newEmote: NovaEmote) => {
        setEmote(newEmote);
        setTimeout(() => setEmote(null), 2000);
    }, []);

    const addMessage = useCallback((text: string, sender: 'nova' | 'user' = 'nova') => {
        const newMessage: NovaMessage = {
            id: Math.random().toString(36).substr(2, 9),
            sender,
            text,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev.slice(-49), newMessage]);
        if (sender === 'nova') {
            setPulseTrigger(prev => prev + 1);
        }
    }, []);

    const loadMessages = useCallback((msgs: NovaMessage[]) => {
        setMessages(msgs.slice(-50));
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const stateValue = useMemo(() => ({
        mood, status, isTracking, emote, messages, pulseTrigger, isCinematicMode, isChatDisabled
    }), [mood, status, isTracking, emote, messages, pulseTrigger, isCinematicMode, isChatDisabled]);

    const dispatchValue = useMemo(() => ({
        setMood, setStatus, setTracking, triggerEmote, addMessage, loadMessages, clearMessages, setCinematicMode, setChatDisabled
    }), [triggerEmote, addMessage, loadMessages, clearMessages]);

    return (
        <UIStateContext.Provider value={stateValue}>
            <UIDispatchContext.Provider value={dispatchValue}>
                {children}
            </UIDispatchContext.Provider>
        </UIStateContext.Provider>
    );
}

export const useNovaUIState = () => useContext(UIStateContext);
export const useNovaUIDispatch = () => useContext(UIDispatchContext);
