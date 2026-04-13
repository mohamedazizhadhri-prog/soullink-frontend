"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class TtsService {
    private currentAudio: HTMLAudioElement | null = null;

    /**
     * Streams Nova's voice from the SoulLink backend.
     * The backend calls ElevenLabs using its secure server-side API key.
     * Uses MediaSource API once available for true streaming (plays before fully downloaded).
     * Falls back to blob URL for full compatibility.
     */
    async streamSpeech(text: string): Promise<void> {
        if (!text.trim()) return;

        // Stop any currently playing audio immediately
        this.stop();

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/ai/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok || !response.body) {
                console.error(`TTS request failed: ${response.status}`);
                return;
            }

            // Try MediaSource API for lowest latency (play while still downloading)
            if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg')) {
                await this.playWithMediaSource(response.body);
            } else {
                // Fallback: collect full blob then play
                await this.playWithBlob(response);
            }

        } catch (error) {
            console.error('[TTS] Stream failed:', error);
        }
    }

    /**
     * Progressive playback — audio starts as soon as first chunk arrives.
     * Uses MediaSource API (supported in Chrome, Edge, modern browsers).
     */
    private playWithMediaSource(body: ReadableStream<Uint8Array>): Promise<void> {
        return new Promise((resolve, reject) => {
            const mediaSource = new MediaSource();
            const audio = new Audio(URL.createObjectURL(mediaSource));
            this.currentAudio = audio;

            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error('Audio playback error'));

            mediaSource.addEventListener('sourceopen', async () => {
                let sourceBuffer: SourceBuffer;
                try {
                    sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
                } catch (e) {
                    // Codec not supported in this browser, abort and fallback handled externally
                    mediaSource.endOfStream();
                    reject(e);
                    return;
                }

                const reader = body.getReader();
                const appendChunk = async () => {
                    const { done, value } = await reader.read();
                    if (done) {
                        if (mediaSource.readyState === 'open') {
                            mediaSource.endOfStream();
                        }
                        return;
                    }
                    if (sourceBuffer.updating) {
                        await new Promise<void>(r =>
                            sourceBuffer.addEventListener('updateend', () => r(), { once: true })
                        );
                    }
                    sourceBuffer.appendBuffer(value);
                    sourceBuffer.addEventListener('updateend', appendChunk, { once: true });
                };

                // Start audio and begin feeding chunks
                audio.play().catch(reject);
                await appendChunk();
            });
        });
    }

    /**
     * Fallback: download full audio blob then play.
     * Less latency-optimized but universally compatible.
     */
    private async playWithBlob(response: Response): Promise<void> {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        this.currentAudio = audio;
        await audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
    }

    /** Stop any in-progress TTS playback. */
    stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }
}

export const ttsService = new TtsService();
