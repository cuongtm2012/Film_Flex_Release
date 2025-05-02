import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Info } from "lucide-react";
import { Link } from "wouter";
import { MovieDetailResponse } from "@shared/schema";

interface HeroSectionProps {
  movie?: MovieDetailResponse;
  isLoading?: boolean;
}

export default function HeroSection({ movie, isLoading = false }: HeroSectionProps) {
  // Default hero background image for when no movie is loaded
  const backgroundImageUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80";
  
  // If there's a loaded movie, use its poster as the background
  const movieBackgroundImageUrl = movie?.movie?.poster_url || backgroundImageUrl;
  
  if (isLoading) {
    return (
      <section className="relative w-full h-[70vh] bg-black/50 animate-pulse">
        <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-12 relative z-10">
          <div className="h-12 w-3/4 bg-gray-700 rounded mb-4"></div>
          <div className="h-6 w-2/4 bg-gray-700 rounded mb-6"></div>
          <div className="flex gap-4">
            <div className="h-12 w-36 bg-gray-700 rounded"></div>
            <div className="h-12 w-36 bg-gray-700 rounded"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="relative w-full h-[70vh] bg-cover bg-center" 
      style={{ backgroundImage: `url('${movieBackgroundImageUrl}')` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-black/50"></div>
      <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-12 relative z-10">
        <h1 className="text-4xl md:text-6xl font-bold mb-3 font-title">
          {movie ? movie.movie.name : "Welcome to FilmFlex"}
        </h1>
        <p className="text-xl md:text-2xl mb-6 max-w-2xl text-muted-foreground">
          {movie 
            ? movie.movie.content.substring(0, 150) + (movie.movie.content.length > 150 ? "..." : "") 
            : "Discover thousands of movies and TV shows across multiple streaming sources in one place."}
        </p>
        <div className="flex flex-wrap gap-4">
          {movie ? (
            <>
              <Button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded flex items-center transition">
                <Play className="mr-2 h-4 w-4" /> Watch Now
              </Button>
              <Link href={`/movie/${movie.movie.slug}`}>
                <Button variant="secondary" className="bg-gray-700/60 hover:bg-gray-600/60 text-white px-6 py-3 rounded flex items-center transition">
                  <Info className="mr-2 h-4 w-4" /> More Info
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded flex items-center transition">
                <Play className="mr-2 h-4 w-4" /> Watch Latest
              </Button>
              <Button variant="secondary" className="bg-gray-700/60 hover:bg-gray-600/60 text-white px-6 py-3 rounded flex items-center transition">
                <Info className="mr-2 h-4 w-4" /> More Info
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
