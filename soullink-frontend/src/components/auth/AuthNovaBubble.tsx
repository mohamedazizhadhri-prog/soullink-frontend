"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { NovaAvatar } from '@/components/ai/NovaAvatar';

type FormState = 'idle' | 'emailFocus' | 'emailTyping' | 'emailFilled' | 'passwordFocus' | 'passwordTyping' | 'buttonHover' | 'loading' | 'error' | 'success';

interface AuthNovaBubbleProps {
    message: string | null;
    isScanning?: boolean;
    isSuccess?: boolean;
    isError?: boolean;
    size?: number;
    disableCuriousMode?: boolean;
    formState?: FormState;
}

// Determines which Nova mood to show per form state
function getNovaOverride(formState: FormState, isSuccess: boolean, isError: boolean, isScanning: boolean, message: string | null): string {
    if (isSuccess) return 'happy';
    if (isError) return 'sad';
    if (isScanning) return 'hunting';
    switch (formState) {
        case 'emailFocus': return 'curious';
        case 'emailTyping': return 'thinking';
        case 'emailFilled': return 'neutral';
        case 'passwordFocus': return 'blushed';
        case 'passwordTyping': return 'blushed';
        case 'buttonHover': return 'happy';
        case 'loading': return 'thinking';
        case 'error': return 'sad';
        case 'success': return 'happy';
        default:
            if (message?.includes('?')) return 'thinking';
            if (message?.includes('!')) return 'surprised';
            return 'neutral';
    }
}

// Orb wrapper animation per form state
function getOrbAnimation(formState: FormState, isSuccess: boolean, isError: boolean): object {
    if (isSuccess) return { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] };
    if (isError) return { x: [-8, 8, -8, 8, -4, 4, 0], rotate: [0, -3, 3, -3, 0] };
    switch (formState) {
        case 'emailFocus':
            return { scale: [1, 1.05, 1], rotate: [0, -4, 0], y: [0, -8, 0] };
        case 'emailTyping':
            return { x: [0, 3, -3, 0], y: [0, -6, 0] };
        case 'passwordFocus':
            return { rotate: [0, -15, 0], scale: [1, 0.92, 0.95] };
        case 'passwordTyping':
            return { rotate: [0, -18, 0], scale: [1, 0.9, 0.92] };
        case 'buttonHover':
            return { scale: [1, 1.08, 1.05], y: [0, -14, -10] };
        case 'loading':
            return { rotate: [0, 10, -10, 5, -5, 0], scale: [1, 0.95, 1] };
        default:
            return { y: [0, -12, 0] };
    }
}

function getOrbTransition(formState: FormState, isSuccess: boolean, isError: boolean): object {
    if (isError) return { duration: 0.5, ease: 'easeOut' };
    if (isSuccess) return { duration: 0.7, repeat: 2 };
    switch (formState) {
        case 'emailFocus': return { duration: 0.6, ease: 'easeOut' };
        case 'emailTyping': return { duration: 0.3, repeat: Infinity, repeatType: 'mirror' };
        case 'passwordFocus': return { duration: 0.5, ease: 'easeOut' };
        case 'passwordTyping': return { duration: 0.4, ease: 'easeOut' };
        case 'buttonHover': return { duration: 0.5, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror' };
        case 'loading': return { duration: 1.2, repeat: Infinity, ease: 'easeInOut' };
        default: return { y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } };
    }
}

export function AuthNovaBubble({
    message,
    isScanning = false,
    isSuccess = false,
    isError = false,
    size = 240,
    disableCuriousMode = false,
    formState = 'idle'
}: AuthNovaBubbleProps) {
    const overrideMood = getNovaOverride(formState, isSuccess, isError, isScanning, message);
    const orbAnimation = getOrbAnimation(formState, isSuccess, isError);
    const orbTransition = getOrbTransition(formState, isSuccess, isError);

    // Glow color per form state
    const glowColor = isSuccess ? 'rgba(74, 222, 128, 0.6)'
        : isError ? 'rgba(248, 113, 113, 0.6)'
            : formState === 'emailFocus' || formState === 'emailTyping' ? 'rgba(0, 191, 255, 0.5)'
                : formState === 'passwordFocus' || formState === 'passwordTyping' ? 'rgba(236, 72, 153, 0.5)'
                    : formState === 'buttonHover' ? 'rgba(251, 191, 36, 0.6)'
                        : formState === 'loading' ? 'rgba(167, 139, 250, 0.4)'
                            : 'rgba(157, 80, 187, 0.4)';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '2rem',
            position: 'relative',
            minHeight: size + 60
        }}>
            {/* The Chat Bubble */}
            <AnimatePresence mode="wait">
                {message && (
                    <motion.div
                        key={message}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        style={{
                            background: 'rgba(20, 20, 40, 0.85)',
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${formState === 'passwordFocus' || formState === 'passwordTyping' ? 'rgba(236, 72, 153, 0.4)' : formState === 'emailFocus' || formState === 'emailTyping' ? 'rgba(0, 191, 255, 0.4)' : formState === 'buttonHover' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(157, 80, 187, 0.4)'}`,
                            padding: '16px 24px',
                            borderRadius: '24px',
                            color: '#fff',
                            fontSize: '1.05rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            maxWidth: '320px',
                            marginBottom: '2rem',
                            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${glowColor}`,
                            zIndex: 10,
                            position: 'relative',
                            transition: 'border-color 0.4s ease, box-shadow 0.4s ease'
                        }}
                    >
                        {message}
                        <div style={{
                            position: 'absolute',
                            bottom: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '12px',
                            height: '12px',
                            background: 'rgba(20, 20, 40, 1)',
                            borderRight: '1px solid rgba(157, 80, 187, 0.3)',
                            borderBottom: '1px solid rgba(157, 80, 187, 0.3)',
                            zIndex: -1
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Nova Orb */}
            <motion.div
                key={`orb-${formState}`}
                animate={orbAnimation as any}
                transition={orbTransition as any}
                style={{
                    position: 'relative',
                    width: size,
                    height: size,
                    filter: `drop-shadow(0 0 ${formState === 'buttonHover' ? '55px' : '35px'} ${glowColor})`,
                    zIndex: 5,
                    transition: 'filter 0.4s ease',
                }}
            >
                <NovaAvatar
                    size={size}
                    overrideMood={overrideMood}
                    disableCuriousMode={disableCuriousMode}
                    isTypingPassword={formState === 'passwordFocus' || formState === 'passwordTyping'}
                />
            </motion.div>

            {/* Scanning Overlay */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 0.5, height: '100%' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            width: size + 40,
                            background: 'linear-gradient(to bottom, transparent, rgba(74, 222, 128, 0.4))',
                            borderBottom: '2px solid rgb(74, 222, 128)',
                            zIndex: 20,
                            pointerEvents: 'none'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Loading ring */}
            <AnimatePresence>
                {formState === 'loading' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1, rotate: 360 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.3 } }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: size + 20,
                            height: size + 20,
                            borderRadius: '50%',
                            border: '2px solid transparent',
                            borderTop: '2px solid rgba(167, 139, 250, 0.7)',
                            borderRight: '2px solid rgba(167, 139, 250, 0.3)',
                            zIndex: 6,
                            pointerEvents: 'none',
                            marginTop: 30,
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Pulse ring on email/password fill */}
            <AnimatePresence>
                {(formState === 'emailFilled' || formState === 'success') && (
                    <motion.div
                        key={formState}
                        initial={{ opacity: 0.8, scale: 0.9 }}
                        animate={{ opacity: 0, scale: 1.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: size,
                            height: size,
                            borderRadius: '50%',
                            background: formState === 'success' ? 'rgba(74, 222, 128, 0.25)' : 'rgba(0, 191, 255, 0.25)',
                            zIndex: 4,
                            pointerEvents: 'none',
                            marginTop: 30,
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
