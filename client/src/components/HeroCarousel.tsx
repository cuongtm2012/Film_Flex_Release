import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MovieDetailResponse } from '@shared/schema';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { useSwipeable } from 'react-swipeable';

interface HeroCarouselProps {
  movies: MovieDetailResponse[];
}

export default function HeroCarousel({ movies }: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % movies.length);
  }, [movies.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + movies.length) % movies.length);
  }, [movies.length]);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide]);

  // Pause auto-play on hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  // Touch swipe handlers
  const handlers = useSwipeable({
    onSwipedLeft: nextSlide,
    onSwipedRight: prevSlide,
    trackTouch: true,
    trackMouse: true
  });

  if (!movies.length) return null;

  return (
    <div 
      className="relative w-full h-[70vh] overflow-hidden group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...handlers}
    >
      {/* Slides */}
      {movies.map((movie, index) => (
        <div
          key={movie.movie.slug}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(${movie.movie.thumb_url || movie.movie.poster_url || '/placeholder-hero.jpg'})`,
              backgroundPosition: 'center 20%'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-20 h-full flex flex-col justify-end pb-16 px-4 md:px-8 lg:px-16">
            <div className="container mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white max-w-3xl">
                {movie.movie.name}
              </h1>
              {movie.movie.origin_name && (
                <h2 className="text-xl md:text-2xl text-gray-300 mb-6">
                  {movie.movie.origin_name}
                </h2>
              )}
              <div className="flex flex-wrap gap-4">
                <Link href={`/movie/${movie.movie.slug}`}>
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    <Play className="mr-2 h-5 w-5" /> Watch Now
                  </Button>
                </Link>
                <Link href={`/movie/${movie.movie.slug}`}>
                  <Button size="lg" variant="secondary">
                    <Info className="mr-2 h-5 w-5" /> More Info
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-8 w-8" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        aria-label="Next slide"
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              index === currentSlide 
                ? "bg-white w-8" 
                : "bg-white/50 hover:bg-white/75"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
} 