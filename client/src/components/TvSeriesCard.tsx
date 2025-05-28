import { Link } from 'wouter';
import { MovieListItem } from '@shared/schema';
import { Play, Star, ListVideo } from 'lucide-react';
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

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div 
        className={cn(
          "group relative w-full overflow-hidden cursor-pointer",
          className
        )}
      >
        {/* TV Series Poster Container */}
        <div className="rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500/50">
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

            {/* Episode Badge - Top Left */}
            {shouldShowEpisodeBadge && (
              <div className="absolute top-2 left-2 z-10">
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-blue-600/90 hover:bg-blue-600 text-white shadow-lg"
                >
                  <ListVideo className="w-3 h-3" />
                  <span className="truncate">{getBadgeText()}</span>
                </Badge>
              </div>
            )}

            {/* Status Badge - Below Episode Badge on Left */}
            {statusBadgeInfo && (
              <div className={`absolute left-2 z-10 ${shouldShowEpisodeBadge ? 'top-11' : 'top-2'}`}>
                <Badge 
                  variant={statusBadgeInfo.variant}
                  className="text-xs font-medium shadow-lg"
                >
                  {statusBadgeInfo.text}
                </Badge>
              </div>
            )}

            {/* Year Badge - Top Right Corner */}
            <Badge 
              variant="outline" 
              className="absolute top-2 right-2 bg-black/70 text-white border-white/20 text-xs z-10"
            >
              {year}
            </Badge>

            {/* Hover Overlay - Only visible on hover */}
            <div 
              className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent 
                         opacity-0 hover:opacity-100 transition-all duration-300 ease-in-out
                         flex flex-col items-center justify-end p-4"
            >
              {/* Content Container */}
              <div className="w-full space-y-2">
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
              {shouldShowEpisodeBadge && ` - ${getBadgeText()}`}
              {displayRating && ` - Rating: ${displayRating} out of 10`}
              {year && ` - Released in ${year}`}
              {categories.length > 0 && ` - Categories: ${categories.map((c: Category) => c.name).join(', ')}`}
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