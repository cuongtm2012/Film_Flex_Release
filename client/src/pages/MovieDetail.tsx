import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Clock,
  Info,
  FileText,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ServerTabs from "@/components/ServerTabs";
import VideoPlayer from "@/components/VideoPlayer";
import HLSVideoPlayer from "@/components/HLSVideoPlayer";
import { CommentSection } from "@/components/CommentSection";
import RecommendedMovieCard from "@/components/RecommendedMovieCard";
import MovieReactions from "@/components/MovieReactions";
import { MovieSEO } from "@/components/MovieSEO";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ShareDialog from "@/components/ShareDialog";
import { apiRequest } from "@/lib/queryClient";
import { MovieDetailResponse, Comment, MovieListResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MovieDetailProps {
  slug: string;
}

interface WatchlistCheckResponse {
  inWatchlist: boolean;
  movieSlug?: string;
  userId?: number;
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
  const [playerType, setPlayerType] = useState<"embed" | "hls">("embed"); // Default to Embed Player
  // State for content expanding (overview section)
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // State for movie details expanding
  const [isMovieDetailsExpanded, setIsMovieDetailsExpanded] = useState(false);

  // State for episode search
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");

  // State for share dialog
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

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

  // Auto-focus on video player when navigating to movie detail page on mobile
  useEffect(() => {
    // This will run when the page loads and when currentlyPlaying changes
    const isMobile = window.innerWidth <= 768; // iPhone XR width is 414px
    const videoPlayerElement = document.getElementById('video-player');

    if (isMobile && videoPlayerElement && selectedEpisode) {
      // Short delay to ensure the player has rendered
      setTimeout(() => {
        videoPlayerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [selectedEpisode, currentlyPlaying]); // Dependency on both episode selection and playing status

  // Fetch recommendations
  const {
    data: recommendationsData,
    isLoading: isRecommendationsLoading
  } = useQuery<MovieListResponse>({
    queryKey: [`/api/movies/${slug}/recommendations?limit=10`],
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

  // Get user info from auth context
  const { user } = useAuth();
  const userId = user?.id || 1; // Default to 1 for demo if not logged in

  // Check if movie is in watchlist
  const {
    data: watchlistData,
    isLoading: isWatchlistLoading
  } = useQuery<WatchlistCheckResponse>({
    queryKey: [`/api/users/${userId}/watchlist/check/${slug}`],
    enabled: !!userId
  });

  // Initialize with a default value if the data is not loaded yet
  const isInWatchlist = watchlistData ? !!watchlistData.inWatchlist : false;

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: () => {
      return apiRequest("POST", `/api/users/${userId}/watchlist`, { userId, movieSlug: slug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/watchlist`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/watchlist/check/${slug}`] });
      toast({
        title: "Added to My List",
        description: "This title has been added to your watchlist",
      });
    }, onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add to watchlist",
        variant: "destructive"
      });
    }
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: () => {
      return apiRequest("DELETE", `/api/users/${userId}/watchlist/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/watchlist`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/watchlist/check/${slug}`] });
      toast({
        title: "Removed from My List",
        description: "This title has been removed from your watchlist",
      });
    }, onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove from watchlist",
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

  // Find current M3U8 URL for direct HLS playback
  const getCurrentM3u8Url = () => {
    if (!movieDetail || !selectedServer || !selectedEpisode) return "";

    const server = movieDetail.episodes.find(s => s.server_name === selectedServer);
    if (!server) return "";

    const episode = server.server_data.find(e => e.slug === selectedEpisode);
    return episode?.link_m3u8 || "";
  };

  // Find current episode list
  const getCurrentEpisodeList = () => {
    if (!movieDetail || !selectedServer) return [];

    const server = movieDetail.episodes.find(s => s.server_name === selectedServer);
    return server?.server_data || [];
  };

  // Filter episodes based on search query
  const getFilteredEpisodeList = () => {
    const episodes = getCurrentEpisodeList();
    if (!episodeSearchQuery.trim()) return episodes;

    return episodes.filter(episode => {
      const searchLower = episodeSearchQuery.toLowerCase();
      // Search in episode name and extract episode number
      const episodeName = episode.name.toLowerCase();
      const episodeNumberMatch = episode.name.match(/\d+/);
      const episodeNumber = episodeNumberMatch ? episodeNumberMatch[0] : '';

      return (
        episodeName.includes(searchLower) ||
        episodeNumber.includes(episodeSearchQuery) ||
        episode.filename?.toLowerCase().includes(searchLower)
      );
    });
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

  // Handle toggle watchlist (add or remove)
  const handleToggleWatchlist = () => {
    if (!user) {
      // If not logged in, redirect to login or show login prompt
      toast({
        title: "Login Required",
        description: "Please log in to add movies to your list",
        variant: "destructive"
      });
      return;
    }

    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate();
    } else {
      addToWatchlistMutation.mutate();
    }
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
      {/* SEO Meta Tags */}
      <ErrorBoundary fallback={null}>
        <MovieSEO movie={movie} slug={slug} />
      </ErrorBoundary>

      {/* Back to Home Button - Beautiful Style */}
      <div className="container mx-auto px-4 py-4">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </Button>
        </Link>
      </div>

      {/* Video Player and Episodes Section - Optimized Responsive layout */}
      <div className="container mx-auto px-4 max-w-screen-2xl" id="video-player">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Main Column - Video Player */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Main Video Player */}
            <div className="mb-4 relative z-10 shadow-xl border border-gray-800 bg-black rounded-md overflow-hidden">
              {/* Now Playing Indicator */}
              {currentlyPlaying && (
                <div className="absolute top-3 right-3 z-10 bg-black/80 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium border border-primary/30 text-primary flex items-center animate-fadeIn">
                  <Play className="h-3 w-3 mr-1.5 animate-pulseOpacity" />
                  {currentlyPlaying}
                </div>
              )}

              {/* Loading Overlay */}
              {isEpisodeLoading && (
                <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center animate-fadeIn">
                  <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary animate-spin mb-2 sm:mb-3" />
                  <p className="text-white font-medium text-sm sm:text-base">Loading video...</p>
                  <div className="mt-4 sm:mt-6 w-48 sm:w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse w-1/2"></div>
                  </div>
                </div>
              )}

              <div className={`transition-opacity duration-500 ${isEpisodeSwitching ? 'opacity-30' : 'opacity-100'}`}>
                {/* Player Type Toggle - Hidden on mobile */}
                <div className="absolute top-2 right-2 z-30 hidden sm:flex gap-1 bg-black/60 backdrop-blur-sm rounded-lg p-1">
                  <Button
                    variant={playerType === "hls" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setPlayerType("hls")}
                  >
                    Direct Player
                  </Button>
                  <Button
                    variant={playerType === "embed" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setPlayerType("embed")}
                  >
                    Embed Player
                  </Button>
                </div>

                {playerType === "embed" ? (
                  <VideoPlayer
                    embedUrl={getCurrentEmbedUrl()}
                    isLoading={isMovieLoading || !selectedEpisode}
                  />
                ) : (
                  <HLSVideoPlayer
                    m3u8Url={getCurrentM3u8Url()}
                    isLoading={isMovieLoading || !selectedEpisode}
                    autoplay={false}
                    loop={false}
                    subtitles={[
                      // Add Vietnamese subtitles if available
                      // { label: "Tiếng Việt", src: "/path/to/vi.vtt", srclang: "vi" }
                    ]}
                  />
                )}
              </div>
            </div>

            {/* Action Buttons - Optimized */}
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Replace static rating with interactive reactions */}
              <MovieReactions movieSlug={slug} userId={user?.id} />

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3 rounded-full flex items-center gap-1"
                onClick={() => setIsShareDialogOpen(true)}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">Share</span>
              </Button>

              <Button
                variant={isInWatchlist ? "default" : "outline"}
                size="sm"
                className={`h-8 px-2 sm:px-3 rounded-full flex items-center gap-1 ${isInWatchlist ? 'bg-primary/90 hover:bg-primary/80' : ''}`}
                onClick={handleToggleWatchlist}
                disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending || isWatchlistLoading}
              >
                {isInWatchlist ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="text-xs hidden sm:inline">In My List</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-xs hidden sm:inline">Add to List</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3 rounded-full flex items-center gap-1 ml-auto"
                onClick={() => {
                  // Handle report function
                  toast({
                    title: "Report submitted",
                    description: "Thank you for your feedback",
                  });
                }}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">Report</span>
              </Button>
            </div>

            {/* Server Selection - Only show if there are multiple servers - Optimized */}
            {movieDetail.episodes.length > 1 && (
              <div className="mb-4 bg-black/40 p-3 rounded-md border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Available Servers</h4>
                  {/* Server dropdown for mobile only */}
                  <div className="lg:hidden">
                    <Select
                      value={selectedServer}
                      onValueChange={handleServerSelect}
                    >
                      <SelectTrigger className="w-[120px] h-7 text-xs">
                        <SelectValue placeholder="Select server" />
                      </SelectTrigger>
                      <SelectContent>
                        {episodes.map((server) => (
                          <SelectItem key={server.server_name} value={server.server_name}>
                            {server.server_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Server tabs for desktop only */}
                <div className="hidden lg:block">
                  <ServerTabs
                    servers={episodes}
                    onServerSelect={handleServerSelect}
                    isLoading={isMovieLoading}
                  />
                </div>
              </div>
            )}
            {/* Mobile Episodes Horizontal Scroll - Only visible on mobile and tablet */}
            {!isSingleEpisode() && (
              <div className="lg:hidden mb-4">                {/* Search Episodes Input for Mobile */}
                {getCurrentEpisodeList().length > 10 && (
                  <div className="mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search episodes..."
                        className="w-full bg-black/40 border border-gray-700 rounded-md py-2 px-3 pr-10 text-sm"
                        value={episodeSearchQuery}
                        onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                      />
                      {episodeSearchQuery ? (
                        <button
                          onClick={() => setEpisodeSearchQuery("")}
                          className="absolute right-8 top-2.5 text-muted-foreground hover:text-white text-lg"
                        >
                          ×
                        </button>
                      ) : null}
                      <Search className="h-4 w-4 absolute right-3 top-2.5 text-muted-foreground" />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold">Episodes:</h4>
                  <span className="text-xs text-muted-foreground">
                    {getFilteredEpisodeList().length} of {getCurrentEpisodeList().length} episodes
                  </span>
                </div>
                <ScrollArea className="w-full">
                  {getFilteredEpisodeList().length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">
                        {episodeSearchQuery.trim()
                          ? `No episodes found for "${episodeSearchQuery}"`
                          : "No episodes available"
                        }
                      </p>
                      {episodeSearchQuery.trim() && (
                        <button
                          onClick={() => setEpisodeSearchQuery("")}
                          className="text-primary text-sm mt-2 hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex space-x-2 pb-2 snap-x">
                      {getFilteredEpisodeList().map((episode, index) => {
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
                          <div key={episode.slug} className="flex-shrink-0 snap-start">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={selectedEpisode === episode.slug ? "default" : "outline"}
                                    size="sm"
                                    className={`h-9 w-11 sm:w-12 px-0 text-xs ${selectedEpisode === episode.slug
                                      ? "bg-primary text-white border-2 border-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                      : "bg-card/30 hover:bg-card/50"
                                      }`}
                                    onClick={() => handleEpisodeSelect(episode.slug)}
                                    disabled={isEpisodeSwitching || (isEpisodeLoading && selectedEpisode !== episode.slug)}
                                  >
                                    {isEpisodeSwitching && selectedEpisode === episode.slug ? (
                                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                    ) : (
                                      <span>{episodeNumber}</span>
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[150px]">
                                  <div className="text-xs">
                                    <div className="font-semibold">Episode {episodeNumber}</div>
                                    <div className="text-muted-foreground mt-1 truncate">{displayName}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>);
                      })}
                    </div>
                  )}
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Right Column - Episodes List (only visible on desktop) */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="bg-black/20 rounded-md border border-gray-800 h-full">
              {/* Episodes Section Header */}
              <div className="p-3 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold flex items-center">
                    <Play className="mr-2 h-4 w-4 text-primary" />
                    {isSingleEpisode() ? "Full Movie" : (movie.type === "series" ? "Episodes" : "Parts")}
                    {isSingleEpisode() && (
                      <Badge variant="outline" className="ml-2 bg-primary/10 text-xs">Full Movie</Badge>
                    )}
                  </h3>
                  {/* Episode count badge */}
                  {!isSingleEpisode() && (
                    <Badge variant="outline" className="bg-card/30">
                      {episodeSearchQuery.trim()
                        ? `${getFilteredEpisodeList().length} of ${getCurrentEpisodeList().length}`
                        : `${getCurrentEpisodeList().length} episodes`
                      }
                    </Badge>
                  )}
                </div>
              </div>

              {/* Episodes List with its own scrollbar */}
              {!isSingleEpisode() ? (
                <div className="p-4">                  {/* Search/Filter Episodes Input */}
                  {getCurrentEpisodeList().length > 10 && (
                    <div className="mb-4">
                      <div className="relative">                        <input
                        type="text"
                        placeholder="Search episodes..."
                        className="w-full bg-black/40 border border-gray-700 rounded-md py-2 px-3 pr-10 text-sm"
                        value={episodeSearchQuery}
                        onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                      />
                        {episodeSearchQuery ? (
                          <button
                            onClick={() => setEpisodeSearchQuery("")}
                            className="absolute right-8 top-2.5 text-muted-foreground hover:text-white text-lg"
                          >
                            ×
                          </button>
                        ) : null}
                        <Search className="h-4 w-4 absolute right-3 top-2.5 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  {/* Episodes Grid with scroll area */}
                  <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {getFilteredEpisodeList().length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">
                          {episodeSearchQuery.trim()
                            ? `No episodes found for "${episodeSearchQuery}"`
                            : "No episodes available"
                          }
                        </p>
                        {episodeSearchQuery.trim() && (
                          <button
                            onClick={() => setEpisodeSearchQuery("")}
                            className="text-primary text-sm mt-2 hover:underline"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {getFilteredEpisodeList().map((episode, index) => {
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
                                    className={`px-2 py-1.5 h-auto rounded text-center transition relative ${selectedEpisode === episode.slug
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
                            </TooltipProvider>);
                        })}
                      </div>
                    )}
                  </div>
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

            {/* Overview section - Mobile optimized with collapsible content */}
            <div className="mb-5 bg-card/20 rounded-md p-4 border border-gray-800">
              <h3 className="text-lg font-bold mb-2 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Overview
              </h3>
              <div className="relative">
                <p className={`text-base leading-relaxed tracking-wide text-gray-200 ${!isContentExpanded ? 'line-clamp-4' : ''}`}>
                  {movie.content || 'No description available'}
                </p>

                {(movie.content?.length || 0) > 200 && (
                  <div className={`${!isContentExpanded ? 'absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent' : ''} flex justify-center`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-primary rounded-full"
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

            {/* Cast and Crew - Enhanced with toggle functionality */}
            <div className="mb-5">
              <button
                onClick={() => setIsMovieDetailsExpanded(!isMovieDetailsExpanded)}
                className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md"
                aria-expanded={isMovieDetailsExpanded}
                aria-controls="movie-details-content"
              >
                <h3 className="text-lg font-bold mb-3 flex items-center justify-between hover:text-primary transition-colors">
                  <span className="flex items-center">
                    <Info className="h-5 w-5 mr-2 text-primary" />
                    Movie Details
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-primary transition-transform duration-300 ${isMovieDetailsExpanded ? 'rotate-180' : ''
                      }`}
                  />
                </h3>
              </button>

              {/* Collapsible Content */}
              <div
                id="movie-details-content"
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isMovieDetailsExpanded
                  ? 'max-h-[1000px] opacity-100'
                  : 'max-h-0 opacity-0'
                  }`}
                aria-hidden={!isMovieDetailsExpanded}
              >
                <div className="bg-card/20 rounded-md border border-gray-800 divide-y divide-gray-800">
                  {movie.director?.length > 0 && (
                    <div className="p-3 flex items-start">
                      <div className="w-8 flex-shrink-0 flex justify-center mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 16 4-4-4-4"></path>
                          <path d="m6 8-4 4 4 4"></path>
                          <path d="m14.5 4-5 16"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-muted-foreground mb-1">Director</h4>
                        <p className="text-sm">{movie.director.join(", ")}</p>
                      </div>
                    </div>
                  )}

                  {movie.actor?.length > 0 && (
                    <div className="p-3 flex items-start">
                      <div className="w-8 flex-shrink-0 flex justify-center mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-muted-foreground mb-1">Cast</h4>
                        <p className="text-sm">{movie.actor.join(", ")}</p>
                      </div>
                    </div>
                  )}

                  {movie.country?.length > 0 && (
                    <div className="p-3 flex items-start">
                      <div className="w-8 flex-shrink-0 flex justify-center mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12h20"></path>
                          <path d="M2 12a10 10 0 0 1 10-10v0a10 10 0 0 1 10 10"></path>
                          <path d="M2 12a10 10 0 0 0 10 10h0a10 10 0 0 0 10-10"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-muted-foreground mb-1">Country</h4>
                        <p className="text-sm">{movie.country.map(c => c.name).join(", ")}</p>
                      </div>
                    </div>
                  )}

                  {movie.lang && (
                    <div className="p-3 flex items-start">
                      <div className="w-8 flex-shrink-0 flex justify-center mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 8h12a4 4 0 1 1 0 8H9"></path>
                          <path d="M4 22V2"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-muted-foreground mb-1">Languages</h4>
                        <p className="text-sm">{movie.lang}</p>
                      </div>
                    </div>
                  )}

                  {movie.category?.length > 0 && (
                    <div className="p-3 flex items-start">
                      <div className="w-8 flex-shrink-0 flex justify-center mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-muted-foreground mb-1">Genre</h4>
                        <div className="flex flex-wrap gap-2">
                          {movie.category.map(cat => (
                            <Badge key={cat.id} variant="outline" className="bg-primary/10 hover:bg-primary/20">
                              {cat.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                  <Link to="/top-rated" className="text-primary text-sm hover:underline flex items-center">
                    See More
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                )}
              </div>

              {isRecommendationsLoading ? (
                // Loading placeholders for recommendations
                <div className="grid grid-cols-2 gap-4">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[16/9] bg-gray-800 rounded mb-2"></div>
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recommendationsData?.items && recommendationsData.items.length > 0 ? (
                // Grid layout for all screen sizes
                <div className="grid grid-cols-2 gap-4">
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

      {/* Share Dialog - Controlled by state */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        url={window.location.href}
        title={movie.name}
      />
    </div>
  );
}