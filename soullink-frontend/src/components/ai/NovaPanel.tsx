
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Power, Brain, HelpCircle, Search, Zap, Heart, MousePointer2, Frown, Sparkles, Smile, Droplets, Flame, Ghost, Lock, Video, Coffee, Coins } from "lucide-react";
import { useNova, NovaMood } from "@/context/NovaContext";
import styles from "./NovaPanel.module.css";

export function NovaPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    mood, status, isTracking, setMood, setStatus, setTracking,
    triggerEmote, addMessage, isPacManMode, setPacManMode,
    isCinematicMode, setCinematicMode,
    isStormMode, setStormMode, setWaterLevel, waterLevel,
    setIsAscending, setIsDead, setChatDisabled, setDeathPhase,
    isHunting, setIsHunting, eatenElements, setEatenElements,
    isSpitting, setIsSpitting, huntTarget, setHuntTarget,
    isSingularity, setIsSingularity, triggerEatInput,
    isMelting, setIsMelting, isSmart, setIsSmart, triggerRich,
    isEgg, triggerEgg,
    isDancing, setIsDancing,
    isSauronMode, setIsSauronMode,
    followCursorMode, setFollowCursorMode,
    isNightMode, setIsNightMode
  } = useNova();

  const toggleOpen = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (isCinematicMode) {
      setIsOpen(true);
    }
  }, [isCinematicMode]);

  useEffect(() => {
    let interval: any;
    if (isStormMode) {
      interval = setInterval(() => {
        setWaterLevel((prev: number) => {
          if (prev >= 100) return 100;
          return prev + (100 / (20 * 10)); // 100% over 20s (10 ticks per second)
        });
      }, 100);
    } else {
      // Drain logic: faster reset
      interval = setInterval(() => {
        setWaterLevel((prev: number) => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 5;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isStormMode, setWaterLevel]);

  const moods: { id: NovaMood; label: string; icon: React.ReactNode }[] = [
    { id: "neutral", label: "Neutral", icon: <Zap size={14} /> },
    { id: "thinking", label: "Thinking", icon: <Brain size={14} /> },
    { id: "curious", label: "Curious", icon: <Search size={14} /> },
    { id: "confused", label: "Confused", icon: <HelpCircle size={14} /> },
    { id: "blushed", label: "Blushed", icon: <Heart size={14} /> },
    { id: "angry", label: "Angry", icon: <Flame size={14} /> },
    { id: "bored", label: "Bored", icon: <Coffee size={14} /> },
    { id: "sad", label: "Sad", icon: <Frown size={14} /> },
    { id: "disgusted", label: "Disgusted", icon: <Ghost size={14} /> },
    { id: "love", label: "Love", icon: <Heart size={14} fill="#fb7185" /> },
    { id: "happy", label: "Happy", icon: <Smile size={14} /> },
  ];

  const [page, setPage] = useState(0);
  const [showCursedMenu, setShowCursedMenu] = useState(false);
  const [selectedEatTarget, setSelectedEatTarget] = useState("");

  // ... (existing effects remain the same)

  return (
    <div className={styles.panelContainer}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.menu}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* PAGE 1: System & Moods */}
            {page === 0 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                {/* System Section */}
                <div>
                  <div className={styles.sectionTitle} style={{ marginTop: 0 }}>System</div>
                  <div className={styles.statusRow}>
                    <button
                      className={`${styles.moodBtn} ${status === "online" ? styles.active : ""} `}
                      onClick={() => setStatus("online")}
                      style={{ flex: 1 }}
                    >
                      <Power size={14} style={{ marginRight: 4 }} /> On
                    </button>
                    <button
                      className={`${styles.moodBtn} ${status === "offline" ? styles.active : ""} `}
                      onClick={() => setStatus("offline")}
                      style={{ flex: 1 }}
                    >
                      Off
                    </button>
                  </div>

                  {/* Eye Tracking Toggle */}
                  <div style={{ marginTop: 6 }}>
                    <button
                      className={`${styles.moodBtn} ${!isTracking ? styles.active : ""} `}
                      onClick={() => setTracking(!isTracking)}
                      style={{ width: '100%', gap: 6 }}
                      disabled={status === "offline"}
                    >
                      <Lock size={14} />
                      {isTracking ? "Freeze" : "Unfreeze"}
                    </button>
                  </div>
                </div>

                {/* Moods Section */}
                <div>
                  <div className={styles.sectionTitle}>Moods</div>
                  <div className={styles.moodGrid}>
                    {moods.map((m) => (
                      <button
                        key={m.id}
                        className={`${styles.moodBtn} ${mood === m.id ? styles.active : ""} `}
                        onClick={() => setMood(m.id)}
                        disabled={status === "offline"}
                        style={{ opacity: status === "offline" ? 0.5 : 1 }}
                      >
                        <span style={{ marginRight: 6 }}>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* PAGE 2: Expressions & Drama */}
            {page === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {/* Expressions Section */}
                <div>
                  <div className={styles.sectionTitle} style={{ marginTop: 0 }}>Express</div>
                  <div className={styles.statusRow}>
                    <button className={styles.moodBtn} onClick={() => triggerEmote('angry')} title="Angry">
                      <Frown size={14} />
                    </button>
                    <button className={styles.moodBtn} onClick={() => triggerEmote('angelic')} title="Angelic">
                      <Sparkles size={14} />
                    </button>
                    <button className={styles.moodBtn} onClick={() => triggerEmote('oops')} title="Oops (Sweat Drop)">
                      <Droplets size={14} />
                    </button>
                    <button className={styles.moodBtn} onClick={() => setMood('confused')} title="Confused (?)">
                      <HelpCircle size={14} />
                    </button>
                    <button className={styles.moodBtn} onClick={() => triggerEmote('nod')} title="Nod">
                      <Smile size={14} />
                    </button>
                  </div>
                </div>

                {/* Drama Section */}
                <div style={{ marginTop: 8 }}>
                  <div className={styles.sectionTitle}>Drama</div>
                  <div className={styles.statusRow}>
                    <button
                      className={`${styles.moodBtn} ${mood === 'broken' ? styles.active : ""}`}
                      onClick={() => setMood('broken')}
                      style={{ flex: 1 }}
                      title="Heartbreak"
                    >
                      <Heart size={14} />
                    </button>
                    <button
                      className={`${styles.moodBtn} ${mood === 'crazy' ? styles.active : ""}`}
                      onClick={() => setMood('crazy')}
                      style={{ flex: 1 }}
                      title="Crazy"
                    >
                      <Flame size={14} />
                    </button>
                    {/* RICH MODE BUTTON */}
                    <button
                      className={`${styles.moodBtn} ${mood === 'rich' ? styles.active : ""}`}
                      onClick={() => triggerRich()}
                      style={{ flex: 1, color: '#10b981', borderColor: mood === 'rich' ? '#10b981' : undefined }}
                      title="Rich / Wealth"
                    >
                      <Coins size={14} />
                    </button>
                    <button
                      className={`${styles.moodBtn} ${mood === 'sad' ? styles.active : ""}`}
                      onClick={() => setMood('sad')}
                      style={{ flex: 1 }}
                      title="Sad"
                    >
                      <Frown size={14} />
                    </button>
                    <button
                      className={`${styles.moodBtn} ${mood === 'disgusted' ? styles.active : ""}`}
                      onClick={() => setMood('disgusted')}
                      style={{ flex: 1 }}
                      title="Disgusted"
                    >
                      <Ghost size={14} />
                    </button>
                    {/* HATCHLING BUTTON */}
                    <button
                      className={`${styles.moodBtn} ${isEgg ? styles.active : ""}`}
                      onClick={() => triggerEgg()}
                      style={{ flex: 1, color: '#f0ead6', borderColor: isEgg ? '#fca5a5' : undefined }}
                      title="Hatchling (Easter Egg)"
                    >
                      <Sparkles size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PAGE 3: World & Environment */}
            {page === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {/* Environment */}
                <div>
                  <div className={styles.sectionTitle} style={{ marginTop: 0 }}>World</div>
                  <div className={styles.statusRow}>
                    <button
                      className={`${styles.moodBtn} ${isStormMode ? styles.active : ""}`}
                      onClick={() => setStormMode(!isStormMode)}
                      style={{ flex: 1, gap: 4 }}
                      title="Storm Mode"
                    >
                      <Droplets size={14} /> Storm
                    </button>
                    <button
                      className={`${styles.moodBtn} ${isCinematicMode ? styles.active : ""}`}
                      onClick={() => setCinematicMode(true)}
                      style={{ flex: 1, gap: 4 }}
                      title="Cinematic Mode"
                    >
                      <Video size={14} /> Cinema
                    </button>
                    <button
                      className={`${styles.moodBtn} ${isMelting ? styles.active : ""}`}
                      onClick={() => setIsMelting(!isMelting)}
                      style={{ flex: 1, gap: 4 }}
                      title="Heat Wave (Melting)"
                    >
                      <Flame size={14} fill={isMelting ? "#FF8C00" : "none"} /> Heat
                    </button>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <div className={styles.statusRow}>
                      <button
                        className={`${styles.moodBtn} ${isSmart ? styles.active : ""}`}
                        onClick={() => setIsSmart(!isSmart)}
                        style={{ flex: 1, gap: 4 }}
                        title="Smart Mode (Architect)"
                      >
                        <Brain size={14} /> Smart
                      </button>
                      <button
                        className={`${styles.moodBtn} ${isPacManMode ? styles.active : ""}`}
                        onClick={() => setPacManMode(!isPacManMode)}
                        style={{ flex: 1, gap: 4 }}
                      >
                        <Sparkles size={14} /> PacMan
                      </button>
                      <button
                        className={`${styles.moodBtn} ${isDancing ? styles.active : ""}`}
                        onClick={() => setIsDancing(!isDancing)}
                        style={{ flex: 1, gap: 4, color: isDancing ? '#f472b6' : undefined, borderColor: isDancing ? '#f472b6' : undefined }}
                        title="Party Mode (Dance)"
                      >
                        <Sparkles size={14} fill={isDancing ? "#f472b6" : "none"} /> Party
                      </button>
                      <button
                        className={styles.moodBtn}
                        onClick={() => {
                          setStormMode(false);
                          setIsAscending(false);
                          setIsDead(false);
                          setChatDisabled(false);
                          setDeathPhase(0);
                        }}
                        style={{ flex: 1, color: '#ef4444' }}
                        disabled={waterLevel === 0 && !isStormMode}
                      >
                        Drain
                      </button>
                    </div>
                  </div>

                  {/* Sauron Controls */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className={styles.sectionTitle} style={{ color: '#ff4500' }}>Sauron Effect</div>

                    <div className={styles.statusRow}>
                      <button
                        className={`${styles.moodBtn} ${isSauronMode ? styles.active : ""}`}
                        onClick={() => setIsSauronMode(!isSauronMode)}
                        style={{ flex: 1, gap: 4, background: isSauronMode ? 'rgba(255, 69, 0, 0.2)' : undefined, borderColor: isSauronMode ? '#ff4500' : undefined }}
                        title="Activate The Eye"
                      >
                        <Zap size={14} fill={isSauronMode ? "#ff4500" : "none"} /> Activate Eye
                      </button>
                      <button
                        className={`${styles.moodBtn} ${followCursorMode ? styles.active : ""}`}
                        onClick={() => setFollowCursorMode(!followCursorMode)}
                        style={{ flex: 1, gap: 4 }}
                        title="Follow Cursor"
                      >
                        <MousePointer2 size={14} /> Tracking
                      </button>
                    </div>

                    {isSauronMode && (
                      <div style={{ marginTop: 6, fontSize: '0.6rem', color: 'rgba(255, 69, 0, 0.6)', textAlign: 'center' }}>
                        The Eye is watching...
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* PAGE 4: Actions & Hunger */}
            {page === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className={styles.sectionTitle} style={{ marginTop: 0 }}>Actions</div>

                {/* CURSED MENU (Moved here) */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <button
                      className={`${styles.moodBtn} ${mood === 'cursed' ? styles.active : ""}`}
                      onClick={() => setShowCursedMenu(!showCursedMenu)}
                      style={{ width: '100%', gap: 4 }}
                    >
                      <Ghost size={14} /> Cursed Menus ▼
                    </button>

                    <AnimatePresence>
                      {showCursedMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: 0,
                            marginBottom: 8,
                            background: '#1a1a1f',
                            border: '1px solid #333',
                            borderRadius: 8,
                            padding: 4,
                            minWidth: '100%',
                            zIndex: 2000,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                          }}
                        >
                          <div className={styles.moodBtn} onClick={() => { setMood('cursed'); setShowCursedMenu(false); }} style={{ justifyContent: 'flex-start' }}>
                            👻 Base Cursed
                          </div>
                          <div
                            className={styles.moodBtn}
                            onClick={() => {
                              setHuntTarget({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                              setIsHunting(true);
                              setShowCursedMenu(false);
                            }}
                            style={{ justifyContent: 'flex-start' }}
                          >
                            🏹 Hunt
                          </div>
                          <div
                            className={styles.moodBtn}
                            onClick={() => {
                              setIsSingularity(true);
                              setShowCursedMenu(false);
                            }}
                            style={{ justifyContent: 'flex-start', color: '#ef4444', borderColor: '#7f1d1d' }}
                          >
                            ⚠ SINGULARITY
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Eat & Spit Section */}
                <div>
                  <div className={styles.sectionTitle}>Hunger</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <select
                      className={styles.moodBtn}
                      style={{ flex: 2, padding: '6px', cursor: 'pointer', outline: 'none' }}
                      value={selectedEatTarget}
                      onChange={(e) => setSelectedEatTarget(e.target.value)}
                    >
                      <option value="">Select Target...</option>
                      <option value="soullink-logo">Header Logo</option>
                      <option value="search-bar">Search Bar</option>
                      <option value="settings-icon">Settings Icon</option>
                      <option value="profile-avatar">Avatar</option>
                      <option value="server-section">Sidebar</option>
                      <option value="main-content">Main Area</option>
                      <option value="message-input">Input Bar</option>
                      <option value="soul-games">Game Tab</option>
                    </select>

                    <button
                      className={styles.moodBtn}
                      style={{ flex: 1, background: isHunting ? '#ef4444' : undefined }}
                      disabled={!selectedEatTarget || isHunting}
                      onClick={() => {
                        if (!selectedEatTarget) return;
                        const targetId = selectedEatTarget;
                        const element = document.querySelector(
                          targetId === 'soullink-logo' ? '[href="/"]' :
                            targetId === 'search-bar' ? 'input[placeholder*="Search"]' :
                              targetId === 'settings-icon' ? '[href="/settings"]' :
                                targetId === 'profile-avatar' ? '[href="/profile"]' :
                                  targetId === 'server-section' ? '[data-eatid="server-section"]' :
                                    targetId === 'find-connection' ? '[href="/match"]' :
                                      targetId === 'group-chat' ? '[href="/group"]' :
                                        targetId === 'soul-games' ? '[href="/games"]' :
                                          targetId === 'main-content' ? '[data-eatid="main-content"]' :
                                            targetId === 'message-input' ? '#chat-input-container' :
                                              targetId === 'call-buttons' ? '[data-eatid="call-buttons"]' :
                                                targetId === 'conversation-search' ? '[data-eatid="conversation-search"]' :
                                                  'button'
                        ) as HTMLElement;

                        if (element) {
                          const rect = element.getBoundingClientRect();
                          if (targetId === 'message-input') {
                            triggerEatInput();
                            return;
                          }

                          setHuntTarget({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                          setIsHunting(true);

                          // Animation Logic (kept concise)
                          if (element.animate) {
                            const frames = [];
                            const TOTAL_FRAMES = 80;
                            const START_RADIUS = 300;
                            for (let i = 0; i <= TOTAL_FRAMES; i++) {
                              const t = i / TOTAL_FRAMES;
                              if (t < 0.1) {
                                frames.push({ transform: `translate(${t * 10}px, ${-t * 10}px) scale(1)`, offset: t });
                                continue;
                              }
                              const progress = (t - 0.1) / 0.9;
                              const radius = START_RADIUS * (1 - progress);
                              const angle = 3 * progress * Math.PI * 2;
                              const x = radius * Math.cos(angle);
                              const y = radius * Math.sin(angle);
                              const stretch = 1 + (progress * 2);
                              const thinness = 1 - (progress * 0.8);
                              const rotation = (angle * 180 / Math.PI) + 45;
                              frames.push({
                                transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${stretch}, ${thinness})`,
                                filter: `blur(${progress > 0.8 ? (progress - 0.8) * 20 : 0}px)`,
                                opacity: 1 - (progress > 0.9 ? (progress - 0.9) * 10 : 0),
                                offset: t
                              });
                            }
                            element.animate(frames, { duration: 2000, easing: 'linear', fill: 'forwards' });
                          }

                          setTimeout(() => {
                            setEatenElements((prev: any[]) => [...prev, { id: targetId, originalRect: rect, element }]);
                            element.style.visibility = 'hidden';
                            setIsHunting(false);
                            setSelectedEatTarget(""); // Reset selection after eating
                          }, 2000);
                        }
                      }}
                    >
                      {isHunting ? "Eating..." : "Eat"}
                    </button>
                  </div>

                  <button
                    className={styles.moodBtn}
                    onClick={() => {
                      if (eatenElements.length > 0) {
                        setIsSpitting(true);
                        setTimeout(() => {
                          eatenElements.forEach(el => {
                            // Cancel WAAPI animations first
                            el.element.getAnimations().forEach(anim => anim.cancel());

                            // Explicitly reset all relevant properties
                            el.element.style.visibility = 'visible';
                            el.element.style.opacity = '1';
                            el.element.style.transform = 'none';
                            el.element.style.filter = 'none';
                            el.element.style.display = ''; // Clear inline display just in case
                          });
                          setEatenElements([]);
                          setIsSpitting(false);
                          if (setMood) setMood('neutral');
                        }, 2500); // Increased to match visual animation duration
                      }
                    }}
                    style={{ width: '100%', gap: 6, background: eatenElements.length > 0 ? '#ef4444' : undefined }}
                    disabled={eatenElements.length === 0}
                  >
                    {eatenElements.length > 0 ? `Spit Out (${eatenElements.length})` : 'Belly Empty'}
                  </button>
                </div>

                {/* Message Trigger */}
                <div style={{ marginTop: 8 }}>
                  <button
                    className={styles.moodBtn}
                    onClick={() => addMessage("Hey Aziz! Ready to dive in? 💫", 'nova')}
                    style={{ width: '100%' }}
                  >
                    Trigger Msg
                  </button>
                </div>
              </motion.div>
            )}

            {/* PAGE 5: Celestial (Good Night Mode) */}
            {page === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className={styles.sectionTitle} style={{ marginTop: 0 }}>Celestial</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className={styles.statusRow}>
                    <button
                      className={`${styles.moodBtn} ${isNightMode ? styles.active : ""}`}
                      onClick={() => setIsNightMode(!isNightMode)}
                      style={{
                        flex: 1,
                        gap: 6,
                        background: isNightMode ? 'rgba(123, 104, 238, 0.2)' : undefined,
                        borderColor: isNightMode ? '#7B68EE' : undefined
                      }}
                      title="Toggle Good Night Mode"
                    >
                      <Sparkles size={14} fill={isNightMode ? "#7B68EE" : "none"} /> Good Night
                    </button>
                  </div>

                  {isNightMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '10px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.7)',
                        textAlign: 'center',
                        lineHeight: 1.4
                      }}
                    >
                      🌙 Moon is rising... <br />
                      Sidebars are becoming a galaxy.
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* PAGINATION CONTROLS */}
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage(page > 0 ? page - 1 : 0)}
                disabled={page === 0}
                style={{ opacity: page === 0 ? 0.3 : 1 }}
              >
                &lt; Prev
              </button>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}>
                {page + 1} / 5
              </div>
              <button
                className={styles.pageBtn}
                onClick={() => setPage(page < 4 ? page + 1 : 4)}
                disabled={page === 4}
                style={{ opacity: page === 4 ? 0.3 : 1 }}
              >
                Next &gt;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className={styles.toggleBtn}
        onClick={toggleOpen}
        whileTap={{ scale: 0.9 }}
      >
        <Settings2 size={24} />
      </motion.button>
    </div>
  );
}
