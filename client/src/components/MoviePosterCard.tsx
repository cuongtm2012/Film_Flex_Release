import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Play, Star, ListVideo } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoviePosterCardProps {
  movie: MovieListItem & {
    category?: { name: string; slug: string }[];
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

  // Enhanced episode badge logic with proper extraction
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

          {/* Episode Badge - Top Left */}
          {shouldShowEpisodeBadge && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 bg-blue-600/90 hover:bg-blue-600 text-white z-10 flex items-center gap-1 text-xs font-medium shadow-lg"
            >
              <ListVideo size={10} />
              {currentEpisodeNumber}/{totalEpisodes}
            </Badge>
          )}

          {/* Year Badge - Top Right */}
          <Badge 
            variant="outline" 
            className="absolute top-2 right-2 bg-black/70 text-white border-white/20 text-xs"
          >
            {year}
          </Badge>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 hover:opacity-100 transition-all duration-300 ease-in-out">
            {/* Content in bottom area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              {/* Title */}
              <h3 className="font-bold text-sm mb-2 line-clamp-2">
                {movie.name}
              </h3>
              
              {/* Rating and Categories */}
              <div className="flex items-center justify-between text-xs mb-3">
                {displayRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                    <span className="font-medium">{displayRating}</span>
                  </div>
                )}
                
                {categories.length > 0 && (
                  <div className="flex gap-1">
                    {categories.map((category, index) => (
                      <span key={index} className="text-xs bg-white/20 px-2 py-1 rounded">
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Play Button */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 bg-primary/90 hover:bg-primary text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                  <Play className="w-4 h-4" fill="white" />
                  <span>{isTvSeries ? 'Watch Series' : 'Watch Movie'}</span>
                </div>
              </div>
            </div>
          </div>
        </AspectRatio>
      </div>
    </Link>
  );
}