import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MovieSection from '@/components/MovieSection';
import HeroCarousel from '@/components/HeroCarousel';
import { Loader2 } from 'lucide-react';
import { MovieListResponse, MovieDetailResponse } from '@shared/schema';
import TvSeriesCard from '@/components/TvSeriesCard';

// TV Series Section Component
function TvSeriesSection({ title, movies }: { title: string; movies: MovieListResponse['items'] }) {
  // Filter for TV series only
  const tvSeries = movies.filter(movie => movie.type?.toLowerCase() === 'tv');

  // If no TV series, don't render the section
  if (tvSeries.length === 0) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      
      <div className="relative">
        <div className="container mx-auto px-4 overflow-hidden">
          <div 
            className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tvSeries.map((movie) => (
              <div 
                key={movie.slug} 
                className="flex-none w-[200px]"
              >
                <TvSeriesCard movie={movie} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  // Fetch movies by sections
  const { data: trendingMovies, isLoading: trendingLoading } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/trending_now', { page: 1, limit: 10 }],
  });

  // Fetch latest movies section
  const { data: latestMovies, isLoading: latestLoading } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/latest_movies', { page: 1, limit: 10 }],
  });

  // Fetch top rated movies section
  const { data: topRatedMovies, isLoading: topRatedLoading } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/top_rated', { page: 1, limit: 10 }],
  });
  
  // Fetch popular TV series
  const { data: popularTvSeries, isLoading: tvSeriesLoading } = useQuery<MovieListResponse>({
    queryKey: ['/api/movies/sections/popular_tv', { page: 1, limit: 10 }],
  });

  // Loading state
  if (trendingLoading || latestLoading || topRatedLoading || tvSeriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prepare featured movies for the carousel
  const featuredMovies: MovieDetailResponse[] = (latestMovies?.items || [])
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
            movies={trendingMovies.items.filter(movie => movie.type?.toLowerCase() !== 'tv')}
          />
        )}

        {/* Latest Releases Section */}
        {latestMovies?.items && latestMovies.items.length > 0 && (
          <MovieSection
            title="Latest Movies"
            movies={latestMovies.items.filter(movie => movie.type?.toLowerCase() !== 'tv')}
          />
        )}

        {/* Top Rated Section */}
        {topRatedMovies?.items && topRatedMovies.items.length > 0 && (
          <MovieSection
            title="Top Rated Movies"
            movies={topRatedMovies.items.filter(movie => movie.type?.toLowerCase() !== 'tv')}
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
      </div>
    </div>
  );
}
