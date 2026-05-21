"use client";
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, Variants } from "framer-motion";
import styles from "../NovaAvatar.module.css";
import { Volume2, VolumeX, Settings2, Power, Brain, HelpCircle, Search, Zap, Heart, MousePointer2, Frown, Sparkles, Smile, Droplets, Flame, Ghost, Lock, Video, Coffee, Coins } from "lucide-react";
import { useNovaState, useNovaDispatch } from "@/context/NovaContext";
import { NovaEmotes } from "../NovaEmotes";
import { NovaThinkingState } from "../NovaThinkingState";
import eyeballImg from "@/assets/eyeball.jpg";
import chickenGif from "@/assets/chicken.gif";
import { NovaBlackHole } from "../NovaBlackHole";
import { NovaMoodParticles } from "./renderers/NovaMoodParticles";
import { NovaSauronRenderer } from "./renderers/NovaSauronRenderer";
import { NovaSuperSaiyanRenderer } from "./renderers/NovaSuperSaiyanRenderer";
import { NovaCinematicRenderer } from "./renderers/NovaCinematicRenderer";
import { aiService } from "@/services/aiService";

const HEART_PATHS = {
    circleLeft: "M 24 0 A 24 24 0 0 0 24 48 L 24 24 Z",
    circleRight: "M 24 0 A 24 24 0 0 1 24 48 L 24 24 Z",
    heartLeft: "M 24 42 C 10 32 0 20 0 11 C 0 5 5 0 11 0 C 15 0 19 2 24 6 L 24 42 Z",
    heartRight: "M 24 42 C 38 32 48 20 48 11 C 48 5 43 0 37 0 C 33 0 29 2 24 6 L 24 42 Z"
};
interface NovaAvatarProps {
    size?: number;
    overrideMood?: string;
    disableCuriousMode?: boolean;
    isTypingPassword?: boolean;
}

export function NovaAvatarComponent({ size: propSize, overrideMood, disableCuriousMode, isTypingPassword }: NovaAvatarProps = {}) {

    const state = useNovaState();
    const dispatch = useNovaDispatch();

    const {
        mood, status, isTracking, emote, pulseTrigger, isPacManMode, gulpTrigger,
        consumedFriendIds, isCinematicMode, waterLevel, splashTrigger,
        isStormMode, isAscending, isDead, deathPhase, eatenElements,
        curiousTarget, novaPosition, investigationContext, homePosition,
        isHunting, isSpitting, huntTarget, isSingularity,
        isKillingMachine, targetingData, isFiring,
        isHeartbroken, isMelting, temperature, isSmart, isEgg,
        isDancing, isSuperSaiyan, ssjLevel, isSauronMode, visionRadius, ashIntensity, followCursorMode,
        isNightMode, isAudioMuted
    } = state;

    const {
        setMood, setIsAscending, setIsDead, setChatDisabled, setDeathPhase,
        addMessage, triggerEmote, triggerBlush, setCuriousTarget, setNovaPosition,
        setInvestigationContext, recordInteraction, setIsEgg, setIsDancing,
        setIsSauronMode, setVisionRadius, setAshIntensity, setFollowCursorMode,
        setIsNightMode, setStormMode, setGulpTrigger, setAudioMuted
    } = dispatch;


    const moodRef = useRef(mood);
    useEffect(() => {
        moodRef.current = mood;
    }, [mood]);

    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const [isHovered, setIsHovered] = useState(false);

    // Interaction State
    const [clickRipple, setClickRipple] = useState<{ x: number, y: number, key: number } | null>(null);

    // Animation state for the pulse feedback
    const [pulseActive, setPulseActive] = useState(0);

    // Falling State for Boredom / Heartbreak
    const fallY = useMotionValue(0);
    const smoothFallY = useSpring(fallY, { damping: 40, stiffness: 30 });

    // Broken Heart Sequence State
    const [isCracked, setIsCracked] = useState(false);
    const [shakeTrigger, setShakeTrigger] = useState(0);

    // Crazy State logic
    const [crazyBounce, setCrazyBounce] = useState({ x: 0, y: 0 });
    const [crazyVelocity, setCrazyVelocity] = useState({ x: 4, y: 3 });
    const [isRebooting, setIsRebooting] = useState(false);

    // Cursed state logic
    const [isPeeking, setIsPeeking] = useState(false);
    const [jumpscare, setJumpscare] = useState(false);

    // Confused state - digital static
    const [staticGlitch, setStaticGlitch] = useState(false);

    const [isAILoading, setIsAILoading] = useState(false);
    const [isLunge, setIsLunge] = useState(false);

    const [exorcismProgress, setExorcismProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);

    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const investigationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastHourRef = useRef<number>(new Date().getHours());
    const sessionStartTimeRef = useRef<number>(Date.now());
    const currentElementRef = useRef<HTMLElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Death/Ascension Timer
    const [drownTimer, setDrownTimer] = useState(0);

    const [isBashful, setIsBashful] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Privacy Pivot State
    const [isPeekingNow, setIsPeekingNow] = useState(false);
    const [isVibrating, setIsVibrating] = useState(false);
    const lastTypeRef = useRef<number>(0);

    // Hatchling Easter Egg State
    const [hatchPhase, setHatchPhase] = useState<'egg' | 'cracking' | 'hatched'>('egg');
    const [eggFractures, setEggFractures] = useState<{ id: number; d: string }[]>([]);

    // Removed mood particles logic

    // Melting Transition Intensity (kept for core visual styling)
    const [meltingIntensity, setMeltingIntensity] = useState(0); // 0 to 1 fade-in
    useEffect(() => {
        if (isMelting) {
            const intensityTimer = setInterval(() => {
                setMeltingIntensity(prev => Math.min(prev + 0.05, 1));
            }, 150);
            return () => clearInterval(intensityTimer);
        } else {
            setMeltingIntensity(0);
        }
    }, [isMelting]);
    // Removed sauron mode particles logic
    // Sauron Gaze Beam — track mouse position for the beam direction + site interactivity
    const [gazeTarget, setGazeTarget] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const gazedElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isSauronMode) {
            // Clean up any gazed elements
            if (gazedElementRef.current) {
                gazedElementRef.current.classList.remove('sauronGazed');
                gazedElementRef.current = null;
            }
            return;
        }

        const handleGazeMove = (e: MouseEvent) => {
            setGazeTarget({ x: e.clientX, y: e.clientY });
        };

        // Site interactivity — detect elements under gaze
        const gazeDetectInterval = setInterval(() => {
            const el = document.elementFromPoint(gazeTarget.x, gazeTarget.y) as HTMLElement | null;
            if (!el || el === document.body || el === document.documentElement) return;

            // Skip Nova itself and the overlay layers
            if (el.closest('[data-nova]') || el.style.pointerEvents === 'none') return;

            // Remove glow from previously gazed element
            if (gazedElementRef.current && gazedElementRef.current !== el) {
                gazedElementRef.current.classList.remove('sauronGazed');
            }

            // Apply glow + tremble to the element under gaze
            if (el.tagName !== 'HTML' && el.tagName !== 'BODY') {
                el.classList.add('sauronGazed');
                gazedElementRef.current = el;

                // Auto-recover after 1.5s
                setTimeout(() => {
                    el.classList.remove('sauronGazed');
                }, 1500);
            }
        }, 300);

        window.addEventListener('mousemove', handleGazeMove);
        return () => {
            window.removeEventListener('mousemove', handleGazeMove);
            clearInterval(gazeDetectInterval);
            if (gazedElementRef.current) {
                gazedElementRef.current.classList.remove('sauronGazed');
            }
        };
    }, [isSauronMode, gazeTarget.x, gazeTarget.y]);

    // Removed remaining particle hooks
    useEffect(() => {
        let interval: any;
        if (waterLevel > 90 && !isAscending && isStormMode) {
            interval = setInterval(() => {
                setDrownTimer(prev => {
                    if (prev >= 300) return 300; // Cap at 30s
                    return prev + 1;
                });
            }, 100);
        } else {
            setDrownTimer(0);
        }
        return () => clearInterval(interval);
    }, [waterLevel, isAscending, isStormMode]);

    useEffect(() => {
        if (drownTimer >= 30 && !isAscending && !isDead) { // After 3s of drowning risk
            setDeathPhase(1); // Panic
        }
        if (drownTimer >= 70 && !isAscending && !isDead) { // Deep underwater
            setDeathPhase(2); // Suffocation
        }
        if (drownTimer >= 150 && !isAscending && !isDead) { // 15s total
            setDeathPhase(3); // Death
            setIsDead(true);
            setStormMode(false); // Trigger Drain immediately
            setChatDisabled(true);
            addMessage("...g...l...u...b...", 'nova');

            // Spotlight shines after 2s of death
            setTimeout(() => {
                setDeathPhase(4); // Trigger Spotlight (visual handled in render)
            }, 2000);

            // Rebirth and Ascension after 4.5s
            setTimeout(() => {
                setMood('angelic');
                triggerEmote('angelic');
                setIsDead(false);
                setIsAscending(true);
                setDeathPhase(0); // Reset all death logic
                setChatDisabled(false);
            }, 4500);
        }
    }, [drownTimer, isAscending, isDead, setDeathPhase, setIsDead, setChatDisabled, addMessage, setIsAscending, setMood, triggerEmote]);

    useEffect(() => {
        if (mood === 'cursed') {
            const peekInterval = setInterval(() => {
                if (Math.random() > 0.8) setIsPeeking(prev => !prev);
            }, 3000);

            const jumpscareInterval = setInterval(() => {
                if (Math.random() > 0.95) {
                    setJumpscare(true);
                    setTimeout(() => setJumpscare(false), 100);
                }
            }, 2000);

            return () => {
                clearInterval(peekInterval);
                clearInterval(jumpscareInterval);
            };
        } else {
            setIsPeeking(false);
            setJumpscare(false);
        }
    }, [mood]);

    // Privacy Pivot Peeking & Vibration Logic
    useEffect(() => {
        if (!isTypingPassword) {
            setIsPeekingNow(false);
            setIsVibrating(false);
            return;
        }

        // Peeking loop: Every 5 seconds, peek for 1 second
        const peekInterval = setInterval(() => {
            setIsPeekingNow(true);
            setTimeout(() => setIsPeekingNow(false), 1000);
        }, 5000);

        return () => clearInterval(peekInterval);
    }, [isTypingPassword]);

    // Track typing to trigger vibration during peek
    useEffect(() => {
        if (isTypingPassword) {
            if (isPeekingNow) {
                // Instantly reset with vibration
                setIsPeekingNow(false);
                setIsVibrating(true);
                setTimeout(() => setIsVibrating(false), 300);
            }
        }
    }, [isTypingPassword, isPeekingNow]);

    useEffect(() => {
        let timer: any;
        if (isHolding && mood === 'cursed') {
            const start = Date.now();
            timer = setInterval(() => {
                const elapsed = Date.now() - start;
                const progress = Math.min(elapsed / 3000, 1);
                setExorcismProgress(progress);
                if (progress >= 1) {
                    if (!isAscending) setMood('neutral');
                    setIsRebooting(true);
                    setIsHolding(false);
                    setExorcismProgress(0);
                    setTimeout(() => setIsRebooting(false), 1500);
                }
            }, 50);
        } else {
            setExorcismProgress(0);
        }
        return () => clearInterval(timer);
    }, [isHolding, mood, setMood]);

    useEffect(() => {
        if (mood === 'crazy') {
            const interval = setInterval(() => {
                setCrazyBounce(prev => {
                    let nextX = prev.x + crazyVelocity.x;
                    let nextY = prev.y + crazyVelocity.y;
                    let nextVX = crazyVelocity.x;
                    let nextVY = crazyVelocity.y;

                    if (nextX > 100 || nextX < -100) nextVX = -nextVX;
                    if (nextY > 200 || nextY < -200) nextVY = -nextVY;

                    setCrazyVelocity({ x: nextVX, y: nextVY });
                    return { x: nextX, y: nextY };
                });
            }, 16);
            return () => clearInterval(interval);
        } else {
            setCrazyBounce({ x: 0, y: 0 });
        }
    }, [mood, crazyVelocity]);

    useEffect(() => {
        if (mood !== 'crazy' && mood !== 'broken' && fallY.get() === 0) {
            // If we just exited a high-drama state, do a reboot flash
            // Logic simplified: we'll check previous mood in a ref if needed, 
            // but for now let's just trigger reboot when clicking away from crazy
        }
    }, [mood, fallY]);

    useEffect(() => {
        if (mood === 'broken') {
            const timer = setTimeout(() => {
                setShakeTrigger(prev => prev + 1);
                setTimeout(() => setIsCracked(true), 200);
            }, 800); // Wait for morph before crack
            return () => clearTimeout(timer);
        } else {
            setIsCracked(false);
        }
    }, [mood]);

    useEffect(() => {
        if (mood === 'bored' || isHeartbroken) {
            const container = document.getElementById('nova-orb-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                // Fall to bottom with 20px padding (permanent if heartbroken)
                fallY.set(window.innerHeight - rect.top - rect.height - 20);
            }
        } else {
            fallY.set(0);
        }
    }, [mood, isHeartbroken, windowSize, fallY]);

    useEffect(() => {
        if (pulseTrigger > 0) {
            setPulseActive(prev => prev + 1);
        }
    }, [pulseTrigger]);

    // Motion values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Reset Egg state when isEgg becomes false
    useEffect(() => {
        if (!isEgg) {
            setHatchPhase('egg');
            setEggFractures([]);
        }
    }, [isEgg]);

    // Track real orb position for global CSS variables (used by Shell mask)
    useLayoutEffect(() => {
        const updatePos = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                document.documentElement.style.setProperty('--nova-x', `${centerX}px`);
                document.documentElement.style.setProperty('--nova-y', `${centerY}px`);
            }
        };
        const interval = setInterval(updatePos, 32); // Sync at ~30fps
        return () => clearInterval(interval);
    }, []);

    // Physics Config based on Mood
    const softX = useSpring(mouseX, { damping: 60, stiffness: 40 });
    const softY = useSpring(mouseY, { damping: 60, stiffness: 40 });
    const defaultX = useSpring(mouseX, { damping: 25, stiffness: 150 });
    const defaultY = useSpring(mouseY, { damping: 25, stiffness: 150 });

    // Separate springs for eye to allow elastic/delayed tracking in love mode ("longing")
    const eyeSoftX = useSpring(mouseX, { damping: 40, stiffness: 15 });
    const eyeSoftY = useSpring(mouseY, { damping: 40, stiffness: 15 });
    const eyeDefaultX = useSpring(mouseX, { damping: isSauronMode ? 100 : 25, stiffness: isSauronMode ? 60 : 150 });
    const eyeDefaultY = useSpring(mouseY, { damping: isSauronMode ? 100 : 25, stiffness: isSauronMode ? 60 : 150 });

    const smoothX = mood === 'love' ? softX : defaultX;
    const smoothY = mood === 'love' ? softY : defaultY;
    const eyeSmoothX = mood === 'love' ? eyeSoftX : eyeDefaultX;
    const eyeSmoothY = mood === 'love' ? eyeSoftY : eyeDefaultY;

    const trackFactor = status === "offline" ? 0 : 1;

    // Lazy Eye Randomized Drift
    const [eyeDrift, setEyeDrift] = useState({ x: 0, y: 0 });
    useEffect(() => {
        if (mood === 'bored') {
            const interval = setInterval(() => {
                if (Math.random() > 0.7) {
                    setEyeDrift({
                        x: (Math.random() - 0.5) * 12, // Reduced range
                        y: Math.random() * 8 + 8      // Drift downwards but stay inside
                    });
                } else {
                    setEyeDrift({ x: 0, y: 0 }); // Snap back lazily
                }
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [mood]);

    const auraX = useTransform(smoothX, (v) => (v / (windowSize.width || 1)) * 10 * trackFactor);
    const auraY = useTransform(smoothY, (v) => (v / (windowSize.height || 1)) * 10 * trackFactor);

    const coreX = useTransform(smoothX, (v) => (v / (windowSize.width || 1)) * 24 * trackFactor);
    const coreY = useTransform(smoothY, (v) => (v / (windowSize.height || 1)) * 24 * trackFactor);

    const eyeXBase = useTransform(eyeSmoothX, (v) => (v / (windowSize.width || 1)) * 40 * trackFactor);
    const eyeYBase = useTransform(eyeSmoothY, (v) => (v / (windowSize.height || 1)) * 40 * trackFactor);

    // Combine base eye position with mood offsets and drift, then clamp to stay inside 48px orb
    // Max displacement for eye center in a 48px core (radius 24) with 16px eye (radius 8) is 16px
    const eyeX = useTransform(eyeXBase, (v) => {
        const total = v + eyeDrift.x;
        if (mood === 'crazy') return -total; // Inverted tracking
        if (mood === 'cursed') return total; // Precision tracking (no smoothing adjustment needed, but we keep base)
        return mood === 'bored' ? Math.max(-14, Math.min(14, total * 0.4)) : total;
    });
    const eyeY = useTransform(eyeYBase, (v) => {
        let y = v + eyeDrift.y;
        if (mood === 'thinking') y -= 8;
        if (emote === 'nod') y -= 10;
        if (mood === 'crazy') return -y; // Inverted tracking
        if (mood === 'cursed') return y; // Precision tracking
        return mood === 'bored' ? Math.max(-10, Math.min(16, y * 0.4)) : y;
    });

    useEffect(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });

        const handleMouseMove = (e: MouseEvent) => {
            if (!isTracking) {
                mouseX.set(0);
                mouseY.set(0);
                return;
            }

            // Calculate mouse position relative to the avatar container's center
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Set motion values as offset from center
                mouseX.set(e.clientX - centerX);
                mouseY.set(e.clientY - centerY);
            } else {
                // Fallback to screen center if container is not ready
                const x = e.clientX - window.innerWidth / 2;
                const y = e.clientY - window.innerHeight / 2;
                mouseX.set(x);
                mouseY.set(y);
            }
        };

        const playCashSound = () => {
            const audio = new Audio('/sounds/cash-register.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });
        };

        const spawnWealthBurst = () => {
            // Disabled locally due to hook extraction. Can be reintroduced via event.
        };

        const handleClick = (e?: MouseEvent) => {
            setClickRipple({ x: 0, y: 0, key: Date.now() });

            if (moodRef.current === 'rich') {
                playCashSound();
                spawnWealthBurst();
            }

            if (moodRef.current === 'love') {
                setIsBashful(true);
                setTimeout(() => setIsBashful(false), 1000);
            }
        };

        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("resize", handleResize);
        window.addEventListener("click", handleClick);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("click", handleClick);
        };
    }, [mouseX, mouseY, isTracking]);

    // Time Awareness & Periodic Engagement System
    useEffect(() => {
        const timeInterval = setInterval(() => {
            const now = new Date();
            const currentHour = now.getHours();

            // 1. Hourly Awareness (Greeting or Reflection)
            if (currentHour !== lastHourRef.current && !isDead && !isAscending) {
                lastHourRef.current = currentHour;

                // Only trigger if we aren't mid-interaction
                if (mood === 'neutral' || mood === 'bored') {
                    if (currentHour === 0) {
                        setMood('thinking');
                        triggerEmote('nod');
                    } else if (currentHour === 12) {
                        setMood('happy');
                        // Happy doesn't have an emote, it's a mood. triggerEmote('nod') as a pulse.
                        triggerEmote('nod');
                    } else if (currentHour >= 22 || currentHour <= 4) {
                        setMood('thinking');
                        triggerEmote('nod');
                    }
                }
            }

            // 2. Long Session Awareness (Every 30 mins)
            const sessionDurationMins = Math.floor((Date.now() - sessionStartTimeRef.current) / 60000);
            if (sessionDurationMins > 0 && sessionDurationMins % 30 === 0 && !isDead) {
                // Trigger a subtle pulse or ripple to show "life"
                setGulpTrigger(prev => prev + 1);
            }

        }, 60000); // Check every minute

        return () => clearInterval(timeInterval);
    }, [isDead, isAscending, mood, triggerEmote, setGulpTrigger]);

    // Hover-Watch System for Curious Mode
    useEffect(() => {
        if (disableCuriousMode) return;
        let hoverTimer: NodeJS.Timeout | null = null;

        const getContextMessage = (element: HTMLElement): { type: string; message: string } => {
            const tagName = element.tagName.toLowerCase();
            const role = element.getAttribute('role');

            if (tagName === 'button' || role === 'button') {
                return { type: 'button', message: 'This looks important... should we click it?' };
            } else if (tagName === 'input' || tagName === 'textarea') {
                return { type: 'input', message: "I'm ready to process whatever you type here!" };
            } else if (tagName === 'a') {
                return { type: 'link', message: 'I wonder where this leads us? My sensors suggest a new page.' };
            } else {
                return { type: 'generic', message: 'Hmm, interesting. Let me take a closer look at this.' };
            }
        };

        const handleMouseEnter = (target: HTMLElement) => {
            if (isHunting || isSpitting) return;

            // Phase 1: Glide Activation after 6s delay
            hoverTimerRef.current = setTimeout(() => {
                const rect = target.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                setMood('curious');
                setCuriousTarget({ x: centerX, y: centerY });
                setNovaPosition({ x: centerX, y: centerY });

                // Phase 2: AI Investigation (Chained to activate after glide starts)
                investigationTimerRef.current = setTimeout(async () => {
                    const tagName = target.tagName.toLowerCase();
                    const text = target.textContent?.slice(0, 50) || '';

                    setIsAILoading(true);
                    try {
                        const data = await aiService.investigate(`Investigate this ${tagName}: "${text}". Short curious comment (10 words max).`);
                        setInvestigationContext({
                            type: tagName,
                            message: data.response || 'Interesting...'
                        });
                    } catch {
                        setInvestigationContext(getContextMessage(target));
                    } finally {
                        setIsAILoading(false);
                    }
                }, 200); // 200ms buffer after gliding starts
            }, 6000); // 6s pause before activation as requested
        };

        const handleMouseLeave = () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            if (investigationTimerRef.current) clearTimeout(investigationTimerRef.current);

            if (moodRef.current === 'curious') {
                setCuriousTarget(null);
                setNovaPosition(null);
                setInvestigationContext(null);
                if (setMood && !isAscending) setMood('neutral');
            }
        };

        const handleClick = () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            if (investigationTimerRef.current) clearTimeout(investigationTimerRef.current);
            currentElementRef.current = null;

            if (moodRef.current === 'curious') {
                setCuriousTarget(null);
                setNovaPosition(null);
                setInvestigationContext(null);
                if (setMood && !isAscending) setMood('neutral');
            }
        };

        const handleGlobalMouseOver = (e: MouseEvent) => {
            if (isHunting || isSpitting) return;

            const target = (e.target as HTMLElement).closest('button, a, [role="button"], .card, .friendItem, .navItem, .sidebar-item, .notification-item, .icon-btn, [aria-label], input, textarea, [data-nova-investigate]');

            if (target === currentElementRef.current) return;

            // Clear old timers when switching targets
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            if (investigationTimerRef.current) clearTimeout(investigationTimerRef.current);

            currentElementRef.current = target as HTMLElement;
            if (currentElementRef.current) {
                handleMouseEnter(currentElementRef.current);
            } else {
                handleMouseLeave();
            }
        };

        const handleClickGlobal = () => {
            handleClick();
        };

        document.addEventListener('mouseover', handleGlobalMouseOver);
        document.addEventListener('click', handleClickGlobal);

        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            if (investigationTimerRef.current) clearTimeout(investigationTimerRef.current);
            document.removeEventListener('mouseover', handleGlobalMouseOver);
            document.removeEventListener('click', handleClickGlobal);
        };
    }, [setMood, setCuriousTarget, setNovaPosition, setInvestigationContext, isHunting, isSpitting]);

    // Typing Detection for Smart Mode Eye Focus
    useEffect(() => {
        const handleFocus = () => setIsTyping(true);
        const handleBlur = () => setIsTyping(false);

        const inputElement = document.getElementById('chat-input-container')?.querySelector('input, textarea');
        if (inputElement) {
            inputElement.addEventListener('focus', handleFocus);
            inputElement.addEventListener('blur', handleBlur);
            return () => {
                inputElement.removeEventListener('focus', handleFocus);
                inputElement.removeEventListener('blur', handleBlur);
            };
        }
    }, []);

    // Color Configs
    const getColors = () => {
        if (isDancing) return { core: "discoBall", eye: "#FFFFFF" }; // Using class name as signal
        if (isSuperSaiyan) return { core: "linear-gradient(135deg, #FFF7AE 0%, #FFD700 40%, #FFA500 100%)", eye: "#40E0D0" };
        if (isBashful) return { core: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)", eye: "#FFFFFF" };
        if (isDead || (deathPhase >= 2 && deathPhase < 5)) return { core: "linear-gradient(135deg, #2d3436 0%, #1e272e 100%)", eye: "#636e72" }; // Charcoal
        if (isAscending || mood === 'angelic') return { core: "linear-gradient(135deg, #FFD700 0%, #FFEC8B 50%, #FFFFFF 100%)", eye: "#FFFFFF" };
        if (mood === 'love') return { core: "linear-gradient(135deg, #fb7185 0%, #d946ef 100%)", eye: "#FFFFFF" };
        if (status === "offline") return { core: "linear-gradient(135deg, #2D2D42 0%, #4A4A60 100%)", eye: "#808080" };
        if (isPacManMode) return { core: "linear-gradient(135deg, #FFEF00 0%, #FFD700 100%)", eye: "#333" }; // Vibrant Pac-Man Yellow
        if (mood === 'happy') return { core: "linear-gradient(135deg, #fde047 0%, #f97316 100%)", eye: "#FFFFFF" };
        if (mood === 'angry') return { core: "linear-gradient(180deg, #000000 0%, #dc2626 100%)", eye: "#FFFFFF" };
        if (isSmart || mood === 'smart') return { core: "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)", eye: "#E0FFFF" };
        if (mood === 'glitched') return { core: "linear-gradient(90deg, #ff00ff 0%, #00ffff 50%, #ff0000 100%)", eye: "#00ff00" };
        if (isMelting) return { core: "linear-gradient(180deg, #FFFFFF 0%, #FF8C00 50%, #8B0000 100%)", eye: "#FFFFFF" };
        if (mood === 'rich') return { core: "repeating-radial-gradient(circle at center, #065f46 0, #047857 2px, #065f46 4px, #064e40 4px)", eye: "#22c55e" }; // Emerald Green with Guilloché-like ripple
        switch (emote || mood) { // Emote overrides mood colors if active
            case "thinking": return { core: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", eye: "#FFFFE0" };
            case "curious": return { core: "linear-gradient(135deg, #008080 0%, #00FFFF 100%)", eye: "#E0FFFF" };
            case "confused": return { core: "linear-gradient(135deg, #B8860B 0%, #FFA500 100%)", eye: "#FFFACD" };
            case "oops": return { core: "linear-gradient(135deg, #00BFFF 0%, #1e40af 100%)", eye: "#FFFFFF" };
            case "blushed": return { core: "linear-gradient(135deg, #C71585 0%, #FF69B4 100%)", eye: "#FFF0F5" };
            case "angry": return { core: "linear-gradient(135deg, #8B0000 0%, #FF0000 100%)", eye: "#FF4500" };
            case "angelic": return { core: "linear-gradient(135deg, #FFD700 0%, #FFEC8B 50%, #FFFFFF 100%)", eye: "#FFFFFF" }; // Vibrant Gold/Yellow

            case "bored": return { core: "linear-gradient(135deg, #475563 0%, #334155 100%)", eye: "#94A3B8" }; // Dull Slate-Blue
            case "sad": return { core: "linear-gradient(180deg, #1e293b 0%, #4b5563 100%)", eye: "#94a3b8" };
            case "disgusted": return { core: "linear-gradient(180deg, #84cc16 0%, #78350f 100%)", eye: "#a3e635" };
            case "broken": return { core: "linear-gradient(135deg, #2A1B3D 0%, #44318D 50%, #1A1A1D 100%)", eye: "#4A4A60" };
            case "crazy": return { core: "linear-gradient(135deg, #FF0000 0%, #A020F0 50%, #39FF14 100%)", eye: "#39FF14" };
            case "cursed": return { core: "linear-gradient(135deg, #1a1a1a 0%, #3a0000 50%, #000 100%)", eye: "#ff0000" };
            case "jealous": return { core: "linear-gradient(135deg, #10b981 0%, #7c3aed 100%)", eye: "#10b981" };
            default:
                if (isKillingMachine) return { core: "linear-gradient(180deg, #ef4444 0%, #000000 100%)", eye: "#ff0000" };
                return { core: "linear-gradient(135deg, #4B0082 0%, #7B68EE 50%, #00BFFF 100%)", eye: "#FFFFFF" };
        }
    };

    const isSubmerged = waterLevel > 80; // Nova is at the top
    const isNearWater = waterLevel > 60;

    const colors = getColors();

    const [showTears, setShowTears] = useState(false);

    // Deep Belly Laugh Sequence
    useEffect(() => {
        if (mood === 'laugh') {
            setShowTears(true);
            // Laugh for 3 seconds
            const timer = setTimeout(() => {
                setShowTears(false);
                // The "Recovery" Sigh
                // We'll mimic this by a transition to neutral but maybe we can animate the scale manually or assume neutral handles it.
                // To do a specific "Sigh" transition, we might need a transient state, but "neutral" with a specific spring might work.
                // For now, let's just reset to neutral.
                if (setMood && !isAscending) setMood('neutral');
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setShowTears(false);
        }
    }, [mood, setMood]);

    const [happySparks, setHappySparks] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);

    // Happy Sparkle Logic
    useEffect(() => {
        if (mood !== 'happy') {
            if (happySparks.length > 0) setHappySparks([]);
            return;
        }

        const interval = setInterval(() => {
            setHappySparks(prev => {
                const newSpark = {
                    id: Math.random(),
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 10,
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 1) * 15
                };
                return [...prev.slice(-15), newSpark];
            });
        }, 150);

        return () => clearInterval(interval);
    }, [mood, happySparks.length]);

    // Confused Digital Static Effect
    useEffect(() => {
        if (mood === 'confused') {
            const triggerGlitch = () => {
                setStaticGlitch(true);
                setTimeout(() => setStaticGlitch(false), 100);
            };

            // Random intervals between 1-4 seconds
            const scheduleNext = () => {
                const delay = Math.random() * 3000 + 1000;
                return setTimeout(() => {
                    triggerGlitch();
                    scheduleNext();
                }, delay);
            };

            const timer = scheduleNext();
            return () => clearTimeout(timer);
        }
    }, [mood]);

    // Berserker Ash Logic has been extracted to useNovaMoodParticles hook

    const handlePointerDown = () => {
        if (mood === 'cursed') setIsHolding(true);
        if (mood === 'angry') {
            setIsLunge(true);
            setTimeout(() => setIsLunge(false), 100);
        }
        // Trigger hatching if in egg state
        handleHatchClick();
    };

    const handlePointerUp = () => {
        setIsHolding(false);
    };

    const bodyVariants: Variants = {
        idle: { y: 0, x: 0, rotate: 0 },
        happy: {
            y: [0, -40, 0, -40, 0, -40, 0],
            scaleY: [0.85, 1, 0.85, 1, 0.85, 1, 0.85],
            rotate: [0, 0, 0, 0, 0, 0, 360],
            transition: {
                duration: 1.8,
                repeat: Infinity,
                times: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
                ease: "linear"
            }
        },
        bored: {
            scaleX: [1, 1.1, 1.3, 1.05], // Keep bored wobble but y is handled by fallY
            transition: { duration: 2 }
        },
        nod: {
            y: [0, 150, -300, 80, -40, 0],
            rotate: [0, 12, -8, 5, -2, 0],
            transition: {
                duration: 1.8,
                times: [0, 0.2, 0.5, 0.75, 0.9, 1],
                ease: "easeInOut"
            }
        },
        shake: {
            x: [0, -15, 15, -10, 10, 0],
            transition: { duration: 0.5, ease: "easeInOut" }
        },
        angry: {
            x: [0, -1.5, 1.5, -1.5, 1.5, 0],
            y: [0, -1.5, 1.5, -1.5, 1.5, 0],
            scaleY: 0.9,
            scaleX: 1.1,
            transition: {
                x: { duration: 0.1, repeat: Infinity },
                y: { duration: 0.1, repeat: Infinity },
                default: { duration: 0.2 }
            }
        },
        confused: {
            rotateY: 20,
            rotateZ: -15,
            y: [0, -5, 2, 0],
            transition: {
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                rotateY: { duration: 0.5 },
                rotateZ: { duration: 0.5 }
            }
        },
        curious: {
            rotateX: 20,
            rotateZ: 10,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15
            }
        },
        burp: {
            scale: [1, 1.5, 1],
            transition: { duration: 0.5, ease: "easeOut" }
        },
        broken: {
            x: shakeTrigger > 0 && !isCracked ? [0, -5, 5, -5, 5, 0] : 0,
            transition: { duration: 0.2 }
        },
        crazy: {
            x: crazyBounce.x + (Math.random() - 0.5) * 20,
            y: crazyBounce.y + (Math.random() - 0.5) * 20,
            transition: { type: "tween", duration: 0.05 }
        },
        reboot: {
            scale: [0, 1],
            opacity: [0, 1],
            transition: { duration: 1.5, ease: "easeOut" }
        },
        cursed: {
            x: isPeeking ? -40 : 0,
            y: 0,
            scale: jumpscare ? 3 : (isHolding ? [1, 1.1, 1] : 1),
            transition: {
                x: isPeeking ? { duration: 0.5 } : { duration: 0.1 },
                y: { duration: 0.1 },
                scale: { duration: 0.05 }
            }
        },
        // NEW: Deep Belly Laugh
        laugh: {
            x: [-1, 1, -1], // The "Shiver"
            y: [0, -5, -2, -4, 0], // The "Hiccup" Stutter
            rotate: [0, -10, 10, -5, 0], // The "Lean Back" (approx)
            transition: {
                x: { repeat: Infinity, duration: 0.08 }, // Rapid shiver
                y: { repeat: Infinity, duration: 0.35, ease: "linear" }, // Stutter bounce
                rotate: { repeat: Infinity, duration: 0.6, repeatType: "reverse", ease: "easeInOut" } // Rocking
            }
        },
        underwater: {
            y: [0, 5, -5, 0],
            x: [0, 10, -10, 0],
            transition: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
            }
        },
        ascending: {
            y: [0, -25, 0],
            opacity: 1,
            transition: {
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 1 }
            }
        },
        thrashing: {
            x: [-2, 2, -2],
            y: [-2, 5, -2],
            transition: {
                duration: 0.1,
                repeat: Infinity
            }
        },
        sinking: {
            y: 35,
            scaleY: 0.85,
            scaleX: 1.1,
            transition: {
                duration: 2,
                ease: "easeOut"
            }
        },
        killingMachine: {
            x: [-1, 1, -1, 1, 0],
            y: [-1, 1, 1, -1, 0],
            transition: {
                duration: 0.1,
                repeat: Infinity,
                ease: "linear"
            }
        },
        sad: {
            scale: [1, 0.98, 1.01, 1],
            rotateX: -15,
            rotateY: -10,
            transition: {
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                rotateX: { type: "spring", damping: 50, stiffness: 50 },
                rotateY: { type: "spring", damping: 50, stiffness: 50 }
            }
        },
        disgusted: {
            x: -30,
            y: -20,
            rotate: [0, -2, 2, -2, 2, 0],
            scaleX: 0.8,
            scaleY: 1.2,
            transition: {
                rotate: { duration: 0.2, repeat: Infinity },
                default: { type: "spring", stiffness: 200, damping: 15 }
            }
        },
        love: {
            x: [0, 21, 30, 21, 0, -21, -30, -21, 0],
            y: [0, 15, 0, -15, 0, 15, 0, -15, 0],
            transition: {
                x: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }
        },
        bashful: {
            rotate: 360,
            transition: { duration: 1, ease: "easeInOut" }
        },
        smart: {
            x: [-0.5, 0.5, -0.5],
            y: [-0.5, 0.5, -0.5],
            transition: {
                duration: 0.05,
                repeat: Infinity,
                ease: "linear"
            }
        },
        angelic: {
            scale: 1,
            opacity: 1,
            rotate: 0
        },
        glitched: {
            x: [-2, 2, -1, 3, -3, 0],
            y: [1, -2, 2, -1, 1, 0],
            skewX: [0, 10, -10, 5, 0],
            transition: {
                duration: 0.1,
                repeat: Infinity,
                ease: "linear"
            }
        }
    };

    const coreVariants: Variants = {
        idle: {
            scale: [1, 1.06, 1],
            scaleX: 1,
            scaleY: 1,
            rotate: 0,
            transition: {
                scale: { duration: 3, repeat: Infinity },
                default: { type: "spring", stiffness: 300, damping: 30 }
            }
        },
        happy: {
            scale: [1, 1.1, 1],
            rotate: [0, 10, -10, 0],
            transition: {
                scale: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
            }
        },
        bored: {
            scaleX: [1, 1.1, 1.3, 1.05],
            scaleY: [1, 0.9, 0.6, 0.95],
            opacity: 0.6,
            transition: {
                times: [0, 0.1, 0.2, 1],
                duration: 5,
                repeat: Infinity,
                repeatType: "mirror"
            }
        },
        thinking: { rotate: 360, scale: [1, 1.05, 1], transition: { rotate: { duration: 8, ease: "linear", repeat: Infinity }, scale: { duration: 2, repeat: Infinity } } },
        curious: { scale: 1.3, scaleX: 1, scaleY: 1, transition: { type: "spring", stiffness: 150, damping: 12 } },
        confused: {
            x: [-5, 5, 0],
            scaleY: 0.8,
            filter: "hue-rotate(45deg)",
            transition: {
                x: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                scaleY: { duration: 0.3 },
                filter: { duration: 1.5, repeat: Infinity, repeatType: "reverse" }
            }
        },
        oops: {
            scale: [1, 0.9, 1.05, 1],
            rotate: [0, -5, 5, 0],
            transition: {
                duration: 0.4,
                repeat: Infinity,
                repeatDelay: 2
            }
        },
        blushed: { scale: [1, 1.1, 1], scaleX: 1, scaleY: 1, transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" } },
        crazy: {
            scale: [0.8, 1.4, 0.9, 1.2, 0.8],
            transition: { duration: 0.2, repeat: Infinity }
        },
        offline: { scale: 0.8, opacity: 0.6, transition: { duration: 1 } },
        nod: {
            scaleY: [1, 0.7, 1.3, 0.9, 1.05, 1],
            transition: {
                duration: 1.8,
                times: [0, 0.2, 0.5, 0.75, 0.9, 1]
            }
        },
        gulp: {
            scale: [1, 0.9, 1.1],
            transition: { duration: 0.2, ease: "easeOut" }
        },
        broken: {
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            rotate: 0,
            opacity: 1,
            transition: { duration: 0.5 }
        },
        // NEW: Lungs effect
        laugh: {
            scale: [1, 1.2, 1.05], // Expand lungs
            transition: { duration: 0.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
        },
        killingMachine: {
            scale: [1, 1.1, 0.95, 1.05, 1],
            transition: { duration: 0.2, repeat: Infinity, ease: "linear" }
        },
        sad: {
            scale: [1, 1.02, 1],
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        },
        disgusted: {
            scaleY: [1, 0.85, 1],
            transition: {
                scaleY: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }
        },
        love: {
            scale: isBashful ? [1.3, 1.15, 1.25] : [1, 1.1, 1.05, 1.15, 1], // Heartbeat + Bashful burst
            transition: {
                duration: isBashful ? 0.4 : 0.8,
                repeat: isBashful ? 0 : Infinity,
                ease: "easeInOut"
            }
        },
        angry: {
            scale: isLunge ? 2 : [1, 1.05, 1],
            opacity: [1, 0.7, 1],
            transition: {
                opacity: { duration: 0.1, repeat: Infinity, ease: "linear" },
                scale: { duration: isLunge ? 0.05 : 2, repeat: isLunge ? 0 : Infinity, ease: "easeInOut" }
            }
        },
        melting: {
            scaleY: [1, 1.1, 0.9, 1.05, 1],
            y: [0, 5, 2, 4, 0],
            transition: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
            }
        },
        smart: {
            scale: 1,
            rotate: 0,
            transition: { duration: 0.2 }
        },
        danceBounce: {
            scaleY: [1, 1.15, 1],
            scaleX: [1, 0.85, 1],
            transition: {
                duration: 0.5,
                repeat: Infinity,
                ease: "easeInOut"
            }
        },
        angelic: {
            scale: [1, 1.05, 1],
            opacity: 1,
            transition: {
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 1 }
            }
        },
        glitched: {
            filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(180deg)", "hue-rotate(270deg)", "hue-rotate(360deg)"],
            opacity: [1, 0.8, 1, 0.5, 1],
            scale: [1, 1.1, 0.9, 1.2, 1],
            transition: {
                duration: 0.2,
                repeat: Infinity,
                ease: "linear"
            }
        }
    };

    const eyeVariants: Variants = {
        idle: { scale: 1, opacity: 1 },
        happy: {
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0],
            transition: {
                scale: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 0.3, repeat: Infinity, ease: "easeInOut" }
            }
        },
        broken: { scale: 0.8, opacity: 0, transition: { duration: 0.5 } },
        hidden: { scale: 0, opacity: 0, transition: { duration: 0.2 } },
        oops: {
            scale: 1.3,
            rotate: [0, -10, 10, -10, 10, 0],
            transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1 }
        },
        // NEW: Squint
        laugh: {
            scaleX: 1.2,
            scaleY: 0.2, // Flatten to slit
            opacity: [1, 0.5, 1], // Flicker
            transition: {
                opacity: { duration: 0.1, repeat: Infinity },
                default: { duration: 0.2 }
            }
        },
        killingMachine: {
            scale: 1.2,
            rotate: 360,
            transition: {
                rotate: { duration: 0.5, repeat: Infinity, ease: "linear" },
                scale: { duration: 0.2 }
            }
        },
        angry: {
            scale: 1.2,
            opacity: [1, 0.4, 0.8, 1, 0.5, 1],
            transition: {
                opacity: { duration: 0.05, repeat: Infinity, ease: "linear" },
                scale: { duration: 0.1 }
            }
        },
        sad: {
            scale: 0.9,
            opacity: [0.4, 0.9, 0.4],
            y: -2,
            transition: {
                opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                default: { duration: 0.5 }
            }
        },
        disgusted: {
            scaleY: 0.5,
            rotate: 15,
            y: 5,
            transition: { duration: 0.3 }
        },
        love: {
            scale: isBashful ? [1.5, 1.2, 1.4] : [1, 1.1, 1], // Heart flutter
            rotate: isBashful ? [0, 10, -10, 0] : [0, 5, -5, 0],
            transition: {
                scale: { duration: 0.6, repeat: isBashful ? 0 : Infinity, ease: "easeInOut" },
                rotate: { duration: 0.4, repeat: isBashful ? 0 : Infinity, ease: "easeInOut" }
            }
        },
        melting: {
            scale: [1, 1.1, 1],
            filter: "brightness(2) contrast(1.5)",
            transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        },
        smart: {
            scale: (isSmart && isTyping) ? 0.8 : 1.1, // Shrink when typing (focus)
            opacity: 1,
            filter: (isSmart && isTyping) ? "brightness(1.5)" : "brightness(1)",
            transition: { duration: 0.2 }
        }
    };

    const [isBurping, setIsBurping] = useState(false);

    const handleHatchClick = () => {
        if (isHunting || isSpitting || isSingularity || isDead) return;

        const startHatching = () => {
            setHatchPhase('cracking');
            setEggFractures([
                { id: 1, d: "M 24 5 L 20 15 L 28 25 L 22 35 L 24 43" },
                { id: 2, d: "M 10 24 L 20 22 L 30 26 L 40 24" },
                { id: 3, d: "M 15 10 L 18 18 L 12 25" }
            ]);

            new Audio('/sounds/egg-crack.mp3').play().catch(() => { });

            setTimeout(() => {
                setHatchPhase('hatched');
                new Audio('/sounds/chirp.mp3').play().catch(() => { });

                // Reset after 4 seconds
                setTimeout(() => {
                    setIsEgg(false);
                    if (!isAscending) setMood('neutral');
                    setHatchPhase('egg');
                }, 4000);
            }, 800);
        };

        if (isEgg && hatchPhase === 'egg') {
            startHatching();
        }
    };


    const activeGesture = (isAscending || mood === "angelic") ? "ascending" : (isDead ? "sinking" : (deathPhase === 1 ? "thrashing" : (isBurping ? "burp" : (isSmart ? "smart" : (mood === "happy" ? "happy" : (emote === "nod" || emote === "shake" || mood === "nod") ? (mood === "nod" ? "nod" : (emote || "idle")) : (mood === "laugh" ? "laugh" : (mood === "sad" ? "sad" : (mood === "disgusted" ? "disgusted" : (mood === "bored" ? "bored" : (isSubmerged ? "underwater" : "idle"))))))))));
    const combinedY = smoothFallY;

    const activeEmotion = overrideMood || (status === "offline" ? "offline" : (isPacManMode ? "idle" : (isMelting ? "melting" : (isSmart ? "smart" : (mood === "neutral" ? "idle" : (isAscending ? "angelic" : (isDead ? "broken" : mood)))))));

    const isTransformed = isHunting || isSpitting || eatenElements.length > 0;
    const finalSize = propSize || 64;
    const isFloating = !!homePosition && !propSize;

    return (
        <>
            <motion.div
                animate={!isFloating ? {} : (isFiring ? { // Recoil effect
                    x: targetingData ? targetingData.x - 32 - (targetingData.x > (novaPosition?.x ?? 0) ? 20 : -20) : 0,
                    y: targetingData ? targetingData.y - 150 - (targetingData.y > (novaPosition?.y ?? 0) ? 20 : -20) : 0,
                } : (isKillingMachine && targetingData ? {
                    x: targetingData.x - 32,
                    y: Math.max(80, targetingData.y - 150)
                } : (isHunting && huntTarget ? {
                    x: huntTarget.x - 32,
                    y: huntTarget.y - 32
                } : (novaPosition ? {
                    x: novaPosition.x + (novaPosition.x > windowSize.width - 150 ? -80 : 40),
                    y: Math.max(80, Math.min(windowSize.height - 80, novaPosition.y - 32))
                } : (homePosition ? {
                    x: homePosition.x - 32,
                    y: homePosition.y - 32
                } : { x: -100, y: -100 })))))}
                transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 200,
                    mass: 0.5
                }}
                style={{
                    position: isFloating ? 'fixed' : 'relative',
                    width: `${finalSize}px`,
                    height: `${finalSize}px`,
                    zIndex: isFloating ? 99999 : 10,
                    left: isFloating ? 0 : 'auto',
                    top: isFloating ? 0 : 'auto',
                    pointerEvents: isFloating ? 'none' : 'auto',
                    display: (isFloating && !homePosition) ? 'none' : 'block',
                    // Pass scaling variables
                    '--nova-size': `${finalSize}px`,
                    '--core-size': `${finalSize * 0.75}px`,
                    '--eye-size': `${finalSize * 0.25}px`
                } as React.CSSProperties}

            >
                <div style={{ position: 'relative' }}>
                    <motion.button
                        className={styles.muteToggle}
                        onClick={(e) => {
                            e.stopPropagation();
                            setAudioMuted(!isAudioMuted);
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title={isAudioMuted ? "Unmute Nova" : "Mute Nova"}
                        style={{ pointerEvents: 'auto' }}
                    >
                        {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </motion.button>

                <motion.div
                    className={styles.novaContainer}
                    animate={{
                        opacity: 1,
                        scale: 1
                    }}
                    transition={{ duration: 0.3 }}
                    id="nova-orb-container"
                    title={`Nova (${status === 'offline' ? 'Offline' : mood})`}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => {
                        setIsHovered(false);
                        handlePointerUp();
                        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                    }}
                    onMouseMove={() => {
                        recordInteraction();
                    }}
                    onMouseEnter={() => {
                        setIsHovered(true);
                        recordInteraction();
                        if ((mood === 'bored' || mood === 'broken') && setMood && !isAscending) {
                            setMood('neutral');
                        }

                        // Hover Blush Logic (3s timer)
                        hoverTimerRef.current = setTimeout(() => {
                            triggerBlush();
                        }, 3000);
                    }}
                    onMouseLeave={() => {
                        setIsHovered(false);
                        if (hoverTimerRef.current) {
                            clearTimeout(hoverTimerRef.current);
                        }
                    }}
                    style={{ zIndex: isCinematicMode ? 150 : 10, position: 'relative' }}
                    whileTap={{ scale: 0.9 }}
                    ref={containerRef}
                >
                    {/* Black Hole Transformation (Hunting, Stasis, or Spitting) */}
                    <AnimatePresence mode="wait">
                        {isTransformed && (
                            <motion.div
                                key="nova-blackhole"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
                            >
                                <NovaBlackHole isStasis={!isHunting} layoutId="nova-orb-stasis" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Cinematic and Environmental Renderer */}
                    <NovaCinematicRenderer
                        isHovered={isHovered}
                        mood={mood}
                        splashTrigger={splashTrigger}
                        isRebooting={isRebooting}
                        isCinematicMode={isCinematicMode}
                        isPacManMode={isPacManMode}
                        deathPhase={deathPhase}
                        isDancing={isDancing}
                    />

                    {/* Original Orb Content - Hidden when Black Hole is active */}
                    <div style={{
                        display: isTransformed ? 'none' : 'block',
                        width: '100%',
                        height: '100%'
                    }}>
                        {/* Renderers extracted to NovaCinematicRenderer */}
                        {/* Click Ripple Ring */}
                        <AnimatePresence>
                            {clickRipple && (
                                <motion.div
                                    key={clickRipple.key}
                                    className={styles.ripple}
                                    initial={{ scale: 0.8, opacity: 0.8 }}
                                    animate={{ scale: 2.5, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.6 }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Tears of Joy Particles */}
                        <AnimatePresence>
                            {showTears && (
                                <>
                                    {/* Left Tear */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -10, y: 0, scale: 0 }}
                                        animate={{ opacity: [1, 0], x: -30, y: 20, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.4 }}
                                        style={{
                                            position: 'absolute', top: '50%', left: '50%', width: 6, height: 6,
                                            borderRadius: '50%', background: '#00BFFF', zIndex: 20,
                                            boxShadow: '0 0 4px #00BFFF'
                                        }}
                                    />
                                    {/* Right Tear */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 10, y: 0, scale: 0 }}
                                        animate={{ opacity: [1, 0], x: 30, y: 20, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.4, delay: 0.2 }}
                                        style={{
                                            position: 'absolute', top: '50%', left: '50%', width: 6, height: 6,
                                            borderRadius: '50%', background: '#00BFFF', zIndex: 20,
                                            boxShadow: '0 0 4px #00BFFF'
                                        }}
                                    />
                                </>
                            )}
                        </AnimatePresence>

                        {/* Floating Question Mark - Confused State */}
                        <AnimatePresence>
                            {mood === 'confused' && (
                                <motion.div
                                    initial={{ scale: 0, y: -40 }}
                                    animate={{
                                        scale: [0, 1.4, 1],
                                        y: -40,
                                        x: [0, 3, -3, 0], // Sway opposite to Nova's tilt
                                        opacity: [1, 0.4, 1],
                                        rotate: [-5, 5, -5]
                                    }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                        scale: { duration: 0.5, times: [0, 0.6, 1] },
                                        x: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                                        opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                        rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        fontSize: '32px',
                                        fontWeight: 'bold',
                                        color: '#FFD700',
                                        textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
                                        zIndex: 25,
                                        pointerEvents: 'none'
                                    }}
                                >
                                    ?
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {isAILoading && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    style={{
                                        position: 'absolute',
                                        top: '-40px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        color: '#00FFFF',
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        textShadow: '0 0 10px #00FFFF',
                                        zIndex: 40
                                    }}
                                >
                                    ...
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Magnifying Loupe - Curious State */}
                        <AnimatePresence>
                            {mood === 'curious' && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{
                                        scale: [0, 1.2, 1],
                                        x: [-1, 1],
                                        rotate: -15
                                    }}
                                    exit={{ scale: 0 }}
                                    transition={{
                                        scale: { duration: 0.5, times: [0, 0.6, 1] },
                                        x: { duration: 0.15, repeat: Infinity, ease: "linear" }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        marginLeft: 25,
                                        marginTop: -10,
                                        zIndex: 30,
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <svg width="60" height="60" viewBox="0 0 60 60">
                                        <circle cx="20" cy="20" r="15" fill="rgba(45, 212, 191, 0.2)" stroke="#2dd4bf" strokeWidth="3" />
                                        <circle cx="16" cy="16" r="5" fill="rgba(255, 255, 255, 0.4)" filter="blur(2px)" />
                                        <line x1="30" y1="30" x2="50" y2="50" stroke="#2dd4bf" strokeWidth="4" strokeLinecap="round" />
                                        <circle cx="50" cy="50" r="5" fill="#0891b2" stroke="#2dd4bf" strokeWidth="2" />
                                    </svg>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Context-Aware Speech Bubble - Investigation */}
                        <AnimatePresence>
                            {mood === 'curious' && investigationContext && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    style={{
                                        position: 'absolute',
                                        // Flip bubble below Nova if she's too high up
                                        top: (novaPosition && novaPosition.y < 150) ? '80px' : '-70px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'linear-gradient(135deg, #2dd4bf 0%, #0891b2 100%)',
                                        color: 'white',
                                        padding: '8px 14px',
                                        borderRadius: '16px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        minWidth: '120px',
                                        maxWidth: '220px',
                                        whiteSpace: 'normal',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 15px rgba(45, 212, 191, 0.5)',
                                        zIndex: 40,
                                        pointerEvents: 'none',
                                        lineHeight: '1.4'
                                    }}
                                >
                                    {investigationContext.message}
                                    {/* Speech bubble tail */}
                                    <div style={{
                                        position: 'absolute',
                                        // Adjust tail position (top or bottom)
                                        ...(novaPosition && novaPosition.y < 150 ? {
                                            top: '-6px',
                                            borderBottom: '6px solid #0891b2',
                                            borderTop: 'none'
                                        } : {
                                            bottom: '-6px',
                                            borderTop: '6px solid #0891b2',
                                            borderBottom: 'none'
                                        }),
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: 0,
                                        height: 0,
                                        borderLeft: '6px solid transparent',
                                        borderRight: '6px solid transparent'
                                    }} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* SHARED PHYSICAL WRAPPER - Moves eye and core together */}
                        <motion.div
                            variants={bodyVariants}
                            animate={activeGesture}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                y: combinedY,
                                scale: 1 + (eatenElements.length * 0.15), // Grow with each eaten element
                            }}
                        >
                            <motion.div
                                className={`${styles.aura} ${isNightMode ? styles.moonAura : ''}`}
                                style={{ x: auraX, y: auraY }}
                                animate={isKillingMachine ? {
                                    scale: [1.1, 1.4, 1.2, 1.5, 1.1],
                                    opacity: [0.6, 1, 0.7, 1, 0.6],
                                    borderRadius: ["50%", "45%", "55%", "48%", "50%"],
                                    boxShadow: 'none'
                                } : (isNightMode ? {
                                    scale: [1, 1.1, 1],
                                    opacity: [0.6, 0.8, 0.6],
                                    borderRadius: "50%",
                                    boxShadow: '0 0 30px rgba(173, 216, 230, 0.3)'
                                } : (mood === 'love' ? {
                                    scale: [1.2, 1.4, 1.2],
                                    opacity: [0.4, 0.8, 0.4],
                                    boxShadow: ['0 0 20px #fb7185', '0 0 50px #d946ef', '0 0 20px #fb7185'],
                                    borderRadius: "50%"
                                } : (isAscending ? {
                                    scale: [1.3, 1.6, 1.3],
                                    opacity: [0.6, 1, 0.6],
                                    boxShadow: ['0 0 30px #FFD700', '0 0 70px #FFFFFF', '0 0 30px #FFD700'],
                                    borderRadius: "50%"
                                } : {
                                    scale: isDead ? 0 : (isHovered ? 1.2 : [1, 1.1, 1]),
                                    opacity: (isDead || (isEgg && hatchPhase === 'hatched')) ? 0 : (status === 'offline' ? 0.2 : [0.5, 0.7, 0.5]),
                                    boxShadow: 'none',
                                    borderRadius: "50%"
                                })))}
                                transition={{ duration: (mood === 'love') ? 0.8 : (isDead ? 2 : 4), repeat: isDead ? 0 : Infinity, repeatType: "reverse" }}
                            />

                            {/* Sauron — Lidless Eye, Tendrils, Inscription, Flare */}
                            <NovaSauronRenderer isSauronMode={isSauronMode} />

                            {/* Super Saiyan — Golden Aura, Spiky Hair, Lightning, Ki Sparks */}
                            <NovaSuperSaiyanRenderer isSuperSaiyan={isSuperSaiyan} ssjLevel={ssjLevel} />


                            {/* Extracted Mood Particles */}
                            <NovaMoodParticles
                                mood={mood}
                                isMelting={isMelting}
                                isSauronMode={isSauronMode}
                                ashIntensity={ashIntensity}
                                isSmart={isSmart}
                                containerRef={containerRef}
                                gazeTarget={gazeTarget}
                            />

                            {isSingularity ? (
                                <motion.div
                                    key="nova-black-hole"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 180 }}
                                    transition={{ type: "spring", damping: 15 }}
                                    style={{ zIndex: 100 }}
                                >
                                    <NovaBlackHole layoutId="nova-orb-core" />
                                </motion.div>
                            ) : (
                                <>
                                    <motion.div
                                        className={`${styles.core} ${colors.core === 'discoBall' ? styles.discoBall : ''} ${mood === 'sad' ? styles.sadCore : ''} ${mood === 'disgusted' ? styles.disgustedCore : ''} ${isSauronMode ? styles.sauronCore : ''} ${isSuperSaiyan ? styles.ssjCore : ''} ${isNightMode ? styles.moonCore : ''} ${isSuperSaiyan ? styles.ssjShake : ''}`}
                                        id="nova-orb-core"
                                        key={`orb-core-${gulpTrigger}`}
                                        style={{
                                            x: coreX, y: coreY,
                                            background: ((mood === 'broken' && !isDead) || isEgg) ? 'transparent' : colors.core,
                                            filter: isMelting
                                                ? `url(#heatHazeFilter) contrast(1.2) brightness(1.2)`
                                                : (mood === 'cursed'
                                                    ? `contrast(150%) brightness(${Math.random() > 0.1 ? 0.5 : 0.8}) grayscale(80%)`
                                                    : (staticGlitch ? 'contrast(1.5)' : undefined)),
                                            clipPath: isNightMode ? "none" : "circle(50% at 50% 50%)",
                                            boxShadow: (isEgg && hatchPhase === 'hatched') ? 'none' : (isMelting
                                                ? `0 0 ${20 * meltingIntensity}px #fbbf24, 0 0 ${40 * meltingIntensity}px #dc2626`
                                                : ((mood === 'broken' || isDead) ? 'none' : (isNightMode ? '0 0 20px rgba(173, 216, 230, 0.4)' : (mood === 'happy' ? '0 0 40px #fbbf24, inset 0 0 20px #fde047' : undefined)))),
                                            opacity: (isEgg && hatchPhase === 'hatched') ? 0 : 1,
                                            pointerEvents: (isEgg && hatchPhase === 'hatched') ? 'none' : 'auto'
                                        }}
                                        variants={coreVariants}
                                        animate={gulpTrigger > 0 ? "gulp" : (isNightMode ? {
                                            y: [0, -6, 0],
                                            rotate: [0, -3, 3, 0],
                                            scale: [1, 1.05, 1]
                                        } : activeEmotion)}
                                        initial={activeEmotion}
                                        transition={isNightMode ? {
                                            y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                                            rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                                            background: { duration: 0.8, type: "tween" }
                                        } : { background: { duration: 0.8, type: "tween" } }}

                                    >
                                        {/* Egg visual override */}
                                        {isEgg && hatchPhase !== 'hatched' && (
                                            <motion.div
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: '#F0EAD6',
                                                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                                                    zIndex: 5,
                                                    boxShadow: 'inset -5px -10px 20px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.2)',
                                                }}
                                                animate={hatchPhase === 'egg' ? {
                                                    rotate: [-2, 2, -2],
                                                    y: [0, -2, 0]
                                                } : {
                                                    x: [-3, 3, -3, 3, 0],
                                                    opacity: [1, 0.8, 1],
                                                    transition: {
                                                        x: { duration: 0.1, repeat: 8 },
                                                        opacity: { duration: 0.2, repeat: 4 }
                                                    }
                                                }}
                                                transition={hatchPhase === 'egg' ? {
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                } : undefined}
                                            >
                                                {/* Fracture Lines */}
                                                {hatchPhase === 'cracking' && (
                                                    <svg width="100%" height="100%" viewBox="0 0 48 48" style={{ position: 'absolute', top: 0, left: 0 }}>
                                                        {eggFractures.map(frac => (
                                                            <motion.path
                                                                key={frac.id}
                                                                d={frac.d}
                                                                stroke="black"
                                                                strokeWidth="1"
                                                                fill="none"
                                                                initial={{ pathLength: 0 }}
                                                                animate={{ pathLength: 1 }}
                                                                transition={{ duration: 0.3 }}
                                                            />
                                                        ))}
                                                    </svg>
                                                )}
                                            </motion.div>
                                        )}
                                        {/* Heat Haze Aura */}
                                        {mood === 'angry' && (
                                            <motion.div
                                                className={styles.heatHaze}
                                                animate={{ scale: [1, 1.05, 0.98, 1.02, 1] }}
                                                transition={{ duration: 0.5, repeat: Infinity }}
                                            />
                                        )}

                                        {/* Moon Craters */}
                                        {isNightMode && (
                                            <>
                                                <div className={styles.moonCrater} style={{ top: '20%', left: '40%', width: '15%', height: '15%' }} />
                                                <div className={styles.moonCrater} style={{ top: '60%', left: '30%', width: '10%', height: '10%' }} />
                                                <div className={styles.moonCrater} style={{ top: '40%', left: '60%', width: '20%', height: '20%', opacity: 0.05 }} />
                                            </>
                                        )}
                                        {/* Internal Sputtering Core (Pupil) */}
                                        <motion.div
                                            style={{
                                                position: 'absolute', top: '35%', left: '35%', width: '30%', height: '30%',
                                                borderRadius: '50%', background: 'white', filter: 'blur(4px)',
                                                zIndex: 10
                                            }}
                                            animate={deathPhase === 2 ? {
                                                opacity: [1, 0.2, 0.8, 0, 1],
                                                scale: [1, 0.8, 1.2, 0.9, 1],
                                            } : (mood === 'angry' ? {
                                                opacity: [1, 0.5, 1],
                                                scale: [1, 1.1, 1]
                                            } : { opacity: 0 })}
                                            transition={(deathPhase === 2 || mood === 'angry') ? {
                                                duration: 0.15,
                                                repeat: Infinity,
                                                repeatType: "reverse"
                                            } : { duration: 0.2 }}
                                        >
                                            {mood === 'angry' && (
                                                <svg viewBox="0 0 48 48" style={{ width: '100%', height: '100%' }}>
                                                    <line x1="12" y1="24" x2="36" y2="24" stroke="white" strokeWidth="6" />
                                                    <line x1="24" y1="12" x2="24" y2="36" stroke="white" strokeWidth="6" />
                                                </svg>
                                            )}
                                        </motion.div>

                                        {/* Broken Heart SVG Layer */}
                                        <AnimatePresence>
                                            {mood === 'broken' && (
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', width: '100%', height: '100%' }}>
                                                    <svg width="48" height="48" viewBox="0 0 48 48" style={{ width: '100%', height: '100%' }}>
                                                        <defs>
                                                            <linearGradient id="sadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                <stop offset="0%" stopColor="#2A1B3D" />
                                                                <stop offset="50%" stopColor="#44318D" />
                                                                <stop offset="100%" stopColor="#1A1A1D" />
                                                            </linearGradient>
                                                        </defs>

                                                        {/* Left Half */}
                                                        <motion.g
                                                            animate={{
                                                                x: isCracked ? -15 : 0,
                                                                y: isCracked ? 40 : 0,
                                                                rotate: isCracked ? -10 : 0
                                                            }}
                                                            transition={{ type: "spring", stiffness: 40, damping: 20 }}
                                                        >
                                                            <motion.path
                                                                d={HEART_PATHS.circleLeft}
                                                                animate={{ d: HEART_PATHS.heartLeft }}
                                                                fill="url(#sadGrad)"
                                                                stroke="rgba(255,255,255,0.1)"
                                                                strokeWidth="1"
                                                            />
                                                            {/* Half Eye */}
                                                            <motion.circle
                                                                cx="24" cy="24" r="8"
                                                                fill={colors.eye}
                                                                animate={{ opacity: 0.4, scale: 0.6 }}
                                                                style={{ filter: 'blur(1px)' }}
                                                            />
                                                        </motion.g>

                                                        {/* Right Half */}
                                                        <motion.g
                                                            animate={{
                                                                x: isCracked ? 15 : 0,
                                                                y: isCracked ? 40 : 0,
                                                                rotate: isCracked ? 10 : 0
                                                            }}
                                                            transition={{ type: "spring", stiffness: 40, damping: 20 }}
                                                        >
                                                            <motion.path
                                                                d={HEART_PATHS.circleRight}
                                                                animate={{ d: HEART_PATHS.heartRight }}
                                                                fill="url(#sadGrad)"
                                                                stroke="rgba(255,255,255,0.1)"
                                                                strokeWidth="1"
                                                            />
                                                            {/* Half Eye */}
                                                            <motion.circle
                                                                cx="24" cy="24" r="8"
                                                                fill={colors.eye}
                                                                animate={{ opacity: 0.4, scale: 0.6 }}
                                                                style={{ filter: 'blur(1px)' }}
                                                            />
                                                        </motion.g>

                                                        {/* The Crack Line */}
                                                        {isCracked && (
                                                            <motion.path
                                                                d="M 24 6 L 22 15 L 26 25 L 23 35 L 24 42"
                                                                stroke="rgba(0,0,0,0.5)"
                                                                fill="none"
                                                                initial={{ pathLength: 0 }}
                                                                animate={{ pathLength: 1 }}
                                                                transition={{ duration: 0.5 }}
                                                            />
                                                        )}
                                                    </svg>

                                                    {/* Soul Crumbs Particles */}
                                                    {isCracked && [1, 2, 3, 4, 5].map(i => (
                                                        <motion.div
                                                            key={`crumb-${i}`}
                                                            initial={{ opacity: 0, x: 24, y: 24 }}
                                                            animate={{
                                                                opacity: [0, 1, 0],
                                                                y: [24, 100 + Math.random() * 50],
                                                                x: 24 + (Math.random() - 0.5) * 40,
                                                                rotate: 360
                                                            }}
                                                            transition={{
                                                                duration: 3 + Math.random() * 2,
                                                                repeat: Infinity,
                                                                delay: i * 0.4
                                                            }}
                                                            style={{
                                                                position: 'absolute', width: 4, height: 4,
                                                                background: '#1A1A1D', borderRadius: '1px'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </AnimatePresence>


                                        {/* Boredom "Zzz" Bubbles */}
                                        <AnimatePresence>
                                            {mood === "bored" && [1, 2, 3].map((i) => (
                                                <motion.div
                                                    key={`zzz-${i}`}
                                                    initial={{ opacity: 0, x: 20, y: -20, scale: 0.5 }}
                                                    animate={{
                                                        opacity: [0, 0.5, 0],
                                                        x: [20, 40, 30],
                                                        y: [-20, -60, -80],
                                                        scale: [0.8, 1.2, 1]
                                                    }}
                                                    transition={{
                                                        duration: 3,
                                                        repeat: Infinity,
                                                        delay: i * 1,
                                                        ease: "easeInOut"
                                                    }}
                                                    style={{
                                                        position: 'absolute', top: 0, right: 0,
                                                        color: 'rgba(148, 163, 184, 0.8)', fontSize: 16 + i * 4,
                                                        fontWeight: 'bold', pointerEvents: 'none', fontFamily: 'monospace'
                                                    }}
                                                >
                                                    Z
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        {/* Message Received Pulse Overlay */}
                                        <motion.div
                                            key={`pulse-${pulseActive}`}
                                            initial={{ opacity: 0, scale: 1 }}
                                            animate={pulseActive > 0 ? {
                                                opacity: [0, 0.4, 0],
                                                scale: [1, 1.3, 1],
                                                filter: ["brightness(1)", "brightness(2)", "brightness(1)"]
                                            } : {}}
                                            transition={{ duration: 0.6 }}
                                            style={{
                                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                borderRadius: '50%', background: 'white', pointerEvents: 'none'
                                            }}
                                        />

                                        {/* Giant Last Breath Bubble */}
                                        <AnimatePresence>
                                            {deathPhase === 2 && (
                                                <motion.div
                                                    key="giant-bubble"
                                                    initial={{ y: 0, x: 20, opacity: 0, scale: 0.5 }}
                                                    animate={{
                                                        y: -120,
                                                        x: 20 + (Math.random() - 0.5) * 10,
                                                        opacity: [0, 1, 1, 0],
                                                        scale: [0.5, 2, 2.5]
                                                    }}
                                                    transition={{
                                                        duration: 3,
                                                        ease: "easeOut"
                                                    }}
                                                    style={{
                                                        position: 'absolute', width: 15, height: 15,
                                                        borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
                                                        border: '1px solid rgba(255,255,255,0.5)',
                                                        zIndex: 20
                                                    }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Drowning Bubbles */}
                                        <AnimatePresence>
                                            {waterLevel > 80 && !isAscending && (
                                                <div style={{ position: 'absolute', bottom: -10, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                                        <motion.div
                                                            key={`bubble-${i}`}
                                                            initial={{ y: 0, x: 24, opacity: 0, scale: 0.3 }}
                                                            animate={{
                                                                y: -100,
                                                                x: 24 + (Math.sin(i + Date.now() / 1000) * 20),
                                                                opacity: [0, 1, 0.8, 0],
                                                                scale: [0.3, 1, 1.2, 0.5]
                                                            }}
                                                            transition={{
                                                                duration: 1.5 + Math.random(),
                                                                repeat: Infinity,
                                                                delay: i * 0.2,
                                                                ease: "easeOut"
                                                            }}
                                                            style={{
                                                                position: 'absolute', width: 8, height: 8,
                                                                borderRadius: '50%', background: 'rgba(255,255,255,0.4)',
                                                                boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                                                                border: '1px solid rgba(255,255,255,0.2)'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </AnimatePresence>

                                        {/* Pac-Man Mouth */}
                                        <AnimatePresence>
                                            {isPacManMode && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                                                        <motion.path
                                                            fill="#000"
                                                            animate={{
                                                                d: [
                                                                    "M 50 50 L 100 25 A 50 50 0 1 1 100 75 L 50 50", // Mid open
                                                                    "M 50 50 L 100 50 A 50 50 0 1 1 100 50 L 50 50", // Closed
                                                                    "M 50 50 L 100 10 A 50 50 0 1 1 100 90 L 50 50"  // Wide open
                                                                ]
                                                            }}
                                                            transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
                                                        />
                                                    </svg>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <AnimatePresence>
                                            {mood === "blushed" && (
                                                <motion.div
                                                    initial={{ x: "-100%", opacity: 0 }}
                                                    animate={{ x: "100%", opacity: [0, 0.5, 0] }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)' }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Wet Shimmer Effect */}
                                        <AnimatePresence>
                                            {isStormMode && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    style={{
                                                        position: 'absolute', inset: 0,
                                                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)',
                                                        borderRadius: '50%',
                                                        pointerEvents: 'none'
                                                    }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Angel Wings */}
                                        <AnimatePresence>
                                            {isAscending && (
                                                <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
                                                    {/* Left Wing */}
                                                    <motion.svg
                                                        width="100" height="80" viewBox="0 0 100 80"
                                                        style={{ position: 'absolute', bottom: '20%', right: '80%', originX: '90%', originY: '80%' }}
                                                        animate={{
                                                            rotate: [-15, -45, -15],
                                                            scale: [1, 1.1, 1]
                                                        }}
                                                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                                    >
                                                        <path
                                                            d="M90,60 C70,40 20,40 0,20 C10,60 40,80 90,60 Z"
                                                            fill="white"
                                                            style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }}
                                                        />
                                                        <path d="M80,55 C60,45 30,45 10,35" stroke="rgba(200,200,255,0.3)" fill="none" strokeWidth="2" />
                                                    </motion.svg>
                                                    {/* Right Wing */}
                                                    <motion.svg
                                                        width="100" height="80" viewBox="0 0 100 80"
                                                        style={{ position: 'absolute', bottom: '20%', left: '80%', originX: '10%', originY: '80%' }}
                                                        animate={{
                                                            rotate: [15, 45, 15],
                                                            scale: [1, 1.1, 1]
                                                        }}
                                                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                                    >
                                                        <path
                                                            d="M10,60 C30,40 80,40 100,20 C90,60 60,80 10,60 Z"
                                                            fill="white"
                                                            style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }}
                                                        />
                                                        <path d="M20,55 C40,45 70,45 90,35" stroke="rgba(200,200,255,0.3)" fill="none" strokeWidth="2" />
                                                    </motion.svg>
                                                </div>
                                            )}
                                        </AnimatePresence>


                                    </motion.div>



                                    {/* Burp Effect Ripple */}
                                    <AnimatePresence>
                                        {isBurping && (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 1, borderWidth: '4px' }}
                                                animate={{ scale: 3, opacity: 0, borderWidth: '1px' }}
                                                transition={{ duration: 0.8 }}
                                                style={{ position: 'absolute', width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255, 239, 0, 0.8)', zIndex: -1 }}
                                            />
                                        )}
                                    </AnimatePresence>

                                    {/* Angelic Halo */}
                                    <AnimatePresence>
                                        {(emote === 'angelic' || mood === 'angelic') && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                animate={{
                                                    opacity: 0.8,
                                                    y: [0, -5, 0],
                                                    scale: [1, 1.05, 1]
                                                }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={{
                                                    y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                                                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: -24,
                                                    left: '50%',
                                                    x: '-50%',
                                                    width: 36,
                                                    height: 8,
                                                    border: '2px solid gold',
                                                    borderRadius: '50%',
                                                    filter: 'blur(1px)',
                                                    boxShadow: '0 0 12px rgba(255, 215, 0, 0.8), inset 0 0 4px gold',
                                                    pointerEvents: 'none',
                                                    zIndex: 10
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>

                                    <motion.div
                                        className={`${styles.eye} ${isSauronMode ? styles.sauronIris : ''}`}
                                        style={{
                                            x: isSauronMode ? eyeX : eyeX, // Keep existing logic but class override handles gradient
                                            y: eyeY,
                                            borderRadius: (mood === 'love' || isSauronMode) ? '0%' : '50%',
                                            background: (mood === 'love' || isSauronMode) ? 'transparent' : colors.eye,
                                            boxShadow: isDead ? 'none' : undefined,
                                            opacity: (mood === 'broken' || mood === 'crazy' || isPacManMode || isEgg) ? 0 : 1,
                                            clipPath: (mood === 'love' || isSauronMode) ? 'none' : 'none'
                                        }}
                                        variants={eyeVariants}
                                        animate={(isKillingMachine || mood === 'jealous') ? "killingMachine" : (isDead ? "broken" : (status === 'offline' || isPacManMode || mood === 'broken' || mood === 'crazy' ? "hidden" : (mood === 'love' ? 'love' : (mood === 'oops' ? 'oops' : "idle"))))}
                                        initial="idle"
                                        transition={{
                                            scale: { type: 'spring', stiffness: 400, damping: 20 },
                                            rotate: { duration: 3, repeat: Infinity, ease: 'linear' }
                                        }}
                                    >
                                        {/* Sauron Vertical Pupil */}
                                        {isSauronMode && (
                                            <motion.div
                                                className={styles.sauronPupil}
                                                animate={{
                                                    scaleY: [1, 1.1, 1],
                                                    scaleX: [1, 0.9, 1]
                                                }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            />
                                        )}

                                        {/* Rich Mode Eye Content */}
                                        {mood === 'rich' && (
                                            <motion.div
                                                animate={{ rotateY: 360 }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                style={{
                                                    width: '100%', height: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '14px', fontWeight: '900', color: '#064e40',
                                                    textShadow: '0 1px 0 rgba(255,255,255,0.4)'
                                                }}
                                            >
                                                $
                                            </motion.div>
                                        )}

                                        {isKillingMachine && (
                                            <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ position: 'absolute', inset: 0 }}>
                                                {/* Targeting Reticle */}
                                                <circle cx="12" cy="12" r="10" stroke="#ff0000" strokeWidth="1" fill="none" />
                                                <path d="M12 2 L12 22 M2 12 L22 12" stroke="#ff0000" strokeWidth="1.5" />
                                                <circle cx="12" cy="12" r="2" fill="#ff0000" />
                                            </svg>
                                        )}
                                        {mood === 'love' && (
                                            <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 5px #FFFFFF)', overflow: 'visible' }}>
                                                <path
                                                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                                    fill="#FFFFFF"
                                                />
                                            </svg>
                                        )}

                                        {/* Star Pupil for Party Mode */}
                                        {isDancing && (
                                            <motion.div
                                                className={`${styles.starPupil} ${styles.strobeEye}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: '50%', top: '50%',
                                                    width: '80%', height: '80%',
                                                    transform: 'translate(-50%, -50%)',
                                                    background: '#000',
                                                    clipPath: 'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)'
                                                }}
                                            />
                                        )}
                                    </motion.div>

                                    {/* Underwater Reflection */}
                                    <AnimatePresence>
                                        {isSubmerged && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 40 }}
                                                animate={{ opacity: 0.3, y: 50, scaleY: -0.5, scaleX: 1.1 }}
                                                exit={{ opacity: 0 }}
                                                style={{
                                                    position: 'absolute', width: '100%', height: '100%',
                                                    background: colors.core, borderRadius: '50%',
                                                    filter: 'blur(4px)', pointerEvents: 'none', zIndex: -1
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>

                                    {/* Cursed Realistic Eye Image */}
                                    {mood === 'cursed' && (
                                        <motion.div
                                            style={{
                                                position: 'absolute',
                                                zIndex: 12,
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                backgroundImage: `url(${eyeballImg.src})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                boxShadow: 'inset 0 0 10px #000',
                                                filter: 'contrast(1.2) saturate(1.5)',
                                                x: eyeX,
                                                y: eyeY
                                            }}
                                        >
                                            {/* Pupil dot for extra creepiness */}
                                            <motion.div
                                                style={{
                                                    position: 'absolute',
                                                    top: '50%', left: '50%',
                                                    x: '-50%', y: '-50%',
                                                    width: 4, height: 4,
                                                    borderRadius: '50%',
                                                    background: '#000'
                                                }}
                                                animate={{ scale: isHovered ? 0.3 : 0.8 }}
                                            />
                                        </motion.div>
                                    )}

                                    {/* Exorcism Progress Ring */}
                                    {isHolding && (
                                        <svg width="60" height="60" style={{ position: 'absolute', transform: 'rotate(-90deg)', zIndex: 20 }}>
                                            <circle
                                                cx="30" cy="30" r="28"
                                                fill="none"
                                                stroke="white"
                                                strokeWidth="4"
                                                strokeDasharray="176"
                                                strokeDashoffset={176 - (176 * exorcismProgress)}
                                            />
                                        </svg>
                                    )}

                                    {/* Crazy Spiral Eye */}
                                    {mood === 'crazy' && (
                                        <motion.div
                                            style={{ position: 'absolute', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 0.2, repeat: Infinity, ease: "linear" }}
                                        >
                                            <svg width="32" height="32" viewBox="0 0 32 32">
                                                <path
                                                    d="M 16 16 m -14 0 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0 M 16 16 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0 M 16 16 m -6 0 a 6 6 0 1 0 12 0 a 10 10 0 1 0 -12 0"
                                                    fill="none"
                                                    stroke="#39FF14"
                                                    strokeWidth="2"
                                                    strokeDasharray="4 4"
                                                />
                                            </svg>
                                        </motion.div>
                                    )}

                                    {/* Crazy Chromatic Aberration Ghosts */}
                                    {mood === 'crazy' && (
                                        <>
                                            <motion.div
                                                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,0,0,0.3)', filter: 'blur(4px)', zIndex: -1 }}
                                                animate={{ x: [-5, 5, -5], y: [5, -5, 5] }}
                                                transition={{ duration: 0.1, repeat: Infinity }}
                                            />
                                            <motion.div
                                                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,255,0.3)', filter: 'blur(4px)', zIndex: -1 }}
                                                animate={{ x: [5, -5, 5], y: [-5, 5, -5] }}
                                                transition={{ duration: 0.1, repeat: Infinity }}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </motion.div>

                        <NovaEmotes />

                        <AnimatePresence>
                            {mood === "thinking" && <NovaThinkingState />}
                        </AnimatePresence>

                        {/* Hatchling Chicken GIF - Moved here for maximum visibility */}
                        <AnimatePresence>
                            {(isEgg && hatchPhase === 'hatched') && (
                                <motion.div
                                    key="hatched-chicken-final"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1.2, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    style={{
                                        position: 'absolute',
                                        width: 80,
                                        height: 80,
                                        left: '50%',
                                        top: '50%',
                                        marginLeft: -40,
                                        marginTop: -40,
                                        zIndex: 1000, // Topmost
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <img
                                        src={(chickenGif as any).src || chickenGif}
                                        alt="Hatched Chicken"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                            display: 'block'
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
            {/* SVG Turbulence Filter for Disgust */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="extra-wobble">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05 0.15" numOctaves="3" seed="2">
                        <animate attributeName="baseFrequency" dur="10s" values="0.05 0.15;0.06 0.16;0.05 0.15" repeatCount="indefinite" />
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" scale="4" />
                </filter>
            </svg>

            {/* Separate Layer for Floating Hearts to avoid clipping - REMOVED (now in NovaMoodParticles) */}
            {/* Melting Heat Haze SVG Filter */}
            <svg style={{ visibility: 'hidden', position: 'absolute' }} width="0" height="0">
                <filter id="heatHazeFilter">
                    <feTurbulence type="turbulence" baseFrequency="0.01 0.05" numOctaves="2" seed="1">
                        <animate attributeName="baseFrequency" dur="3s" values="0.01 0.05;0.01 0.1;0.01 0.05" repeatCount="indefinite" />
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" scale={15 * meltingIntensity} />
                </filter>
            </svg>
        </>
    );
}
export const NovaAvatar = React.memo(NovaAvatarComponent);
