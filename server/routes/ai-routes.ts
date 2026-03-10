/**
 * AI Chat API Routes
 * Endpoints for DeepSeek AI chatbot functionality
 */

import { Router, type Request, type Response } from 'express';
import { chatWithBot, getCommonTopics } from '../services/ai-chatbot.js';
import { z } from 'zod';

const router = Router();

// Validation schema for chat request
const chatRequestSchema = z.object({
    message: z.string().min(1).max(1000),
    conversationHistory: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string()
    })).optional()
});

/**
 * Chat with AI assistant
 * POST /api/ai/chat
 */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        // Get user ID (allow guest users)
        const userId = (req.user as any)?.id || 0;

        // Validate request body
        const validation = chatRequestSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid request',
                details: validation.error.errors
            });
        }

        const { message, conversationHistory = [] } = validation.data;

        // Call chatbot service
        const response = await chatWithBot(userId, message, conversationHistory);

        res.json({
            success: true,
            ...response
        });

    } catch (error) {
        console.error('[AI Chat] Error:', error);

        // Check if it's a DeepSeek API key error
        if (error instanceof Error && error.message.includes('DeepSeek API key')) {
            return res.status(503).json({
                error: 'AI service is currently unavailable',
                message: 'The AI chatbot is not configured. Please contact support.'
            });
        }

        res.status(500).json({
            error: 'Failed to process chat request',
            message: 'An error occurred while processing your message. Please try again.'
        });
    }
});

/**
 * Get common support topics
 * GET /api/ai/topics
 */
router.get('/topics', async (_req: Request, res: Response) => {
    try {
        const topics = getCommonTopics();
        res.json({
            success: true,
            topics
        });
    } catch (error) {
        console.error('[AI Topics] Error:', error);
        res.status(500).json({
            error: 'Failed to get topics'
        });
    }
});

/**
 * Health check for AI service
 * GET /api/ai/status
 */
router.get('/status', async (_req: Request, res: Response) => {
    try {
        const { getDeepSeek } = await import('../config/deepseek.js');
        const deepseek = await getDeepSeek();

        res.json({
            success: true,
            available: !!deepseek,
            message: deepseek ? 'AI service is available' : 'AI service is not configured'
        });
    } catch (error) {
        console.error('[AI Status] Error:', error);
        res.json({
            success: true,
            available: false,
            message: 'AI service is not available'
        });
    }
});

export default router;
