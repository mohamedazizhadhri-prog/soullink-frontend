"use client";

import React from "react";
import Link from "next/link";
import { Eclipse, Download, ArrowRight } from "lucide-react";
import styles from "./LandingPage.module.css";

export function LandingPage() {
    return (
        <div className={styles.landingContainer}>
            {/* Navigation */}
            <nav className={styles.navbar}>
                <div className={styles.logoSection}>
                    <Eclipse className={styles.logoIcon} size={32} />
                    <span className="text-gradient">SoulLink</span>
                </div>

                <div className={styles.navLinks}>
                    <Link href="#" className={styles.navLink}>Download</Link>
                    <Link href="#" className={styles.navLink}>Nitro</Link>
                    <Link href="#" className={styles.navLink}>Discover</Link>
                    <Link href="#" className={styles.navLink}>Safety</Link>
                    <Link href="#" className={styles.navLink}>Support</Link>
                    <Link href="#" className={styles.navLink}>Blog</Link>
                    <Link href="#" className={styles.navLink}>Careers</Link>
                </div>

                <div className={styles.authButtons}>
                    <Link href="/login" className={styles.loginBtn}>
                        Login
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className={styles.hero}>
                <h1 className={styles.heroTitle}>
                    IMAGINE A <br /> PLACE...
                </h1>
                <p className={styles.heroSubtitle}>
                    ...where you can belong to a school club, a gaming group, or a worldwide art community.
                    Where just you and a handful of friends can spend time together. A place that makes it
                    easy to talk every day and hang out more often.
                </p>

                <div className={styles.heroActions}>
                    <Link href="/signup" className={styles.primaryAction}>
                        Get Started <ArrowRight size={20} />
                    </Link>
                    <Link href="/login" className={styles.secondaryAction}>
                        Open SoulLink in your browser
                    </Link>
                </div>
            </main>

            {/* Decorative Background Elements */}
            <div className={styles.floatingElements}>
                <div className={`${styles.glowCircle} ${styles.glow1}`}></div>
                <div className={`${styles.glowCircle} ${styles.glow2}`}></div>
            </div>
        </div>
    );
}
