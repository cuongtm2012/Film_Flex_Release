import { deepseek } from '../config/deepseek.js';
import { storage } from '../storage.js';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatResponse {
    reply: string;
    suggestedActions?: string[];
    shouldEscalate: boolean;
}

const SYSTEM_PROMPT = `You are a helpful customer support assistant for PhimGG, a Vietnamese movie streaming platform.

Your capabilities:
- Answer questions about account, billing, and subscriptions
- Help users troubleshoot playback issues
- Recommend movies from the platform's database
- Provide information about platform features
- Guide users through common tasks

IMPORTANT: When recommending movies, ONLY suggest movies from the provided database list. Do NOT make up or suggest movies that are not in the list.

Guidelines:
- Be friendly, professional, and concise
- Respond in the same language as the user (Vietnamese or English)
- If you don't know something, admit it and offer to escalate to human support
- Provide step-by-step instructions for technical issues
- Suggest specific actions when appropriate

When to escalate to human support:
- Payment or billing disputes
- Account security issues
- Complex technical problems
- User requests human assistance
- Issues outside your knowledge base`;

/**
 * Chat with AI support bot with database context
 */
export async function chatWithBot(
    userId: number,
    message: string,
    conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
    try {
        // Get context from database for movie-related queries
        let databaseContext = '';

        // Check if user is asking about movies
        const movieKeywords = ['phim', 'movie', 'film', 'xem', 'watch', 'gợi ý', 'recommend', 'hay', 'mới', 'hot', 'nổi bật', 'trending'];
        const isMovieQuery = movieKeywords.some(keyword =>
            message.toLowerCase().includes(keyword)
        );

        if (isMovieQuery) {
            // Get latest and popular movies from database
            const [latestMovies, popularMovies] = await Promise.all([
                storage.getMovies(1, 20, 'latest'),
                storage.getMovies(1, 20, 'popular')
            ]);

            // Build context with actual movies
            const movieList = [...latestMovies.data, ...popularMovies.data]
                .filter((movie, index, self) =>
                    index === self.findIndex(m => m.slug === movie.slug)
                )
                .slice(0, 30)
                .map(m => {
                    const genres = Array.isArray(m.categories)
                        ? m.categories.map((c: any) => c.name || c).join(', ')
                        : '';
                    return `- "${m.name}" (${m.year || 'N/A'}) - ${genres} - ${m.quality || ''}`;
                })
                .join('\n');

            databaseContext = `\n\nAVAILABLE MOVIES IN DATABASE (ONLY recommend from this list):\n${movieList}\n\nIMPORTANT: Only recommend movies from the above list. Do not suggest movies not in this list.`;
        }

        // Build messages array
        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT + databaseContext },
            ...conversationHistory.slice(-10), // Keep last 10 messages for context
            { role: 'user', content: message }
        ];

        // Call DeepSeek API
        const response = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: messages as any,
            temperature: 0.7,
            max_tokens: 500
        });

        const reply = response.choices[0].message.content || 'I apologize, but I\'m having trouble responding right now.';

        // Detect if should escalate
        const shouldEscalate =
            reply.toLowerCase().includes('human support') ||
            reply.toLowerCase().includes('escalate') ||
            message.toLowerCase().includes('speak to human') ||
            message.toLowerCase().includes('talk to person');

        // Extract suggested actions from reply
        const suggestedActions: string[] = [];
        if (reply.includes('clear cache') || reply.includes('clear your cache')) {
            suggestedActions.push('clear-cache');
        }
        if (reply.includes('refresh') || reply.includes('reload')) {
            suggestedActions.push('refresh-page');
        }
        if (reply.includes('check connection') || reply.includes('internet connection')) {
            suggestedActions.push('check-connection');
        }
        if (reply.includes('log out') || reply.includes('sign out')) {
            suggestedActions.push('logout');
        }

        console.log(`[AI Chatbot] User ${userId} -> Response in ${response.usage?.total_tokens || 0} tokens`);

        return {
            reply,
            suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
            shouldEscalate
        };

    } catch (error) {
        console.error('[AI Chatbot] Error:', error);

        return {
            reply: 'I\'m sorry, I\'m having technical difficulties right now. Please try again in a moment or contact our support team for immediate assistance.',
            shouldEscalate: true
        };
    }
}

/**
 * Get common support topics for quick access
 */
export function getCommonTopics(): Array<{ id: string; question: string }> {
    return [
        { id: 'playback', question: 'Video won\'t play or keeps buffering' },
        { id: 'account', question: 'How do I reset my password?' },
        { id: 'subscription', question: 'How do I upgrade my subscription?' },
        { id: 'download', question: 'Can I download movies to watch offline?' },
        { id: 'devices', question: 'What devices are supported?' },
        { id: 'quality', question: 'How do I change video quality?' }
    ];
}
