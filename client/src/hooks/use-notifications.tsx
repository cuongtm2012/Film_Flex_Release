import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface Notification {
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    data: any;
    is_read: boolean;
    created_at: string;
    read_at?: string;
    movie_id?: number;
}

export function useNotifications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery<Notification[]>({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const res = await fetch(`/api/users/${user.id}/notifications`);
            if (!res.ok) throw new Error('Failed to fetch notifications');
            return res.json();
        },
        enabled: !!user,
        refetchInterval: 60000, // Refetch every minute
    });

    // Fetch unread count
    const { data: unreadData } = useQuery<{ count: number }>({
        queryKey: ['notifications-unread', user?.id],
        queryFn: async () => {
            if (!user) return { count: 0 };
            const res = await fetch(`/api/users/${user.id}/notifications/unread-count`);
            if (!res.ok) throw new Error('Failed to fetch unread count');
            return res.json();
        },
        enabled: !!user,
        refetchInterval: 60000,
    });

    const unreadCount = unreadData?.count || 0;

    // Mark as read
    const markAsRead = useMutation({
        mutationFn: async (notificationId: number) => {
            const res = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
            });
            if (!res.ok) throw new Error('Failed to mark as read');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        },
    });

    // Mark all as read
    const markAllAsRead = useMutation({
        mutationFn: async () => {
            if (!user) return;
            const res = await fetch(`/api/users/${user.id}/notifications/read-all`, {
                method: 'PUT',
            });
            if (!res.ok) throw new Error('Failed to mark all as read');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        },
    });

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead: markAsRead.mutate,
        markAllAsRead: markAllAsRead.mutate,
    };
}
