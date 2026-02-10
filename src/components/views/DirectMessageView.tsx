"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./DirectMessageView.module.css"; // We'll create this or reuse GroupView styles if similar
import groupStyles from "../views/GroupView.module.css"; // Reusing for speed/consistency
import { Phone, Video, Search, Smile, Paperclip, Send } from "lucide-react";
import { useNova } from "@/context/NovaContext";

export function DirectMessageView({ friendName, avatarColor, avatar }: { friendName: string, avatarColor?: string, avatar?: string }) {
    const [message, setMessage] = useState("");
    const prevMessageRef = useRef("");
    const { setMood } = useNova();

    useEffect(() => {
        // Neglect Trigger: If long message (>20 chars) is deleted without sending
        if (message.length === 0 && prevMessageRef.current.length > 20) {
            setMood('sad');
        }
        prevMessageRef.current = message;
    }, [message, setMood]);

    const handleSend = () => {
        if (!message.trim()) return;
        prevMessageRef.current = ""; // Clear ref to avoid sad trigger
        setMessage("");
    };

    return (
        <div className={groupStyles.container} style={{ background: 'var(--color-bg-app)' }}>
            <header className={groupStyles.header} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%', background: avatarColor || '#333',
                        position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {avatar && (
                            <img src={avatar} alt={friendName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#00FF00', border: '2px solid var(--color-bg-card)', zIndex: 10 }}></div>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{friendName}</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Online</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 16, color: 'var(--color-text-secondary)' }}>
                    <div data-eatid="call-buttons" style={{ display: 'flex', gap: 16 }}>
                        <Phone size={20} style={{ cursor: 'pointer' }} />
                        <Video size={20} style={{ cursor: 'pointer' }} />
                    </div>
                    <Search size={20} style={{ cursor: 'pointer' }} data-eatid="conversation-search" />
                </div>
            </header>

            <div className={groupStyles.chatTimeline} data-eatid="main-content">
                <div className={groupStyles.message}>
                    <div className={groupStyles.messageMeta}>
                        <span className={groupStyles.messageAuthor}>{friendName}</span>
                        <span>09:41</span>
                    </div>
                    <div className={groupStyles.messageContent} style={{ background: 'rgba(255,255,255,0.05)' }}>
                        Hey! I saw you in the "Philosophical Night Owls" group last night. Your take on authenticity was really interesting.
                    </div>
                </div>

                <div className={`${groupStyles.message} ${groupStyles.messageOwn}`}>
                    <div className={groupStyles.messageMeta}>
                        <span className={groupStyles.messageAuthor}>You</span>
                        <span>09:42</span>
                    </div>
                    <div className={groupStyles.messageContent}>
                        Thanks Aziz! Yeah, I've been thinking a lot about digital masks lately. It's cool that SoulLink lets us explore that.
                    </div>
                </div>

                <div className={groupStyles.message}>
                    <div className={groupStyles.messageMeta}>
                        <span className={groupStyles.messageAuthor}>{friendName}</span>
                        <span>09:45</span>
                    </div>
                    <div className={groupStyles.messageContent} style={{ background: 'rgba(255,255,255,0.05)' }}>
                        Exactly. I feel like I can be myself here. Wanna play a Soul Game later?
                    </div>
                </div>
            </div>

            <div className={groupStyles.inputArea} data-eatid="message-input">
                <Paperclip size={20} style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }} />
                <input
                    type="text"
                    className={groupStyles.inputField}
                    placeholder={`Message @${friendName}`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Smile size={20} style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }} />
                <div
                    onClick={handleSend}
                    style={{ background: 'var(--color-brand-purple)', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <Send size={16} color="white" />
                </div>
            </div>
        </div>
    );
}
