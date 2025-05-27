import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MovieSection from '@/components/MovieSection';
import HeroCarousel from '@/components/HeroCarousel';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieListResponse, MovieDetailResponse } from '@shared/schema';
import TvSeriesCard from '@/components/TvSeriesCard';
import { Button } from '@/components/ui/button';

// TV Series Section Component with navigation buttons
function TvSeriesSection({ title, movies }: { title: string; movies: MovieListResponse['items'] }) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Filter for TV series with more flexible type checking and data validation
  const tvSeries = React.useMemo(() => {
    if (!Array.isArray(movies)) {
      console.warn('Invalid movies data', movies);
      return [];
    }

    return movies.filter(movie => {
      // Skip if movie is null/undefined
      if (!movie) return false;
      
      // Check type field with more flexible matching
      const type = String(movie.type || '').toLowerCase();
      const isTV = type === 'tv' || type === 'series' || type === 'tv series';

      // Log invalid TV series entries for debugging
      if (isTV && (!movie.slug || !movie.name)) {
        console.warn('Found TV series with missing data:', movie);
        return false;
      }

      return isTV;
    }).slice(0, 30); // Limit to 30 items
  }, [movies]);

  // Add debug logging
  React.useEffect(() => {
    if (!Array.isArray(movies)) {
      console.warn('Movies array is not valid:', movies);
    } else {
      console.log(`Found ${tvSeries.length} TV series out of ${movies.length} total items`);
    }
  }, [movies, tvSeries]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;

    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // If no TV series or invalid data, don't render the section
  if (!movies?.length || !tvSeries.length) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="relative">
        {/* Navigation controls wrapper - group for showing/hiding arrows */}
        <div className="group">
          {/* Left scroll button - More visible */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-black/70 hover:bg-black/90 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 border border-white/20"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </Button>

          {/* Right scroll button - More visible */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-black/70 hover:bg-black/90 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 border border-white/20"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </Button>

          <div className="container mx-auto px-4 overflow-hidden">
            <div 
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4"
            >
              {tvSeries.map((movie) => (
                <div key={movie.slug} className="flex-none w-[200px]">
                  <TvSeriesCard movie={movie} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Dedicated Anime Section Component with navigation buttons
function AnimeSection({ title, movies }: { title: string; movies: MovieListResponse['items'] }) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Since the API endpoint /api/movies/sections/anime should already return anime content,
  // we don't need aggressive filtering. Just ensure valid movie data.
  const animeContent = React.useMemo(() => {
    if (!Array.isArray(movies)) {
      console.warn('Invalid anime movies data', movies);
      return [];
    }

    return movies.filter(movie => {
      // Skip if movie is null/undefined or missing required fields
      if (!movie || !movie.slug || !movie.name) {
        console.warn('Found anime with missing data:', movie);
        return false;
      }
      return true;
    }).slice(0, 30); // Limit to 30 items
  }, [movies]);

  // Add debug logging for anime
  React.useEffect(() => {
    if (!Array.isArray(movies)) {
      console.warn('Anime movies array is not valid:', movies);
    } else {
      console.log(`Anime section received ${movies.length} items from API`);
      console.log(`After filtering: ${animeContent.length} valid anime items`);
      if (movies.length > 0) {
        console.log('First anime item:', movies[0]);
      }
    }
  }, [movies, animeContent]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;

    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Always render the section with proper fallback
  return (
    <section className="py-8">
      <div className="container mx-auto px-4 mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="relative">
        {/* Navigation controls wrapper - group for showing/hiding arrows */}
        <div className="group">
          {/* Left scroll button - More visible */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-black/70 hover:bg-black/90 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 border border-white/20"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </Button>

          {/* Right scroll button - More visible */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-black/70 hover:bg-black/90 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 border border-white/20"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </Button>

          <div className="container mx-auto px-4 overflow-hidden">
            {animeContent.length > 0 ? (
              <div 
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4"
              >
                {animeContent.map((movie) => (
                  <div key={movie.slug} className="flex-none w-[200px]">
                    <TvSeriesCard movie={movie} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No anime content available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  // Fetch movies by sections - limit to 30 items each
  const { data: trendingMovies, isLoading: trendingLoading } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/trending_now', { page: 1, limit: 30 }],
  });
  // Fetch recommended movies for hero carousel
  const { data: recommendedMovies, isLoading: recommendedLoading } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/recommended', { page: 1, limit: 5 }],
  });

  // Fetch latest movies section
  const { data: latestMovies, isLoading: latestLoading } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/latest_movies', { page: 1, limit: 30 }],
  });

  // Fetch top rated movies section
  const { data: topRatedMovies, isLoading: topRatedLoading } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/top_rated', { page: 1, limit: 30 }],
  });
  
  // Fetch popular TV series with improved error handling
  const { data: popularTvSeries, isLoading: tvSeriesLoading, error: tvSeriesError } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/popular_tv', { page: 1, limit: 30 }],
    retry: 2, // Retry failed requests up to 2 times
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  });

  // Fetch anime section with proper error handling
  const { data: animeMovies, isLoading: animeLoading, error: animeError } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/anime', { page: 1, limit: 30 }],
    retry: 2,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false
  });

  // Debug logs for sections
  React.useEffect(() => {
    if (popularTvSeries) {
      console.log('Popular TV Series data:', popularTvSeries);
      console.log('Number of TV items:', popularTvSeries.items?.length || 0);
    }
    if (tvSeriesError) {
      console.error('Error fetching popular TV series:', tvSeriesError);
    }
    
    if (animeMovies) {
      console.log('Anime data:', animeMovies);
      console.log('Number of anime items:', animeMovies.items?.length || 0);
    }
    if (animeError) {
      console.error('Error fetching anime:', animeError);
    }
  }, [popularTvSeries, tvSeriesError, animeMovies, animeError]);
  
  // Loading state
  if (trendingLoading || latestLoading || topRatedLoading || tvSeriesLoading || recommendedLoading || animeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  // Prepare featured movies for the carousel (using recommended movies)
  const featuredMovies: MovieDetailResponse[] = (recommendedMovies?.items || [])
    .slice(0, 5)
    .map(movie => ({
      movie: {
        _id: movie._id || movie.movieId || "",
        name: movie.name,
        slug: movie.slug,
        origin_name: movie.origin_name || movie.originName || "",
        content: "",
        type: movie.type || "movie",
        status: "ongoing",
        thumb_url: movie.thumb_url || movie.thumbUrl || "",
        poster_url: movie.poster_url || movie.posterUrl || "",
        time: "",
        quality: "",
        lang: "",
        episode_current: "",
        episode_total: "",
        view: 0,
        actor: [],
        director: [],
        category: [],
        country: []
      },
      episodes: []
    }));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Carousel */}
      <HeroCarousel movies={featuredMovies} />

      <div className="space-y-4">
        {/* Trending Now Section */}
        {trendingMovies?.items && trendingMovies.items.length > 0 && (
          <MovieSection
            title="Trending Now"
            movies={trendingMovies.items.filter(movie => movie.type?.toLowerCase() !== 'tv').slice(0, 30)}
          />
        )}

        {/* Latest Releases Section */}
        {latestMovies?.items && latestMovies.items.length > 0 && (
          <MovieSection
            title="Latest Movies"
            movies={latestMovies.items.filter(movie => movie.type?.toLowerCase() !== 'tv').slice(0, 30)}
          />
        )}

        {/* Top Rated Section */}
        {topRatedMovies?.items && topRatedMovies.items.length > 0 && (
          <MovieSection
            title="Top Rated Movies"
            movies={topRatedMovies.items.filter(movie => movie.type?.toLowerCase() !== 'tv').slice(0, 30)}
          />
        )}

        {/* TV Series Section */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          {popularTvSeries?.items && popularTvSeries.items.length > 0 && (
            <TvSeriesSection
              title="Popular TV Series"
              movies={popularTvSeries.items}
            />
          )}
        </div>

        {/* Anime Section - Always render with fallback */}
        <AnimeSection 
          title="Anime" 
          movies={animeMovies?.items || []} 
        />
      </div>
    </div>
  );
}
