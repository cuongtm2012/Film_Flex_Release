import { useEffect } from "react";
import { Bell, Check, Film } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/use-notifications";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    document.title = "Notifications - PhimGG";
  }, []);

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate to movie if data contains movieSlug
    if (notification.data?.movieSlug) {
      setLocation(`/movie/${notification.data.movieSlug}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-muted-foreground mt-2">
                You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        <Separator className="mb-6" />

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification: any) => {
              return (
                <Card
                  key={notification.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${!notification.is_read ? 'border-l-4 border-l-primary bg-accent/20' : ''
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-2 rounded-full ${!notification.is_read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                        <Film className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold mb-1 ${!notification.is_read ? 'text-white' : 'text-muted-foreground'
                          }`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="p-12 text-center">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You're all caught up! Check back later for updates.
              </p>
            </Card>
          )}
        </div>

        {/* Settings Link */}
        <div className="mt-8 text-center">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() => setLocation("/profile-settings")}
          >
            Notification Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
