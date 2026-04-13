"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

interface NovaEnvironmentState {
    isStormMode: boolean;
    waterLevel: number;
    splashTrigger: number;
    isNightMode: boolean;
    temperature: number;
}

interface NovaEnvironmentDispatch {
    setStormMode: (v: boolean) => void;
    setWaterLevel: (v: number) => void;
    setSplashTrigger: (v: (prev: number) => number) => void;
    triggerSplash: () => void;
    setIsNightMode: (v: boolean) => void;
    setTemperature: (v: number) => void;
}

const EnvironmentStateContext = createContext<NovaEnvironmentState>(null!);
const EnvironmentDispatchContext = createContext<NovaEnvironmentDispatch>(null!);

export function NovaEnvironmentProvider({ children }: { children: React.ReactNode }) {
    const [isStormMode, setStormMode] = useState(false);
    const [waterLevel, setWaterLevel] = useState(0);
    const [splashTrigger, setSplashTrigger] = useState(0);
    const [isNightMode, setIsNightMode] = useState(false);
    const [temperature, setTemperature] = useState(25);

    const triggerSplash = React.useCallback(() => {
        setSplashTrigger(prev => prev + 1);
    }, []);

    const stateValue = useMemo(() => ({
        isStormMode, waterLevel, splashTrigger, isNightMode, temperature
    }), [isStormMode, waterLevel, splashTrigger, isNightMode, temperature]);

    const dispatchValue = useMemo(() => ({
        setStormMode, setWaterLevel, setSplashTrigger, triggerSplash, setIsNightMode, setTemperature
    }), [triggerSplash]);

    return (
        <EnvironmentStateContext.Provider value={stateValue}>
            <EnvironmentDispatchContext.Provider value={dispatchValue}>
                {children}
            </EnvironmentDispatchContext.Provider>
        </EnvironmentStateContext.Provider>
    );
}

export const useNovaEnvironmentState = () => useContext(EnvironmentStateContext);
export const useNovaEnvironmentDispatch = () => useContext(EnvironmentDispatchContext);
