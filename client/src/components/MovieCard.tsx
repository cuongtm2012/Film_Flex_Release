import { Link } from "wouter";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Play, Star, ListVideo } from "lucide-react";
import { MovieListItem } from "@shared/schema";
import LazyImage from "./LazyImage";

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
      // Determine badge text
  const getBadgeText = () => {
    if (episodeInfo.isCompleted) {
      return `Ep ${episodeInfo.total}`;
    } else if (episodeInfo.current && episodeInfo.total) {
      return `${episodeInfo.current}/${episodeInfo.total}`;
    } else if (episodeInfo.total) {
      return `Ep ${episodeInfo.total}`;
    }
    return '';
  };

  // Status badge logic - hide "Completed" for single-episode movies
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
      
      return { text: 'Completed', variant: 'success' as const };
    }
    
    switch (status) {
      case 'ongoing':
        return { text: 'Ongoing', variant: 'warning' as const };
      case 'upcoming':
        return { text: 'Upcoming', variant: 'secondary' as const };
      case 'canceled':
        return { text: 'Canceled', variant: 'destructive' as const };
      default:
        return null;
    }
  };

  const statusBadgeInfo = getStatusBadgeInfo();

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="movie-card group relative rounded-lg overflow-hidden cursor-pointer">        <AspectRatio ratio={2/3}>
          <LazyImage
            src={movie.posterUrl || movie.thumbUrl || movie.poster_url || movie.thumb_url || "https://via.placeholder.com/300x450?text=No+Image"}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            rootMargin="75px"
            threshold={0.1}
            showSpinner={true}
            onError={() => {
              console.log(`Failed to load image for movie: ${movie.name}`);
            }}
          />

          {/* Episode Badge - Top Left */}
          {shouldShowEpisodeBadge && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 bg-blue-600/90 hover:bg-blue-600 text-white z-10 flex items-center gap-1 text-xs font-medium shadow-lg"
            >
              <ListVideo size={12} />
              <span className="truncate">{getBadgeText()}</span>
            </Badge>
          )}

          {/* Status Badge - Below Episode Badge on Left */}
          {statusBadgeInfo && (
            <Badge 
              variant={statusBadgeInfo.variant}
              className={`absolute left-2 z-10 text-xs font-medium shadow-lg ${shouldShowEpisodeBadge ? 'top-11' : 'top-2'}`}
            >
              {statusBadgeInfo.text}
            </Badge>
          )}

          {/* Year Badge - Top Right Corner */}
          <Badge 
            variant="outline" 
            className="absolute top-2 right-2 bg-black/70 text-white border-white/20 text-xs z-10"
          >
            {year}
          </Badge>
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <div className="text-center text-white px-4">
              <div className="flex items-center justify-center mb-2">
                <Play className="h-8 w-8 text-white bg-primary rounded-full p-2" fill="white" />
              </div>
              <p className="text-sm font-medium mb-1">{movie.name}</p>
              <div className="flex items-center justify-center space-x-3 text-xs">
                <span>{typeFormatted}</span>
                {displayRating && (
                  <>
                    <span>•</span>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-yellow-500 mr-1" fill="currentColor" />
                      <span>{displayRating}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </AspectRatio>
      </div>
    </Link>
  );
}
