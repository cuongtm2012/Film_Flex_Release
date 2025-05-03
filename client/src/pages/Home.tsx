import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import HeroSection from "@/components/HeroSection";
import CategoryFilter from "@/components/CategoryFilter";
import MovieGrid from "@/components/MovieGrid";
import { Category, MovieListResponse, MovieDetailResponse } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [limit, setLimit] = useState(50); // Default to 50 items per page per requirements

  // Determine the API endpoint based on category selection
  // When using '/api/categories/all', the server will automatically redirect to '/api/movies'
  const endpoint = selectedCategory === 'all' 
    ? '/api/movies' 
    : `/api/categories/${selectedCategory}`;
  
  // Fetch movie list with category filtering and pagination
  const {
    data: moviesData,
    isLoading: isMoviesLoading,
    isError: isMoviesError,
  } = useQuery<MovieListResponse>({
    queryKey: [
      endpoint,
      { page: currentPage, sort: sortBy, limit },
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

  // Category list based on API compatibility - phimapi.com has specific category slugs
  // Using "all" plus a smaller set of categories that are likely to work with the API
  const availableCategories: Category[] = [
    { id: "all", name: "All", slug: "all" },
    { id: "phim-hanh-dong", name: "Action", slug: "phim-hanh-dong" },
    { id: "phim-hai-huoc", name: "Comedy", slug: "phim-hai-huoc" },
    { id: "phim-tinh-cam", name: "Romance", slug: "phim-tinh-cam" },
    { id: "phim-co-trang", name: "Historical", slug: "phim-co-trang" },
    { id: "phim-tam-ly", name: "Drama", slug: "phim-tam-ly" },
    { id: "phim-than-thoai", name: "Mythology", slug: "phim-than-thoai" },
    { id: "phim-chien-tranh", name: "War", slug: "phim-chien-tranh" },
    { id: "phim-hinh-su", name: "Crime", slug: "phim-hinh-su" },
    { id: "phim-kinh-di", name: "Horror", slug: "phim-kinh-di" },
    { id: "phim-vien-tuong", name: "Sci-Fi", slug: "phim-vien-tuong" },
    { id: "phim-phieu-luu", name: "Adventure", slug: "phim-phieu-luu" }
  ];
  
  // Use our predefined categories list
  const categories = availableCategories;

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle category selection
  const handleCategorySelect = (categorySlug: string) => {
    // Reset to page 1 when changing categories
    if (selectedCategory !== categorySlug) {
      setSelectedCategory(categorySlug);
      setCurrentPage(1);
    }
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
        totalItems={moviesData?.pagination?.totalItems || 0}
        itemsPerPage={limit}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        isLoading={isMoviesLoading}
      />
    </>
  );
}
