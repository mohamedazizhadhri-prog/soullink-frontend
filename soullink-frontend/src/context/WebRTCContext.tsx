"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { socketService } from "@/lib/socket";

// ─── Types ──────────────────────────────────────────────────────────────────
export type CallStatus = "idle" | "ringing" | "connecting" | "active" | "ended";
export type CallType = "audio" | "video";

export interface VoiceParticipant {
    socketId: string;
    userId: string;
    displayName?: string;
    stream?: MediaStream;
}

export interface IncomingCallInfo {
    callerId: string;
    caller: { id: string; displayName: string; avatarUrl: string | null; handle: string };
    callType: CallType;
    context: "dm" | "match";
    contextId?: string;
}

interface WebRTCState {
    callStatus: CallStatus;
    callType: CallType;
    callDuration: number;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    incomingCall: IncomingCallInfo | null;
    // Exposed actions
    startCall: (targetUserId: string, type: CallType, context?: "dm" | "match", contextId?: string) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    toggleScreenShare: () => Promise<void>;
}

interface VoiceState {
    callStatus: CallStatus;
    callType: CallType;
    callDuration: number;
    localStream: MediaStream | null;
    participants: VoiceParticipant[];
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    joinVoiceChannel: (channelId: string, communityId?: string) => Promise<void>;
    leaveVoiceChannel: (communityId?: string) => void;
    toggleMute: () => void;
    toggleVideo: () => void;
}

interface WebRTCContextValue {
    oneToOne: WebRTCState;
    voice: VoiceState;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

// ─── Context ──────────────────────────────────────────────────────────────────
const WebRTCContext = createContext<WebRTCContextValue | null>(null);

export function useWebRTCContext() {
    const ctx = useContext(WebRTCContext);
    if (!ctx) throw new Error("useWebRTCContext must be used inside WebRTCProvider");
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function WebRTCProvider({ children }: { children: React.ReactNode }) {

    // ── 1:1 Call State ────────────────────────────────────────────────────────
    const [callStatus, setCallStatus] = useState<CallStatus>("idle");
    const [callType, setCallType] = useState<CallType>("audio");
    const [callDuration, setCallDuration] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);

    // ── Voice Channel State ───────────────────────────────────────────────────
    const [voiceStatus, setVoiceStatus] = useState<CallStatus>("idle");
    const [voiceType, setVoiceType] = useState<CallType>("audio");
    const [voiceDuration, setVoiceDuration] = useState(0);
    const [voiceLocalStream, setVoiceLocalStream] = useState<MediaStream | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [voiceMuted, setVoiceMuted] = useState(false);
    const [voiceVideoOff, setVoiceVideoOff] = useState(false);
    const [voiceScreenSharing, setVoiceScreenSharing] = useState(false);

    // ── Refs (not state — avoid re-renders) ───────────────────────────────────
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const targetUserRef = useRef<string | null>(null);
    const callTypeRef = useRef<CallType>("audio");
    const incomingCallRef = useRef<IncomingCallInfo | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const callContextRef = useRef<"dm" | "match" | null>(null);
    const callContextIdRef = useRef<string | null>(null);

    const voiceLocalStreamRef = useRef<MediaStream | null>(null);
    const voiceScreenRef = useRef<MediaStream | null>(null);
    const meshPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const activeChannelRef = useRef<string | null>(null);
    const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Helpers ───────────────────────────────────────────────────────────────
    /**
     * Gets media with graceful fallback:
     *   1. Ideal constraints (width/height ideal, no facingMode enforcement)
     *   2. Bare { video: true } if camera is busy or overconstrained
     *   3. Audio-only if camera is truly unavailable (NotReadableError / NotFoundError)
     */
    const getMedia = useCallback(async (type: CallType): Promise<{ stream: MediaStream; actualType: CallType }> => {
        // Always stop any held-open streams before requesting new ones
        // (second call in same tab would otherwise never get the camera)
        localStreamRef.current?.getTracks().forEach(t => t.stop());

        if (type === 'audio') {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            return { stream, actualType: 'audio' };
        }

        // Try 1: ideal video constraints
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { width: { ideal: 640 }, height: { ideal: 480 } },
            });
            return { stream, actualType: 'video' };
        } catch (e1) {
            const err1 = e1 as DOMException;
            console.warn(`[WebRTC] Preferred camera constraints failed (${err1.name}), trying basic video...`);
        }

        // Try 2: bare video: true (let browser pick)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            return { stream, actualType: 'video' };
        } catch (e2) {
            const err2 = e2 as DOMException;
            console.warn(`[WebRTC] Basic video failed (${err2.name}), falling back to audio-only...`);
        }

        // Try 3: audio-only fallback (camera unavailable / in use by another tab)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.warn('[WebRTC] Camera unavailable — continuing with audio-only call');
        return { stream, actualType: 'audio' };
    }, []);

    const startTimer = useCallback((setter: (n: number) => void, timerRefObj: React.MutableRefObject<ReturnType<typeof setInterval> | null>) => {
        setter(0);
        timerRefObj.current = setInterval(() => setter(d => d + 1), 1000);
    }, []);

    const stopTimer = useCallback((timerRefObj: React.MutableRefObject<ReturnType<typeof setInterval> | null>) => {
        if (timerRefObj.current) clearInterval(timerRefObj.current);
        timerRefObj.current = null;
    }, []);

    // ── RTCPeerConnection Factory — CALLER side (adds tracks first, then offer) ──
    const createCallerPC = useCallback((targetUserId: string): RTCPeerConnection => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                socketService.emit("call:ice-candidate", { targetUserId, candidate: ev.candidate.toJSON() });
            }
        };

        pc.ontrack = (ev) => {
            setRemoteStream(ev.streams[0] || null);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") {
                setCallStatus("active");
                startTimer(setCallDuration, timerRef);
            }
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                endCall();
            }
        };

        // CALLER: add tracks BEFORE createOffer so m-lines are established
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
        }

        return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startTimer]);

    // ── RTCPeerConnection Factory — ANSWERER side (sets remote desc first, then tracks) ──
    const createAnswererPC = useCallback((targetUserId: string): RTCPeerConnection => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                socketService.emit("call:ice-candidate", { targetUserId, candidate: ev.candidate.toJSON() });
            }
        };

        pc.ontrack = (ev) => {
            setRemoteStream(ev.streams[0] || null);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") {
                setCallStatus("active");
                startTimer(setCallDuration, timerRef);
            }
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                endCall();
            }
        };

        // ANSWERER: do NOT add tracks here — they go in after setRemoteDescription

        return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startTimer]);

    // ── Mesh peer for voice channels ──────────────────────────────────────────
    const createMeshPeer = useCallback((targetSocketId: string, targetUserId: string, initiator: boolean) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                socketService.emit("voice:ice-candidate", { targetSocketId, candidate: ev.candidate.toJSON() });
            }
        };

        pc.ontrack = (ev) => {
            setParticipants(prev => {
                const exists = prev.find(p => p.socketId === targetSocketId);
                if (exists) return prev.map(p => p.socketId === targetSocketId ? { ...p, stream: ev.streams[0] } : p);
                return [...prev, { socketId: targetSocketId, userId: targetUserId, stream: ev.streams[0] }];
            });
        };

        if (voiceLocalStreamRef.current) {
            voiceLocalStreamRef.current.getTracks().forEach(t => pc.addTrack(t, voiceLocalStreamRef.current!));
        }

        meshPeersRef.current.set(targetSocketId, pc);

        if (initiator) {
            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer);
                socketService.emit("voice:offer", { targetSocketId, offer });
            });
        }

        return pc;
    }, []);

    // ── 1:1 Call Actions ──────────────────────────────────────────────────────
    const startCall = useCallback(async (targetUserId: string, type: CallType, context: "dm" | "match" = "dm", contextId?: string) => {
        try {
            const { stream, actualType } = await getMedia(type);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setCallType(actualType);
            callTypeRef.current = actualType;
            targetUserRef.current = targetUserId;
            setIsMuted(false);
            setIsVideoOff(false);
            setCallStatus("ringing");
            callContextRef.current = context;
            callContextIdRef.current = contextId || null;
            // Tell remote the actual call type (may be downgraded to audio)
            socketService.emit("call:initiate", { targetUserId, callType: actualType, context, contextId });
        } catch (err) {
            console.error("[WebRTC] Media access fully denied:", err);
            setCallStatus("idle");
        }
    }, [getMedia]);

    const acceptCall = useCallback(async () => {
        const info = incomingCallRef.current;
        if (!info) return;
        try {
            const { stream, actualType } = await getMedia(info.callType);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setCallType(actualType);
            callTypeRef.current = actualType;
            targetUserRef.current = info.callerId;
            setIsMuted(false);
            setIsVideoOff(false);
            setCallStatus("connecting");
            callContextRef.current = info.context;
            callContextIdRef.current = info.contextId || null;
            setIncomingCall(null);
            incomingCallRef.current = null;
            socketService.emit("call:accept", { callerId: info.callerId, callType: actualType });
        } catch (err) {
            console.error("[WebRTC] Media access fully denied for accept:", err);
            socketService.emit("call:reject", { callerId: info.callerId });
            setIncomingCall(null);
            incomingCallRef.current = null;
        }
    }, [getMedia]);

    const rejectCall = useCallback(() => {
        const info = incomingCallRef.current;
        if (info) socketService.emit("call:reject", { callerId: info.callerId });
        setIncomingCall(null);
        incomingCallRef.current = null;
    }, []);

    const endCall = useCallback(() => {
        if (targetUserRef.current) {
            socketService.emit("call:end", {
                targetUserId: targetUserRef.current,
                callType: callTypeRef.current,
                context: callContextRef.current,
                contextId: callContextIdRef.current
            });
        }
        peerRef.current?.close();
        peerRef.current = null;
        targetUserRef.current = null;
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        screenStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        stopTimer(timerRef);
        setCallStatus("idle");
        setCallDuration(0);
        setIsMuted(false);
        setIsVideoOff(false);
        setIsScreenSharing(false);
        callContextRef.current = null;
        callContextIdRef.current = null;
    }, [stopTimer]);

    // ── Voice Channel Actions ─────────────────────────────────────────────────
    const joinVoiceChannel = useCallback(async (channelId: string, communityId?: string) => {
        try {
            const stream = await getMedia("audio");
            voiceLocalStreamRef.current = stream;
            setVoiceLocalStream(stream);
            setVoiceType("audio");
            setVoiceMuted(false);
            setVoiceVideoOff(false);
            activeChannelRef.current = channelId;
            setVoiceStatus("active");
            startTimer(setVoiceDuration, voiceTimerRef);
            socketService.emit("voice:join", { channelId, communityId });
        } catch (err) {
            console.error("[Voice] Media access denied:", err);
        }
    }, [getMedia, startTimer]);

    const leaveVoiceChannel = useCallback((communityId?: string) => {
        if (activeChannelRef.current) {
            socketService.emit("voice:leave", { channelId: activeChannelRef.current, communityId });
        }
        meshPeersRef.current.forEach(pc => pc.close());
        meshPeersRef.current.clear();
        activeChannelRef.current = null;
        voiceLocalStreamRef.current?.getTracks().forEach(t => t.stop());
        voiceScreenRef.current?.getTracks().forEach(t => t.stop());
        voiceLocalStreamRef.current = null;
        voiceScreenRef.current = null;
        setVoiceLocalStream(null);
        setParticipants([]);
        stopTimer(voiceTimerRef);
        setVoiceStatus("idle");
        setVoiceDuration(0);
        setVoiceMuted(false);
        setVoiceVideoOff(false);
        setVoiceScreenSharing(false);
    }, [stopTimer]);

    // ── Media Controls ────────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsMuted(m => !m);
    }, []);

    const toggleVideo = useCallback(() => {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsVideoOff(v => !v);
    }, []);

    const toggleScreenShare = useCallback(async () => {
        const pc = peerRef.current;
        if (!pc) return;
        if (isScreenSharing && screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
            const camTrack = localStreamRef.current?.getVideoTracks()[0];
            if (camTrack) pc.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(camTrack);
            setIsScreenSharing(false);
        } else {
            try {
                const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screen;
                const screenTrack = screen.getVideoTracks()[0];
                pc.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(screenTrack);
                screenTrack.onended = () => toggleScreenShare();
                setIsScreenSharing(true);
            } catch (err) {
                console.error("[WebRTC] Screen share failed:", err);
            }
        }
    }, [isScreenSharing]);

    const voiceToggleMute = useCallback(() => {
        voiceLocalStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setVoiceMuted(m => !m);
    }, []);

    const voiceToggleVideo = useCallback(() => {
        voiceLocalStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setVoiceVideoOff(v => !v);
    }, []);

    // ── Socket Event Listeners (SINGLE source of truth, mounted once) ─────────
    useEffect(() => {
        socketService.connect();

        // — Incoming call from remote —
        const handleIncoming = (data: IncomingCallInfo) => {
            incomingCallRef.current = data;
            setIncomingCall(data);
        };

        // — Remote accepted our outgoing call → we are now CALLER, send offer —
        const handleAccepted = async ({ accepterId }: any) => {
            setCallStatus("connecting");
            const pc = createCallerPC(accepterId);
            peerRef.current = pc;
            targetUserRef.current = accepterId;
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketService.emit("call:offer", { targetUserId: accepterId, offer });
            } catch (err) {
                console.error("[WebRTC] createOffer failed:", err);
                endCall();
            }
        };

        // — Remote rejected our outgoing call —
        const handleRejected = () => {
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            setLocalStream(null);
            setCallStatus("idle");
        };

        // — We receive an offer as ANSWERER — CRITICAL ORDER: setRemote FIRST, then addTrack —
        const handleOffer = async ({ callerId, offer }: any) => {
            try {
                const pc = createAnswererPC(callerId);
                peerRef.current = pc;

                // 1) Set remote description FIRST to lock m-line order
                await pc.setRemoteDescription(new RTCSessionDescription(offer));

                // 2) THEN add local tracks (m-lines will follow offer order)
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
                }

                // 3) Create answer (m-lines now match offer)
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socketService.emit("call:answer", { targetUserId: callerId, answer });
            } catch (err) {
                console.error("[WebRTC] handleOffer failed:", err);
            }
        };

        // — We receive an answer as CALLER —
        const handleAnswer = async ({ answer }: any) => {
            try {
                if (peerRef.current && peerRef.current.signalingState !== "stable") {
                    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                }
            } catch (err) {
                console.error("[WebRTC] setRemoteDescription(answer) failed:", err);
            }
        };

        // — ICE candidate relay —
        const handleIce = async ({ candidate }: any) => {
            try {
                if (peerRef.current?.remoteDescription) {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (err) {
                console.error("[WebRTC] ICE error:", err);
            }
        };

        // — Call ended by remote —
        const handleEnded = () => {
            peerRef.current?.close();
            peerRef.current = null;
            targetUserRef.current = null;
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            screenStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            screenStreamRef.current = null;
            setLocalStream(null);
            setRemoteStream(null);
            stopTimer(timerRef);
            setCallStatus("idle");
            setCallDuration(0);
        };

        // — Call cancelled before answer —
        const handleCancelled = () => {
            setIncomingCall(null);
            incomingCallRef.current = null;
        };

        // — Voice: existing members when joining —
        const handleVoiceMembers = ({ members }: any) => {
            setParticipants(members.map((m: any) => ({ ...m, stream: undefined })));
            members.forEach((m: any) => createMeshPeer(m.socketId, m.userId, true));
        };

        const handleVoiceUserJoined = ({ socketId, userId }: any) => {
            setParticipants(prev => prev.find(p => p.socketId === socketId) ? prev : [...prev, { socketId, userId }]);
        };

        const handleVoiceUserLeft = ({ socketId }: any) => {
            meshPeersRef.current.get(socketId)?.close();
            meshPeersRef.current.delete(socketId);
            setParticipants(prev => prev.filter(p => p.socketId !== socketId));
        };

        // — Mesh offer (answerer side, same fix: setRemote first, then addTrack) —
        const handleVoiceOffer = async ({ senderSocketId, senderId, offer }: any) => {
            try {
                const pc = new RTCPeerConnection(ICE_SERVERS);
                pc.onicecandidate = ev => {
                    if (ev.candidate) socketService.emit("voice:ice-candidate", { targetSocketId: senderSocketId, candidate: ev.candidate.toJSON() });
                };
                pc.ontrack = ev => {
                    setParticipants(prev => {
                        const exists = prev.find(p => p.socketId === senderSocketId);
                        if (exists) return prev.map(p => p.socketId === senderSocketId ? { ...p, stream: ev.streams[0] } : p);
                        return [...prev, { socketId: senderSocketId, userId: senderId, stream: ev.streams[0] }];
                    });
                };
                meshPeersRef.current.set(senderSocketId, pc);

                // Set remote first, then add tracks
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                if (voiceLocalStreamRef.current) {
                    voiceLocalStreamRef.current.getTracks().forEach(t => pc.addTrack(t, voiceLocalStreamRef.current!));
                }
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socketService.emit("voice:answer", { targetSocketId: senderSocketId, answer });
            } catch (err) {
                console.error("[Voice] handleVoiceOffer failed:", err);
            }
        };

        const handleVoiceAnswer = async ({ senderSocketId, answer }: any) => {
            const pc = meshPeersRef.current.get(senderSocketId);
            try {
                if (pc && pc.signalingState !== "stable") {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                }
            } catch (err) {
                console.error("[Voice] setRemoteDescription(answer) failed:", err);
            }
        };

        const handleVoiceIce = async ({ senderSocketId, candidate }: any) => {
            const pc = meshPeersRef.current.get(senderSocketId);
            try {
                if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error("[Voice] ICE error:", err);
            }
        };

        socketService.on("call:incoming", handleIncoming);
        socketService.on("call:accepted", handleAccepted);
        socketService.on("call:rejected", handleRejected);
        socketService.on("call:offer", handleOffer);
        socketService.on("call:answer", handleAnswer);
        socketService.on("call:ice-candidate", handleIce);
        socketService.on("call:ended", handleEnded);
        socketService.on("call:cancelled", handleCancelled);
        socketService.on("voice:members", handleVoiceMembers);
        socketService.on("voice:user-joined", handleVoiceUserJoined);
        socketService.on("voice:user-left", handleVoiceUserLeft);
        socketService.on("voice:offer", handleVoiceOffer);
        socketService.on("voice:answer", handleVoiceAnswer);
        socketService.on("voice:ice-candidate", handleVoiceIce);

        return () => {
            socketService.off("call:incoming", handleIncoming);
            socketService.off("call:accepted", handleAccepted);
            socketService.off("call:rejected", handleRejected);
            socketService.off("call:offer", handleOffer);
            socketService.off("call:answer", handleAnswer);
            socketService.off("call:ice-candidate", handleIce);
            socketService.off("call:ended", handleEnded);
            socketService.off("call:cancelled", handleCancelled);
            socketService.off("voice:members", handleVoiceMembers);
            socketService.off("voice:user-joined", handleVoiceUserJoined);
            socketService.off("voice:user-left", handleVoiceUserLeft);
            socketService.off("voice:offer", handleVoiceOffer);
            socketService.off("voice:answer", handleVoiceAnswer);
            socketService.off("voice:ice-candidate", handleVoiceIce);
        };
    }, [createCallerPC, createAnswererPC, createMeshPeer, endCall, stopTimer]);

    // ── Context Value ─────────────────────────────────────────────────────────
    const value: WebRTCContextValue = {
        oneToOne: {
            callStatus, callType, callDuration,
            localStream, remoteStream,
            isMuted, isVideoOff, isScreenSharing,
            incomingCall,
            startCall, acceptCall, rejectCall, endCall,
            toggleMute, toggleVideo, toggleScreenShare,
        },
        voice: {
            callStatus: voiceStatus,
            callType: voiceType,
            callDuration: voiceDuration,
            localStream: voiceLocalStream,
            participants,
            isMuted: voiceMuted,
            isVideoOff: voiceVideoOff,
            isScreenSharing: voiceScreenSharing,
            joinVoiceChannel, leaveVoiceChannel,
            toggleMute: voiceToggleMute,
            toggleVideo: voiceToggleVideo,
        },
    };

    return <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>;
}
