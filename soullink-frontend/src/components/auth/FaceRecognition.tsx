"use client";

import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import styles from "./Auth.module.css";

interface FaceRecognitionProps {
    mode: "enroll" | "verify";
    onComplete: (descriptor: number[]) => void;
}

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/";

export function FaceRecognition({ mode, onComplete }: FaceRecognitionProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState<"loading" | "ready" | "scanning" | "success" | "error">("loading");
    const [error, setError] = useState<string | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const loadModels = async () => {
            try {
                setStatus("loading");
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                setStatus("ready");
            } catch (err) {
                console.error("Failed to load models:", err);
                setError("Could not load recognition models. Please check your connection.");
                setStatus("error");
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream, isCapturing]);

    useEffect(() => {
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [localStream]);

    const startVideo = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera API not supported in this browser");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            setLocalStream(stream);
            setIsCapturing(true);
        } catch (err: any) {
            console.error("Camera Error:", err);
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setError("Camera access denied. Please allow camera access in your browser settings.");
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setError("No camera found. Please connect a webcam.");
            } else {
                setError("Camera error: " + (err.message || "Unknown error"));
            }
            setStatus("error");
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || !modelsLoaded) return;
        setStatus("scanning");
        try {
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                setStatus("success");
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                }
                onComplete(Array.from(detection.descriptor));
            } else {
                setStatus("ready");
                setError("No face detected. Please adjust your position and try again.");
            }
        } catch (e) {
            console.error("Detection Error:", e);
            setStatus("ready");
        }
    };

    return (
        <div className={styles.faceContainer} style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
            {status === "loading" && (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <RefreshCw className="animate-spin" style={{ margin: '0 auto 1rem' }} />
                    <p>Initializing Neural Networks...</p>
                </div>
            )}

            {status === "ready" && !isCapturing && (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <Camera size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <button className={styles.button} onClick={startVideo}>
                        Enable Camera
                    </button>
                    {error && <p style={{ color: '#ff4d4d', marginTop: '1rem' }}>{error}</p>}
                </div>
            )}

            {(isCapturing || status === "success") && (
                <div style={{ position: 'relative' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{ width: '100%', borderRadius: 16, display: status === "success" ? 'none' : 'block' }}
                    />
                    {status === "scanning" && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                            <RefreshCw className="animate-spin" size={48} />
                        </div>
                    )}
                    {status === "success" && (
                        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(157, 80, 187, 0.1)' }}>
                            <CheckCircle2 size={64} style={{ color: '#9d50bb', margin: '0 auto 1rem' }} />
                            <h3 style={{ color: '#fff' }}>Face captured successfully</h3>
                            <p style={{ color: '#888' }}>Identity fingerprint generated.</p>
                        </div>
                    )}
                </div>
            )}

            {isCapturing && status === "ready" && (
                <button
                    className={styles.button}
                    style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: 'auto', padding: '0.75rem 2rem' }}
                    onClick={handleCapture}
                >
                    Capture Identity
                </button>
            )}

            {status === "error" && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4d' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
                    <p>{error}</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                        <button className={styles.button} onClick={() => window.location.reload()}>
                            Retry
                        </button>
                        <button
                            className={styles.button}
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                            onClick={() => {
                                console.log("Bypassing face recognition for development...");
                                // Return a dummy 128-float descriptor
                                onComplete(new Array(128).fill(0).map(() => Math.random()));
                            }}
                        >
                            Bypass for Dev
                        </button>
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.6, color: '#fff' }}>
                        Tip: Check if another app is using your camera or if permissions are blocked in the address bar.
                    </p>
                </div>
            )}

        </div>
    );
}
