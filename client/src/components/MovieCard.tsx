import { Link } from "wouter";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Play, Star, Calendar, Tv2 } from "lucide-react";
import { MovieListItem } from "@shared/schema";
import LazyImage from "./LazyImage";
import { logger } from "@/lib/logger";

interface MovieCardProps {
  movie: MovieListItem & {
    category?: { name: string; slug: string }[];
    episode_current?: string;
    episode_total?: string;
    episodeCurrent?: string;
    episodeTotal?: string;
    status?: string;
  };
}

// Utility function to extract episode information from episodeCurrent string
const extractEpisodeInfo = (episodeCurrent: string | null | undefined, episodeTotal: string | null | undefined): { current: number | null, total: number | null, isCompleted: boolean } => {
  if (!episodeCurrent) return { current: null, total: null, isCompleted: false };
  
  const totalEpisodes = episodeTotal ? parseInt(episodeTotal) : 0;
  
  // Handle "Full" or "Hoàn Tất" cases - these are completed series
  if (episodeCurrent.toLowerCase().includes('full') || episodeCurrent.toLowerCase().includes('hoàn tất')) {
    // For completed series, extract total from the string if available
    const completedMatch = episodeCurrent.match(/\((\d+)\/(\d+)\)/);
    if (completedMatch) {
      const current = parseInt(completedMatch[1]);
      const total = parseInt(completedMatch[2]);
      return { current, total, isCompleted: true };
    }
    // If no pattern match but we have episodeTotal, use that
    // Only mark as completed if it's actually a series (more than 1 episode)
    const isCompleted = totalEpisodes > 1;
    return { current: totalEpisodes, total: totalEpisodes, isCompleted };
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
      return { current: parseInt(match[1]), total: totalEpisodes, isCompleted: false };
    }
  }
  
  return { current: null, total: totalEpisodes, isCompleted: false };
};

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
    // Enhanced episode badge logic with proper extraction
  const episodeCurrent = movie.episode_current || movie.episodeCurrent;
  const episodeTotal = movie.episode_total || movie.episodeTotal;
  
  const episodeInfo = extractEpisodeInfo(episodeCurrent, episodeTotal);
  
  // Hide badge if episodeCurrent is 'Full' and episodeTotal equals '1'
  const isFullSingleMovie = episodeCurrent?.toLowerCase().includes('full') && 
                           (episodeTotal === '1' || parseInt(episodeTotal || '0') === 1);
  
  const shouldShowEpisodeBadge = 
    episodeInfo.total && episodeInfo.total > 1 && !isFullSingleMovie;
      // Determine badge text - More compact for mobile
  const getBadgeText = () => {
    if (episodeInfo.isCompleted) {
      return `${episodeInfo.total}`;
    } else if (episodeInfo.current && episodeInfo.total) {
      return `${episodeInfo.current}/${episodeInfo.total}`;
    } else if (episodeInfo.total) {
      return `${episodeInfo.total}`;
    }
    return '';
  };

  // Status badge logic - Compact icons/badges for mobile
  const getStatusBadgeInfo = () => {
    const status = movie.status?.toLowerCase();
    
    // For "Completed" status, check if it's a single-episode movie
    if (status === 'completed') {
      // Get episode information
      const episodeTotal = movie.episode_total || movie.episodeTotal;
      
      // Check if it's a single-episode movie (total episodes = 1 or no episode info)
      const totalEpisodes = episodeTotal ? parseInt(episodeTotal) : 1;
      const isSingleEpisode = totalEpisodes <= 1;
      
      // Hide "Completed" badge for single-episode movies
      if (isSingleEpisode) {
        return null;
      }
      
      // Use checkmark icon for completed status
      return { text: '✓', variant: 'success' as const, tooltip: 'Completed' };
    }
    
    switch (status) {
      case 'ongoing':
        return { text: '▶', variant: 'warning' as const, tooltip: 'Ongoing' };
      case 'upcoming':
        return { text: '⏳', variant: 'secondary' as const, tooltip: 'Upcoming' };
      case 'canceled':
        return { text: '✕', variant: 'destructive' as const, tooltip: 'Canceled' };
      default:
        return null;
    }
  };

  const statusBadgeInfo = getStatusBadgeInfo();

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="movie-card group relative rounded-lg overflow-hidden cursor-pointer">        
        <AspectRatio ratio={2/3}>
          <LazyImage
            src={movie.thumb_url || movie.thumbUrl || movie.poster_url || movie.posterUrl || "https://via.placeholder.com/300x450?text=No+Image"}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            rootMargin="75px"
            threshold={0.1}
            showSpinner={true}
            onError={() => {
              logger.error(`Failed to load image for movie: ${movie.name}`);
            }}
            errorFallback="https://via.placeholder.com/300x450?text=No+Image"
          />

          {/* Ultra Compact Year Badge - Top Right */}
          <Badge 
            variant="outline" 
            className="absolute top-1.5 right-1.5 bg-black/90 text-white border-white/20 text-[10px] sm:text-xs z-10 px-1.5 py-0.5 flex items-center gap-0.5 sm:gap-1"
          >
            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden sm:inline">{year}</span>
            <span className="sm:hidden">{year.slice(-2)}</span>
          </Badge>

          {/* Ultra Compact Episode Badge with Icon - Top Left */}
          {shouldShowEpisodeBadge && (
            <Badge 
              variant="secondary" 
              className="absolute top-1.5 left-1.5 bg-blue-600/95 hover:bg-blue-600 text-white z-10 text-[10px] sm:text-xs font-bold shadow-lg px-1.5 py-0.5 flex items-center gap-0.5"
            >
              <Tv2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span>{getBadgeText()}</span>
            </Badge>
          )}

          {/* Compact Status Icon Badge - Below Episode Badge */}
          {statusBadgeInfo && (
            <Badge 
              variant={statusBadgeInfo.variant}
              className={`absolute left-1.5 z-10 text-xs sm:text-sm font-bold shadow-lg px-1.5 py-0.5 ${shouldShowEpisodeBadge ? 'top-8 sm:top-9' : 'top-1.5'}`}
              title={statusBadgeInfo.tooltip}
            >
              {statusBadgeInfo.text}
            </Badge>
          )}
          
          {/* Enhanced Hover Overlay - Optimized for mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3 sm:pb-4">
            <div className="text-center text-white px-2 sm:px-4 w-full">
              <div className="flex items-center justify-center mb-1.5 sm:mb-2">
                <Play className="h-6 w-6 sm:h-8 sm:w-8 text-white bg-primary rounded-full p-1.5 sm:p-2" fill="white" />
              </div>
              <p className="text-xs sm:text-sm font-medium mb-1 line-clamp-2 px-1">{movie.name}</p>
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-xs">
                <span className="hidden sm:inline">{typeFormatted}</span>
                {displayRating && (
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-500 mr-0.5 sm:mr-1" fill="currentColor" />
                    <span>{displayRating}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AspectRatio>

        {/* Compact Title Below Image - Mobile Only */}
        <div className="mt-1.5 sm:mt-2 md:hidden">
          <p className="text-[11px] sm:text-xs font-medium line-clamp-2 text-foreground/90 leading-tight">{movie.name}</p>
        </div>
      </div>
    </Link>
  );
}
