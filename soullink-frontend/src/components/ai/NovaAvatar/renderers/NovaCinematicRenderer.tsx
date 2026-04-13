import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../NovaAvatar.module.css';

interface NovaCinematicRendererProps {
    isHovered: boolean;
    mood: string;
    splashTrigger: number;
    isRebooting: boolean;
    isCinematicMode: boolean;
    isPacManMode: boolean;
    deathPhase: number;
    isDancing: boolean;
}

export function NovaCinematicRenderer({
    isHovered,
    mood,
    splashTrigger,
    isRebooting,
    isCinematicMode,
    isPacManMode,
    deathPhase,
    isDancing
}: NovaCinematicRendererProps) {
    return (
        <>
            {/* Party Mode Environment */}
            {isDancing && (
                <div style={{ position: 'absolute', inset: -200, pointerEvents: 'none', zIndex: -1 }}>
                    <div className={styles.spotlightLeft} />
                    <div className={styles.spotlightRight} />
                    <div className={styles.floorPulse} />
                    {/* Confetti Particles */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className={i % 2 === 0 ? styles.confettiSquare : styles.confettiCircle}
                            style={{
                                left: `${Math.random() * 100}%`,
                                backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
                            }}
                            animate={{
                                y: [0, 400],
                                rotate: [0, 720],
                                opacity: [1, 0]
                            }}
                            transition={{
                                duration: 2 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                                ease: "linear"
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Startle Pulse Effect */}
            <AnimatePresence>
                {isHovered && mood === 'bored' && (
                    <motion.div
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                        style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            background: 'white', zIndex: 1, pointerEvents: 'none'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Splash Pulse */}
            <AnimatePresence>
                <motion.div
                    key={`splash-${splashTrigger}`}
                    initial={{ scale: 1 }}
                    animate={splashTrigger > 0 ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.2 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', zIndex: 10 }}
                />
            </AnimatePresence>

            {/* Reboot Flash */}
            <AnimatePresence>
                {isRebooting && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'white', zIndex: 1000, pointerEvents: 'none'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Cinematic Radial Glow */}
            <AnimatePresence>
                {isCinematicMode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.8 }}
                        style={{
                            position: 'absolute',
                            width: '400%',
                            height: '400%',
                            background: isPacManMode
                                ? 'radial-gradient(circle, rgba(255,239,0,0.2) 0%, transparent 60%)'
                                : 'radial-gradient(circle, rgba(123,104,238,0.2) 0%, transparent 60%)',
                            pointerEvents: 'none',
                            zIndex: -1,
                            top: '50%',
                            left: '50%',
                            x: '-50%',
                            y: '-50%'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Divine Spotlight Effect */}
            <AnimatePresence>
                {deathPhase === 4 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        style={{
                            position: 'absolute',
                            top: -400,
                            left: '50%',
                            x: '-50%',
                            width: 120,
                            height: 600,
                            background: 'linear-gradient(to bottom, rgba(255, 230, 0, 0.4), transparent)',
                            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                            filter: 'blur(20px)',
                            zIndex: 1,
                            pointerEvents: 'none'
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
