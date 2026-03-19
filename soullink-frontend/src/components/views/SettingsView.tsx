"use client";

import React, { useEffect, useState } from "react";
import { User, Bell, Shield, Palette, HelpCircle, LogOut, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export function SettingsView() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("Account");

    // Password Reset State
    const [resetStep, setResetStep] = useState(1); // 1: Request, 2: Verify
    const [resetLoading, setResetLoading] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const sections = [
        { icon: <User size={20} />, label: "Account" },
        { icon: <Palette size={20} />, label: "Appearance" },
        { icon: <Bell size={20} />, label: "Notifications" },
        { icon: <Shield size={20} />, label: "Privacy & Safety" },
        { icon: <HelpCircle size={20} />, label: "Support" },
    ];

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/users/me');
                if (response.data.status === 'success') {
                    setUser(response.data.data.user);
                    setResetEmail(response.data.data.user.email);
                }
            } catch (error) {
                console.error("Failed to fetch user settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const handleRequestReset = async () => {
        setResetLoading(true);
        setResetMessage(null);
        try {
            await api.post('/auth/forgot-password', { email: resetEmail });
            setResetStep(2);
            setResetMessage({ type: 'success', text: 'Reset code sent to your email (and logged in console)!' });
        } catch (error: any) {
            setResetMessage({ type: 'error', text: error.response?.data?.message || 'Failed to send reset code' });
        } finally {
            setResetLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setResetLoading(true);
        setResetMessage(null);
        try {
            await api.post('/auth/reset-password', {
                email: resetEmail,
                code: resetCode,
                newPassword
            });
            setResetMessage({ type: 'success', text: 'Password reset successfully!' });
            setResetStep(1);
            setResetCode("");
            setNewPassword("");
        } catch (error: any) {
            setResetMessage({ type: 'error', text: error.response?.data?.message || 'Failed to reset password' });
        } finally {
            setResetLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-brand-purple)" />
            </div>
        );
    }

    if (!user) return <div style={{ padding: '40px', textAlign: 'center' }}>User not found</div>;

    return (
        <div style={{ display: 'flex', height: '100%', padding: '24px', gap: '24px' }}>
            {/* Settings Nav */}
            <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h2 style={{ padding: '0 12px 12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>User Settings</h2>
                {sections.map(s => (
                    <div
                        key={s.label}
                        onClick={() => setActiveSection(s.label)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: '8px',
                            background: activeSection === s.label ? 'rgba(123, 104, 238, 0.1)' : 'transparent',
                            color: activeSection === s.label ? 'var(--color-brand-purple)' : 'var(--color-text-secondary)',
                            cursor: 'pointer', fontWeight: 500
                        }}
                    >
                        {s.icon} {s.label}
                    </div>
                ))}
                <div
                    onClick={handleLogout}
                    style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', color: '#ff4757', cursor: 'pointer' }}
                >
                    <LogOut size={20} /> Logout
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: '0 40px', borderLeft: '1px solid var(--color-border)' }}>
                <h1 style={{ marginBottom: '32px', fontSize: '1.5rem', fontWeight: 700 }}>{activeSection}</h1>

                {activeSection === "Account" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        <div style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: '24px' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border)' }}>
                                    <img
                                        src={user.avatarUrl || "/default-avatar.png"}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{user.displayName}</h2>
                                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>@{user.handle}</p>
                                </div>
                                <button
                                    onClick={() => router.push('/profile')}
                                    style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--color-brand-purple)', color: 'white', border: 'none', cursor: 'pointer' }}
                                >
                                    Edit Profile
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email</div>
                                    <div style={{ wordBreak: 'break-all' }}>{user.email}</div>
                                </div>
                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Phone</div>
                                    <div>{user.phone || "Not set"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === "Privacy & Safety" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        <div style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Password & Security</h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                                Change your password to keep your soul safe. We'll send a verification code to your email.
                            </p>

                            {resetMessage && (
                                <div style={{
                                    padding: '12px', borderRadius: '8px', marginBottom: '20px',
                                    background: resetMessage.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                                    color: resetMessage.type === 'success' ? '#4caf50' : '#ff4757',
                                    fontSize: '0.9rem', border: `1px solid ${resetMessage.type === 'success' ? '#4caf50' : '#ff4757'}`
                                }}>
                                    {resetMessage.text}
                                </div>
                            )}

                            {resetStep === 1 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>EMAIL ADDRESS</label>
                                        <input
                                            type="email"
                                            value={resetEmail}
                                            disabled
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleRequestReset}
                                        disabled={resetLoading}
                                        style={{
                                            padding: '12px', borderRadius: '8px', background: 'var(--color-brand-purple)',
                                            color: 'white', border: 'none', cursor: resetLoading ? 'not-allowed' : 'pointer',
                                            fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
                                        }}
                                    >
                                        {resetLoading && <Loader2 className="animate-spin" size={18} />}
                                        Request Reset Code
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>VERIFICATION CODE</label>
                                        <input
                                            type="text"
                                            placeholder="Enter 6-digit code"
                                            value={resetCode}
                                            onChange={(e) => setResetCode(e.target.value)}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>NEW PASSWORD</label>
                                        <input
                                            type="password"
                                            placeholder="Min 8 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', color: 'white' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            onClick={() => setResetStep(1)}
                                            style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleResetPassword}
                                            disabled={resetLoading || !resetCode || newPassword.length < 8}
                                            style={{
                                                flex: 2, padding: '12px', borderRadius: '8px', background: 'var(--color-brand-purple)',
                                                color: 'white', border: 'none', cursor: (resetLoading || !resetCode || newPassword.length < 8) ? 'not-allowed' : 'pointer',
                                                fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
                                            }}
                                        >
                                            {resetLoading && <Loader2 className="animate-spin" size={18} />}
                                            Update Password
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSection !== "Account" && activeSection !== "Privacy & Safety" && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-text-secondary)' }}>
                        <Shield size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>{activeSection} settings coming soon...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
