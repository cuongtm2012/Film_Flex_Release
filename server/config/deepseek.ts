import OpenAI from 'openai';
import { storage } from '../storage.js';

// DeepSeek client instance
let deepseekClient: OpenAI | null = null;
let currentApiKey: string | null = null;

// Initialize DeepSeek client with API key from database
async function initializeDeepSeek(): Promise<OpenAI | null> {
    try {
        // Try to get API key from database first
        const settings = await storage.getAllSettings('api_keys');
        const apiKey = settings.deepseek_api_key || process.env.DEEPSEEK_API_KEY;

        if (!apiKey) {
            console.warn('[DeepSeek] No API key configured. DeepSeek features will be unavailable.');
            return null;
        }

        // Only create new client if API key changed
        if (apiKey !== currentApiKey) {
            currentApiKey = apiKey;
            deepseekClient = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.deepseek.com'
            });
            console.log('[DeepSeek] Client initialized successfully');
        }

        return deepseekClient;
    } catch (error) {
        console.error('[DeepSeek] Failed to initialize client:', error);
        return null;
    }
}

// Get DeepSeek client instance (lazy initialization)
export async function getDeepSeek(): Promise<OpenAI | null> {
    if (!deepseekClient) {
        return await initializeDeepSeek();
    }
    return deepseekClient;
}

// Update API key and reinitialize client
export async function updateDeepSeekApiKey(apiKey: string): Promise<void> {
    currentApiKey = apiKey;
    deepseekClient = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.deepseek.com'
    });
    console.log('[DeepSeek] API key updated successfully');
}

// Legacy export for backward compatibility (will be removed)
export const deepseek = await initializeDeepSeek() || new OpenAI({
    apiKey: 'dummy-key',
    baseURL: 'https://api.deepseek.com'
});

// Helper function for chat completions
export async function chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
        temperature?: number;
        maxTokens?: number;
        responseFormat?: 'text' | 'json';
    }
) {
    try {
        const response = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: messages as any, // DeepSeek uses OpenAI-compatible types
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 1000,
            ...(options?.responseFormat === 'json' && {
                response_format: { type: 'json_object' }
            })
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('DeepSeek API error:', error);
        throw error;
    }
}

// Test connection
export async function testConnection(): Promise<boolean> {
    try {
        await chatCompletion([
            { role: 'user', content: 'Hello' }
        ], { maxTokens: 10 });
        return true;
    } catch (error) {
        console.error('DeepSeek connection test failed:', error);
        return false;
    }
}
