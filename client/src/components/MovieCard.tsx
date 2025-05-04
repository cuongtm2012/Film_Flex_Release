import React from "react";
import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface MovieCardProps {
  movie: MovieListItem;
}

export default function MovieCard({ movie }: MovieCardProps) {
  // Debug log to see movie data
  console.log("Movie data:", movie);
  
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
            src={movie.posterUrl || movie.poster_url || movie.thumbUrl || movie.thumb_url}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
            }}
          />
        </AspectRatio>
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
