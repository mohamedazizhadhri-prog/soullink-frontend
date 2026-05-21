"use client";

import React, { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { Eclipse, LogIn, Fingerprint } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import styles from "@/components/auth/Auth.module.css";
import dynamic from "next/dynamic";
import { AuthNovaBubble } from '@/components/auth/AuthNovaBubble';
import { NovaLoginTransition } from '@/components/auth/NovaLoginTransition';

const FaceRecognition = dynamic(
    () => import("@/components/auth/FaceRecognition").then(mod => mod.FaceRecognition),
    {
        ssr: false,
        loading: () => (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-purple-600 rounded-full" role="status">
                    <span className="sr-only">Loading Facial Identity System...</span>
                </div>
                <p style={{ marginTop: '1rem' }}>Initializing Bio-Metric Sensors...</p>
            </div>
        )
    }
);

// ─────────────────────────────────────────────────────────────────
// LOGIN FORM  (pure presenter, delegates navigation to parent)
// ─────────────────────────────────────────────────────────────────

type FormState = 'idle' | 'emailFocus' | 'emailTyping' | 'emailFilled' | 'passwordFocus' | 'passwordTyping' | 'buttonHover' | 'loading' | 'error' | 'success';

interface LoginFormProps {
    novaMessage: string | null;
    setNovaMessage: (msg: string | null) => void;
    isScanning: boolean;
    setIsScanning: (val: boolean) => void;
    isError: boolean;
    setIsError: (val: boolean) => void;
    isSuccess: boolean;
    setIsSuccess: (val: boolean) => void;
    loginButtonRef: React.RefObject<HTMLButtonElement | null>;
    onLoginSuccess: (role: string) => void;
    onFormStateChange: (state: FormState) => void;
}

function LoginForm({
    novaMessage,
    setNovaMessage,
    isScanning,
    setIsScanning,
    isError,
    setIsError,
    isSuccess,
    setIsSuccess,
    loginButtonRef,
    onLoginSuccess,
    onFormStateChange,
}: LoginFormProps) {

    // ── Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §2 ──
    // Determines the post-login redirect destination based on the user's role.
    const getRoleRedirectPath = (role: string): string => {
        if (role === 'ADMIN')     return '/admin';
        if (role === 'MODERATOR') return '/moderation';
        return '/match';
    };

    // Sets persistent role cookies so Next.js edge middleware can guard routes
    // without needing to hit the DB on every request.
    const setAuthCookies = (token: string, role: string) => {
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // 7-day window matches refresh token
        const cookieOpts = `expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
        document.cookie = `sl_token=${token}; ${cookieOpts}`;
        document.cookie = `sl_role=${role}; ${cookieOpts}`;
    };
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'login' | 'face' | 'forgot_email' | 'forgot_reset'>('login');
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    const [activeField, setActiveField] = useState<'email' | 'password' | 'code' | 'newPassword' | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setIsError(false);
        onFormStateChange('loading');
        setNovaMessage("Verifying your soul signature...");
        try {
            const response = await api.post("/auth/login", { identifier, password });
            if (response.data.status === "success") {
                const { accessToken, user } = response.data.data;
                localStorage.setItem('sl_token', accessToken);
                localStorage.setItem('sl_user', JSON.stringify(user));

                // Set cookies for Next.js edge middleware route protection
                // Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §2
                setAuthCookies(accessToken, user.role);

                // Check for active bans/suspensions
                let isSuspended = false;
                try {
                    const susRes = await api.get("/users/me/suspension");
                    if (susRes.data?.data) {
                        isSuspended = true;
                    }
                } catch (e) {
                    // Not suspended (returns 404)
                }

                setIsSuccess(true);
                onFormStateChange('success');
                
                if (isSuspended) {
                    setNovaMessage("Hold on... your soul has been restricted.");
                    setTimeout(() => onLoginSuccess("SUSPENDED"), 1500);
                } else {
                    setNovaMessage("I knew it was you! Welcome back. ✨");
                    setTimeout(() => onLoginSuccess(user.role), 600);
                }
            }
        } catch (err: any) {
            setIsError(true);
            onFormStateChange('error');
            setNovaMessage("Hmm... That doesn't seem right. Need help?");
            setTimeout(() => onFormStateChange('idle'), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleFaceLogin = async (descriptor: number[]) => {
        setLoading(true);
        setIsScanning(true);
        setNovaMessage("Let me take a closer look...");
        try {
            const response = await api.post("/auth/login-face", { descriptor });
            if (response.data.status === "success") {
                const { accessToken, user } = response.data.data;
                localStorage.setItem('sl_token', accessToken);
                localStorage.setItem('sl_user', JSON.stringify(user));

                // Set cookies for Next.js edge middleware route protection
                // Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §2
                setAuthCookies(accessToken, user.role);

                // Check for active bans/suspensions
                let isSuspended = false;
                try {
                    const susRes = await api.get("/users/me/suspension");
                    if (susRes.data?.data) {
                        isSuspended = true;
                    }
                } catch (e) {
                    // Not suspended (returns 404)
                }

                setIsScanning(false);
                setIsSuccess(true);
                
                if (isSuspended) {
                    setNovaMessage("Wait... your soul has been restricted.");
                    setTimeout(() => onLoginSuccess("SUSPENDED"), 1500);
                } else {
                    setNovaMessage("Identity confirmed! Good to see you.");
                    setTimeout(() => onLoginSuccess(user.role), 600);
                }
            }
        } catch (err: any) {
            setIsScanning(false);
            setIsError(true);
            setNovaMessage("I don't recognize this face... Are you sure it's you?");
            setTimeout(() => setViewMode('login'), 2000);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setIsError(false);
        onFormStateChange('loading');
        setNovaMessage("Sending recovery signal...");
        try {
            const response = await api.post("/auth/forgot-password", { identifier });
            if (response.data.status === "success" || response.data.message) {
                setViewMode('forgot_reset');
                setNovaMessage("Signal intercepted. Check your messages for the code!");
                onFormStateChange('success');
                setTimeout(() => onFormStateChange('idle'), 2000);
            }
        } catch (err: any) {
            setIsError(true);
            onFormStateChange('error');
            setNovaMessage(err.response?.data?.message || "Couldn't send the code. Make sure the identity is correct.");
            setTimeout(() => onFormStateChange('idle'), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setIsError(false);
        onFormStateChange('loading');
        setNovaMessage("Rebuilding your soul key...");
        try {
            const response = await api.post("/auth/reset-password", { 
                identifier, 
                code: resetCode, 
                newPassword 
            });
            if (response.data.status === "success" || response.data.message) {
                setViewMode('login');
                setPassword(newPassword); // auto-fill so they can just hit login
                setNovaMessage("Key forged! You can login now. ✨");
                onFormStateChange('success');
                setTimeout(() => onFormStateChange('idle'), 3000);
            }
        } catch (err: any) {
            setIsError(true);
            onFormStateChange('error');
            setNovaMessage(err.response?.data?.message || "The code might be wrong or expired.");
            setTimeout(() => onFormStateChange('idle'), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.authCard}
        >
            <div className={styles.header}>
                <Eclipse className={styles.logo} size={48} />
                <h1 className={styles.title}>
                    {viewMode === 'forgot_email' ? "Recover Soul" : 
                     viewMode === 'forgot_reset' ? "Forging Key" : "Soul Login"}
                </h1>
            </div>

            {viewMode === 'login' && (
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email or Phone</label>
                        <input
                            className={`${styles.input} ${activeField === 'email' ? styles.inputActive : ''}`}
                            placeholder="Email, @handle or phone"
                            required
                            value={identifier}
                            onFocus={() => {
                                setIsError(false);
                                setActiveField('email');
                                onFormStateChange('emailFocus');
                                setNovaMessage("I think I remember this one...");
                            }}
                            onBlur={() => {
                                setActiveField(null);
                                onFormStateChange(identifier ? 'emailFilled' : 'idle');
                                if (identifier) setNovaMessage("Got it. Now the secret code...");
                            }}
                            onChange={(e) => {
                                setIdentifier(e.target.value);
                                onFormStateChange(e.target.value ? 'emailTyping' : 'emailFocus');
                                if (e.target.value.includes('@')) setNovaMessage(`@${e.target.value.split('@')[1] || '...'} ... I know them!`);
                            }}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Password</label>
                        <input
                            type="password"
                            className={`${styles.input} ${activeField === 'password' ? styles.inputActive : ''}`}
                            placeholder="••••••••"
                            required
                            value={password}
                            onFocus={() => {
                                setIsError(false);
                                setActiveField('password');
                                onFormStateChange('passwordFocus');
                                setNovaMessage("I'll look away... promise. 🙈");
                            }}
                            onBlur={() => {
                                setActiveField(null);
                                onFormStateChange(password ? 'emailFilled' : 'idle');
                            }}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                onFormStateChange('passwordTyping');
                                if (e.target.value.length === 1) setNovaMessage("Okay I'm not looking...");
                                if (e.target.value.length >= 8) setNovaMessage("That's a strong one! ✨");
                            }}
                        />
                         <div style={{ textAlign: "right", marginTop: "0.25rem" }}>
                             <button
                                 type="button"
                                 onClick={() => {
                                     setViewMode('forgot_email');
                                     setNovaMessage("Forgotten key? No worries, I can help you find it. What's your email?");
                                 }}
                                 style={{ 
                                     background: 'none', 
                                     border: 'none', 
                                     color: 'rgba(255,255,255,0.6)', 
                                     fontSize: '0.8rem',
                                     cursor: 'pointer',
                                     padding: 0
                                 }}
                             >
                                 Forgot password?
                             </button>
                         </div>
                    </div>

                    <motion.button
                        ref={loginButtonRef}
                        type="submit"
                        className={styles.button}
                        disabled={loading}
                        onHoverStart={() => {
                            setIsButtonHovered(true);
                            onFormStateChange('buttonHover');
                            if (!loading) setNovaMessage("Ready? Let's go! 🚀");
                        }}
                        onHoverEnd={() => {
                            setIsButtonHovered(false);
                            onFormStateChange(password ? 'emailFilled' : identifier ? 'emailFilled' : 'idle');
                        }}
                        animate={isButtonHovered ? {
                            boxShadow: '0 0 30px 8px rgba(251, 191, 36, 0.4), 0 0 60px 15px rgba(251, 191, 36, 0.2)',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            scale: 1.02,
                        } : {
                            boxShadow: '0 0 0px 0px transparent',
                            background: 'linear-gradient(135deg, #9d50bb 0%, #6e48aa 100%)',
                            scale: 1,
                        }}
                        transition={{ duration: 0.3 }}
                        style={{ isolation: 'isolate' }}
                    >
                        {loading ? "Verifying..." : "Login"} <LogIn size={18} />
                    </motion.button>

                    <div className={styles.divider}>or</div>

                    <button
                        type="button"
                        className={styles.button}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => {
                            setViewMode('face');
                            setNovaMessage("Show me that beautiful face.");
                            setIsError(false);
                        }}
                    >
                        <Fingerprint size={20} /> Login with Face ID
                    </button>
                </form>
            )}

            {viewMode === 'face' && (
                <div className={styles.form}>
                    <FaceRecognition
                        mode="verify"
                        onComplete={handleFaceLogin}
                    />

                    <button
                        className={styles.button}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => {
                            setViewMode('login');
                            setNovaMessage("Back to classic login!");
                        }}
                    >
                        Cancel Face ID
                    </button>
                </div>
            )}

            {viewMode === 'forgot_email' && (
                <form className={styles.form} onSubmit={handleForgotPassword}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email or Phone</label>
                        <input
                            className={`${styles.input} ${activeField === 'email' ? styles.inputActive : ''}`}
                            placeholder="Enter your identifier"
                            required
                            value={identifier}
                            onFocus={() => {
                                setIsError(false);
                                setActiveField('email');
                                onFormStateChange('emailFocus');
                            }}
                            onBlur={() => {
                                setActiveField(null);
                                onFormStateChange('idle');
                            }}
                            onChange={(e) => setIdentifier(e.target.value)}
                        />
                    </div>
                    
                    <button type="submit" className={styles.button} disabled={loading} style={{ background: 'linear-gradient(135deg, #9d50bb 0%, #6e48aa 100%)' }}>
                        {loading ? "Sending..." : "Send Reset Code"}
                    </button>
                    
                    <button
                        type="button"
                        className={styles.button}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem' }}
                        onClick={() => {
                            setViewMode('login');
                            setNovaMessage("I always remember my keys anyway...");
                        }}
                    >
                        Back to Login
                    </button>
                </form>
            )}

            {viewMode === 'forgot_reset' && (
                <form className={styles.form} onSubmit={handleResetPassword}>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
                        Enter the 6-digit code sent to {identifier}
                    </p>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Reset Code</label>
                        <input
                            className={`${styles.input} ${activeField === 'code' ? styles.inputActive : ''}`}
                            placeholder="123456"
                            maxLength={6}
                            required
                            value={resetCode}
                            onFocus={() => {
                                setIsError(false);
                                setActiveField('code');
                                onFormStateChange('emailFocus');
                            }}
                            onBlur={() => setActiveField(null)}
                            onChange={(e) => setResetCode(e.target.value)}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>New Password</label>
                        <input
                            type="password"
                            className={`${styles.input} ${activeField === 'newPassword' ? styles.inputActive : ''}`}
                            placeholder="••••••••"
                            minLength={8}
                            required
                            value={newPassword}
                            onFocus={() => {
                                setIsError(false);
                                setActiveField('newPassword');
                                onFormStateChange('passwordFocus');
                                setNovaMessage("Make it a strong one this time! 🛡️");
                            }}
                            onBlur={() => setActiveField(null)}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    
                    <button type="submit" className={styles.button} disabled={loading} style={{ background: 'linear-gradient(135deg, #9d50bb 0%, #6e48aa 100%)' }}>
                        {loading ? "Resetting..." : "Set New Password"}
                    </button>
                    
                    <button
                        type="button"
                        className={styles.button}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem' }}
                        onClick={() => {
                            setViewMode('login');
                            setNovaMessage("I always remember my keys anyway...");
                        }}
                    >
                        Cancel
                    </button>
                </form>
            )}

            <div className={styles.footer}>
                Need a Soul? <Link href="/signup" className={styles.link}>Signup</Link>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────
// LOGIN CONTENT  (orchestrates the cinematic animation)
// ─────────────────────────────────────────────────────────────────

type AnimPhase = 'idle' | 'cinematic';

function LoginContent() {
    const router = useRouter();
    const [novaMessage, setNovaMessage] = useState<string | null>("Welcome back to the connection.");
    const [isScanning, setIsScanning] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formState, setFormState] = useState<FormState>('idle');

    const [animPhase, setAnimPhase] = useState<AnimPhase>('idle');
    const [novaGravity, setNovaGravity] = useState({ x: 0, y: 0 });
    const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });
    const loginButtonRef = useRef<HTMLButtonElement>(null);
    const novaPaneRef = useRef<HTMLDivElement>(null);

    // Initial message based on searchParams
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('registered')) {
            setNovaMessage("Yay you're here! Let's get you logged in.");
        }
    }, []);

    // ─── Gravitational Pull ───
    useEffect(() => {
        if (animPhase !== 'idle') return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!loginButtonRef.current || !novaPaneRef.current) return;
            const btn = loginButtonRef.current.getBoundingClientRect();
            const nova = novaPaneRef.current.getBoundingClientRect();
            const btnCenterX = btn.left + btn.width / 2;
            const btnCenterY = btn.top + btn.height / 2;
            const novaCenterX = nova.left + nova.width / 2;
            const novaCenterY = nova.top + nova.height / 2;
            const distToBtn = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);
            const strength = Math.pow(Math.max(0, 1 - distToBtn / 280), 2);
            if (strength > 0.01) {
                const dx = btnCenterX - novaCenterX, dy = btnCenterY - novaCenterY;
                const len = Math.hypot(dx, dy) || 1;
                setNovaGravity({ x: (dx / len) * strength * 45, y: (dy / len) * strength * 45 });
            } else setNovaGravity({ x: 0, y: 0 });
        };
        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [animPhase]);

    // ── Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §2 ──
    // Role-based destination: ADMIN → /admin | MODERATOR → /moderation | USER → /match | SUSPENDED → /suspended
    const [redirectPath, setRedirectPath] = useState('/match');

    const handleLoginSuccess = useCallback((role: string) => {
        let dest = '/match';
        if (role === 'SUSPENDED') dest = '/suspended';
        else if (role === 'ADMIN') dest = '/admin';
        else if (role === 'MODERATOR') dest = '/moderation';
        
        setRedirectPath(dest);
        if (loginButtonRef.current) {
            const rect = loginButtonRef.current.getBoundingClientRect();
            setButtonPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
        setAnimPhase('cinematic');
    }, []);

    const gravityMagnitude = Math.hypot(novaGravity.x, novaGravity.y);
    const gravityStrengthNorm = Math.min(1, gravityMagnitude / 45);

    return (
        <div className={styles.container}>
            <div className={styles.authWrapper}>
                <motion.div
                    ref={novaPaneRef}
                    className={styles.novaPane}
                    animate={animPhase === 'cinematic' ? {
                        scale: [1, 1.2, 1, 1.3, 1, 1.4, 0],
                        opacity: [1, 0.9, 1, 0.8, 1, 0.7, 0],
                        filter: ['brightness(100%)', 'brightness(150%)', 'brightness(100%)', 'brightness(200%)', 'brightness(100%)', 'brightness(300%)', 'brightness(600%)'],
                    } : {
                        x: novaGravity.x,
                        y: novaGravity.y,
                        scale: 1,
                        skewX: gravityStrengthNorm * 3,
                    }}
                    style={{
                        filter: gravityStrengthNorm > 0.05
                            ? `drop-shadow(0 0 ${20 + gravityStrengthNorm * 50}px rgba(251, 191, 36, ${0.2 + gravityStrengthNorm * 0.5}))`
                            : 'none',
                        transformOrigin: 'center center',
                    }}
                    transition={animPhase === 'cinematic' ? {
                        duration: 0.55, // Matches the start of shards in NovaLoginTransition
                        times: [0, 0.15, 0.3, 0.4, 0.5, 0.54, 0.55],
                        ease: "easeInOut"
                    } : {
                        type: 'spring', stiffness: 55, damping: 16, mass: 0.8,
                    }}
                >
                    <AuthNovaBubble
                        message={novaMessage}
                        isScanning={isScanning}
                        isSuccess={isSuccess}
                        isError={isError}
                        size={400}
                        disableCuriousMode={true}
                        formState={formState}
                    />
                </motion.div>

                <Suspense fallback={<div>Loading...</div>}>
                    <LoginForm
                        novaMessage={novaMessage}
                        setNovaMessage={setNovaMessage}
                        isScanning={isScanning}
                        setIsScanning={setIsScanning}
                        isError={isError}
                        setIsError={setIsError}
                        isSuccess={isSuccess}
                        setIsSuccess={setIsSuccess}
                        loginButtonRef={loginButtonRef}
                        onLoginSuccess={handleLoginSuccess}
                        onFormStateChange={setFormState}
                    />
                </Suspense>
            </div>

            <AnimatePresence>
                {animPhase === 'cinematic' && (
                    <NovaLoginTransition
                        key="transition"
                        originX={buttonPos.x}
                        originY={buttonPos.y}
                        onComplete={() => router.push(redirectPath)}
                    />
                )}
            </AnimatePresence>

            <div style={{
                position: 'absolute', top: '10%', left: '10%', width: 600, height: 600,
                background: `rgba(${animPhase === 'idle' ? `0, 123, 255, ${0.08 + gravityStrengthNorm * 0.05}` : '251, 191, 36, 0.15'})`,
                filter: 'blur(120px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
                transition: 'background 0.5s ease',
            }} />
            <div style={{
                position: 'absolute', bottom: '10%', right: '10%',
                width: 500, height: 500,
                background: 'rgba(157, 80, 187, 0.12)',
                filter: 'blur(120px)', borderRadius: '50%',
                pointerEvents: 'none', zIndex: 1,
            }} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a' }}>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
