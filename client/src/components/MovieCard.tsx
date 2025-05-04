import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { MovieListItem } from "@shared/schema";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Film, Tv, Layers } from "lucide-react";

interface MovieCardProps {
  movie: MovieListItem;
}

// Cache for episode counts to avoid repeated API calls
const episodeCountCache = new Map<string, number>();

export default function MovieCard({ movie }: MovieCardProps) {
  const [episodeCount, setEpisodeCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Extract the year from the movie data
  const year = movie.year || parseInt(movie.modified?.time?.toString().substring(0, 4)) || "N/A";
  
  // Determine movie type
  const type = movie.tmdb?.type || "movie";
  
  // Format the type string for display
  const typeFormatted = type === "tv" ? "TV" : "Movie";
  
  useEffect(() => {
    // Fetch episode counts for all content types
    const fetchEpisodeCount = async () => {
      // Check cache first
      if (episodeCountCache.has(movie.slug)) {
        setEpisodeCount(episodeCountCache.get(movie.slug) || 0);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/movies/${movie.slug}/episodes`);
        const data = await response.json();
        
        // Calculate episode count from the server_data array
        let count = 0;
        if (data.episodes && data.episodes.length > 0) {
          // Loop through each server
          data.episodes.forEach((server: any) => {
            // For servers with server_data array, count the episodes
            if (server.server_data && Array.isArray(server.server_data)) {
              count = Math.max(count, server.server_data.length);
            }
          });
        }
        
        // Default to 1 if we can't find any episodes but the API returned a result
        count = count || (data.episodes?.length > 0 ? 1 : 0);
        
        // Cache the result
        episodeCountCache.set(movie.slug, count);
        setEpisodeCount(count);
      } catch (error) {
        console.error("Error fetching episode count:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEpisodeCount();
  }, [movie.slug]);
  
  return (
    <Link href={`/movie/${movie.slug}`}>
      <div className="movie-card group relative rounded overflow-hidden cursor-pointer">
        <AspectRatio ratio={2/3}>
          <img
            src={movie.posterUrl || movie.poster_url || movie.thumbUrl || movie.thumb_url}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
            }}
          />
        </AspectRatio>
        
        {/* Multiple episodes badge */}
        {!isLoading && episodeCount && episodeCount > 1 ? (
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 bg-black/70 hover:bg-black/70 z-10"
          >
            <Layers size={14} className="mr-1" />
            {episodeCount} EP
          </Badge>
        ) : (
          // Show content type badge when there's only 1 episode or still loading
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 bg-black/70 hover:bg-black/70 z-10"
          >
            {type === "tv" ? (
              <>
                <Tv size={14} className="mr-1" />
                {isLoading ? "..." : "TV"}
              </>
            ) : (
              <>
                <Film size={14} className="mr-1" />
                Film
              </>
            )}
          </Badge>
        )}
        
        <div className="card-overlay absolute inset-0 flex flex-col justify-end p-3">
          <h3 className="font-bold text-sm sm:text-base truncate">{movie.name}</h3>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{year}</span>
            <span>{typeFormatted}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
