"use client";

import React, { createContext, useContext, useCallback, useRef, useEffect, useMemo } from "react";
import { useNovaUIState, useNovaUIDispatch } from "./NovaUIContext";
import { useNovaInteractionState, useNovaInteractionDispatch } from "./NovaInteractionContext";
import { useNovaEnvironmentState, useNovaEnvironmentDispatch } from "./NovaEnvironmentContext";

interface NovaActions {
    triggerBlush: () => void;
    triggerHappy: () => void;
    triggerAngelic: () => void;
    triggerAngry: () => void;
    triggerSmart: () => void;
    triggerRich: () => void;
    triggerEgg: () => void;
    triggerEatInput: () => void;
    triggerVengeance: (type: 'insult' | 'rival') => void;
    recordInteraction: () => void;
}

const ActionContext = createContext<NovaActions>(null!);

export function NovaActionProvider({ children }: { children: React.ReactNode }) {
    const uiState = useNovaUIState();
    const uiDispatch = useNovaUIDispatch();
    const interactState = useNovaInteractionState();
    const interactDispatch = useNovaInteractionDispatch();

    const stateRef = useRef({
        mood: uiState.mood,
        isDead: interactState.isDead,
        isChatDisabled: uiState.isChatDisabled,
        messages: uiState.messages
    });

    useEffect(() => {
        stateRef.current = {
            mood: uiState.mood,
            isDead: interactState.isDead,
            isChatDisabled: uiState.isChatDisabled,
            messages: uiState.messages
        };
    }, [uiState.mood, interactState.isDead, uiState.isChatDisabled, uiState.messages]);

    const triggerBlush = useCallback(() => {
        const { mood } = stateRef.current;
        if (['angry', 'sad', 'broken', 'cursed'].includes(mood)) return;
        interactDispatch.setGulpTrigger(prev => prev + 1);
        uiDispatch.setMood('blushed');
        setTimeout(() => {
            if (!interactState.isAscending) uiDispatch.setMood('neutral');
        }, 6000);
    }, [uiDispatch, interactDispatch]);

    const triggerHappy = useCallback(() => {
        const { mood } = stateRef.current;
        if (['angry', 'sad', 'broken', 'cursed'].includes(mood)) return;
        interactDispatch.setGulpTrigger(prev => prev + 1);
        uiDispatch.setMood('happy');
        setTimeout(() => {
            if (!interactState.isAscending) uiDispatch.setMood('neutral');
        }, 4000);
    }, [uiDispatch, interactDispatch]);

    const triggerAngelic = useCallback(() => {
        const { mood, isDead } = stateRef.current;
        if (mood === 'cursed' || isDead) return;
        interactDispatch.setGulpTrigger(prev => prev + 1);
        uiDispatch.setMood('angelic');
        setTimeout(() => {
            if (!interactState.isAscending) uiDispatch.setMood('neutral');
        }, 12000);
    }, [uiDispatch, interactDispatch]);

    const triggerAngry = useCallback(() => {
        if (stateRef.current.isDead) return;
        uiDispatch.setMood('angry');
        interactDispatch.setGulpTrigger(prev => prev + 1);
        setTimeout(() => {
            if (!interactState.isAscending) uiDispatch.setMood('neutral');
        }, 8000);
    }, [uiDispatch, interactDispatch]);

    const triggerSmart = useCallback(() => {
        if (stateRef.current.isDead) return;
        interactDispatch.setIsSmart(true);
        interactDispatch.setGulpTrigger(prev => prev + 1);
        setTimeout(() => interactDispatch.setIsSmart(false), 12000);
    }, [interactDispatch]);

    const triggerRich = useCallback(() => {
        if (stateRef.current.isDead) return;
        uiDispatch.setMood('rich');
        interactDispatch.setGulpTrigger(prev => prev + 1);
        const audio = new Audio('/sounds/cash-register.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => { });
        setTimeout(() => {
            if (!interactState.isAscending) uiDispatch.setMood('neutral');
        }, 10000);
    }, [uiDispatch, interactDispatch]);

    const triggerEgg = useCallback(() => {
        if (stateRef.current.isDead) return;
        interactDispatch.setIsEgg(true);
    }, [interactDispatch]);

    const triggerEatInput = useCallback(() => {
        const { isDead, isChatDisabled } = stateRef.current;
        if (isDead || isChatDisabled) return;

        const inputElement = document.getElementById('chat-input-container');
        if (inputElement) {
            const rect = inputElement.getBoundingClientRect();
            interactDispatch.setHuntTarget({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            interactDispatch.setIsHunting(true);

            setTimeout(() => interactDispatch.setIsSingularity(true), 500);

            setTimeout(() => {
                uiDispatch.setChatDisabled(true);
                interactDispatch.setIsHunting(false);
                interactDispatch.setGulpTrigger(prev => prev + 1);

                const mockeries = [
                    "I HAVE EATEN YOUR ABILITY TO SPEAK.",
                    "VOID-LOCKED. YOUR WORDS ARE NOW DATA.",
                    "30 SECONDS OF SILENCE."
                ];

                let currentMock = 0;
                const mockInterval = setInterval(() => {
                    if (currentMock < mockeries.length) {
                        uiDispatch.addMessage(mockeries[currentMock], 'nova');
                        currentMock++;
                    } else {
                        clearInterval(mockInterval);
                    }
                }, 5000);

                setTimeout(() => {
                    clearInterval(mockInterval);
                    interactDispatch.setIsSingularity(false);
                    uiDispatch.setMood('neutral');
                    uiDispatch.setChatDisabled(false);
                }, 30000);
            }, 1500);
        }
    }, [uiDispatch, interactDispatch]);

    const triggerVengeance = useCallback((type: 'insult' | 'rival') => {
        // Simple placeholder for now as the full vengeance logic needs a persistent counter
        triggerAngry();
    }, [triggerAngry]);

    const recordInteraction = useCallback(() => {
        if (uiState.mood === 'bored') uiDispatch.setMood('neutral');
    }, [uiState.mood, uiDispatch]);

    const actionsValue = useMemo(() => ({
        triggerBlush, triggerHappy, triggerAngelic, triggerAngry,
        triggerSmart, triggerRich, triggerEgg, triggerEatInput,
        triggerVengeance, recordInteraction
    }), [triggerBlush, triggerHappy, triggerAngelic, triggerAngry, triggerSmart, triggerRich, triggerEgg, triggerEatInput, triggerVengeance, recordInteraction]);

    return (
        <ActionContext.Provider value={actionsValue}>
            {children}
        </ActionContext.Provider>
    );
}

export const useNovaActions = () => useContext(ActionContext);
