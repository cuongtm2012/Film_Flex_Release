import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
    requestNotificationPermission,
    getFCMToken,
    registerToken,
    setupForegroundMessageListener,
} from '@/lib/firebase-messaging';

export default function NotificationPrompt() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        // Only show for logged-in users
        if (!user) {
            setIsVisible(false);
            return;
        }

        // Check if user dismissed the prompt
        const dismissed = localStorage.getItem('notification-prompt-dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
            return;
        }

        // Check current permission status
        if ('Notification' in window) {
            const currentPermission = Notification.permission;
            setPermission(currentPermission);
            console.log('🔔 Notification permission status:', currentPermission);

            // Show prompt only if permission is default (not asked yet)
            if (currentPermission === 'default') {
                // Show after 3 seconds delay
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 3000);

                return () => clearTimeout(timer);
            }
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
    }, [user, toast]);

    const handleEnableNotifications = async () => {
        setIsLoading(true);

        try {
            // Request permission
            const granted = await requestNotificationPermission();

            if (granted) {
                setPermission('granted');
                setIsVisible(false);

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
                setIsVisible(false);
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

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem('notification-prompt-dismissed', 'true');
    };

    // Don't show if:
    // - Not visible
    // - User dismissed it
    // - Permission already granted or denied
    // - Notifications not supported
    if (!isVisible || isDismissed || permission !== 'default' || !('Notification' in window)) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-primary/20 rounded-lg shadow-2xl shadow-primary/10 p-6 max-w-sm backdrop-blur-sm">
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-white transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Icon */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Bell className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                            🎬 Never Miss a Movie!
                        </h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            Enable notifications to get instant alerts when:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-gray-400">
                            <li className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                New blockbuster movies arrive
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                Latest episodes are released
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                Exclusive updates & recommendations
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Action */}
                <Button
                    onClick={handleEnableNotifications}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-semibold shadow-lg shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02]"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Enabling...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <Bell className="h-4 w-4" />
                            Enable Notifications
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}
