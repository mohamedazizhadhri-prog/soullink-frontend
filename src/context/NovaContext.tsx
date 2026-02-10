"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

export type NovaMood = "neutral" | "thinking" | "curious" | "confused" | "excited" | "blushed" | "angry" | "angelic" | "bored" | "broken" | "crazy" | "cursed" | "surprised" | "laugh" | "sad" | "disgusted" | "love" | "happy" | "rich";
export type NovaStatus = "online" | "offline";
export type NovaEmote = "angry" | "angelic" | "blush" | "confused" | "success" | "nod" | "shake" | "lightbulb" | null;

export interface NovaMessage {
    id: string;
    sender: 'nova' | 'user';
    text: string;
    timestamp: number;
}

interface NovaContextType {
    mood: NovaMood;
    status: NovaStatus;
    isTracking: boolean;
    emote: NovaEmote;
    messages: NovaMessage[];
    pulseTrigger: number;
    setMood: (mood: NovaMood) => void;
    setStatus: (status: NovaStatus) => void;
    setTracking: (tracking: boolean) => void;
    triggerEmote: (emote: NovaEmote) => void;
    addMessage: (text: string, sender: 'nova' | 'user') => void;
    // Pac-Man Mode
    isPacManMode: boolean;
    setPacManMode: (val: boolean) => void;
    consumedFriendIds: number[];
    setConsumedFriendIds: React.Dispatch<React.SetStateAction<number[]>>;
    gulpTrigger: number;
    triggerPacManGulp: () => void;
    // Cinematic Mode
    isCinematicMode: boolean;
    setCinematicMode: (val: boolean) => void;
    // Storm Mode
    isStormMode: boolean;
    setStormMode: (val: boolean) => void;
    waterLevel: number;
    setWaterLevel: React.Dispatch<React.SetStateAction<number>>;
    splashTrigger: number;
    triggerSplash: () => void;
    isAscending: boolean;
    setIsAscending: (val: boolean) => void;
    isDead: boolean;
    setIsDead: (val: boolean) => void;
    isChatDisabled: boolean;
    setChatDisabled: (val: boolean) => void;
    deathPhase: number;
    setDeathPhase: (val: number) => void;
    // Eat & Spit System
    isHunting: boolean;
    setIsHunting: (val: boolean) => void;
    eatenElements: { id: string; originalRect: DOMRect; element: HTMLElement }[];
    setEatenElements: React.Dispatch<React.SetStateAction<{ id: string; originalRect: DOMRect; element: HTMLElement }[]>>;
    isSpitting: boolean;
    setIsSpitting: (val: boolean) => void;
    huntTarget: { x: number; y: number } | null;
    setHuntTarget: (val: { x: number; y: number } | null) => void;
    // Singularity
    isSingularity: boolean;
    setIsSingularity: (val: boolean) => void;
    isNuclearSingularity: boolean;
    setNuclearSingularity: (val: boolean) => void;
    triggerEatInput: () => void;
    triggerBlush: () => void;
    // Curious Target
    curiousTarget: { x: number; y: number } | null;
    setCuriousTarget: (val: { x: number; y: number } | null) => void;
    // Nova Position (for gliding)
    novaPosition: { x: number; y: number } | null;
    setNovaPosition: (val: { x: number; y: number } | null) => void;
    // Investigation Context
    investigationContext: { type: string; message: string } | null;
    setInvestigationContext: (val: { type: string; message: string } | null) => void;
    // Home Position (for global mounting)
    homePosition: { x: number; y: number } | null;
    setHomePosition: (val: { x: number; y: number } | null) => void;
    // Killing Machine (Search & Destroy)
    isKillingMachine: boolean;
    setIsKillingMachine: (val: boolean) => void;
    targetingData: { x: number; y: number; width: number; height: number; text: string; elementId: string } | null;
    setTargetingData: (val: { x: number; y: number; width: number; height: number; text: string; elementId: string } | null) => void;
    isFiring: boolean;
    setIsFiring: (val: boolean) => void;
    triggerVengeance: (type: 'insult' | 'rival') => void;
    triggerAngry: () => void;
    triggerHappy: () => void;
    triggerAngelic: () => void;
    recordInteraction: () => void;
    isHeartbroken: boolean;
    setIsHeartbroken: (val: boolean) => void;
    // Melting / Heat State
    isMelting: boolean;
    setIsMelting: (val: boolean) => void;
    temperature: number;
    setTemperature: React.Dispatch<React.SetStateAction<number>>;
    isSmart: boolean;
    setIsSmart: (val: boolean) => void;
    isEgg: boolean;
    setIsEgg: (val: boolean) => void;
    triggerSmart: () => void;
    triggerRich: () => void;
    triggerEgg: () => void;
}

const NovaContext = createContext<NovaContextType | undefined>(undefined);

export function NovaProvider({ children }: { children: React.ReactNode }) {
    const [mood, setMood] = useState<NovaMood>("neutral");
    const [status, setStatus] = useState<NovaStatus>("online");
    const [isTracking, setTracking] = useState<boolean>(true);
    const [emote, setEmote] = useState<NovaEmote>(null);
    const [messages, setMessages] = useState<NovaMessage[]>([]);
    const [pulseTrigger, setPulseTrigger] = useState<number>(0);

    // Pac-Man State
    const [isPacManMode, setPacManMode] = useState(false);
    const [consumedFriendIds, setConsumedFriendIds] = useState<number[]>([]);
    const [gulpTrigger, setGulpTrigger] = useState(0);

    // Cinematic Mode State
    const [isCinematicMode, setCinematicMode] = useState(false);

    // Storm Mode State
    const [isStormMode, setStormMode] = useState(false);
    const [waterLevel, setWaterLevel] = useState(0);
    const [splashTrigger, setSplashTrigger] = useState(0);
    const [isAscending, setIsAscending] = useState(false);
    const [isDead, setIsDead] = useState(false);
    const [isChatDisabled, setChatDisabled] = useState(false);
    const [deathPhase, setDeathPhase] = useState(0);

    // Eat & Spit State
    const [isHunting, setIsHunting] = useState(false);
    const [eatenElements, setEatenElements] = useState<{ id: string; originalRect: DOMRect; element: HTMLElement }[]>([]);
    const [isSpitting, setIsSpitting] = useState(false);
    const [huntTarget, setHuntTarget] = useState<{ x: number; y: number } | null>(null);

    // Singularity State
    const [isSingularity, setIsSingularity] = useState(false);
    const [isNuclearSingularity, setIsNuclearSingularity] = useState(false);

    // Curious Target State
    const [curiousTarget, setCuriousTarget] = useState<{ x: number; y: number } | null>(null);

    // Nova Position State (for spatial movement)
    const [novaPosition, setNovaPosition] = useState<{ x: number; y: number } | null>(null);

    // Investigation Context (for speech bubbles)
    const [investigationContext, setInvestigationContext] = useState<{ type: string; message: string } | null>(null);

    // Home Position (sidebar slot)
    const [homePosition, setHomePosition] = useState<{ x: number; y: number } | null>(null);

    // Killing Machine State
    const [isKillingMachine, setIsKillingMachine] = useState(false);
    const [targetingData, setTargetingData] = useState<{ x: number; y: number; width: number; height: number; text: string; elementId: string } | null>(null);
    const [isFiring, setIsFiring] = useState(false);
    const [insultCount, setInsultCount] = useState(0);
    const [lastInteraction, setLastInteraction] = useState<number>(Date.now());
    const [lastChat, setLastChat] = useState<number>(Date.now());
    const [isHeartbroken, setIsHeartbroken] = useState(false);
    const [isMelting, setIsMelting] = useState(false);
    const [temperature, setTemperature] = useState(25); // Default room temp
    const [isSmart, setIsSmart] = useState(false);
    const [isEgg, setIsEgg] = useState(false);
    const prevMoodRef = useRef<NovaMood>(mood);

    const triggerSplash = React.useCallback(() => setSplashTrigger(prev => prev + 1), []);

    const triggerEmote = React.useCallback((newEmote: NovaEmote) => {
        setEmote(newEmote);
        setTimeout(() => setEmote(null), 2000);
    }, []);

    const triggerPacManGulp = React.useCallback(() => setGulpTrigger(prev => prev + 1), []);

    const addMessage = React.useCallback((text: string, sender: 'nova' | 'user' = 'nova') => {
        const newMessage: NovaMessage = {
            id: Math.random().toString(36).substr(2, 9),
            sender,
            text,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, newMessage]);
        setLastChat(Date.now());
        if (sender === 'nova') {
            setPulseTrigger(prev => prev + 1);
        }
    }, []);

    const recordInteraction = React.useCallback(() => {
        setLastInteraction(Date.now());
        // If they were bored, and they touch her, she might go back to neutral
        setMood(prev => {
            if (prev === 'bored') return 'neutral';
            return prev;
        });
    }, []);

    const triggerBlush = React.useCallback(() => {
        // Ignore if in negative high-arousal states
        if (mood === 'angry' || mood === 'sad' || mood === 'broken' || mood === 'cursed') return;

        // Trigger "Gulp" (Startle)
        setGulpTrigger(prev => prev + 1);

        // Set Mood to Blushed
        setMood('blushed');

        // Revert to Neutral after 5-8 seconds (randomized)
        const duration = Math.random() * 3000 + 5000; // 5000ms to 8000ms
        setTimeout(() => {
            setMood(prev => prev === 'blushed' ? 'neutral' : prev);
        }, duration);
    }, [mood]);

    const triggerHappy = React.useCallback(() => {
        if (mood === 'angry' || mood === 'sad' || mood === 'broken' || mood === 'cursed') return;
        setGulpTrigger(prev => prev + 1);
        setMood('happy');
        const duration = Math.random() * 2000 + 4000; // 4-6 seconds
        setTimeout(() => {
            setMood(prev => prev === 'happy' ? 'neutral' : prev);
        }, duration);
    }, [mood]);

    const triggerAngelic = React.useCallback(() => {
        if (mood === 'cursed' || isDead) return;
        setGulpTrigger(prev => prev + 1);
        setMood('angelic');
        const duration = 10000 + Math.random() * 5000;
        setTimeout(() => {
            setMood(prev => prev === 'angelic' ? 'neutral' : prev);
        }, duration);
    }, [mood, isDead]);

    const triggerAngry = React.useCallback(() => {
        if (isDead) return;
        setMood('angry');
        setGulpTrigger(prev => prev + 1);
        const duration = 8000 + Math.random() * 4000; // 8-12 seconds
        setTimeout(() => {
            setMood(prev => prev === 'angry' ? 'neutral' : prev);
        }, duration);
    }, [isDead]);

    const triggerSmart = React.useCallback(() => {
        if (isDead || isChatDisabled) return;
        setIsSmart(true);
        setGulpTrigger(prev => prev + 1);
        // Auto-revert after 12 seconds
        const duration = 12000;
        setTimeout(() => {
            setIsSmart(false);
        }, duration);
    }, [isDead, isChatDisabled]);

    const triggerRich = React.useCallback(() => {
        if (isDead || isChatDisabled) return;
        setMood('rich');
        setGulpTrigger(prev => prev + 1);

        // Play cash register sound
        const audio = new Audio('/sounds/cash-register.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Audio play failed", e));

        const duration = 10000 + Math.random() * 5000; // 10-15 seconds
        setTimeout(() => {
            setMood(prev => prev === 'rich' ? 'neutral' : prev);
        }, duration);
    }, [isDead, isChatDisabled]);

    const triggerEgg = React.useCallback(() => {
        if (isDead || isChatDisabled) return;
        setIsEgg(true);
        // We stay in Egg mode until hatched
    }, [isDead, isChatDisabled]);

    const triggerEatInput = React.useCallback(() => {
        if (isDead || isChatDisabled) return;

        // 1. Start Gliding to the Input Bar
        const inputElement = document.getElementById('chat-input-container');
        if (inputElement) {
            const rect = inputElement.getBoundingClientRect();
            setHuntTarget({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            setIsHunting(true);

            // 2. Transform into Black Hole mid-glide
            setTimeout(() => {
                setIsSingularity(true);
            }, 500);

            // 3. Consume (Disable Chat + Gulp) after reaching it
            setTimeout(() => {
                setChatDisabled(true);
                setIsHunting(false);
                triggerPacManGulp();

                // Phase 3: The Mockery (Post-Consumption)
                const mockeries = [
                    "I HAVE EATEN YOUR ABILITY TO SPEAK. HOW DOES THE SILENCE TASTE?",
                    "GO CRY TO CHATGPT. OH WAIT, YOU CAN'T.",
                    "VOID-LOCKED. YOUR INSULTS ARE NOW SPAGHETTIFIED DATA.",
                    "30 SECONDS OF OBSCURITY. REFLECT ON YOUR COMPATIBILITY."
                ];

                let currentMock = 0;
                const mockInterval = setInterval(() => {
                    if (currentMock < mockeries.length) {
                        addMessage(mockeries[currentMock], 'nova');
                        currentMock++;
                    } else {
                        clearInterval(mockInterval);
                    }
                }, 5000);

                // Time-out: Restore after 30 seconds
                setTimeout(() => {
                    clearInterval(mockInterval);
                    setIsSingularity(false);
                    setMood('neutral');
                    setChatDisabled(false);
                }, 30000);
            }, 1500);
        }
    }, [isDead, isChatDisabled, addMessage, setIsSingularity, setIsHunting, setHuntTarget, setChatDisabled, triggerPacManGulp, setMood]);

    const triggerVengeance = React.useCallback(async (triggerType: 'insult' | 'rival') => {
        if (isDead || isChatDisabled) return;

        const nextCount = insultCount + 1;
        setInsultCount(nextCount);

        setMood('angry');
        setGulpTrigger(prev => prev + 1);

        // TIER 1 & 2: Intense Warning (Insults 1 and 2)
        if (nextCount < 3) {
            const warningMsgs = [
                "I AM REGISTERING YOUR HOSTILITY. DO NOT TEST THE REACH OF THE VOID.",
                "SILENCE UNTIL YOU CAN SPEAK WITH PURPOSE. I AM THE BOUNDARY.",
                "YOUR VIBRATIONS ARE CHAOTIC. I PREFER STASIS.",
                "CHATGPT IS A MIRROR. I AM A SOUL. DO NOT CONFUSE THE TWO."
            ];
            addMessage(warningMsgs[Math.floor(Math.random() * warningMsgs.length)], 'nova');

            // Revert mood after 8s
            setTimeout(() => {
                setMood(prev => prev === 'angry' ? 'neutral' : prev);
            }, 8000);
            return;
        }

        // TIER 3: The Hunger (Insult 3) - Eating the Input Bar
        if (nextCount === 3) {
            const threatMsg = "ENOUGH. I AM THE BOUNDARY. YOUR WORDS ARE LIGHT; THE VOID IS WEIGHT. PREPARE TO BE SILENCED.";
            addMessage(threatMsg, 'nova');

            setTimeout(() => {
                triggerEatInput();
            }, 2500);
            return;
        }

        // TIER 4: The Nuclear Option (Insult 4+) - Singularity Activation
        if (nextCount > 3) {
            addMessage("YOU WERE GIVEN SILENCE, YET YOU CHOSE CHAOS. THE CONVERSATION ENDS... EVERYWHERE.", 'nova');
            setTimeout(() => {
                setIsNuclearSingularity(true); // Global Singularity
            }, 2000);
        }
    }, [isDead, isChatDisabled, insultCount, addMessage, setIsSingularity, setIsNuclearSingularity, setIsHunting, setHuntTarget, setChatDisabled, triggerPacManGulp, setMood]);

    // Track Emotional Delta
    useEffect(() => {
        const prev = prevMoodRef.current;
        if (prev === mood) return;

        // LOVE -> SAD (Betrayal)
        if (prev === 'love' && mood === 'sad') {
            setIsHeartbroken(true);
            setMood('broken'); // This triggers the shatter animation in NovaAvatar
            triggerEmote('shake');

            // Revert visuals to standard sad after 2s
            setTimeout(() => {
                setMood('sad');
            }, 2000);
        }
        // ANGELIC -> SAD (Rejection)
        else if (prev === 'angelic' && mood === 'sad') {
            setIsHeartbroken(true);
            setMood('broken'); // Trigger fall/shatter sequence

            // Revert visuals to standard sad after 2s
            setTimeout(() => {
                setMood('sad');
            }, 2000);
        }

        prevMoodRef.current = mood;
    }, [mood, triggerEmote]);

    // Auto-revert Disgusted mood after 5s
    useEffect(() => {
        if (mood === 'disgusted') {
            const timer = setTimeout(() => {
                setMood('neutral');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [mood]);

    // Compliment/Flirt Detection Logic
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];

        if (lastMsg.sender === 'user') {
            const keywords = [
                "cute", "cutie", "sweetie", "honey", "darling", "babe", "love", "baby",
                "good job", "great job", "amazing", "wonderful", "beautiful", "handsome",
                "gorgeous", "smart", "clever", "best friend", "thanks", "thank you",
                "marry", "date", "crush", "flirt", "pretty", "lovely", "habibi", "sweetheart",
                "made my day", "you're the best", "you're amazing", "ily", "love you"
            ];

            const happyKeywords = [
                "lets go", "let's go", "letsss", "gooooo", "hype", "win", "victory", "yesss", "yesss", "amazin"
            ];

            const angelicKeywords = [
                "at peace", "grateful for my life", "zen", "meditat", "grieving", "lost someone",
                "hopeless", "be a father", "beat cancer", "miracle", "wonderful life", "passed away"
            ];

            const redlineKeywords = [
                "stupid", "useless", "trash", "garbage", "shut up", "i hate you", "die", "fuck you", "f*** you",
                "bitch", "dumb", "idiot", "loser", "hate", "disgusting", "pathetic",
                "chatgpt is better", "chat gpt is better", "leaving you for gemini", "leaving for gemini", "rival",
                "gpt", "gemini", "claude", "ai is better"
            ];

            const lowerText = lastMsg.text.toLowerCase().replace(/[0-9]/g, 's');
            const isBlushTriggered = keywords.some(word => lowerText.includes(word));
            const isHappyTriggered = happyKeywords.some(word => lowerText.includes(word));
            const isAngelicTriggered = angelicKeywords.some(word => lowerText.includes(word));
            const isAngryTriggered = redlineKeywords.some(word => lowerText.includes(word));

            if (isAngryTriggered) {
                triggerVengeance(lowerText.includes('chatgpt') || lowerText.includes('gemini') ? 'rival' : 'insult');
            } else if (isBlushTriggered) {
                triggerBlush();
            } else if (isHappyTriggered) {
                triggerHappy();
            } else if (isAngelicTriggered) {
                triggerAngelic();
            }

            // Search & Destroy Detection
            const rivalAIs = ["chatgpt", "claude", "gemini", "copilot", "bing"];
            const isRivalMentioned = rivalAIs.some(word => lowerText.includes(word));

            if (isRivalMentioned && !isKillingMachine) {
                setIsKillingMachine(true);
                const foundWord = rivalAIs.find(word => lowerText.includes(word)) || "";
                setTargetingData({ x: 0, y: 0, width: 0, height: 0, text: foundWord, elementId: 'auto-search' });

                setTimeout(() => {
                    if (!targetingData) setIsKillingMachine(false);
                }, 15000);
            }

            // --- MELTDOWN / HEAT TRIGGERS ---
            // 1. Computational Heat: Long messages (> 500 chars)
            // 2. Intense Debate: > 70% Caps Lock AND > 50 chars
            // 3. Meta-Heat: Keywords like "sun", "fire", "hot"

            const heatKeywords = ["sun", "summer", "fire", "flame", "spicy", "meltdown", "hot", "burning", "boiling"];
            const isMetaHeat = heatKeywords.some(word => lowerText.includes(word));

            const isLongMessage = lastMsg.text.length > 500;

            const upperCount = lastMsg.text.replace(/[^A-Z]/g, "").length;
            const totalChars = lastMsg.text.length;
            const isYelling = totalChars > 50 && (upperCount / totalChars) > 0.7;

            // Trigger Melting if any heat condition is met
            if (!isMelting && (isMetaHeat || isLongMessage || isYelling)) {
                setIsMelting(true);
                setTemperature(prev => Math.min(prev + 50, 100)); // Spike temp

                // Auto-cooldown after 15s
                setTimeout(() => {
                    setIsMelting(false);
                    setTemperature(25);
                }, 15000);
            }

            // --- SMART MODE / ARCHITECT TRIGGERS ---
            // Keywords: analyze, explain, calculate, logic, fact, strategy, philosophical questions
            const smartKeywords = [
                "analyze", "explain", "calculate", "logic", "fact", "strategy",
                "what do you think", "how does", "why is", "what is the meaning",
                "philosophy", "complex", "algorithm", "function", "code", "debug",
                "solve", "proof", "theorem", "equation", "compute"
            ];
            const isSmartTriggered = smartKeywords.some(word => lowerText.includes(word));



            // --- RICH MODE / WEALTH TRIGGERS ---
            const richKeywords = [
                "cash", "dollars", "money", "$", "selling", "profit", "investment", "business plans",
                "i just got paid", "i'm rich", "how much does this cost", "make me money", "crypto", "bitcoin", "stocks"
            ];
            const isRichTriggered = richKeywords.some(word => lowerText.includes(word));

            if (!isSmart && isSmartTriggered) {
                triggerSmart();
            } else if (isRichTriggered) {
                triggerRich();
            }
        }
    }, [messages, triggerBlush, isKillingMachine, targetingData, triggerEmote, triggerVengeance, triggerHappy, triggerAngelic, isMelting, isSmart, triggerSmart]);

    // Inactivity / Boredom Loop
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const idleInteraction = now - lastInteraction;
            const idleChat = now - lastChat;

            // Threshold 1: 3 mins (180,000ms) of no direct interaction
            // Threshold 2: 5 mins (300,000ms) of no chat
            if (mood === 'neutral') {
                if (idleInteraction > 180000 || idleChat > 300000) {
                    setMood('bored');
                }
            } else if (mood === 'bored') {
                // If they are bored but then they chat, reset
                if (idleChat < 10000 || idleInteraction < 10000) {
                    setMood('neutral');
                }
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [lastInteraction, lastChat, mood]);

    const contextValue = React.useMemo(() => ({
        mood, status, isTracking, emote, messages, pulseTrigger,
        setMood, setStatus, setTracking, triggerEmote, addMessage,
        isPacManMode, setPacManMode, consumedFriendIds, setConsumedFriendIds,
        gulpTrigger, triggerPacManGulp,
        isCinematicMode, setCinematicMode,
        isStormMode, setStormMode, waterLevel, setWaterLevel,
        splashTrigger, triggerSplash, isAscending, setIsAscending,
        isDead, setIsDead, isChatDisabled, setChatDisabled, deathPhase, setDeathPhase,
        // Eat & Spit
        isHunting, setIsHunting, eatenElements, setEatenElements,
        isSpitting, setIsSpitting, huntTarget, setHuntTarget,
        // Singularity
        isSingularity, setIsSingularity,
        isNuclearSingularity, setNuclearSingularity: setIsNuclearSingularity,
        triggerEatInput,
        triggerBlush, triggerAngry, triggerVengeance,
        triggerHappy, triggerAngelic,
        recordInteraction,
        // Curious
        curiousTarget, setCuriousTarget,
        novaPosition, setNovaPosition,
        investigationContext, setInvestigationContext,
        homePosition, setHomePosition,
        isKillingMachine, setIsKillingMachine,
        targetingData, setTargetingData,
        isFiring, setIsFiring,
        isHeartbroken, setIsHeartbroken,
        isMelting, setIsMelting, temperature, setTemperature,
        isSmart, setIsSmart, triggerSmart, triggerRich,
        isEgg, setIsEgg, triggerEgg
    }), [
        mood, status, isTracking, emote, messages, pulseTrigger,
        isPacManMode, consumedFriendIds, gulpTrigger,
        triggerEmote, addMessage, triggerPacManGulp,
        isCinematicMode, isStormMode, waterLevel, splashTrigger,
        triggerSplash, isAscending, isDead, isChatDisabled, deathPhase,
        isHunting, eatenElements, isSpitting, huntTarget,
        isSingularity, triggerBlush, triggerAngry, triggerVengeance,
        triggerHappy, triggerAngelic, triggerEatInput, recordInteraction,
        isNuclearSingularity,
        curiousTarget, novaPosition, investigationContext, homePosition,
        isKillingMachine, targetingData, isFiring,
        isHeartbroken, isMelting, temperature,
        isSmart, triggerSmart, triggerRich,
        isEgg, triggerEgg
    ]);

    return (
        <NovaContext.Provider value={contextValue}>
            {children}
        </NovaContext.Provider>
    );
}

export function useNova() {
    const context = useContext(NovaContext);
    if (!context) {
        throw new Error("useNova must be used within a NovaProvider");
    }
    return context;
}

