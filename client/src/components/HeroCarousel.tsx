import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Info, Star, Calendar, Clock, Globe, Shield, Zap, Film, Users, Award, Eye } from 'lucide-react';
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

  // Early return AFTER all hooks
  if (!movies.length) return null;

  return (
    <div 
      className="relative w-full h-[65vh] overflow-hidden group"
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
          {/* Background Image - Full Coverage */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(${movie.movie.thumb_url || movie.movie.poster_url || '/placeholder-hero.jpg'})`,
              backgroundPosition: 'center center',
              backgroundSize: 'cover'
            }}
          >
            {/* Gradient Overlay - iQiYi Style */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Content Container - Adjusted for reduced height */}
          <div className="relative z-20 h-full flex items-center pb-8">
            <div className="w-full max-w-[1400px] mx-auto px-6 md:px-8 lg:px-12">
              
              {/* Left Content Area - Tighter spacing */}
              <div className="max-w-[600px] space-y-4">
                
                {/* Movie Title - Slightly smaller for better fit */}
                <div className="space-y-1">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-tight tracking-tight" 
                      style={{ 
                        textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
                        fontWeight: 900,
                        letterSpacing: '-0.02em'
                      }}>
                    {movie.movie.name || 'Featured Movie'}
                  </h1>

                  {/* Original Title - Subtitle */}
                  {movie.movie.origin_name && movie.movie.origin_name !== movie.movie.name && (
                    <h2 className="text-base md:text-lg text-gray-300 font-medium opacity-90" 
                        style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)' }}>
                      {movie.movie.origin_name}
                    </h2>
                  )}
                </div>

                {/* Metadata Row - Compact */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  
                  {/* Rating with Star */}
                  <div className="flex items-center gap-1 text-white">
                    <Star className="h-4 w-4 text-green-400 fill-green-400" />
                    <span className="text-base font-bold text-green-400">
                      {movie.movie.view && movie.movie.view > 0 
                        ? `${Math.min(parseFloat(movie.movie.view.toString()) / 1000000 * 10, 9.8).toFixed(1)}` 
                        : '8.5'}
                    </span>
                  </div>

                  {/* Year */}
                  <div className="text-white text-base font-medium">
                    {movie.movie.year || new Date().getFullYear()}
                  </div>

                  {/* Type Indicator */}
                  <div className="bg-white/20 px-2 py-1 rounded text-white text-xs font-medium backdrop-blur-sm">
                    {movie.movie.type === 'series' || movie.movie.type === 'tv' ? 'TV Series' : 'Movie'}
                  </div>

                  {/* Quality badge */}
                  {movie.movie.quality && (
                    <div className="bg-primary/80 px-2 py-1 rounded text-white text-xs font-medium">
                      {movie.movie.quality}
                    </div>
                  )}
                </div>

                {/* Genre Tags - Compact Row */}
                <div className="flex flex-wrap gap-1.5">
                  {movie.movie.category && movie.movie.category.length > 0 ? (
                    movie.movie.category.slice(0, 4).map((genre, idx) => (
                      <span 
                        key={`genre-${idx}`}
                        className="px-2 py-1 bg-white/15 text-white text-xs rounded-full backdrop-blur-sm hover:bg-white/25 transition-colors cursor-pointer border border-white/20"
                      >
                        {genre.name}
                      </span>
                    ))
                  ) : (
                    // Fallback genres if none available
                    <React.Fragment>
                      <span className="px-2 py-1 bg-white/15 text-white text-xs rounded-full backdrop-blur-sm border border-white/20">
                        {movie.movie.type === 'series' || movie.movie.type === 'tv' ? 'Drama' : 'Action'}
                      </span>
                      <span className="px-2 py-1 bg-white/15 text-white text-xs rounded-full backdrop-blur-sm border border-white/20">
                        Entertainment
                      </span>
                    </React.Fragment>
                  )}
                  
                  {/* Additional metadata tags */}
                  <span className="px-2 py-1 bg-white/15 text-white text-xs rounded-full backdrop-blur-sm border border-white/20">
                    {movie.movie.lang || 'English'}
                  </span>
                </div>

                {/* Description - Shorter */}
                <div className="max-w-[500px]">
                  <p className="text-gray-200 text-sm md:text-base leading-relaxed line-clamp-2" 
                     style={{ 
                       textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
                       lineHeight: '1.5'
                     }}>
                    {movie.movie.content && movie.movie.content.length > 10
                      ? (movie.movie.content.length > 150 
                          ? movie.movie.content.substring(0, 150) + '...'
                          : movie.movie.content)
                      : `Experience ${movie.movie.name || 'this amazing content'} in stunning quality.`
                    }
                  </p>
                </div>

                {/* Action Buttons - Only Watch Button */}
                <div className="flex items-center gap-4 pt-2">
                  
                  {/* Primary Watch Button - Red */}
                  <Link href={`/movie/${movie.movie.slug}`}>
                    <Button 
                      size="lg" 
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-none min-w-[140px]"
                    >
                      <Play className="mr-2 h-5 w-5 fill-white" /> 
                      Watch
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Hint - Top Right */}
          <div className="absolute top-8 right-8 z-30 text-white/60 text-sm font-medium">
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              <span>{movie.movie.name || 'Featured Content'}</span>
              <ChevronRight className="h-4 w-4" />
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