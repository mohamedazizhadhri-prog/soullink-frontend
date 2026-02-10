"use client";

import React from "react";
import styles from "./GroupView.module.css";
import { Moon, Clock, Users, Send, Smile, Paperclip, Mic } from "lucide-react";

export function GroupView() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.groupInfo}>
                    <h2><Moon size={20} color="#FFD700" /> Philosophical Night Owls</h2>
                    <div className={styles.meta}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> Expires in: 14:32:10</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={14} /> 6 Anonymous</span>
                    </div>
                </div>
            </header>

            <div className={styles.chatTimeline}>
                <div className={styles.message}>
                    <div className={styles.messageMeta}>
                        <span className={styles.messageAuthor}>Echo#472</span>
                        <span>14:30</span>
                    </div>
                    <div className={styles.messageContent}>
                        What does it mean to live authentically in a digital world?
                    </div>
                </div>

                <div className={styles.message}>
                    <div className={styles.messageMeta}>
                        <span className={`${styles.messageAuthor} ${styles.aiAuthor}`}>Nova AI</span>
                        <span>14:31</span>
                    </div>
                    <div className={styles.messageContent}>
                        That's a profound question. Authenticity often implies aligning your external actions with your internal values. Perhaps the digital mask allows us to be more truthful than our physical persona?
                    </div>
                </div>

                <div className={`${styles.message} ${styles.messageOwn}`}>
                    <div className={styles.messageMeta}>
                        <span className={styles.messageAuthor}>You</span>
                        <span>14:32</span>
                    </div>
                    <div className={styles.messageContent}>
                        I think anonymity helps shed the expectations others allow us to have...
                    </div>
                </div>
            </div>

            <div className={styles.inputArea}>
                <div className={styles.tools}>
                    <Paperclip size={20} />
                    <Mic size={20} />
                </div>
                <input type="text" className={styles.inputField} placeholder="Type a message..." defaultValue="" />
                <div className={styles.tools}>
                    <Smile size={20} />
                    <Send size={20} color="var(--color-brand-purple)" />
                </div>
            </div>
        </div>
    );
}
