"use client";

import React from "react";
import styles from "./GameView.module.css";
import { Sparkles, Gamepad2 } from "lucide-react";

export function GameView() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span><Gamepad2 size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Episode 2: "Mirror of Truth"</span>
                <span>Progress: 3 / 5</span>
            </div>

            <div className={styles.sceneDisplay}>
                {/* Placeholder for Game Art */}
                <div style={{ opacity: 0.3, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(45deg, #2D2D42, #000)' }}></div>
                <div style={{ zIndex: 1, textAlign: "center" }}>
                    <h3>The Mirror's Reflection</h3>
                    <p style={{ color: '#aaa' }}>Visual Scene Placeholder</p>
                </div>

                <div className={styles.sceneText}>
                    You stand before a mirror that shows not your face, but your soul's deepest desires. Three doors appear behind your reflection.
                </div>
            </div>

            <div className={styles.choices}>
                <button className={styles.choiceBtn}>Left: Truth Door</button>
                <button className={styles.choiceBtn}>Center: Hope</button>
                <button className={styles.choiceBtn}>Right: Fear</button>
            </div>

            <div className={styles.reflectionZone}>
                <div className={styles.aiReflect}>
                    <Sparkles size={16} />
                    <span>Nova: "Assume you chose the Truth Door. Why did this path call to you?"</span>
                </div>
                <textarea className={styles.reflectInput} placeholder="Type your reflection here (min 3 lines)..."></textarea>
                <button className={styles.submitBtn}>Submit to Nova</button>
            </div>
        </div>
    );
}
