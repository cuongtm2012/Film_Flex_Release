import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, X } from 'lucide-react';
import SearchSuggestions from './SearchSuggestions';
import { Movie } from '@/types/api';
import { useDebounce } from '@/hooks/use-debounce';
import { useOnClickOutside } from '@/hooks/use-click-outside';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBox({
  onSearch,
  placeholder = "Search...",
  className = ""
}: SearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(searchBoxRef, () => setShowSuggestions(false));

  // Fetch quick search results for auto-suggestions
  const {
    data: suggestionsData,
    isLoading: isSuggestionsLoading,
  } = useQuery<{ items: Movie[] }>({
    queryKey: ['/api/search/suggestions', { q: debouncedSearchTerm }],
    enabled: debouncedSearchTerm.length >= 2 && showSuggestions,
  });

  // Clear search input
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Submit search form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
      setShowSuggestions(false);
    }
  };

  // Focus handler to show suggestions
  const handleFocus = () => {
    if (searchTerm.length >= 2) {
      setShowSuggestions(true);
    }
  };

  // Update suggestions visibility when search term changes
  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedSearchTerm]);

  // Handle suggestion selection
  const handleSelectSuggestion = () => {
    setShowSuggestions(false);
  };

  return (
    <div ref={searchBoxRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleFocus}
            className="bg-black/60 border border-muted/30 text-white rounded pr-16 py-1 w-full focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground h-8 w-8 p-0"
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>
      </form>
      
      {/* Search Suggestions */}
      {showSuggestions && (
        <SearchSuggestions
          isLoading={isSuggestionsLoading}
          results={suggestionsData?.items || []}
          searchTerm={debouncedSearchTerm}
          onSelectResult={handleSelectSuggestion}
        />
      )}
    </div>
  );
}