import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Play, Star, ListVideo } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LazyImage from "./LazyImage";

interface RecommendedMovieCardProps {
  movie: MovieListItem & {
    category?: { name: string; slug: string }[];
    episode_current?: string;
    episode_total?: string;
    episodeCurrent?: string;
    episodeTotal?: string;
    status?: string;
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
  const aspectRatio = size === "small" ? 16/9 : 2/3;
  
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
    if (episodeInfo.isCompleted) {    return `Ep ${episodeInfo.total}`;
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

  // Get the correct image URL with proper fallbacks
  const imageUrl = movie.posterUrl || movie.poster_url || movie.thumbUrl || movie.thumb_url || "https://via.placeholder.com/300x450?text=No+Image";

  return (
    <Link href={`/movie/${movie.slug}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="group cursor-pointer relative">
              <div className="w-full overflow-hidden rounded-md mb-2 relative bg-gray-900">                <AspectRatio ratio={aspectRatio}>
                  <LazyImage
                    src={imageUrl}
                    alt={movie.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    rootMargin="50px"
                    threshold={0.1}
                    showSpinner={true}
                    errorFallback="https://via.placeholder.com/300x450?text=No+Image"
                    onError={() => {
                      console.log(`Failed to load image for recommended movie: ${movie.name}`);
                    }}
                  />{/* Episode Badge - Top Left (Hidden by default, shown on hover) */}
                  {shouldShowEpisodeBadge && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 bg-blue-600/90 hover:bg-blue-600 text-white z-20 flex items-center gap-1 text-xs font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <ListVideo size={10} />
                      <span className="truncate">{getBadgeText()}</span>
                    </Badge>
                  )}

                  {/* Status Badge - Below Episode Badge on Left (Hidden by default, shown on hover) */}
                  {statusBadgeInfo && (
                    <Badge 
                      variant={statusBadgeInfo.variant}
                      className={`absolute left-2 z-20 text-xs font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${shouldShowEpisodeBadge ? 'top-11' : 'top-2'}`}
                    >
                      {statusBadgeInfo.text}
                    </Badge>
                  )}

                  {/* Year Badge - Top Right Corner (Hidden by default, shown on hover) */}
                  <Badge 
                    variant="outline" 
                    className="absolute top-2 right-2 bg-black/70 text-white border-white/20 text-xs z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    {year}
                  </Badge>
                  
                  {/* Quick play button overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="h-10 w-10 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white" fill="white" />
                    </div>
                  </div>
                </AspectRatio>
              </div>
              <div className="flex flex-col">
                <div className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                  {movie.name}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  {displayRating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                      <span>{displayRating}</span>
                    </div>
                  )}
                  <span>{year}</span>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <div className="font-semibold">{movie.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {categories} • {year}
              </div>
              {displayRating && (
                <div className="text-xs text-muted-foreground">
                  Rating: {displayRating}/10
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Link>
  );
}