import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MoviePosterCard from './MoviePosterCard';
import { MovieListItem } from '@shared/schema';

interface MovieSectionProps {
  title: string;
  movies: MovieListItem[];
}

export default function MovieSection({ title, movies }: MovieSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of container width

    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      
      <div className="relative">
        {/* Navigation controls wrapper - group for showing/hiding arrows */}
        <div className="group">
          {/* Left scroll button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          {/* Right scroll button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* Movie list container */}
          <div className="container mx-auto px-4 overflow-hidden">
            <div 
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {movies.map((movie) => (
                <div 
                  key={movie.slug} 
                  className="flex-none w-[200px]"
                >
                  <MoviePosterCard movie={movie} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 