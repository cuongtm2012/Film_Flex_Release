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
      {/* Movie Header */}
      <div className="relative w-full h-[50vh] overflow-hidden mb-8">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${movie.poster_url}')`, filter: "blur(4px)" }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        <div className="container mx-auto px-4">
          <div className="absolute bottom-0 left-0 right-0 p-6 w-full flex flex-col md:flex-row md:items-end">
            <div className="hidden md:block md:w-1/4 lg:w-1/5 mr-6">
              <AspectRatio ratio={2/3} className="rounded-lg shadow-lg overflow-hidden">
                <img 
                  src={movie.poster_url} 
                  alt={movie.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/400x600?text=No+Image";
                  }}
                />
              </AspectRatio>
            </div>
            
            <div className="md:w-3/4 lg:w-4/5">
              <h1 className="text-3xl md:text-5xl font-bold mb-2 font-title">{movie.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                {movie.quality && (
                  <Badge className="bg-primary px-2 py-1 text-xs font-bold rounded">{movie.quality}</Badge>
                )}
                {movie.year && <span className="text-muted-foreground">{movie.year}</span>}
                {movie.time && <span className="text-muted-foreground">{movie.time}</span>}
                {movie.view !== undefined && (
                  <div className="flex items-center">
                    <Star className="text-yellow-500 mr-1 h-4 w-4" />
                    <span>{(movie.view / 1000).toFixed(1)}k</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {movie.category?.map((cat) => (
                  <Link key={cat.id} href={`/search?category=${cat.slug}`}>
                    <Badge variant="outline" className="px-3 py-1 rounded-full text-xs">
                      {cat.name}
                    </Badge>
                  </Link>
                ))}
              </div>
              
              <p className="text-muted-foreground mb-4 max-w-3xl line-clamp-3 md:line-clamp-none">
                {movie.content}
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full"
                  onClick={() => {
                    // Scroll to video player section
                    document.getElementById('video-player')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Play className="mr-2 h-4 w-4" /> Play
                </Button>
                
                <Button 
                  variant="secondary"
                  className="bg-gray-700/60 hover:bg-gray-600/60 text-white px-6 py-3 rounded-full"
                  onClick={handleAddToWatchlist}
                  disabled={addToWatchlistMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" /> My List
                </Button>
                
                <Button 
                  variant="secondary"
                  className="bg-gray-700/60 hover:bg-gray-600/60 text-white px-10 py-3 rounded-full"
                >
                  <Share2 className="h-4 w-4" />
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
