import React from "react";
import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Film, Tv, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MovieCardProps {
  movie: MovieListItem;
}

export default function MovieCard({ movie }: MovieCardProps) {
  // Extract the year from the movie data
  const year = movie.year?.toString() || movie.modified?.time?.toString().substring(0, 4) || "N/A";
  
  // Determine movie type
  const type = movie.tmdb?.type || "movie";
  
  // Format the type string for display
  const typeFormatted = type === "tv" ? "TV" : "Movie";

  // Get rating if available
  const rating = movie.tmdb?.vote_average || 0;
  const displayRating = rating > 0 ? rating.toFixed(1) : null;
  
  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="movie-card group relative rounded-lg overflow-hidden cursor-pointer">
        <AspectRatio ratio={2/3}>
          <img
            src={movie.posterUrl || movie.thumbUrl || movie.poster_url || movie.thumb_url}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
            }}
          />
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
            <div className="space-y-2">
              <h3 className="font-bold text-sm sm:text-base line-clamp-2">{movie.name}</h3>
              {movie.origin_name && movie.origin_name !== movie.name && (
                <p className="text-sm text-gray-300 line-clamp-1">{movie.origin_name}</p>
              )}
              
              {/* Rating */}
              {displayRating && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm">{displayRating}/10</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>{year}</span>
                <span>{typeFormatted}</span>
              </div>
              
              <Button 
                className="w-full bg-primary hover:bg-primary/90 transition-colors"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Watch Now
              </Button>
            </div>
          </div>
        </AspectRatio>
        
        {/* Content type badge */}
        <Badge 
          variant="secondary" 
          className="absolute top-2 right-2 bg-black/70 hover:bg-black/70 z-10"
        >
          {type === "tv" ? (
            <>
              <Tv size={14} className="mr-1" />
              TV
            </>
          ) : (
            <>
              <Film size={14} className="mr-1" />
              Film
            </>
          )}
        </Badge>
      </div>
    </Link>
  );
}
