import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  Play, 
  Plus, 
  Share2, 
  Star, 
  AlertCircle,
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ServerTabs from "@/components/ServerTabs";
import EpisodeList from "@/components/EpisodeList";
import VideoPlayer from "@/components/VideoPlayer";
import CommentSection from "@/components/CommentSection";
import { apiRequest } from "@/lib/queryClient";
import { MovieDetailResponse, Comment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function MovieDetail() {
  const [, params] = useRoute("/movie/:slug");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const slug = params?.slug || "";
  
  // State for selected server and episode
  const [selectedServer, setSelectedServer] = useState("");
  const [selectedEpisode, setSelectedEpisode] = useState("");
  
  // Fetch movie details
  const { 
    data: movieDetail,
    isLoading: isMovieLoading,
    isError: isMovieError
  } = useQuery<MovieDetailResponse>({
    queryKey: [`/api/movies/${slug}`],
    enabled: !!slug,
    onSuccess: (data) => {
      // Initialize selected server and episode when data loads
      if (data.episodes && data.episodes.length > 0) {
        const firstServer = data.episodes[0].server_name;
        setSelectedServer(firstServer);
        
        const firstEpisode = data.episodes[0].server_data[0]?.slug;
        if (firstEpisode) {
          setSelectedEpisode(firstEpisode);
        }
      }
    }
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
    }
  };
  
  // Handle episode selection
  const handleEpisodeSelect = (episodeSlug: string) => {
    setSelectedEpisode(episodeSlug);
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
          <Link href="/">
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
      
      {/* Main video player area */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Video Player */}
            <div id="video-player" className="bg-black rounded-md overflow-hidden mb-6">
              <VideoPlayer 
                embedUrl={getCurrentEmbedUrl()}
                isLoading={isMovieLoading || !selectedEpisode}
                onError={(error) => {
                  toast({
                    title: "Error",
                    description: "Failed to load video player. Please try another server or episode.",
                    variant: "destructive"
                  });
                }}
              />
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
          </div>
          
          {/* Recommended Movies Sidebar */}
          <div className="lg:col-span-1">
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
              
              <div className="space-y-3">
                {/* Recommended movies - would come from API */}
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                      <AspectRatio ratio={16/9}>
                        <div className="w-full h-full bg-muted"></div>
                      </AspectRatio>
                    </div>
                    <div className="flex flex-col justify-between">
                      <div className="text-sm font-semibold line-clamp-2">
                        Recommended Movie {i + 1}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
                        <span>95% match</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs text-muted-foreground mt-2 mx-auto block"
                >
                  Show more (2 more)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4">
        {/* Movie Meta */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">About "{movie.name}"</h3>
              <p className="text-muted-foreground">
                {movie.content}
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
        
        {/* Server Selection & Episodes */}
        <div id="video-player" className="mb-10 scroll-mt-20">
          <h3 className="text-xl font-bold mb-4">Watch "{movie.name}"</h3>
          
          {/* Server Selection Tabs */}
          <ServerTabs 
            servers={episodes} 
            onServerSelect={handleServerSelect}
            isLoading={isMovieLoading}
          />
          
          {/* Video Player */}
          <VideoPlayer 
            embedUrl={getCurrentEmbedUrl()}
            isLoading={isMovieLoading || !selectedEpisode}
            onError={(error) => {
              toast({
                title: "Error",
                description: "Failed to load video player. Please try another server or episode.",
                variant: "destructive"
              });
            }}
          />
          
          {/* Episodes List (for series) */}
          {movie.type === "series" && (
            <EpisodeList 
              episodes={getCurrentEpisodeList()}
              activeEpisode={selectedEpisode}
              onSelectEpisode={handleEpisodeSelect}
              isLoading={isMovieLoading}
            />
          )}
          
          {/* Comments Section */}
          <CommentSection 
            movieSlug={slug}
            comments={commentsData?.data || []}
            isLoading={isCommentsLoading}
            onRefreshComments={refetchComments}
          />
        </div>
      </div>
    </div>
  );
}
