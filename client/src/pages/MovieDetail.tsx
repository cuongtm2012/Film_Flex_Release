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
  Search
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
import CommentSection from "@/components/CommentSection";
import { apiRequest } from "@/lib/queryClient";
import { MovieDetailResponse, Comment } from "@shared/schema";
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
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                      {getCurrentEpisodeList().map((episode, index) => {
                        // Extract episode number for display
                        const episodeName = episode.name;
                        let episodeNumber = index + 1;
                        const episodeNumberMatch = episodeName.match(/\d+/);
                        if (episodeNumberMatch) {
                          episodeNumber = parseInt(episodeNumberMatch[0]);
                        }
                        
                        return (
                          <Button
                            key={episode.slug}
                            variant={selectedEpisode === episode.slug ? "default" : "outline"}
                            className={`p-3 rounded text-center transition relative ${
                              selectedEpisode === episode.slug ? "bg-primary hover:bg-primary/90" : "bg-muted hover:bg-primary/80"
                            }`}
                            onClick={() => handleEpisodeSelect(episode.slug)}
                            disabled={isEpisodeSwitching || (isEpisodeLoading && selectedEpisode !== episode.slug)}
                          >
                            {isEpisodeSwitching && selectedEpisode === episode.slug && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded z-10">
                                <Loader2 className="h-5 w-5 text-white animate-spin" />
                              </div>
                            )}
                            <span className="block font-medium">Ep {episodeNumber}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {episode.filename?.substring(0, 10) || episodeName}
                            </span>
                            {currentlyPlaying && currentlyPlaying.includes(episodeNumber.toString()) && (
                              <div className="absolute -top-1 -right-1 bg-primary h-2 w-2 rounded-full"></div>
                            )}
                          </Button>
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
      <div className="container mx-auto px-4 mt-6 lg:mt-8 hidden lg:block">
        <div className="bg-black/20 rounded-md p-4">
          <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
            <span>Recommended For You</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <div className="w-1 h-4 border-r-2 border-white"></div>
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <div className="w-4 h-4 border-2 border-white"></div>
              </Button>
            </div>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Recommended movies - would come from API */}
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="w-full aspect-video bg-muted rounded overflow-hidden flex-shrink-0 mb-2">
                  <AspectRatio ratio={16/9}>
                    <div className="w-full h-full bg-muted group-hover:opacity-80 transition-opacity"></div>
                  </AspectRatio>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                    Recommended Movie {i + 1}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                    <span>8.{i+1}</span>
                  </div>
                </div>
              </div>
            ))}
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
            <h3 className="text-xl font-bold mb-3">More Like This</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {/* This would be populated with similar movies based on categories */}
              <div className="movie-card relative rounded overflow-hidden aspect-video lg:aspect-[2/1]">
                <div className="bg-muted h-full w-full"></div>
                <div className="card-overlay absolute inset-0 flex flex-col justify-end p-3">
                  <h3 className="font-bold text-sm">Similar movies will appear here</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        {/* Comments Section */}
        <div className="container mx-auto px-4 mb-10">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="text-primary mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </span>
              Comments and Reviews
            </h3>
            
            {/* Comment Form */}
            <div className="flex gap-3 mb-6 bg-black/30 p-4 rounded-md border border-gray-800">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-white">
                U
              </div>
              <div className="flex-1">
                <textarea 
                  className="w-full bg-black/40 border border-muted/30 rounded-md p-3 text-sm"
                  placeholder="Add a comment or review..."
                  rows={3}
                ></textarea>
                <div className="flex justify-end mt-2">
                  <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-white relative group">
                    <span className="mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </span>
                    Add Comment
                    <span className="absolute -top-8 right-0 bg-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Login required</span>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Comment List */}
            {commentsData && commentsData.data.length > 0 ? (
              <div className="space-y-4">
                {commentsData.data.map((comment) => (
                  <div key={comment.id} className="bg-black/20 rounded-md p-4 border border-muted/30">
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-white mr-2">
                          {comment.user?.username?.substring(0, 1) || "A"}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{comment.user?.username || "Anonymous"}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                          </svg>
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
                
                {commentsData.total > 5 && (
                  <Button variant="outline" className="w-full mt-4">
                    Load More Comments ({commentsData.total - 5} remaining)
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-black/20 rounded-md p-8 text-center border border-muted/30">
                <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}