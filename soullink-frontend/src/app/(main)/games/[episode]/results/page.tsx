"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

interface PersonalityProfile {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
}

const TRAITS = [
    { key: 'openness', label: 'Openness', color: '#8B5CF6', emoji: '🎨', desc: 'Imagination, creativity, and openness to new experiences' },
    { key: 'conscientiousness', label: 'Conscientiousness', color: '#10B981', emoji: '📋', desc: 'Organization, dependability, and self-discipline' },
    { key: 'extraversion', label: 'Extraversion', color: '#F59E0B', emoji: '🎉', desc: 'Sociability, assertiveness, and positive emotions' },
    { key: 'agreeableness', label: 'Agreeableness', color: '#EC4899', emoji: '🤝', desc: 'Trust, altruism, and cooperation' },
    { key: 'neuroticism', label: 'Emotional Sensitivity', color: '#6366F1', emoji: '🌊', desc: 'Emotional reactivity and vulnerability to stress' },
];

function getLevel(score: number): string {
    if (score > 0.7) return 'High';
    if (score < 0.3) return 'Low';
    return 'Moderate';
}

export default function GameResultsPage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.episode as string;
    const [profile, setProfile] = useState<PersonalityProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/soulgames/personality');
            setProfile(res.data.data.profile);
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a', color: 'white' }}>
                <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a', color: 'white', flexDirection: 'column', gap: '1rem' }}>
                <p>No personality profile found yet.</p>
                <button onClick={() => router.push('/games')} style={{ padding: '0.8rem 2rem', borderRadius: '1rem', background: '#7B68EE', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Play Soul Games
                </button>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0a1a',
            color: 'white',
            padding: '2rem',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Header */}
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button
                    onClick={() => router.push('/games')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer', marginBottom: '2rem', fontSize: '0.9rem'
                    }}
                >
                    <ArrowLeft size={18} /> Back to Soul Games
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', marginBottom: '3rem' }}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✨</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                        Your Soul Profile
                    </h1>
                    <p style={{ opacity: 0.7, fontSize: '1rem' }}>
                        Based on the Big Five personality model
                    </p>
                </motion.div>

                {/* Trait bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {TRAITS.map((trait, i) => {
                        const score = profile[trait.key as keyof PersonalityProfile];
                        const percent = Math.round(score * 100);
                        const level = getLevel(score);

                        return (
                            <motion.div
                                key={trait.key}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.15 }}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '1rem',
                                    padding: '1.5rem',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{trait.emoji}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{trait.label}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{trait.desc}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.3rem', color: trait.color }}>{percent}%</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{level}</div>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div style={{
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.08)',
                                    overflow: 'hidden',
                                }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percent}%` }}
                                        transition={{ duration: 1, delay: i * 0.15 + 0.3, ease: 'easeOut' }}
                                        style={{
                                            height: '100%',
                                            borderRadius: '4px',
                                            background: `linear-gradient(90deg, ${trait.color}88, ${trait.color})`,
                                        }}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Nova insight */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    style={{
                        marginTop: '2.5rem',
                        background: 'rgba(123, 104, 238, 0.1)',
                        border: '1px solid rgba(123, 104, 238, 0.2)',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start',
                    }}
                >
                    <Sparkles size={24} color="#7B68EE" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <div style={{ fontWeight: 700, color: '#7B68EE', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Nova&apos;s Insight
                        </div>
                        <p style={{ opacity: 0.85, lineHeight: 1.7, fontSize: '0.95rem' }}>
                            Your personality profile is taking shape. Each episode you complete adds more depth and accuracy to these scores.
                            Continue your soul journey to unlock deeper insights about yourself and improve your matches!
                        </p>
                    </div>
                </motion.div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }}>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => router.push('/games')}
                        style={{
                            padding: '1rem 2rem', borderRadius: '1rem',
                            background: '#7B68EE', color: 'white', border: 'none',
                            cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        Continue Journey <ChevronRight size={18} />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
