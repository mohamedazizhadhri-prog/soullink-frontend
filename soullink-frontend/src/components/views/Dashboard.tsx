"use client";

import React, { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import { Eclipse, Users, MessageCircle, Gamepad2, Sparkles, UserCheck, UserX, Clock } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";

import { useDashboard } from "@/hooks/useDashboard";

export function Dashboard() {
    const { pendingRequests, isLoading, handleRespond } = useDashboard();

    return (
        <div className={styles.container}>
            <Eclipse className={styles.logoLarge} size={120} />

            <h1 className={styles.title}>
                <span className="text-gradient">SoulLink</span>
            </h1>
            <p className={styles.subtitle}>
                Your authentic journey begins here. Connect deeply, play meaningfully, and grow.
            </p>

            {/* Pending Friend Requests Section */}
            {!isLoading && pendingRequests.length > 0 && (
                <div className={styles.pendingSection}>
                    <div className={styles.pendingHeader}>
                        <Clock size={16} />
                        <h3>Pending Friend Requests</h3>
                    </div>
                    <div className={styles.pendingList}>
                        {pendingRequests.map(request => (
                            <div key={request.id} className={styles.pendingItem}>
                                <div className={styles.pendingUserInfo}>
                                    <div className={styles.miniAvatar}>
                                        {request.sender.avatarUrl ? (
                                            <img src={request.sender.avatarUrl} alt={request.sender.displayName} />
                                        ) : (
                                            <span>{request.sender.displayName[0]}</span>
                                        )}
                                    </div>
                                    <div className={styles.pendingInfo}>
                                        <span className={styles.pendingName}>{request.sender.displayName}</span>
                                        <span className={styles.pendingHandle}>@{request.sender.handle}</span>
                                    </div>
                                </div>
                                <div className={styles.pendingActions}>
                                    <button
                                        className={styles.acceptBtn}
                                        onClick={() => handleRespond(request.id, 'accept')}
                                        title="Accept"
                                    >
                                        <UserCheck size={18} />
                                    </button>
                                    <button
                                        className={styles.declineBtn}
                                        onClick={() => handleRespond(request.id, 'decline')}
                                        title="Decline"
                                    >
                                        <UserX size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
