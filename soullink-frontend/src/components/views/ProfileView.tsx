"use client";

import React, { useState, useEffect, useRef } from "react";
import { Award, Zap, Users as UsersIcon, Edit3, Save, X, Camera, Loader2, Image as ImageIcon, Search } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { GifPicker } from "../profile/GifPicker";

import styles from "./ProfileView.module.css";

const TRAIT_LABELS: Record<string, string> = {
    openness: "Openness",
    conscientiousness: "Focus",
    extraversion: "Energy",
    agreeableness: "Empathy",
    neuroticism: "Stability",
};

const TRAIT_COLORS: Record<string, string> = {
    openness: "#8b5cf6",
    conscientiousness: "#3b82f6",
    extraversion: "#f59e0b",
    agreeableness: "#10b981",
    neuroticism: "#ef4444",
};

export function ProfileView() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ displayName: "", bio: "" });
    const [uploading, setUploading] = useState(false);
    const [bannerUploading, setBannerUploading] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get("/users/me");
            if (response.data.status === "success") {
                setUser(response.data.data.user);
                setEditData({
                    displayName: response.data.data.user.displayName || "",
                    bio: response.data.data.user.bio || ""
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const response = await api.patch("/users/me", editData);
            if (response.data.status === "success") {
                setUser(response.data.data.user);
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("avatar", file);

        try {
            setUploading(true);
            const response = await api.post("/users/me/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (response.data.status === "success") {
                setUser(response.data.data.user);
            }
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Failed to upload avatar");
        } finally {
            setUploading(false);
        }
    };

    const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("banner", file);

        try {
            setBannerUploading(true);
            const response = await api.post("/users/me/banner", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (response.data.status === "success") {
                setUser(response.data.data.user);
            }
        } catch (error) {
            console.error("Error uploading banner:", error);
            alert("Failed to upload banner");
        } finally {
            setBannerUploading(false);
        }
    };

    const handleGifSelect = async (url: string) => {
        try {
            setBannerUploading(true);
            const response = await api.patch("/users/me", { bannerUrl: url });
            if (response.data.status === "success") {
                setUser(response.data.data.user);
                setShowGifPicker(false);
            }
        } catch (error) {
            console.error("Error setting GIF banner:", error);
            alert("Failed to set GIF banner");
        } finally {
            setBannerUploading(false);
        }
    };

    if (loading && !user) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-brand-purple)" />
            </div>
        );
    }

    if (!user) return <div className={styles.container} style={{ textAlign: 'center' }}>Profile not found</div>;

    const stats = {
        connections: (user._count?.sentFriendships || 0) + (user._count?.receivedFriendships || 0),
        resonanceLevel: user.personalityProfile ? Math.round(((user.personalityProfile.openness + user.personalityProfile.conscientiousness + user.personalityProfile.extraversion + user.personalityProfile.agreeableness + (1 - user.personalityProfile.neuroticism)) / 5) * 100) : 0,
        gamesPlayed: user._count?.gameResponses || 0
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Banner */}
                <div 
                    className={styles.banner}
                    style={{
                        background: user.bannerUrl ? `url(${user.bannerUrl})` : undefined
                    }}
                >
                    <div className={styles.bannerOverlay} />
                    
                    {/* Banner Edit Controls */}
                    <div className={styles.bannerControls}>
                        <button onClick={() => bannerInputRef.current?.click()} className={styles.controlBtn}>
                            {bannerUploading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                            Upload Image
                        </button>
                        <button onClick={() => setShowGifPicker(!showGifPicker)} className={`${styles.controlBtn} ${styles.gifBtn}`}>
                            <Search size={16} /> Use GIF
                        </button>
                        
                        {showGifPicker && (
                            <GifPicker 
                                onSelect={handleGifSelect} 
                                onClose={() => setShowGifPicker(false)} 
                            />
                        )}
                    </div>

                    <div className={styles.avatarWrapper} onClick={handleAvatarClick}>
                        {uploading ? (
                            <div className={styles.avatarImg} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Loader2 className="animate-spin" size={32} />
                            </div>
                        ) : (
                            <>
                                <img
                                    src={user.avatarUrl || "/default-avatar.png"}
                                    className={styles.avatarImg}
                                    alt={user.displayName}
                                />
                                <div className={styles.avatarHover}>
                                    <Camera color="white" size={24} />
                                </div>
                            </>
                        )}
                    </div>
                    
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                    <input type="file" ref={bannerInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleBannerFileChange} />
                </div>

                <div className={styles.content}>
                    <div className={styles.header}>
                        <div className={styles.titleArea}>
                            {isEditing ? (
                                <>
                                    <input
                                        className={styles.nameInput}
                                        value={editData.displayName}
                                        onChange={e => setEditData({ ...editData, displayName: e.target.value })}
                                        placeholder="Display Name"
                                        autoFocus
                                    />
                                    <p className={styles.handle}>@{user.handle}</p>
                                </>
                            ) : (
                                <>
                                    <h1 className={styles.name}>{user.displayName}</h1>
                                    <p className={styles.handle}>@{user.handle}</p>
                                </>
                            )}
                        </div>
                        
                        <div className={styles.actions}>
                            {isEditing ? (
                                <>
                                    <button onClick={handleSave} className={styles.saveBtn}>
                                        <Save size={18} /> Save
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className={styles.cancelBtn}>
                                        <X size={20} />
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                                    <Edit3 size={18} /> Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <textarea
                            className={styles.bioInput}
                            value={editData.bio}
                            onChange={e => setEditData({ ...editData, bio: e.target.value })}
                            placeholder="Tell us about your soul..."
                        />
                    ) : (
                        <p className={styles.bio}>{user.bio || "No bio yet. Tell us about yourself!"}</p>
                    )}

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <UsersIcon size={24} color="#7B68EE" />
                            <div className={styles.statVal}>{stats.connections}</div>
                            <div className={styles.statLabel}>Connections</div>
                        </div>
                        <div className={styles.statCard}>
                            <Zap size={24} color="#FFD700" />
                            <div className={styles.statVal}>{stats.resonanceLevel}%</div>
                            <div className={styles.statLabel}>Resonance</div>
                        </div>
                        <div className={styles.statCard}>
                            <Award size={24} color="#00BFFF" />
                            <div className={styles.statVal}>{stats.gamesPlayed}</div>
                            <div className={styles.statLabel}>Games</div>
                        </div>
                    </div>

                    {user.personalityProfile && (
                        <div className={styles.personalitySection}>
                            <h2 className={styles.personalityTitle}>Soul Profile</h2>
                            <div className={user.personalityProfile.insights?.length ? styles.personalityLayout : ""}>
                                <div className={styles.traitsContainer}>
                                    {Object.entries(user.personalityProfile)
                                        .filter(([key]) => TRAIT_LABELS[key])
                                        .map(([key, value]: [string, any]) => (
                                            <div key={key} className={styles.traitItem}>
                                                <div className={styles.traitHeader}>
                                                    <span className={styles.traitLabel}>{TRAIT_LABELS[key]}</span>
                                                    <span className={styles.traitValue}>{Math.round(value * 100)}%</span>
                                                </div>
                                                <div className={styles.progressBar}>
                                                    <motion.div 
                                                        className={styles.progressFill}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${value * 100}%` }}
                                                        transition={{ duration: 1, delay: 0.2 }}
                                                        style={{ background: TRAIT_COLORS[key] || "#4f46e5" }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>

                                {user.personalityProfile.insights && user.personalityProfile.insights.length > 0 && (
                                    <div className={styles.insightsContainer}>
                                        <h3 className={styles.insightsTitle}>Personality Insights</h3>
                                        {user.personalityProfile.insights.map((insight: string, idx: number) => (
                                            <div key={idx} className={styles.insightCard}>
                                                <p className={styles.insightText}>{insight}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                /* Keep simple global utility if needed, but module handles most now */
            `}</style>
        </div>
    );
}
