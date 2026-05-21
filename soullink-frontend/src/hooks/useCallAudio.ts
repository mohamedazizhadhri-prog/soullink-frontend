"use client";

import { useEffect, useRef, RefObject } from "react";

/**
 * Manages call audio:
 *  - Plays a classic double-ring ringtone via Web Audio API when ringing
 *  - Attaches the remote MediaStream to a hidden <audio> element so audio flows even in audio-only calls
 */

// ── Ringtone via Web Audio API ───────────────────────────────────────────────
function playRingPattern(ctx: AudioContext) {
    const now = ctx.currentTime;

    const ring = (startAt: number, dur: number, freq1: number, freq2: number) => {
        [freq1, freq2].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);

            const t = startAt + i * 0.06; // slight stagger for warmth
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
            gain.gain.setValueAtTime(0.18, t + dur - 0.05);
            gain.gain.linearRampToValueAtTime(0, t + dur);

            osc.start(t);
            osc.stop(t + dur);
        });
    };

    // Double ring pattern: ring-ring ... pause ... ring-ring
    ring(now + 0.0, 0.35, 480, 620);
    ring(now + 0.5, 0.35, 480, 620);
    // second double ring after 2s pause
    ring(now + 2.0, 0.35, 480, 620);
    ring(now + 2.5, 0.35, 480, 620);
}

export function useRingtone(active: boolean) {
    const ctxRef = useRef<AudioContext | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (active) {
            // AudioContext must be created in response to user gesture or on mobile
            // use a try/catch since autoplay policies vary
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                ctxRef.current = ctx;

                const startLoop = () => {
                    playRingPattern(ctx);
                    intervalRef.current = setInterval(() => playRingPattern(ctx), 4500);
                };

                // Some browsers need resume() after creation
                if (ctx.state === "suspended") {
                    ctx.resume().then(startLoop);
                } else {
                    startLoop();
                }
            } catch (err) {
                console.warn("[Ringtone] AudioContext not available:", err);
            }
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            ctxRef.current?.close();
            ctxRef.current = null;
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            ctxRef.current?.close();
            ctxRef.current = null;
        };
    }, [active]);
}

// ── Remote Stream Audio Sink ──────────────────────────────────────────────────
/**
 * Attaches a remote MediaStream to a hidden <audio> element.
 * This is essential for audio-only calls where no <video> element is rendered.
 * For video calls the <video> element handles audio too, but this hook is harmless.
 */
export function useRemoteAudio(remoteStream: MediaStream | null, audioRef: RefObject<HTMLAudioElement>) {
    useEffect(() => {
        if (audioRef.current) {
            if (remoteStream) {
                audioRef.current.srcObject = remoteStream;
                audioRef.current.play().catch(err => {
                    console.warn("[RemoteAudio] Autoplay blocked:", err);
                });
            } else {
                audioRef.current.srcObject = null;
            }
        }
    }, [remoteStream, audioRef]);
}
