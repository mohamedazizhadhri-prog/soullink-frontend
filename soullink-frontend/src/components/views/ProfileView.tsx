"use client";

import React, { useState, useEffect, useRef } from "react";
import { Award, Zap, Users as UsersIcon, Heart, Edit3, Save, X, Camera, Loader2 } from "lucide-react";
import api from "@/lib/api";

export function ProfileView() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ displayName: "", bio: "" });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (loading && !user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-brand-purple)" />
            </div>
        );
    }

    if (!user) return <div style={{ padding: '40px', textAlign: 'center' }}>Profile not found</div>;

    const stats = {
        connections: (user._count?.sentFriendships || 0) + (user._count?.receivedFriendships || 0),
        resonanceLevel: user.personalityProfile ? Math.round(((user.personalityProfile.openness + user.personalityProfile.conscientiousness + user.personalityProfile.extraversion + user.personalityProfile.agreeableness + (1 - user.personalityProfile.neuroticism)) / 5) * 100) : 0,
        gamesPlayed: user._count?.gameResponses || 0
    };

    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
            {/* Cover Photo Placeholder */}
            <div style={{
                height: '200px', borderRadius: '24px 24px 0 0',
                background: 'linear-gradient(45deg, #2A1B3D, #44318D)',
                position: 'relative'
            }}>
                <div
                    onClick={handleAvatarClick}
                    style={{
                        position: 'absolute', bottom: '-60px', left: '40px',
                        width: '120px', height: '120px', borderRadius: '50%',
                        border: '6px solid var(--color-bg-app)',
                        overflow: 'hidden', cursor: 'pointer',
                        background: 'var(--color-bg-card)'
                    }}
                >
                    {uploading ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : (
                        <>
                            <img
                                src={user.avatarUrl || "/default-avatar.png"}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center',
                                alignItems: 'center', opacity: 0, transition: 'opacity 0.2s'
                            }} className="hover-show">
                                <Camera color="white" size={24} />
                            </div>
                        </>
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>

            <div style={{ padding: '80px 40px 40px', background: 'var(--color-bg-card)', borderRadius: '0 0 24px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input
                                    value={editData.displayName}
                                    onChange={e => setEditData({ ...editData, displayName: e.target.value })}
                                    placeholder="Display Name"
                                    style={{
                                        fontSize: '2rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--color-border)', color: 'white', borderRadius: '8px',
                                        padding: '4px 12px'
                                    }}
                                />
                                <p style={{ margin: '4px 0 16px', color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>@{user.handle}</p>
                            </div>
                        ) : (
                            <>
                                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{user.displayName}</h1>
                                <p style={{ margin: '4px 0 16px', color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>@{user.handle}</p>
                            </>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    style={{
                                        padding: '10px 24px', borderRadius: '12px', background: 'var(--color-brand-purple)',
                                        color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <Save size={18} /> Save
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    style={{
                                        padding: '10px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                                        color: 'white', border: '1px solid var(--color-border)', cursor: 'pointer'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{
                                    padding: '10px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                                    color: 'white', border: '1px solid var(--color-border)', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}
                            >
                                <Edit3 size={18} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <textarea
                        value={editData.bio}
                        onChange={e => setEditData({ ...editData, bio: e.target.value })}
                        placeholder="Tell us about your soul..."
                        style={{
                            width: '100%', maxWidth: '600px', height: '100px', padding: '12px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                            color: 'white', borderRadius: '12px', fontSize: '1.05rem', resize: 'none'
                        }}
                    />
                ) : (
                    <p style={{ maxWidth: '600px', lineHeight: '1.6', fontSize: '1.05rem' }}>{user.bio || "No bio yet. Tell us about yourself!"}</p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: '40px' }}>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                        <UsersIcon size={24} color="#7B68EE" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.connections}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Connections</div>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                        <Zap size={24} color="#FFD700" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.resonanceLevel}%</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Resonance</div>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                        <Award size={24} color="#00BFFF" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.gamesPlayed}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Games</div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .hover-show:hover {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
}
