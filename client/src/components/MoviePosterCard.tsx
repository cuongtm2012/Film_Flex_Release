import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Play, Star, ListVideo } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import LazyImage from "./LazyImage";

interface MoviePosterCardProps {
  movie: MovieListItem & {
    category?: { name: string; slug: string }[];
    episode_current?: string;
    episode_total?: string;
    episodeCurrent?: string;
    episodeTotal?: string;
    status?: string;
  };
  className?: string;
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
  
  const episodeInfo = extractEpisodeInfo(episodeCurrent, episodeTotal);
  
  const shouldShowEpisodeBadge = 
    episodeInfo.total && episodeInfo.total > 1;
    
  // Determine badge text
  const getBadgeText = () => {    if (episodeInfo.isCompleted) {
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
    }};

  const statusBadgeInfo = getStatusBadgeInfo();

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div
        className={cn(
          "group/card relative w-full overflow-hidden cursor-pointer rounded-lg",
          "transition-[transform,box-shadow] duration-300 ease-out will-change-transform",
          "hover:scale-[1.03] hover:shadow-xl hover:shadow-black/25 active:scale-[0.99]",
          className
        )}
      >
        {/* Movie Poster Container - không dùng ring hover để tránh viền đỏ lạ mắt */}
        <div className="rounded-lg overflow-hidden transition-all duration-300 ease-out">
          <AspectRatio ratio={2/3}>
            {/* Movie Poster Image */}
            <div className="w-full h-full bg-black/20 overflow-hidden">
              <LazyImage
                src={imageUrl}
                alt={`${movie.name} Poster`}
                className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover/card:scale-110"
                rootMargin="75px"
                threshold={0.1}
                showSpinner={true}
                errorFallback="/placeholder-poster.jpg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/placeholder-poster.jpg') {
                    target.src = '/placeholder-poster.jpg';
                  } else {
                    // If fallback also fails, don't try again
                    target.onerror = null;
                  }
                  logger.error(`Failed to load image for movie: ${movie.name}`);
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

            {/* Hover Overlay - chỉ hiện khi hover đúng card này (group/card) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 ease-out pointer-events-none">
              {/* Content in bottom area */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white flex flex-col items-center justify-end">
                {/* Rating and Categories */}
                <div className="flex items-center justify-between text-xs mb-3 w-full">
                  {displayRating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="currentColor" />
                      <span className="font-medium">{displayRating}</span>
                    </div>
                  )}
                  {categories.length > 0 && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {categories.map((category, index) => (
                        <span key={index} className="text-xs bg-white/25 px-2 py-0.5 rounded">
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Watch button - chỉ hiện khi hover đúng card này, màu đỏ nổi bật */}
                <div className="flex justify-center w-full">
                  <div className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg transition-all duration-200 group-hover/card:scale-105 group-hover/card:shadow-xl group-hover/card:bg-red-500">
                    <Play className="w-4 h-4 shrink-0" fill="white" />
                    <span>{isTvSeries ? 'Watch Series' : 'Watch Movie'}</span>
                  </div>
                </div>
              </div>
            </div>
          </AspectRatio>
        </div>

        {/* Always Visible Title Below Image */}
        <div className="mt-3 px-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
            {movie.name}
          </h3>
          <div className="flex items-center justify-between mt-1">
            {displayRating ? (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                <span className="text-xs font-medium">{displayRating}</span>
              </div>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}