import { useEffect } from "react";
import { Bell, Check, Clock, Film, Star, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Mock notifications data
const notifications = [
  {
    id: 1,
    type: "new_release",
    title: "New movie released",
    message: "The Batman (2022) is now available to watch",
    icon: Film,
    time: "2 hours ago",
    read: false,
  },
  {
    id: 2,
    type: "recommendation",
    title: "New recommendation",
    message: "Based on your watch history, you might like Dune: Part Two",
    icon: Star,
    time: "5 hours ago",
    read: false,
  },
  {
    id: 3,
    type: "comment",
    title: "New comment",
    message: "Someone replied to your comment on Oppenheimer",
    icon: User,
    time: "1 day ago",
    read: true,
  },
  {
    id: 4,
    type: "watchlist",
    title: "Watchlist reminder",
    message: "You have 5 unwatched movies in your list",
    icon: Clock,
    time: "2 days ago",
    read: true,
  },
];

export default function NotificationsPage() {
  useEffect(() => {
    document.title = "Notifications - PhimGG";
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

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
            <Button variant="outline" size="sm">
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        <Separator className="mb-6" />

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const IconComponent = notification.icon;
              return (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                    !notification.read ? 'border-l-4 border-l-primary bg-accent/20' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-2 rounded-full ${
                        !notification.read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold mb-1 ${
                          !notification.read ? 'text-white' : 'text-muted-foreground'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {notification.time}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
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
          <Button variant="link" className="text-muted-foreground">
            Notification Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
