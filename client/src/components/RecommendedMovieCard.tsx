import React from "react";
import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Star, Play, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecommendedMovieCardProps {
  movie: MovieListItem;
  size?: "small" | "medium";
}

export default function RecommendedMovieCard({ movie, size = "medium" }: RecommendedMovieCardProps) {
  // Get rating if available
  const rating = movie.tmdb?.vote_average || 0;
  const displayRating = rating > 0 ? rating.toFixed(1) : null;
  
  // Handle aspect ratio based on size
  const aspectRatio = size === "small" ? 16/9 : 2/3;
  
  // Movie year
  const year = movie.year || new Date().getFullYear();
  
  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="group cursor-pointer relative">
        <div className="w-full overflow-hidden rounded-md mb-2 relative">
          <AspectRatio ratio={aspectRatio}>
            <img
              src={movie.thumb_url || movie.poster_url}
              alt={movie.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
              }}
            />
            {/* Overlay information on hover - only visible for medium size */}
            {size === "medium" && (
              <div className="absolute inset-0 bg-black/70 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="font-bold text-sm line-clamp-2 mb-1">{movie.name}</h3>
                <div className="flex items-center space-x-2 text-xs mb-2">
                  {displayRating && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-3 w-3" fill="currentColor" />
                      <span>{displayRating}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-gray-300">
                    <Calendar className="h-3 w-3" />
                    <span>{year}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-1 w-full">
                  <Play className="h-3 w-3 mr-1" />
                  Watch Now
                </Button>
              </div>
            )}
            
            {/* Quick hover info for small cards in sidebar */}
            {size === "small" && (
              <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Play className="h-8 w-8 text-primary" />
              </div>
            )}
          </AspectRatio>
        </div>
        <div className="flex flex-col">
          <div className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
            {movie.name}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            {displayRating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                <span>{displayRating}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{year}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}