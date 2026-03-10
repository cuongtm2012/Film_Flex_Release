import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Play, Loader2, Clock, Star, Filter, Grid, List } from "lucide-react";
import { MovieListResponse } from "@/types/api";

const NewReleasesPage = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'year' | 'name' | 'popular'>('year');

  // Fetch movies with better query key for caching
  const { data, isLoading, isError } = useQuery<MovieListResponse>({
    queryKey: ["/api/movies", { sortBy: 'latest', limit: 48 }],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Enhanced sorting logic for new releases
  const newReleases = React.useMemo(() => {
    if (!data?.items) return [];
    
    const currentYear = new Date().getFullYear();
    let sortedMovies = [...data.items];
    
    // Filter for recent releases (last 2 years)
    sortedMovies = sortedMovies.filter(movie => 
      movie.year && movie.year >= currentYear - 1
    );
    
    // Sort based on selected criteria
    switch (sortBy) {
      case 'year':
        return sortedMovies.sort((a, b) => (b.year || 0) - (a.year || 0));
      case 'name':
        return sortedMovies.sort((a, b) => a.name.localeCompare(b.name));
      case 'popular':
        return sortedMovies.sort((a, b) => (b.view || 0) - (a.view || 0));
      default:
        return sortedMovies;
    }
  }, [data?.items, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary/60 rounded-full animate-spin mx-auto mt-2 ml-2"></div>
          </div>
          <p className="text-muted-foreground">Loading new releases...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-12 h-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Unable to Load New Releases</h2>
          <p className="text-muted-foreground mb-6">
            We're having trouble loading the latest releases. Please check your connection and try again.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const currentDate = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(currentDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        {/* Enhanced Header Section */}
        <div className="mb-8 lg:mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
                <Calendar className="w-8 h-8 lg:w-10 lg:h-10 text-primary flex-shrink-0" />
                New Releases
              </h1>
              <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl">
                Discover the latest movies and TV shows added to our collection
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="text-sm text-muted-foreground">Updated:</span>
                <Badge variant="outline" className="border-primary/20 text-primary">
                  {formattedDate}
                </Badge>
                <Badge variant="secondary">
                  {newReleases.length} new releases
                </Badge>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-card border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'year' | 'name' | 'popular')}
                className="px-3 py-2 bg-card border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="year">Sort by Year</option>
                <option value="name">Sort by Name</option>
                <option value="popular">Sort by Popularity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Featured New Release */}
        {newReleases.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              Featured Release
            </h2>
            <Card className="overflow-hidden bg-gradient-to-r from-card via-card to-card/80 border-primary/20 shadow-2xl hover:shadow-primary/10 transition-all duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-5">
                <div className="lg:col-span-2 relative group">
                  <div className="aspect-[16/9] lg:aspect-[2/3] overflow-hidden">
                    <img 
                      src={newReleases[0].posterUrl || newReleases[0].thumbUrl} 
                      alt={newReleases[0].name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-primary/90 text-white font-semibold px-3 py-1 animate-pulse">
                      ✨ NEW
                    </Badge>
                  </div>
                </div>
                
                <div className="lg:col-span-3 p-6 lg:p-8 flex flex-col justify-center space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-2xl lg:text-4xl font-bold leading-tight">
                      {newReleases[0].name}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> 
                        <span className="font-medium">{newReleases[0].year}</span>
                      </div>
                      {newReleases[0].time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> 
                          <span>{newReleases[0].time}</span>
                        </div>
                      )}
                      {newReleases[0].quality && (
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {newReleases[0].quality}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                    {newReleases[0].description || "Experience the latest release on PhimGG, now available for streaming in high quality."}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {newReleases[0].category && newReleases[0].category.length > 0 ? (
                      newReleases[0].category.slice(0, 4).map((cat: { name: string; slug: string }, idx: number) => (
                        <Badge key={idx} variant="secondary" className="hover:bg-primary/20 transition-colors cursor-pointer">
                          {cat.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary">Movie</Badge>
                    )}
                  </div>
                  
                  <div className="pt-4">
                    <Link href={`/movie/${newReleases[0].slug}`}>
                      <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-primary/20 transition-all duration-300 transform hover:scale-105">
                        <Play className="mr-2 w-5 h-5" /> 
                        Watch Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* All New Releases */}
        <div className="space-y-6">
          <h2 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Filter className="w-6 h-6 text-primary" />
            All New Releases
          </h2>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 lg:gap-6">
              {newReleases.map((movie, index) => (
                <Card key={movie.slug} className="group overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-2">
                  <Link href={`/movie/${movie.slug}`}>
                    <div className="relative aspect-[2/3] overflow-hidden cursor-pointer">
                      <img
                        src={movie.posterUrl || movie.thumbUrl}
                        alt={movie.name}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                        loading="lazy"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      
                      {/* Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                        <Button size="sm" className="bg-primary/90 hover:bg-primary text-white shadow-lg backdrop-blur-sm">
                          <Play className="w-4 h-4 mr-1" /> 
                          Play
                        </Button>
                      </div>
                      
                      {/* Badges */}
                      <div className="absolute top-2 left-2 space-y-1">
                        {index < 10 && (
                          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-bold px-2 py-1 shadow-lg animate-pulse">
                            NEW
                          </Badge>
                        )}
                        {movie.quality && (
                          <Badge variant="secondary" className="bg-black/70 text-white text-xs backdrop-blur-sm">
                            {movie.quality}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" className="bg-black/70 border-primary/30 text-white text-xs backdrop-blur-sm">
                          {movie.year}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                  
                  <div className="p-3 space-y-2">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {movie.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate">
                        {movie.type === 'series' ? 'TV Series' : 'Movie'}
                      </p>
                      {movie.view && movie.view > 0 && (
                        <span className="text-xs text-primary font-medium">
                          {movie.view.toLocaleString()} views
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {newReleases.map((movie, index) => (
                <Card key={movie.slug} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                  <Link href={`/movie/${movie.slug}`}>
                    <div className="flex gap-4 p-4 cursor-pointer">
                      <div className="relative w-20 h-28 flex-shrink-0 overflow-hidden rounded-lg">
                        <img
                          src={movie.posterUrl || movie.thumbUrl}
                          alt={movie.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {index < 10 && (
                          <Badge className="absolute -top-1 -right-1 bg-primary text-white text-xs px-1 py-0.5">
                            NEW
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {movie.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{movie.year}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="capitalize">{movie.type === 'series' ? 'TV Series' : 'Movie'}</span>
                          {movie.time && (
                            <>
                              <span>•</span>
                              <span>{movie.time}</span>
                            </>
                          )}
                          {movie.quality && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {movie.quality}
                              </Badge>
                            </>
                          )}
                          {movie.view && movie.view > 0 && (
                            <>
                              <span>•</span>
                              <span>{movie.view.toLocaleString()} views</span>
                            </>
                          )}
                        </div>
                        
                        {movie.category && movie.category.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {movie.category.slice(0, 3).map((cat: { name: string; slug: string }, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {cat.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 mr-1" />
                          Watch
                        </Button>
                      </div>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Empty State */}
        {newReleases.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No New Releases</h3>
            <p className="text-muted-foreground">
              Check back soon for the latest movies and TV shows.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewReleasesPage;