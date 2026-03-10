// Firebase Cloud Messaging service
// Handles notification permissions, token management, and message handling

import { getToken, onMessage, type Messaging } from 'firebase/messaging';
import { messaging } from './firebase-config';

// VAPID key from Firebase Console
const VAPID_KEY = 'BDRL5f-kYlLG4dPgppn8YZaJvgYhGFdYUf-uUpSkc1AW71F35UK7rTEMMzYR6PzMdM5owBbkAs2vLrZ9Xj3soXU';

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('✅ Notification permission granted');
            return true;
        } else {
            console.log('❌ Notification permission denied');
            return false;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
};

/**
 * Get FCM token for this device
 */
export const getFCMToken = async (): Promise<string | null> => {
    try {
        if (!messaging) {
            console.warn('Messaging not initialized');
            return null;
        }

        const currentToken = await getToken(messaging as Messaging, {
            vapidKey: VAPID_KEY,
        });

        if (currentToken) {
            console.log('✅ FCM Token obtained:', currentToken.substring(0, 20) + '...');
            return currentToken;
        } else {
            console.log('⚠️ No registration token available');
            return null;
        }
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

/**
 * Register FCM token with backend
 */
export const registerToken = async (token: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/notifications/register-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                token,
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                },
            }),
        });

        if (response.ok) {
            console.log('✅ Token registered with backend');
            return true;
        } else {
            console.error('❌ Failed to register token with backend');
            return false;
        }
    } catch (error) {
        console.error('Error registering token:', error);
        return false;
    }
};

/**
 * Setup foreground message listener
 * This handles notifications when the app is in focus
 */
export const setupForegroundMessageListener = (
    onMessageReceived: (payload: any) => void
) => {
    if (!messaging) {
        console.warn('Messaging not initialized');
        return;
    }

    onMessage(messaging as Messaging, (payload) => {
        console.log('📨 Foreground message received:', payload);

        // Show notification using Notification API
        if (payload.notification) {
            const { title, body, icon } = payload.notification;

            new Notification(title || 'New Notification', {
                body: body || '',
                icon: icon || '/logo.png',
                badge: '/logo.png',
                tag: payload.messageId,
                data: payload.data,
            });
        }

        // Call custom handler
        onMessageReceived(payload);
    });
};

/**
 * Initialize FCM for the app
 * Call this on app startup
 */
export const initializeFCM = async (): Promise<void> => {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return;
        }

        // Check if permission was already granted
        if (Notification.permission === 'granted') {
            const token = await getFCMToken();
            if (token) {
                await registerToken(token);
            }
        }
    } catch (error) {
        console.error('Error initializing FCM:', error);
    }
};

/**
 * Unregister FCM token from backend
 */
export const unregisterToken = async (token: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/notifications/unregister-token', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ token }),
        });

        if (response.ok) {
            console.log('✅ Token unregistered from backend');
            return true;
        } else {
            console.error('❌ Failed to unregister token');
            return false;
        }
    } catch (error) {
        console.error('Error unregistering token:', error);
        return false;
    }
};
