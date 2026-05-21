"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

interface NovaInteractionState {
    // Pac-Man
    isPacManMode: boolean;
    consumedFriendIds: (string | number)[];
    gulpTrigger: number;
    // Hunting & Singularity
    isHunting: boolean;
    huntTarget: { x: number; y: number } | null;
    isSingularity: boolean;
    isNuclearSingularity: boolean;
    eatenElements: string[];
    isSpitting: boolean;
    // Spatial & Curiosity
    curiousTarget: { x: number; y: number } | null;
    novaPosition: { x: number; y: number } | null;
    homePosition: { x: number; y: number } | null;
    investigationContext: { type: string; message: string } | null;
    // Combat & States
    isKillingMachine: boolean;
    targetingData: { x: number; y: number; width: number; height: number; text: string; elementId: string } | null;
    isFiring: boolean;
    isHeartbroken: boolean;
    isMelting: boolean;
    isSmart: boolean;
    isEgg: boolean;
    isDancing: boolean;
    // Super Saiyan
    isSuperSaiyan: boolean;
    ssjLevel: 1 | 2 | 3;
    // Sauron
    isSauronMode: boolean;
    visionRadius: number;
    ashIntensity: number;
    followCursorMode: boolean;
    // Lifecycle
    isDead: boolean;
    deathPhase: number;
    isAscending: boolean;
}

interface NovaInteractionDispatch {
    setPacManMode: (v: boolean) => void;
    setConsumedFriendIds: (v: (string | number)[]) => void;
    setGulpTrigger: React.Dispatch<React.SetStateAction<number>>;
    /** Bumps `gulpTrigger` so Nova replays the Pac-Man gulp animation. */
    triggerPacManGulp: () => void;
    setIsHunting: (v: boolean) => void;
    setHuntTarget: (v: { x: number; y: number } | null) => void;
    setIsSingularity: (v: boolean) => void;
    setIsNuclearSingularity: (v: boolean) => void;
    setEatenElements: (v: string[] | ((prev: string[]) => string[])) => void;
    setIsSpitting: (v: boolean) => void;
    setCuriousTarget: (v: { x: number; y: number } | null) => void;
    setNovaPosition: (v: { x: number; y: number } | null) => void;
    setHomePosition: (v: { x: number; y: number } | null) => void;
    setInvestigationContext: (v: { type: string; message: string } | null) => void;
    setIsKillingMachine: (v: boolean) => void;
    setTargetingData: (v: any) => void;
    setIsFiring: (v: boolean) => void;
    setIsHeartbroken: (v: boolean) => void;
    setIsMelting: (v: boolean) => void;
    setIsSmart: (v: boolean) => void;
    setIsEgg: (v: boolean) => void;
    setIsDancing: (v: boolean) => void;
    setIsSuperSaiyan: (v: boolean) => void;
    setSsjLevel: (v: 1 | 2 | 3) => void;
    setIsSauronMode: (v: boolean) => void;
    setVisionRadius: (v: number) => void;
    setAshIntensity: (v: number) => void;
    setFollowCursorMode: (v: boolean) => void;
    setIsDead: (v: boolean) => void;
    setDeathPhase: (v: number) => void;
    setIsAscending: (v: boolean) => void;
}

const InteractionStateContext = createContext<NovaInteractionState>(null!);
const InteractionDispatchContext = createContext<NovaInteractionDispatch>(null!);

export function NovaInteractionProvider({ children }: { children: React.ReactNode }) {
    const [isPacManMode, setPacManMode] = useState(false);
    const [consumedFriendIds, setConsumedFriendIds] = useState<(string | number)[]>([]);
    const [gulpTrigger, setGulpTrigger] = useState(0);
    const [isHunting, setIsHunting] = useState(false);
    const [huntTarget, setHuntTarget] = useState<{ x: number; y: number } | null>(null);
    const [isSingularity, setIsSingularity] = useState(false);
    const [isNuclearSingularity, setIsNuclearSingularity] = useState(false);
    const [eatenElements, setEatenElements] = useState<string[]>([]);
    const [isSpitting, setIsSpitting] = useState(false);
    const [curiousTarget, setCuriousTarget] = useState<{ x: number; y: number } | null>(null);
    const [novaPosition, setNovaPosition] = useState<{ x: number; y: number } | null>(null);
    const [homePosition, setHomePosition] = useState<{ x: number; y: number } | null>(null);
    const [investigationContext, setInvestigationContext] = useState<{ type: string; message: string } | null>(null);
    const [isKillingMachine, setIsKillingMachine] = useState(false);
    const [targetingData, setTargetingData] = useState(null);
    const [isFiring, setIsFiring] = useState(false);
    const [isHeartbroken, setIsHeartbroken] = useState(false);
    const [isMelting, setIsMelting] = useState(false);
    const [isSmart, setIsSmart] = useState(false);
    const [isEgg, setIsEgg] = useState(false);
    const [isDancing, setIsDancing] = useState(false);
    const [isSuperSaiyan, setIsSuperSaiyan] = useState(false);
    const [ssjLevel, setSsjLevel] = useState<1 | 2 | 3>(1);
    const [isSauronMode, setIsSauronMode] = useState(false);
    const [visionRadius, setVisionRadius] = useState(200);
    const [ashIntensity, setAshIntensity] = useState(50);
    const [followCursorMode, setFollowCursorMode] = useState(true);
    const [isDead, setIsDead] = useState(false);
    const [deathPhase, setDeathPhase] = useState(0);
    const [isAscending, setIsAscending] = useState(false);

    const stateValue = useMemo(() => ({
        isPacManMode, consumedFriendIds, gulpTrigger, isHunting, huntTarget,
        isSingularity, isNuclearSingularity, eatenElements, isSpitting,
        curiousTarget, novaPosition,
        homePosition, investigationContext, isKillingMachine, targetingData,
        isFiring, isHeartbroken, isMelting, isSmart, isEgg, isDancing,
        isSuperSaiyan, ssjLevel,
        isSauronMode, visionRadius, ashIntensity, followCursorMode,
        isDead, deathPhase, isAscending
    }), [isPacManMode, consumedFriendIds, gulpTrigger, isHunting, huntTarget, isSingularity, isNuclearSingularity, eatenElements, isSpitting, curiousTarget, novaPosition, homePosition, investigationContext, isKillingMachine, targetingData, isFiring, isHeartbroken, isMelting, isSmart, isEgg, isDancing, isSuperSaiyan, ssjLevel, isSauronMode, visionRadius, ashIntensity, followCursorMode, isDead, deathPhase, isAscending]);

    const dispatchValue = useMemo(() => ({
        setPacManMode,
        setConsumedFriendIds,
        setGulpTrigger,
        triggerPacManGulp: () => setGulpTrigger((n) => n + 1),
        setIsHunting, setHuntTarget,
        setIsSingularity, setIsNuclearSingularity, setEatenElements, setIsSpitting,
        setCuriousTarget, setNovaPosition,
        setHomePosition, setInvestigationContext, setIsKillingMachine, setTargetingData,
        setIsFiring, setIsHeartbroken, setIsMelting, setIsSmart, setIsEgg, setIsDancing,
        setIsSuperSaiyan, setSsjLevel,
        setIsSauronMode, setVisionRadius, setAshIntensity, setFollowCursorMode,
        setIsDead, setDeathPhase, setIsAscending
    }), []);

    return (
        <InteractionStateContext.Provider value={stateValue}>
            <InteractionDispatchContext.Provider value={dispatchValue}>
                {children}
            </InteractionDispatchContext.Provider>
        </InteractionStateContext.Provider>
    );
}

export const useNovaInteractionState = () => useContext(InteractionStateContext);
export const useNovaInteractionDispatch = () => useContext(InteractionDispatchContext);
