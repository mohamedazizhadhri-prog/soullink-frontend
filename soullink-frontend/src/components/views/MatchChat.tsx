"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./MatchChat.module.css";
import { Send, UserCircle2, Zap, Flame, UserMinus, X, Flag, Phone, Video } from "lucide-react";
import { matchingService } from "@/services/matchingService";
import { socketService } from "@/lib/socket";
import { useWebRTCContext } from "@/context/WebRTCContext";
import { ReportUserModal } from "../modals/ReportUserModal";
import { MessageInput } from "../chat/MessageInput";
import { CallOverlay } from "../chat/CallOverlay";
import { WatchActivityPanel } from "../watch-party/WatchActivityPanel";
import { useNovaProactive } from "@/hooks/useNovaProactive";

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
    const [showReportModal, setShowReportModal] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const matchPartnerId = match.senderId === match.myId ? match.receiverId : match.senderId;
    const partnerName = match.isAnonymous
        ? (match.anonymousName || 'Anonymous Soul')
        : (match.senderId === match.myId ? match.receiver?.displayName : match.sender?.displayName) || 'Match';
    const partnerAvatar = match.isAnonymous ? null : (match.senderId === match.myId ? match.receiver?.avatarUrl : match.sender?.avatarUrl);

    const webrtc = useWebRTCContext().oneToOne;
    const [watchSessionId, setWatchSessionId] = useState<string | null>(null);
    const [watchInviteBanner, setWatchInviteBanner] = useState<{ sessionId: string; hostName: string } | null>(null);

    const { fireEvent } = useNovaProactive();
    const longChatNudgedRef = useRef(false);

    // Nova teases about identity reveal once conversation gets deep
    useEffect(() => {
        if (longChatNudgedRef.current) return;
        if (messages.length < 30) return;
        if (!match.isAnonymous) return; // Already revealed, no point
        longChatNudgedRef.current = true;
        fireEvent('long_match_chat', {
            messageCount: messages.length,
            anonymousName: match.anonymousName || 'your match',
        });
    }, [messages.length]);

    useEffect(() => {
        const handleActivityStarted = (data: { sessionId: string; hostName: string }) => {
            setWatchInviteBanner(data);
        };
        socketService.on('watch:activity-started', handleActivityStarted);
        
        // Request active session for this match on mount
        if (match?.id) {
            socketService.emit('watch:get-active', { context: 'match', contextId: match.id });
        }

        return () => socketService.off('watch:activity-started', handleActivityStarted);
    }, [match?.id]);

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

    const onSend = async (text: string) => {
        if (!text.trim()) return;
        try {
            await matchingService.sendMatchMessage(match.id, text);
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
                    <button onClick={() => webrtc.startCall(matchPartnerId, 'audio', 'match', match.id)} title="Audio Call" className={styles.headerBtn}>
                        <Phone size={18} />
                    </button>
                    {!match.isAnonymous && (
                        <button onClick={() => webrtc.startCall(matchPartnerId, 'video', 'match', match.id)} title="Video Call" className={styles.headerBtn}>
                            <Video size={18} />
                        </button>
                    )}
                    {match.isAnonymous && (
                        <button onClick={onReveal} title="Reveal Soul" className={styles.headerBtn}>
                            <Flame size={18} />
                        </button>
                    )}
                    <button onClick={onLeave} title="Leave Match" className={styles.headerBtn}>
                        <UserMinus size={18} />
                    </button>
                    <button onClick={() => setShowReportModal(true)} title="Report User" className={styles.headerBtn} style={{ color: '#ff4757' }}>
                        <Flag size={18} />
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
                                <div className={styles.bubble}>
                                    {msg.type === 'CALL' ? (
                                        (() => {
                                            try {
                                                const data = JSON.parse(msg.content);
                                                const isOutgoing = isOwn;
                                                const durationStr = data.duration > 0 
                                                    ? `${Math.floor(data.duration / 60)}m ${data.duration % 60}s`
                                                    : (isOutgoing ? 'No answer' : 'Missed');
                                                
                                                return (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ 
                                                            width: 32, height: 32, borderRadius: '50%', 
                                                            background: isOutgoing ? 'rgba(108, 99, 255, 0.2)' : 'rgba(255, 71, 87, 0.2)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: isOutgoing ? '#6C63FF' : '#ff4757'
                                                        }}>
                                                            {data.callType === 'video' ? <Video size={16} /> : <Phone size={16} />}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                                {data.callType === 'video' ? 'Video Call' : 'Voice Call'}
                                                            </span>
                                                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                                                {isOutgoing ? 'Outgoing' : 'Incoming'} • {durationStr}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            } catch (e) {
                                                return <span>Call ended</span>;
                                            }
                                        })()
                                    ) : msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            <div className={styles.inputArea}>
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
                            receiverId={matchPartnerId}
                            messages={messages}
                            friend={{ displayName: partnerName, avatarUrl: partnerAvatar }}
                            onSendMessage={onSend}
                        />
                    </div>
                )}

                {watchInviteBanner && !watchSessionId && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px',
                        background: 'rgba(123, 104, 238, 0.15)',
                        border: '1px solid rgba(123, 104, 238, 0.3)',
                        borderRadius: 12, marginBottom: 10, fontSize: 13,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>🎬</span>
                        <span style={{ flex: 1, color: '#E0E0F5' }}>
                            <strong>{watchInviteBanner.hostName === 'Someone' ? partnerName : watchInviteBanner.hostName}</strong> started a YouTube activity
                        </span>
                        <button
                            onClick={() => { setWatchSessionId(watchInviteBanner.sessionId); setWatchInviteBanner(null); }}
                            style={{ background: '#7B68EE', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                        >
                            Join
                        </button>
                        <button onClick={() => setWatchInviteBanner(null)}
                            style={{ background: 'none', border: 'none', color: '#A0A0B5', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}>
                            ×
                        </button>
                    </div>
                )}

                <MessageInput 
                    placeholder="Whisper something..."
                    onSend={onSend}
                    context="match"
                    contextId={match.id}
                    onWatchSession={(sid) => setWatchSessionId(sid)}
                />
            </div>

            {showReportModal && (
                <ReportUserModal
                    targetUserId={matchPartnerId}
                    targetDisplayName={partnerName}
                    contextType="MATCH"
                    contextId={match.id}
                    onClose={() => setShowReportModal(false)}
                />
            )}

            {/* Call Overlay */}
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
                    callerName={partnerName}
                    callerAvatar={partnerAvatar}
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
