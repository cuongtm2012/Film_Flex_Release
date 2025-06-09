import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Play, Loader2, Clock, Star } from "lucide-react";
import { MovieListResponse } from "@/types/api";

const NewReleasesPage = () => {
  // Fetch movies 
  const { data, isLoading, isError } = useQuery<MovieListResponse>({
    queryKey: ["/api/movies"],
  });
  
  // For demonstration, we'll consider "new releases" as movies with highest year values
  // In a real app, this would be based on release date
  const newReleases = data?.items
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, 20) || [];

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
        <h2 className="text-2xl font-bold mb-4">Error Loading New Releases</h2>
        <p className="text-muted-foreground mb-6">
          There was a problem loading the new releases. Please try again later.
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

  // Format the current date for the "New as of" section
  const currentDate = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(currentDate);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2 flex items-center">
          <Calendar className="mr-3 h-8 w-8 text-primary" />
          New Releases
        </h1>
        <p className="text-muted-foreground text-lg">
          Fresh content added to our library
        </p>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-muted-foreground">New as of:</span>
          <Badge variant="outline" className="ml-2">
            {formattedDate}
          </Badge>
        </div>
      </div>

      {/* Featured new release */}
      {newReleases.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Featured New Release</h2>
          <div className="bg-black/20 rounded-lg overflow-hidden">            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <div className="aspect-[2/3] md:aspect-auto w-full h-full max-h-[500px]">
                <img 
                  src={newReleases[0].posterUrl || newReleases[0].thumbUrl} 
                  alt={newReleases[0].name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-center lg:col-span-2">
                <span className="inline-flex items-center bg-primary/20 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full mb-3">
                  New Release
                </span>
                <h3 className="text-3xl font-bold mb-3">{newReleases[0].name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" /> {newReleases[0].year}
                  </div>
                  {newReleases[0].time && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" /> {newReleases[0].time}
                    </div>
                  )}
                  {newReleases[0].quality && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-1" /> {newReleases[0].quality}
                    </div>
                  )}
                </div>
                <p className="text-gray-400 mb-6 line-clamp-3">
                  {"Experience the latest release on FilmFlex, now available for streaming."}
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  {newReleases[0].category && newReleases[0].category.length > 0 ? (
                    newReleases[0].category.map((cat: { name: string; slug: string }, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {cat.name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">
                      Movie
                    </Badge>
                  )}
                </div>
                <div>
                  <Link href={`/movie/${newReleases[0].slug}`}>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Play className="mr-2 h-4 w-4" /> Watch Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All new releases */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">All New Releases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {newReleases.map((movie, index) => (
            <Card key={movie.slug} className="overflow-hidden group">              <Link href={`/movie/${movie.slug}`}>
                <div className="relative cursor-pointer h-[260px]">
                  <img
                    src={movie.posterUrl || movie.thumbUrl}
                    alt={movie.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      <Play className="h-4 w-4 mr-2" /> Watch Now
                    </Button>
                  </div>
                  {index < 5 && (
                    <div className="absolute top-2 left-2 bg-primary text-white text-xs font-medium py-1 px-2 rounded">
                      NEW
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                    {movie.year}
                  </div>
                </div>
              </Link>
              <div className="p-3">
                <h3 className="font-semibold truncate">{movie.name}</h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {movie.type === 'tv' ? 'TV Series' : 'Movie'}
                  </p>
                  {movie.quality && (
                    <span className="text-xs bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded">
                      {movie.quality}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewReleasesPage;