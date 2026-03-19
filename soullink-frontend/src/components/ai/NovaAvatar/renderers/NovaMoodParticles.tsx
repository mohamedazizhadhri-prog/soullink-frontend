import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNovaMoodParticles } from '../hooks/useNovaMoodParticles';
import { NovaMood } from '@/types/nova.types';
import styles from '../../NovaAvatar.module.css';

interface NovaMoodParticlesProps {
    mood: NovaMood;
    isMelting: boolean;
    isSauronMode: boolean;
    ashIntensity: number;
    isSmart: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    gazeTarget?: { x: number; y: number };
}

export function NovaMoodParticles({
    mood,
    isMelting,
    isSauronMode,
    ashIntensity,
    isSmart,
    containerRef,
    gazeTarget
}: NovaMoodParticlesProps) {
    const {
        pixels,
        bubbles,
        loveHearts,
        embers,
        moneyParticles,
        sauronAsh,
        sauronEmbers,
        binaryBits,
        ashParticles
    } = useNovaMoodParticles({ mood, isMelting, isSauronMode, ashIntensity, isSmart });

    return (
        <AnimatePresence>
            {/* Sad Mood Effects */}
            {mood === 'sad' && (
                <>
                    <div className={styles.lightning} />
                    <div className={styles.thunderFlash} />
                    {pixels.map((p) => (
                        <motion.div
                            key={p.id}
                            className={styles.pixel}
                            initial={{ y: -60, x: p.x, opacity: 0 }}
                            animate={{ y: 60, opacity: [0, 1, 1, 0] }}
                            transition={{ duration: 1.2, ease: "linear", delay: p.delay }}
                            style={{ zIndex: Math.random() > 0.5 ? 5 : -1 }}
                        />
                    ))}
                </>
            )}

            {/* Disgusted Mood Effects */}
            {mood === 'disgusted' && (
                <>
                    {bubbles.map((b) => (
                        <motion.div
                            key={b.id}
                            className={styles.disgustedBubble}
                            initial={{ y: 20, x: b.x, opacity: 1, scale: 0.5 }}
                            animate={{
                                y: -60,
                                opacity: [1, 1, 0],
                                scale: [0.5, 1.2, 0],
                            }}
                            transition={{ duration: 2, ease: "easeOut", delay: b.delay }}
                        />
                    ))}
                </>
            )}

            {/* Love Hearts Effects */}
            {mood === 'love' && (
                <>
                    {loveHearts.map((h) => (
                        <motion.div
                            key={h.id}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                x: h.x,
                                y: -20,
                                width: 10 * h.scale,
                                height: 10 * h.scale,
                                backgroundColor: '#ff1493',
                                borderRadius: '50%',
                                zIndex: 30,
                                opacity: 0.8,
                                boxShadow: '0 0 10px #ff1493',
                            }}
                            animate={{
                                y: -100,
                                x: h.x + h.sway,
                                opacity: [0, 0.8, 0],
                                scale: [h.scale, h.scale * 1.5, h.scale]
                            }}
                            transition={{ duration: 2, ease: "easeOut", delay: h.delay }}
                        />
                    ))}
                </>
            )}

            {/* Melting Effects */}
            {isMelting && (
                <>
                    {embers.map((e) => (
                        <motion.div
                            key={e.id}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                bottom: '50%',
                                x: e.x,
                                y: e.y,
                                width: 4 * e.scale,
                                height: 4 * e.scale,
                                background: '#FF8C00',
                                borderRadius: '50%',
                                boxShadow: '0 0 8px #FFD700',
                                opacity: e.opacity,
                                zIndex: 15,
                            }}
                        />
                    ))}
                </>
            )}

            {/* Money Particles (Rich Mode) */}
            {mood === 'rich' && (
                <>
                    {moneyParticles.map((p) => (
                        <motion.div
                            key={p.id}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                x: p.x,
                                y: p.y,
                                width: p.type === 'bill' ? 20 : 10,
                                height: p.type === 'bill' ? 10 : 10,
                                backgroundColor: p.type === 'bill' ? '#22c55e' : '#eab308',
                                borderRadius: p.type === 'coin' ? '50%' : '2px',
                                border: '1px solid rgba(0,0,0,0.1)',
                                zIndex: 30,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8px',
                                color: '#064e40',
                                fontWeight: 'bold',
                                pointerEvents: 'none',
                            }}
                            animate={{ rotate: p.rotation }}
                            transition={{ duration: 0.1, ease: 'linear' }}
                        >
                            {p.type === 'bill' ? '$' : ''}
                        </motion.div>
                    ))}

                    {/* Ticker Tape Ring */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        style={{
                            position: 'absolute',
                            width: '130%',
                            height: '130%',
                            borderRadius: '50%',
                            border: '1px solid #22c55e',
                            opacity: 0.8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 25,
                            pointerEvents: 'none',
                        }}
                    >
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    transform: `rotate(${deg}deg) translate(34px) rotate(-${deg}deg)`,
                                    fontSize: '8px',
                                    color: '#22c55e',
                                    fontWeight: 'bold',
                                    textShadow: '0 0 4px #22c55e',
                                }}
                            >
                                {['+20%', 'BUY', '$', 'UP', '$$$', 'WIN', '+50%', 'NET'][i]}
                            </div>
                        ))}
                    </motion.div>
                </>
            )}

            {/* Ash Particles (Angry Mode) */}
            {mood === 'angry' && (
                <>
                    {ashParticles.map((p) => (
                        <motion.div
                            key={p.id}
                            className={styles.ashParticle}
                            initial={{ x: p.x, y: p.y, opacity: 0.8, scale: 1 }}
                            animate={{
                                y: p.y + 150,
                                x: p.x + (Math.random() - 0.5) * 20,
                                opacity: 0,
                                rotate: 360,
                            }}
                            transition={{ duration: 2, ease: 'linear' }}
                        />
                    ))}
                </>
            )}

            {/* Sauron Ash & Ember Particles */}
            {isSauronMode && (
                <>
                    {sauronAsh.map((p) => (
                        <div
                            key={p.id}
                            className={styles.sauronAshflake}
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(${p.x}px, ${p.y}px)`,
                            }}
                        />
                    ))}
                    {sauronEmbers.map((e) => (
                        <div
                            key={e.id}
                            className={styles.sauronEmber}
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(${e.x}px, ${e.y}px) scale(${e.scale})`,
                            }}
                        />
                    ))}
                </>
            )}

            {/* Sauron Gaze Beam */}
            {isSauronMode && containerRef?.current && gazeTarget && (
                <svg className={styles.gazeBeam} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 105 }}>
                    <defs>
                        <linearGradient id="gazeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ff4500" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#ff4500" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {(() => {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const cx = rect.left + rect.width / 2;
                        const cy = rect.top + rect.height / 2;
                        const dx = gazeTarget.x - cx;
                        const dy = gazeTarget.y - cy;
                        const angle = Math.atan2(dy, dx);
                        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 600);
                        const spread = 0.15; // Beam spread angle
                        const endX1 = cx + Math.cos(angle - spread) * dist;
                        const endY1 = cy + Math.sin(angle - spread) * dist;
                        const endX2 = cx + Math.cos(angle + spread) * dist;
                        const endY2 = cy + Math.sin(angle + spread) * dist;
                        return (
                            <polygon
                                points={`${cx},${cy} ${endX1},${endY1} ${endX2},${endY2}`}
                                fill="url(#gazeGrad)"
                                opacity="0.4"
                                style={{ filter: 'blur(8px)', mixBlendMode: 'screen' }}
                            />
                        );
                    })()}
                </svg>
            )}

            {/* Smart Mode Effects */}
            {isSmart && (
                <>
                    {/* Rotating Tech Ring */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        style={{
                            position: 'absolute',
                            width: '120%',
                            height: '120%',
                            border: '2px dashed #0d9488',
                            borderRadius: '50%',
                            opacity: 0.6,
                            zIndex: 20,
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Binary Particles (Code Rain) */}
                    {binaryBits.map((bit) => (
                        <motion.div
                            key={bit.id}
                            initial={{ y: bit.y, x: bit.x, opacity: 1 }}
                            animate={{ y: 60, opacity: [1, 1, 0] }}
                            transition={{ duration: 1.5, ease: "linear", delay: bit.delay }}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                color: '#0d9488',
                                fontSize: '10px',
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                zIndex: 15,
                                pointerEvents: 'none',
                            }}
                        >
                            {bit.char}
                        </motion.div>
                    ))}

                    {/* Synapse Flash Pulse */}
                    <motion.div
                        animate={{
                            scale: [1, 1.8, 1],
                            opacity: [0.6, 0, 0.6],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeOut",
                        }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            border: '2px solid #1e3a8a',
                            zIndex: 18,
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Neural Lines */}
                    <svg
                        style={{
                            position: 'absolute',
                            width: '150%',
                            height: '150%',
                            left: '-25%',
                            top: '-25%',
                            zIndex: 5,
                            pointerEvents: 'none',
                        }}
                    >
                        <motion.line
                            x1="50%" y1="50%" x2="20%" y2="20%"
                            stroke="#0d9488"
                            strokeWidth="1"
                            opacity={0.3}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <motion.line
                            x1="50%" y1="50%" x2="80%" y2="30%"
                            stroke="#0d9488"
                            strokeWidth="1"
                            opacity={0.3}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
                        />
                        <motion.line
                            x1="50%" y1="50%" x2="30%" y2="80%"
                            stroke="#0d9488"
                            strokeWidth="1"
                            opacity={0.3}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                        />
                    </svg>
                </>
            )}
        </AnimatePresence>
    );
}
