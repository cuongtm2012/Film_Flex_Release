/**
 * Firebase Admin SDK initialization
 * Used for sending push notifications from server
 * Loads credentials from database with fallback to environment variables
 */

import admin from 'firebase-admin';

let firebaseAdmin: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Loads credentials from database first, falls back to environment variables
 */
export const initializeFirebaseAdmin = async (): Promise<admin.app.App | null> => {
    if (firebaseAdmin) {
        return firebaseAdmin;
    }

    try {
        // Load credentials from database first
        const { storage } = await import('./storage.js');
        const settings = await storage.getAllSettings();

        const projectId = settings.firebase_admin_project_id || process.env.FIREBASE_ADMIN_PROJECT_ID;
        const privateKey = settings.firebase_admin_private_key || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
        const clientEmail = settings.firebase_admin_client_email || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

        // Check if notifications are explicitly disabled
        if (settings.firebase_notifications_enabled === 'false') {
            console.log('ℹ️  Push notifications disabled in settings');
            return null;
        }

        if (!projectId || !privateKey || !clientEmail) {
            console.warn('⚠️ Firebase Admin credentials not configured. Push notifications will be disabled.');
            console.warn('Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL');
            console.warn('Configure via Admin Dashboard → System Settings → Analytics & API Keys');
            return null;
        }

        // Fix newline characters in private key
        const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

        firebaseAdmin = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                privateKey: formattedPrivateKey,
                clientEmail,
            }),
        });

        console.log('✅ Firebase Admin SDK initialized' + (settings.firebase_admin_project_id ? ' from database' : ''));
        return firebaseAdmin;
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin:', error);
        return null;
    }
};

/**
 * Get Firebase Admin instance
 */
export const getFirebaseAdmin = async (): Promise<admin.app.App | null> => {
    if (!firebaseAdmin) {
        return await initializeFirebaseAdmin();
    }
    return firebaseAdmin;
};

/**
 * Get Firebase Messaging instance
 */
export const getMessaging = async (): Promise<admin.messaging.Messaging | null> => {
    const app = await getFirebaseAdmin();
    if (!app) {
        return null;
    }
    return app.messaging();
};

export default { initializeFirebaseAdmin, getFirebaseAdmin, getMessaging };
