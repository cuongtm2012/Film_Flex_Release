// Firebase Cloud Messaging Service Worker
// Handles background notifications when the app is not in focus

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
    apiKey: "AIzaSyD6X4MimeEsjpgOuvl8jpPQAI3oIHGGILY",
    authDomain: "phimgg-9501c.firebaseapp.com",
    projectId: "phimgg-9501c",
    storageBucket: "phimgg-9501c.firebasestorage.app",
    messagingSenderId: "311953022708",
    appId: "1:311953022708:web:f78c7ab06de8440ab188a1",
    measurementId: "G-4T3P9ZMHHP"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'PhimGG Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: payload.notification?.icon || '/logo.png',
        badge: '/logo.png',
        tag: payload.messageId || 'notification',
        data: payload.data || {},
        requireInteraction: false,
        vibrate: [200, 100, 200],
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);

    event.notification.close();

    // Open the app or focus existing window
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }

            // Otherwise open a new window
            if (clients.openWindow) {
                const urlToOpen = event.notification.data?.url || '/';
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
