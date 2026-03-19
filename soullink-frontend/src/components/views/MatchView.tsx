"use client";

import React from "react";
import styles from "./MatchView.module.css";
import { User, Heart, X, MessageCircle, Sparkles } from "lucide-react";

export function MatchView() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h2>Find Your Soul Match</h2>
                <div className={styles.filters}>
                    <button className={`${styles.filterBtn} ${styles.activeFilter}`}>Personality</button>
                    <button className={styles.filterBtn}>Values</button>
                    <button className={styles.filterBtn}>Interests</button>
                </div>
            </header>

            <div className={styles.cardContainer}>
                <div className={styles.avatarSilhouette}>
                    <User size={64} />
                </div>

                <div className={styles.matchScore}>92%</div>
                <div className={styles.matchLabel}>Compatibility</div>

                <div className={styles.traitsList}>
                    <span className={styles.traitTag}>Open-minded</span>
                    <span className={styles.traitTag}>Creative thinker</span>
                    <span className={styles.traitTag}>Values honesty</span>
                </div>

                <div className={styles.actions}>
                    <button className={`${styles.actionBtn} ${styles.btnPass}`}>
                        <X size={20} /> Pass
                    </button>
                    <button className={`${styles.actionBtn} ${styles.btnConnect}`}>
                        <Heart size={20} fill="white" /> Connect
                    </button>
                </div>
            </div>

            <div className={styles.navControls}>
                <button className={styles.filterBtn}>&lt; Previous</button>
                <span>1 of 5 Daily Matches</span>
                <button className={styles.filterBtn}>Next &gt;</button>
            </div>
        </div>
    );
}
