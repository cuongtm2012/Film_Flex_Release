import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    requestNotificationPermission,
    getFCMToken,
    registerToken,
    setupForegroundMessageListener,
} from '@/lib/firebase-messaging';

export default function NotificationPermission() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Check current permission status
        if ('Notification' in window) {
            setPermission(Notification.permission);
            console.log('🔔 Notification permission status:', Notification.permission);
        } else {
            console.warn('⚠️ Notifications not supported in this browser');
        }

        // Setup foreground message listener
        setupForegroundMessageListener((payload) => {
            toast({
                title: payload.notification?.title || 'New Notification',
                description: payload.notification?.body,
            });
        });
    }, [toast]);

    const handleEnableNotifications = async () => {
        setIsLoading(true);

        try {
            // Request permission
            const granted = await requestNotificationPermission();

            if (granted) {
                setPermission('granted');

                // Get FCM token
                const token = await getFCMToken();

                if (token) {
                    // Register token with backend
                    const registered = await registerToken(token);

                    if (registered) {
                        toast({
                            title: '🔔 Notifications Enabled',
                            description: 'You will receive updates about new movies and episodes!',
                        });
                    } else {
                        toast({
                            title: 'Warning',
                            description: 'Notifications enabled but failed to sync with server',
                            variant: 'destructive',
                        });
                    }
                }
            } else {
                toast({
                    title: 'Permission Denied',
                    description: 'You can enable notifications later in your browser settings',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
            toast({
                title: 'Error',
                description: 'Failed to enable notifications. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Don't show if notifications not supported
    if (!('Notification' in window)) {
        return null;
    }

    // Already granted
    if (permission === 'granted') {
        return (
            <Button variant="ghost" size="sm" disabled className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications On</span>
            </Button>
        );
    }

    // Denied
    if (permission === 'denied') {
        return (
            <Button variant="ghost" size="sm" disabled className="gap-2 opacity-50">
                <BellOff className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications Blocked</span>
            </Button>
        );
    }

    // Default - show enable button
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="gap-2 flex-shrink-0"
            title="Enable push notifications"
        >
            <BellOff className="h-4 w-4" />
            <span className="hidden sm:inline">
                {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </span>
            {/* Show icon only on mobile */}
            {!isLoading && <span className="sm:hidden">Enable</span>}
        </Button>
    );
}
