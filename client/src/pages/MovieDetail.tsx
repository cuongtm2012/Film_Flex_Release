import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  Play, 
  Plus, 
  Share2, 
  Star, 
  AlertCircle,
  Loader2,
  Search,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ServerTabs from "@/components/ServerTabs";
import EpisodeList from "@/components/EpisodeList";
import VideoPlayer from "@/components/VideoPlayer";
import { CommentSection } from "@/components/CommentSection";
import RecommendedMovieCard from "@/components/RecommendedMovieCard";
import { apiRequest } from "@/lib/queryClient";
import { MovieDetailResponse, Comment, MovieListResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MovieDetailProps {
  slug: string;
}

export default function MovieDetail({ slug }: MovieDetailProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State for selected server and episode
  const [selectedServer, setSelectedServer] = useState("");
  const [selectedEpisode, setSelectedEpisode] = useState("");
  const [isEpisodeLoading, setIsEpisodeLoading] = useState(false);
  const [isEpisodeSwitching, setIsEpisodeSwitching] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  
  // Fetch movie details
  const { 
    data: movieDetail,
    isLoading: isMovieLoading,
    isError: isMovieError
  } = useQuery<MovieDetailResponse>({
    queryKey: [`/api/movies/${slug}`],
    enabled: !!slug
  });

  // Handle initial server and episode selection when data loads
  React.useEffect(() => {
    if (movieDetail?.episodes && movieDetail.episodes.length > 0) {
      const firstServer = movieDetail.episodes[0].server_name;
      setSelectedServer(firstServer);
      
      const firstEpisode = movieDetail.episodes[0].server_data[0]?.slug;
      if (firstEpisode) {
        setSelectedEpisode(firstEpisode);
      }
    }
  }, [movieDetail]);
  
  // Fetch recommendations
  const {
    data: recommendationsData,
    isLoading: isRecommendationsLoading
  } = useQuery<MovieListResponse>({
    queryKey: [`/api/movies/${slug}/recommendations`],
    enabled: !!slug
  });
  
  // Fetch comments
  const {
    data: commentsData,
    isLoading: isCommentsLoading,
    refetch: refetchComments
  } = useQuery<{ data: Comment[], total: number }>({
    queryKey: [`/api/movies/${slug}/comments`, { page: 1, limit: 5 }],
    enabled: !!slug
  });
  
  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: () => {
      return apiRequest("POST", `/api/users/1/watchlist`, { movieSlug: slug });
    },
    onSuccess: () => {
      toast({
        title: "Added to My List",
        description: "This title has been added to your watchlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to watchlist",
        variant: "destructive"
      });
    }
  });
  
  // Handle server selection
  const handleServerSelect = (serverName: string) => {
    setSelectedServer(serverName);
    
    // Find first episode in the selected server
    const server = movieDetail?.episodes.find(s => s.server_name === serverName);
    if (server && server.server_data.length > 0) {
      setSelectedEpisode(server.server_data[0].slug);
      
      // Scroll to video player section
      document.getElementById('video-player')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      });
    }
  };
  
  // Handle episode selection with debounce to prevent rapid clicks
  const handleEpisodeSelect = (episodeSlug: string) => {
    // Prevent repeated rapid clicks
    if (isEpisodeSwitching || episodeSlug === selectedEpisode) {
      return;
    }

    // Set episode switching flags
    setIsEpisodeSwitching(true);
    setIsEpisodeLoading(true);
    
    // Get episode name/number for notification
    const currentEpisodeList = getCurrentEpisodeList();
    const selectedEpisodeObj = currentEpisodeList.find(ep => ep.slug === episodeSlug);
    let episodeLabel = "episode";
    
    if (selectedEpisodeObj) {
      const episodeName = selectedEpisodeObj.name;
      const episodeMatch = episodeName.match(/\d+/);
      if (episodeMatch) {
        episodeLabel = `Episode ${episodeMatch[0]}`;
      }
    }
    
    // Show loading notification
    toast({
      title: `Loading ${episodeLabel}...`,
      description: "Please wait while we prepare your video",
    });
    
    // Scroll to video player section
    document.getElementById('video-player')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start'
    });
    
    // Set the selected episode with a slight delay to simulate loading
    setTimeout(() => {
      setSelectedEpisode(episodeSlug);
      
      // Show now playing notification after a short delay
      setTimeout(() => {
        setIsEpisodeSwitching(false);
        setIsEpisodeLoading(false);
        setCurrentlyPlaying(episodeLabel);
        
        toast({
          title: `Now playing ${episodeLabel}`,
          description: "Video loaded successfully",
          variant: "default"
        });
      }, 1000);
    }, 800);
  };
  
  // Find current embed URL
  const getCurrentEmbedUrl = () => {
    if (!movieDetail || !selectedServer || !selectedEpisode) return "";
    
    const server = movieDetail.episodes.find(s => s.server_name === selectedServer);
    if (!server) return "";
    
    const episode = server.server_data.find(e => e.slug === selectedEpisode);
    return episode?.link_embed || "";
  };
  
  // Find current episode list
  const getCurrentEpisodeList = () => {
    if (!movieDetail || !selectedServer) return [];
    
    const server = movieDetail.episodes.find(s => s.server_name === selectedServer);
    return server?.server_data || [];
  };
  
  // Check if this is a single episode movie
  const isSingleEpisode = () => {
    if (!movieDetail || !movieDetail.episodes) return false;
    
    // If there's only one server with one episode, it's a single episode movie
    return (
      movieDetail.episodes.length === 1 && 
      movieDetail.episodes[0].server_data.length === 1
    );
  };
  
  // Handle add to watchlist
  const handleAddToWatchlist = () => {
    addToWatchlistMutation.mutate();
  };
  
  // Loading state
  if (isMovieLoading) {
    return (
      <div className="container mx-auto px-4 pt-10">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      </div>
    );
  }
  
  // Error state
  if (isMovieError || !movieDetail) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load movie details. Please try again later.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const { movie, episodes } = movieDetail;
  
  return (
    <div className="pt-10">
      {/* Back to Home link */}
      <div className="container mx-auto px-4 py-4">
        <Link to="/" className="flex items-center text-sm text-muted-foreground hover:text-white">
          <span>Back to Home</span> / <span>{movie.name}</span>
        </Link>
      </div>
      
      {/* Video Player and Episodes Section - Two-column layout */}
      <div className="container mx-auto px-4" id="video-player">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left Column - Video Player (70%) */}
          <div className="lg:col-span-7">
            {/* Main Video Player */}
            <div className="mb-6 relative z-10 shadow-xl border border-gray-800 bg-black rounded-md overflow-hidden">
              {/* Now Playing Indicator */}
              {currentlyPlaying && (
                <div className="absolute top-4 right-4 z-10 bg-black/80 px-3 py-1.5 rounded-full text-sm font-medium border border-primary/30 text-primary flex items-center animate-fadeIn">
                  <Play className="h-3.5 w-3.5 mr-1.5 animate-pulseOpacity" />
                  {currentlyPlaying}
                </div>
              )}
              
              {/* Loading Overlay */}
              {isEpisodeLoading && (
                <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center animate-fadeIn">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-3" />
                  <p className="text-white font-medium">Loading video...</p>
                  <div className="mt-6 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse w-1/2"></div>
                  </div>
                </div>
              )}
              
              <div className={`transition-opacity duration-500 ${isEpisodeSwitching ? 'opacity-30' : 'opacity-100'}`}>
                <VideoPlayer 
                  embedUrl={getCurrentEmbedUrl()}
                  isLoading={isMovieLoading || !selectedEpisode}
                  duration={movie.time || "N/A"}
                  onError={(error) => {
                    setIsEpisodeLoading(false);
                    setIsEpisodeSwitching(false);
                    toast({
                      title: "Error",
                      description: "Failed to load video player. Please try another server or episode.",
                      variant: "destructive"
                    });
                  }}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full flex items-center gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                  <span>8.3</span>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full flex items-center gap-1.5"
                onClick={() => {
                  // Handle share function
                  navigator.clipboard.writeText(window.location.href);
                  toast({
                    title: "Link copied",
                    description: "Movie link copied to clipboard",
                  });
                }}
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="rounded-full flex items-center gap-1.5"
                onClick={handleAddToWatchlist}
                disabled={addToWatchlistMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                <span>Add to List</span>
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="rounded-full flex items-center gap-1.5 ml-auto"
                onClick={() => {
                  // Handle report function
                  toast({
                    title: "Report submitted",
                    description: "Thank you for your feedback",
                  });
                }}
              >
                <AlertCircle className="h-4 w-4" />
                <span>Report</span>
              </Button>
            </div>
            
            {/* Server Selection - Only show if there are multiple servers */}
            {movieDetail.episodes.length > 1 && (
              <div className="mb-6 bg-black/40 p-3 rounded-md border border-gray-800">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Available Servers</h4>
                <ServerTabs 
                  servers={episodes} 
                  onServerSelect={handleServerSelect}
                  isLoading={isMovieLoading}
                />
              </div>
            )}
          </div>
          
          {/* Right Column - Episodes List (30%) */}
          <div className="lg:col-span-3">
            <div className="bg-black/20 rounded-md border border-gray-800 h-full">
              {/* Episodes Section Header */}
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold flex items-center">
                  <Play className="mr-2 h-5 w-5 text-primary" />
                  {isSingleEpisode() ? "Full Movie" : (movie.type === "series" ? "Episodes" : "Parts")}
                  {isSingleEpisode() && (
                    <Badge variant="outline" className="ml-2 bg-primary/10">Full Movie</Badge>
                  )}
                </h3>
              </div>
              
              {/* Episodes List with its own scrollbar */}
              {!isSingleEpisode() ? (
                <div className="p-4">
                  {/* Search/Filter Episodes Input */}
                  {getCurrentEpisodeList().length > 10 && (
                    <div className="mb-4">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search episodes..." 
                          className="w-full bg-black/40 border border-gray-700 rounded-md py-2 px-3 text-sm"
                        />
                        <Search className="h-4 w-4 absolute right-3 top-2.5 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  
                  {/* Episodes Grid with scroll area */}
                  <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {getCurrentEpisodeList().map((episode, index) => {
                        // Extract episode number for display
                        const episodeName = episode.name;
                        let episodeNumber = index + 1;
                        const episodeNumberMatch = episodeName.match(/\d+/);
                        if (episodeNumberMatch) {
                          episodeNumber = parseInt(episodeNumberMatch[0]);
                        }
                        
                        // Extract episode duration if available
                        const durationMatch = episode.filename?.match(/(\d+)[\s-]*min/i);
                        const episodeDuration = durationMatch ? `${durationMatch[1]} min` : "N/A";
                        
                        return (
                          <TooltipProvider key={episode.slug}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={selectedEpisode === episode.slug ? "default" : "outline"}
                                  className={`p-2 h-auto w-full rounded text-center transition relative ${
                                    selectedEpisode === episode.slug ? 
                                      "bg-primary hover:bg-primary/90 border-2 border-primary-foreground" : 
                                      "bg-muted hover:bg-primary/20"
                                  }`}
                                  onClick={() => handleEpisodeSelect(episode.slug)}
                                  disabled={isEpisodeSwitching || (isEpisodeLoading && selectedEpisode !== episode.slug)}
                                >
                                  {isEpisodeSwitching && selectedEpisode === episode.slug && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded z-10">
                                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                                    </div>
                                  )}
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-medium text-sm">Ep {episodeNumber}</span>
                                    {selectedEpisode === episode.slug && (
                                      <div className="mt-1 flex items-center justify-center space-x-1">
                                        <span className="h-1 w-1 rounded-full bg-current"></span>
                                        <span className="h-1 w-1 rounded-full bg-current"></span>
                                        <span className="h-1 w-1 rounded-full bg-current"></span>
                                      </div>
                                    )}
                                  </div>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium">{episodeName}</p>
                                  <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{episodeDuration}</span>
                                    </div>
                                    {episode.serverName && (
                                      <div className="flex items-center gap-1">
                                        <Server className="h-3 w-3" />
                                        <span>{episode.serverName}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Pagination for Episodes */}
                  {getCurrentEpisodeList().length > 20 && (
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Showing 1-20 of {getCurrentEpisodeList().length}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <span>1</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span>2</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span>...</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">This is a full movie without episodes.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Recommended Movies Bar */}
      <div className="container mx-auto px-4 mt-6 lg:mt-8 block">
        <div className="bg-black/20 rounded-md p-4 border border-gray-800">
          <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <Star className="h-5 w-5 mr-2 text-primary" fill="currentColor" />
              Recommended For You
            </span>
            <Link to={`/movies`} className="text-sm text-muted-foreground hover:text-primary flex items-center">
              See All <ChevronRight className="h-4 w-4" />
            </Link>
          </h3>
          
          {/* Scrollable Recommendations Carousel */}
          <div className="relative group">
            {/* Previous button */}
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 rounded-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-1/2 hover:bg-black"
              onClick={() => {
                const carousel = document.querySelector('.recommendations-carousel');
                if (carousel) {
                  carousel.scrollBy({ left: -carousel.clientWidth / 2, behavior: 'smooth' });
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {/* Scrollable content */}
            <div
              className="recommendations-carousel flex overflow-x-auto space-x-4 pb-4 custom-scrollbar snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {isRecommendationsLoading ? (
                // Loading placeholders
                Array(8).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse flex-none w-[180px] md:w-[200px] snap-start">
                    <div className="aspect-[2/3] bg-gray-800 rounded-md mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  </div>
                ))
              ) : recommendationsData?.items && recommendationsData.items.length > 0 ? (
                // Display recommendations
                recommendationsData.items.map((movie) => (
                  <div key={movie.slug} className="flex-none w-[180px] md:w-[200px] snap-start hover:scale-105 transition-transform duration-300">
                    <Link to={`/movie/${movie.slug}`} className="block">
                      <div className="relative aspect-[2/3] rounded-md overflow-hidden group mb-2">
                        <img 
                          src={movie.thumb_url || '/placeholder-portrait.png'} 
                          alt={movie.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                          <span className="text-white text-sm font-medium truncate">{movie.name}</span>
                        </div>
                      </div>
                      <h4 className="font-medium text-sm truncate">{movie.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {movie.quality || (movie.type === 'movie' ? 'Movie' : 'Series')}
                      </p>
                    </Link>
                  </div>
                ))
              ) : (
                // No recommendations found
                <div className="w-full py-4 text-center text-muted-foreground">
                  <p>No recommendations available for this movie.</p>
                </div>
              )}
            </div>
            
            {/* Next button */}
            <button
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 rounded-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-1/2 hover:bg-black"
              onClick={() => {
                const carousel = document.querySelector('.recommendations-carousel');
                if (carousel) {
                  carousel.scrollBy({ left: carousel.clientWidth / 2, behavior: 'smooth' });
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4">
        {/* Movie Meta */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8 mt-8">
          <div className="lg:col-span-3">
            <div>
              <h2 className="text-2xl font-bold mb-2">{movie.name}</h2>
              {movie.origin_name && movie.origin_name !== movie.name && (
                <h3 className="text-lg font-medium text-muted-foreground mb-4">({movie.origin_name})</h3>
              )}
            </div>
            
            <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6 text-sm">
              <div className="flex gap-1">
                <span className="text-muted-foreground">Release Year:</span>
                <span>{movie.year || 'Unknown'}</span>
              </div>
              
              <div className="flex gap-1">
                <span className="text-muted-foreground">Duration:</span>
                <span>{movie.time || 'Unknown'}</span>
              </div>
              
              <div className="flex gap-1">
                <span className="text-muted-foreground">Genre:</span>
                <span>{movie.category?.map(c => c.name).join(", ") || 'Unknown'}</span>
              </div>
              
              {movie.quality && (
                <div className="flex gap-1">
                  <span className="text-muted-foreground">Quality:</span>
                  <span>{movie.quality}</span>
                </div>
              )}
              
              <div className="flex gap-1">
                <span className="text-muted-foreground">Rating:</span>
                <span>{movie.tmdb?.vote_average || "N/A"}/10</span>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">Overview</h3>
              <p className="text-muted-foreground">
                {movie.content || 'No description available'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
              {movie.director?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-1">Director</h4>
                  <p>{movie.director.join(", ")}</p>
                </div>
              )}
              
              {movie.actor?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-1">Cast</h4>
                  <p>{movie.actor.join(", ")}</p>
                </div>
              )}
              
              {movie.country?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-1">Country</h4>
                  <p>{movie.country.map(c => c.name).join(", ")}</p>
                </div>
              )}
              
              {movie.lang && (
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-1">Languages</h4>
                  <p>{movie.lang}</p>
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="border border-muted p-3 rounded">
                  <h4 className="text-muted-foreground text-xs mb-1">Release Year</h4>
                  <p className="font-semibold">{movie.year || '2023'}</p>
                </div>
                <div className="border border-muted p-3 rounded">
                  <h4 className="text-muted-foreground text-xs mb-1">Duration</h4>
                  <p className="font-semibold">{movie.time || '150 min'}</p>
                </div>
                <div className="border border-muted p-3 rounded">
                  <h4 className="text-muted-foreground text-xs mb-1">Score/10</h4>
                  <p className="font-semibold">{movie.tmdb?.vote_average || "8.2"}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <h3 className="text-xl font-bold mb-3 flex items-center">
              <Star className="h-5 w-5 mr-2 text-primary" fill="currentColor" />
              More Like This
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {isRecommendationsLoading ? (
                // Loading placeholders for side recommendations
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[2/1] bg-gray-800 rounded mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  </div>
                ))
              ) : recommendationsData?.items && recommendationsData.items.length > 0 ? (
                // Display recommendations in sidebar
                recommendationsData.items.slice(0, 3).map((movie) => (
                  <RecommendedMovieCard key={movie.slug} movie={movie} size="small" />
                ))
              ) : (
                // No recommendations found
                <div className="bg-card/20 p-4 rounded-md border border-muted text-muted-foreground text-sm text-center">
                  <p>No similar movies found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        {/* Comments Section */}
        <div className="container mx-auto px-4 mb-10">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <CommentSection
              movieSlug={slug}
              comments={commentsData?.data || []}
              totalComments={commentsData?.total || 0}
              isLoading={isCommentsLoading}
              refetchComments={refetchComments}
            />
          </div>
        </div>
      </div>
    </div>
  );
}