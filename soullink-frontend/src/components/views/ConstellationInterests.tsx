"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./ConstellationInterests.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface ConstellationInterestsProps {
  categories: Record<string, string[]>;
  selectedInterests: string[];
  toggleInterest: (interest: string) => void;
}

/* Category color themes — vibrant neon accents, each category unique */
const CATEGORY_THEMES: Record<string, { glow: string; border: string; text: string; bg: string }> = {
  // Electric Purple — Gaming energy
  GAMING: { glow: "rgba(176, 38, 255, 0.6)", border: "rgba(176, 38, 255, 0.4)", text: "#e8a8ff", bg: "rgba(176, 38, 255, 0.12)" },
  // Hot Magenta — Creative passion
  CREATIVE: { glow: "rgba(255, 20, 147, 0.55)", border: "rgba(255, 20, 147, 0.35)", text: "#ffa8d8", bg: "rgba(255, 20, 147, 0.1)" },
  // Cyan Blue — Intellectual clarity
  INTELLECTUAL: { glow: "rgba(0, 210, 255, 0.55)", border: "rgba(0, 210, 255, 0.35)", text: "#a8f0ff", bg: "rgba(0, 210, 255, 0.1)" },
  // Coral Orange — Lifestyle warmth
  LIFESTYLE: { glow: "rgba(255, 100, 80, 0.55)", border: "rgba(255, 100, 80, 0.35)", text: "#ffb8a8", bg: "rgba(255, 100, 80, 0.1)" },
  // Gold Amber — Music rhythm
  MUSIC: { glow: "rgba(255, 180, 0, 0.6)", border: "rgba(255, 180, 0, 0.4)", text: "#ffe8a8", bg: "rgba(255, 180, 0, 0.12)" },
  // Lime Green — Sports vitality
  SPORTS: { glow: "rgba(140, 255, 0, 0.55)", border: "rgba(140, 255, 0, 0.35)", text: "#d8ffa8", bg: "rgba(140, 255, 0, 0.1)" },
  // Electric Blue — Tech innovation
  TECHNOLOGY: { glow: "rgba(0, 130, 255, 0.55)", border: "rgba(0, 130, 255, 0.35)", text: "#a8d8ff", bg: "rgba(0, 130, 255, 0.1)" },
  // Rose Pink — Social connection
  SOCIAL: { glow: "rgba(255, 105, 180, 0.55)", border: "rgba(255, 105, 180, 0.35)", text: "#ffa8d0", bg: "rgba(255, 105, 180, 0.1)" },
  // Teal — Wellness balance
  WELLNESS: { glow: "rgba(0, 200, 180, 0.55)", border: "rgba(0, 200, 180, 0.35)", text: "#a8f8f0", bg: "rgba(0, 200, 180, 0.1)" },
  // Indigo — Science depth
  SCIENCE: { glow: "rgba(110, 80, 255, 0.55)", border: "rgba(110, 80, 255, 0.35)", text: "#c8b8ff", bg: "rgba(110, 80, 255, 0.1)" },
  // Crimson — Entertainment drama
  ENTERTAINMENT: { glow: "rgba(220, 20, 60, 0.55)", border: "rgba(220, 20, 60, 0.35)", text: "#ffa8b8", bg: "rgba(220, 20, 60, 0.1)" },
  // Emerald — Nature organic
  NATURE: { glow: "rgba(0, 220, 150, 0.55)", border: "rgba(0, 220, 150, 0.35)", text: "#a8ffd0", bg: "rgba(0, 220, 150, 0.1)" },
  // Silver — Art elegance
  ART: { glow: "rgba(192, 192, 255, 0.5)", border: "rgba(192, 192, 255, 0.3)", text: "#e0e0ff", bg: "rgba(192, 192, 255, 0.08)" },
  // Violet — Spirituality mystic
  SPIRITUALITY: { glow: "rgba(180, 100, 255, 0.55)", border: "rgba(180, 100, 255, 0.35)", text: "#e0c8ff", bg: "rgba(180, 100, 255, 0.1)" },
  // Orange — Food appetite
  FOOD: { glow: "rgba(255, 140, 0, 0.6)", border: "rgba(255, 140, 0, 0.4)", text: "#ffd8a8", bg: "rgba(255, 140, 0, 0.12)" },
  DEFAULT: { glow: "rgba(180, 180, 220, 0.4)", border: "rgba(180, 180, 220, 0.25)", text: "#e0e0f0", bg: "rgba(180, 180, 220, 0.08)" },
};

function getCategoryTheme(category: string) {
  const key = category.toUpperCase().replace(/\s+/g, "");
  return CATEGORY_THEMES[key] || CATEGORY_THEMES.DEFAULT;
}

/* Star particle background */
function StarField() {
  const stars = useRef(
    Array.from({ length: 60 }, () => ({
      id: Math.random().toString(36).slice(2),
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.5 + Math.random() * 1.5,
      opacity: 0.1 + Math.random() * 0.4,
      delay: Math.random() * 5,
    }))
  ).current;

  return (
    <div className={styles.starField}>
      {stars.map((s) => (
        <div
          key={s.id}
          className={styles.star}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* Single Bento Box Category */
function BentoCategory({
  category,
  tags,
  selectedInterests,
  toggleInterest,
  index,
}: {
  category: string;
  tags: string[];
  selectedInterests: string[];
  toggleInterest: (interest: string) => void;
  index: number;
}) {
  const theme = getCategoryTheme(category);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Calculate staggered position
  const staggerOffset = index % 2 === 0 ? 0 : 60;
  const staggerY = index % 3 === 0 ? 0 : index % 3 === 1 ? 30 : -20;

  return (
    <motion.div
      ref={categoryRef}
      className={styles.bentoBox}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        marginLeft: `${staggerOffset}px`,
        marginTop: `${staggerY}px`,
        ["--category-glow" as string]: theme.glow,
        ["--category-border" as string]: theme.border,
        ["--category-text" as string]: theme.text,
        ["--category-bg" as string]: theme.bg,
      } as React.CSSProperties}
    >
      {/* Category Header with glow */}
      <div className={styles.categoryHeader}>
        <h3 className={styles.categoryTitle}>{category}</h3>
        <div className={styles.headerGlow} />
      </div>

      {/* Tags constellation */}
      <div className={styles.constellationGrid}>
        {tags.map((tag, tagIndex) => {
          const isSelected = selectedInterests.includes(tag);
          const isHovered = hoveredTag === tag;

          return (
            <motion.button
              key={tag}
              data-tag={tag}
              className={`${styles.tagNode} ${isSelected ? styles.tagSelected : ""}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 + tagIndex * 0.03 }}
              onClick={() => toggleInterest(tag)}
              onMouseEnter={() => setHoveredTag(tag)}
              onMouseLeave={() => setHoveredTag(null)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Point of Light — the glowing dot anchor */}
              <span className={`${styles.pointOfLight} ${isSelected ? styles.pointActive : ""}`} />

              {/* Tag text */}
              <span className={styles.tagText}>{tag}</span>

              {/* Hover energy orb */}
              <AnimatePresence>
                {isHovered && !isSelected && (
                  <motion.div
                    className={styles.energyOrb}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>

              {/* Selected Core Nucleus glow */}
              {isSelected && (
                <motion.div
                  className={styles.coreNucleus}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Constellation lines — connecting selected tags within this category */}
      <ConstellationLines
        categoryRef={categoryRef}
        tags={tags}
        selectedInterests={selectedInterests}
      />
    </motion.div>
  );
}

/* SVG lines connecting selected tags to form constellation */
function ConstellationLines({
  categoryRef,
  tags,
  selectedInterests,
}: {
  categoryRef: React.RefObject<HTMLDivElement | null>;
  tags: string[];
  selectedInterests: string[];
}) {
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);

  const updateLines = useCallback(() => {
    if (!categoryRef.current) return;

    const selected = tags.filter((t) => selectedInterests.includes(t));
    if (selected.length < 2) {
      setLines([]);
      return;
    }

    const containerRect = categoryRef.current.getBoundingClientRect();
    const points: Array<{ x: number; y: number }> = [];

    selected.forEach((tag) => {
      const tagEl = categoryRef.current?.querySelector(`[data-tag="${tag}"]`);
      if (tagEl) {
        const rect = tagEl.getBoundingClientRect();
        points.push({
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        });
      }
    });

    // Connect consecutive points
    const newLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < points.length - 1; i++) {
      newLines.push({
        x1: points[i].x,
        y1: points[i].y,
        x2: points[i + 1].x,
        y2: points[i + 1].y,
      });
    }

    setLines(newLines);
  }, [tags, selectedInterests, categoryRef]);

  useEffect(() => {
    updateLines();
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [updateLines]);

  if (lines.length === 0) return null;

  return (
    <svg className={styles.constellationSvg}>
      {lines.map((line, i) => (
        <motion.line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.4 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        />
      ))}
    </svg>
  );
}

/* Main Component */
export function ConstellationInterests({
  categories,
  selectedInterests,
  toggleInterest,
}: ConstellationInterestsProps) {
  return (
    <div className={styles.constellationContainer}>
      {/* Deep space background */}
      <StarField />

      {/* Nebula gas clouds */}
      <div className={styles.nebulaCloud1} />
      <div className={styles.nebulaCloud2} />

      {/* Bento grid */}
      <div className={styles.bentoGrid}>
        {Object.entries(categories).map(([category, tags], index) => (
          <BentoCategory
            key={category}
            category={category}
            tags={tags}
            selectedInterests={selectedInterests}
            toggleInterest={toggleInterest}
            index={index}
          />
        ))}
      </div>

      {/* Selected count indicator */}
      <motion.div
        className={styles.selectionCounter}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className={styles.counterGlow} />
        <span className={styles.counterText}>{selectedInterests.length}</span>
        <span className={styles.counterLabel}>interests selected</span>
      </motion.div>
    </div>
  );
}
