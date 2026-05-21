'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import {
    ONBOARDING_STORAGE_KEY,
    ONBOARDING_STEPS,
    isTourNavigationExempt,
    type OnboardingHighlight,
} from '@/lib/onboardingDemo';

type TourPhase = 'idle' | 'running' | 'done';

interface OnboardingContextValue {
    phase: TourPhase;
    /** True while first-run tour is active (may still hide demo world on final beats). */
    isTourActive: boolean;
    /** User tapped “Begin” — browser audio gesture unlocked for later TTS. */
    gesturePrimed: boolean;
    /** Wax-museum friends / servers / demo matches visible. */
    isDemoWorldVisible: boolean;
    stepIndex: number;
    totalSteps: number;
    highlight: OnboardingHighlight;
    startTour: () => void;
    skipTour: () => void;
    nextStep: () => void;
    /** Call from a click handler so TTS play() is allowed. */
    primeTourGesture: () => void;
    /** Clear saved progress and restart tour (call before navigating to /match). */
    replayTour: () => void;
    /** Mark done without running (e.g. settings later). */
    markCompleted: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [phase, setPhase] = useState<TourPhase>('idle');
    const [stepIndex, setStepIndex] = useState(0);
    const [demoWorld, setDemoWorld] = useState(true);
    const [gesturePrimed, setGesturePrimed] = useState(false);

    const finish = useCallback(async () => {
        setPhase('done');
        setDemoWorld(false);
        setGesturePrimed(false);
        if (typeof document !== 'undefined') {
            document.body.removeAttribute('data-onboarding-highlight');
        }

        // 1. Clean up any legacy flag
        try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch {}

        // 2. Sync with backend if logged in
        try {
            const userStr = localStorage.getItem('sl_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // Update backend
                await api.patch('/users/me', { onboardingCompleted: true });
                // Update local storage user object to keep it in sync
                user.onboardingCompleted = true;
                localStorage.setItem('sl_user', JSON.stringify(user));
                // Clean up legacy local flag
                try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch {}
            }
        } catch (err) {
            console.error('[Onboarding] Failed to sync status with backend:', err);
        }
    }, []);

    const skipTour = useCallback(() => {
        finish();
    }, [finish]);

    const markCompleted = useCallback(() => {
        finish();
    }, [finish]);

    const startTour = useCallback(() => {
        setStepIndex(0);
        setDemoWorld(true);
        setGesturePrimed(false);
        setPhase('running');
    }, []);

    const replayTour = useCallback(() => {
        try {
            localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        } catch {
            /* ignore */
        }
        setStepIndex(0);
        setDemoWorld(true);
        setGesturePrimed(false);
        setPhase('running');
    }, []);

    const primeTourGesture = useCallback(() => {
        setGesturePrimed(true);
    }, []);

    const nextStep = useCallback(() => {
        setStepIndex((i) => {
            const next = i + 1;
            if (next >= ONBOARDING_STEPS.length) {
                finish();
                return i;
            }
            const step = ONBOARDING_STEPS[next];
            if (step?.hideDemoWorldAfter) setDemoWorld(false);
            return next;
        });
    }, [finish]);

    // Leaving allowed shell routes ends the tour (field trips exempt).
    useEffect(() => {
        if (phase !== 'running') return;
        if (isTourNavigationExempt(pathname)) return;
        finish();
    }, [pathname, phase, finish]);

    // Auto-start once on /match for users who have not completed onboarding
    useEffect(() => {
        if (pathname !== '/match') return;
        if (phase !== 'idle') return;

        // Check user status
        try {
            const userStr = localStorage.getItem('sl_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // If logged in, prioritize the DB-synced flag
                if (user.onboardingCompleted) {
                    setPhase('done');
                    return;
                }
                // If logged in and flag is false, proceed to auto-start (even if local key exists)
            } else {
                // Guest mode: Fallback to local storage key
                if (localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
                    setPhase('done');
                    return;
                }
            }
        } catch {
            /* ignore */
        }

        const t = setTimeout(() => startTour(), 1400);
        return () => clearTimeout(t);
    }, [pathname, phase, startTour]);

    const step = ONBOARDING_STEPS[Math.min(stepIndex, ONBOARDING_STEPS.length - 1)];

    useEffect(() => {
        if (phase !== 'running' || !step) return;
        if (typeof document !== 'undefined') {
            document.body.dataset.onboardingHighlight = step.highlight;
        }
        return () => {
            if (typeof document !== 'undefined') {
                document.body.removeAttribute('data-onboarding-highlight');
            }
        };
    }, [phase, stepIndex, step]);

    useEffect(() => {
        if (phase !== 'running' || !step?.hideDemoWorldAfter) return;
        setDemoWorld(false);
    }, [phase, stepIndex, step?.hideDemoWorldAfter]);

    const value = useMemo<OnboardingContextValue>(
        () => ({
            phase,
            isTourActive: phase === 'running',
            gesturePrimed,
            isDemoWorldVisible: phase === 'running' && demoWorld,
            stepIndex,
            totalSteps: ONBOARDING_STEPS.length,
            highlight: step?.highlight ?? 'none',
            startTour,
            skipTour,
            nextStep,
            primeTourGesture,
            replayTour,
            markCompleted,
        }),
        [
            phase,
            gesturePrimed,
            demoWorld,
            stepIndex,
            step,
            startTour,
            skipTour,
            nextStep,
            primeTourGesture,
            replayTour,
            markCompleted,
        ]
    );

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
    const ctx = useContext(OnboardingContext);
    if (!ctx) {
        throw new Error('useOnboarding must be used within OnboardingProvider');
    }
    return ctx;
}

/** Safe for optional UI (e.g. settings “replay” later). */
export function useOnboardingOptional(): OnboardingContextValue | null {
    return useContext(OnboardingContext);
}
