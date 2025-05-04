import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tv, Play, Loader2 } from "lucide-react";
import { MovieListResponse } from "@/types/api";

const TVShowsPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch TV shows - we'll filter from the movies endpoint since API doesn't have a TV-specific endpoint
  const { data, isLoading, isError } = useQuery<MovieListResponse>({
    queryKey: ["/api/movies"],
  });

  // Filter for TV shows only
  const tvShows = data?.items.filter(movie => movie.type === "tv") || [];

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
        <h2 className="text-2xl font-bold mb-4">Error Loading TV Shows</h2>
        <p className="text-muted-foreground mb-6">
          There was a problem loading the TV shows. Please try again later.
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

  if (tvShows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Tv className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-4">No TV Shows Found</h2>
        <p className="text-muted-foreground mb-6">
          We couldn't find any TV shows at the moment. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <Tv className="mr-3 h-8 w-8 text-primary" />
            TV Shows
          </h1>
          <p className="text-muted-foreground">
            Discover your next favorite series with our collection of TV shows
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="all">All Shows</TabsTrigger>
          <TabsTrigger value="action">Action</TabsTrigger>
          <TabsTrigger value="drama">Drama</TabsTrigger>
          <TabsTrigger value="comedy">Comedy</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tvShows.map((show) => (
              <Card key={show.slug} className="overflow-hidden group">
                <Link href={`/movie/${show.slug}`}>
                  <div className="relative cursor-pointer h-[260px]">
                    <img
                      src={show.posterUrl || show.thumbUrl}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" /> Watch Now
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                      {show.year}
                    </div>
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{show.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {show.originName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Filtered tabs would normally filter by genre, but for simplicity we'll just show a subset */}
        <TabsContent value="action" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tvShows.slice(0, 5).map((show) => (
              <Card key={show.slug} className="overflow-hidden group">
                <Link href={`/movie/${show.slug}`}>
                  <div className="relative cursor-pointer h-[260px]">
                    <img
                      src={show.posterUrl || show.thumbUrl}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" /> Watch Now
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                      {show.year}
                    </div>
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{show.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {show.originName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="drama" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tvShows.slice(5, 10).map((show) => (
              <Card key={show.slug} className="overflow-hidden group">
                <Link href={`/movie/${show.slug}`}>
                  <div className="relative cursor-pointer h-[260px]">
                    <img
                      src={show.posterUrl || show.thumbUrl}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" /> Watch Now
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                      {show.year}
                    </div>
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{show.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {show.originName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comedy" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tvShows.slice(10, 15).map((show) => (
              <Card key={show.slug} className="overflow-hidden group">
                <Link href={`/movie/${show.slug}`}>
                  <div className="relative cursor-pointer h-[260px]">
                    <img
                      src={show.posterUrl || show.thumbUrl}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" /> Watch Now
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-xs font-medium py-1 px-2 rounded">
                      {show.year}
                    </div>
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{show.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {show.originName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TVShowsPage;