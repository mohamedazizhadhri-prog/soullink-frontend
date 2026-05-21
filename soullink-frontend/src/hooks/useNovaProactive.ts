"use client";

import { useCallback } from 'react';
import { aiService } from '@/services/aiService';
import { useNova } from '@/context/NovaContext';
import type { NovaMood } from '@/types/nova.types';

/**
 * Reusable hook for firing proactive Nova events.
 * Handles the full flow: call API → display message → update mood.
 * 
 * Usage:
 *   const { fireEvent } = useNovaProactive();
 *   fireEvent('friend_accepted', { friendName: 'Alice', friendHandle: 'alice' });
 */
export function useNovaProactive() {
    const { addMessage, setMood } = useNova();

    const fireEvent = useCallback(async (trigger: string, payload: Record<string, any> = {}) => {
        const res = await aiService.sendEvent(trigger, payload);
        if (res) {
            addMessage(res.response, 'nova', { isProactive: true });
            setMood(res.mood as NovaMood);
        }
        return res;
    }, [addMessage, setMood]);

    return { fireEvent };
}
