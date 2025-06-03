import { useState, useEffect, useCallback } from 'react';
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
        >          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(${movie.movie.thumb_url || movie.movie.poster_url || '/placeholder-hero.jpg'})`,
              backgroundPosition: 'center 20%'
            }}
          >
            {/* Enhanced gradient overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-transparent to-transparent" />
          </div>{/* Content */}
          <div className="relative z-20 h-full flex flex-col justify-end pb-16 px-4 md:px-8 lg:px-16">
            <div className="container mx-auto max-w-4xl">              {/* Movie Title */}
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 text-white max-w-4xl leading-tight" style={{ textShadow: '0 4px 8px rgba(0, 0, 0, 0.8)' }}>
                {movie.movie.name}
              </h1>
              
              {/* Original Title */}
              {movie.movie.origin_name && movie.movie.origin_name !== movie.movie.name && (
                <h2 className="text-lg md:text-xl text-gray-300 mb-4 font-medium" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)' }}>
                  {movie.movie.origin_name}
                </h2>
              )}{/* Key Information Row */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {/* Rating */}
                <div className="flex items-center gap-1.5 bg-yellow-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-yellow-500/30">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold text-white">
                    {movie.movie.view ? `${Math.min(parseFloat(movie.movie.view.toString()) / 1000000 * 10, 9.5).toFixed(1)}` : '8.5'}
                  </span>
                  <span className="text-xs text-yellow-200">/10</span>
                </div>

                {/* Production Year */}
                <div className="flex items-center gap-1.5 bg-blue-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-blue-500/30">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">
                    {movie.movie.year || new Date().getFullYear()}
                  </span>
                </div>

                {/* Age Rating */}
                <div className="flex items-center gap-1.5 bg-red-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-red-500/30">
                  <Shield className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-semibold text-white">
                    {movie.movie.lang === 'English' ? 'PG-13' : '16+'}
                  </span>
                </div>

                {/* Episode Status */}
                {movie.movie.episode_current && (
                  <div className="flex items-center gap-1.5 bg-green-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-green-500/30">
                    <Zap className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-semibold text-white">
                      EP {movie.movie.episode_current}/{movie.movie.episode_total || '?'}
                    </span>
                  </div>
                )}

                {/* Duration */}
                <div className="flex items-center gap-1.5 bg-purple-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-purple-500/30">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">
                    {movie.movie.time || '2h 15m'}
                  </span>
                </div>

                {/* View Count */}
                {movie.movie.view && (
                  <div className="flex items-center gap-1.5 bg-indigo-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-indigo-500/30">
                    <Eye className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">
                      {movie.movie.view > 1000000 
                        ? `${(movie.movie.view / 1000000).toFixed(1)}M` 
                        : movie.movie.view > 1000 
                          ? `${(movie.movie.view / 1000).toFixed(1)}K` 
                          : movie.movie.view.toString()
                      } views
                    </span>
                  </div>
                )}

                {/* Type Badge */}
                <div className="flex items-center gap-1.5 bg-rose-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-rose-500/30">
                  <Film className="h-4 w-4 text-rose-400" />
                  <span className="text-sm font-semibold text-white">
                    {movie.movie.type === 'series' ? 'TV Series' : 'Movie'}
                  </span>
                </div>
              </div>              {/* Tags Row */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Country Tags */}
                {movie.movie.country && movie.movie.country.slice(0, 2).map((country, idx) => (
                  <span 
                    key={`country-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600/30 backdrop-blur-sm border border-emerald-400/50 rounded-full text-sm font-medium text-emerald-100 hover:bg-emerald-600/40 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {country.name}
                  </span>
                ))}

                {/* Language Tag */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-600/30 backdrop-blur-sm border border-orange-400/50 rounded-full text-sm font-medium text-orange-100 hover:bg-orange-600/40 transition-colors">
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                  {movie.movie.lang || 'English'}
                </span>

                {/* Genre Tags */}
                {movie.movie.category && movie.movie.category.slice(0, 3).map((genre, idx) => (
                  <span 
                    key={`genre-${idx}`}
                    className="px-3 py-1 bg-violet-600/30 backdrop-blur-sm border border-violet-400/50 rounded-full text-sm font-medium text-violet-100 hover:bg-violet-600/40 transition-colors cursor-pointer"
                  >
                    {genre.name}
                  </span>
                ))}

                {/* Quality Tag */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-600/30 backdrop-blur-sm border border-cyan-400/50 rounded-full text-sm font-medium text-cyan-100 hover:bg-cyan-600/40 transition-colors">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                  {movie.movie.quality || 'HD'}
                </span>

                {/* Studio/Director Tag */}
                {movie.movie.director && movie.movie.director.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600/30 backdrop-blur-sm border border-amber-400/50 rounded-full text-sm font-medium text-amber-100 hover:bg-amber-600/40 transition-colors">
                    <Award className="h-3.5 w-3.5" />
                    {movie.movie.director[0]}
                  </span>
                )}

                {/* Cast Tag */}
                {movie.movie.actor && movie.movie.actor.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-600/30 backdrop-blur-sm border border-teal-400/50 rounded-full text-sm font-medium text-teal-100 hover:bg-teal-600/40 transition-colors">
                    <Users className="h-3.5 w-3.5" />
                    {movie.movie.actor.slice(0, 2).join(', ')}
                    {movie.movie.actor.length > 2 && ` +${movie.movie.actor.length - 2}`}
                  </span>
                )}
              </div>              {/* Description */}
              {movie.movie.content && (
                <div className="mb-6 max-w-3xl">
                  <p 
                    className="text-gray-200 text-base md:text-lg leading-relaxed font-normal line-clamp-3 hover:line-clamp-none transition-all duration-300 cursor-pointer"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.webkitLineClamp = target.style.webkitLineClamp === 'unset' ? '3' : 'unset';
                    }}
                  >
                    {movie.movie.content}
                  </p>
                  <span className="text-xs text-gray-400 mt-1 block">Click to expand</span>
                </div>
              )}

              {/* Additional Information */}
              {(movie.movie.director || movie.movie.actor) && (
                <div className="mb-6 space-y-2 max-w-3xl">
                  {movie.movie.director && movie.movie.director.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 text-sm font-medium min-w-[80px]">Director:</span>
                      <span className="text-gray-300 text-sm">
                        {movie.movie.director.slice(0, 3).join(', ')}
                        {movie.movie.director.length > 3 && ` and ${movie.movie.director.length - 3} more`}
                      </span>
                    </div>
                  )}
                  {movie.movie.actor && movie.movie.actor.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 text-sm font-medium min-w-[80px]">Cast:</span>
                      <span className="text-gray-300 text-sm">
                        {movie.movie.actor.slice(0, 4).join(', ')}
                        {movie.movie.actor.length > 4 && ` and ${movie.movie.actor.length - 4} more`}
                      </span>
                    </div>
                  )}
                </div>
              )}              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link href={`/movie/${movie.movie.slug}`}>
                  <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold px-8 py-3 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-primary/20">
                    <Play className="mr-2 h-5 w-5 fill-white" /> 
                    Watch Now
                  </Button>
                </Link>
                <Link href={`/movie/${movie.movie.slug}`}>
                  <Button size="lg" variant="secondary" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/30 hover:border-white/50 text-white font-semibold px-6 py-3 text-lg rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105">
                    <Info className="mr-2 h-5 w-5" /> 
                    More Info
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