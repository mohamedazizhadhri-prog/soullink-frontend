import { ApiService } from "./apiService";

export interface InvestigationResult {
    response: string;
}

export interface NovaEventResponse {
    response: string;
    mood: string;
}

class AiService extends ApiService {
    async investigate(message: string): Promise<InvestigationResult> {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return this.post<InvestigationResult>('/ai/investigate', { message, timezone });
    }

    /**
     * Fire a proactive event to Nova. Returns her response + mood, or null if skipped/failed.
     * Designed for fire-and-forget usage — callers should .then() the result, not await.
     */
    async sendEvent(trigger: string, payload: Record<string, any> = {}): Promise<NovaEventResponse | null> {
        try {
            const res = await this.post<any>('/ai/event', { trigger, payload });
            if (res?.skipped) return null;
            return res as NovaEventResponse;
        } catch {
            return null;
        }
    }
}

export const aiService = new AiService();
