import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Film, TrendingUp, History, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchSuggestion {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url?: string;
  poster_url?: string;
  type: string;
  year?: string;
  category?: any[];
}

interface SearchBarProps {
  variant?: "navbar" | "expanded";
  onSearch?: (query: string) => void;
  initialQuery?: string;
  className?: string;
}

export default function SearchBar({ 
  variant = "navbar", 
  onSearch, 
  initialQuery = "", 
  className = "" 
}: SearchBarProps) {
  const [search, setSearch] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches] = useState<string[]>([
    "Phim mới", "One Piece", "Squid Game", "Conan", "Marvel"
  ]);
  const [, navigate] = useLocation();
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 400);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches).slice(0, 5));
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updatedSearches = [
      query,
      ...recentSearches.filter(item => item !== query)
    ].slice(0, 5);
    
    setRecentSearches(updatedSearches);
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
  };

  // Close suggestions when clicking outside search box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [searchBoxRef]);

  // Fetch search suggestions
  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ['/api/search/suggestions', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return { items: [] };
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedSearch.trim())}`);
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
  });
  
  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      const trimmedSearch = search.trim();
      saveRecentSearch(trimmedSearch);
      
      if (onSearch) {
        onSearch(trimmedSearch);
      } else {
        navigate(`/search?q=${encodeURIComponent(trimmedSearch)}`);
      }
      
      setShowSuggestions(false);
    }
  };

  const clearSearch = () => {
    setSearch("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setSearch(suggestion.name);
    saveRecentSearch(suggestion.name);
    setShowSuggestions(false);
  };

  const isExpanded = variant === "expanded";
  
  return (
    <div 
      ref={searchBoxRef} 
      className={`relative ${className}`}
    >
      <form onSubmit={handleSubmitSearch} className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={isExpanded ? "Search for movies, TV shows, actors..." : "Search movies..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value.length >= 2) {
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
            }
          }}
          onFocus={() => {
            if (search.length >= 2) {
              setShowSuggestions(true);
            } else if (search.length === 0) {
              // Show recent and trending searches when input is empty and focused
              setShowSuggestions(true);
            }
          }}
          className={`${
            isExpanded
              ? "bg-background/80 backdrop-blur-sm border-border/40 text-white rounded-full py-6 pl-5 pr-12 text-lg w-full focus:ring-2 focus:ring-primary"
              : "bg-black/60 border border-muted/30 text-white rounded px-4 py-1 w-32 md:w-64 focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
          }`}
        />
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            className={`absolute ${
              isExpanded ? "right-12" : "right-8"
            } top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-white`}
          >
            <X className={`${isExpanded ? "h-5 w-5" : "h-4 w-4"}`} />
          </Button>
        )}
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className={`absolute ${
            isExpanded ? "right-4" : "right-2"
          } top-1/2 transform -translate-y-1/2 text-${search ? "primary" : "muted-foreground"} hover:text-white`}
        >
          <Search className={`${isExpanded ? "h-5 w-5" : "h-4 w-4"}`} />
        </Button>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div 
          className={`absolute top-full left-0 w-full mt-1 ${
            isExpanded ? "bg-background/95 backdrop-blur-md" : "bg-background"
          } border border-border rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto`}
        >
          {/* When query is present */}
          {debouncedSearch.length >= 2 ? (
            isSuggestionsLoading ? (
              // Loading state
              <div className="p-2 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center p-2">
                    <Skeleton className="w-10 h-14 rounded mr-3 flex-shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions?.items?.length > 0 ? (
              // Results found
              <>
                {suggestions.items.map((suggestion: SearchSuggestion) => (
                  <Link
                    key={suggestion._id}
                    to={`/movie/${suggestion.slug}`}
                    onClick={() => handleSelectSuggestion(suggestion)}
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
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="truncate">{suggestion.origin_name}</span>
                        <span className="mx-1">•</span>
                        <Badge variant="outline" className="px-1 py-0 text-[10px] h-4 bg-primary/20 text-primary">
                          {suggestion.type === 'single' ? 'Movie' : 'TV Series'}
                        </Badge>
                        {suggestion.year && (
                          <span className="ml-1">{suggestion.year}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                
                {/* View all results button */}
                <div className="p-2 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-center text-primary hover:text-primary hover:bg-accent/50 flex items-center justify-center gap-1"
                    onClick={() => {
                      const trimmedSearch = search.trim();
                      saveRecentSearch(trimmedSearch);
                      navigate(`/search?q=${encodeURIComponent(trimmedSearch)}`);
                      setShowSuggestions(false);
                    }}
                  >
                    <span>View all results for "{debouncedSearch}"</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </>
            ) : (
              // No results
              <div className="p-4 text-center text-muted-foreground">
                <p>No results found for "{debouncedSearch}"</p>
                <Button
                  variant="link"
                  onClick={handleSubmitSearch}
                  className="mt-1 text-primary text-sm"
                >
                  Search for "{debouncedSearch}" anyway
                </Button>
              </div>
            )
          ) : (
            // When no query is present, show recent and trending searches
            <div className="p-3">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center mb-2">
                    <History className="h-4 w-4 mr-2 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Recent Searches</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((item, index) => (
                      <Button
                        key={`recent-${index}`}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 bg-accent/30 border-border/30 hover:bg-accent/50"
                        onClick={() => {
                          setSearch(item);
                          setShowSuggestions(false);
                          navigate(`/search?q=${encodeURIComponent(item)}`);
                        }}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trending Searches */}
              <div>
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Trending</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((item, index) => (
                    <Button
                      key={`trending-${index}`}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 bg-transparent border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => {
                        setSearch(item);
                        setShowSuggestions(false);
                        navigate(`/search?q=${encodeURIComponent(item)}`);
                      }}
                    >
                      <Film className="h-3 w-3 mr-1" />
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}