/**
 * User Preferences Routes
 * Handles user genre preferences for personalized recommendations
 */

import { Router, type Request, type Response } from 'express';
import { pool } from '../db';

const router = Router();

/**
 * Get user preferences
 * GET /api/user/preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user preferences
        const result = await pool.query(
            'SELECT favorite_genres, onboarding_completed FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Return default preferences if not exists
            return res.json({
                favoriteGenres: [],
                onboardingCompleted: false,
            });
        }

        const prefs = result.rows[0];
        res.json({
            favoriteGenres: prefs.favorite_genres || [],
            onboardingCompleted: prefs.onboarding_completed || false,
        });
    } catch (error) {
        console.error('Error getting user preferences:', error);
        res.status(500).json({ error: 'Failed to get preferences' });
    }
});

/**
 * Save/Update user preferences
 * POST /api/user/preferences
 */
router.post('/preferences', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { favoriteGenres } = req.body;

        if (!Array.isArray(favoriteGenres)) {
            return res.status(400).json({ error: 'favoriteGenres must be an array' });
        }

        // Upsert preferences
        const result = await pool.query(
            `INSERT INTO user_preferences (user_id, favorite_genres, onboarding_completed)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id)
       DO UPDATE SET
         favorite_genres = $2,
         onboarding_completed = true,
         updated_at = CURRENT_TIMESTAMP
       RETURNING favorite_genres, onboarding_completed`,
            [userId, JSON.stringify(favoriteGenres)]
        );

        const prefs = result.rows[0];
        res.json({
            success: true,
            preferences: {
                favoriteGenres: prefs.favorite_genres || [],
                onboardingCompleted: prefs.onboarding_completed || false,
            },
        });
    } catch (error) {
        console.error('Error saving user preferences:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

/**
 * Skip onboarding (mark as completed without selecting genres)
 * POST /api/user/preferences/skip
 */
router.post('/preferences/skip', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Mark onboarding as completed with empty genres
        await pool.query(
            `INSERT INTO user_preferences (user_id, favorite_genres, onboarding_completed)
       VALUES ($1, '[]'::jsonb, true)
       ON CONFLICT (user_id)
       DO UPDATE SET
         onboarding_completed = true,
         updated_at = CURRENT_TIMESTAMP`,
            [userId]
        );

        res.json({
            success: true,
            message: 'Onboarding skipped',
        });
    } catch (error) {
        console.error('Error skipping onboarding:', error);
        res.status(500).json({ error: 'Failed to skip onboarding' });
    }
});

export default router;
