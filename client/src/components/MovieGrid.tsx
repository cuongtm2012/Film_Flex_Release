import React from 'react';
import { Link } from 'wouter';
import { Movie } from '@/types/api';
import { cn } from '@/lib/utils';
import { PlayCircle } from 'lucide-react';

interface MovieGridProps {
  movies: Movie[];
  className?: string;
}

export default function MovieGrid({ movies, className }: MovieGridProps) {
  if (!movies || movies.length === 0) {
    return <div className="text-center py-10">No movies found.</div>;
  }

  return (
    <div 
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6",
        className
      )}
    >
      {movies.map((movie) => (
        <MovieCard key={movie.slug} movie={movie} />
      ))}
    </div>
  );
}

interface MovieCardProps {
  movie: Movie;
}

function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link to={`/movie/${movie.slug}`}>
      <div className="group relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-105">
        {/* Movie poster */}
        <div className="aspect-[2/3] bg-muted overflow-hidden">
          {movie.posterUrl || movie.thumbUrl ? (
            <img
              src={movie.posterUrl || movie.thumbUrl}
              alt={movie.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
              No Image
            </div>
          )}
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-3 opacity-100 transition-opacity group-hover:opacity-100">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <PlayCircle className="h-16 w-16 text-primary drop-shadow-glow" />
          </div>

          <h3 className="line-clamp-1 text-sm font-medium text-white">{movie.name}</h3>
          
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{movie.year || 'Unknown'}</span>
            {movie.quality && (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                {movie.quality}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}