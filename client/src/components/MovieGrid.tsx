import React from "react";
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
import { Info } from "lucide-react";

interface MovieGridProps {
  title?: string;
  movies: MovieListItem[];
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onSortChange?: (sortBy: string) => void;
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
  isLoading = false,
}: MovieGridProps) {
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

  return (
    <section className="py-4 container mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        {onSortChange && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Sort by:</span>
            <Select
              defaultValue="modified"
              onValueChange={onSortChange}
            >
              <SelectTrigger className="bg-muted text-white w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modified">Recently Updated</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="year">Release Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {movies.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-xl font-medium text-muted-foreground">No movies found</h3>
          <p className="text-muted-foreground mt-2">Try changing your search criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <div key={movie._id || movie.slug}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6 mb-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Info className="h-4 w-4" />
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
    </section>
  );
}
