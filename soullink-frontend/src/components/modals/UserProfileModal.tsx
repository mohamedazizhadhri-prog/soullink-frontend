"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, UserPlus, Shield, Globe, Calendar, Loader2, Lock, Pencil, Check, Camera } from "lucide-react";
import styles from "./UserProfileModal.module.css";
import api from "@/lib/api";
import { useRef } from "react";
import { ReportUserModal } from "./ReportUserModal";

interface UserProfile {
    id: string;
    displayName: string;
    handle: string;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    onlineStatus: string;
    createdAt: string;
    privacyProfile: string;
    relationship?: 'FRIEND' | 'SENT' | 'RECEIVED' | 'NONE' | 'BLOCKED' | null;
    personalityProfile?: {
        openness: number;
        conscientiousness: number;
        extraversion: number;
        agreeableness: number;
        neuroticism: number;
        insights: string[];
    };
}

interface UserProfileModalProps {
    handle: string | null;
    onClose: () => void;
}

export function UserProfileModal({ handle, onClose }: UserProfileModalProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [socialActionLoading, setSocialActionLoading] = useState(false);
    const [editData, setEditData] = useState({ displayName: "", bio: "" });
    const [mounted, setMounted] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const storedUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("sl_user") || "{}") : null;
    const isOwnProfile = profile?.id === storedUser?.id;

    useEffect(() => {
        setMounted(true);
        const fetchProfile = async () => {
            if (!handle) return;
            try {
                setIsLoading(true);
                setError(null);
                setErrorCode(null);
                const res = await api.get(`/users/${handle}`);
                setProfile(res.data.data.user);
                setEditData({
                    displayName: res.data.data.user.displayName,
                    bio: res.data.data.user.bio || ""
                });
            } catch (err: any) {
                setErrorCode(err.response?.status ?? null);
                setError(err.response?.data?.message || "Soul signature not found.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [handle]);

    if (!handle) return null;

    const traitLabels: Record<string, string> = {
        openness: "Openness",
        conscientiousness: "Focus",
        extraversion: "Energy",
        agreeableness: "Empathy",
        neuroticism: "Stability"
    };

    const getTraitColor = (trait: string) => {
        const colors: Record<string, string> = {
            openness: "#8b5cf6",
            conscientiousness: "#3b82f6",
            extraversion: "#f59e0b",
            agreeableness: "#10b981",
            neuroticism: "#ef4444"
        };
        return colors[trait] || "#4f46e5";
    };
    const handleAvatarClick = () => {
        if (isEditing && isOwnProfile) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        const formData = new FormData();
        formData.append("avatar", file);

        try {
            setIsSaving(true);
            const res = await api.post("/users/me/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setProfile({ ...profile, avatarUrl: res.data.data.user.avatarUrl });
            // Update local storage if needed
            if (storedUser) {
                localStorage.setItem("sl_user", JSON.stringify({ ...storedUser, avatarUrl: res.data.data.user.avatarUrl }));
            }
        } catch (err) {
            console.error("Avatar upload failed:", err);
            alert("Failed to upload avatar.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!profile) return;
        try {
            setIsSaving(true);
            const res = await api.patch("/users/me", editData);
            setProfile({ ...profile, ...res.data.data.user });
            setIsEditing(false);
            if (storedUser) {
                localStorage.setItem("sl_user", JSON.stringify({ ...storedUser, ...res.data.data.user }));
            }
        } catch (err) {
            console.error("Profile update failed:", err);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddFriend = async () => {
        if (!profile) return;
        try {
            setSocialActionLoading(true);
            await api.post("/friends/request", { receiverId: profile.id });
            setProfile({ ...profile, relationship: 'SENT' });
        } catch (err) {
            console.error("Failed to send friend request:", err);
            alert("Failed to send friend request.");
        } finally {
            setSocialActionLoading(false);
        }
    };

    const handleAcceptRequest = async () => {
        if (!profile) return;
        try {
            setSocialActionLoading(true);
            // We need to find the friendship ID. We can get it from the profile or a separate call
            // For now, let's assume we search for it or the backend handles it by userId
            await api.post(`/friends/respond-by-user/${profile.id}`, { action: 'accept' });
            setProfile({ ...profile, relationship: 'FRIEND' });
        } catch (err) {
            console.error("Failed to accept friend request:", err);
            alert("Failed to accept friend request.");
        } finally {
            setSocialActionLoading(false);
        }
    };

    const handleSendMessage = () => {
        if (!profile) return;
        window.location.href = `/dm/${profile.id}`;
    };

    if (!mounted) return null;

    return createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <motion.div 
                className={styles.modal} 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={18} />
                </button>

                {isOwnProfile && (
                    <button 
                        className={styles.editToggleBtn} 
                        onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : isEditing ? <Check size={18} /> : <Pencil size={18} />}
                    </button>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                        <Loader2 size={48} className="animate-spin text-indigo-500" />
                        <p className="text-white/40 font-medium">Synchronizing DNA...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-[400px] p-12 text-center gap-6">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${errorCode === 403 ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-500'}`}>
                            {errorCode === 403 ? <Shield size={32} /> : <Lock size={32} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {errorCode === 403 ? 'Profile Unavailable' : 'Not Found'}
                            </h3>
                            <p className="text-white/40">{error}</p>
                        </div>
                        <button className={styles.secondaryBtn} onClick={onClose}>Return to Core</button>
                    </div>
                ) : profile && (
                    <>
                        <div 
                            className={styles.banner} 
                            style={{
                                background: profile.bannerUrl ? `url(${profile.bannerUrl}) center/cover no-repeat` : undefined,
                                borderRadius: '20px 20px 0 0'
                            }}
                        />
                        
                        <div className={styles.profileHeader}>
                            <div 
                                className={`${styles.avatarWrapper} ${isEditing ? styles.editableAvatar : ""}`}
                                onClick={handleAvatarClick}
                            >
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="" className={styles.avatar} />
                                ) : (
                                    <div className={styles.avatarFallback}>{profile.displayName[0]}</div>
                                )}
                                {isEditing && (
                                    <div className={styles.avatarOverlay}>
                                        <Camera size={24} />
                                    </div>
                                )}
                                <div className={styles.statusDot} data-status={profile.onlineStatus} />
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    style={{ display: 'none' }} 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        <div className={styles.contentLayout}>
                            <div className={styles.leftColumn}>
                                <div className={styles.names}>
                                    {isEditing && isOwnProfile ? (
                                        <input 
                                            className={styles.displayNameInput}
                                            value={editData.displayName}
                                            onChange={e => setEditData({ ...editData, displayName: e.target.value })}
                                            placeholder="Display Name"
                                        />
                                    ) : (
                                        <h2 className={styles.displayName}>{profile.displayName}</h2>
                                    )}
                                    <span className={styles.handle}>@{profile.handle}</span>
                                </div>

                                {(profile.bio || isEditing) && (
                                    <div className={styles.bioSection}>
                                        <div className={styles.bioTitle}>Bio</div>
                                        {isEditing && isOwnProfile ? (
                                            <textarea 
                                                className={styles.bioInput}
                                                value={editData.bio}
                                                onChange={e => setEditData({ ...editData, bio: e.target.value })}
                                                placeholder="Tell the world about your soul..."
                                                rows={3}
                                            />
                                        ) : (
                                            <p className={styles.bioText}>{profile.bio}</p>
                                        )}
                                    </div>
                                )}

                                {!isEditing && (
                                    <div className={styles.actions}>
                                        {!isOwnProfile ? (
                                            <>
                                                {(!profile.relationship || profile.relationship === 'NONE') ? (
                                                    <button 
                                                        className={`${styles.actionBtn} ${styles.primaryBtn}`}
                                                        onClick={handleAddFriend}
                                                        disabled={socialActionLoading}
                                                    >
                                                        {socialActionLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                                        Add Friend
                                                    </button>
                                                ) : profile.relationship === 'FRIEND' ? (
                                                    <button 
                                                        className={`${styles.actionBtn} ${styles.primaryBtn}`}
                                                        onClick={handleSendMessage}
                                                    >
                                                        <MessageSquare size={18} /> Send Message
                                                    </button>
                                                ) : profile.relationship === 'SENT' ? (
                                                    <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} disabled>
                                                        <UserPlus size={18} /> Request Sent
                                                    </button>
                                                ) : profile.relationship === 'RECEIVED' ? (
                                                    <button 
                                                        className={`${styles.actionBtn} ${styles.primaryBtn}`}
                                                        onClick={handleAcceptRequest}
                                                        disabled={socialActionLoading}
                                                    >
                                                        {socialActionLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                                        Accept Request
                                                    </button>
                                                ) : null}

                                                {/* Report Button */}
                                                <button 
                                                    className={`${styles.actionBtn} ${styles.secondaryBtn}`}
                                                    onClick={() => setShowReportModal(true)}
                                                    style={{ border: "1px solid rgba(255, 71, 87, 0.3)", color: "#ff4757" }}
                                                >
                                                    🚩 Report User
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                className={`${styles.actionBtn} ${styles.secondaryBtn}`}
                                                onClick={() => setIsEditing(true)}
                                                style={{ width: '100%' }}
                                            >
                                                <Pencil size={18} /> Edit Soul Signature
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className={styles.rightColumn}>
                                <div className={styles.statsGrid}>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Status</span>
                                        <span className={styles.statValue}>{profile.onlineStatus.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Member Since</span>
                                        <span className={styles.statValue}>
                                            {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                {profile.personalityProfile && (
                                    <div className={styles.personalitySection}>
                                        <div className={styles.bioTitle}>Soul Profile</div>
                                        {Object.entries(profile.personalityProfile)
                                            .filter(([key]) => traitLabels[key])
                                            .map(([key, value]: [string, any]) => (
                                                <div key={key} className={styles.traitItem}>
                                                    <div className={styles.traitHeader}>
                                                        <span className={styles.traitLabel}>{traitLabels[key]}</span>
                                                        <span className={styles.traitValue}>{Math.round(value * 100)}%</span>
                                                    </div>
                                                    <div className={styles.progressBar}>
                                                        <motion.div 
                                                            className={styles.progressFill}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${value * 100}%` }}
                                                            transition={{ duration: 1, delay: 0.2 }}
                                                            style={{ background: getTraitColor(key) }}
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </motion.div>

            {showReportModal && profile && (
                <ReportUserModal
                    targetUserId={profile.id}
                    targetDisplayName={profile.displayName}
                    contextType="PROFILE"
                    onClose={() => setShowReportModal(false)}
                />
            )}
        </div>,
        document.body
    );
}
