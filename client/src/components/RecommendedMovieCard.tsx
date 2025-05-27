import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Play, Star, ListVideo } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecommendedMovieCardProps {
  movie: MovieListItem & {
    category?: { name: string; slug: string }[];
    episode_current?: string;
    episode_total?: string;
    episodeCurrent?: string;
    episodeTotal?: string;
  };
  size?: "small" | "medium" | "large";
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
  
  const currentEpisodeNumber = extractEpisodeNumber(episodeCurrent);
  const totalEpisodes = episodeTotal ? parseInt(episodeTotal) : 0;
  
  const shouldShowEpisodeBadge = 
    totalEpisodes > 1 && 
    currentEpisodeNumber && 
    currentEpisodeNumber > 0 &&
    totalEpisodes > 0;

  // Get the correct image URL with proper fallbacks
  const imageUrl = movie.posterUrl || movie.poster_url || movie.thumbUrl || movie.thumb_url || "https://via.placeholder.com/300x450?text=No+Image";

  return (
    <Link href={`/movie/${movie.slug}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="group cursor-pointer relative">
              <div className="w-full overflow-hidden rounded-md mb-2 relative bg-gray-900">
                <AspectRatio ratio={aspectRatio}>
                  <img
                    src={imageUrl}
                    alt={movie.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      // Try fallback URLs in order
                      if (target.src !== "https://via.placeholder.com/300x450?text=No+Image") {
                        if (movie.thumbUrl && target.src !== movie.thumbUrl) {
                          target.src = movie.thumbUrl;
                        } else if (movie.thumb_url && target.src !== movie.thumb_url) {
                          target.src = movie.thumb_url;
                        } else if (movie.posterUrl && target.src !== movie.posterUrl) {
                          target.src = movie.posterUrl;
                        } else if (movie.poster_url && target.src !== movie.poster_url) {
                          target.src = movie.poster_url;
                        } else {
                          target.src = "https://via.placeholder.com/300x450?text=No+Image";
                        }
                      }
                    }}
                  />
                  
                  {/* Episode Badge - Top Left */}
                  {shouldShowEpisodeBadge && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 bg-blue-600/90 hover:bg-blue-600 text-white z-20 flex items-center gap-1 text-xs font-medium shadow-lg"
                    >
                      <ListVideo size={10} />
                      {currentEpisodeNumber}/{totalEpisodes}
                    </Badge>
                  )}
                  
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