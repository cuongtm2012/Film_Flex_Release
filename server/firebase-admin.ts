/**
 * Firebase Admin SDK initialization
 * Used for sending push notifications from server
 */

import admin from 'firebase-admin';

let firebaseAdmin: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebaseAdmin = (): admin.app.App => {
    if (firebaseAdmin) {
        return firebaseAdmin;
    }

    try {
        // Check if required environment variables are set
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

        if (!projectId || !privateKey || !clientEmail) {
            console.warn('⚠️ Firebase Admin credentials not configured. Push notifications will be disabled.');
            console.warn('Required env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL');
            return null as any;
        }

        firebaseAdmin = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                privateKey,
                clientEmail,
            }),
        });

        console.log('✅ Firebase Admin SDK initialized');
        return firebaseAdmin;
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin:', error);
        return null as any;
    }
};

/**
 * Get Firebase Admin instance
 */
export const getFirebaseAdmin = (): admin.app.App | null => {
    if (!firebaseAdmin) {
        return initializeFirebaseAdmin();
    }
    return firebaseAdmin;
};

/**
 * Get Firebase Messaging instance
 */
export const getMessaging = (): admin.messaging.Messaging | null => {
    const app = getFirebaseAdmin();
    if (!app) {
        return null;
    }
    return app.messaging();
};

export default { initializeFirebaseAdmin, getFirebaseAdmin, getMessaging };
