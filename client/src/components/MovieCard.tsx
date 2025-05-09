import React from "react";
import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Film, Tv } from "lucide-react";

interface MovieCardProps {
  movie: MovieListItem;
}

export default function MovieCard({ movie }: MovieCardProps) {
  // Extract the year from the movie data
  const year = movie.year || parseInt(movie.modified?.time?.toString().substring(0, 4)) || "N/A";
  
  // Determine movie type
  const type = movie.tmdb?.type || "movie";
  
  // Format the type string for display
  const typeFormatted = type === "tv" ? "TV" : "Movie";
  
  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="movie-card group relative rounded overflow-hidden cursor-pointer">
        <AspectRatio ratio={2/3}>
          <img
            src={movie.poster_url || movie.thumb_url}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
            }}
          />
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
        
        <div className="card-overlay absolute inset-0 flex flex-col justify-end p-3">
          <h3 className="font-bold text-sm sm:text-base truncate">{movie.name}</h3>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{year}</span>
            <span>{typeFormatted}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
