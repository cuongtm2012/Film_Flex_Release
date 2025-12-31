/**
 * Notification API Routes
 * Endpoints for managing FCM tokens and sending notifications
 */

import { Router, type Request, type Response } from 'express';
import { pool } from '../db';
import { notificationService } from '../notification-service';

const router = Router();

/**
 * Register FCM token for current user
 * POST /api/notifications/register-token
 */
router.post('/register-token', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { token, deviceInfo } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Upsert token (insert or update if exists)
        await pool.query(
            `INSERT INTO fcm_tokens (user_id, token, device_info, last_used_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token)
       DO UPDATE SET
         user_id = $1,
         device_info = $3,
         last_used_at = NOW(),
         updated_at = NOW()`,
            [userId, token, JSON.stringify(deviceInfo || {})]
        );

        // Create default notification preferences if not exists
        await pool.query(
            `INSERT INTO notification_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );

        res.json({ success: true, message: 'Token registered successfully' });
    } catch (error) {
        console.error('Error registering FCM token:', error);
        res.status(500).json({ error: 'Failed to register token' });
    }
});

/**
 * Unregister FCM token
 * DELETE /api/notifications/unregister-token
 */
router.delete('/unregister-token', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        await pool.query('DELETE FROM fcm_tokens WHERE token = $1', [token]);

        res.json({ success: true, message: 'Token unregistered successfully' });
    } catch (error) {
        console.error('Error unregistering FCM token:', error);
        res.status(500).json({ error: 'Failed to unregister token' });
    }
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await pool.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Create default preferences
            const newPrefs = await pool.query(
                `INSERT INTO notification_preferences (user_id)
         VALUES ($1)
         RETURNING *`,
                [userId]
            );
            return res.json(newPrefs.rows[0]);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        res.status(500).json({ error: 'Failed to get preferences' });
    }
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { newMovies, newEpisodes, comments, replies, systemUpdates } = req.body;

        const result = await pool.query(
            `UPDATE notification_preferences
       SET new_movies = COALESCE($2, new_movies),
           new_episodes = COALESCE($3, new_episodes),
           comments = COALESCE($4, comments),
           replies = COALESCE($5, replies),
           system_updates = COALESCE($6, system_updates),
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
            [userId, newMovies, newEpisodes, comments, replies, systemUpdates]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Preferences not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

/**
 * Send test notification (admin only)
 * POST /api/notifications/send-test
 */
router.post('/send-test', async (req: Request, res: Response) => {
    try {
        const user = req.user as any;

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { title, body, url } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }

        const sent = await notificationService.sendToUser(user.id, {
            title,
            body,
            url: url || '/',
        });

        if (sent) {
            res.json({ success: true, message: 'Test notification sent' });
        } else {
            res.status(500).json({ error: 'Failed to send notification' });
        }
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

/**
 * Get notification history
 * GET /api/notifications/history
 */
router.get('/history', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT * FROM notification_history
       WHERE user_id = $1
       ORDER BY sent_at DESC
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM notification_history WHERE user_id = $1',
            [userId]
        );

        res.json({
            notifications: result.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit,
        });
    } catch (error) {
        console.error('Error getting notification history:', error);
        res.status(500).json({ error: 'Failed to get notification history' });
    }
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const notificationId = parseInt(req.params.id);

        await pool.query(
            `UPDATE notification_history
       SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
            [notificationId, userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

export default router;
