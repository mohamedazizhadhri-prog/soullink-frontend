"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useWatchPartyContext } from '@/context/WatchPartyContext';
import styles from './WatchPartyInviteToast.module.css';

export function WatchPartyInviteToast() {
    const { invite, clearInvite } = useWatchPartyContext();
    const router = useRouter();

    if (!invite) return null;

    const handleJoin = () => {
        router.push(`/watch-party/${invite.sessionId}`);
        clearInvite();
    };

    return (
        <div className={styles.toast}>
            <div className={styles.content}>
                <div className={styles.avatar}>
                    {invite.hostAvatar ? (
                        <img src={invite.hostAvatar} alt={invite.hostName} />
                    ) : (
                        <div className={styles.avatarPlaceholder}>{invite.hostName[0]}</div>
                    )}
                </div>
                <div className={styles.text}>
                    <p className={styles.title}>
                        <strong>{invite.hostName}</strong> invited you to watch together!
                    </p>
                    {invite.videoTitle && (
                        <p className={styles.videoTitle}>🎬 {invite.videoTitle}</p>
                    )}
                </div>
            </div>
            <div className={styles.actions}>
                <button className={styles.joinBtn} onClick={handleJoin}>Join Party</button>
                <button className={styles.declineBtn} onClick={clearInvite}>Decline</button>
            </div>
        </div>
    );
}
