import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, X, Sparkles } from "lucide-react";
import MovieGrid from "@/components/MovieGrid";
import { MovieListResponse } from "@shared/schema";
import Layout from "@/components/Layout";

export default function SearchPage() {
  // Parse query params from URL
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const initialQuery = (searchParams.get("q") || "").trim();

  const [query, setQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [useAI, setUseAI] = useState(true); // AI search enabled by default

  // Ensure we refresh the search when URL changes
  useEffect(() => {
    const newQuery = (searchParams.get("q") || "").trim();
    if (newQuery !== query) {
      setQuery(newQuery);
      setSearchTerm(newQuery);
    }
  }, [location]);

  // Reset to page 1 when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Update URL whenever searchTerm changes
  useEffect(() => {
    if (searchTerm !== initialQuery) {
      const [path] = location.split("?");
      window.history.pushState(
        {},
        "",
        searchTerm ? `${path}?q=${encodeURIComponent(searchTerm)}` : path
      );
    }
  }, [searchTerm, location, initialQuery]);

  // Search query with AI support
  const {
    data: searchResults,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [useAI ? "/api/ai/search" : "/api/search", searchTerm, currentPage],
    queryFn: async () => {
      const endpoint = useAI ? "/api/ai/search" : "/api/search";
      let url = `${endpoint}?q=${encodeURIComponent(searchTerm)}`;
      if (!useAI) {
        url += `&page=${currentPage}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }
      const data = await response.json();

      // Transform AI search response to match MovieListResponse
      if (useAI && data.items) {
        return {
          status: true,
          items: data.items,
          pagination: {
            totalItems: data.total || data.items.length,
            totalPages: 1,
            currentPage: 1,
            totalItemsPerPage: data.items.length
          }
        } as MovieListResponse;
      }

      return data as MovieListResponse;
    },
    enabled: searchTerm.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  const clearSearch = () => {
    setQuery("");
    setSearchTerm("");
    window.history.pushState({}, "", "/search");
  };

  const aiPowered = useAI && searchResults && (searchResults as any).aiPowered !== false;

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Search Movies</h1>

            {/* AI Toggle */}
            <button
              onClick={() => setUseAI(!useAI)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${useAI
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                  : 'bg-muted border border-border'
                }`}
            >
              <Sparkles className={`h-4 w-4 ${useAI ? 'text-purple-400 animate-pulse' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${useAI ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : 'text-muted-foreground'}`}>
                AI Search
              </span>
            </button>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative mb-8">
            <Input
              type="text"
              placeholder={useAI ? "Try: 'movies like Inception' or 'funny dog movies'" : "Search for movies, TV shows, actors..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="search-input"
              className="bg-background/80 backdrop-blur-sm border-border/40 text-white rounded-full py-6 pl-5 pr-12 text-lg w-full focus:ring-2 focus:ring-primary"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="text-muted-foreground hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                data-testid="search-button"
                className="text-primary hover:text-white"
              >
                <SearchIcon className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Results */}
          {searchTerm ? (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-medium mb-1">
                    {isLoading ? (
                      <Skeleton className="h-7 w-48" />
                    ) : (
                      `Search results for "${searchTerm}"`
                    )}
                  </h2>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {isLoading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : searchResults && searchResults.pagination ? (
                      `Found ${searchResults.pagination.totalItems} results`
                    ) : (
                      "Found 0 results"
                    )}

                    {/* AI Badge */}
                    {aiPowered && !isLoading && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-xs font-medium text-purple-400">AI-powered</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex flex-col">
                      <Skeleton className="aspect-[2/3] w-full rounded-md mb-2" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Error loading search results. Please try again.
                  </p>
                </div>
              ) : searchResults && searchResults.items.length > 0 ? (
                <MovieGrid
                  movies={searchResults.items}
                  currentPage={currentPage}
                  totalPages={searchResults.pagination?.totalPages || 1}
                  totalItems={searchResults.pagination?.totalItems || 0}
                  itemsPerPage={searchResults.pagination?.totalItemsPerPage || 50}
                  onPageChange={setCurrentPage}
                  title={`Results for "${searchTerm}"`}
                />
              ) : (
                <div className="text-center py-12 no-results-message" data-testid="no-results">
                  <p className="text-muted-foreground">
                    No results found for "{searchTerm}". Try a different search term.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {useAI
                  ? "Try natural language search like 'sci-fi movies about time travel'"
                  : "Enter a search term to find movies and TV shows."}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}