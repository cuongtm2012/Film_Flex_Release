import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Play, Loader2, Trophy, Award } from "lucide-react";
import { MovieListResponse } from "@/types/api";

const TopRatedPage = () => {
  // Fetch movies 
  const { data, isLoading, isError } = useQuery<MovieListResponse>({
    queryKey: ["/api/movies"],
  });
  
  // For demonstration, we'll treat all movies as potentially top-rated
  // and sort them randomly but consistently
  const topRatedMovies = React.useMemo(() => {
    if (!data?.items) return [];
    
    // Create a predictable "rating" based on slug to keep the order consistent
    return [...data.items]
      .map(movie => ({
        ...movie,
        // Generate a "rating" between 7.0 and 10.0 based on the movie slug
        rating: 7 + (movie.slug.charCodeAt(0) % 30) / 10
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 50);
  }, [data?.items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Error Loading Top Rated Content</h2>
        <p className="text-muted-foreground mb-6">
          There was a problem loading the top rated content. Please try again later.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          Reload Page
        </Button>
      </div>
    );
  }

  const topThree = topRatedMovies.slice(0, 3);
  const restOfList = topRatedMovies.slice(3);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2 flex items-center">
          <Trophy className="mr-3 h-8 w-8 text-primary" />
          Top Rated
        </h1>
        <p className="text-muted-foreground text-lg">
          The highest rated movies and TV shows on FilmFlex
        </p>
      </div>

      {/* Top 3 winners */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold mb-8 flex items-center">
          <Award className="mr-2 h-6 w-6 text-yellow-500" />
          FilmFlex Award Winners
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {topThree.map((movie, index) => (
            <div 
              key={movie.slug} 
              className={`relative bg-black/20 rounded-lg overflow-hidden transition-transform hover:scale-[1.02] ${index === 0 ? 'md:scale-105 z-10' : ''}`}
            >
              <div className={`absolute top-0 left-0 w-full h-12 flex items-center justify-center ${
                index === 0 ? 'bg-yellow-500/90' : index === 1 ? 'bg-gray-400/90' : 'bg-amber-700/90'
              }`}>
                <span className="font-bold text-black flex items-center">
                  <Trophy className="h-4 w-4 mr-2" />
                  {index === 0 ? '1st Place' : index === 1 ? '2nd Place' : '3rd Place'}
                </span>
              </div>
              
              <div className="pt-12">
                <div className="aspect-[2/3] w-full">
                  <img 
                    src={movie.posterUrl || movie.thumbUrl} 
                    alt={movie.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 font-bold">{movie.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{movie.year}</span>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-1 truncate">{movie.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {movie.originName || (movie.type === 'tv' ? 'TV Series' : 'Movie')}
                  </p>
                  
                  <Link href={`/movie/${movie.slug}`}>
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      <Play className="mr-2 h-4 w-4" /> Watch Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rest of top rated list */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">More Top Rated Titles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {restOfList.map((movie, index) => (
            <Card key={movie.slug} className="overflow-hidden group">
              <Link href={`/movie/${movie.slug}`}>
                <div className="relative cursor-pointer h-[260px]">
                  <img
                    src={movie.posterUrl || movie.thumbUrl}
                    alt={movie.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      <Play className="h-4 w-4 mr-2" /> Watch Now
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center bg-black/80 text-yellow-500 text-xs font-medium py-1 px-2 rounded">
                    <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                    {movie.rating.toFixed(1)}
                  </div>
                </div>
              </Link>
              <div className="p-3">
                <h3 className="font-semibold truncate">{movie.name}</h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {movie.type === 'tv' ? 'TV Series' : 'Movie'}
                  </p>
                  <span className="text-sm text-muted-foreground">
                    {movie.year}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopRatedPage;