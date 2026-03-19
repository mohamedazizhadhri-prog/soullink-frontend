"use client";

import React, { useState, Suspense, useRef, useCallback, useEffect } from "react";
import { Eclipse, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import styles from "@/components/auth/Auth.module.css";
import dynamic from "next/dynamic";
import { PhoneInput, defaultCountries, parseCountry } from 'react-international-phone';
import 'react-international-phone/style.css';
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
                <p style={{ marginTop: '1rem', color: '#888' }}>Loading Bio-Metric System...</p>
            </div>
        )
    }
);

type AnimPhase = 'idle' | 'cinematic';

function SignupContent() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        phone: "",
        password: "",
        displayName: "",
        handle: "",
        dateOfBirth: "",
        city: "",
        country: "",
    });
    const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(false);

    // Nova Interactive State
    const [novaMessage, setNovaMessage] = useState<string | null>("Welcome! I'm Nova. Let's get you set up.");
    const [isScanning, setIsScanning] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Animation state
    const [animPhase, setAnimPhase] = useState<AnimPhase>('idle');
    const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });
    const verifyButtonRef = useRef<HTMLButtonElement>(null);
    const novaPaneRef = useRef<HTMLDivElement>(null);

    // Country Selector State
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");

    const countries = defaultCountries.map(c => {
        const country = parseCountry(c);
        return {
            name: country.name,
            iso2: country.iso2,
            dialCode: country.dialCode
        };
    });

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 400);
    };

    const [otp, setOtp] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setFormData({ ...formData, [e.target.name]: e.target.value });

        if (e.target.name === 'displayName' && e.target.value.length > 2) {
            setNovaMessage(`Hmm... ${e.target.value}? I like it!`);
        } else if (e.target.name === 'handle' && e.target.value.length > 2) {
            setNovaMessage(`@${e.target.value} is sounding pretty iconic.`);
        }
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (step === 1) {
            setStep(2);
            setNovaMessage("Great. Now, how should we secure your account?");
        } else if (step === 2) {
            if (authMethod === 'email' && !formData.email) {
                setError("Email is required");
                setNovaMessage("Whoops, looks like you forgot your email.");
                triggerShake();
                return;
            }
            if (authMethod === 'phone' && !formData.phone) {
                setError("Phone number is required");
                setNovaMessage("I'll need that number to text you.");
                triggerShake();
                return;
            }
            setStep(3);
            setNovaMessage("Look directly at the camera. Don't blink!");
        }
    };

    const handleFinalSubmit = async (faceDescriptor: number[]) => {
        setIsScanning(true);
        setNovaMessage("Processing your gorgeous face...");
        setLoading(true);
        setError(null);
        try {
            const signupData = {
                ...formData,
                email: authMethod === 'email' ? formData.email : "",
                phone: authMethod === 'phone' ? formData.phone : "",
                faceDescriptor,
            };
            const response = await api.post("/auth/register", signupData);
            if (response.data.status === "success") {
                if (response.data.data.accessToken) {
                    localStorage.setItem('token', response.data.data.accessToken);
                    localStorage.setItem('user', JSON.stringify(response.data.data.user));
                }
                setIsScanning(false);
                setNovaMessage("Perfect! Now let's verify it's really you.");
                setStep(4);
            }
        } catch (err: any) {
            setIsScanning(false);
            triggerShake();
            let msg = err.response?.data?.message || "Registration failed. Please try again.";
            if (err.response?.data?.errors) {
                const detailedErrors = err.response.data.errors.map((e: any) => `${e.path}: ${e.message}`).join(", ");
                msg = `Validation Failed: ${detailedErrors}`;
            }
            setError(msg);
            setNovaMessage("Oh no, something went wrong.");
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const identifier = authMethod === 'email' ? formData.email : formData.phone;
            const endpoint = authMethod === 'email' ? "/auth/verify-email" : "/auth/verify-phone";

            const response = await api.post(endpoint, {
                identifier,
                code: otp,
            });
            if (response.data.status === "success") {
                if (verifyButtonRef.current) {
                    const rect = verifyButtonRef.current.getBoundingClientRect();
                    setButtonPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                }
                setNovaMessage("Welcome to SoulLink. I've been waiting for you.");
                setIsSuccess(true);
                // Trigger cinematic transition
                setTimeout(() => setAnimPhase('cinematic'), 600);
            }
        } catch (err: any) {
            triggerShake();
            setError(err.response?.data?.message || "Verification failed");
            setNovaMessage("That code doesn't look right.");
        } finally {
            setLoading(false);
        }
    };

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
                        scale: 1,
                    }}
                    transition={animPhase === 'cinematic' ? {
                        duration: 0.55,
                        times: [0, 0.15, 0.3, 0.4, 0.5, 0.54, 0.55],
                        ease: "easeInOut"
                    } : {
                        duration: 0.3,
                    }}
                    style={{ transformOrigin: 'center center' }}
                >
                    <AuthNovaBubble
                        message={novaMessage}
                        isScanning={isScanning}
                        isSuccess={isSuccess}
                        size={400}
                        disableCuriousMode={true}
                    />
                </motion.div>


                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`${styles.authCard} ${shake ? styles.shake : ''}`}
                >
                    <div className={styles.header}>
                        <Eclipse className={styles.logo} size={48} />
                        <h1 className={styles.title}>Create Soul</h1>
                        <p className={styles.subtitle}>Begin your authentic connection</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', padding: '0.75rem', borderRadius: 12, fontSize: '0.875rem', textAlign: 'center', border: '1px solid rgba(255,77,77,0.2)' }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.form
                                key="step1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                onSubmit={handleNext}
                                className={styles.form}
                            >
                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="displayName">Display Name</label>
                                    <input
                                        id="displayName"
                                        className={styles.input}
                                        name="displayName"
                                        placeholder="How should neighbors call you?"
                                        required
                                        onChange={handleInputChange}
                                        onFocus={() => setNovaMessage("Ooh, what should I call you?")}
                                        value={formData.displayName}
                                        autoComplete="name"
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="handle">Unique Handle</label>
                                    <input
                                        id="handle"
                                        className={styles.input}
                                        name="handle"
                                        placeholder="@yourname"
                                        required
                                        onChange={handleInputChange}
                                        onFocus={() => setNovaMessage("Now pick your soul tag. Make it iconic.")}
                                        value={formData.handle}
                                        autoComplete="username"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.label} htmlFor="city">City</label>
                                        <input
                                            id="city"
                                            className={styles.input}
                                            name="city"
                                            placeholder="E.g. Tunis"
                                            onChange={handleInputChange}
                                            onFocus={() => setNovaMessage("Where are you joining from? I've always wanted to travel.")}
                                            value={formData.city}
                                        />
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1, position: 'relative' }}>
                                        <label className={styles.label} htmlFor="country">Country</label>
                                        <input
                                            id="country"
                                            className={styles.input}
                                            name="country"
                                            placeholder="Search country..."
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                setCountrySearch(e.target.value);
                                                setShowCountryDropdown(true);
                                            }}
                                            onFocus={() => {
                                                setNovaMessage("Ah, the world is so big!");
                                                setShowCountryDropdown(true);
                                            }}
                                            onBlur={() => {
                                                // Delay to allow clicking an item
                                                setTimeout(() => setShowCountryDropdown(false), 200);
                                            }}
                                            value={formData.country}
                                            autoComplete="off"
                                        />
                                        <AnimatePresence>
                                            {showCountryDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className={styles.searchDropdown}
                                                >
                                                    {filteredCountries.length > 0 ? (
                                                        filteredCountries.map((c) => (
                                                            <div
                                                                key={c.iso2}
                                                                className={styles.searchItem}
                                                                onClick={() => {
                                                                    setFormData({ ...formData, country: c.name });
                                                                    setCountrySearch(c.name);
                                                                    setShowCountryDropdown(false);
                                                                }}
                                                            >
                                                                <span className={styles.flagIcon}>
                                                                    <img
                                                                        src={`https://flagcdn.com/w20/${c.iso2}.png`}
                                                                        width="20"
                                                                        alt={c.name}
                                                                    />
                                                                </span>
                                                                {c.name}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className={styles.noResults}>No countries found</div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="dateOfBirth">Date of Birth</label>
                                    <input
                                        id="dateOfBirth"
                                        type="date"
                                        className={styles.input}
                                        name="dateOfBirth"
                                        required
                                        onChange={handleInputChange}
                                        value={formData.dateOfBirth}
                                    />
                                </div>

                                <button type="submit" className={styles.button}>
                                    Continue <ArrowRight size={18} />
                                </button>
                            </motion.form>
                        )}

                        {step === 2 && (
                            <motion.form
                                key="step2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                onSubmit={handleNext}
                                className={styles.form}
                            >
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMethod('email')}
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: authMethod === 'email' ? 'rgba(157, 80, 187, 0.2)' : 'transparent',
                                            color: authMethod === 'email' ? '#9d50bb' : '#888',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Mail size={16} /> Email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMethod('phone')}
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: authMethod === 'phone' ? 'rgba(157, 80, 187, 0.2)' : 'transparent',
                                            color: authMethod === 'phone' ? '#9d50bb' : '#888',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Phone size={16} /> Phone
                                    </button>
                                </div>

                                {authMethod === 'email' ? (
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label} htmlFor="email">Email Address</label>
                                        <input
                                            id="email"
                                            type="email"
                                            className={styles.input}
                                            name="email"
                                            placeholder="name@example.com"
                                            required={authMethod === 'email'}
                                            onChange={handleInputChange}
                                            value={formData.email}
                                            autoComplete="email"
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label} htmlFor="phone">Phone Number</label>
                                        <PhoneInput
                                            defaultCountry="tn"
                                            value={formData.phone}
                                            onChange={(phone) => setFormData({ ...formData, phone })}
                                            inputClassName={styles.phoneInput}
                                            countrySelectorStyleProps={{
                                                buttonClassName: styles.countryButton,
                                                dropdownStyleProps: {
                                                    className: styles.countryDropdown,
                                                },
                                            }}
                                        />
                                    </div>
                                )}

                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="password">Create Password</label>
                                    <input
                                        id="password"
                                        type="password"
                                        className={styles.input}
                                        name="password"
                                        placeholder="Min. 8 characters"
                                        required
                                        onChange={handleInputChange}
                                        onFocus={() => setNovaMessage("I'm not looking, I promise. 🙈")}
                                        value={formData.password}
                                        autoComplete="new-password"
                                    />
                                </div>

                                <button type="submit" className={styles.button} disabled={loading}>
                                    {loading ? "Preparing..." : "Next: Face Verification"}
                                </button>
                            </motion.form>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={styles.form}
                            >
                                <div className={styles.faceHint}>
                                    <ShieldCheck className={styles.faceHintIcon} size={24} />
                                    <div className={styles.faceHintText}>
                                        <strong>Identity Protection</strong>
                                        <br />We use local facial recognition to ensure every SoulLink connection is authentic.
                                    </div>
                                </div>

                                <FaceRecognition
                                    mode="enroll"
                                    onComplete={handleFinalSubmit}
                                />

                                <button className={styles.button} disabled={loading} onClick={() => setStep(2)}>
                                    Back to Details
                                </button>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.form
                                key="step4"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                onSubmit={handleVerifyOTP}
                                className={styles.form}
                            >
                                <div className={styles.faceHint}>
                                    {authMethod === 'email' ? <Mail className={styles.faceHintIcon} size={24} /> : <Phone className={styles.faceHintIcon} size={24} />}
                                    <div className={styles.faceHintText}>
                                        <strong>Verify Your Identity</strong>
                                        <br />We've sent a 6-digit code to <strong>{authMethod === 'email' ? formData.email : formData.phone}</strong>.
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="otp">Verification Code</label>
                                    <input
                                        id="otp"
                                        className={styles.input}
                                        placeholder="000000"
                                        maxLength={6}
                                        required
                                        onChange={(e) => setOtp(e.target.value)}
                                        value={otp}
                                        style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                                    />
                                </div>

                                <button
                                    ref={verifyButtonRef}
                                    type="submit"
                                    className={styles.button}
                                    disabled={loading}
                                >
                                    {loading ? "Verifying..." : "Verify & Activate"}
                                </button>

                                <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#888' }}>
                                    Didn't get the code? <span style={{ color: '#9d50bb', cursor: 'pointer', fontWeight: 600 }}>Resend</span>
                                </p>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className={styles.footer}>
                        Already have a Soul? <Link href="/login" className={styles.link}>Login</Link>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {animPhase === 'cinematic' && (
                    <NovaLoginTransition
                        key="transition"
                        originX={buttonPos.x}
                        originY={buttonPos.y}
                        onComplete={() => router.push('/login?auth=success')}
                    />
                )}
            </AnimatePresence>

            {/* Decorative blurred circles - positioned for split layout */}
            <div style={{ position: 'absolute', top: '10%', right: '10%', width: 600, height: 600, background: 'rgba(157, 80, 187, 0.12)', filter: 'blur(120px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 1 }} />
            <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 500, height: 500, background: 'rgba(0, 123, 255, 0.08)', filter: 'blur(120px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 1 }} />
        </div>
    );
}
export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className={styles.container}>
                <div style={{ color: '#fff' }}>Loading...</div>
            </div>
        }>
            <SignupContent />
        </Suspense>
    );
}
