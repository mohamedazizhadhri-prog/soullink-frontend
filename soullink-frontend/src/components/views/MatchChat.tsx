"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./MatchChat.module.css";
import { Send, UserCircle2, Zap, Flame, UserMinus, X } from "lucide-react";
import { matchingService } from "@/services/matchingService";
import { socketService } from "@/lib/socket";

interface MatchChatProps {
    match: any;
    onClose: () => void;
    onReveal: () => void;
    onLeave: () => void;
}

export function MatchChat({ match, onClose, onReveal, onLeave }: MatchChatProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await matchingService.getMatchMessages(match.id);
                setMessages(res.data?.data?.messages || []);
            } catch (error) {
                console.error("Failed to load match messages", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();

        const handleNewMessage = (data: any) => {
            if (data.matchId === match.id) {
                setMessages(prev => [...prev, data.message]);
            }
        };

        socketService.on('match:message', handleNewMessage);
        return () => {
            socketService.off('match:message', handleNewMessage);
        };
    }, [match.id]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        try {
            await matchingService.sendMatchMessage(match.id, content);
            setContent("");
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    return (
        <div className={styles.chatContainer}>
            <header className={styles.chatHeader}>
                <div className={styles.chatInfo}>
                    <div className={styles.avatar}>
                        {match.isAnonymous ? <Zap size={20} /> : <UserCircle2 size={20} />}
                    </div>
                    <div>
                        <h4>{match.isAnonymous ? (match.anonymousName || 'Anonymous Soul') : 'Mutual Friend'}</h4>
                        <span>{match.isAnonymous ? '✨ Anonymous Connection' : '👤 Identity Revealed'}</span>
                    </div>
                </div>
                <div className={styles.chatActions}>
                    {match.isAnonymous && (
                        <button onClick={onReveal} title="Reveal Soul" className={styles.headerBtn}>
                            <Flame size={18} />
                        </button>
                    )}
                    <button onClick={onLeave} title="Leave Match" className={styles.headerBtn}>
                        <UserMinus size={18} />
                    </button>
                    <button onClick={onClose} className={styles.headerBtn}>
                        <X size={18} />
                    </button>
                </div>
            </header>

            <div className={styles.messageList}>
                {isLoading ? (
                    <div className={styles.loading}>Retrieving soul-echoes...</div>
                ) : messages.length === 0 ? (
                    <div className={styles.empty}>Start a heart-to-heart with this anonymous soul.</div>
                ) : (
                    messages.map((msg: any) => {
                        const isOwn = msg.senderId === match.myId;

                        return (
                            <div key={msg.id} className={`${styles.messageRow} ${isOwn ? styles.own : styles.other}`}>
                                <div className={styles.bubble}>{msg.content}</div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            <form className={styles.inputArea} onSubmit={handleSend}>
                <input 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Whisper something..."
                />
                <button type="submit">
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
