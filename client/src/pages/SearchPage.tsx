import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Loader2 } from "lucide-react";
import MovieGrid from "@/components/MovieGrid";
import Pagination from "@/components/Pagination";
import { MovieListResponse } from "@/types/api";
import SearchBox from "@/components/SearchBox";

export default function SearchPage() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("q") || "";
  const [page, setPage] = useState(1);
  const limit = 50;

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Fetch search results
  const {
    data: searchResults,
    isLoading,
    error,
  } = useQuery<MovieListResponse>({
    queryKey: ["/api/search", { q: query, page, limit }],
    enabled: query.length > 0,
  });

  // Extract pagination info
  const totalPages = searchResults?.pagination?.totalPages || 1;
  const totalItems = searchResults?.pagination?.totalItems || 0;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  if (!query) {
    return (
      <div className="container mx-auto px-4 py-8 mt-16">
        <Helmet>
          <title>Search Movies | FilmFlex</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center py-20">
          <h1 className="text-3xl font-bold mb-6">Search Movies</h1>
          <div className="w-full max-w-xl">
            <SearchBox 
              placeholder="Enter movie or TV show title..." 
              autoFocus 
              variant="default"
              maxWidth="100%"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <Helmet>
        <title>Search Results for "{query}" | FilmFlex</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Search Results for "{query}"</h1>
        <div className="mb-6">
          <SearchBox 
            placeholder="Search movies..." 
            variant="default" 
            maxWidth="420px"
          />
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Searching for movies...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 p-4 rounded-md">
            <p className="text-destructive">Error: Failed to load search results.</p>
          </div>
        ) : searchResults?.items?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
            <p className="text-xl mb-2">No results found for "{query}"</p>
            <p className="text-muted-foreground">Try searching for something else.</p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-4">
              Found {totalItems} results for "{query}"
            </p>

            <MovieGrid movies={searchResults?.items || []} />

            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}