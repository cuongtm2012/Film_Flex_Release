import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Middleware to check authentication
const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Not authenticated' });
};

// Get user notifications
router.get('/api/users/:userId/notifications', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit as string) || 20;
        const unreadOnly = req.query.unreadOnly === 'true';

        let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;

        if (unreadOnly) {
            query += ` AND is_read = false`;
        }

        query += ` ORDER BY created_at DESC LIMIT $2`;

        const result = await db.execute(query, [userId, limit]);
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

// Get unread count
router.get('/api/users/:userId/notifications/unread-count', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);

        const result = await db.execute(
            `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
            [userId]
        );

        res.json({ count: parseInt(result.rows[0]?.count || '0') });
    } catch (error) {
        console.error('Failed to get unread count:', error);
        res.status(500).json({ message: 'Failed to get unread count' });
    }
});

// Mark notification as read
router.put('/api/notifications/:id/read', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);

        await db.execute(
            `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1`,
            [id]
        );

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
});

// Mark all as read
router.put('/api/users/:userId/notifications/read-all', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);

        await db.execute(
            `UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false`,
            [userId]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Failed to mark all as read:', error);
        res.status(500).json({ message: 'Failed to mark all as read' });
    }
});

// Delete notification
router.delete('/api/notifications/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);

        await db.execute(`DELETE FROM notifications WHERE id = $1`, [id]);

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Failed to delete notification:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
});

export default router;
