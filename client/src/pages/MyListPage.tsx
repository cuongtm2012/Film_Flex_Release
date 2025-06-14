import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, Plus, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { MovieListResponse } from "@/types/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface MyListMovie {
  id: string;
  title: string;
  image: string;
  posterUrl?: string;
  year: number;
  duration: string;
  genre: string;
  genres?: string[];
  rating: number;
  watched?: boolean;
}

export default function MyListPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState("all");

  // Mock data for demonstration - using real movie slugs from database
  const mockMyListMovies: MyListMovie[] = [
    {
      id: 'hoi-lam-vuon-grosse-pointe',
      title: 'Hội Làm Vườn Grosse Pointe',
      image: 'https://img.phimapi.com/upload/vod/20241220-1/b40e3ffd3c906aacfee68e8a5f85b851.jpg',
      posterUrl: 'https://img.phimapi.com/upload/vod/20241220-1/b40e3ffd3c906aacfee68e8a5f85b851.jpg',
      year: 2024,
      duration: '120 min',
      genre: 'Drama',
      genres: ['Drama'],
      rating: 7.8,
      watched: false
    },
    {
      id: 'quy-co-seon-ju-phuc-thu',
      title: 'Quý Cô Seon Ju Phục Thù',
      image: 'https://img.phimapi.com/upload/vod/20241220-1/a8e7b9c2d4f1e8a6b9c8d7e6f5a4b3c2.jpg',
      posterUrl: 'https://img.phimapi.com/upload/vod/20241220-1/a8e7b9c2d4f1e8a6b9c8d7e6f5a4b3c2.jpg',
      year: 2024,
      duration: '45 min',
      genre: 'Thriller',
      genres: ['Thriller'],
      rating: 8.2,
      watched: true
    },
    {
      id: 'chuyen-tinh-cay-son-tra',
      title: 'Chuyện Tình Cây Sơn Tra',
      image: 'https://img.phimapi.com/upload/vod/20241220-1/c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4.jpg',
      posterUrl: 'https://img.phimapi.com/upload/vod/20241220-1/c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4.jpg',
      year: 2024,
      duration: '90 min',
      genre: 'Romance',
      genres: ['Romance'],
      rating: 7.5,
      watched: false
    },
    {
      id: 'tinh-yeu-gia-tao',
      title: 'Tình Yêu Giả Tạo',
      image: 'https://img.phimapi.com/upload/vod/20241220-1/d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6.jpg',
      posterUrl: 'https://img.phimapi.com/upload/vod/20241220-1/d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6.jpg',
      year: 2024,
      duration: '105 min',
      genre: 'Romance',
      genres: ['Romance'],
      rating: 7.9,
      watched: true
    },
    {
      id: 'ban-an-tu-qua-khu',
      title: 'Bản Án Từ Quá Khứ',
      image: 'https://img.phimapi.com/upload/vod/20241220-1/e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7.jpg',
      posterUrl: 'https://img.phimapi.com/upload/vod/20241220-1/e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7.jpg',
      year: 2024,
      duration: '110 min',
      genre: 'Crime',
      genres: ['Crime'],
      rating: 8.1,
      watched: false
    }
  ];

  // Fetch user's watchlist
  const {
    data: watchlistData,
    isLoading,
    isError,
  } = useQuery<any[]>({
    queryKey: [`/api/users/${userId}/watchlist`],
    enabled: !!userId,
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
    },
  });

  // Mark as watched mutation (this would be implemented in a real app)
  const toggleWatched = useMutation({
    mutationFn: async ({ movieSlug, isWatched }: { movieSlug: string, isWatched: boolean }) => {
      // This is a placeholder - in a real app, we would have an API endpoint for this
      console.log(`Marking ${movieSlug} as ${isWatched ? 'watched' : 'unwatched'}`);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/watchlist`] });
    },
  });

  // Handle navigation to movie player
  const handlePlayMovie = (movieSlug: string) => {
    navigate(`/movie/${movieSlug}`);
  };

  // Filter movies based on the active tab
  const getFilteredMovies = () => {
    if (!watchlistData || !Array.isArray(watchlistData)) return [];
    
    if (activeTab === "all") return watchlistData;
    
    // This is a placeholder - in a real app, we would have a "watched" field in the watchlist data
    if (activeTab === "watched") {
      return watchlistData.filter((_: any, index: number) => index % 3 === 0); // Every third item for demo
    } else {
      return watchlistData.filter((_: any, index: number) => index % 3 !== 0);
    }
  };

  const filteredMovies = getFilteredMovies();
  const isEmptyList = filteredMovies.length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Error Loading Watchlist</h2>
        <p className="text-muted-foreground mb-6">
          There was a problem loading your watchlist. Please try again later.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          Reload Page
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">My List</h1>
      </div>

      <Separator className="mb-6" />

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unwatched">Unwatched</TabsTrigger>
          <TabsTrigger value="watched">Watched</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} forceMount>
          {isEmptyList ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold mb-2">Your List is Empty</h3>
              <p className="text-muted-foreground mb-6">
                You haven't added any movies to your {activeTab === "all" ? "list" : activeTab} yet.
              </p>
              <Button asChild className="mt-2">
                <a href="/movies">
                  Browse Movies <Plus className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMovies.map((movie: any) => (
                <Card key={movie.slug} className="overflow-hidden flex flex-col">                  <div className="relative cursor-pointer group h-[220px]">
                    <img
                      src={movie.posterUrl || movie.thumbUrl}
                      alt={movie.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-white"
                        onClick={() => handlePlayMovie(movie.slug)}
                      >
                        <PlayCircle className="h-12 w-12" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFromWatchlist.mutate(movie.slug)}
                      disabled={removeFromWatchlist.isPending}
                    >
                      {removeFromWatchlist.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold mb-1 line-clamp-1">{movie.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{movie.year}</span>
                      <Button
                        size="sm"
                        variant={activeTab === "watched" ? "default" : "outline"}
                        className="ml-auto mt-2"
                        onClick={() => toggleWatched.mutate({ 
                          movieSlug: movie.slug, 
                          isWatched: activeTab !== "watched" 
                        })}
                        disabled={toggleWatched.isPending}
                      >
                        {toggleWatched.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {activeTab === "watched" ? "Watched" : "Mark as Watched"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}