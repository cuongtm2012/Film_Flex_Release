import { Link } from 'wouter';
import { MovieListItem } from '@shared/schema';
import { Play, Star, Calendar, ListVideo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';

interface Category {
  name: string;
  slug: string;
}

interface TvSeriesCardProps {
  movie: MovieListItem & {
    category?: Category[];
    episode_current?: string;
    episode_total?: string;
    episodeCurrent?: string;
    episodeTotal?: string;
  };
  className?: string;
}

// Utility function to extract current episode number from episodeCurrent string
const extractEpisodeNumber = (episodeCurrent: string | null | undefined): number | null => {
  if (!episodeCurrent) return null;
  
  // Handle "Full" or "Hoàn Tất" cases
  if (episodeCurrent.toLowerCase().includes('full') || episodeCurrent.toLowerCase().includes('hoàn tất')) {
    return null; // Don't show badge for completed series
  }
  
  // Extract number from formats like:
  // "Hoàn Tất (31/31)" -> 31
  // "Tập 12" -> 12  
  // "Episode 15" -> 15
  // "12" -> 12
  const patterns = [
    /\((\d+)\/\d+\)/,           // (31/31) format
    /tập\s*(\d+)/i,             // Tập 12 format
    /episode\s*(\d+)/i,         // Episode 15 format
    /^(\d+)$/                   // Plain number
  ];
  
  for (const pattern of patterns) {
    const match = episodeCurrent.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
};

export default function TvSeriesCard({ movie, className }: TvSeriesCardProps) {
  // Get rating if available
  const rating = movie.tmdb?.vote_average || 0;
  const displayRating = rating > 0 ? rating.toFixed(1) : null;

  // Get the correct image URL
  const imageUrl = movie.posterUrl || movie.poster_url || movie.thumbUrl || movie.thumb_url || '/placeholder-poster.jpg';

  // Get year and categories
  const year = movie.year || new Date().getFullYear();
  const categories = movie.category?.slice(0, 2) || [];

  // Enhanced episode badge logic with proper extraction - handle both property naming conventions
  const episodeCurrent = movie.episode_current || movie.episodeCurrent;
  const episodeTotal = movie.episode_total || movie.episodeTotal;
  
  const currentEpisodeNumber = extractEpisodeNumber(episodeCurrent);
  const totalEpisodes = episodeTotal ? parseInt(episodeTotal) : 0;
  
  const shouldShowEpisodeBadge = 
    totalEpisodes > 1 && 
    currentEpisodeNumber && 
    currentEpisodeNumber > 0 &&
    totalEpisodes > 0;

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div 
        className={cn(
          "relative w-full overflow-hidden rounded-lg cursor-pointer hover:ring-2 hover:ring-blue-500/50",
          className
        )}
      >
        <AspectRatio ratio={2/3}>
          {/* TV Series Poster Image */}
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

          {/* Episode Badge - Only show when conditions are met */}
          {shouldShowEpisodeBadge && (
            <div className="absolute top-2 left-2 z-10">
              <Badge 
                variant="secondary" 
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-blue-600/90 hover:bg-blue-600 text-white shadow-lg"
              >
                <ListVideo className="w-3 h-3" />
                <span>{currentEpisodeNumber}/{totalEpisodes}</span>
              </Badge>
            </div>
          )}

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

              {/* Watch Button */}
              <div className="pt-3 flex justify-center">
                <button
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-blue-500 
                            transition-all duration-200 transform scale-95 hover:scale-100
                            hover:bg-blue-500/90 active:scale-95 text-sm font-medium"
                  aria-label={`Watch ${movie.name}`}
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
            {` - TV Series`}
            {shouldShowEpisodeBadge && ` - Episode ${currentEpisodeNumber}/${totalEpisodes}`}
            {displayRating && ` - Rating: ${displayRating} out of 10`}
            {year && ` - Released in ${year}`}
            {categories.length > 0 && ` - Categories: ${categories.map((c: Category) => c.name).join(', ')}`}
          </div>
        </AspectRatio>
      </div>
    </Link>
  );
}