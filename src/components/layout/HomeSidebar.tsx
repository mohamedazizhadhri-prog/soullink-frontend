"use client";

import React, { useRef, useState, useEffect } from "react";
import styles from "./HomeSidebar.module.css";
import { Users, MessageCircle, Gamepad2, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNova } from "@/context/NovaContext";
import { motion, AnimatePresence } from "framer-motion";

export function HomeSidebar() {
    const pathname = usePathname();
    const {
        messages, isCinematicMode, setCinematicMode, mood, isChatDisabled,
        addMessage, setMood, triggerEmote, isHeartbroken
    } = useNova();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

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

        try {
            const response = await fetch('/api/groq-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    history: messages.slice(-10) // Send last 10 messages for context
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            // Synthetic delay for heartbreak "thinking/hollow" state
            if (isHeartbroken || (data.mood === 'sad' && mood === 'love')) {
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            }

            addMessage(data.response, 'nova');
            if (data.mood && setMood) {
                setMood(data.mood);
            }
            if (data.action === 'nod' && triggerEmote) {
                triggerEmote('nod');
            }

        } catch (error) {
            console.error("Chat Error:", error);
            addMessage("I... feel a disturbance in the connection. Let's try that again.", 'nova');
            setMood('confused');
        } finally {
            setIsLoading(false);
            if (inputRef.current) inputRef.current.focus();
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

    return (
        <div
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

                    <Link href="/match" className={`${styles.navItem} ${pathname === '/match' ? styles.active : ''}`}>
                        <Users size={20} />
                        <span>Find Connections</span>
                    </Link>

                    <Link href="/group" className={`${styles.navItem} ${pathname === '/group' ? styles.active : ''}`}>
                        <MessageCircle size={20} />
                        <span>24h Groups</span>
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

                <div className={styles.chatDisplay}>
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                className={`${styles.message} ${isCinematicMode ? styles.messageGlow : ''} ${mood === 'crazy' ? styles.glitchText : ''} ${mood === 'cursed' ? styles.cursedText : ''}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                style={{
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    background: msg.sender === 'user' ? 'rgba(255,255,255,0.1)' : undefined,
                                    borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                    marginLeft: msg.sender === 'user' ? '20%' : 0,
                                    marginRight: msg.sender === 'nova' ? '20%' : 0,
                                }}
                            >
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
        </div>
    );
}
