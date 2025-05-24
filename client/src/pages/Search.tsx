import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, X } from "lucide-react";
import MovieGrid from "@/components/MovieGrid";
import { MovieListResponse } from "@shared/schema";

export default function Search() {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Parse search parameters from URL
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const queryParam = params.get("q");
    const pageParam = params.get("page");
    
    if (queryParam) setSearchTerm(queryParam);
    if (pageParam) setCurrentPage(parseInt(pageParam) || 1);
  }, [location]);
    // Fetch search results
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    isError: isSearchError
  } = useQuery<MovieListResponse>({
    queryKey: [`/api/search`, { q: searchTerm, page: currentPage }],
    enabled: searchTerm.length > 0
  });
    // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    
    // Update URL with search parameters
    const [basePath] = location.split("?");
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    
    const newLocation = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    window.history.pushState(null, "", newLocation);
  };
    // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    // Update URL with new page parameter
    const [basePath] = location.split("?");
    const params = new URLSearchParams(location.split("?")[1]);
    params.set("page", page.toString());
    
    const newLocation = `${basePath}?${params.toString()}`;
    window.history.pushState(null, "", newLocation);
  };
  
  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    
    // Update URL to remove search parameters
    const [basePath] = location.split("?");
    window.history.pushState(null, "", basePath);
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Search Movies & TV Shows</h1>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Search by title, actor, director..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pr-10 bg-muted"
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-10 top-1/2 transform -translate-y-1/2"
                onClick={handleClearSearch}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          <Button type="submit" className="h-12 px-6 bg-primary hover:bg-primary/90">
            <SearchIcon className="h-5 w-5 mr-2" />
            Search
          </Button>        </form>
      </div>
      
      {/* Search Results */}
      {isSearchLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-8">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded" />
          ))}
        </div>
      ) : isSearchError ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-medium text-muted-foreground">Error loading search results</h2>
          <p className="text-muted-foreground mt-2">Please try again later</p>
        </div>
      ) : searchTerm && searchResults ? (        <MovieGrid
          title={`Search Results for "${searchTerm}"`}
          movies={searchResults.items}
          currentPage={currentPage}
          totalPages={searchResults.pagination?.totalPages || 1}
          onPageChange={handlePageChange}
          isLoading={false}
        />
      ) : (
        <div className="text-center py-16">
          <h2 className="text-xl font-medium">Enter a search term to find movies and TV shows</h2>
          <p className="text-muted-foreground mt-2">
            Search by title, actor, director, or other keywords
          </p>
        </div>
      )}
    </div>
  );
}
