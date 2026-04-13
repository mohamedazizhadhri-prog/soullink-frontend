"use client";

import React from "react";
import styles from "./MatchView.module.css";
import { useMatching } from "@/hooks/useMatching";
import { 
    Users, 
    Sparkles, 
    Gamepad2, 
    BookOpen, 
    Heart, 
    X, 
    Check, 
    ChevronRight,
    Loader2,
    Trophy,
    MessageCircle,
    UserCircle2,
    Flame,
    Zap,
    UserMinus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MatchChat } from "./MatchChat";

const INTENT_OPTIONS = [
    { id: 'FRIEND', title: 'Find Friends', icon: <Users />, desc: 'Meaningful connections and casual hangouts' },
    { id: 'DEEP_BOND', title: 'Deep Bond', icon: <Sparkles />, desc: 'Searching for a soul sibling or best friend' },
    { id: 'GAMING', title: 'Gaming Partner', icon: <Gamepad2 />, desc: 'Someone to climb ranks or play casually with' },
    { id: 'STUDY_BUDDY', title: 'Study Buddy', icon: <BookOpen />, desc: 'Focus together and share knowledge' },
    { id: 'ROMANCE', title: 'Romance', icon: <Heart />, desc: 'Building something more intimate' },
];

export function MatchView() {
    const {
        step,
        setStep,
        intent,
        setIntent,
        selectedInterests,
        toggleInterest,
        categories,
        isLoading,
        matchResult,
        setMatchResult,
        startMatching,
        revealSoul,
        leaveMatch,
        activeMatches,
        isQuickMatching,
        me
    } = useMatching();

    const [selectedMatchId, setSelectedMatchId] = React.useState<string | null>(null);

    // ─── RENDERING PHASES ───────────────────────────────────────────────────

    const renderSidebar = () => (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <h3>Soul Links</h3>
            </div>
            <div className={styles.matchList}>
                {activeMatches.length === 0 ? (
                    <div className={styles.emptySidebar}>
                        <MessageCircle size={32} opacity={0.2} />
                        <p>No active connections yet. <br/> Start a search!</p>
                    </div>
                ) : (
                    activeMatches.map((match) => {
                        const otherUser = match.receiver.id === me?.id ? match.sender : match.receiver;
                        const isSelected = selectedMatchId === match.id;
                        return (
                            <div 
                                key={match.id} 
                                className={`${styles.matchItem} ${isSelected ? styles.matchItemActive : ''}`}
                                onClick={() => setSelectedMatchId(match.id)}
                            >
                                <div className={styles.matchAvatar}>
                                    {match.isAnonymous ? <Zap size={16} color="#9d4edd" /> : <UserCircle2 size={16} />}
                                </div>
                                <div className={styles.matchInfo}>
                                    <span className={styles.matchName}>
                                        {match.isAnonymous ? (match.anonymousName || 'Anonymous Soul') : otherUser.displayName}
                                    </span>
                                    <span className={styles.matchPreview}>
                                        {match.isQuickMatch ? '⏱️ Quick Match' : (match.isAnonymous ? '✨ Anonymous Chat' : '👤 Identity Revealed')}
                                    </span>
                                </div>
                                <div className={styles.matchActions}>
                                    <button className={styles.miniBtn} title="Leave Match" onClick={(e) => { e.stopPropagation(); leaveMatch(match.id); }}>
                                        <UserMinus size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );

    const renderIntentPicker = () => (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.intentGrid}
        >
            {INTENT_OPTIONS.map((opt) => (
                <div 
                    key={opt.id} 
                    className={`${styles.intentCard} ${intent === opt.id ? styles.intentCardActive : ''}`}
                    onClick={() => setIntent(opt.id)}
                >
                    <div className={styles.intentIcon}>{opt.icon}</div>
                    <h3>{opt.title}</h3>
                    <p>{opt.desc}</p>
                    {intent === opt.id && (
                        <motion.div layoutId="active" className={styles.activeCheck}>
                            <Check size={16} />
                        </motion.div>
                    )}
                </div>
            ))}
        </motion.div>
    );

    const renderInterestPicker = () => (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.interestContainer}
        >
            {Object.entries(categories).map(([category, tags]) => (
                <section key={category} className={styles.categorySection}>
                    <h4 className={styles.categoryTitle}>{category}</h4>
                    <div className={styles.pillsGrid}>
                        {tags.map(tag => (
                            <button
                                key={tag}
                                className={`${styles.interestPill} ${selectedInterests.includes(tag) ? styles.interestPillActive : ''}`}
                                onClick={() => toggleInterest(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </section>
            ))}
        </motion.div>
    );

    const renderSearching = () => (
        <div className={styles.searchingContainer}>
            <div className={styles.pulseWrapper}>
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={styles.pulseRing}
                />
                <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className={styles.pulseRing}
                />
                <div className={styles.searchingCore}>
                    {isQuickMatching ? <Zap size={48} color="#9d4edd" /> : <Sparkles size={48} color="#9d4edd" />}
                </div>
            </div>
            <h3>{isQuickMatching ? 'Looking for active souls...' : 'Scanning the Soul-Sphere...'}</h3>
            <p>Nova is finding interests and energy that align with yours.</p>
            <p className={styles.hint}>We'll notify you as soon as a match is found!</p>
            
            <button className={styles.cancelBtn} onClick={() => startMatching(false)}>
                Update Preferences
            </button>
        </div>
    );

    const renderContent = () => {
        if (selectedMatchId) {
            const selectedMatch = activeMatches.find(m => m.id === selectedMatchId);
            if (!selectedMatch) {
                setSelectedMatchId(null);
                return renderIntentPicker();
            }

            return (
                <MatchChat 
                    match={{...selectedMatch, myId: me?.id}} 
                    onClose={() => setSelectedMatchId(null)}
                    onReveal={() => revealSoul(selectedMatchId)}
                    onLeave={() => { leaveMatch(selectedMatchId); setSelectedMatchId(null); }}
                />
            );
        }

        switch (step) {
            case 'intent': return renderIntentPicker();
            case 'interests': return renderInterestPicker();
            case 'searching': return renderSearching();
            default: return renderIntentPicker();
        }
    };

    // ─── MAIN LAYOUT ────────────────────────────────────────────────────────

    return (
        <div className={styles.dashboard}>
            {renderSidebar()}

            <div className={styles.contentArea}>
                <header className={styles.searchHeader}>
                    <div className={styles.searchInfo}>
                        {!selectedMatchId ? (
                            <AnimatePresence mode="wait">
                                {step === 'intent' && (
                                    <motion.div key="h-intent" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                                        <h2>Your Intent</h2>
                                        <p>What are you searching for today? SoulLink will find compatible requests.</p>
                                    </motion.div>
                                )}
                                {step === 'interests' && (
                                    <motion.div key="h-interests" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                                        <h2>Pick your vibes</h2>
                                        <p>Selected at least 5 tags to refine your search.</p>
                                    </motion.div>
                                )}
                                {step === 'searching' && (
                                    <motion.div key="h-searching" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                                        <h2>Active Search</h2>
                                        <div className={styles.activeSearchBadge}>
                                            <div className={styles.ping} />
                                            {isQuickMatching ? 'Quick Matching...' : `Searching for ${INTENT_OPTIONS.find(o => o.id === intent)?.title}`}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        ) : (
                            <div>
                                <h2>Direct Soul Link</h2>
                                <p>You are talking to an anonymous soul. Be kind and curious.</p>
                            </div>
                        )}
                    </div>

                    {!selectedMatchId && (
                        <div className={styles.quickMatchContainer}>
                            <button className={styles.quickMatchBtn} onClick={() => startMatching(true)}>
                                <Zap size={18} /> Quick Match
                            </button>
                        </div>
                    )}
                </header>

                <main className={styles.mainSection}>
                    {renderContent()}
                </main>

                <AnimatePresence>
                    {(step !== 'searching' && !selectedMatchId) && (
                        <motion.footer 
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className={styles.stickyFooter}
                        >
                            <div className={styles.progressText}>
                                {step === 'intent' ? 'Step 1 of 2' : `${selectedInterests.length} / 5 interests required`}
                            </div>
                            <button 
                                className={styles.continueBtn}
                                disabled={step === 'interests' && selectedInterests.length < 5}
                                onClick={() => step === 'intent' ? setStep('interests') : startMatching(false)}
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>
                                        {step === 'intent' ? 'Next' : 'Find Match'} 
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        </motion.footer>
                    )}
                </AnimatePresence>
            </div>

            {/* Match Success Overlay */}
            <AnimatePresence>
                {matchResult && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.matchOverlay}
                    >
                        <motion.div 
                            initial={{ scale: 0.5, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            className={styles.matchPopup}
                        >
                            <Trophy size={64} color="#ffd700" />
                            <h2>Soul Connection!</h2>
                            <p>You've been matched with <strong>{matchResult.partnerName}</strong>.</p>
                            <p>An anonymous conversation has started. Reveal your identities when you feel the vibe!</p>
                            <button className={styles.settingsBtn} style={{ background: '#9d4edd', border: 'none', margin: '16px auto 0' }} onClick={() => setMatchResult(null)}>
                                Awesome!
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
