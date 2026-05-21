'use client';

import React, { useState } from 'react';
import { X, Tv, Send } from 'lucide-react';
import { DEMO_MATCH_CHAT_LINES } from '@/lib/onboardingDemo';
import styles from './DemoMatchPreview.module.css';

interface DemoMatchPreviewProps {
    partnerLabel: string;
    onClose: () => void;
}

const YOUTUBE_VIDEO_ID = 'qAETKn_fsk4';

export function DemoMatchPreview({ partnerLabel, onClose }: DemoMatchPreviewProps) {
    const [showWatchParty, setShowWatchParty] = useState(false);

    return (
        <div className={styles.wrap}>
            <header className={styles.head}>
                <div className={styles.chatInfo}>
                    <div className={styles.avatar}>
                        <span>✨</span>
                    </div>
                    <div>
                        <h2 className={styles.h2}>{partnerLabel}</h2>
                        <p className={styles.sub}>
                            Anonymous Soul — tour preview
                        </p>
                    </div>
                </div>
                <button type="button" className={styles.close} onClick={onClose} aria-label="Close preview">
                    <X size={20} />
                </button>
            </header>

            {/* Watch Party Overlay */}
            {showWatchParty && (
                <div className={styles.watchPartyOverlay}>
                    <div className={styles.watchPartyHeader}>
                        <span className={styles.watchPartyTitle}>
                            <Tv size={14} /> YouTube Watch Party
                        </span>
                        <button className={styles.watchPartyClose} onClick={() => setShowWatchParty(false)}>
                            <X size={16} />
                        </button>
                    </div>
                    <div className={styles.playerWrapper}>
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <div className={styles.watchPartyHint}>
                        In a real session, this stays synced with your friend. Play, pause, laugh — together.
                    </div>
                </div>
            )}

            <div className={styles.log}>
                {DEMO_MATCH_CHAT_LINES.map((line, i) => (
                    <div
                        key={i}
                        className={line.who === 'you' ? styles.bubbleYou : styles.bubbleThem}
                    >
                        {line.text}
                    </div>
                ))}
            </div>

            {/* Fake Input Bar with TV Button */}
            <div className={styles.inputBar}>
                <div className={styles.inputFake}>
                    <span className={styles.inputPlaceholder}>Type a message...</span>
                </div>
                <button
                    className={`${styles.tvBtn} ${showWatchParty ? styles.tvBtnActive : ''}`}
                    onClick={() => setShowWatchParty(!showWatchParty)}
                    title="Watch YouTube Together"
                >
                    <Tv size={18} />
                </button>
                <button className={styles.sendBtn}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
