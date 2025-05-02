import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BookmarkPlus, X, Play, Film, ArrowLeft, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Type for movie in watchlist
type WatchlistMovie = {
  id: number;
  title: string;
  posterUrl: string;
  year: number;
  genres: string[];
  watched: boolean;
};

// Mock data for watchlist - in a real app, this would come from the API
const mockWatchlist: WatchlistMovie[] = [
  {
    id: 1,
    title: "The Dark Knight",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    year: 2008,
    genres: ["Action", "Crime", "Drama"],
    watched: false
  },
  {
    id: 2,
    title: "Inception",
    posterUrl: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    year: 2010,
    genres: ["Action", "Sci-Fi", "Adventure"],
    watched: true
  },
  {
    id: 3,
    title: "Interstellar",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    year: 2014,
    genres: ["Adventure", "Drama", "Sci-Fi"],
    watched: false
  },
  {
    id: 4,
    title: "The Shawshank Redemption",
    posterUrl: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    year: 1994,
    genres: ["Drama", "Crime"],
    watched: false
  },
  {
    id: 5,
    title: "Pulp Fiction",
    posterUrl: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    year: 1994,
    genres: ["Crime", "Thriller"],
    watched: true
  },
  {
    id: 6,
    title: "The Godfather",
    posterUrl: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    year: 1972,
    genres: ["Crime", "Drama"],
    watched: false
  }
];

export default function WatchlistPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [watchlist, setWatchlist] = useState<WatchlistMovie[]>(mockWatchlist);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle removing a movie from watchlist
  const handleRemoveMovie = (id: number) => {
    setWatchlist((prev) => prev.filter((movie) => movie.id !== id));
    
    toast({
      title: "Removed from watchlist",
      description: "The movie has been removed from your watchlist.",
    });
  };
  
  // Handle toggling watched status
  const handleToggleWatched = (id: number) => {
    setWatchlist((prev) =>
      prev.map((movie) =>
        movie.id === id ? { ...movie, watched: !movie.watched } : movie
      )
    );
    
    const movie = watchlist.find((m) => m.id === id);
    if (movie) {
      toast({
        title: movie.watched ? "Marked as unwatched" : "Marked as watched",
        description: `"${movie.title}" has been ${movie.watched ? "marked as unwatched" : "marked as watched"}.`,
      });
    }
  };
  
  // Filter movies by watched status
  const watchedMovies = watchlist.filter((movie) => movie.watched);
  const unwatchedMovies = watchlist.filter((movie) => !movie.watched);

  // Empty state component
  const EmptyState = ({ type }: { type: string }) => (
    <div className="text-center p-8">
      <BookmarkPlus className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {type === "all" 
          ? "Your watchlist is empty" 
          : type === "watched" 
            ? "No watched movies yet" 
            : "No movies to watch"}
      </h3>
      <p className="text-muted-foreground text-sm mb-4">
        {type === "all" 
          ? "Add movies or shows to watch later by clicking the bookmark icon on any title" 
          : type === "watched" 
            ? "Once you watch movies from your list, they'll appear here" 
            : "Add some movies to your watchlist to get started"}
      </p>
      <Button onClick={() => navigate("/")}>Explore Movies</Button>
    </div>
  );

  // Movie card component
  const MovieCard = ({ movie }: { movie: WatchlistMovie }) => (
    <Card className="overflow-hidden hover:bg-card/50 transition-colors">
      <div className="relative aspect-[2/3] overflow-hidden">
        <img 
          src={movie.posterUrl} 
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center p-4">
          <Button 
            className="w-full"
            onClick={() => navigate(`/movie/${movie.id}`)}
          >
            <Play className="mr-2 h-4 w-4" /> Watch Now
          </Button>
        </div>
        <Badge 
          className="absolute top-2 right-2 bg-primary text-white"
          variant="default"
        >
          {movie.year}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg line-clamp-1">{movie.title}</h3>
        <div className="flex flex-wrap gap-1 mt-2">
          {movie.genres.slice(0, 2).map((genre) => (
            <Badge key={genre} variant="outline" className="text-xs">
              {genre}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="bg-card/50 p-4 flex justify-between">
        <div className="flex items-center">
          <Checkbox 
            checked={movie.watched}
            id={`watched-${movie.id}`}
            onCheckedChange={() => handleToggleWatched(movie.id)}
            className="mr-2"
          />
          <label 
            htmlFor={`watched-${movie.id}`} 
            className="text-sm cursor-pointer"
          >
            {movie.watched ? "Watched" : "Mark watched"}
          </label>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => handleRemoveMovie(movie.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  if (!user) {
    return <div className="p-8 text-center">Loading watchlist...</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          className="mr-4"
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Button>
        <h1 className="text-3xl font-bold">My Watchlist</h1>
      </div>
      
      <Tabs defaultValue="all">
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="all" className="relative">
              All
              <Badge className="ml-2 bg-primary/20 text-primary">{watchlist.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unwatched" className="relative">
              To Watch
              <Badge className="ml-2 bg-primary/20 text-primary">{unwatchedMovies.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="watched" className="relative">
              Watched
              <Badge className="ml-2 bg-primary/20 text-primary">{watchedMovies.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          {watchlist.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All as Watched
              </Button>
              <Button variant="outline" size="sm">
                <Circle className="h-4 w-4 mr-2" />
                Mark All as Unwatched
              </Button>
            </div>
          )}
        </div>
        
        <TabsContent value="all">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-[300px] w-full rounded-md" />
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
              ))}
            </div>
          ) : watchlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {watchlist.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <EmptyState type="all" />
          )}
        </TabsContent>
        
        <TabsContent value="unwatched">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-[300px] w-full rounded-md" />
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
              ))}
            </div>
          ) : unwatchedMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {unwatchedMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <EmptyState type="unwatched" />
          )}
        </TabsContent>
        
        <TabsContent value="watched">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-[300px] w-full rounded-md" />
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
              ))}
            </div>
          ) : watchedMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {watchedMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <EmptyState type="watched" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}