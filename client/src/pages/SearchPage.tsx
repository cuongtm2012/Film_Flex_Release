import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, X } from "lucide-react";
import CategoryFilter, { Category } from "@/components/CategoryFilter";
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
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState(initialQuery); // Actual search term to be used for API calls
  
  // Ensure we refresh the search when URL changes
  useEffect(() => {
    const newQuery = (searchParams.get("q") || "").trim();
    if (newQuery !== query) {
      setQuery(newQuery);
      setSearchTerm(newQuery);
    }
  }, [location]);
  
  // Reset to page 1 when query or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategorySlug]);
  
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
  
  // Search query
  const {
    data: searchResults,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/search", searchTerm, currentPage, selectedCategorySlug],
    queryFn: async () => {
      let url = `/api/search?q=${encodeURIComponent(searchTerm)}&page=${currentPage}`;
      
      if (selectedCategorySlug && selectedCategorySlug !== "all") {
        url += `&category=${selectedCategorySlug}`;
      }
      
      console.log("Fetching search results from:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }
      return response.json() as Promise<MovieListResponse>;
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
  
  return (
    <Layout>
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl font-bold mb-6">Search Movies</h1>
          
          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative mb-8">
            <Input
              type="text"
              placeholder="Search for movies, TV shows, actors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                className="text-primary hover:text-white"
              >
                <SearchIcon className="h-5 w-5" />
              </Button>
            </div>
          </form>
          
          {/* Category Filters */}
          <div className="mb-6">
            <CategoryFilter
              selectedCategory={selectedCategorySlug}
              onSelectCategory={setSelectedCategorySlug}
              categories={[]}
            />
          </div>
          
          {/* Results */}
          {searchTerm ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-medium mb-1">
                  {isLoading ? (
                    <Skeleton className="h-7 w-48" />
                  ) : (
                    `Search results for "${searchTerm}"`
                  )}
                </h2>
                <div className="text-muted-foreground">
                  {isLoading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : searchResults && searchResults.pagination ? (
                    `Found ${searchResults.pagination.totalItems} results`
                  ) : (
                    "Found 0 results"
                  )}
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
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No results found for "{searchTerm}". Try a different search term.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Enter a search term to find movies and TV shows.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}