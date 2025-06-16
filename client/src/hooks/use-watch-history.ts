import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface WatchHistoryItem {
  id: number;
  title: string;
  posterUrl: string;
  type: "movie" | "series";
  episodeInfo?: string;
  progress: number;
  watchedAt: Date;
  duration: number; // in minutes
  watchedDuration: number; // in minutes
  slug: string;
}

// API response type
interface ViewHistoryResponse {
  id: number;
  movieSlug: string;
  progress: number;
  lastWatchedAt: string;
  createdAt: string;
  movie: {
    id: number;
    title: string;
    slug: string;
    poster: string;
    type: string;
    description?: string;
    duration?: number;
  };
}

export function useWatchHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id;

  // Fetch watch history from API
  const {
    data: historyData,
    isLoading,
    isError,
    error,
  } = useQuery<WatchHistoryItem[]>({
    queryKey: [`/api/users/${userId}/view-history`],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      
      const response = await fetch(`/api/users/${userId}/view-history`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch watch history');
      }

      const data: ViewHistoryResponse[] = await response.json();
      
      // Transform API response to WatchHistoryItem format
      const transformedHistory: WatchHistoryItem[] = data.map(item => ({
        id: item.id,
        title: item.movie.title,
        posterUrl: item.movie.poster || '/default-poster.jpg',
        type: item.movie.type === 'series' ? 'series' : 'movie',
        progress: item.progress,
        watchedAt: new Date(item.lastWatchedAt),
        duration: item.movie.duration || 120, // Default duration if not provided
        watchedDuration: Math.floor((item.progress / 100) * (item.movie.duration || 120)),
        slug: item.movieSlug
      }));

      return transformedHistory;
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Remove individual item from history
  const removeFromHistory = useMutation({
    mutationFn: async (historyId: number) => {
      const response = await fetch(`/api/users/${userId}/view-history/${historyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove from history');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/view-history`] });
      toast({
        title: "Removed from history",
        description: "The item has been removed from your watch history.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item from history. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Clear all watch history
  const clearAllHistory = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${userId}/view-history`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to clear history');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/view-history`] });
      toast({
        title: "History cleared",
        description: "Your watch history has been cleared.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update watch progress
  const updateWatchProgress = useMutation({
    mutationFn: async ({ movieSlug, progress, watchTime }: { 
      movieSlug: string; 
      progress: number; 
      watchTime: number; 
    }) => {
      const response = await fetch(`/api/users/${userId}/view-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieSlug,
          progress,
          watchTime,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update watch progress');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/view-history`] });
    },
  });

  const history = historyData || [];

  // Calculate statistics
  const totalWatchTime = history.reduce((total, item) => total + item.watchedDuration, 0);
  const totalItems = history.length;
  const completedItems = history.filter(item => item.progress === 100).length;

  // Filter functions
  const getFilteredHistory = (searchTerm: string, filter: string) => {
    return history.filter((item) => {
      const matchesSearch = searchTerm
        ? item.title.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      const matchesFilter =
        filter === "all" ||
        (filter === "movies" && item.type === "movie") ||
        (filter === "shows" && item.type === "series") ||
        (filter === "inProgress" && item.progress < 100) ||
        (filter === "completed" && item.progress === 100);

      return matchesSearch && matchesFilter;
    });
  };

  // Group history by date
  const getHistoryByDate = (filteredHistory: WatchHistoryItem[]) => {
    const sorted = [...filteredHistory].sort(
      (a, b) => b.watchedAt.getTime() - a.watchedAt.getTime()
    );

    return sorted.reduce<Record<string, WatchHistoryItem[]>>((groups, item) => {
      const date = item.watchedAt.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {});
  };

  return {
    history,
    isLoading,
    isError,
    error,
    removeFromHistory,
    clearAllHistory,
    updateWatchProgress,
    totalWatchTime,
    totalItems,
    completedItems,
    getFilteredHistory,
    getHistoryByDate,
    isEmpty: history.length === 0,
  };
}