import { useRef } from 'react';
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

  // Limit movies to 30 items
  const limitedMovies = movies.slice(0, 30);

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
    <section className="py-8 w-full">
      <div className="px-4 md:px-6 mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <div className="relative w-full">
        <div className="group/arrows">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-black/70 hover:bg-black/90 opacity-80 md:opacity-0 md:group-hover/arrows:opacity-100 transition-opacity duration-200 border border-white/20"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-black/70 hover:bg-black/90 opacity-80 md:opacity-0 md:group-hover/arrows:opacity-100 transition-opacity duration-200 border border-white/20"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </Button>

          {/* Full-width scroll: no container, only horizontal padding so cards use full width */}
          <div className="overflow-hidden w-full">
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-6"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {limitedMovies.map((movie) => (
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