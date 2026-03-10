import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface WatchlistMovie {
  id: string;
  slug: string;
  name: string;
  title: string;
  posterUrl?: string;
  thumbUrl?: string;
  year: number;
  duration?: string;
  genre?: string;
  genres?: string[];
  rating?: number;
  watched?: boolean;
}

export function useWatchlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id;

  // Fetch user's watchlist
  const {
    data: watchlistData,
    isLoading,
    isError,
    error,
  } = useQuery<WatchlistMovie[]>({
    queryKey: [`/api/users/${userId}/watchlist`],
    enabled: !!userId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Remove from watchlist mutation
  const removeFromWatchlist = useMutation({
    mutationFn: async (movieSlug: string) => {
      const res = await fetch(`/api/users/${userId}/watchlist/${movieSlug}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove from watchlist');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/watchlist`] });
      toast({
        title: "Removed from watchlist",
        description: "The movie has been removed from your watchlist.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from watchlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add to watchlist mutation
  const addToWatchlist = useMutation({
    mutationFn: async (movieSlug: string) => {
      const res = await fetch(`/api/users/${userId}/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movieSlug }),
      });
      if (!res.ok) throw new Error('Failed to add to watchlist');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/watchlist`] });
      toast({
        title: "Added to watchlist",
        description: "The movie has been added to your watchlist.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to watchlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle watched status mutation
  const toggleWatched = useMutation({
    mutationFn: async ({ movieSlug, isWatched }: { movieSlug: string, isWatched: boolean }) => {
      // This would be implemented with a real API endpoint
      return { success: true };
    },
    onSuccess: (_, { isWatched }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/watchlist`] });
      toast({
        title: isWatched ? "Marked as watched" : "Marked as unwatched",
        description: `The movie has been ${isWatched ? 'marked as watched' : 'marked as unwatched'}.`,
      });
    },
  });

  // Filter movies based on watched status
  const getFilteredMovies = (filter: "all" | "watched" | "unwatched") => {
    if (!watchlistData || !Array.isArray(watchlistData)) return [];
    
    if (filter === "all") return watchlistData;
    
    // This is a placeholder - in a real app, we would have a "watched" field in the watchlist data
    if (filter === "watched") {
      return watchlistData.filter((_: any, index: number) => index % 3 === 0); // Every third item for demo
    } else {
      return watchlistData.filter((_: any, index: number) => index % 3 !== 0);
    }
  };

  return {
    watchlistData: watchlistData || [],
    isLoading,
    isError,
    error,
    removeFromWatchlist,
    addToWatchlist,
    toggleWatched,
    getFilteredMovies,
    isEmpty: !watchlistData || watchlistData.length === 0,
  };
}