import React from "react";
import { useLocation } from "wouter";
import { PlayCircle, X, Loader2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchlistMovie } from "@/hooks/use-watchlist";

interface WatchlistGridProps {
  movies: WatchlistMovie[];
  isLoading: boolean;
  onRemoveMovie: (movieSlug: string) => void;
  onToggleWatched?: (movieSlug: string, isWatched: boolean) => void;
  removeLoading?: boolean;
  toggleLoading?: boolean;
  showWatchedToggle?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  compact?: boolean;
}

const WatchlistGrid: React.FC<WatchlistGridProps> = ({
  movies,
  isLoading,
  onRemoveMovie,
  onToggleWatched,
  removeLoading = false,
  toggleLoading = false,
  showWatchedToggle = false,
  emptyMessage = "Your watchlist is empty",
  emptyDescription = "Add movies or shows to watch later by clicking the bookmark icon on any title",
  compact = false,
}) => {
  const [, navigate] = useLocation();

  // Handle navigation to movie player
  const handlePlayMovie = (movieSlug: string) => {
    navigate(`/movie/${movieSlug}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-3 md:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-6`}>
        {Array.from({ length: compact ? 6 : 8 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-[220px] w-full rounded-md" data-testid="skeleton" />
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (movies.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4">
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground mb-6">{emptyDescription}</p>
        <Button asChild className="mt-2">
          <a href="/movies">
            Browse Movies <Plus className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    );
  }

  // Movies grid
  return (
    <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-3 md:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-6`}>
      {movies.map((movie) => (
        <Card key={movie.slug} className="overflow-hidden flex flex-col group">
          <div className="relative cursor-pointer h-[220px]">
            <img
              src={movie.thumb_url || movie.thumbUrl || movie.poster_url || movie.posterUrl || '/default-poster.jpg'}
              alt={movie.name || movie.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/default-poster.jpg';
              }}
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
              onClick={() => onRemoveMovie(movie.slug)}
              disabled={removeLoading}
            >
              {removeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-semibold mb-1 line-clamp-1">{movie.name || movie.title}</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{movie.year}</span>
              {showWatchedToggle && onToggleWatched && (
                <Button
                  size="sm"
                  variant={movie.watched ? "default" : "outline"}
                  className="ml-auto mt-2"
                  onClick={() => onToggleWatched(movie.slug, !movie.watched)}
                  disabled={toggleLoading}
                >
                  {toggleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {movie.watched ? "Watched" : "Mark as Watched"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default WatchlistGrid;