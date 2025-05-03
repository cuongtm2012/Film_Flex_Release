import React from 'react';
import { Link } from 'wouter';
import { Movie } from '@/types/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search as SearchIcon, Film, ChevronRight } from 'lucide-react';

interface SearchSuggestionsProps {
  isLoading: boolean;
  results: Movie[];
  searchTerm: string;
  onSelectResult: () => void;
}

export default function SearchSuggestions({ 
  isLoading, 
  results, 
  searchTerm,
  onSelectResult
}: SearchSuggestionsProps) {
  if (!searchTerm) return null;

  return (
    <div className="absolute top-full left-0 w-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden">
      <div className="p-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <SearchIcon className="h-3.5 w-3.5 mr-1.5" />
          <span>Results for "{searchTerm}"</span>
        </div>
        <Link to={`/search?q=${encodeURIComponent(searchTerm)}`}>
          <span 
            className="text-xs text-primary hover:underline cursor-pointer flex items-center"
            onClick={onSelectResult}
          >
            View all <ChevronRight className="h-3 w-3 ml-0.5" />
          </span>
        </Link>
      </div>

      <ScrollArea className="max-h-[70vh] md:max-h-[50vh]">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span className="text-sm">Searching...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No results found for "{searchTerm}"
          </div>
        ) : (
          <div className="p-1">
            {results.slice(0, 8).map((movie) => (
              <Link 
                key={movie.id || movie.slug} 
                to={`/movie/${movie.slug}`}
                onClick={onSelectResult}
              >
                <div className="flex items-center p-2 hover:bg-accent rounded-md cursor-pointer transition-colors">
                  <div className="relative h-12 w-20 flex-shrink-0 mr-3 overflow-hidden rounded-sm">
                    {movie.thumbUrl ? (
                      <img 
                        src={movie.thumbUrl} 
                        alt={movie.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <Film className="h-6 w-6 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <div className="text-sm font-medium truncate">{movie.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <span>{movie.year || 'Unknown'}</span>
                      {movie.category && movie.category.length > 0 && (
                        <span className="mx-1">•</span>
                      )}
                      {movie.category && movie.category.length > 0 && (
                        <span className="truncate">{movie.category[0].name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}