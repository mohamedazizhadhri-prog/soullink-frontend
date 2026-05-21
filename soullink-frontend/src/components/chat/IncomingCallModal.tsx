"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { socketService } from "@/lib/socket";
import styles from "./IncomingCallModal.module.css";

export interface IncomingCallData {
    callerId: string;
    caller: { id: string; displayName: string; avatarUrl: string | null; handle: string };
    callType: "audio" | "video";
    context: "dm" | "match";
    contextId?: string;
}

interface IncomingCallModalProps {
    onAccept: (data: IncomingCallData) => void;
    onReject: (callerId: string) => void;
}

export function IncomingCallModal({ onAccept, onReject }: IncomingCallModalProps) {
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

    useEffect(() => {
        socketService.connect();

        const handleIncoming = (data: IncomingCallData) => {
            setIncomingCall(data);
        };

        const handleCancelled = () => {
            setIncomingCall(null);
        };

        socketService.on("call:incoming", handleIncoming);
        socketService.on("call:ended", handleCancelled);

        return () => {
            socketService.off("call:incoming", handleIncoming);
            socketService.off("call:ended", handleCancelled);
        };
    }, []);

    const handleAccept = useCallback(() => {
        if (incomingCall) {
            onAccept(incomingCall);
            setIncomingCall(null);
        }
    }, [incomingCall, onAccept]);

    const handleReject = useCallback(() => {
        if (incomingCall) {
            onReject(incomingCall.callerId);
            setIncomingCall(null);
        }
    }, [incomingCall, onReject]);

    if (!incomingCall) return null;

    const { caller, callType } = incomingCall;

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                {caller.avatarUrl ? (
                    <img src={caller.avatarUrl} alt={caller.displayName} className={styles.avatar} />
                ) : (
                    <div className={styles.avatarPlaceholder}>
                        {caller.displayName?.[0]?.toUpperCase() || "?"}
                    </div>
                )}
                <h3 className={styles.callerName}>{caller.displayName}</h3>
                <div className={styles.callType}>
                    {callType === "video" ? <Video size={16} /> : <Phone size={16} />}
                    Incoming {callType} call
                </div>
                <div className={styles.actions}>
                    <button className={styles.acceptBtn} onClick={handleAccept} title="Accept">
                        <Phone size={24} />
                    </button>
                    <button className={styles.rejectBtn} onClick={handleReject} title="Reject">
                        <PhoneOff size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}
