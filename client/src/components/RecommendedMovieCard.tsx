import React from "react";
import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Star } from "lucide-react";

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
  
  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="group cursor-pointer">
        <div className="w-full overflow-hidden rounded-md mb-2">
          <AspectRatio ratio={aspectRatio}>
            <img
              src={movie.thumb_url || movie.poster_url}
              alt={movie.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
              }}
            />
          </AspectRatio>
        </div>
        <div className="flex flex-col">
          <div className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
            {movie.name}
          </div>
          {displayRating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
              <span>{displayRating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}