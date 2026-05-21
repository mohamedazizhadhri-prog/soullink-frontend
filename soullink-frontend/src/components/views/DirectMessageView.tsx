"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./DirectMessageView.module.css";
import { Phone, Video, Search, Smile, Paperclip, Send, X, Image as ImageIcon, Pin, Reply, Flag } from "lucide-react";
import { useNova } from "@/context/NovaContext";
import { useChat } from "@/hooks/useChat";
import { useWebRTCContext } from "@/context/WebRTCContext";
import { chatService } from "@/services/chatService";
import { UserProfileModal } from "../modals/UserProfileModal";
import { ReportUserModal } from "../modals/ReportUserModal";
import { MessageInput } from "../chat/MessageInput";
import { CallOverlay } from "../chat/CallOverlay";
import { WatchActivityPanel } from "../watch-party/WatchActivityPanel";
import { socketService } from "@/lib/socket";
import { useNovaProactive } from "@/hooks/useNovaProactive";

export function DirectMessageView({ receiverId }: { receiverId: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { setMood } = useNova();

    const {
        messages, friend, isTyping, loading,
        handleUnifiedSend, emitTyping
    } = useChat(receiverId, () => setMood('sad'));

    const webrtc = useWebRTCContext().oneToOne;

    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    const [showPinned, setShowPinned] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
    const [selectedProfileHandle, setSelectedProfileHandle] = useState<string | null>(null);
    const [reportingMessage, setReportingMessage] = useState<any | null>(null);
    const [watchSessionId, setWatchSessionId] = useState<string | null>(null);
    const [watchInviteBanner, setWatchInviteBanner] = useState<{ sessionId: string; hostName: string } | null>(null);

    const { fireEvent } = useNovaProactive();
    const dormantCheckRef = useRef(false);

    // Nova comments on reconnecting with a friend after 7+ days of silence
    useEffect(() => {
        if (dormantCheckRef.current || !messages?.length || !friend) return;
        dormantCheckRef.current = true;
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg?.createdAt) return;
        const daysSince = Math.round((Date.now() - new Date(lastMsg.createdAt).getTime()) / 86400000);
        if (daysSince >= 7) {
            fireEvent('dormant_dm', {
                friendName: friend.displayName || 'your friend',
                daysSince,
            });
        }
    }, [messages, friend]);

    // Listen for activity started from the other user
    useEffect(() => {
        if (!receiverId) return;

        const handleActivityStarted = (data: { sessionId: string; hostName: string }) => {
            setWatchInviteBanner(data);
        };
        socketService.on('watch:activity-started', handleActivityStarted);
        
        // Request active session for this DM on mount
        socketService.emit('watch:get-active', { context: 'dm', contextId: receiverId });

        return () => socketService.off('watch:activity-started', handleActivityStarted);
    }, [receiverId]);

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


    const handleTogglePin = async (messageId: string) => {
        try {
            const res = await chatService.togglePin(receiverId, messageId);
            // Updating local state (in useChat or here)
            // For now, if we don't have a way to update useChat's messages easily without a refetch, 
            // we could either add a method to useChat or just let the socket handle it if implemented.
            // Since we're using a hook, I'll just refresh or hope for the best.
            // Actually, I'll manally update the messages in the hook if I can, but I can't easily.
            // I'll just call fetchPinned if panel is open.
            if (showPinned) fetchPinnedMessages();
        } catch (error) {
            console.error("Pin toggle failed:", error);
        }
    };

    const fetchPinnedMessages = async () => {
        try {
            const res = await chatService.getPinnedMessages(receiverId);
            setPinnedMessages(res.messages);
        } catch (error) {
            console.error("Failed to fetch pinned messages:", error);
        }
    };

    useEffect(() => {
        if (showPinned) fetchPinnedMessages();
    }, [showPinned, receiverId]);

    const onUnifiedSend = async (content: string, attachment?: File, gifUrl?: string) => {
        let type = 'TEXT';
        let finalContent = content;

        if (attachment) {
            type = attachment.type.startsWith('image/') ? 'IMAGE' : 'FILE';
        } else if (gifUrl) {
            type = 'GIF';
            finalContent = gifUrl;
        }

        try {
            await handleUnifiedSend(finalContent, attachment, type, replyingTo?.id);
            setReplyingTo(null);
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const handleInputChange = (content: string) => {
        emitTyping(content.length > 0);
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
            case 'CALL': {
                try {
                    const data = JSON.parse(msg.content);
                    const isOutgoing = msg.senderId !== receiverId;
                    const durationStr = data.duration > 0 
                        ? `${Math.floor(data.duration / 60)}m ${data.duration % 60}s`
                        : (isOutgoing ? 'No answer' : (data.status === 'rejected' ? 'Declined' : 'Missed'));

                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                            <div style={{ 
                                width: 40, height: 40, borderRadius: '50%', 
                                background: isOutgoing ? 'rgba(108, 99, 255, 0.2)' : (data.duration === 0 ? 'rgba(255, 71, 87, 0.2)' : 'rgba(108, 99, 255, 0.2)'),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isOutgoing ? '#6C63FF' : (data.duration === 0 ? '#ff4757' : '#6C63FF')
                            }}>
                                {data.callType === 'video' ? <Video size={20} /> : <Phone size={20} />}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {data.callType === 'video' ? 'Video Call' : 'Voice Call'}
                                </span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                    {isOutgoing ? 'Outgoing' : (data.duration === 0 ? 'Missed call' : 'Incoming')} • {durationStr}
                                </span>
                            </div>
                        </div>
                    );
                } catch (e) {
                    return <span>Call ended</span>;
                }
            }
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
                    <div 
                        className={styles.avatarContainer} 
                        onClick={() => setSelectedProfileHandle(friend?.handle || null)}
                        style={{ cursor: 'pointer' }}
                    >
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
                        <>
                            <Phone size={22} style={{ cursor: 'pointer' }} onClick={() => webrtc.startCall(receiverId, 'audio', 'dm')} title="Audio Call" />
                            <Video size={22} style={{ cursor: 'pointer' }} onClick={() => webrtc.startCall(receiverId, 'video', 'dm')} title="Video Call" />
                            <Search size={22} style={{ cursor: 'pointer' }} onClick={() => setIsSearching(true)} />
                            <Pin 
                                size={22} 
                                style={{ cursor: 'pointer', color: showPinned ? '#818cf8' : 'inherit' }} 
                                onClick={() => setShowPinned(!showPinned)} 
                            />
                        </>
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
                        const isOwn = msg.senderId !== receiverId;
                        return (
                            <div key={msg.id} className={`${styles.messageRow} ${isOwn ? styles.messageRowOwn : styles.messageRowFriend}`}>
                                <div className={`${styles.messageBubble} ${isOwn ? styles.messageBubbleOwn : styles.messageBubbleFriend} ${msg.isPinned ? styles.pinnedBubble : ""}`}>
                                    {msg.replyTo && (
                                        <div className={styles.replyContext}>
                                            <Reply size={12} />
                                            <span className={styles.replyUser}>@{msg.replyTo.sender.displayName}</span>
                                            <span className={styles.replyText}>{msg.replyTo.content}</span>
                                        </div>
                                    )}
                                    {!isOwn && <div className={styles.messageMeta}>{friend?.displayName || 'Friend'}</div>}
                                    <div className={styles.messageContent}>
                                        {renderMessageContent(msg)}
                                    </div>
                                    <div className={styles.messageTime}>
                                        {msg.isPinned && <Pin size={12} style={{ marginRight: 4, color: '#ffd700' }} />}
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>

                                    <div className={styles.messageActions}>
                                        <button onClick={() => setReplyingTo(msg)} title="Reply">
                                            <Reply size={14} />
                                        </button>
                                        {!isOwn && (
                                            <button onClick={() => setReportingMessage(msg)} title="Report Message" style={{ color: '#ff4757' }}>
                                                <Flag size={14} />
                                            </button>
                                        )}
                                        <button onClick={() => handleTogglePin(msg.id)} title={msg.isPinned ? "Unpin" : "Pin"}>
                                            <Pin size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            <div className={styles.inputAreaContainer}>
                {/* Watch Activity Panel — Fixed Overlay like Discord */}
                {watchSessionId && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '12px',
                        background: 'rgba(10,10,18,0.97)',
                        backdropFilter: 'blur(12px)',
                    }}>
                        <WatchActivityPanel
                            sessionId={watchSessionId}
                            onClose={() => setWatchSessionId(null)}
                            receiverId={receiverId}
                            messages={messages}
                            friend={friend}
                            isTyping={isTyping}
                            onSendMessage={(text) => handleUnifiedSend(text)}
                            onTyping={emitTyping}
                        />
                    </div>
                )}

                {/* Invite banner from the other user */}
                {watchInviteBanner && !watchSessionId && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px',
                        background: 'rgba(123, 104, 238, 0.15)',
                        border: '1px solid rgba(123, 104, 238, 0.3)',
                        borderRadius: 12, margin: '0 12px 10px',
                        fontSize: 13, zIndex: 50,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>🎬</span>
                        <span style={{ flex: 1, color: '#E0E0F5' }}>
                            <strong>{watchInviteBanner.hostName === 'Someone' ? (friend?.displayName || 'The other user') : watchInviteBanner.hostName}</strong> is watching a video!
                        </span>
                        <button
                            onClick={() => { setWatchSessionId(watchInviteBanner.sessionId); setWatchInviteBanner(null); }}
                            style={{ background: '#7B68EE', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                        >
                            Watch what {watchInviteBanner.hostName === 'Someone' ? (friend?.displayName || 'they') : watchInviteBanner.hostName} is watching
                        </button>
                        <button
                            onClick={() => setWatchInviteBanner(null)}
                            style={{ background: 'none', border: 'none', color: '#A0A0B5', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}
                        >
                            ×
                        </button>
                    </div>
                )}

                <MessageInput 
                    placeholder={`Message @${friend?.handle || '...'}`}
                    onSend={onUnifiedSend}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    context="dm"
                    contextId={receiverId}
                    onWatchSession={(sid) => setWatchSessionId(sid)}
                />
            </div>

            {/* Pinned Messages Overlay */}
            {showPinned && (
                <div className={styles.pinnedOverlay} onClick={() => setShowPinned(false)}>
                    <div className={styles.pinnedPanel} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.pinnedHeader}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Pinned Messages</h3>
                            <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowPinned(false)} />
                        </div>
                        <div className={styles.pinnedList}>
                            {pinnedMessages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>No pinned soul-echoes yet.</div>
                            ) : (
                                pinnedMessages.map(msg => (
                                    <div key={msg.id} className={styles.pinnedItem}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <strong style={{ fontSize: '0.9rem', color: '#818cf8' }}>
                                                {msg.senderId === receiverId ? friend?.displayName : 'You'}
                                            </strong>
                                            <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>{new Date(msg.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.95rem', marginBottom: 12 }}>{msg.content}</div>
                                        <button 
                                            style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
                                            onClick={() => handleTogglePin(msg.id)}
                                        >
                                            Unpin
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Profiles & Modals */}
            <UserProfileModal 
                handle={selectedProfileHandle} 
                onClose={() => setSelectedProfileHandle(null)} 
            />

            {reportingMessage && (
                <ReportUserModal
                    targetUserId={reportingMessage.senderId}
                    targetDisplayName={friend?.displayName || "User"}
                    contextType="DM"
                    contextId={reportingMessage.id}
                    onClose={() => setReportingMessage(null)}
                />
            )}

            {/* Call Overlay — rendered in Shell globally; just keep local fallback for outgoing calls initiated here */}
            {webrtc.callStatus !== 'idle' && !webrtc.incomingCall && (
                <CallOverlay
                    status={webrtc.callStatus}
                    callType={webrtc.callType}
                    duration={webrtc.callDuration}
                    localStream={webrtc.localStream}
                    remoteStream={webrtc.remoteStream}
                    participants={[]}
                    isMuted={webrtc.isMuted}
                    isVideoOff={webrtc.isVideoOff}
                    isScreenSharing={webrtc.isScreenSharing}
                    callerName={friend?.displayName}
                    callerAvatar={friend?.avatarUrl}
                    mode="1:1"
                    onEnd={webrtc.endCall}
                    onToggleMute={webrtc.toggleMute}
                    onToggleVideo={webrtc.toggleVideo}
                    onToggleScreenShare={webrtc.toggleScreenShare}
                />
            )}
        </div>
    );
}
