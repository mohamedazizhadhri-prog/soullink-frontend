import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../NovaAvatar.module.css';

interface NovaSauronRendererProps {
    isSauronMode: boolean;
}

export function NovaSauronRenderer({ isSauronMode }: NovaSauronRendererProps) {
    return (
        <AnimatePresence>
            {isSauronMode && (
                <>
                    {/* 1. Pulsing Flare (heat radiance) */}
                    <div className={styles.sauronFlare} />
                    <div className={styles.heatHazeSauron} />

                    {/* 2. Fiery Tendrils radiating from the Eye */}
                    <svg className={styles.sauronTendrils} viewBox="0 0 200 200">
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
                            <motion.line
                                key={`tendril-${i}`}
                                x1="100" y1="100"
                                x2={100 + Math.cos(deg * Math.PI / 180) * 90}
                                y2={100 + Math.sin(deg * Math.PI / 180) * 90}
                                stroke="#ff4500"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                animate={{
                                    opacity: [0.2, 0.8, 0.3],
                                    strokeWidth: [1, 2.5, 1],
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                    ease: "easeInOut"
                                }}
                                style={{ filter: 'blur(1px)' }}
                            />
                        ))}
                        {/* Inner fire veins (shorter, brighter) */}
                        {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((deg, i) => (
                            <motion.line
                                key={`vein-${i}`}
                                x1="100" y1="100"
                                x2={100 + Math.cos(deg * Math.PI / 180) * 55}
                                y2={100 + Math.sin(deg * Math.PI / 180) * 55}
                                stroke="#ff8c00"
                                strokeWidth="1"
                                strokeLinecap="round"
                                animate={{
                                    opacity: [0.3, 1, 0.4],
                                }}
                                transition={{
                                    duration: 1.5 + Math.random(),
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </svg>

                    {/* 3. SVG Lidless Eye Eyelids */}
                    <svg className={styles.sauronEyelids} viewBox="0 0 200 200">
                        <defs>
                            <linearGradient id="eyelidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#1a0000" />
                                <stop offset="50%" stopColor="#660000" />
                                <stop offset="100%" stopColor="#1a0000" />
                            </linearGradient>
                        </defs>
                        {/* Top Eyelid */}
                        <motion.path
                            d="M 20 100 Q 100 30 180 100"
                            fill="none"
                            stroke="url(#eyelidGrad)"
                            strokeWidth="4"
                            animate={{
                                d: [
                                    "M 20 100 Q 100 30 180 100",
                                    "M 20 100 Q 100 40 180 100",
                                    "M 20 100 Q 100 30 180 100"
                                ]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            style={{ filter: 'drop-shadow(0 0 3px #ff4500)' }}
                        />
                        {/* Bottom Eyelid */}
                        <motion.path
                            d="M 20 100 Q 100 170 180 100"
                            fill="none"
                            stroke="url(#eyelidGrad)"
                            strokeWidth="4"
                            animate={{
                                d: [
                                    "M 20 100 Q 100 170 180 100",
                                    "M 20 100 Q 100 160 180 100",
                                    "M 20 100 Q 100 170 180 100"
                                ]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            style={{ filter: 'drop-shadow(0 0 3px #ff4500)' }}
                        />
                    </svg>

                    {/* 4. One Ring Tengwar Inscription Ring */}
                    <svg className={styles.sauronInscription} viewBox="0 0 300 300">
                        <defs>
                            <linearGradient id="tengwarGrad">
                                <stop offset="0%" stopColor="#ffd700" />
                                <stop offset="50%" stopColor="#ff4500" />
                                <stop offset="100%" stopColor="#ffd700" />
                            </linearGradient>
                            <path id="inscriptionPath" d="M 150 150 m -120 0 a 120 120 0 1 1 240 0 a 120 120 0 1 1 -240 0" fill="none" />
                        </defs>
                        <text fill="url(#tengwarGrad)" fontSize="11" fontFamily="serif" opacity="0.7">
                            <textPath href="#inscriptionPath" startOffset="0%">
                                ⁂ Ash nazg durbatulûk ⁂ ash nazg gimbatul ⁂ ash nazg thrakatulûk ⁂ agh burzum-ishi krimpatul ⁂
                            </textPath>
                        </text>
                    </svg>
                </>
            )}
        </AnimatePresence>
    );
}
