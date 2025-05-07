import React, { useEffect, useState } from "react";
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
  
  // Parallax effect state
  const [scrollY, setScrollY] = useState(0);
  
  // Handle scroll for parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  if (isLoading) {
    return (
      <section className="relative w-full h-[50vh] md:h-[70vh] bg-black/50 animate-pulse">
        <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-6 md:pb-12 relative z-10">
          <div className="h-8 md:h-12 w-3/4 bg-gray-700 rounded mb-3 md:mb-4"></div>
          <div className="h-4 md:h-6 w-2/4 bg-gray-700 rounded mb-4 md:mb-6"></div>
          <div className="flex gap-3 md:gap-4">
            <div className="h-10 md:h-12 w-32 md:w-36 bg-gray-700 rounded"></div>
            <div className="h-10 md:h-12 w-32 md:w-36 bg-gray-700 rounded"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="relative w-full h-[50vh] md:h-[70vh] overflow-hidden" 
    >
      {/* Parallax background with transform */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url('${movieBackgroundImageUrl}')`,
          transform: `translateY(${scrollY * 0.2}px)`,
          height: "calc(100% + 40px)"
        }}
      ></div>
      
      {/* Darker gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40"></div>
      
      <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-6 md:pb-12 relative z-10">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-3 font-title text-white drop-shadow-lg">
          {movie ? movie.movie.name : "Welcome to FilmFlex"}
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl mb-4 md:mb-6 max-w-2xl text-gray-200 drop-shadow-md">
          {movie 
            ? movie.movie.content.substring(0, 120) + (movie.movie.content.length > 120 ? "..." : "") 
            : "Discover thousands of movies and TV shows across multiple streaming sources in one place."}
        </p>
        <div className="flex flex-wrap gap-3 md:gap-4">
          {movie ? (
            <>
              <Button className="bg-primary hover:bg-primary/90 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full text-base md:text-lg flex items-center font-medium transition-colors touch-manipulation">
                <Play className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Watch Now
              </Button>
              <Link href={`/movie/${movie.movie.slug}`}>
                <Button variant="secondary" className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full text-base md:text-lg flex items-center font-medium transition-colors touch-manipulation">
                  <Info className="mr-2 h-4 w-4 md:h-5 md:w-5" /> More Info
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button className="bg-primary hover:bg-primary/90 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full text-base md:text-lg flex items-center font-medium transition-colors touch-manipulation">
                <Play className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Watch Latest
              </Button>
              <Button variant="secondary" className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full text-base md:text-lg flex items-center font-medium transition-colors touch-manipulation">
                <Info className="mr-2 h-4 w-4 md:h-5 md:w-5" /> More Info
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
