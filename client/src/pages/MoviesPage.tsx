import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MovieListResponse } from "@/types/api";
import MovieGrid from "@/components/MovieGrid";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

export default function MoviesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("latest");
  const [limit] = useState(48);

  // Fetch movie list with pagination and sorting
  const {
    data: moviesData,
    isLoading,
    isError,
  } = useQuery<MovieListResponse>({
    queryKey: [
      "/api/movies",
      { page: currentPage, sortBy: sortBy, limit },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        sortBy: sortBy,
        limit: limit.toString(),
      });
      
      const response = await fetch(`/api/movies?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }
      return response.json();
    },
  });

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // Handle error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Error Loading Movies</h2>
        <p className="text-muted-foreground mb-6">
          There was a problem loading the movie data. Please try again later.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Movies & TV Shows</h1>
      </div>

      <Separator className="mb-6" />

      <MovieGrid
        title=""
        movies={moviesData?.items || []}
        currentPage={currentPage}
        totalPages={moviesData?.pagination?.totalPages || 1}
        totalItems={moviesData?.pagination?.totalItems || moviesData?.items?.length || 0}
        itemsPerPage={limit}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        currentSort={sortBy}
        isLoading={isLoading}
      />
    </div>
  );
}