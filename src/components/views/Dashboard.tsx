"use client";

import React from "react";
import styles from "./Dashboard.module.css";
import { Eclipse, Users, MessageCircle, Gamepad2, Sparkles } from "lucide-react";
import Link from "next/link";

export function Dashboard() {
    return (
        <div className={styles.container}>
            <Eclipse className={styles.logoLarge} size={120} />

            <h1 className={styles.title}>
                <span className="text-gradient">SoulLink</span>
            </h1>
            <p className={styles.subtitle}>
                Your authentic journey begins here. Connect deeply, play meaningfully, and grow.
            </p>

            <div className={styles.grid}>
                <Link href="/match" className={styles.card}>
                    <Users className={styles.cardIcon} size={48} />
                    <span className={styles.cardTitle}>Start 1:1 Match</span>
                    <span className={styles.cardDesc}>Find your soul connection based on deep compatibility.</span>
                </Link>

                <Link href="/group" className={styles.card}>
                    <MessageCircle className={styles.cardIcon} size={48} />
                    <span className={styles.cardTitle}>Explore 24h Groups</span>
                    <span className={styles.cardDesc}>Join temporary anonymous circles on shared topics.</span>
                </Link>

                <Link href="/games" className={styles.card}>
                    <Gamepad2 className={styles.cardIcon} size={48} />
                    <span className={styles.cardTitle}>Quick Soul Game</span>
                    <span className={styles.cardDesc}>Discover yourself through interactive psychology games.</span>
                </Link>
            </div>

            <div className={styles.aiPrompt}>
                <Sparkles size={20} color="var(--color-brand-purple)" />
                <span className={styles.aiText}>"Nova: Ready to discover meaningful connections today?"</span>
            </div>
        </div>
    );
}
