"use client";

import React from "react";
import { User, Bell, Shield, Palette, HelpCircle, LogOut } from "lucide-react";

export function SettingsView() {
    const sections = [
        { icon: <User size={20} />, label: "Account", active: true },
        { icon: <Palette size={20} />, label: "Appearance" },
        { icon: <Bell size={20} />, label: "Notifications" },
        { icon: <Shield size={20} />, label: "Privacy & Safety" },
        { icon: <HelpCircle size={20} />, label: "Support" },
    ];

    return (
        <div style={{ display: 'flex', height: '100%', padding: '24px', gap: '24px' }}>
            {/* Settings Nav */}
            <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h2 style={{ padding: '0 12px 12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>User Settings</h2>
                {sections.map(s => (
                    <div key={s.label} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: '8px',
                        background: s.active ? 'rgba(123, 104, 238, 0.1)' : 'transparent',
                        color: s.active ? 'var(--color-brand-purple)' : 'var(--color-text-secondary)',
                        cursor: 'pointer', fontWeight: 500
                    }}>
                        {s.icon} {s.label}
                    </div>
                ))}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', color: '#ff4757', cursor: 'pointer' }}>
                    <LogOut size={20} /> Logout
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: '0 40px', borderLeft: '1px solid var(--color-border)' }}>
                <h1 style={{ marginBottom: '32px', fontSize: '1.5rem', fontWeight: 700 }}>My Account</h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <div style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: '24px' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700, #FF8C00)' }}></div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Aziz</h2>
                                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>aziz_soul#0001</p>
                            </div>
                            <button style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--color-brand-purple)', color: 'white', border: 'none', cursor: 'pointer' }}>Edit Profile</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email</div>
                                <div>aziz@soullink.ai</div>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Phone</div>
                                <div>********42</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
