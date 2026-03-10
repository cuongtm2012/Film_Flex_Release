/**
 * Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging
 */

import { getMessaging } from './firebase-admin';
import { pool } from './db';
import type { MulticastMessage } from 'firebase-admin/messaging';

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    url?: string;
    data?: Record<string, string>;
}

class NotificationService {
    /**
     * Send notification to a single user
     */
    async sendToUser(userId: number, payload: NotificationPayload): Promise<boolean> {
        try {
            const messaging = getMessaging();
            if (!messaging) {
                console.warn('Firebase Messaging not initialized');
                return false;
            }

            // Get user's FCM tokens (active in last 30 days)
            const result = await pool.query(
                `SELECT token FROM fcm_tokens 
         WHERE user_id = $1 
         AND last_used_at > NOW() - INTERVAL '30 days'`,
                [userId]
            );

            if (result.rows.length === 0) {
                console.log(`No active FCM tokens found for user ${userId}`);
                return false;
            }

            const tokens = result.rows.map((row) => row.token);

            // Prepare message
            const message: MulticastMessage = {
                tokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: {
                    url: payload.url || '/',
                    ...payload.data,
                },
                webpush: {
                    fcmOptions: {
                        link: payload.url || '/',
                    },
                    notification: {
                        icon: payload.icon || '/logo.png',
                        badge: '/logo.png',
                        ...(payload.image && { image: payload.image }),
                    },
                },
            };

            // Send message
            const response = await messaging.sendEachForMulticast(message);

            console.log(
                `✅ Sent notification to user ${userId}: ${response.successCount}/${tokens.length} successful`
            );

            // Remove invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && resp.error) {
                        const errorCode = resp.error.code;
                        if (
                            errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered'
                        ) {
                            invalidTokens.push(tokens[idx]);
                        }
                    }
                });

                if (invalidTokens.length > 0) {
                    await this.removeInvalidTokens(invalidTokens);
                }
            }

            // Save to notification history
            await this.saveToHistory(userId, payload);

            return response.successCount > 0;
        } catch (error) {
            console.error('Error sending notification to user:', error);
            return false;
        }
    }

    /**
     * Send notification to multiple users
     */
    async sendToUsers(userIds: number[], payload: NotificationPayload): Promise<number> {
        let successCount = 0;

        for (const userId of userIds) {
            const sent = await this.sendToUser(userId, payload);
            if (sent) successCount++;
        }

        return successCount;
    }

    /**
     * Send notification to all users
     */
    async sendToAll(payload: NotificationPayload): Promise<number> {
        try {
            const result = await pool.query(
                `SELECT DISTINCT user_id FROM fcm_tokens 
         WHERE last_used_at > NOW() - INTERVAL '30 days'`
            );

            const userIds = result.rows.map((row) => row.user_id);

            return await this.sendToUsers(userIds, payload);
        } catch (error) {
            console.error('Error sending notification to all users:', error);
            return 0;
        }
    }

    /**
     * Remove invalid FCM tokens
     */
    private async removeInvalidTokens(tokens: string[]): Promise<void> {
        try {
            await pool.query(
                'DELETE FROM fcm_tokens WHERE token = ANY($1)',
                [tokens]
            );
            console.log(`🗑️ Removed ${tokens.length} invalid FCM tokens`);
        } catch (error) {
            console.error('Error removing invalid tokens:', error);
        }
    }

    /**
     * Save notification to history
     */
    private async saveToHistory(userId: number, payload: NotificationPayload): Promise<void> {
        try {
            await pool.query(
                `INSERT INTO notification_history (user_id, title, body, notification_type, data)
         VALUES ($1, $2, $3, $4, $5)`,
                [
                    userId,
                    payload.title,
                    payload.body,
                    payload.data?.type || 'general',
                    JSON.stringify(payload.data || {}),
                ]
            );
        } catch (error) {
            console.error('Error saving notification to history:', error);
        }
    }
}

export const notificationService = new NotificationService();
