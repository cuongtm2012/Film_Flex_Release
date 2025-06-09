import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tv, Play, Loader2 } from "lucide-react";
import { MovieListResponse } from "@/types/api";

const TVShowsPage = () => {
  const [activeTab, setActiveTab] = useState("all");
    // Fetch TV shows - try the specific TV endpoint first, fallback to movies endpoint
  const { data, isLoading, isError } = useQuery<MovieListResponse>({
    queryKey: ["/api/movies/sections/popular_tv"],
    retry: 2,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  // Fallback query for general movies endpoint if TV endpoint fails
  const { data: fallbackData, isLoading: fallbackLoading } = useQuery<MovieListResponse>({
    queryKey: ["/api/movies"],
    enabled: isError, // Only run if the primary query fails
    retry: 1,
  });  // Use primary data or fallback data
  const sourceData = data || fallbackData;

  // Helper function to determine if a movie has multiple episodes
  const hasMultipleEpisodes = (movie: any): boolean => {
    // Check episode_total or episodeTotal fields
    const episodeTotal = movie.episode_total || movie.episodeTotal;
    if (episodeTotal) {
      const totalEpisodes = parseInt(String(episodeTotal));
      if (!isNaN(totalEpisodes) && totalEpisodes > 1) {
        return true;
      }
    }

    // Check episode_current or episodeCurrent for multi-episode indicators
    const episodeCurrent = movie.episode_current || movie.episodeCurrent || '';
    const currentStr = String(episodeCurrent).toLowerCase();
    
    // Look for patterns that indicate multiple episodes
    if (currentStr.includes('/') || // e.g., "12/24", "5/10"
        currentStr.includes('tập') || // Vietnamese episode indicator
        currentStr.includes('episode') ||
        currentStr.match(/\d+\/\d+/) || // Number/Number format
        currentStr.match(/hoàn tất.*\(\d+\/\d+\)/)) { // Completed series format
      return true;
    }

    // Check if status indicates ongoing series (likely multi-episode)
    const status = String(movie.status || '').toLowerCase();
    if (status === 'ongoing' || status === 'airing') {
      return true;
    }

    return false;
  };

  // Helper function to format episode badge text
  const getEpisodeBadgeText = (movie: any): string => {
    const episodeCurrent = movie.episode_current || movie.episodeCurrent || '';
    const episodeTotal = movie.episode_total || movie.episodeTotal || '';
    
    // Try to extract numbers from episode strings
    const currentMatch = String(episodeCurrent).match(/(\d+)/);
    const totalMatch = String(episodeTotal).match(/(\d+)/);
    
    const currentNum = currentMatch ? parseInt(currentMatch[1]) : null;
    const totalNum = totalMatch ? parseInt(totalMatch[1]) : null;
    
    if (currentNum && totalNum) {
      return `${currentNum}/${totalNum}`;
    } else if (totalNum) {
      return `${totalNum} Episodes`;
    } else if (currentNum) {
      return `Episode ${currentNum}`;
    } else if (episodeCurrent.toLowerCase().includes('hoàn tất')) {
      return 'Completed';
    } else if (movie.status === 'ongoing') {
      return 'Ongoing';
    }
    
    return 'Multi-Episode';
  };

  // Filter for TV shows with multiple episodes only
  const tvShows = sourceData?.items.filter(movie => {
    // Skip if movie is null/undefined
    if (!movie) return false;
    
    // Check type field with more flexible matching for TV series and multi-episode content
    const type = String(movie.type || '').toLowerCase();
    const isTV = type === 'tv' || type === 'series' || type === 'tv series';

    // Skip entries with missing essential data
    if (!movie.slug || !movie.name) {
      return false;
    }

    // Only include if it's a TV series AND has multiple episodes
    return isTV && hasMultipleEpisodes(movie);
  }) || [];

  const isLoadingData = isLoading || fallbackLoading;  // Debug logging to help troubleshoot any data issues
  useEffect(() => {
    if (sourceData?.items) {
      console.log(`TV Shows Page: Found ${sourceData.items.length} total items`);
      
      // Count different types for debugging
      const tvTypeCount = sourceData.items.filter(movie => {
        const type = String(movie?.type || '').toLowerCase();
        return type === 'tv' || type === 'series' || type === 'tv series';
      }).length;
      
      console.log(`TV Shows Page: ${tvTypeCount} items with TV/series type`);
      console.log(`TV Shows Page: After multi-episode filtering: ${tvShows.length} TV shows`);
        // Log some examples for debugging
      if (tvShows.length > 0) {
        console.log('Sample TV shows:', tvShows.slice(0, 3).map(show => ({
          name: show.name,
          type: show.type,
          episode_current: (show as any).episode_current || (show as any).episodeCurrent,
          episode_total: (show as any).episode_total || (show as any).episodeTotal,
          status: (show as any).status
        })));
      }
      
      // Log examples of filtered out TV content
      const filteredOut = sourceData.items.filter(movie => {
        const type = String(movie?.type || '').toLowerCase();
        const isTV = type === 'tv' || type === 'series' || type === 'tv series';
        return isTV && !hasMultipleEpisodes(movie);
      });
      
      if (filteredOut.length > 0) {
        console.log(`Filtered out ${filteredOut.length} single-episode TV content:`, 
          filteredOut.slice(0, 2).map(show => ({
            name: show.name,
            type: show.type,
            episode_current: (show as any).episode_current || (show as any).episodeCurrent,
            episode_total: (show as any).episode_total || (show as any).episodeTotal
          }))
        );
      }
    }
  }, [sourceData, tvShows, hasMultipleEpisodes]);

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError && !fallbackData) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Error Loading TV Shows</h2>
        <p className="text-muted-foreground mb-6">
          There was a problem loading the TV shows. Please try again later.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          Reload Page
        </Button>
      </div>
    );
  }

  if (tvShows.length === 0) {
    return (      <div className="container mx-auto px-4 py-20 text-center">
        <Tv className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-4">No Multi-Episode TV Series Found</h2>
        <p className="text-muted-foreground mb-6">
          We couldn't find any TV series with multiple episodes at the moment. This could be because:<br/>
          • The multi-episode content is still loading<br/>
          • All available TV content consists of single episodes or movies<br/>
          • The episode data is not properly formatted<br/>
          • No ongoing or completed series are available right now
        </p>
        <p className="text-sm text-muted-foreground">
          This page only shows TV series with 2 or more episodes. Try checking back later or browse our movie collection instead.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <Tv className="mr-3 h-8 w-8 text-primary" />
            TV Series
          </h1>
          <p className="text-muted-foreground">
            Discover multi-episode TV series and shows with our curated collection
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Showing only series with multiple episodes • {tvShows.length} series available
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">        <TabsList>
          <TabsTrigger value="all">All Series</TabsTrigger>
          <TabsTrigger value="action">Action Series</TabsTrigger>
          <TabsTrigger value="drama">Drama Series</TabsTrigger>
          <TabsTrigger value="comedy">Comedy Series</TabsTrigger>
        </TabsList>        <TabsContent value="all" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tvShows.map((show) => (
              <Card key={show.slug} className="overflow-hidden group">
                <Link href={`/movie/${show.slug}`}>
                  <div className="relative cursor-pointer h-[260px]">
                    <img
                      src={show.posterUrl || show.thumbUrl}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" /> Watch Now
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                      {show.year}
                    </div>
                    <Badge className="absolute bottom-2 left-2 bg-primary/90 hover:bg-primary text-white text-xs">
                      {getEpisodeBadgeText(show)}
                    </Badge>
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{show.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {show.originName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>        {/* Filtered tabs would normally filter by genre, but for simplicity we'll just show a subset */}        <TabsContent value="action" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tvShows.slice(0, 5).map((show) => (
              <Card key={show.slug} className="overflow-hidden group">
                <Link href={`/movie/${show.slug}`}>
                  <div className="relative cursor-pointer h-[260px]">
                    <img
                      src={show.posterUrl || show.thumbUrl}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" /> Watch Now
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                      {show.year}
                    </div>
                    <Badge className="absolute bottom-2 left-2 bg-primary/90 hover:bg-primary text-white text-xs">
                      {getEpisodeBadgeText(show)}
                    </Badge>
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{show.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {show.originName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>        <TabsContent value="drama" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tvShows.slice(5, 10).map((show) => (
              <Card key={show.slug} className="overflow-hidden group">
                <Link href={`/movie/${show.slug}`}>
                  <div className="relative cursor-pointer h-[260px]">
                    <img
                      src={show.posterUrl || show.thumbUrl}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" /> Watch Now
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                      {show.year}
                    </div>
                    <Badge className="absolute bottom-2 left-2 bg-primary/90 hover:bg-primary text-white text-xs">
                      {getEpisodeBadgeText(show)}
                    </Badge>
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{show.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {show.originName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>        <TabsContent value="comedy" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tvShows.slice(10, 15).map((show) => (
              <Card key={show.slug} className="overflow-hidden group">
                <Link href={`/movie/${show.slug}`}>
                  <div className="relative cursor-pointer h-[260px]">
                    <img
                      src={show.posterUrl || show.thumbUrl}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" /> Watch Now
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                      {show.year}
                    </div>
                    <Badge className="absolute bottom-2 left-2 bg-primary/90 hover:bg-primary text-white text-xs">
                      {getEpisodeBadgeText(show)}
                    </Badge>
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{show.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {show.originName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TVShowsPage;