import React from "react";
import { motion } from "framer-motion";
import styles from "./NovaBlackHole.module.css";
import { useNova } from "@/context/NovaContext";

interface NovaBlackHoleProps {
    isStasis?: boolean; // True if holding items but not hunting
    layoutId?: string;
}

export function NovaBlackHole({ isStasis = false, layoutId }: NovaBlackHoleProps) {
    const { gulpTrigger } = useNova();

    return (
        <motion.div
            className={styles.blackHoleContainer}
            layoutId={layoutId || undefined}
        >
            {/* SVG Filter Injection for Liquid Plasma Distortion */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="nova-fiery-lensing">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="5">
                            <animate attributeName="baseFrequency" dur="30s" values="0.04;0.05;0.04" repeatCount="indefinite" />
                        </feTurbulence>
                        <feDisplacementMap in="SourceGraphic" scale="40" />
                    </filter>
                </defs>
            </svg>

            {/* 1. Einstein Ring (Warped Light behind the void) */}
            <motion.div
                className={styles.einsteinRing}
                animate={{
                    scale: [1, 1.08, 0.96, 1],
                    rotate: [0, 360]
                }}
                transition={{
                    scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 40, repeat: Infinity, ease: "linear" }
                }}
            />

            {/* 2. Plasma Haze (Volumetric Heat) */}
            <motion.div
                className={styles.volumetricHaze}
                animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.9, 1.2, 0.9],
                    rotate: [0, -360]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />

            {/* 3. Accretion Disk (Fiery & Liquid) */}
            <motion.div
                className={styles.accretionDisk}
                animate={{
                    rotateZ: [0, 360],
                    scale: [1, 1.02, 0.98, 1]
                }}
                transition={{
                    rotateZ: { duration: 12, repeat: Infinity, ease: "linear" },
                    scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
            />

            {/* 4. Plasma Turbulence Layer */}
            <div className={styles.turbulence} />

            {/* 5. The Event Horizon (The Void) */}
            <motion.div
                className={styles.voidSphere}
                animate={gulpTrigger > 0 ? {
                    scale: [1, 1.35, 0.8, 1],
                } : {
                    scale: isStasis ? [1, 1.04, 0.98, 1] : 1,
                }}
                transition={gulpTrigger > 0 ? {
                    duration: 0.4, ease: "circOut"
                } : {
                    duration: 4, repeat: Infinity, ease: "easeInOut"
                }}
            >
                {/* 6. Photon Sphere (Internal glimmer) */}
                <motion.div
                    className={styles.photonSphere}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </motion.div>

            {/* Consumption Flare Effect */}
            <motion.div
                className={styles.consumptionFlare}
                animate={gulpTrigger > 0 ? {
                    opacity: [0, 1, 0],
                    scale: [0.5, 3],
                    rotate: [0, 180]
                } : { opacity: 0 }}
                transition={{ duration: 0.6, ease: "circOut" }}
            />

            {/* Cinematic Lens Flare Flash */}
            <motion.div
                className={styles.lensFlare}
                animate={gulpTrigger > 0 ? {
                    opacity: [0, 1, 0],
                    scaleX: [0, 4, 0],
                    scaleY: [1, 2, 0]
                } : { opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            />

            {/* Gravitational Wave Ripple */}
            <motion.div
                className={styles.gravitationalWave}
                animate={gulpTrigger > 0 ? {
                    scale: [1, 8],
                    opacity: [1, 0],
                    borderWidth: ["4px", "0px"]
                } : { opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
            />
        </motion.div>
    );
}
