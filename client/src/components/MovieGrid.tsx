import { useState } from "react";
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
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface MovieGridProps {
  title?: string;
  movies: MovieListItem[];
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onSortChange?: (sortBy: string) => void;
  currentSort?: string;
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
  currentSort = "latest",
  isLoading = false,
}: MovieGridProps) {
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  
  const handleSortSelection = (value: string) => {
    if (onSortChange) {
      onSortChange(value);
    }
  };
  
  // Map sort options to display names and icons
  const sortOptions = [
    { value: "latest", label: "Latest Added", icon: <ArrowDownAZ className="h-5 w-5" /> },
    { value: "popular", label: "Most Popular", icon: <Flame className="h-5 w-5" /> },
    { value: "rating", label: "Highest Rated", icon: <ThumbsUp className="h-5 w-5" /> }
  ];

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

  // Get the current sort display name
  const currentSortOption = sortOptions.find(opt => opt.value === currentSort);
  
  // Mobile Sort Sheet
  const SortSheet = onSortChange && (
    <Sheet open={isSortSheetOpen} onOpenChange={setIsSortSheetOpen}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-center">Sort Movies</SheetTitle>
        </SheetHeader>
        
        <RadioGroup 
          value={currentSort} 
          onValueChange={handleSortSelection}
          className="grid gap-4"
        >
          {sortOptions.map(option => (
            <div key={option.value} className="flex items-center space-x-2 border border-gray-700 p-4 rounded-lg">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="flex-1 flex justify-between items-center cursor-pointer">
                <span className="text-base">{option.label}</span>
                {option.icon}
              </Label>
            </div>
          ))}
        </RadioGroup>
        
        <SheetFooter className="mt-6">
          <SheetClose asChild>
            <Button className="w-full">Apply Sort</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  // Desktop Sort Dropdown
  const DesktopSortDropdown = onSortChange && (
    <div className="hidden md:flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Sort by:</span>
      <Select
        value={currentSort}
        onValueChange={handleSortSelection}
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
  );

  // Mobile Sort Trigger Button
  const MobileSortTrigger = onSortChange && (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => setIsSortSheetOpen(true)}
      className="md:hidden flex items-center gap-2 h-10 px-3 py-2 rounded-full border border-gray-600"
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span className="text-sm font-medium">Sort: {currentSortOption?.label}</span>
    </Button>
  );

  return (
    <section className="py-4 container mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold hidden md:block">{title}</h2>
        <h2 className="text-xl font-bold md:hidden">{title}</h2>
        
        {DesktopSortDropdown}
        {MobileSortTrigger}
        {SortSheet}
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
    </section>
  );
}
