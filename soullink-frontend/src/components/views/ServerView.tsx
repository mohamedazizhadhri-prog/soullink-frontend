"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./ServerView.module.css";
import { Hash, ChevronDown, Users, Settings, UserPlus, Plus, Trash2, Pencil, Pin, Reply, X, Clock } from "lucide-react";
import Link from "next/link";
import groupStyles from "./GroupView.module.css";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";
import { MemberListPanel } from "../community/MemberListPanel";
import { PinnedMessagesPanel } from "../community/PinnedMessagesPanel";
import { InviteFriendsPanel } from "../community/InviteFriendsPanel";
import { CommunitySettingsPanel } from "../community/CommunitySettingsPanel";
import { MessageInput } from "../chat/MessageInput";
import { CreateChannelModal } from "../modals/CreateChannelModal";
import { EditChannelModal } from "../modals/EditChannelModal";
import { UserProfileModal } from "../modals/UserProfileModal";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    content: string;
    createdAt: string;
    isPinned: boolean;
    type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'GIF' | 'SYSTEM';
    author: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
    };
    replyTo?: {
        content: string;
        author: {
            displayName: string;
        };
    };
}

export function ServerView({ server: initialServer, channelId }: { server: any, channelId: string }) {
    const [server, setServer] = useState(initialServer);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // UI state
    const [activeRightPanel, setActiveRightPanel] = useState<'members' | 'settings' | 'pinned' | 'invite' | null>('members');
    const [selectedProfileHandle, setSelectedProfileHandle] = useState<string | null>(null);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [showEditChannel, setShowEditChannel] = useState(false);
    const [showServerMenu, setShowServerMenu] = useState(false);
    const [channelContextMenu, setChannelContextMenu] = useState<{ x: number; y: number; channel: any } | null>(null);
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
    const [muteStatus, setMuteStatus] = useState<any>(null); // { expiresAt: Date, reason: string }
    const [isBanned, setIsBanned] = useState(false);

    // Current user role
    const [currentUserRole, setCurrentUserRole] = useState<string>("MEMBER");

    // Sync internal server state when the prop changes (e.g. after navigation)
    useEffect(() => {
        if (initialServer) setServer(initialServer);
    }, [initialServer]);

    // Pass the first text channel as default if none specified
    const defaultChannelId = server?.channels && server.channels.length > 0 ? server.channels[0].id : "";
    const activeChannel = server?.channels?.find((c: any) => c.id === channelId) || server?.channels?.[0];

    // Fetch current user's role in this community
    useEffect(() => {
        const fetchRole = async () => {
            try {
                const res = await api.get(`/communities/${server.id}/members`);
                const members = res.data.data.members;
                const storedUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
                const me = members.find((m: any) => m.user?.id === storedUser?.id);
                if (me) setCurrentUserRole(me.role?.toUpperCase() || "MEMBER");
            } catch { }
        };
        if (server?.id) fetchRole();
    }, [server?.id]);

    useEffect(() => {
        if (!activeChannel) return;

        const fetchMessages = async () => {
            if (!activeChannel?.id || !server?.id) return;
            try {
                setIsLoading(true);
                const response = await api.get(`/communities/${server.id}/channels/${activeChannel.id}/messages`);
                setMessages(response.data.data.messages);
            } catch (err) {
                console.error('Failed to fetch messages:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();

        socketService.connect();
        if (server?.id) {
            socketService.emit('join:community', { communityId: server.id });
        }

        const handleNewMessage = (data: { channelId: string, message: Message }) => {
            if (data && data.channelId === activeChannel?.id) {
                setMessages(prev => [...prev, data.message]);
            }
        };

        socketService.on('community:message', handleNewMessage);

        return () => {
            socketService.off('community:message', handleNewMessage);
        };
    }, [activeChannel?.id, server?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Close menus on outside click
    useEffect(() => {
        const handleClick = () => {
            setShowServerMenu(false);
            setChannelContextMenu(null);
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    const handleSendMessage = async (content: string, attachment?: File, gifUrl?: string) => {
        if (!server?.id || !activeChannel?.id) return;
        
        try {
            const formData = new FormData();
            if (content) formData.append('content', content);
            if (replyingTo?.id) formData.append('replyToId', replyingTo.id);
            if (attachment) formData.append('file', attachment);

            await api.post(`/communities/${server.id}/channels/${activeChannel.id}/messages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };


    const handleTogglePin = async (messageId: string) => {
        if (!server?.id || !activeChannel?.id) return;
        try {
            const res = await api.patch(`/communities/${server.id}/channels/${activeChannel.id}/messages/${messageId}/pin`);
            const updatedMsg = res.data.data.message;
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isPinned: updatedMsg.isPinned } : m));
            // No need to fetch manually anymore as PinnedMessagesPanel handles its own fetch
        } catch (err) {
            console.error('Failed to toggle pin:', err);
        }
    };

    const handleChannelCreated = (channel: any) => {
        setServer((prev: any) => ({
            ...prev,
            channels: [...(prev.channels || []), channel]
        }));
    };

    const handleChannelUpdated = (updated: any) => {
        setServer((prev: any) => ({
            ...prev,
            channels: prev.channels.map((c: any) => c.id === updated.id ? updated : c)
        }));
    };

    const handleDeleteChannel = async (channelId: string) => {
        if (!server?.id) return;
        try {
            await api.delete(`/communities/${server.id}/channels/${channelId}`);
            setServer((prev: any) => ({
                ...prev,
                channels: prev.channels.filter((c: any) => c.id !== channelId)
            }));
        } catch (err: any) {
            console.error("Failed to delete channel:", err.response?.data?.message);
        }
        setChannelContextMenu(null);
    };

    const handleServerUpdate = (updated: any) => {
        if (!updated) return;
        // Merge into prev state so channels/inviteCode are never lost
        setServer((prev: any) => ({ ...prev, ...updated }));
    };

    const togglePanel = (panel: 'members' | 'settings' | 'pinned' | 'invite') => {
        setActiveRightPanel(activeRightPanel === panel ? null : panel);
    };

    const isAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

    if (!server) return null;

    return (
        <div className={styles.container}>
            {/* Channel List Sidebar */}
            <div className={styles.channelList}>
                <div
                    className={styles.serverHeader}
                    onClick={(e) => { e.stopPropagation(); setShowServerMenu(!showServerMenu); }}
                >
                    {server?.name} <ChevronDown size={16} />
                </div>

                {/* Server dropdown menu */}
                {showServerMenu && (
                    <div className={styles.serverMenu} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.menuItem} onClick={() => { togglePanel('invite'); setShowServerMenu(false); }}>
                            <UserPlus size={16} /> Invite Friends
                        </button>
                        {isAdmin && (
                            <button className={styles.menuItem} onClick={() => { togglePanel('settings'); setShowServerMenu(false); }}>
                                <Settings size={16} /> Community Settings
                            </button>
                        )}
                    </div>
                )}

                <div className={styles.channelGroup}>
                    <div className={styles.channelLabel}>
                        TEXT CHANNELS
                        {isAdmin && (
                            <button
                                className={styles.addChannelBtn}
                                onClick={() => setShowCreateChannel(true)}
                                title="Create Channel"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>
                    {server?.channels?.filter((c: any) => c.type === 'TEXT').map((channel: any) => (
                        <Link
                            key={channel.id}
                            href={`/server/${server?.id}/${channel.id}`}
                            className={`${styles.channelItem} ${activeChannel?.id === channel.id ? styles.activeChannel : ""}`}
                            onContextMenu={(e) => {
                                if (!isAdmin) return;
                                e.preventDefault();
                                setChannelContextMenu({ x: e.clientX, y: e.clientY, channel });
                            }}
                        >
                            <Hash size={18} /> {channel.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={styles.chatArea}>
                <header className={styles.chatHeader}>
                    <Hash size={24} className={styles.hashtag} />
                    <span>{activeChannel?.name || "Select Channel"}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
                        <button
                            className={`${styles.headerBtn} ${activeRightPanel === 'invite' ? styles.headerBtnActive : ""}`}
                            onClick={() => togglePanel('invite')}
                            title="Invite Friends"
                        >
                            <UserPlus size={20} />
                        </button>
                        <button
                            className={`${styles.headerBtn} ${activeRightPanel === 'pinned' ? styles.headerBtnActive : ""}`}
                            onClick={() => togglePanel('pinned')}
                            title="Pinned Messages"
                        >
                            <Pin size={20} />
                        </button>
                        <button
                            className={`${styles.headerBtn} ${activeRightPanel === 'members' ? styles.headerBtnActive : ""}`}
                            onClick={() => togglePanel('members')}
                            title="Toggle Member List"
                        >
                            <Users size={20} />
                        </button>
                        {isAdmin && (
                            <button
                                className={`${styles.headerBtn} ${activeRightPanel === 'settings' ? styles.headerBtnActive : ""}`}
                                onClick={() => togglePanel('settings')}
                                title="Community Settings"
                            >
                                <Settings size={20} />
                            </button>
                        )}
                    </div>
                </header>

                <div className={styles.messagesScroll}>
                    {messages.length === 0 && !isLoading && (
                        <div className={styles.welcomeBanner}>
                            <h3>Welcome to #{activeChannel?.name}!</h3>
                            <p>This is the start of the #{activeChannel?.name} channel.</p>
                        </div>
                    )}

                    {messages.map(msg => {
                        if (msg.type === 'SYSTEM') {
                            return (
                                <div key={msg.id} className={styles.systemMessage}>
                                    <Clock size={14} style={{ marginRight: 8, opacity: 0.5 }} />
                                    <span>{msg.content}</span>
                                </div>
                            );
                        }
                        return (
                            <div key={msg.id} className={`${styles.serverMessage} ${msg.isPinned ? styles.pinnedMessage : ""}`}>
                                <div 
                                    className={styles.userAvatar}
                                    onClick={() => setSelectedProfileHandle((msg.author as any)?.handle || msg.author?.displayName)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {msg.author?.avatarUrl ? (
                                        <img src={msg.author.avatarUrl} alt={msg.author?.displayName} />
                                    ) : (
                                        <span>{msg.author?.displayName?.[0] || '?'}</span>
                                    )}
                                </div>
                            <div className={styles.messageContentWrapper}>
                                {msg.replyTo && (
                                    <div className={styles.replyContext}>
                                        <Reply size={12} className={styles.replyIcon} />
                                        <span 
                                            className={styles.replyUser}
                                            onClick={() => setSelectedProfileHandle((msg.replyTo?.author as any)?.handle || msg.replyTo?.author?.displayName)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            @{msg.replyTo?.author?.displayName || 'Unknown'}
                                        </span>
                                        <span className={styles.replyText}>{msg.replyTo?.content}</span>
                                    </div>
                                )}
                                <div className={styles.userName}>
                                    <span 
                                        className={styles.displayName}
                                        onClick={() => setSelectedProfileHandle((msg.author as any)?.handle || msg.author?.displayName)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {(msg.author as any)?.nickname || msg.author?.displayName || 'Unknown User'}
                                    </span>
                                    {(msg.author as any)?.nickname && (
                                        <span className={styles.realName}>({msg.author?.displayName})</span>
                                    )}
                                    <span className={styles.timestamp}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.isPinned && <Pin size={12} className={styles.pinIndicator} />}
                                </div>
                                <div className={styles.messageText}>{msg.content}</div>
                                {(msg as any).fileUrl && (
                                    <div className={styles.messageMedia} onClick={() => window.open((msg as any).fileUrl, '_blank')}>
                                        <img src={(msg as any).fileUrl} alt="Attachment" className={styles.chatImage} />
                                    </div>
                                )}

                                <div className={styles.messageActions}>
                                    <button onClick={() => setReplyingTo(msg)} title="Reply">
                                        <Reply size={16} />
                                    </button>
                                    <button onClick={() => handleTogglePin(msg.id)} title={msg.isPinned ? "Unpin" : "Pin"}>
                                        <Pin size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputArea}>
                    {activeChannel && (
                        <MessageInput 
                            placeholder={`Message #${activeChannel.name}`}
                            onSend={handleSendMessage}
                            replyingTo={replyingTo}
                            onCancelReply={() => setReplyingTo(null)}
                            disabled={!!(muteStatus && new Date(muteStatus.expiresAt) > new Date())}
                        />
                    )}
                    {muteStatus && new Date(muteStatus.expiresAt) > new Date() && (
                        <div className={styles.muteWarning}>
                            <Clock size={16} />
                            <span>
                                You are timed out until {new Date(muteStatus.expiresAt).toLocaleString()}. 
                                Reason: <strong>{muteStatus.reason}</strong>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Unified Right Sidebar Panels */}
            <div className={styles.rightSidebar}>
                <AnimatePresence mode="wait">
                    {activeRightPanel === 'members' && (
                        <motion.div 
                            key="members"
                            className={styles.panelWrapper}
                            initial={{ x: 340, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 340, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <MemberListPanel 
                                serverId={server?.id} 
                                currentUserRole={currentUserRole} 
                                onProfileClick={(handle) => setSelectedProfileHandle(handle)}
                            />
                        </motion.div>
                    )}
                    {activeRightPanel === 'pinned' && activeChannel && (
                        <motion.div 
                            key="pinned"
                            className={styles.panelWrapper}
                            initial={{ x: 340, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 340, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <PinnedMessagesPanel 
                                serverId={server?.id} 
                                channelId={activeChannel?.id} 
                                onClose={() => setActiveRightPanel(null)}
                                onUnpin={handleTogglePin}
                            />
                        </motion.div>
                    )}
                    {activeRightPanel === 'invite' && (
                        <motion.div 
                            key="invite"
                            className={styles.panelWrapper}
                            initial={{ x: 340, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 340, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <InviteFriendsPanel 
                                serverId={server?.id} 
                                inviteCode={server?.inviteCode} 
                                onClose={() => setActiveRightPanel(null)} 
                            />
                        </motion.div>
                    )}
                    {activeRightPanel === 'settings' && (
                        <motion.div 
                            key="settings"
                            className={styles.panelWrapper}
                            initial={{ x: 340, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 340, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <CommunitySettingsPanel 
                                server={server} 
                                onClose={() => setActiveRightPanel(null)}
                                onUpdate={handleServerUpdate}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Profiles & Modals */}
            <UserProfileModal 
                handle={selectedProfileHandle} 
                onClose={() => setSelectedProfileHandle(null)} 
            />

            <CreateChannelModal
                isOpen={showCreateChannel}
                onClose={() => setShowCreateChannel(false)}
                serverId={server?.id}
                onChannelCreated={handleChannelCreated}
            />

            <EditChannelModal
                isOpen={showEditChannel}
                onClose={() => {
                    setShowEditChannel(false);
                    setChannelContextMenu(null);
                }}
                serverId={server?.id}
                channel={channelContextMenu?.channel}
                onChannelUpdated={handleChannelUpdated}
            />

            {channelContextMenu && (
                <div
                    className={styles.channelContextMenu}
                    style={{ top: channelContextMenu.y, left: channelContextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className={styles.contextOption}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowEditChannel(true);
                        }}
                    >
                        <Pencil size={14} /> Edit Channel
                    </button>
                    <button
                        className={`${styles.contextOption} ${styles.danger}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (channelContextMenu?.channel?.id) {
                                handleDeleteChannel(channelContextMenu.channel.id);
                            }
                        }}
                    >
                        <Trash2 size={14} /> Delete Channel
                    </button>
                </div>
            )}
        </div>
    );
}
