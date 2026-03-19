"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NovaLoginTransitionProps {
    originX: number;
    originY: number;
    onComplete?: () => void;
}

export function NovaLoginTransition({
    originX,
    originY,
    onComplete,
}: NovaLoginTransitionProps) {
    const [phase, setPhase] = useState<'charge' | 'snap' | 'shards' | 'portal'>('charge');

    useEffect(() => {
        // Timeline orchestration
        const timer1 = setTimeout(() => setPhase('snap'), 450);   // After 3 rapid pulses
        const timer2 = setTimeout(() => setPhase('shards'), 550); // Snap is fast
        const timer3 = setTimeout(() => setPhase('portal'), 850); // Shards fly out

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, []);

    // Particles for the shard burst
    const shards = useMemo(() =>
        Array.from({ length: 32 }, (_, i) => {
            const angle = (i / 32) * Math.PI * 2;
            const velocity = 15 + Math.random() * 25;
            return {
                id: i,
                angle,
                velocity,
                size: 2 + Math.random() * 4,
                color: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#9d50bb' : '#ffffff',
            };
        }), []
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none', overflow: 'hidden' }}>

            {/* ─── Phase 1: Charge Pulses ─── */}
            <AnimatePresence>
                {phase === 'charge' && (
                    <motion.div
                        style={{
                            position: 'absolute',
                            left: originX,
                            top: originY,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: '#ffffff',
                            boxShadow: '0 0 40px 20px #fbbf24, 0 0 100px 40px #9d50bb',
                            transform: 'translate(-50%, -50%)',
                        }}
                        animate={{
                            scale: [1, 1.5, 1, 1.8, 1, 2.2],
                            opacity: [1, 0.8, 1, 0.6, 1, 0.4],
                        }}
                        transition={{
                            duration: 0.45,
                            ease: "easeInOut",
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ─── Phase 2 & 3: snap & Shard Burst ─── */}
            {(phase === 'snap' || phase === 'shards') && (
                <div style={{ position: 'absolute', left: originX, top: originY }}>
                    {/* The Singularity Dot */}
                    <motion.div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#ffffff',
                            boxShadow: '0 0 40px 20px #ffffff',
                            transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: phase === 'snap' ? [0, 2, 1] : 0 }}
                        transition={{ duration: 0.1 }}
                    />

                    {/* Shockwave Ring */}
                    {phase === 'shards' && (
                        <motion.div
                            style={{
                                position: 'absolute',
                                borderRadius: '50%',
                                border: '2px solid rgba(255,255,255,0.8)',
                                transform: 'translate(-50%, -50%)',
                            }}
                            initial={{ width: 0, height: 0, opacity: 1 }}
                            animate={{ width: 2000, height: 2000, opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                    )}

                    {/* Shards */}
                    {phase === 'shards' && shards.map(shard => (
                        <motion.div
                            key={shard.id}
                            style={{
                                position: 'absolute',
                                width: shard.size,
                                height: shard.size * 6,
                                background: `linear-gradient(to top, transparent, ${shard.color})`,
                                borderRadius: '50%',
                                transformOrigin: 'center bottom',
                            }}
                            initial={{
                                x: 0,
                                y: 0,
                                rotate: (shard.angle * 180) / Math.PI + 90,
                                opacity: 1,
                                scaleY: 1
                            }}
                            animate={{
                                x: Math.cos(shard.angle) * shard.velocity * 30,
                                y: Math.sin(shard.angle) * shard.velocity * 30,
                                opacity: 0,
                                scaleY: 3,
                            }}
                            transition={{
                                duration: 0.5,
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </div>
            )}

            {/* ─── Screen Flare ─── */}
            <AnimatePresence>
                {phase === 'shards' && (
                    <motion.div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: '#ffffff',
                            zIndex: 99998,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </AnimatePresence>

            {/* ─── Phase 4: Portal Clip-Path Reveal ─── */}
            <AnimatePresence>
                {phase === 'portal' && (
                    <motion.div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: '#ffffff',
                            zIndex: 100000,
                            clipPath: `circle(0% at ${originX}px ${originY}px)`,
                        }}
                        animate={{
                            clipPath: `circle(150% at ${originX}px ${originY}px)`,
                        }}
                        transition={{
                            duration: 0.8,
                            ease: [0.4, 0, 0.2, 1], // Standard fast easing
                        }}
                        onAnimationComplete={onComplete}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
