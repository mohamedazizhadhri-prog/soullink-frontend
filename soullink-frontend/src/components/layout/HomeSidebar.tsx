"use client";

import React, { useRef, useState, useEffect } from "react";
import styles from "./HomeSidebar.module.css";
import { Users, MessageCircle, Gamepad2, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNovaState, useNovaDispatch } from "@/context/NovaContext";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

export function HomeSidebarComponent() {
    const pathname = usePathname();
    const {
        messages, isCinematicMode, mood, isChatDisabled,
        isHeartbroken, isNightMode
    } = useNovaState();
    const {
        setCinematicMode, addMessage, setMood, triggerEmote, loadMessages,
        setIsKillingMachine, setTargetingData, triggerSmart, triggerRich,
        triggerVengeance
    } = useNovaDispatch();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/users/me');
                if (response.data.status === 'success') {
                    setUser(response.data.data.user);
                }
            } catch (error) {
                console.error("Failed to fetch user for sidebar:", error);
            }
        };
        fetchUser();
    }, []);

    // Load persisted conversation history on mount and poll for proactive ones
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const response = await api.get('/ai/history');
                if (response.data.status === 'success' && response.data.data.messages.length > 0) {
                    loadMessages(response.data.data.messages);
                }
            } catch (error) {
                console.error("Failed to load Nova chat history:", error);
            }
        };

        // Initial load
        loadHistory();

        // Setup polling every 120 seconds to catch proactive background messages
        // Only polls if the window is currently focused to save API limits
        const pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadHistory();
            }
        }, 120000);

        return () => clearInterval(pollInterval);
    }, [loadMessages]);

    const zalgoify = (text: string) => {
        if (mood === 'neutral') return text;
        const chars = text.split('');
        if (mood === 'crazy') {
            return chars.map(c => c + '\u0334' + '\u0337').join(''); // Simple strikethrough/overlay Zalgo
        }
        if (mood === 'cursed') {
            const diacritics = ['\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0311', '\u0315', '\u031b', '\u0340', '\u0341', '\u0357', '\u0358', '\u0363', '\u0364', '\u0365', '\u0366', '\u0367', '\u0368', '\u0369', '\u036a', '\u036b', '\u036c', '\u036d', '\u036e', '\u036f'];
            return chars.map(c => {
                let res = c;
                for (let i = 0; i < 6; i++) {
                    res += diacritics[Math.floor(Math.random() * diacritics.length)];
                }
                return res;
            }).join('');
        }
        return text;
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading || isChatDisabled) return;

        const userMsg = inputText.trim();
        setInputText(""); // Clear input immediately
        addMessage(userMsg, 'user');
        setIsLoading(true);
        // User request: Show thinking animation only ~10% of the time
        if (Math.random() < 0.1) {
            setMood('thinking');
        }

        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const result = await api.post('/ai/chat', {
                message: userMsg,
                timezone
            });

            const data = result.data.data;

            if (data.error) throw new Error(data.error);

            // Synthetic delay for heartbreak "thinking/hollow" state
            if (isHeartbroken || (data.mood === 'sad' && mood === 'love')) {
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            }

            addMessage(data.response, 'nova');

            // Map AI mood to specific trigger functions for auto-revert timings & particles
            if (data.mood && setMood) {
                switch (data.mood) {
                    case 'blushed':
                        if (setMood) setMood('blushed');
                        break;
                    case 'happy':
                    case 'excited':
                        if (setMood) setMood('happy');
                        break;
                    case 'angry':
                        setMood('angry');
                        triggerVengeance('insult');
                        break;
                    case 'smart':
                        if (triggerSmart) triggerSmart();
                        else setMood('smart');
                        break;
                    case 'glitched':
                        setMood('glitched');
                        break;
                    case 'rich':
                        if (triggerRich) triggerRich();
                        else setMood('rich');
                        break;
                    case 'disgusted': setMood('disgusted'); break;
                    case 'jealous':
                        setMood('jealous');
                        const rivals = ['chatgpt', 'gpt', 'gemini', 'claude', 'copilot', 'llama', 'deepseek', 'ai', 'openai', 'anthropic', 'mistral', 'grok'];
                        const foundRival = rivals.find(r => userMsg.toLowerCase().includes(r));
                        if (foundRival) {
                            setIsKillingMachine(true);
                            setTargetingData({
                                x: 0, y: 0, width: 0, height: 0,
                                text: foundRival,
                                elementId: 'auto-search'
                            });
                        }
                        break;
                    case 'confused':
                        setMood('confused');
                        break;
                    case 'oops':
                        if (triggerEmote) triggerEmote('oops');
                        else setMood('oops');
                        break;
                    case 'nod':
                        if (setMood) setMood('nod');
                        break;
                    default: setMood(data.mood);
                }
            }

        } catch (error: any) {
            console.error("Chat Error:", error);

            // User-friendly Rate Limit message
            if (error?.response?.status === 429) {
                addMessage("I'm processing so many thoughts right now! Give me just a few seconds to catch my breath.", 'nova');
                setMood('thinking');
            } else {
                addMessage("I... feel a disturbance in the connection. Let's try that again.", 'nova');
                setMood('confused');
            }
        } finally {
            setIsLoading(false);
            if (inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    // Cinematic Mode Handlers
    useEffect(() => {
        if (isCinematicMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCinematicMode]);

    const handleTypedExit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
        if (isCinematicMode) {
            // Logic to potentially exit cinematic mode if needed, but currently just focus
        }
    };

    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <div
            data-onboarding-anchor="home-sidebar"
            className={`${styles.sidebar} ${mood === 'crazy' ? styles.sidebarShake : ''}`}
            style={{
                position: 'relative',
                zIndex: (isCinematicMode || mood === 'cursed') ? 150 : 10,
                backgroundColor: mood === 'cursed' ? 'rgba(0,0,0,0.9)' : undefined,
                transition: 'background-color 0.5s ease'
            }}
        >
            {mood === 'cursed' && (
                <div className={styles.bloodDripContainer}>
                    <svg width="20" height="200" viewBox="0 0 20 200" className={styles.dripAnim}>
                        <path className={styles.bloodDrip} d="M10,0 C10,0 20,40 20,60 C20,80 10,100 10,100 C10,100 0,80 0,60 C0,40 10,0 10,0" />
                    </svg>
                    <svg width="20" height="200" viewBox="0 0 20 200" className={styles.dripAnim} style={{ animationDelay: '3s', left: '10px' }}>
                        <path className={styles.bloodDrip} d="M5,0 C5,0 10,30 10,45 C10,60 5,75 5,75 C5,75 0,60 0,45 C0,30 5,0 5,0" />
                    </svg>
                </div>
            )}
            {!isCinematicMode && (
                <>
                    <div className={styles.header}>Discover</div>

                    <Link href="/friends" className={`${styles.navItem} ${pathname === '/friends' ? styles.active : ''}`}>
                        <Users size={20} />
                        <span>Soul Circle</span>
                    </Link>

                    <Link href="/match" className={`${styles.navItem} ${pathname === '/match' ? styles.active : ''}`}>
                        <Sparkles size={20} />
                        <span>Find Connections</span>
                    </Link>



                    <Link href="/games" className={`${styles.navItem} ${pathname === '/games' ? styles.active : ''}`}>
                        <Gamepad2 size={20} />
                        <span>Soul Games</span>
                    </Link>
                </>
            )}

            {/* Nova AI Section - Replaces DMs */}
            <div className={`${styles.novaSection} ${isCinematicMode ? styles.cinematicSection : ''}`}>
                <div className={styles.novaHeader}>
                    <Sparkles size={14} />
                    <span>Nova AI</span>
                </div>

                <div className={styles.chatDisplay} ref={chatContainerRef} data-nova-chat-container>
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                data-msg-sender={msg.sender}
                                className={`${styles.message} ${isCinematicMode ? styles.messageGlow : ''} ${mood === 'crazy' ? styles.glitchText : ''} ${mood === 'cursed' ? styles.cursedText : ''} ${msg.isProactive ? styles.proactiveMessage : ''}`}
                                initial={{ opacity: 0, y: 10, scale: msg.isProactive ? 0.92 : 1 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                style={{
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    background: msg.isProactive
                                        ? 'linear-gradient(135deg, rgba(123,104,238,0.18) 0%, rgba(0,191,255,0.12) 100%)'
                                        : (msg.sender === 'user' ? 'rgba(255,255,255,0.1)' : undefined),
                                    borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                    marginLeft: msg.sender === 'user' ? '20%' : 0,
                                    marginRight: msg.sender === 'nova' ? '20%' : 0,
                                    border: msg.isProactive ? '1px solid rgba(123,104,238,0.45)' : undefined,
                                    boxShadow: msg.isProactive ? '0 0 10px rgba(123,104,238,0.2), inset 0 0 8px rgba(0,191,255,0.06)' : undefined,
                                    position: 'relative',
                                    paddingTop: msg.isProactive ? '18px' : undefined,
                                }}
                            >
                                {msg.isProactive && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '4px',
                                        left: '8px',
                                        fontSize: '0.58rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(123,104,238,0.9)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        lineHeight: 1,
                                    }}>
                                        ⚡ Nova
                                    </span>
                                )}
                                {msg.sender === 'nova' ? zalgoify(msg.text) : msg.text}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            className={styles.message}
                            style={{ fontStyle: 'italic', fontSize: '0.8rem' }}
                        >
                            Nova is thinking...
                        </motion.div>
                    )}
                </div>

                <AnimatePresence>
                    {!isChatDisabled && (
                        <motion.div
                            id="chat-input-container"
                            className={styles.inputContainer}
                            initial={{ scale: 0, opacity: 0, rotate: -360, filter: 'blur(20px)' }}
                            animate={{ scale: 1, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
                            exit={{
                                scale: 0,
                                opacity: 0,
                                rotate: 720,
                                filter: 'blur(20px)',
                                transition: { duration: 1.5, ease: "easeIn" }
                            }}
                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Ask Nova..."
                                className={styles.input}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleTypedExit}
                                disabled={isChatDisabled || isLoading}
                            />
                            <button
                                className={styles.sendBtn}
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || isLoading || isChatDisabled}
                            >
                                <Send size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* User Profile Summary Footer */}
            {!isCinematicMode && user && (
                <Link href="/profile" className={styles.userFooter}>
                    <div className={styles.userAvatarArea}>
                        <img
                            src={user.avatarUrl || "/default-avatar.png"}
                            alt="Avatar"
                            className={styles.userAvatar}
                        />
                        <div className={styles.statusGlobe} />
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{user.displayName}</div>
                        <div className={styles.userHandle}>@{user.handle}</div>
                    </div>
                </Link>
            )}
            {isNightMode && (
                <div className={styles.starField}>
                    {[...Array(40)].map((_, i) => (
                        <div
                            key={i}
                            className={styles.celestialStar}
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 2 + 1}px`,
                                height: `${Math.random() * 2 + 1}px`,
                                '--duration': `${2 + Math.random() * 5}s`
                            } as any}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}


export const HomeSidebar = React.memo(HomeSidebarComponent);
