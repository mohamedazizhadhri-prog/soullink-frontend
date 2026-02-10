"use client";

import React from "react";
import { USER_PROFILE } from "@/constants/userProfile";
import { Award, Zap, Users as UsersIcon, Heart } from "lucide-react";

export function ProfileView() {
    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
            {/* Cover Photo Placeholder */}
            <div style={{
                height: '200px', borderRadius: '24px 24px 0 0',
                background: 'linear-gradient(45deg, #2A1B3D, #44318D)',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute', bottom: '-60px', left: '40px',
                    width: '120px', height: '120px', borderRadius: '50%',
                    border: '6px solid var(--color-bg-app)',
                    overflow: 'hidden'
                }}>
                    <img src={USER_PROFILE.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            </div>

            <div style={{ padding: '80px 40px 40px', background: 'var(--color-bg-card)', borderRadius: '0 0 24px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{USER_PROFILE.name}</h1>
                        <p style={{ margin: '4px 0 16px', color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>@{USER_PROFILE.handle}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button style={{ padding: '10px 24px', borderRadius: '12px', background: 'var(--color-brand-purple)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Connect Soul</button>
                        <button style={{ padding: '10px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--color-border)', cursor: 'pointer' }}><Heart size={20} /></button>
                    </div>
                </div>

                <p style={{ maxWidth: '600px', lineHeight: '1.6', fontSize: '1.05rem' }}>{USER_PROFILE.bio}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: '40px' }}>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                        <UsersIcon size={24} color="#7B68EE" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{USER_PROFILE.stats.connections}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Connections</div>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                        <Zap size={24} color="#FFD700" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{USER_PROFILE.stats.resonanceLevel}%</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Resonance</div>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                        <Award size={24} color="#00BFFF" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{USER_PROFILE.stats.gamesPlayed}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Games</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
