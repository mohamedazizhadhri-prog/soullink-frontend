import { ApiService } from "./apiService";

export interface InvestigationResult {
    response: string;
}

class AiService extends ApiService {
    async investigate(message: string): Promise<InvestigationResult> {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return this.post<InvestigationResult>('/ai/investigate', { message, timezone });
    }
}

export const aiService = new AiService();
