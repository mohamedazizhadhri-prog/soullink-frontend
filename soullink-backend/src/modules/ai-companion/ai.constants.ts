// src/modules/ai-companion/ai.constants.ts

export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const AI_CONFIG = {
    CONTEXT_WINDOW_SIZE: 20,    // Last N messages to include in prompt
    SUMMARY_TRIGGER_COUNT: 30,  // Regenerate summary every N messages
    MAX_HISTORY_LOAD: 50,       // Max messages returned to frontend
    FACT_EXTRACTION_INTERVAL: 5, // Process facts every N messages
    CONTEXT_CACHE_TTL: 60 * 1000, // 60 seconds
};

export const MODELS = {
    MAIN: 'llama-3.3-70b-versatile',
    LIGHT: 'llama-3.1-8b-instant',
    EMBEDDING: 'embed-english-light-v3.0', // 384 dims to match current index
};
