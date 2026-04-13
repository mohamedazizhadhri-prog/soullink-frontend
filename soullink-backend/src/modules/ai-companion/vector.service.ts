import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';

export class VectorService {
    private client: Pinecone | null = null;
    private index: ReturnType<Pinecone['index']> | null = null;

    constructor() {
        if (env.PINECONE_API_KEY) {
            try {
                this.client = new Pinecone({ apiKey: env.PINECONE_API_KEY });
                this.index = this.client.index(env.PINECONE_INDEX_NAME);
            } catch (err) {
                logger.warn('[RAG] Failed to initialize Pinecone client:', err);
            }
        } else {
            logger.warn('[RAG] PINECONE_API_KEY not set. Vector service disabled.');
        }
    }

    isEnabled(): boolean {
        return !!this.index;
    }

    /**
     * Saves a message embedding to Pinecone.
     * Called every time a user message is saved to the DB.
     */
    async saveMemory(userId: string, messageId: string, content: string, vector: number[]): Promise<void> {
        if (!this.index) return;
        try {
            await this.index.upsert({
                records: [{
                    id: messageId,
                    values: vector,
                    metadata: {
                        userId,
                        content: content.substring(0, 1000), // Pinecone metadata limit
                        createdAt: new Date().toISOString(),
                    }
                }]
            });
            logger.info(`[RAG] Saved memory for user ${userId}, message ${messageId}`);
        } catch (err) {
            logger.error('[RAG] Failed to save memory to Pinecone:', err);
        }
    }

    /**
     * Searches Pinecone for past messages relevant to the query vector.
     * Returns only the text content of matching memories.
     */
    async searchMemories(userId: string, queryVector: number[], topK = 5): Promise<string[]> {
        if (!this.index) return [];
        try {
            const results = await this.index.query({
                vector: queryVector,
                topK,
                filter: { userId: { $eq: userId } }, // Only search THIS user's memories
                includeMetadata: true,
            });

            return results.matches
                .filter(m => (m.score ?? 0) > 0.70) // Only return high-relevance results
                .map(m => (m.metadata as any)?.content as string)
                .filter(Boolean);
        } catch (err) {
            logger.error('[RAG] Failed to search memories in Pinecone:', err);
            return [];
        }
    }

    /**
     * Deletes all memories for a user (e.g., if they request a memory wipe).
     */
    async deleteUserMemories(userId: string): Promise<void> {
        if (!this.index) return;
        try {
            await this.index.deleteMany({ filter: { userId: { $eq: userId } } });
            logger.info(`[RAG] Deleted all memories for user ${userId}`);
        } catch (err) {
            logger.error('[RAG] Failed to delete user memories:', err);
        }
    }
}

export const vectorService = new VectorService();
