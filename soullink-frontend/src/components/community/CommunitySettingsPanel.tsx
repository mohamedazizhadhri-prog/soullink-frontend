"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Shield, Trash2, Loader2, List, ChevronLeft, Key, MessageSquare, Globe, Lock, Camera, Image as ImageIcon } from "lucide-react";
import styles from "./Panels.module.css";
import localStyles from "./CommunitySettingsPanel.module.css";
import api from "@/lib/api";
import { useRef } from "react";

interface CommunitySettingsPanelProps {
    server: any;
    onClose: () => void;
    onUpdate: (updated: any) => void;
}

type SettingsTab = "overview" | "channels" | "audit" | "invites" | "danger";

export function CommunitySettingsPanel({ server, onClose, onUpdate }: CommunitySettingsPanelProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
    const [name, setName] = useState(server?.name || "");
    const [description, setDescription] = useState(server?.description || "");
    const [isPublic, setIsPublic] = useState(server?.isPublic ?? true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Image states
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(server?.iconUrl || null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(server?.bannerUrl || null);

    const iconInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Channels state
    const [channels, setChannels] = useState<any[]>(server?.channels || []);
    const [selectedChannel, setSelectedChannel] = useState<any | null>(null);

    // Audit logs state
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    useEffect(() => {
        if (activeTab === "audit") {
            fetchAuditLogs();
        }
    }, [activeTab]);

    useEffect(() => {
        if (server) {
            setName(server.name || "");
            setDescription(server.description || "");
            setIsPublic(server.isPublic ?? true);
            setIconPreview(server.iconUrl || null);
            setBannerPreview(server.bannerUrl || null);
        }
    }, [server]);

    const fetchAuditLogs = async () => {
        if (!server?.id) return;
        try {
            setIsLoadingLogs(true);
            const res = await api.get(`/communities/${server.id}/audit-logs`);
            setAuditLogs(res.data.data.logs);
        } catch (err) {
            console.error("Failed to fetch audit logs:", err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleSaveOverview = async () => {
        try {
            setIsSaving(true);
            setError(null);

            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("isPublic", String(isPublic));
            
            if (iconFile) formData.append("icon", iconFile);
            if (bannerFile) formData.append("banner", bannerFile);

            if (!server?.id) throw new Error("Community context lost");

            const res = await api.patch(`/communities/${server.id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            onUpdate(res.data.data.community);
            setSuccess(true);
            setIconFile(null);
            setBannerFile(null);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            setIconPreview(URL.createObjectURL(file));
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const handleUpdateChannel = async (channelId: string, data: any) => {
        if (!server?.id) return;
        try {
            const res = await api.patch(`/communities/${server.id}/channels/${channelId}/permissions`, data);
            const updated = res.data.data.channel;
            setChannels(prev => prev.map(c => c.id === channelId ? updated : c));
            setSelectedChannel(updated);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to update channel");
        }
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div className="flex items-center gap-3">
                    <Settings size={20} className="text-indigo-400" />
                    <h3>Management</h3>
                </div>
                <button onClick={onClose} className={styles.closeBtn}>
                    <X size={18} />
                </button>
            </div>

            <div className={localStyles.tabBar}>
                <button 
                    className={`${localStyles.tabItem} ${activeTab === 'overview' ? localStyles.active : ''}`}
                    onClick={() => { setActiveTab('overview'); setSelectedChannel(null); }}
                    title="Overview"
                >
                    <Globe size={18} />
                </button>
                <button 
                    className={`${localStyles.tabItem} ${activeTab === 'channels' ? localStyles.active : ''}`}
                    onClick={() => setActiveTab('channels')}
                    title="Channels"
                >
                    <List size={18} />
                </button>
                <button 
                    className={`${localStyles.tabItem} ${activeTab === 'audit' ? localStyles.active : ''}`}
                    onClick={() => { setActiveTab('audit'); setSelectedChannel(null); }}
                    title="Audit Log"
                >
                    <Shield size={18} />
                </button>
                <button 
                    className={`${localStyles.tabItem} ${activeTab === 'danger' ? localStyles.active : ''}`}
                    onClick={() => { setActiveTab('danger'); setSelectedChannel(null); }}
                    title="Danger Zone"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab + (selectedChannel?.id || "")}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === "overview" && (
                            <div className={localStyles.overview}>
                                <div className={styles.section}>
                                    <div className={styles.sectionTitle}>Identity</div>
                                    
                                    <div className={localStyles.mediaGrid}>
                                        <div className={localStyles.bannerUpload} onClick={() => bannerInputRef.current?.click()}>
                                            {bannerPreview ? (
                                                <img src={bannerPreview} alt="Banner" className={localStyles.bannerImg} />
                                            ) : (
                                                <div className={localStyles.bannerPlaceholder}>
                                                    <ImageIcon size={24} />
                                                    <span>Upload Banner</span>
                                                </div>
                                            )}
                                            <div className={localStyles.mediaOverlay}>
                                                <Camera size={20} />
                                            </div>
                                            <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={handleBannerChange} />
                                        </div>

                                        <div className={localStyles.iconUpload} onClick={() => iconInputRef.current?.click()}>
                                            {iconPreview ? (
                                                <img src={iconPreview} alt="Icon" className={localStyles.iconImg} />
                                            ) : (
                                                <div className={localStyles.iconPlaceholder}>{name?.[0] || "?"}</div>
                                            )}
                                            <div className={localStyles.mediaOverlay}>
                                                <Camera size={16} />
                                            </div>
                                            <input type="file" ref={iconInputRef} hidden accept="image/*" onChange={handleIconChange} />
                                        </div>
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label>Community Name</label>
                                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Description</label>
                                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe your cluster..." />
                                    </div>
                                </div>

                                <div className={styles.section}>
                                    <div className={styles.sectionTitle}>Privacy</div>
                                    <div className={localStyles.toggleCard} onClick={() => setIsPublic(!isPublic)}>
                                        <div className={localStyles.toggleInfo}>
                                            <div className={localStyles.toggleLabel}>Public Protocol</div>
                                            <div className={localStyles.toggleDesc}>Anyone can find and join.</div>
                                        </div>
                                        <div className={`${localStyles.switch} ${isPublic ? localStyles.on : ""}`} />
                                    </div>
                                </div>

                                {error && <div className={localStyles.error}>{error}</div>}
                                {success && <div className={localStyles.success}>Profile synchronized ✓</div>}

                                <button 
                                    className={styles.confirmBtn} 
                                    onClick={handleSaveOverview}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Commit Changes"}
                                </button>
                            </div>
                        )}

                        {activeTab === "channels" && !selectedChannel && (
                            <div className={localStyles.channelList}>
                                <div className={styles.sectionTitle}>Channel Cluster</div>
                                {channels.map(chan => (
                                    <div key={chan.id} className={localStyles.channelItem} onClick={() => setSelectedChannel(chan)}>
                                        <div className={localStyles.channelMain}>
                                            <MessageSquare size={16} />
                                            <span>{chan.name}</span>
                                        </div>
                                        <ChevronLeft size={16} className="rotate-180 opacity-30" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "channels" && selectedChannel && (
                            <div className={localStyles.channelDetail}>
                                <button className={localStyles.backLink} onClick={() => setSelectedChannel(null)}>
                                    <ChevronLeft size={14} /> Back to Cluster
                                </button>
                                <div className={styles.sectionTitle}>#{selectedChannel.name} Config</div>

                                <div className={localStyles.toggleCard} 
                                    onClick={() => handleUpdateChannel(selectedChannel.id, { isAnnouncement: !selectedChannel.isAnnouncement })}
                                >
                                    <div className={localStyles.toggleInfo}>
                                        <div className={localStyles.toggleLabel}>Announcement Mode</div>
                                        <div className={localStyles.toggleDesc}>Only certain ranks can transmit.</div>
                                    </div>
                                    <div className={`${localStyles.switch} ${selectedChannel.isAnnouncement ? localStyles.on : ""}`} />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>Transmission Rank Required</label>
                                    <select 
                                        value={selectedChannel.minPostRole} 
                                        onChange={e => handleUpdateChannel(selectedChannel.id, { minPostRole: e.target.value })}
                                    >
                                        <option value="MEMBER">Member</option>
                                        <option value="MODERATOR">Moderator</option>
                                        <option value="ADMIN">Administrator</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === "audit" && (
                            <div className={localStyles.auditLog}>
                                <div className={styles.sectionTitle}>System Ledger</div>
                                {isLoadingLogs ? (
                                    <div className={styles.emptyState}>
                                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                                    </div>
                                ) : auditLogs.length === 0 ? (
                                    <div className={styles.emptyState}>No records found.</div>
                                ) : (
                                    <div className={localStyles.logList}>
                                        {auditLogs.map(log => (
                                            <div key={log.id} className={localStyles.logItem}>
                                                <div className={localStyles.logTime}>
                                                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className={localStyles.logText}>
                                                    <strong>{log.actor?.displayName || "System"}</strong> 
                                                    {" "}{log.action.replace(/_/g, ' ')}
                                                </div>
                                                {log.details && (
                                                    <div className={localStyles.logDetails}>
                                                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "danger" && (
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>Danger Zone</div>
                                <p className={localStyles.dangerDesc}>
                                    Termination is permanent. All channels, archives, and membership records will be purged from the core.
                                </p>
                                <button className={`${styles.confirmBtn} ${styles.confirmBtnDanger}`}>
                                    Purge Community Assets
                                </button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
