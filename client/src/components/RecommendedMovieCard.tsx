import React from "react";
import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Star, Play, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  // Format movie type/category for display
  const categories = movie.category?.map(c => c.name).join(", ") || "Movie";
  
  return (
    <Link href={`/movie/${movie.slug}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="group cursor-pointer relative">
              <div className="w-full overflow-hidden rounded-md mb-2 relative bg-gray-900">
                <AspectRatio ratio={aspectRatio}>
                  <img
                    src={movie.thumb_url || movie.poster_url}
                    alt={movie.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
                    }}
                  />
                  {/* Quick play button overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="h-10 w-10 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white" fill="white" />
                    </div>
                  </div>
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
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <div className="text-xs">
              <div className="font-semibold">{movie.name}</div>
              {movie.origin_name && movie.origin_name !== movie.name && (
                <div className="text-muted-foreground">{movie.origin_name}</div>
              )}
              <div className="mt-1 flex flex-col gap-1">
                {displayRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                    <span>Rating: {displayRating}/10</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Year: {year}</span>
                </div>
                <div>
                  <span>Category: {categories}</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Link>
  );
}