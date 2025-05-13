import React from 'react';
import { Link } from 'wouter';
import { MovieListItem } from '@shared/schema';
import { Play, Star, Clock, Calendar, Film, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';

interface Category {
  name: string;
  slug: string;
}

interface MoviePosterCardProps {
  movie: MovieListItem & {
    category?: Category[];
  };
  className?: string;
}

export default function MoviePosterCard({ movie, className }: MoviePosterCardProps) {
  // Get rating if available
  const rating = movie.tmdb?.vote_average || 0;
  const displayRating = rating > 0 ? rating.toFixed(1) : null;

  // Get the correct image URL
  const imageUrl = movie.posterUrl || movie.poster_url || movie.thumbUrl || movie.thumb_url || '/placeholder-poster.jpg';

  // Get year and categories
  const year = movie.year || new Date().getFullYear();
  const categories = movie.category?.slice(0, 2) || [];

  // Determine if it's a TV series or movie
  const isTvSeries = movie.type?.toLowerCase() === 'tv';

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div 
        className={cn(
          "relative w-full overflow-hidden rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/50",
          className
        )}
      >
        <AspectRatio ratio={2/3}>
          {/* Movie Poster Image */}
          <div className="w-full h-full bg-black/20">
            <img
              src={imageUrl}
              alt={`${movie.name} Poster`}
              className="w-full h-full object-cover transition-transform duration-300 ease-out hover:scale-105"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-poster.jpg';
              }}
            />
          </div>

          {/* Type Badge - Always visible */}
          <div className="absolute top-2 left-2 z-10">
            <Badge 
              variant="secondary" 
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-medium",
                isTvSeries 
                  ? "bg-blue-500/80 hover:bg-blue-500/90" 
                  : "bg-primary/80 hover:bg-primary/90"
              )}
            >
              {isTvSeries ? (
                <>
                  <Tv className="w-3 h-3" />
                  <span>TV Series</span>
                </>
              ) : (
                <>
                  <Film className="w-3 h-3" />
                  <span>Movie</span>
                </>
              )}
            </Badge>
          </div>

          {/* Hover Overlay - Only visible on hover */}
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent 
                       opacity-0 hover:opacity-100 transition-all duration-300 ease-in-out
                       flex flex-col items-center justify-end p-4"
          >
            {/* Content Container */}
            <div className="w-full space-y-2">
              {/* Title */}
              <h3 className="text-base md:text-lg font-bold text-white text-center line-clamp-2">
                {movie.name}
              </h3>

              {/* Year and Rating Row */}
              <div className="flex items-center justify-center gap-3 text-sm text-gray-300">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{year}</span>
                </div>
                {displayRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span>{displayRating}</span>
                  </div>
                )}
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                  {categories.map((cat: Category) => (
                    <Badge 
                      key={cat.slug} 
                      variant="secondary" 
                      className="text-xs bg-white/10 hover:bg-white/20"
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Play Button */}
              <div className="pt-3 flex justify-center">
                <button
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary 
                            transition-all duration-200 transform scale-95 hover:scale-100
                            hover:bg-primary/90 active:scale-95 text-sm font-medium"
                  aria-label={`Play ${movie.name}`}
                >
                  <Play className="w-4 h-4" fill="white" />
                  <span>Watch Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* Accessibility Enhancement */}
          <div className="sr-only">
            {movie.name}
            {isTvSeries ? ' - TV Series' : ' - Movie'}
            {displayRating && ` - Rating: ${displayRating} out of 10`}
            {year && ` - Released in ${year}`}
            {categories.length > 0 && ` - Categories: ${categories.map((c: Category) => c.name).join(', ')}`}
          </div>
        </AspectRatio>
      </div>
    </Link>
  );
} 