// StreamService.ts - Service for fetching movie streams

export interface Stream {
  name: string;
  url: string;
}

class StreamService {
  /**
   * Fetch available streams from the API
   */
  async fetchStreams(): Promise<Stream[]> {
    try {
      // Make API call to fetch streams
      const response = await fetch('/api/movies');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract streams from the movie data
      if (data.movies && Array.isArray(data.movies)) {
        // Map movie data to streams
        return data.movies
          .filter((movie: any) => movie.episodes && movie.episodes.length > 0)
          .map((movie: any) => {
            // Get the first episode with an m3u8 link
            const episode = movie.episodes[0]?.server_data?.[0];
            
            return {
              name: movie.name || 'Unknown',
              url: episode?.link_m3u8 || ''
            };
          })
          .filter((stream: Stream) => stream.url !== '');
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching streams:', error);
      return [];
    }
  }
  
  /**
   * Fetch specific movie stream by slug
   */
  async fetchMovieStream(slug: string): Promise<Stream | null> {
    try {
      const response = await fetch(`/api/movies/${slug}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.movie && data.movie.episodes && data.movie.episodes.length > 0) {
        // Get the first episode with an m3u8 link
        const episode = data.movie.episodes[0]?.server_data?.[0];
        
        if (episode && episode.link_m3u8) {
          return {
            name: data.movie.name || 'Unknown',
            url: episode.link_m3u8
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching stream for ${slug}:`, error);
      return null;
    }
  }
}

export default new StreamService(); 