import { useState, useEffect } from "react";
import MovieCard from "./MovieCard";
import Pagination from "./Pagination";
import { MovieListItem } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Info, 
  ArrowDownAZ, 
  Flame, 
  ThumbsUp, 
  CalendarDays, 
  ArrowUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MovieGridProps {
  title?: string;
  movies: MovieListItem[];
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onSortChange?: (sortBy: string) => void;
  onYearChange?: (year: string) => void;
  currentSort?: string;
  currentYear?: string;
  availableYears?: number[];
  isLoading?: boolean;
}

export default function MovieGrid({
  title = "Movies & TV Shows",
  movies,
  currentPage,
  totalPages,
  totalItems = 0,
  itemsPerPage = 50,
  onPageChange,
  onSortChange,
  onYearChange,
  currentSort = "latest",
  currentYear = "",
  availableYears = [],
  isLoading = false,
}: MovieGridProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Map sort options to display names and icons
  const sortOptions = [
    { value: "latest", label: "Latest", icon: <ArrowDownAZ className="h-4 w-4" /> },
    { value: "popular", label: "Popular", icon: <Flame className="h-4 w-4" /> },
    { value: "rating", label: "Top Rated", icon: <ThumbsUp className="h-4 w-4" /> },
    { value: "year", label: "By Year", icon: <CalendarDays className="h-4 w-4" /> }
  ];

  // Generate year options for horizontal scroll
  const currentYearNum = new Date().getFullYear();
  const yearOptions = [
    { value: "", label: "All" },
    ...availableYears.slice(0, 15).map(year => ({
      value: year.toString(),
      label: year.toString()
    }))
  ];

  // Handle scroll to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <section className="py-4 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-64 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-10 w-40 bg-gray-700 rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, index) => (
            <div
              key={index}
              className="aspect-[2/3] bg-gray-700 rounded animate-pulse"
            ></div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <div className="h-10 w-64 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </section>
    );
  }

  // Desktop Filters (unchanged)
  const DesktopFilters = (
    <div className="hidden md:flex items-center gap-4">
      {onYearChange && availableYears.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Year:</span>
          <Select
            value={currentYear}
            onValueChange={onYearChange}
          >
            <SelectTrigger className="bg-muted text-white w-[140px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="">All Years</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {onSortChange && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Sort by:</span>
          <Select
            value={currentSort}
            onValueChange={onSortChange}
          >
            <SelectTrigger className="bg-muted text-white w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value} className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  // Mobile Horizontal Scrollable Filters
  const MobileFilters = (onSortChange || onYearChange) && (
    <div className="md:hidden space-y-3">
      {/* Sort Options - Horizontal Scroll */}
      {onSortChange && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground px-1">Sort By</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all shrink-0",
                  currentSort === option.value
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {option.icon}
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Year Filter - Horizontal Scroll */}
      {onYearChange && yearOptions.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground px-1">Filter by Year</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {yearOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onYearChange(option.value)}
                className={cn(
                  "px-4 py-2 rounded-full whitespace-nowrap transition-all shrink-0 text-sm font-medium",
                  currentYear === option.value
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section className="py-4 container mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold hidden md:block">{title}</h2>
        <h2 className="text-xl font-bold md:hidden">{title}</h2>
        
        {DesktopFilters}
      </div>

      {/* Mobile Filters */}
      {MobileFilters}

      {movies.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-xl font-medium text-muted-foreground">No movies found</h3>
          <p className="text-muted-foreground mt-2">Try changing your search criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
            {movies.map((movie) => (
              <div key={movie._id || movie.slug}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 mb-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1 mb-2 sm:mb-0">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>
                Showing {movies.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
              </span>
            </div>
            <div>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all"
          size="icon"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </section>
  );
}
