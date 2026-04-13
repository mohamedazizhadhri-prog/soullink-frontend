import { AIService } from './src/modules/ai-companion/ai.service.js';
import { prisma } from './src/config/database.js';
import dotenv from 'dotenv';
import { VectorService } from './src/modules/ai-companion/vector.service.js';
import { EmbeddingService } from './src/modules/ai-companion/embedding.service.js';

dotenv.config();

const vectorService = new VectorService();
const embeddingService = new EmbeddingService();

async function runTest() {
    console.log('--- Pinecone Insertion Test ---');

    const testUserId = 'user_test_123';
    const testContent = 'This is a test memory inserted at ' + new Date().toLocaleString();

    try {
        console.log('1. Generating embedding for content...');
        const vector = await embeddingService.embed(testContent);

        if (!vector) {
            throw new Error('Failed to generate embedding');
        }
        console.log('   Success! Vector generated.');

        console.log('2. Inserting into Pinecone...');
        const messageId = 'test-msg-' + Date.now();
        await vectorService.saveMemory(testUserId, messageId, testContent, vector);

        console.log('--- FINISHED ---');
        console.log('Check your Pinecone dashboard for:');
        console.log(`- ID: ${messageId}`);
        console.log(`- Metadata.userId: ${testUserId}`);
        console.log(`- Metadata.content: ${testContent}`);
    } catch (error) {
        console.error('Error during test:', error);
    }
}

runTest();
