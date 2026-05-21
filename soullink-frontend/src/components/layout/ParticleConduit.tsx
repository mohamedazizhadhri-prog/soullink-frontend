"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ParticleConduit.module.css";

/* ═══════════════════════════════════════════════════════════════════════════
   Particle Conduit — Cinematic Notification Animation
   
   Three-phase choreographed animation:
     Phase 1: Holographic Shard appears next to SoulLink logo
     Phase 2: Shard collapses → compresses into neon FTL light-line → jumps to bell
     Phase 3: Impact particle burst + shockwave + accretion orb number flip
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ConduitNotification {
  id: string;
  type: string;        // 'request' | 'mention' | 'report' | 'appeal' | 'request_accepted' | etc.
  title: string;
  body: string;
  avatarUrl?: string;
}

type AnimationPhase = "idle" | "shard" | "drifting" | "collapsing" | "ftl" | "impact" | "done";

interface ParticleConduitProps {
  /** Notification to animate. Set to null/undefined to clear. */
  notification: ConduitNotification | null;
  /** Ref to the logo area element (for positioning the shard) */
  logoRef: React.RefObject<HTMLAnchorElement | null>;
  /** Ref to the bell button element (for FTL destination + impact) */
  bellRef: React.RefObject<HTMLButtonElement | null>;
  /** Called when the full animation completes (badge should now show new count) */
  onAnimationComplete: () => void;
}

/* ── Monochrome palette — whites, silvers, soft grays matching site aesthetic ─ */
const COSMIC_COLORS = [
  "#FFFFFF", "#F0F0F5", "#E0E0E8", "#D0D0D8",
  "#C0C0CC", "#B0B0BB", "#A0A0B5", "#E8E8F0",
];

function randomColor() {
  return COSMIC_COLORS[Math.floor(Math.random() * COSMIC_COLORS.length)];
}

/* ── Particle Burst Sub-component ─────────────────────────────────────────── */
function ParticleBurst({ x, y }: { x: number; y: number }) {
  const particles = useRef(
    Array.from({ length: 18 }, () => ({
      id: Math.random().toString(36).slice(2),
      px: (Math.random() - 0.5) * 80,
      py: (Math.random() - 0.5) * 80,
      color: randomColor(),
      size: 2 + Math.random() * 3,
      delay: Math.random() * 0.15,
    }))
  ).current;

  const dust = useRef(
    Array.from({ length: 12 }, () => ({
      id: Math.random().toString(36).slice(2),
      px: (Math.random() - 0.5) * 60,
      py: (Math.random() - 0.5) * 60,
      color: randomColor(),
      delay: Math.random() * 0.1,
    }))
  ).current;

  return (
    <div className={styles.particleBurst} style={{ left: x, top: y }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className={styles.particle}
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 4px ${p.color}`,
            "--px": `${p.px}px`,
            "--py": `${p.py}px`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
      {dust.map((d) => (
        <div
          key={d.id}
          className={styles.cosmicDust}
          style={{
            background: d.color,
            opacity: 0.5,
            left: 0,
            top: 0,
            transform: `translate(${d.px}px, ${d.py}px)`,
            animation: `trailFade 0.8s ease-out ${d.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Shockwave Sub-component ──────────────────────────────────────────────── */
function Shockwave({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <div
      className={`${styles.shockwave} ${delay > 0 ? styles.shockwave2 : ""}`}
      style={{
        left: x,
        top: y,
        animationDelay: `${delay}s`,
      }}
    />
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   Main ParticleConduit Component
   ═══════════════════════════════════════════════════════════════════════════ */
export function ParticleConduit({
  notification,
  logoRef,
  bellRef,
  onAnimationComplete,
}: ParticleConduitProps) {
  const [phase, setPhase] = useState<AnimationPhase>("idle");
  const [currentNotif, setCurrentNotif] = useState<ConduitNotification | null>(null);
  const [impactPos, setImpactPos] = useState<{ x: number; y: number } | null>(null);
  const [shardPos, setShardPos] = useState<{ x: number; y: number } | null>(null);
  const [ftlX, setFtlX] = useState(0);
  const [ftlStartX, setFtlStartX] = useState(0);
  const [shardX, setShardX] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Calculate positions from DOM refs ──────────────────────────────────── */
  const calcPositions = useCallback(() => {
    if (!logoRef?.current || !bellRef?.current) return null;
    const logoRect = logoRef.current.getBoundingClientRect();
    const bellRect = bellRef.current.getBoundingClientRect();
    const headerRect = logoRef.current.closest("header")?.getBoundingClientRect();

    if (!headerRect) return null;

    return {
      shard: {
        x: logoRect.right - headerRect.left + 12,
        y: headerRect.height / 2,
      },
      impact: {
        x: bellRect.left - headerRect.left + bellRect.width / 2,
        y: bellRect.top - headerRect.top + bellRect.height / 2,
      },
      ftlStart: logoRect.right - headerRect.left + 12,
      ftlEnd: bellRect.left - headerRect.left + bellRect.width / 2,
    };
  }, [logoRef, bellRef]);

  /* ── Kick off animation when a new notification arrives ──────────────────── */
  useEffect(() => {
    if (!notification || notification.type === "message") {
      return;
    }

    // Clear any previous animation
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setCurrentNotif(notification);
    setPhase("shard");

    const positions = calcPositions();
    if (positions) {
      setShardPos(positions.shard);
      setImpactPos(positions.impact);
      setFtlStartX(positions.ftlStart);
      setFtlX(positions.ftlStart);
    }

    // Phase 1: Show shard near logo for 1.2s, then drift to center
    timeoutRef.current = setTimeout(() => {
      setPhase("drifting");
      // Calculate center of header for drift destination
      const headerWidth = logoRef.current?.closest("header")?.getBoundingClientRect().width || 800;
      const centerX = headerWidth / 2 - 140; // offset by half shard width
      setShardX(centerX);

      // Stay in center for 2s so user can read, then collapse
      timeoutRef.current = setTimeout(() => {
        setPhase("collapsing");

        // Phase 2: After collapse animation (0.5s), start FTL jump
        timeoutRef.current = setTimeout(() => {
          setPhase("ftl");

        const positions2 = calcPositions();
        if (positions2) {
          setFtlX(positions2.ftlEnd);
        }

          // Phase 3: After FTL travel (0.4s), impact!
          timeoutRef.current = setTimeout(() => {
            setPhase("impact");

            // After impact settles (0.5s), we're done
            timeoutRef.current = setTimeout(() => {
              setPhase("done");
              onAnimationComplete();

              // Clean up after a beat
              timeoutRef.current = setTimeout(() => {
                setPhase("idle");
                setCurrentNotif(null);
                setImpactPos(null);
                setShardPos(null);
              }, 300);
            }, 500);
          }, 400);
        }, 500);
      }, 2000); // 2s pause in center for reading
    }, 1200); // 1.2s near logo before drifting

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [notification, calcPositions, onAnimationComplete]);

  /* ── Dismiss shard early on click ────────────────────────────────────────── */
  const handleShardClick = useCallback(() => {
    if (phase !== "shard" && phase !== "drifting") return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase("collapsing");

    setTimeout(() => {
      setPhase("ftl");
      const positions = calcPositions();
      if (positions) {
        setFtlX(positions.ftlEnd);
      }

      setTimeout(() => {
        setPhase("impact");

        setTimeout(() => {
          setPhase("done");
          onAnimationComplete();

          setTimeout(() => {
            setPhase("idle");
            setCurrentNotif(null);
            setImpactPos(null);
            setShardPos(null);
          }, 300);
        }, 500);
      }, 400);
    }, 500);
  }, [phase, calcPositions, onAnimationComplete]);

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Phase 1 & 2: Holographic Shard ──────────────────────────────── */}
      <AnimatePresence>
        {(phase === "shard" || phase === "drifting" || phase === "collapsing") && currentNotif && shardPos && (
          <div
            className={styles.shardContainer}
            style={{
              left: shardPos.x,
              top: shardPos.y,
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={
                phase === "drifting"
                  ? { opacity: 1, x: shardX - shardPos.x, scale: 1 }
                  : { opacity: 1, x: 0, scale: 1 }
              }
              exit={{ opacity: 0 }}
              transition={
                phase === "drifting"
                  ? { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }
                  : { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }
              }
              className={`${styles.shard} ${phase === "shard" ? styles.shardEnter : ""} ${phase === "collapsing" ? styles.shardCollapsing : ""}`}
              onClick={handleShardClick}
            >
              {currentNotif.avatarUrl ? (
                <img
                  src={currentNotif.avatarUrl}
                  alt=""
                  className={styles.shardAvatar}
                />
              ) : (
                <div className={styles.shardAvatarFallback}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
              <div className={styles.shardContent}>
                <span className={styles.shardTitle}>{currentNotif.title}</span>
                <span className={styles.shardBody}>{currentNotif.body}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Phase 2: FTL Light-Line ──────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "ftl" && shardPos && impactPos && (
          <motion.div
            className={styles.ftlLine}
            initial={{ left: ftlStartX, opacity: 0.8 }}
            animate={{ left: ftlX, opacity: [0.8, 1, 1, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              top: shardPos.y,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Phase 3: Impact Effects ──────────────────────────────────────── */}
      {phase === "impact" && impactPos && (
        <>
          <ParticleBurst x={impactPos.x} y={impactPos.y} />
          <Shockwave x={impactPos.x} y={impactPos.y} />
          <Shockwave x={impactPos.x} y={impactPos.y} delay={0.1} />
        </>
      )}

    </>
  );
}
