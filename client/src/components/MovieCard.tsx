import { Link } from "wouter";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Play, Star, ListVideo } from "lucide-react";
import { MovieListItem } from "@shared/schema";

interface MovieCardProps {
  movie: MovieListItem & {
    category?: { name: string; slug: string }[];
    episode_current?: string;
    episode_total?: string;
    episodeCurrent?: string;
    episodeTotal?: string;
  };
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
  
  const currentEpisodeNumber = extractEpisodeNumber(episodeCurrent);
  const totalEpisodes = episodeTotal ? parseInt(episodeTotal) : 0;
  
  const shouldShowEpisodeBadge = 
    totalEpisodes > 1 && 
    currentEpisodeNumber && 
    currentEpisodeNumber > 0 &&
    totalEpisodes > 0;

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="movie-card group relative rounded-lg overflow-hidden cursor-pointer">
        <AspectRatio ratio={2/3}>
          <img
            src={movie.posterUrl || movie.thumbUrl || movie.poster_url || movie.thumb_url || "https://via.placeholder.com/300x450?text=No+Image"}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
            }}
          />
          
          {/* Episode Badge - Top Left */}
          {shouldShowEpisodeBadge && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 bg-blue-600/90 hover:bg-blue-600 text-white z-10 flex items-center gap-1 text-xs font-medium shadow-lg"
            >
              <ListVideo size={12} />
              {currentEpisodeNumber}/{totalEpisodes}
            </Badge>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <div className="text-center text-white px-4">
              <div className="flex items-center justify-center mb-2">
                <Play className="h-8 w-8 text-white bg-primary rounded-full p-2" fill="white" />
              </div>
              <p className="text-sm font-medium mb-1">{movie.name}</p>
              <div className="flex items-center justify-center space-x-3 text-xs">
                <span>{year}</span>
                <span>•</span>
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
