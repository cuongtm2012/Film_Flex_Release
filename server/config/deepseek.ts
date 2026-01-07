import OpenAI from 'openai';

// DeepSeek API configuration
export const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
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
