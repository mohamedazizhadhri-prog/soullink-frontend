import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Settings, ChevronLeft, Shield, Globe, Lock, Trash2, List, Key } from "lucide-react";
import styles from "./CommunitySettingsModal.module.css";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface CommunitySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    server: any;
    onUpdate: (updated: any) => void;
}

type Tab = "overview" | "invite" | "channels" | "audit" | "danger";

export function CommunitySettingsModal({ isOpen, onClose, server, onUpdate }: CommunitySettingsModalProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [name, setName] = useState(server?.name || "");
    const [description, setDescription] = useState(server?.description || "");
    const [isPublic, setIsPublic] = useState(server?.isPublic ?? true);
    const [inviteCode, setInviteCode] = useState(server?.inviteCode || "");
    const [channels, setChannels] = useState<any[]>(server?.channels || []);
    
    // Moderation & Audit
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<any | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && activeTab === "audit") {
            fetchAuditLogs();
        }
    }, [isOpen, activeTab]);

    const fetchAuditLogs = async () => {
        try {
            setIsLoadingLogs(true);
            const res = await api.get(`/communities/${server.id}/audit-logs`);
            setAuditLogs(res.data.data.logs);
        } catch (err) {
            console.error("Failed to fetch audit logs", err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);
            setSuccess(false);
            const res = await api.patch(`/communities/${server.id}`, {
                name,
                description,
                isPublic,
            });
            onUpdate(res.data.data.community);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerateInvite = async () => {
        if (!confirm("Regenerating the code will invalidate all current invite links. Continue?")) return;
        try {
            setIsRegenerating(true);
            const res = await api.post(`/communities/${server.id}/invite/regenerate`);
            setInviteCode(res.data.data.inviteCode);
            onUpdate({ ...server, inviteCode: res.data.data.inviteCode });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to regenerate code");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleRenameChannel = async (channelId: string, newName: string) => {
        try {
            const res = await api.patch(`/communities/${server.id}/channels/${channelId}`, { name: newName });
            const updated = res.data.data.channel;
            setChannels(prev => prev.map(c => c.id === channelId ? updated : c));
            onUpdate({ ...server, channels: server.channels.map((c: any) => c.id === channelId ? updated : c) });
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to rename channel");
        }
    };

    const handleUpdateChannelPermissions = async (channelId: string, data: any) => {
        try {
            const res = await api.patch(`/communities/${server.id}/channels/${channelId}/permissions`, data);
            const updated = res.data.data.channel;
            setChannels(prev => prev.map(c => c.id === channelId ? updated : c));
            setSelectedChannel(updated);
            onUpdate({ ...server, channels: server.channels.map((c: any) => c.id === channelId ? updated : c) });
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to update permissions");
        }
    };

    const handleDeleteChannel = async (channelId: string) => {
        if (!confirm("Are you sure you want to delete this channel? This cannot be undone.")) return;
        try {
            await api.delete(`/communities/${server.id}/channels/${channelId}`);
            setChannels(prev => prev.filter(c => c.id !== channelId));
            onUpdate({ ...server, channels: server.channels.filter((c: any) => c.id !== channelId) });
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to delete channel");
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${server.name}"? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            setIsDeleting(true);
            await api.delete(`/communities/${server.id}`);
            onClose();
            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to delete community");
            setIsDeleting(false);
        }
    };

    const tabIcons = {
        overview: <Settings size={16} />,
        invite: <Key size={16} />,
        channels: <List size={16} />,
        audit: <Shield size={16} />,
        danger: <Trash2 size={16} />
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className={styles.modal}
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 30 }}
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    >
                        <div className={styles.header}>
                            <h2>Community Settings</h2>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={20} />
                            </button>

                            <div className={styles.tabs}>
                                {(Object.keys(tabIcons) as Tab[]).map((tab) => (
                                    <button
                                        key={tab}
                                        className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
                                        onClick={() => { setActiveTab(tab); setSelectedChannel(null); }}
                                    >
                                        <span className="flex items-center gap-2">
                                            {tabIcons[tab]}
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.content}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {activeTab === "overview" && (
                                        <>
                                            <div className={styles.section}>
                                                <div className={styles.sectionTitle}>General Identity</div>
                                                <div className={styles.inputGroup}>
                                                    <label>Community Name</label>
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="e.g. Pixel Warriors"
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>Bio / Description</label>
                                                    <textarea
                                                        value={description}
                                                        onChange={(e) => setDescription(e.target.value)}
                                                        placeholder="Tell the world what you're about..."
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.section}>
                                                <div className={styles.sectionTitle}>Privacy & Visibility</div>
                                                <div className={styles.toggleRow}>
                                                    <div className={styles.toggleLabel}>
                                                        <span className={styles.toggleTitle}>Public Community</span>
                                                        <span className={styles.toggleDesc}>
                                                            Visible to everyone. Discoverable in search.
                                                        </span>
                                                    </div>
                                                    <button
                                                        className={`${styles.toggle} ${isPublic ? styles.on : ""}`}
                                                        onClick={() => setIsPublic(!isPublic)}
                                                    />
                                                </div>
                                            </div>

                                            {success && <div className={styles.successMsg}>Changes synchronized successfully ✓</div>}
                                            {error && <div className={styles.errorMsg}>{error}</div>}

                                            <button
                                                className={styles.saveBtn}
                                                onClick={handleSave}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Commit Changes"}
                                            </button>
                                        </>
                                    )}

                                    {activeTab === "invite" && (
                                        <div className={styles.section}>
                                            <div className={styles.sectionTitle}>Access Controls</div>
                                            <div className={styles.inviteContainer}>
                                                <div className={styles.codeBox}>
                                                    {inviteCode}
                                                </div>
                                                <p className={styles.toggleDesc} style={{ textAlign: 'center', marginBottom: '10px' }}>
                                                    Share this code with people you want to join.
                                                </p>
                                                <button 
                                                    className={styles.regenBtn}
                                                    onClick={handleRegenerateInvite}
                                                    disabled={isRegenerating}
                                                >
                                                    {isRegenerating ? "Generating New Access..." : "Regenerate Invite Code"}
                                                </button>
                                            </div>
                                            {success && <div className={styles.successMsg} style={{ marginTop: '16px' }}>Code updated successfully ✓</div>}
                                        </div>
                                    )}

                                    {activeTab === "channels" && (
                                        <div className={styles.section}>
                                            {!selectedChannel ? (
                                                <>
                                                    <div className={styles.sectionTitle}>Channel Architecture</div>
                                                    <div className={styles.channelList}>
                                                        {channels.map((chan: any) => (
                                                            <motion.div 
                                                                key={chan.id} 
                                                                className={styles.channelItem}
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                            >
                                                                <input 
                                                                    className={styles.chanInput}
                                                                    defaultValue={chan.name}
                                                                    onBlur={(e) => {
                                                                        if (e.target.value !== chan.name) {
                                                                            handleRenameChannel(chan.id, e.target.value);
                                                                        }
                                                                    }}
                                                                />
                                                                <button 
                                                                    className={styles.chanSettingsBtn}
                                                                    onClick={() => setSelectedChannel(chan)}
                                                                    title="Configure Permissions"
                                                                >
                                                                    <Settings size={18} />
                                                                </button>
                                                                <button 
                                                                    className={styles.chanDelete}
                                                                    onClick={() => handleDeleteChannel(chan.id)}
                                                                    title="Delete Channel"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className={styles.channelSettings}>
                                                    <div className={styles.channelHeaderRow}>
                                                        <button className={styles.backBtn} onClick={() => setSelectedChannel(null)}>
                                                            <ChevronLeft size={16} /> All Channels
                                                        </button>
                                                        <span className={styles.channelNameHeading}># {selectedChannel.name}</span>
                                                    </div>

                                                    <div className={styles.toggleRow}>
                                                        <div className={styles.toggleLabel}>
                                                            <span className={styles.toggleTitle}>Announcement Mode</span>
                                                            <span className={styles.toggleDesc}>
                                                                Restrict posting to Admins and Owners only.
                                                            </span>
                                                        </div>
                                                        <button
                                                            className={`${styles.toggle} ${selectedChannel.isAnnouncement ? styles.on : ""}`}
                                                            onClick={() => handleUpdateChannelPermissions(selectedChannel.id, { 
                                                                isAnnouncement: !selectedChannel.isAnnouncement 
                                                            })}
                                                        />
                                                    </div>

                                                    <div className={styles.inputGroup} style={{ marginTop: '24px' }}>
                                                        <label>Minimum Rank to Post</label>
                                                        <p className={styles.toggleDesc} style={{ marginBottom: '12px' }}>
                                                            Ensure high-quality content by enforcing role thresholds.
                                                        </p>
                                                        <select 
                                                            className={styles.roleSelect}
                                                            value={selectedChannel.minPostRole}
                                                            onChange={(e) => handleUpdateChannelPermissions(selectedChannel.id, { 
                                                                minPostRole: e.target.value 
                                                            })}
                                                        >
                                                            <option value="MEMBER">Member (Default)</option>
                                                            <option value="MODERATOR">Moderator</option>
                                                            <option value="ADMIN">Administrator</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "audit" && (
                                        <div className={styles.section}>
                                            <div className={styles.sectionTitle}>Moderation History</div>
                                            {isLoadingLogs ? (
                                                <div className="flex flex-col items-center justify-center p-12 gap-4">
                                                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                                                    <span className={styles.toggleDesc}>Retrieving secure logs...</span>
                                                </div>
                                            ) : (
                                                <div className={styles.auditLogList}>
                                                    {auditLogs.length === 0 ? (
                                                        <div className={styles.helpText} style={{ textAlign: 'center', padding: '40px' }}>
                                                            The audit log is clear. No recent administrative actions.
                                                        </div>
                                                    ) : (
                                                        auditLogs.map((log: any, idx) => (
                                                            <motion.div 
                                                                key={log.id} 
                                                                className={styles.auditLogItem}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                            >
                                                                <div className={styles.auditHeader}>
                                                                    <div className={styles.auditActor}>
                                                                        {log.actor?.avatarUrl && (
                                                                            <img src={log.actor.avatarUrl} alt="" className={styles.auditAvatar} />
                                                                        )}
                                                                        <span className={styles.actorName}>{log.actor?.displayName || "System"}</span>
                                                                    </div>
                                                                    <span className={styles.auditDate}>
                                                                        {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.auditInfo}>
                                                                    <span className={styles.auditAction}>
                                                                        <Shield size={14} className="inline mr-2 text-indigo-400" />
                                                                        {log.action.replace(/_/g, ' ')}
                                                                    </span>
                                                                    {log.details && (
                                                                        <div className={styles.auditDetails}>
                                                                            {typeof log.details === 'string' ? JSON.stringify(JSON.parse(log.details), null, 2) : JSON.stringify(log.details, null, 2)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "danger" && (
                                        <div className={styles.dangerZone}>
                                            <div className={styles.dangerTitle}>
                                                <Trash2 size={20} /> Irreversible Termination
                                            </div>
                                            <div className={styles.dangerDesc}>
                                                Deleting this community will permanently purge all channels, archives, and member associations. This operation cannot be reversed.
                                            </div>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={handleDelete}
                                                disabled={isDeleting}
                                            >
                                                {isDeleting ? "Purging Community Assets..." : "Destroy Community Permanently"}
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
