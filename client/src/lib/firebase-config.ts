// Firebase configuration for Film Flex
// Initialize Firebase app with provided configuration

import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyD6X4MimeEsjpgOuvl8jpPQAI3oIHGGILY",
    authDomain: "phimgg-9501c.firebaseapp.com",
    projectId: "phimgg-9501c",
    storageBucket: "phimgg-9501c.firebasestorage.app",
    messagingSenderId: "311953022708",
    appId: "1:311953022708:web:f78c7ab06de8440ab188a1",
    measurementId: "G-4T3P9ZMHHP"
};

// Initialize Firebase
let app;
let messaging = null;

try {
    app = initializeApp(firebaseConfig);

    // Check if messaging is supported before initializing
    isSupported().then((supported) => {
        if (supported) {
            messaging = getMessaging(app);
            console.log('✅ Firebase Messaging initialized');
        } else {
            console.warn('⚠️ Firebase Messaging not supported in this browser');
        }
    });
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

export { app, messaging };
