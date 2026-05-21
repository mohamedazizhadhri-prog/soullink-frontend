import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../NovaAvatar.module.css';
import ssjHairImg from '@/assets/ssj.png';

interface NovaSuperSaiyanRendererProps {
    isSuperSaiyan: boolean;
    ssjLevel: 1 | 2 | 3;
}

function generateLightningPath(startX: number, startY: number, endX: number, endY: number, segments: number = 5): string {
    let path = `M ${startX} ${startY}`;
    const dx = (endX - startX) / segments;
    const dy = (endY - startY) / segments;
    for (let i = 1; i < segments; i++) {
        const jitterX = (Math.random() - 0.5) * 30;
        const jitterY = (Math.random() - 0.5) * 10;
        path += ` L ${startX + dx * i + jitterX} ${startY + dy * i + jitterY}`;
    }
    path += ` L ${endX} ${endY}`;
    return path;
}

export function NovaSuperSaiyanRenderer({ isSuperSaiyan, ssjLevel }: NovaSuperSaiyanRendererProps) {
    const [showBurst, setShowBurst] = useState(false);
    const [lightningPaths, setLightningPaths] = useState<string[]>([]);

    useEffect(() => {
        if (isSuperSaiyan) {
            setShowBurst(true);
            setTimeout(() => setShowBurst(false), 800);
        }
    }, [isSuperSaiyan, ssjLevel]);

    useEffect(() => {
        if (!isSuperSaiyan || ssjLevel < 2) { setLightningPaths([]); return; }
        const generatePaths = () => {
            const count = ssjLevel === 3 ? 6 : 3;
            const paths: string[] = [];
            for (let i = 0; i < count; i++) {
                const angle = (Math.random() * 360) * (Math.PI / 180);
                const radius = 60 + Math.random() * 40;
                paths.push(generateLightningPath(100, 100, 100 + Math.cos(angle) * radius, 100 + Math.sin(angle) * radius, 4 + Math.floor(Math.random() * 3)));
            }
            setLightningPaths(paths);
        };
        generatePaths();
        const interval = setInterval(generatePaths, 300);
        return () => clearInterval(interval);
    }, [isSuperSaiyan, ssjLevel]);

    // Scale relative to 64px container — bigger = more dramatic
    const hairScale = ssjLevel === 3 ? 2.1 : ssjLevel === 2 ? 1.75 : 1.5;

    return (
        <AnimatePresence>
            {isSuperSaiyan && (
                <>
                    {/* Golden Aura */}
                    <div className={
                        ssjLevel === 3 ? styles.ssjAuraSSJ3 :
                            ssjLevel === 2 ? styles.ssjAuraSSJ2 :
                                styles.ssjAuraSSJ1
                    } />

                    {/* SSJ Hair — positioned on top of orb */}
                    <motion.img
                        src={(ssjHairImg as any).src || ssjHairImg}
                        alt=""
                        draggable={false}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [hairScale, hairScale * 1.03, hairScale],
                            opacity: 1,
                        }}
                        transition={{
                            scale: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
                            opacity: { duration: 0.3 },
                        }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: 'auto',
                            // bottom of hair overlaps the top ~35% of the orb
                            bottom: '45%',
                            left: '50%',
                            translateX: '-50%',
                            transformOrigin: 'bottom center',
                            pointerEvents: 'none',
                            zIndex: 10,
                            filter: ssjLevel === 3
                                ? 'brightness(1.4) drop-shadow(0 0 6px rgba(255, 215, 0, 0.9))'
                                : ssjLevel === 2
                                    ? 'brightness(1.2) drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))'
                                    : 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.7))',
                        }}
                    />

                    {/* Electric Lightning Bolts (SSJ2+) */}
                    {ssjLevel >= 2 && (
                        <svg
                            style={{
                                position: 'absolute',
                                inset: '-50%',
                                width: '200%',
                                height: '200%',
                                pointerEvents: 'none',
                                zIndex: 7,
                            }}
                            viewBox="0 0 200 200"
                        >
                            {lightningPaths.map((path, i) => (
                                <motion.path
                                    key={`bolt-${i}`}
                                    d={path}
                                    stroke={ssjLevel === 3 ? "#FFFFFF" : "#87CEEB"}
                                    strokeWidth={ssjLevel === 3 ? 2.5 : 1.5}
                                    fill="none"
                                    strokeLinecap="round"
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ duration: 0.15 + Math.random() * 0.1, repeat: 1, delay: i * 0.05 }}
                                    style={{ filter: `drop-shadow(0 0 4px ${ssjLevel === 3 ? '#FFD700' : '#87CEEB'})` }}
                                />
                            ))}
                        </svg>
                    )}

                    {/* Ki Sparks */}
                    {Array.from({ length: ssjLevel === 3 ? 10 : ssjLevel === 2 ? 6 : 4 }).map((_, i) => (
                        <motion.div
                            key={`spark-${i}`}
                            style={{
                                position: 'absolute',
                                width: 2,
                                height: 10,
                                background: 'linear-gradient(to bottom, #FFF, #FFD700, transparent)',
                                borderRadius: 2,
                                pointerEvents: 'none',
                                zIndex: 8,
                                boxShadow: '0 0 4px #FFD700',
                            }}
                            initial={{ x: (Math.random() - 0.5) * 30, y: 5, opacity: 0 }}
                            animate={{
                                y: -30 - Math.random() * 40,
                                x: (Math.random() - 0.5) * 40,
                                opacity: [0, 0.8, 0],
                                scale: [0.5, 1, 0.3],
                            }}
                            transition={{
                                duration: 1 + Math.random() * 1.5,
                                repeat: Infinity,
                                delay: i * 0.25,
                                ease: "easeOut",
                            }}
                        />
                    ))}

                    {/* Charge Burst on activation */}
                    <AnimatePresence>
                        {showBurst && (
                            <motion.div
                                key="ssj-burst"
                                style={{
                                    position: 'absolute',
                                    inset: '-80%',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,215,0,0.4) 30%, transparent 60%)',
                                    pointerEvents: 'none',
                                    zIndex: 100,
                                }}
                                initial={{ scale: 0, opacity: 1 }}
                                animate={{ scale: 2, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
