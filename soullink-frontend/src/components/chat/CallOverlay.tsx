"use client";

import React, { useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, X } from "lucide-react";
import styles from "./CallOverlay.module.css";
import type { CallStatus, CallType, VoiceParticipant } from "@/hooks/useWebRTC";
import { useRingtone, useRemoteAudio } from "@/hooks/useCallAudio";

interface CallOverlayProps {
    status: CallStatus;
    callType: CallType;
    duration: number;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    participants: VoiceParticipant[];
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    callerName?: string;
    callerAvatar?: string | null;
    mode: "1:1" | "mesh";
    onAccept?: () => void;
    onReject?: () => void;
    onEnd: () => void;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: () => void;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function VideoElement({ stream, muted = false, mirror = false }: { stream: MediaStream; muted?: boolean; mirror?: boolean }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
        }
    }, [stream]);
    return <video ref={ref} autoPlay playsInline muted={muted} style={mirror ? { transform: "scaleX(-1)" } : undefined} />;
}

// Hidden audio element for each voice participant — ensures audio plays even in audio-only mode
function AudioSink({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.srcObject = stream;
            ref.current.play().catch(() => {});
        }
    }, [stream]);
    return <audio ref={ref} autoPlay playsInline style={{ display: "none" }} />;
}

export function CallOverlay({
    status, callType, duration,
    localStream, remoteStream, participants,
    isMuted, isVideoOff, isScreenSharing,
    callerName, callerAvatar, mode,
    onAccept, onReject, onEnd,
    onToggleMute, onToggleVideo, onToggleScreenShare,
}: CallOverlayProps) {
    // ── Ringtone: plays when ringing or active incoming ──────────────────
    useRingtone(status === "ringing");

    // ── Remote audio sink: ALWAYS attach remote stream to hidden audio ────
    // This is critical for audio-only calls where no <video> element exists
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    useRemoteAudio(remoteStream, remoteAudioRef);

    if (status === "idle" || status === "ended") return null;

    // ── Ringing / Incoming ──
    if (status === "ringing") {
        return (
            <div className={styles.overlay}>
                {/* Hidden audio sink — always present so remote audio plays */}
                <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

                <div className={styles.ringingContainer}>
                    {callerAvatar ? (
                        <img src={callerAvatar} alt={callerName} className={styles.callerAvatar} />
                    ) : (
                        <div className={styles.callerAvatarPlaceholder}>
                            {callerName?.[0]?.toUpperCase() || "?"}
                        </div>
                    )}
                    <h2 className={styles.callerName}>{callerName || "Unknown"}</h2>
                    <div className={styles.callTypeLabel}>
                        {callType === "video" ? <Video size={18} /> : <Phone size={18} />}
                        {onAccept ? "Incoming" : "Calling"}
                        {" "}{callType} call
                        <div className={styles.ringingDots}>
                            <span /><span /><span />
                        </div>
                    </div>

                    <div className={styles.ringingActions}>
                        {onAccept && (
                            <button className={styles.acceptBtn} onClick={onAccept} title="Accept">
                                <Phone size={28} />
                            </button>
                        )}
                        <button className={styles.rejectBtn} onClick={onReject || onEnd} title={onAccept ? "Reject" : "Cancel"}>
                            <PhoneOff size={28} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Connecting ──
    if (status === "connecting") {
        return (
            <div className={styles.overlay}>
                {/* Hidden audio sink */}
                <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

                <div className={styles.ringingContainer}>
                    {callerAvatar ? (
                        <img src={callerAvatar} alt={callerName} className={styles.callerAvatar} />
                    ) : (
                        <div className={styles.callerAvatarPlaceholder}>
                            {callerName?.[0]?.toUpperCase() || "?"}
                        </div>
                    )}
                    <h2 className={styles.callerName}>Connecting...</h2>
                    <div className={styles.callTypeLabel}>
                        Establishing secure connection
                        <div className={styles.ringingDots}>
                            <span /><span /><span />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Active Call ──
    const isVideoCall = callType === "video";

    // 1:1 active call
    if (mode === "1:1") {
        return (
            <div className={styles.overlay}>
                {/* Hidden audio sink — ensures audio plays even without a visible video element */}
                <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
                <div className={styles.activeCall}>
                    <div className={styles.callHeader}>
                        <span className={styles.callHeaderName}>{callerName}</span>
                        <span className={styles.callTimer}>{formatDuration(duration)}</span>
                    </div>

                    {isVideoCall && remoteStream ? (
                        <>
                            <div className={styles.videoGrid} data-count="1">
                                <div className={styles.videoTile}>
                                    <VideoElement stream={remoteStream} />
                                    <span className={styles.videoTileLabel}>{callerName}</span>
                                </div>
                            </div>
                            {localStream && (
                                <div className={styles.localVideo}>
                                    <VideoElement stream={localStream} muted mirror />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.audioOnlyContainer}>
                            {callerAvatar ? (
                                <img src={callerAvatar} alt={callerName} className={styles.audioAvatar} />
                            ) : (
                                <div className={styles.audioAvatarPlaceholder}>
                                    {callerName?.[0]?.toUpperCase() || "?"}
                                </div>
                            )}
                            <h2 className={styles.callerName}>{callerName}</h2>
                            <span className={styles.callTimer}>{formatDuration(duration)}</span>
                            <div className={styles.audioWaves}>
                                <span /><span /><span /><span /><span />
                            </div>
                        </div>
                    )}

                    <div className={styles.controlBar}>
                        <button
                            className={`${styles.controlBtn} ${isMuted ? styles.controlBtnActive : ""}`}
                            onClick={onToggleMute}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                        </button>
                        {isVideoCall && (
                            <button
                                className={`${styles.controlBtn} ${isVideoOff ? styles.controlBtnActive : ""}`}
                                onClick={onToggleVideo}
                                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                            >
                                {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                            </button>
                        )}
                        {isVideoCall && (
                            <button
                                className={`${styles.controlBtn} ${isScreenSharing ? styles.controlBtnActive : ""}`}
                                onClick={onToggleScreenShare}
                                title={isScreenSharing ? "Stop sharing" : "Share screen"}
                            >
                                <Monitor size={22} />
                            </button>
                        )}
                        <button className={styles.endCallBtn} onClick={onEnd} title="End call">
                            <PhoneOff size={26} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Mesh / Community Voice Call ──
    const streamsToShow = participants.filter((p) => p.stream);
    return (
        <div className={styles.overlay}>
            {/* Hidden audio sinks for each participant */}
            {participants.map(p => p.stream ? (
                <AudioSink key={p.socketId} stream={p.stream} />
            ) : null)}
            <div className={styles.activeCall}>
                <div className={styles.callHeader}>
                    <span className={styles.callHeaderName}>Voice Channel — {participants.length + 1} connected</span>
                    <span className={styles.callTimer}>{formatDuration(duration)}</span>
                </div>

                {isVideoCall && streamsToShow.length > 0 ? (
                    <>
                        <div className={styles.videoGrid} data-count={Math.min(streamsToShow.length, 6)}>
                            {streamsToShow.map((p) => (
                                <div key={p.socketId} className={styles.videoTile}>
                                    {p.stream && <VideoElement stream={p.stream} />}
                                    <span className={styles.videoTileLabel}>{p.displayName || p.userId.slice(0, 8)}</span>
                                </div>
                            ))}
                        </div>
                        {localStream && (
                            <div className={styles.localVideo}>
                                <VideoElement stream={localStream} muted mirror />
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.audioOnlyContainer}>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                            {participants.map((p) => (
                                <div key={p.socketId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                    <div className={styles.audioAvatarPlaceholder} style={{ width: 80, height: 80, fontSize: "1.5rem" }}>
                                        {(p.displayName || p.userId)?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>{p.displayName || p.userId.slice(0, 8)}</span>
                                </div>
                            ))}
                        </div>
                        <span className={styles.callTimer} style={{ marginTop: 24 }}>{formatDuration(duration)}</span>
                        <div className={styles.audioWaves}>
                            <span /><span /><span /><span /><span />
                        </div>
                    </div>
                )}

                <div className={styles.controlBar}>
                    <button
                        className={`${styles.controlBtn} ${isMuted ? styles.controlBtnActive : ""}`}
                        onClick={onToggleMute}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>
                    {isVideoCall && (
                        <button
                            className={`${styles.controlBtn} ${isVideoOff ? styles.controlBtnActive : ""}`}
                            onClick={onToggleVideo}
                            title={isVideoOff ? "Camera on" : "Camera off"}
                        >
                            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                        </button>
                    )}
                    <button className={styles.endCallBtn} onClick={onEnd} title="Leave">
                        <PhoneOff size={26} />
                    </button>
                </div>
            </div>
        </div>
    );
}
