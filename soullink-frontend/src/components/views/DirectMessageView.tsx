"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./DirectMessageView.module.css";
import { Phone, Video, Search, Smile, Paperclip, Send, X, Image as ImageIcon } from "lucide-react";
import { useNova } from "@/context/NovaContext";
import { useChat } from "@/hooks/useChat";
import { chatService } from "@/services/chatService";

export function DirectMessageView({ receiverId }: { receiverId: string }) {
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const { setMood } = useNova();

    const {
        messages, friend, isTyping, loading,
        handleSend: baseSend, handleFileUpload, emitTyping
    } = useChat(receiverId, () => setMood('sad'));

    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const delayDebounce = setTimeout(async () => {
            try {
                const res = await chatService.searchMessages(receiverId, searchQuery);
                setSearchResults(res.messages);
            } catch (error) {
                console.error("Search failed:", error);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, receiverId]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const content = input;
        setInput("");
        try {
            await baseSend(content);
        } catch (error) {
            // Error handled in hook via onSendMessageError
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await handleFileUpload(file);
        } catch (error) {
            setMood('confused');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        emitTyping(true);
    };

    const renderMessageContent = (msg: any) => {
        switch (msg.type) {
            case 'IMAGE':
            case 'GIF':
                return (
                    <div className={styles.mediaContainer} onClick={() => setLightboxImage(msg.content)}>
                        <img src={msg.content} alt="Attachment" className={styles.mediaImage} />
                    </div>
                );
            case 'VIDEO':
                return (
                    <div className={styles.mediaContainer}>
                        <video src={msg.content} controls className={styles.mediaImage} />
                    </div>
                );
            case 'FILE':
                return (
                    <a href={msg.content} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a0a0ff', textDecoration: 'none', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 8 }}>
                        <Paperclip size={18} />
                        <span style={{ textDecoration: 'underline' }}>Download File</span>
                    </a>
                );
            default:
                return <span>{msg.content}</span>;
        }
    };

    return (
        <div className={styles.container}>
            {/* Lightbox Modal */}
            {lightboxImage && (
                <div className={styles.lightboxOverlay} onClick={() => setLightboxImage(null)}>
                    <X className={styles.closeLightbox} size={32} />
                    <img src={lightboxImage} alt="Full view" className={styles.lightboxImage} onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <div className={styles.avatarContainer}>
                        {friend?.avatarUrl ? (
                            <img src={friend.avatarUrl} alt="" className={styles.avatarImage} />
                        ) : (
                            <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{friend?.displayName?.[0] || '?'}</span>
                        )}
                        <div className={styles.statusIndicator} style={{
                            background: friend?.status === 'ONLINE' ? '#00ff88' :
                                friend?.status === 'AWAY' ? '#ffcc00' :
                                    friend?.status === 'DO_NOT_DISTURB' ? '#ff4444' : '#666'
                        }}></div>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{friend?.displayName || 'Loading...'}</h2>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                            {isTyping ? <span style={{ color: '#6C63FF' }}>typing...</span> : (friend?.status || 'OFFLINE')}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 16, color: 'rgba(255,255,255,0.6)', alignItems: 'center' }}>
                    {isSearching ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 12px' }}>
                            <input
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search history..."
                                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: 200, fontSize: '0.9rem' }}
                            />
                            <X size={16} style={{ cursor: 'pointer', marginLeft: 8 }} onClick={() => { setIsSearching(false); setSearchQuery(""); }} />
                        </div>
                    ) : (
                        <Search size={22} style={{ cursor: 'pointer' }} onClick={() => setIsSearching(true)} />
                    )}
                </div>
            </header>

            <div className={styles.chatTimeline}>
                {/* Search Results Overlay */}
                {isSearching && searchQuery && (
                    <div style={{ position: 'absolute', top: 70, right: 20, width: 320, background: '#1e1e2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, maxHeight: 400, overflowY: 'auto', zIndex: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        {searchResults.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No matches found.</div> : (
                            searchResults.map(msg => (
                                <div key={msg.id} style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }} className="hover:bg-white/5">
                                    <div style={{ fontSize: '0.75rem', color: '#6C63FF', marginBottom: 4 }}>{new Date(msg.createdAt).toLocaleDateString()}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#ddd' }}>{msg.content.substring(0, 60)}...</div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                        Retrieving soul-echoes...
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
                        <Smile size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <p>No messages yet.</p>
                        <p style={{ fontSize: '0.8rem' }}>Start a heart-to-heart.</p>
                    </div>
                ) : (
                    messages.map((msg: any) => {
                        const isOwn = msg.senderId !== receiverId; // Logic check: If I am sender, my ID != friendId
                        return (
                            <div key={msg.id} className={`${styles.messageRow} ${isOwn ? styles.messageRowOwn : styles.messageRowFriend}`}>
                                <div className={`${styles.messageBubble} ${isOwn ? styles.messageBubbleOwn : styles.messageBubbleFriend}`}>
                                    {!isOwn && <div className={styles.messageMeta}>{friend?.displayName || 'Friend'}</div>}
                                    <div className={styles.messageContent}>
                                        {renderMessageContent(msg)}
                                    </div>
                                    <div className={styles.messageTime}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            <div className={styles.inputArea}>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={onFileChange}
                />
                <Paperclip className={styles.iconButton} size={22} onClick={() => fileInputRef.current?.click()} />

                <input
                    type="text"
                    className={styles.inputField}
                    placeholder={`Message @${friend?.handle || '...'} (Shift+Enter for new line)`}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <Smile className={styles.iconButton} size={22} />
                <div className={styles.sendButton} onClick={handleSend}>
                    <Send size={18} />
                </div>
            </div>
        </div>
    );
}
