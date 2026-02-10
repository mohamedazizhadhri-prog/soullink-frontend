"use client";

import React from "react";
import { motion } from "framer-motion";
import { useNova } from "@/context/NovaContext";
import styles from "./WaterOverlay.module.css";

export function WaterOverlay() {
    const { isStormMode, waterLevel } = useNova();

    return (
        <motion.div
            className={styles.waterContainer}
            initial={{ height: "0%" }}
            animate={{ height: `${waterLevel}%` }}
            transition={{ duration: 0.5, ease: "linear" }}
            style={{ display: waterLevel === 0 ? 'none' : 'flex' }}
        >
            {/* Glassmorphism Surface */}
            <div className={styles.waterSurface}>
                <svg
                    className={styles.waveSvg}
                    viewBox="0 0 120 28"
                    preserveAspectRatio="none"
                >
                    <motion.path
                        d="M0 30 V15 Q30 3 60 15 t60 0 V30 Z"
                        fill="currentColor"
                        animate={{
                            d: [
                                "M0 30 V15 Q30 3 60 15 t60 0 V30 Z",
                                "M0 30 V15 Q30 27 60 15 t60 0 V30 Z",
                                "M0 30 V15 Q30 3 60 15 t60 0 V30 Z",
                            ],
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: 3,
                            ease: "easeInOut",
                        }}
                    />
                </svg>
            </div>

            {/* The body of the water */}
            <div className={styles.waterBody} />
        </motion.div>
    );
}
