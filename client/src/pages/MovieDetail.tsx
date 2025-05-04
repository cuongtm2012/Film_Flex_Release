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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Info,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  
  // State for content expanding (overview section)
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
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
    
    // Set content expanded state when movie content is loaded
    if (movieDetail?.movie) {
      const content = movieDetail.movie.content || '';
      const isLongContent = content.length > 300;
      setIsContentExpanded(!isLongContent);
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
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {getCurrentEpisodeList().map((episode, index) => {
                        // Extract episode number for display
                        const episodeName = episode.name;
                        let episodeNumber = index + 1;
                        const episodeNumberMatch = episodeName.match(/\d+/);
                        if (episodeNumberMatch) {
                          episodeNumber = parseInt(episodeNumberMatch[0]);
                        }
                        
                        // Format episode name for tooltip
                        const displayName = episode.name.replace(/^Tập|Episode\s*/i, '').trim();
                        
                        return (
                          <TooltipProvider key={episode.slug}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={selectedEpisode === episode.slug ? "default" : "outline"}
                                  className={`px-2 py-1.5 h-auto rounded text-center transition relative ${
                                    selectedEpisode === episode.slug 
                                      ? "bg-primary hover:bg-primary/90 border-2 border-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" 
                                      : "bg-muted hover:bg-primary/20"
                                  }`}
                                  onClick={() => handleEpisodeSelect(episode.slug)}
                                  disabled={isEpisodeSwitching || (isEpisodeLoading && selectedEpisode !== episode.slug)}
                                >
                                  {isEpisodeSwitching && selectedEpisode === episode.slug && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded z-10">
                                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                                    </div>
                                  )}
                                  <span className="text-xs font-medium">Ep {episodeNumber}</span>
                                  
                                  {/* Playing indicator */}
                                  {currentlyPlaying && currentlyPlaying.includes(episodeNumber.toString()) && (
                                    <div className="absolute -top-1 -right-1 bg-primary h-2.5 w-2.5 rounded-full animate-pulse"></div>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px]">
                                <div className="text-xs">
                                  <div className="font-semibold">{displayName}</div>
                                  <div className="flex items-center mt-1 text-muted-foreground gap-2">
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span>{episode.link_embed?.includes('full') ? '90 min' : '45 min'}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Info className="h-3 w-3 mr-1" />
                                      <span>{episode.filename || 'Standard quality'}</span>
                                    </div>
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
      
      <div className="container mx-auto px-4 max-w-screen-2xl">
        {/* Movie Meta - Optimized Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 mt-8">
          {/* Main content - spans 8 columns on large screens */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div>
              <h2 className="text-2xl font-bold mb-2">{movie.name}</h2>
              {movie.origin_name && movie.origin_name !== movie.name && (
                <h3 className="text-lg font-medium text-muted-foreground mb-4">({movie.origin_name})</h3>
              )}
            </div>
            
            {/* Movie quick stats - more compact layout */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm">
              <div className="flex gap-1">
                <span className="text-muted-foreground">Release Year:</span>
                <span>{(movie as any).year || 'Unknown'}</span>
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
                <span>{(movie as any).tmdb?.vote_average || "N/A"}/10</span>
              </div>
            </div>
            
            {/* Quick Info Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
              <div className="bg-card/30 p-2 rounded text-center">
                <p className="text-xs text-muted-foreground">Year</p>
                <p className="font-semibold text-sm">{(movie as any).year || '2023'}</p>
              </div>
              <div className="bg-card/30 p-2 rounded text-center">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold text-sm">{movie.time || '150 min'}</p>
              </div>
              <div className="bg-card/30 p-2 rounded text-center">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="font-semibold text-sm">{(movie as any).tmdb?.vote_average || "8.2"}/10</p>
              </div>
              {movie.quality && (
                <div className="bg-card/30 p-2 rounded text-center">
                  <p className="text-xs text-muted-foreground">Quality</p>
                  <p className="font-semibold text-sm">{movie.quality}</p>
                </div>
              )}
              {movie.lang && (
                <div className="bg-card/30 p-2 rounded text-center">
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="font-semibold text-sm truncate">{movie.lang}</p>
                </div>
              )}
            </div>
            
            {/* Overview section */}
            <div className="mb-5 bg-card/20 rounded-md p-4 border border-gray-800">
              <h3 className="text-lg font-bold mb-2 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Overview
              </h3>
              <div className="relative">
                <p className={`text-base leading-relaxed tracking-wide text-gray-200 ${!isContentExpanded ? 'line-clamp-3' : ''}`}>
                  {movie.content || 'No description available'}
                </p>
                
                {(movie.content?.length || 0) > 300 && (
                  <div className={`${!isContentExpanded ? 'absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent' : ''} flex justify-center`}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 text-primary"
                      onClick={() => setIsContentExpanded(!isContentExpanded)}
                    >
                      {isContentExpanded ? (
                        <span className="flex items-center">Show less <ChevronUp className="ml-1 h-4 w-4" /></span>
                      ) : (
                        <span className="flex items-center">Read more <ChevronDown className="ml-1 h-4 w-4" /></span>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Cast and Crew - better column arrangement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
              {movie.director?.length > 0 && (
                <div className="bg-card/20 p-3 rounded-md border border-gray-800">
                  <h4 className="text-sm font-bold text-muted-foreground mb-1">Director</h4>
                  <p className="text-sm">{movie.director.join(", ")}</p>
                </div>
              )}
              
              {movie.actor?.length > 0 && (
                <div className="bg-card/20 p-3 rounded-md border border-gray-800">
                  <h4 className="text-sm font-bold text-muted-foreground mb-1">Cast</h4>
                  <p className="text-sm">{movie.actor.join(", ")}</p>
                </div>
              )}
              
              {movie.country?.length > 0 && (
                <div className="bg-card/20 p-3 rounded-md border border-gray-800">
                  <h4 className="text-sm font-bold text-muted-foreground mb-1">Country</h4>
                  <p className="text-sm">{movie.country.map(c => c.name).join(", ")}</p>
                </div>
              )}
              
              {movie.lang && (
                <div className="bg-card/20 p-3 rounded-md border border-gray-800">
                  <h4 className="text-sm font-bold text-muted-foreground mb-1">Languages</h4>
                  <p className="text-sm">{movie.lang}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar content - spans 4 columns on large screens */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-card/20 p-4 rounded-md border border-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold flex items-center">
                  <Star className="h-5 w-5 mr-2 text-primary" fill="currentColor" />
                  Recommended For You
                </h3>
                
                {/* See More Button */}
                {recommendationsData?.items && recommendationsData.items.length > 3 && (
                  <Link to={`/recommendations/${slug}`} className="text-primary text-sm hover:underline flex items-center">
                    See More
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                )}
              </div>
              
              {isRecommendationsLoading ? (
                // Loading placeholders for side recommendations
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[2/1] bg-gray-800 rounded mb-2"></div>
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recommendationsData?.items && recommendationsData.items.length > 0 ? (
                // Grid layout for both mobile and desktop
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                  {recommendationsData.items.slice(0, 6).map((movie) => (
                    <RecommendedMovieCard key={movie.slug} movie={movie} size="small" />
                  ))}
                </div>
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
        
        {/* Comments Section - Optimized */}
        <div className="mb-10">
          <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800">
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