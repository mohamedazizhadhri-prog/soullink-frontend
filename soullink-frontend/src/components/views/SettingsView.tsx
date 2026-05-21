"use client";

import React, { useEffect, useState } from "react";
import { User, Bell, Shield, Palette, HelpCircle, LogOut, Loader2, Check, Sun, Moon, Sparkles, Type } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useOnboardingOptional } from "@/context/OnboardingContext";
import { useTheme, THEMES, type ThemeMeta } from "@/context/ThemeContext";

const ACCENT_PRESETS = [
    { color: "#7B68EE", label: "Default Purple" },
    { color: "#FF2E97", label: "Hot Pink" },
    { color: "#00BFFF", label: "Cyan" },
    { color: "#FF7B54", label: "Coral" },
    { color: "#00E5A0", label: "Emerald" },
    { color: "#FFD700", label: "Gold" },
    { color: "#DC143C", label: "Crimson" },
    { color: "#9B59B6", label: "Amethyst" },
    { color: "#E91E63", label: "Rose" },
    { color: "#00BCD4", label: "Teal" },
];

function ThemeCard({ theme, isActive, onSelect }: { theme: ThemeMeta; isActive: boolean; onSelect: () => void }) {
    const isLight = theme.category === "light";

    return (
        <button
            onClick={onSelect}
            aria-label={`Select ${theme.name} theme`}
            aria-pressed={isActive}
            id={`theme-card-${theme.id}`}
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 0,
                padding: 0,
                border: isActive ? `2px solid ${theme.preview.accent}` : "2px solid var(--color-border)",
                borderRadius: "16px",
                background: "transparent",
                cursor: "pointer",
                overflow: "hidden",
                transition: "all 0.3s ease",
                transform: isActive ? "scale(1.02)" : "scale(1)",
                boxShadow: isActive ? `0 0 20px ${theme.preview.accent}33, 0 8px 32px rgba(0,0,0,0.3)` : "0 4px 16px rgba(0,0,0,0.15)",
            }}
        >
            {/* Theme Preview */}
            <div style={{
                height: "100px",
                background: theme.preview.bg,
                padding: "12px",
                display: "flex",
                alignItems: "flex-end",
                gap: "8px",
                position: "relative",
            }}>
                {/* Mini sidebar */}
                <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "32px",
                    background: `${theme.preview.card}`,
                    borderRight: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: "10px",
                    gap: "6px",
                }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: theme.preview.accent, opacity: 0.8 }} />
                    <div style={{ width: 14, height: 14, borderRadius: "4px", background: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }} />
                    <div style={{ width: 14, height: 14, borderRadius: "4px", background: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }} />
                </div>
                {/* Mini content area */}
                <div style={{ marginLeft: "40px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                        <div style={{ height: 24, flex: 1, borderRadius: "6px", background: theme.preview.card, border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"}` }} />
                        <div style={{ height: 24, width: 40, borderRadius: "6px", background: theme.preview.accent, opacity: 0.8 }} />
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                        <div style={{ height: 16, flex: 2, borderRadius: "4px", background: theme.preview.card, opacity: 0.6 }} />
                        <div style={{ height: 16, flex: 1, borderRadius: "4px", background: theme.preview.card, opacity: 0.4 }} />
                    </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                    <div style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: theme.preview.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 0 10px ${theme.preview.accent}66`,
                    }}>
                        <Check size={14} color={isLight ? "#fff" : "#000"} strokeWidth={3} />
                    </div>
                )}
            </div>

            {/* Theme Info */}
            <div style={{
                padding: "12px 14px",
                background: theme.preview.card,
                textAlign: "left",
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                }}>
                    <span style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: theme.preview.text,
                    }}>
                        {theme.name}
                    </span>
                    {theme.category === "light" && <Sun size={12} color={theme.preview.accent} />}
                    {theme.category === "special" && <Sparkles size={12} color={theme.preview.accent} />}
                </div>
                <div style={{
                    fontSize: "0.75rem",
                    color: theme.preview.text,
                    opacity: 0.6,
                    lineHeight: 1.3,
                }}>
                    {theme.description}
                </div>
            </div>
        </button>
    );
}

export function SettingsView() {
    const router = useRouter();
    const onboarding = useOnboardingOptional();
    const { themeId, setTheme, accentColor, setAccentColor, fontSize, setFontSize } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("Account");
    const [customAccent, setCustomAccent] = useState(accentColor || "#7B68EE");
// Feedback Form State
const [feedbackCategory, setFeedbackCategory] = useState<"BUG" | "IDEA" | "IMPROVEMENT" | "OTHER">("BUG");
const [feedbackTitle, setFeedbackTitle] = useState("");
const [feedbackContent, setFeedbackContent] = useState("");
const [feedbackLoading, setFeedbackLoading] = useState(false);
const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
// My Feedback (replies) state
const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);
const [myFeedbackLoading, setMyFeedbackLoading] = useState(false);
// End of Feedback State
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

    // Load user's own feedback whenever the Support tab is opened
    useEffect(() => {
        if (activeSection === 'Support') {
            loadMyFeedback();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection]);

    const handleRequestReset = async () => {
        setResetLoading(true);
        setResetMessage(null);
        try {
            await api.post('/auth/forgot-password', { identifier: resetEmail });
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
                identifier: resetEmail,
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
        localStorage.removeItem('sl_token');
        localStorage.removeItem('sl_user');
        router.push('/');
    };
// Submit feedback to backend
const handleSubmitFeedback = async () => {
  setFeedbackLoading(true);
  setFeedbackMessage(null);
  try {
    const response = await api.post('/feedback', {
      category: feedbackCategory,
      title: feedbackTitle,
      content: feedbackContent,
    });
    if (response.data && response.data.status === 'success') {
      setFeedbackMessage({ type: 'success', text: 'Feedback submitted successfully!' });
      // Reset form fields
      setFeedbackCategory('BUG');
      setFeedbackTitle('');
      setFeedbackContent('');
      // Refresh the replies list
      loadMyFeedback();
    } else {
      setFeedbackMessage({ type: 'error', text: response.data?.message || 'Failed to submit feedback' });
    }
  } catch (error: any) {
    setFeedbackMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit feedback' });
  } finally {
    setFeedbackLoading(false);
  }
};

// Load the user's own feedback submissions (with any admin replies)
const loadMyFeedback = async () => {
  setMyFeedbackLoading(true);
  try {
    const response = await api.get('/feedback/my');
    if (response.data?.status === 'success') {
      setMyFeedbacks(response.data.data.feedbacks ?? []);
    }
  } catch (_) {
    // silently fail — not critical
  } finally {
    setMyFeedbackLoading(false);
  }
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
            <div style={{ flex: 1, padding: '0 40px', borderLeft: '1px solid var(--color-border)', overflowY: 'auto' }}>
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

                {/* ═══════════════════════════════════════════════════════════════
                    APPEARANCE SECTION
                    ═══════════════════════════════════════════════════════════════ */}
                {activeSection === "Appearance" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720, paddingBottom: 40 }}>

                        {/* ── Theme Picker ──────────────────────────────────────── */}
                        <div style={{
                            background: 'var(--color-bg-card)',
                            padding: '28px',
                            borderRadius: '16px',
                            border: '1px solid var(--color-border)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <Moon size={18} color="var(--color-brand-purple)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Theme</h3>
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
                                Choose a theme that suits your vibe. Your selection is saved automatically.
                            </p>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '16px',
                            }}>
                                {THEMES.map(t => (
                                    <ThemeCard
                                        key={t.id}
                                        theme={t}
                                        isActive={themeId === t.id}
                                        onSelect={() => setTheme(t.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ── Accent Color ──────────────────────────────────────── */}
                        <div style={{
                            background: 'var(--color-bg-card)',
                            padding: '28px',
                            borderRadius: '16px',
                            border: '1px solid var(--color-border)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <Sparkles size={18} color="var(--color-brand-purple)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Accent Color</h3>
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
                                Override the theme&apos;s primary accent with your own color. Used for buttons, links, and highlights.
                            </p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                                {ACCENT_PRESETS.map(p => (
                                    <button
                                        key={p.color}
                                        onClick={() => {
                                            setAccentColor(p.color);
                                            setCustomAccent(p.color);
                                        }}
                                        aria-label={`Set accent to ${p.label}`}
                                        title={p.label}
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '50%',
                                            background: p.color,
                                            border: (accentColor === p.color)
                                                ? '3px solid var(--color-text-primary)'
                                                : '3px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: (accentColor === p.color)
                                                ? `0 0 12px ${p.color}66`
                                                : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {accentColor === p.color && <Check size={16} color="#fff" strokeWidth={3} />}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Custom:</label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '10px',
                                    padding: '6px 12px',
                                    border: '1px solid var(--color-border)',
                                }}>
                                    <input
                                        type="color"
                                        value={customAccent}
                                        onChange={(e) => {
                                            setCustomAccent(e.target.value);
                                            setAccentColor(e.target.value);
                                        }}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            background: 'transparent',
                                            padding: 0,
                                        }}
                                    />
                                    <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                                        {customAccent}
                                    </span>
                                </div>
                                {accentColor && (
                                    <button
                                        onClick={() => {
                                            setAccentColor("");
                                            setCustomAccent("#7B68EE");
                                        }}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                        }}
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Font Size ─────────────────────────────────────────── */}
                        <div style={{
                            background: 'var(--color-bg-card)',
                            padding: '28px',
                            borderRadius: '16px',
                            border: '1px solid var(--color-border)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <Type size={18} color="var(--color-brand-purple)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Font Size</h3>
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
                                Adjust the base text size across the entire application.
                            </p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                {(["small", "medium", "large"] as const).map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setFontSize(size)}
                                        id={`font-size-${size}`}
                                        style={{
                                            flex: 1,
                                            padding: '14px 20px',
                                            borderRadius: '12px',
                                            background: fontSize === size
                                                ? 'rgba(123, 104, 238, 0.15)'
                                                : 'rgba(255,255,255,0.03)',
                                            border: fontSize === size
                                                ? '2px solid var(--color-brand-purple)'
                                                : '2px solid var(--color-border)',
                                            color: fontSize === size
                                                ? 'var(--color-brand-purple)'
                                                : 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <span style={{
                                            fontSize: size === "small" ? "0.85rem" : size === "medium" ? "1rem" : "1.15rem",
                                            fontWeight: 700,
                                        }}>
                                            Aa
                                        </span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            textTransform: 'capitalize',
                                            fontWeight: 500,
                                        }}>
                                            {size}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Preview ──────────────────────────────────────────── */}
                        <div style={{
                            background: 'var(--color-bg-card)',
                            padding: '28px',
                            borderRadius: '16px',
                            border: '1px solid var(--color-border)',
                        }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700 }}>Live Preview</h3>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                                padding: '20px',
                                borderRadius: '12px',
                                background: 'var(--color-bg-app)',
                                border: '1px solid var(--color-border)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: 'var(--gradient-ai)',
                                    }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Nova AI</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Your digital companion</div>
                                    </div>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                                    Hey there! 👋 This is how text and UI elements will look with your current theme settings.
                                    Everything updates in real time.
                                </p>
                                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                    <button style={{
                                        padding: '8px 18px',
                                        borderRadius: '8px',
                                        background: 'var(--color-brand-purple)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                    }}>
                                        Primary Button
                                    </button>
                                    <button style={{
                                        padding: '8px 18px',
                                        borderRadius: '8px',
                                        background: 'transparent',
                                        color: 'var(--color-brand-purple)',
                                        border: '1px solid var(--color-brand-purple)',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                    }}>
                                        Secondary
                                    </button>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginLeft: 'auto',
                                    }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-status-online)' }} />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Online</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === "Privacy & Safety" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        <div style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: 32 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Shield size={18} color="var(--color-brand-purple)" />
                                Moderation & Safety
                            </h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                                View the status of users and content you have reported to our moderation team.
                            </p>
                            <button
                                onClick={() => router.push('/my-reports')}
                                style={{
                                    padding: '12px 24px', borderRadius: '8px', background: 'rgba(123, 104, 238, 0.1)',
                                    color: 'var(--color-brand-purple)', border: '1px solid var(--color-brand-purple)', cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                View My Reports
                            </button>
                        </div>

                        <div style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Password & Security</h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                                Change your password to keep your soul safe. We&apos;ll send a verification code to your email.
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

                {activeSection === "Support" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}>
                        <div style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>Nova guided tour</h3>
                            <p style={{ margin: '0 0 16px', color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
                                Replay the first-run walkthrough (Soul Games field trip, mute bit, montage). You&apos;ll land on Match so the wax-museum props line up.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    onboarding?.replayTour();
                                    router.push('/match');
                                }}
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: '10px',
                                    background: 'var(--color-brand-purple)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                Replay Nova tour
                            </button>
                        </div>
                        <div style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>Submit Feedback</h3>
                            <p style={{ margin: '0 0 16px', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                                Let us know about bugs, ideas, or any improvements.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <select
                                    value={feedbackCategory}
                                    onChange={e => setFeedbackCategory(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                                >
                                    <option value="BUG">Bug</option>
                                    <option value="IDEA">Idea</option>
                                    <option value="IMPROVEMENT">Improvement</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={feedbackTitle}
                                    onChange={e => setFeedbackTitle(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                                />
                                <textarea
                                    placeholder="Your feedback..."
                                    value={feedbackContent}
                                    onChange={e => setFeedbackContent(e.target.value)}
                                    rows={5}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                                />
                                <button
                                    onClick={handleSubmitFeedback}
                                    disabled={feedbackLoading}
                                    style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-brand-purple)', color: 'white', border: 'none', cursor: feedbackLoading ? 'not-allowed' : 'pointer' }}
                                >
                                    {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                                {feedbackMessage && (
                                    <div style={{ marginTop: '8px', color: feedbackMessage.type === 'success' ? '#4caf50' : '#ff4757' }}>
                                        {feedbackMessage.text}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── My Submissions & Replies ─────────────────────────── */}
                        <div style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>My Submissions</h3>
                                <button
                                    onClick={loadMyFeedback}
                                    disabled={myFeedbackLoading}
                                    style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(123,104,238,0.15)', border: '1px solid rgba(123,104,238,0.3)', color: 'var(--color-brand-purple)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    {myFeedbackLoading ? '↻ Loading…' : '↻ Refresh'}
                                </button>
                            </div>

                            {myFeedbackLoading && myFeedbacks.length === 0 ? (
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Loading…</p>
                            ) : myFeedbacks.length === 0 ? (
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>No submissions yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {myFeedbacks.map((fb: any) => {
                                        const statusColor: Record<string, string> = {
                                            PENDING:  '#FFD700',
                                            REPLIED:  '#4caf50',
                                            CLOSED:   '#909090',
                                        };
                                        const catIcon: Record<string, string> = {
                                            BUG: '🐛', IDEA: '💡', IMPROVEMENT: '⚡', OTHER: '💬',
                                        };
                                        return (
                                            <div
                                                key={fb.id}
                                                style={{
                                                    padding: '16px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: fb.reply
                                                        ? '1px solid rgba(76,175,80,0.3)'
                                                        : '1px solid var(--color-border)',
                                                }}
                                            >
                                                {/* Top row */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.85rem' }}>{catIcon[fb.category] ?? '💬'}</span>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{fb.category}</span>
                                                    <span style={{
                                                        marginLeft: 'auto',
                                                        padding: '2px 8px',
                                                        borderRadius: '999px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 800,
                                                        letterSpacing: '0.06em',
                                                        background: (statusColor[fb.status] ?? '#909090') + '22',
                                                        color: statusColor[fb.status] ?? '#909090',
                                                    }}>
                                                        {fb.status}
                                                    </span>
                                                </div>

                                                {/* Title + content */}
                                                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{fb.title}</p>
                                                <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{fb.content}</p>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', opacity: 0.6 }}>
                                                    {new Date(fb.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>

                                                {/* Admin reply */}
                                                {fb.reply && (
                                                    <div style={{
                                                        marginTop: '12px',
                                                        padding: '12px 14px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(76,175,80,0.08)',
                                                        border: '1px solid rgba(76,175,80,0.25)',
                                                    }}>
                                                        <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 700, color: '#4caf50', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                            ✉️ Reply from the team
                                                        </p>
                                                        <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                                            {fb.reply}
                                                        </p>
                                                        {fb.repliedAt && (
                                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', opacity: 0.6 }}>
                                                                {new Date(fb.repliedAt).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSection !== "Account" && activeSection !== "Privacy & Safety" && activeSection !== "Support" && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-text-secondary)' }}>
                        <Shield size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>{activeSection} settings coming soon...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
