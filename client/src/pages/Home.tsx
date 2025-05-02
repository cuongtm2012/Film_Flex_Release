import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import HeroSection from "@/components/HeroSection";
import CategoryFilter from "@/components/CategoryFilter";
import MovieGrid from "@/components/MovieGrid";
import { Category, MovieListResponse, MovieDetailResponse } from "@shared/schema";

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  // Fetch movie list query
  const {
    data: moviesData,
    isLoading: isMoviesLoading,
    isError: isMoviesError,
  } = useQuery<MovieListResponse>({
    queryKey: [
      `/api/movies`,
      { page: currentPage, category: selectedCategory, sort: sortBy },
    ],
  });

  // Fetch featured movie detail for hero section (using first available movie if available)
  const {
    data: featuredMovie,
    isLoading: isFeaturedLoading,
  } = useQuery<MovieDetailResponse>({
    queryKey: [`/api/movies/${moviesData?.items?.[0]?.slug || 'the-missing'}`],
    enabled: !!moviesData?.items?.[0]?.slug,
  });

  // Fetch categories (for now using dummy categories until API is ready)
  const dummyCategories: Category[] = [
    { id: "1", name: "Action", slug: "action" },
    { id: "2", name: "Comedy", slug: "comedy" },
    { id: "3", name: "Drama", slug: "drama" },
    { id: "4", name: "Horror", slug: "horror" },
    { id: "5", name: "Sci-Fi", slug: "sci-fi" },
  ];
  
  const categoriesData = { categories: dummyCategories };

  // Default empty categories array if no data
  const categories = categoriesData?.categories || [];

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle category selection
  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setCurrentPage(1);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // Handle error state
  if (isMoviesError) {
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

  return (
    <>
      <HeroSection movie={featuredMovie} isLoading={isFeaturedLoading} />
      
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        isLoading={isMoviesLoading}
      />
      
      <MovieGrid
        title="Movies & TV Shows"
        movies={moviesData?.items || []}
        currentPage={currentPage}
        totalPages={moviesData?.pagination?.totalPages || 1}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        isLoading={isMoviesLoading}
      />
    </>
  );
}
