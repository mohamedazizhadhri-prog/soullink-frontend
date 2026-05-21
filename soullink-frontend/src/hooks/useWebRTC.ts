"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { socketService } from "@/lib/socket";

// ─── Types ──────────────────────────────────────────────────────────────────
export type CallStatus = "idle" | "ringing" | "connecting" | "active" | "ended";
export type CallType = "audio" | "video";
export type CallMode = "1:1" | "mesh";

export interface VoiceParticipant {
    socketId: string;
    userId: string;
    displayName?: string;
    stream?: MediaStream;
}

interface UseWebRTCOptions {
    mode: CallMode;
    onCallEnded?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useWebRTC({ mode, onCallEnded }: UseWebRTCOptions) {
    const [callStatus, setCallStatus] = useState<CallStatus>("idle");
    const [callType, setCallType] = useState<CallType>("audio");
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [callDuration, setCallDuration] = useState(0);

    const peerRef = useRef<RTCPeerConnection | null>(null);
    const meshPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const targetUserRef = useRef<string | null>(null);
    const callTypeRef = useRef<CallType>("audio");
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activeChannelRef = useRef<string | null>(null);

    // ─── Media Helpers ──────────────────────────────────────────────────
    const getMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
        const constraints: MediaStreamConstraints = {
            audio: true,
            video: type === "video" ? { width: 640, height: 480, facingMode: "user" } : false,
        };
        return navigator.mediaDevices.getUserMedia(constraints);
    }, []);

    const cleanupMedia = useCallback(() => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        screenStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
    }, []);

    const startTimer = useCallback(() => {
        setCallDuration(0);
        timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    // ─── 1:1 Peer Connection ────────────────────────────────────────────
    const createPeerConnection = useCallback((targetUserId: string): RTCPeerConnection => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                socketService.emit("call:ice-candidate", { targetUserId, candidate: ev.candidate.toJSON() });
            }
        };

        pc.ontrack = (ev) => {
            setRemoteStream(ev.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") {
                setCallStatus("active");
                startTimer();
            }
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                endCall();
            }
        };

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        return pc;
    }, [startTimer]);

    // ─── Mesh Peer Connection (community voice) ─────────────────────────
    const createMeshPeer = useCallback((targetSocketId: string, targetUserId: string, initiator: boolean) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                socketService.emit("voice:ice-candidate", { targetSocketId, candidate: ev.candidate.toJSON() });
            }
        };

        pc.ontrack = (ev) => {
            setParticipants((prev) => {
                const existing = prev.find((p) => p.socketId === targetSocketId);
                if (existing) {
                    return prev.map((p) => (p.socketId === targetSocketId ? { ...p, stream: ev.streams[0] } : p));
                }
                return [...prev, { socketId: targetSocketId, userId: targetUserId, stream: ev.streams[0] }];
            });
        };

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        meshPeersRef.current.set(targetSocketId, pc);

        if (initiator) {
            pc.createOffer().then((offer) => {
                pc.setLocalDescription(offer);
                socketService.emit("voice:offer", { targetSocketId, offer });
            });
        }

        return pc;
    }, []);

    // ─── 1:1 Call Actions ───────────────────────────────────────────────
    const startCall = useCallback(async (targetUserId: string, type: CallType, context: "dm" | "match" = "dm", contextId?: string) => {
        try {
            const stream = await getMedia(type);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setCallType(type);
            callTypeRef.current = type;
            targetUserRef.current = targetUserId;
            setCallStatus("ringing");

            socketService.emit("call:initiate", { targetUserId, callType: type, context, contextId });
        } catch (err) {
            console.error("[WebRTC] Failed to get media:", err);
            setCallStatus("idle");
        }
    }, [getMedia]);

    const acceptCall = useCallback(async (callerId: string, type: CallType) => {
        try {
            const stream = await getMedia(type);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setCallType(type);
            callTypeRef.current = type;
            targetUserRef.current = callerId;
            setCallStatus("connecting");

            socketService.emit("call:accept", { callerId, callType: type });
        } catch (err) {
            console.error("[WebRTC] Failed to get media for accepting:", err);
            socketService.emit("call:reject", { callerId });
        }
    }, [getMedia]);

    const rejectCall = useCallback((callerId: string) => {
        socketService.emit("call:reject", { callerId });
    }, []);

    const endCall = useCallback(() => {
        if (targetUserRef.current) {
            socketService.emit("call:end", { targetUserId: targetUserRef.current, callType: callTypeRef.current });
        }
        peerRef.current?.close();
        peerRef.current = null;
        targetUserRef.current = null;
        cleanupMedia();
        stopTimer();
        setCallStatus("idle");
        setCallDuration(0);
        onCallEnded?.();
    }, [cleanupMedia, stopTimer, onCallEnded]);

    // ─── Voice Channel Actions ──────────────────────────────────────────
    const joinVoiceChannel = useCallback(async (channelId: string, communityId?: string, videoEnabled = false) => {
        try {
            const stream = await getMedia(videoEnabled ? "video" : "audio");
            localStreamRef.current = stream;
            setLocalStream(stream);
            setCallType(videoEnabled ? "video" : "audio");
            callTypeRef.current = videoEnabled ? "video" : "audio";
            activeChannelRef.current = channelId;
            setCallStatus("active");
            startTimer();

            socketService.emit("voice:join", { channelId, communityId });
        } catch (err) {
            console.error("[WebRTC] Failed to get media for voice channel:", err);
        }
    }, [getMedia, startTimer]);

    const leaveVoiceChannel = useCallback((communityId?: string) => {
        if (activeChannelRef.current) {
            socketService.emit("voice:leave", { channelId: activeChannelRef.current, communityId });
        }
        meshPeersRef.current.forEach((pc) => pc.close());
        meshPeersRef.current.clear();
        activeChannelRef.current = null;
        cleanupMedia();
        stopTimer();
        setParticipants([]);
        setCallStatus("idle");
        setCallDuration(0);
    }, [cleanupMedia, stopTimer]);

    // ─── Media Controls ─────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
            setIsMuted((m) => !m);
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
            setIsVideoOff((v) => !v);
        }
    }, []);

    const toggleScreenShare = useCallback(async () => {
        const pc = peerRef.current || meshPeersRef.current.values().next().value;
        if (!pc) return;

        if (isScreenSharing && screenStreamRef.current) {
            // Stop screen share, revert to camera
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
            const videoTrack = localStreamRef.current?.getVideoTracks()[0];
            if (videoTrack) {
                const sender = pc.getSenders().find((s) => s.track?.kind === "video");
                sender?.replaceTrack(videoTrack);
            }
            setIsScreenSharing(false);
        } else {
            try {
                const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screen;
                const screenTrack = screen.getVideoTracks()[0];
                const sender = pc.getSenders().find((s) => s.track?.kind === "video");
                sender?.replaceTrack(screenTrack);
                screenTrack.onended = () => toggleScreenShare();
                setIsScreenSharing(true);
            } catch (err) {
                console.error("[WebRTC] Screen share failed:", err);
            }
        }
    }, [isScreenSharing]);

    // ─── Socket Event Listeners ─────────────────────────────────────────
    useEffect(() => {
        socketService.connect();

        // ── 1:1 Call Events ──
        const handleAccepted = async ({ accepterId, callType: ct }: any) => {
            setCallStatus("connecting");
            const pc = createPeerConnection(accepterId);
            peerRef.current = pc;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketService.emit("call:offer", { targetUserId: accepterId, offer });
        };

        const handleRejected = () => {
            cleanupMedia();
            setCallStatus("idle");
        };

        const handleOffer = async ({ callerId, offer }: any) => {
            const pc = createPeerConnection(callerId);
            peerRef.current = pc;
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketService.emit("call:answer", { targetUserId: callerId, answer });
        };

        const handleAnswer = async ({ answererId, answer }: any) => {
            await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        };

        const handleIceCandidate = async ({ candidate }: any) => {
            try {
                await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error("[WebRTC] ICE candidate error:", err);
            }
        };

        const handleEnded = () => {
            peerRef.current?.close();
            peerRef.current = null;
            targetUserRef.current = null;
            cleanupMedia();
            stopTimer();
            setCallStatus("idle");
            setCallDuration(0);
            onCallEnded?.();
        };

        // ── Mesh Voice Events ──
        const handleVoiceMembers = ({ members }: any) => {
            setParticipants(members.map((m: any) => ({ ...m, stream: undefined })));
            // Create peer connections to all existing members
            members.forEach((m: any) => {
                createMeshPeer(m.socketId, m.userId, true);
            });
        };

        const handleVoiceUserJoined = ({ socketId, userId }: any) => {
            setParticipants((prev) => [...prev, { socketId, userId, stream: undefined }]);
            // The joiner will send offers to us — we just prepare
        };

        const handleVoiceUserLeft = ({ socketId }: any) => {
            const pc = meshPeersRef.current.get(socketId);
            if (pc) { pc.close(); meshPeersRef.current.delete(socketId); }
            setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
        };

        const handleVoiceOffer = async ({ senderSocketId, senderId, offer }: any) => {
            const pc = createMeshPeer(senderSocketId, senderId, false);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketService.emit("voice:answer", { targetSocketId: senderSocketId, answer });
        };

        const handleVoiceAnswer = async ({ senderSocketId, answer }: any) => {
            const pc = meshPeersRef.current.get(senderSocketId);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        };

        const handleVoiceIce = async ({ senderSocketId, candidate }: any) => {
            const pc = meshPeersRef.current.get(senderSocketId);
            if (pc) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                catch (err) { console.error("[Voice] ICE error:", err); }
            }
        };

        socketService.on("call:accepted", handleAccepted);
        socketService.on("call:rejected", handleRejected);
        socketService.on("call:offer", handleOffer);
        socketService.on("call:answer", handleAnswer);
        socketService.on("call:ice-candidate", handleIceCandidate);
        socketService.on("call:ended", handleEnded);
        socketService.on("voice:members", handleVoiceMembers);
        socketService.on("voice:user-joined", handleVoiceUserJoined);
        socketService.on("voice:user-left", handleVoiceUserLeft);
        socketService.on("voice:offer", handleVoiceOffer);
        socketService.on("voice:answer", handleVoiceAnswer);
        socketService.on("voice:ice-candidate", handleVoiceIce);

        return () => {
            socketService.off("call:accepted", handleAccepted);
            socketService.off("call:rejected", handleRejected);
            socketService.off("call:offer", handleOffer);
            socketService.off("call:answer", handleAnswer);
            socketService.off("call:ice-candidate", handleIceCandidate);
            socketService.off("call:ended", handleEnded);
            socketService.off("voice:members", handleVoiceMembers);
            socketService.off("voice:user-joined", handleVoiceUserJoined);
            socketService.off("voice:user-left", handleVoiceUserLeft);
            socketService.off("voice:offer", handleVoiceOffer);
            socketService.off("voice:answer", handleVoiceAnswer);
            socketService.off("voice:ice-candidate", handleVoiceIce);
        };
    }, [createPeerConnection, createMeshPeer, cleanupMedia, stopTimer, onCallEnded]);

    return {
        callStatus, callType, callDuration,
        localStream, remoteStream, participants,
        isMuted, isVideoOff, isScreenSharing,
        startCall, acceptCall, rejectCall, endCall,
        joinVoiceChannel, leaveVoiceChannel,
        toggleMute, toggleVideo, toggleScreenShare,
    };
}
