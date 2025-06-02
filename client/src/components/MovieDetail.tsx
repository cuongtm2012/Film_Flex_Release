import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import { toast } from 'react-hot-toast';
import type { MovieDetailResponse, EpisodeServer, EpisodeData } from '../types/api';

const MovieDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State declarations - keeping only one set
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeData | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isEpisodeLoading, setIsEpisodeLoading] = useState(false);
  const [isEpisodeSwitching, setIsEpisodeSwitching] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<EpisodeData | null>(null);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');

  // Query for movie details
  const {
    data: movieData,
    isLoading: isMovieLoading,
    error: movieError,
    refetch: refetchMovie
  } = useQuery({
    queryKey: ['movie', slug],
    queryFn: async (): Promise<MovieDetailResponse> => {
      if (!slug) throw new Error('Movie slug is required');
      const response = await apiRequest(`/api/movies/${slug}`, {
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch movie details');
      }
      return response.json();
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for watchlist status
  const { data: watchlistData } = useQuery({
    queryKey: ['watchlist-status', movieData?.movie?.id],
    queryFn: async () => {
      if (!movieData?.movie?.id) return { isInWatchlist: false };
      const response = await apiRequest(`/api/watchlist/status/${movieData.movie.id}`, {
        method: 'GET'
      });
      if (!response.ok) return { isInWatchlist: false };
      return response.json();
    },
    enabled: !!movieData?.movie?.id,
  });

  // Mutation for adding to watchlist
  const addToWatchlistMutation = useMutation({
    mutationFn: async (movieId: number) => {
      const response = await apiRequest('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      });
      if (!response.ok) {
        throw new Error('Failed to add to watchlist');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsInWatchlist(true);
      toast.success('Added to watchlist!');
      queryClient.invalidateQueries({ queryKey: ['watchlist-status'] });
    },
    onError: () => {
      toast.error('Failed to add to watchlist');
    },
  });

  // Mutation for removing from watchlist
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (movieId: number) => {
      const response = await apiRequest(`/api/watchlist/${movieId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove from watchlist');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsInWatchlist(false);
      toast.success('Removed from watchlist!');
      queryClient.invalidateQueries({ queryKey: ['watchlist-status'] });
    },
    onError: () => {
      toast.error('Failed to remove from watchlist');
    },
  });

  // Update watchlist status when data changes
  useEffect(() => {
    if (watchlistData?.isInWatchlist !== undefined) {
      setIsInWatchlist(watchlistData.isInWatchlist);
    }
  }, [watchlistData]);

  // Set initial episode and server when movie data loads
  useEffect(() => {
    if (movieData?.episodes && movieData.episodes.length > 0) {
      const firstEpisode = movieData.episodes[0];
      setSelectedEpisode(firstEpisode);
      
      if (firstEpisode.servers && firstEpisode.servers.length > 0) {
        setSelectedServer(firstEpisode.servers[0].name);
      }
    }
  }, [movieData]);

  // Filter episodes based on search query
  const filteredEpisodes = useMemo(() => {
    if (!movieData?.episodes) return [];
    if (!episodeSearchQuery.trim()) return movieData.episodes;
    
    return movieData.episodes.filter(episode =>
      episode.title.toLowerCase().includes(episodeSearchQuery.toLowerCase()) ||
      episode.episode_number.toString().includes(episodeSearchQuery)
    );
  }, [movieData?.episodes, episodeSearchQuery]);

  // Get current server URL
  const currentServerUrl = useMemo(() => {
    if (!selectedEpisode?.servers || !selectedServer) return '';
    const server = selectedEpisode.servers.find(s => s.name === selectedServer);
    return server?.url || '';
  }, [selectedEpisode, selectedServer]);

  const handleWatchlistToggle = () => {
    if (!movieData?.movie?.id) return;
    
    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate(movieData.movie.id);
    } else {
      addToWatchlistMutation.mutate(movieData.movie.id);
    }
  };

  const handleEpisodeChange = async (episode: EpisodeData) => {
    if (episode.id === selectedEpisode?.id) return;
    
    setIsEpisodeSwitching(true);
    setSelectedEpisode(episode);
    
    if (episode.servers && episode.servers.length > 0) {
      setSelectedServer(episode.servers[0].name);
    }
    
    setCurrentlyPlaying(episode);
    
    setTimeout(() => {
      setIsEpisodeSwitching(false);
    }, 500);
  };

  const handleServerChange = (serverName: string) => {
    setSelectedServer(serverName);
  };

  if (isMovieLoading) {
    return <div>Loading...</div>;
  }

  if (movieError || !movieData?.movie) {
    return <div>Error loading movie details</div>;
  }

  return (
    <div className="movie-detail">
      <h1>{movieData.movie.title}</h1>
      <button onClick={handleWatchlistToggle}>
        {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
      </button>
      
      <div className="episode-search">
        <input
          type="text"
          placeholder="Search episodes..."
          value={episodeSearchQuery}
          onChange={(e) => setEpisodeSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="episodes-list">
        {filteredEpisodes.map(episode => (
          <div key={episode.id} className="episode-item">
            <div className="episode-info" onClick={() => handleEpisodeChange(episode)}>
              <span className="episode-title">{episode.title}</span>
              <span className="episode-number">Episode {episode.episode_number}</span>
            </div>
            <div className="servers-list">
              {episode.servers?.map(server => (
                <div
                  key={server.name}
                  className={`server-item ${selectedServer === server.name ? 'active' : ''}`}
                  onClick={() => handleServerChange(server.name)}
                >
                  {server.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {currentlyPlaying && (
        <div className="currently-playing">
          <h2>Currently Playing</h2>
          <div className="episode-info">
            <span className="episode-title">{currentlyPlaying.title}</span>
            <span className="episode-number">Episode {currentlyPlaying.episode_number}</span>
          </div>
          <div className="server-info">
            <span>Server: {selectedServer}</span>
          </div>
          <video
            src={currentServerUrl}
            controls
            autoPlay
            onLoadStart={() => setIsEpisodeLoading(true)}
            onLoadedData={() => setIsEpisodeLoading(false)}
          />
          {isEpisodeLoading && <div>Loading video...</div>}
        </div>
      )}
      
      <div className="movie-description">
        <h2>Description</h2>
        <p>{movieData.movie.description}</p>
      </div>
      
      <div className="movie-meta">
        <div className="meta-item">
          <strong>Release Date:</strong> {new Date(movieData.movie.release_date).toLocaleDateString()}
        </div>
        <div className="meta-item">
          <strong>Rating:</strong> {movieData.movie.rating}
        </div>
        <div className="meta-item">
          <strong>Duration:</strong> {movieData.movie.duration} minutes
        </div>
        <div className="meta-item">
          <strong>Genres:</strong> {movieData.movie.genres.join(', ')}
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;