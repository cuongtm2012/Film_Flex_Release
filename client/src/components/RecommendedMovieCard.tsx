import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Star } from "lucide-react";
import LazyImage from "./LazyImage";
import { logger } from "@/lib/logger";

interface RecommendedMovieCardProps {
  movie: MovieListItem & {
    category?: { name: string; slug: string }[];
    episode_current?: string;
    episode_total?: string;
    episodeCurrent?: string;
    episodeTotal?: string;
    status?: string;
    quality?: string;
    lang?: string;
  };
  size?: "small" | "medium" | "large";
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
    return { current: totalEpisodes, total: totalEpisodes, isCompleted: true };
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

export default function RecommendedMovieCard({ movie, size = "medium" }: RecommendedMovieCardProps) {
  // Get rating if available
  const rating = movie.tmdb?.vote_average || 0;
  const displayRating = rating > 0 ? rating.toFixed(1) : null;

  // Handle aspect ratio based on size
  const aspectRatio = size === "small" ? 16 / 9 : 2 / 3;

  // Movie year
  const year = movie.year || new Date().getFullYear();

  // Format movie type/category for display
  const categories = movie.category?.map(c => c.name).join(", ") || "Movie";
  // Enhanced episode badge logic with proper extraction
  const episodeCurrent = movie.episode_current || movie.episodeCurrent;
  const episodeTotal = movie.episode_total || movie.episodeTotal;

  const episodeInfo = extractEpisodeInfo(episodeCurrent, episodeTotal);

  const shouldShowEpisodeBadge =
    episodeInfo.total && episodeInfo.total > 1;

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

  // Status badge logic
  const getStatusBadgeInfo = () => {
    const status = movie.status?.toLowerCase();
    switch (status) {
      case 'completed':
        return { text: 'Completed', variant: 'success' as const };
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

  // Get the correct image URL with proper fallbacks (prioritize thumb_url as it's more reliable)
  const imageUrl = movie.thumb_url || movie.thumbUrl || movie.poster_url || movie.posterUrl || "https://via.placeholder.com/300x450?text=No+Image";

  // Get episode information for display
  const getEpisodeDisplay = () => {
    if (episodeInfo.isCompleted && episodeInfo.total) {
      return `${episodeInfo.total} Eps`;
    } else if (episodeInfo.current && episodeInfo.total) {
      return `${episodeInfo.current}/${episodeInfo.total} Eps`;
    } else if (episodeInfo.total && episodeInfo.total > 1) {
      return `${episodeInfo.total} Eps`;
    }
    return null;
  };

  const episodeDisplay = getEpisodeDisplay();

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="group cursor-pointer relative">
        {/* Movie Thumbnail with Aspect Ratio */}
        <div className="w-full overflow-hidden rounded-lg mb-2 relative bg-gray-900">
          <AspectRatio ratio={aspectRatio}>
            <LazyImage
              src={imageUrl}
              alt={movie.name}
              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
              rootMargin="50px"
              threshold={0.1}
              showSpinner={true}
              errorFallback="https://via.placeholder.com/300x450?text=No+Image"
              onError={() => {
                logger.error(`Failed to load image for recommended movie: ${movie.name}`);
              }}
            />

            {/* Advanced Hover Overlay - Bottom Gradient with Smart Info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
              <div className="w-full p-2.5 sm:p-3">
                {/* Movie Title */}
                <h4 className="text-white font-semibold text-xs sm:text-sm line-clamp-2 mb-1.5">
                  {movie.name}
                </h4>

                {/* Info Tags Row */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs">
                  {/* Rating */}
                  {displayRating && (
                    <div className="flex items-center gap-0.5 bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">
                      <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="currentColor" />
                      <span className="font-medium">{displayRating}</span>
                    </div>
                  )}

                  {/* Year */}
                  <div className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded">
                    {year}
                  </div>

                  {/* Episode Count */}
                  {episodeDisplay && (
                    <div className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">
                      {episodeDisplay}
                    </div>
                  )}

                  {/* Quality Badge */}
                  {movie.quality && (
                    <div className="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-medium uppercase">
                      {movie.quality}
                    </div>
                  )}

                  {/* Language Badge */}
                  {movie.lang && (
                    <div className="bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">
                      {movie.lang}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AspectRatio>
        </div>

        {/* Title Below Thumbnail - Hidden on hover */}
        <div className="flex flex-col group-hover:opacity-0 transition-opacity duration-300">
          <div className="text-xs sm:text-sm font-medium line-clamp-1 text-foreground">
            {movie.name}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mt-1">
            {displayRating && (
              <div className="flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500" fill="currentColor" />
                <span>{displayRating}</span>
              </div>
            )}
            <span>{year}</span>
            {episodeDisplay && (
              <>
                <span>•</span>
                <span>{episodeDisplay}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}