"use client";

import React from "react";
import { NovaUIProvider, useNovaUIState, useNovaUIDispatch } from "./slices/NovaUIContext";
import { NovaEnvironmentProvider, useNovaEnvironmentState, useNovaEnvironmentDispatch } from "./slices/NovaEnvironmentContext";
import { NovaInteractionProvider, useNovaInteractionState, useNovaInteractionDispatch } from "./slices/NovaInteractionContext";

import { NovaActionProvider, useNovaActions } from "./slices/NovaActionContext";

// Master Provider
export function NovaProvider({ children }: { children: React.ReactNode }) {
    return (
        <NovaUIProvider>
            <NovaEnvironmentProvider>
                <NovaInteractionProvider>
                    <NovaActionProvider>
                        {children}
                    </NovaActionProvider>
                </NovaInteractionProvider>
            </NovaEnvironmentProvider>
        </NovaUIProvider>
    );
}

// Aggregated hooks for backward compatibility
export function useNovaState() {
    const uiState = useNovaUIState();
    const envState = useNovaEnvironmentState();
    const interactState = useNovaInteractionState();

    return {
        ...uiState,
        ...envState,
        ...interactState
    };
}

export function useNovaDispatch() {
    const uiDispatch = useNovaUIDispatch();
    const envDispatch = useNovaEnvironmentDispatch();
    const interactDispatch = useNovaInteractionDispatch();
    const actions = useNovaActions();

    return {
        ...uiDispatch,
        ...envDispatch,
        ...interactDispatch,
        ...actions
    };
}

export function useNova() {
    return { ...useNovaState(), ...useNovaDispatch(), ...useNovaActions() };
}
