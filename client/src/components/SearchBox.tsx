import React, { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { useOnClickOutside } from '@/hooks/use-click-outside';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url?: string;
  type: string;
}

export default function SearchBox({
  onSearch,
  placeholder = 'Search...',
  className = '',
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useOnClickOutside(searchBoxRef, () => {
    setShowSuggestions(false);
  });

  // Fetch search suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['/api/search/suggestions', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { items: [] };
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedQuery.trim())}`);
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
  };

  return (
    <div ref={searchBoxRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length >= 2) {
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
            }
          }}
          onFocus={() => {
            if (query.length >= 2) {
              setShowSuggestions(true);
            }
          }}
          className="bg-black/60 border border-muted/30 text-white rounded px-4 py-1 w-full focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-white"
        >
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {/* Search Suggestions */}
      {showSuggestions && suggestions && suggestions.items && suggestions.items.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto">
          {suggestions.items.map((suggestion: SearchSuggestion) => (
            <Link
              key={suggestion._id}
              to={`/movie/${suggestion.slug}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className="flex items-center p-2 hover:bg-accent/50 transition-colors"
            >
              {suggestion.thumb_url && (
                <div className="w-10 h-14 overflow-hidden rounded mr-3 flex-shrink-0">
                  <img
                    src={suggestion.thumb_url}
                    alt={suggestion.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <div className="font-medium text-sm text-white truncate">{suggestion.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {suggestion.origin_name} • {suggestion.type === 'single' ? 'Movie' : 'TV Series'}
                </div>
              </div>
            </Link>
          ))}
          
          {/* View all results button */}
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              className="w-full text-xs text-center text-primary hover:text-primary hover:bg-accent/50"
              onClick={() => {
                onSearch(query);
                setShowSuggestions(false);
              }}
            >
              View all results for "{query}"
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}