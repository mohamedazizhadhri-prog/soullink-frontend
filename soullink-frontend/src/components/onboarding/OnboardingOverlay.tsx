'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useOnboarding } from '@/context/OnboardingContext';
import {
    DEFAULT_DWELL_MS,
    ONBOARDING_ANCHOR_ATTR,
    ONBOARDING_STEPS,
    type OnboardingHighlight,
    type OnboardingMontage,
} from '@/lib/onboardingDemo';
import { useNovaDispatch, useNovaState } from '@/context/NovaContext';
import { ttsService } from '@/services/ttsService';
import styles from './OnboardingOverlay.module.css';

const HIGHLIGHT_TO_ANCHOR: Record<OnboardingHighlight, string> = {
    none: ONBOARDING_ANCHOR_ATTR.novaHome,
    friends: ONBOARDING_ANCHOR_ATTR.friendsRail,
    servers: ONBOARDING_ANCHOR_ATTR.serverRail,
    match: ONBOARDING_ANCHOR_ATTR.matchDashboard,
    games: ONBOARDING_ANCHOR_ATTR.soulGames,
    top_nav: ONBOARDING_ANCHOR_ATTR.topNav,
    top_nav_actions: ONBOARDING_ANCHOR_ATTR.topNavActions,
    home_sidebar: ONBOARDING_ANCHOR_ATTR.homeSidebar,
    nova_panel: ONBOARDING_ANCHOR_ATTR.novaPanel,
};

function queryAnchor(attr: string): HTMLElement | null {
    return document.querySelector(`[data-onboarding-anchor="${attr}"]`);
}

function runMontage(
    kind: OnboardingMontage,
    dispatch: ReturnType<typeof useNovaDispatch>
): () => void {
    const {
        setPacManMode,
        triggerPacManGulp,
        triggerAngelic,
        triggerEmote,
        triggerRich,
        setStormMode,
        setWaterLevel,
        setIsSauronMode,
        setIsMelting,
        setIsDancing,
    } = dispatch;
    const timers: number[] = [];

    const push = (fn: () => void, ms: number) => {
        timers.push(window.setTimeout(fn, ms));
    };

    switch (kind) {
        case 'pacman':
            setPacManMode(true);
            push(() => triggerPacManGulp(), 450);
            push(() => triggerPacManGulp(), 1400);
            push(() => triggerPacManGulp(), 2350);
            push(() => setPacManMode(false), 3200);
            break;
        case 'angelic':
            triggerAngelic();
            triggerEmote('angelic');
            break;
        case 'storm_brief':
            setStormMode(true);
            push(() => {
                setStormMode(false);
                setWaterLevel(0);
            }, 2800);
            break;
        case 'rich':
            triggerRich();
            break;
        case 'sad':
            break;
        case 'sauron_brief':
            setIsSauronMode(true);
            push(() => setIsSauronMode(false), 3000);
            break;
        case 'melting_brief':
            setIsMelting(true);
            push(() => setIsMelting(false), 2200);
            break;
        case 'dance_brief':
            setIsDancing(true);
            push(() => setIsDancing(false), 2200);
            break;
        case 'glitched_brief':
            triggerEmote('oops');
            break;
        case 'watch_party':
            // Shy bounce (👉👈) then blush
            triggerEmote('shybounce');
            push(() => triggerEmote('blush'), 1600);
            break;
        default:
            break;
    }

    return () => {
        timers.forEach((t) => window.clearTimeout(t));
        setPacManMode(false);
        setStormMode(false);
        setWaterLevel(0);
        setIsSauronMode(false);
        setIsMelting(false);
        setIsDancing(false);
    };
}

export function OnboardingOverlay() {
    const router = useRouter();
    const pathname = usePathname();
    const {
        isTourActive,
        gesturePrimed,
        stepIndex,
        totalSteps,
        highlight,
        skipTour,
        nextStep,
        primeTourGesture,
    } = useOnboarding();

    const nova = useNovaDispatch();
    const {
        setMood,
        setNovaPosition,
        setAudioMuted,
        setCinematicMode,
        triggerSmart,
        triggerEmote,
        addMessage,
    } = nova;
    const { isAudioMuted } = useNovaState();

    const step = ONBOARDING_STEPS[Math.min(stepIndex, ONBOARDING_STEPS.length - 1)];

    const hadActiveTour = useRef(false);
    const unmutePayoffForStep = useRef<string | null>(null);

    const handleBeginTour = useCallback(() => {
        ttsService.primeFromUserGesture();
        primeTourGesture();
        // Advance off the `gesture_gate` step. Otherwise `gesturePrimed` flips true while we
        // stay on the same step — `showGestureGate` becomes false and the card has no
        // Begin/Next, only "Exit tour".
        nextStep();
    }, [primeTourGesture, nextStep]);

    useEffect(() => {
        if (step.wait !== 'unmute_gate') unmutePayoffForStep.current = null;
    }, [step.wait, step.id]);

    useEffect(() => {
        if (isTourActive) hadActiveTour.current = true;
        if (!isTourActive && hadActiveTour.current) {
            hadActiveTour.current = false;
            setNovaPosition(null);
            nova.setPacManMode(false);
            nova.setStormMode(false);
            nova.setWaterLevel(0);
            nova.setIsSauronMode(false);
            nova.setIsMelting(false);
            nova.setIsDancing(false);
            setCinematicMode(false);
            ttsService.stop();
        }
    }, [isTourActive, setNovaPosition, setCinematicMode, nova]);

    useEffect(() => {
        if (!isTourActive || !step?.mood) return;
        setMood(step.mood);
    }, [isTourActive, stepIndex, step?.mood, setMood]);

    useEffect(() => {
        if (!isTourActive) return;
        if (step.cinematic) setCinematicMode(true);
        if (step.cinematicOff) setCinematicMode(false);
    }, [isTourActive, stepIndex, step.cinematic, step.cinematicOff, setCinematicMode]);

    useEffect(() => {
        if (!isTourActive || !step.forcesMute) return;
        setAudioMuted(true);
    }, [isTourActive, stepIndex, step.forcesMute, step.id, setAudioMuted]);

    useEffect(() => {
        if (!isTourActive || !step.setSmartMode) return;
        triggerSmart();
    }, [isTourActive, stepIndex, step.setSmartMode, step.id, triggerSmart]);

    useEffect(() => {
        if (!isTourActive || !step.emote) return;
        triggerEmote(step.emote);
    }, [isTourActive, stepIndex, step.emote, step.id, triggerEmote]);

    useEffect(() => {
        if (!isTourActive || !step.routerPushOnEnter) return;
        router.push(step.routerPushOnEnter);
    }, [isTourActive, stepIndex, step.routerPushOnEnter, router]);

    useEffect(() => {
        if (!isTourActive || !gesturePrimed || step.wait !== 'path_gate' || !step.expectedPath) return;
        if (!pathname.startsWith(step.expectedPath)) return;
        const id = window.setTimeout(() => nextStep(), 80);
        return () => window.clearTimeout(id);
    }, [isTourActive, gesturePrimed, stepIndex, pathname, step.wait, step.expectedPath, step.id, nextStep]);

    useEffect(() => {
        if (!isTourActive || !step.chatLinesOnEnter?.length) return;
        const timers: number[] = [];
        step.chatLinesOnEnter.forEach((line, i) => {
            timers.push(
                window.setTimeout(() => {
                    addMessage(line, 'nova', { speak: false });
                }, i * 720)
            );
        });
        return () => timers.forEach((t) => window.clearTimeout(t));
    }, [isTourActive, stepIndex, step.id, step.chatLinesOnEnter, addMessage]);

    const flyNovaToHighlight = useCallback(() => {
        if (!isTourActive) return;
        const attr = HIGHLIGHT_TO_ANCHOR[step.highlight];
        const el = queryAnchor(attr);
        if (el) {
            const r = el.getBoundingClientRect();
            setNovaPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        } else {
            setNovaPosition(null);
        }
    }, [isTourActive, step.highlight, setNovaPosition]);

    useLayoutEffect(() => {
        if (!isTourActive) return;
        let raf = 0;
        raf = requestAnimationFrame(() => {
            requestAnimationFrame(flyNovaToHighlight);
        });
        const onResize = () => flyNovaToHighlight();
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
        };
    }, [isTourActive, stepIndex, flyNovaToHighlight]);

    useEffect(() => {
        if (!isTourActive || !gesturePrimed || step.wait !== 'tts_then_dwell' || !step.speakLine) return;

        const speakLine = step.speakLine;
        let cancelled = false;
        let dwellTimer: number | null = null;
        const dwell = step.dwellAfterSpeechMs ?? DEFAULT_DWELL_MS;

        void (async () => {
            ttsService.stop();
            try {
                await ttsService.streamSpeech(speakLine);
            } catch {
                /* play / network errors */
            }
            if (cancelled) return;
            dwellTimer = window.setTimeout(() => {
                if (cancelled) return;
                nextStep();
            }, dwell);
        })();

        return () => {
            cancelled = true;
            if (dwellTimer !== null) window.clearTimeout(dwellTimer);
            ttsService.stop();
        };
    }, [isTourActive, gesturePrimed, stepIndex, step.wait, step.speakLine, step.dwellAfterSpeechMs, step.id, nextStep]);

    useEffect(() => {
        if (!isTourActive || !gesturePrimed || step.wait !== 'montage_then_dwell' || !step.montage) return;

        let cancelled = false;
        const cleanupMontage = runMontage(step.montage, nova);
        const dwell = step.dwellAfterSpeechMs ?? DEFAULT_DWELL_MS;

        void (async () => {
            if (step.speakLine) {
                ttsService.stop();
                try {
                    await ttsService.streamSpeech(step.speakLine);
                } catch {
                    /* ignore */
                }
            }
            if (cancelled) return;
            await new Promise<void>((r) => setTimeout(r, dwell));
            if (cancelled) return;
            cleanupMontage();
            nextStep();
        })();

        return () => {
            cancelled = true;
            cleanupMontage();
            ttsService.stop();
        };
        // Nova dispatch bundle is intentionally omitted — setter identities are stable enough for montage.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isTourActive,
        gesturePrimed,
        stepIndex,
        step.wait,
        step.montage,
        step.speakLine,
        step.dwellAfterSpeechMs,
        step.id,
        nextStep,
    ]);

    useEffect(() => {
        if (!isTourActive || !gesturePrimed || step.wait !== 'unmute_gate') return;
        if (isAudioMuted) return;
        if (unmutePayoffForStep.current === step.id) return;
        unmutePayoffForStep.current = step.id;

        let cancelled = false;

        void (async () => {
            const line = step.firstTtsAfterUnmute || step.speakLine;
            if (line) {
                ttsService.stop();
                try {
                    await ttsService.streamSpeech(line);
                } catch {
                    /* ignore */
                }
            }
            if (cancelled) return;
            setMood('laugh');
            triggerEmote('success');
            await new Promise<void>((r) => setTimeout(r, 900));
            if (!cancelled) nextStep();
        })();

        return () => {
            cancelled = true;
            ttsService.stop();
        };
    }, [
        isTourActive,
        gesturePrimed,
        step.wait,
        step.id,
        isAudioMuted,
        step.firstTtsAfterUnmute,
        step.speakLine,
        setMood,
        triggerEmote,
        nextStep,
    ]);

    useEffect(() => {
        if (!isTourActive) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            if (step.wait === 'gesture_gate' && !gesturePrimed) return;
            nextStep();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isTourActive, step.wait, gesturePrimed, nextStep]);

    if (!isTourActive || !step) return null;

    const progress = ((stepIndex + 1) / totalSteps) * 100;
    const showGestureGate = step.wait === 'gesture_gate' && !gesturePrimed;
    const showNextBeat = gesturePrimed && step.wait === 'manual_only';

    return (
        <>
            <div
                data-onboarding-anchor={ONBOARDING_ANCHOR_ATTR.soulGames}
                className={styles.gamesAnchor}
                aria-hidden
            />
            <div
                className={styles.backdrop}
                data-highlight={highlight === 'none' ? undefined : highlight}
                role="dialog"
                aria-modal="true"
                aria-labelledby="onboarding-title"
            >
                {showGestureGate ? (
                    <div className={styles.voiceGate}>
                        <span className={styles.voiceGateBadge}>
                            Nova tour · Act {step.act} · {stepIndex + 1}/{totalSteps}
                        </span>
                        <h2 id="onboarding-title" className={styles.voiceGateTitle}>
                            {step.title}
                        </h2>
                        <p className={styles.voiceGateBody}>{step.body}</p>
                        <p className={styles.voiceGatePrimaryHint}>
                            Tap <strong>Begin tour</strong> to continue — one click unlocks voice for later acts (the
                            browser requires it). I’ll do one short voice line, then the mute challenge starts.
                        </p>
                        <div className={styles.voiceGateActions}>
                            <button type="button" className={styles.voiceGateBtn} onClick={handleBeginTour}>
                                Begin tour
                            </button>
                            <button type="button" className={styles.btnSkip} onClick={skipTour}>
                                Skip entire tour
                            </button>
                        </div>
                        <div className={styles.progress} aria-hidden style={{ maxWidth: 360, width: '100%' }}>
                            <span style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                ) : null}

                {!showGestureGate ? (
                <div className={styles.card}>
                    <div className={styles.topRow}>
                        <span className={styles.badge}>
                            Nova tour · Act {step.act} · {stepIndex + 1}/{totalSteps}
                        </span>
                        <button type="button" className={styles.btnSkip} onClick={skipTour}>
                            Skip entire thing
                        </button>
                    </div>
                    <h2 id="onboarding-title" className={styles.title}>
                        {step.title}
                    </h2>
                    <p className={styles.body}>{step.body}</p>
                    {gesturePrimed && step.wait === 'tts_then_dwell' ? (
                        <p className={styles.ttsHint}>Voice plays first; Escape skips this beat.</p>
                    ) : null}
                    {gesturePrimed && step.wait === 'unmute_gate' ? (
                        <p className={styles.ttsHint}>Unmute Nova in the panel (bottom) — then the payoff line plays.</p>
                    ) : null}
                    {gesturePrimed && step.wait === 'path_gate' ? (
                        <p className={styles.ttsHint}>Following the scripted route… Escape skips if you&apos;re stuck.</p>
                    ) : null}
                    <div className={styles.actions}>
                        {showNextBeat ? (
                            <button type="button" className={styles.btnPrimary} onClick={() => nextStep()}>
                                Next beat
                            </button>
                        ) : null}
                        <button type="button" className={styles.btnGhost} onClick={skipTour}>
                            Exit tour
                        </button>
                    </div>
                    <div className={styles.progress} aria-hidden>
                        <span style={{ width: `${progress}%` }} />
                    </div>
                </div>
                ) : null}
            </div>
        </>
    );
}
