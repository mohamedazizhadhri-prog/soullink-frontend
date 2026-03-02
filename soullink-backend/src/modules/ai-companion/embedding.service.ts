import { CohereClient } from 'cohere-ai';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';

export class EmbeddingService {
    private client: CohereClient | null = null;

    constructor() {
        if (env.COHERE_API_KEY) {
            this.client = new CohereClient({ token: env.COHERE_API_KEY });
        } else {
            logger.warn('[RAG] COHERE_API_KEY not set. Embedding service disabled.');
        }
    }

    isEnabled(): boolean {
        return !!this.client;
    }

    async embed(text: string): Promise<number[] | null> {
        if (!this.client) return null;
        try {
            const response = await this.client.embed({
                texts: [text.substring(0, 2000)],
                model: 'embed-english-light-v3.0',
                inputType: 'search_document',
            });
            const embeddings = response.embeddings;
            if (Array.isArray(embeddings) && embeddings.length > 0) {
                return embeddings[0] as number[];
            }
            return null;
        } catch (err) {
            logger.error('[RAG] Embedding failed:', err);
            return null;
        }
    }

    async embedQuery(text: string): Promise<number[] | null> {
        if (!this.client) return null;
        try {
            const response = await this.client.embed({
                texts: [text.substring(0, 2000)],
                model: 'embed-english-light-v3.0',
                inputType: 'search_query', // Different input type for queries
            });
            const embeddings = response.embeddings;
            if (Array.isArray(embeddings) && embeddings.length > 0) {
                return embeddings[0] as number[];
            }
            return null;
        } catch (err) {
            logger.error('[RAG] Query embedding failed:', err);
            return null;
        }
    }
}
