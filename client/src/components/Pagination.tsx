import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate which page numbers to show - responsive based on screen size
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = isMobile ? 3 : 5; // Fewer pages on mobile to prevent wrapping
    
    if (totalPages <= maxVisible + 2) {
      // If total pages is small enough, show all
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    }
    
    // Always show first page
    pageNumbers.push(1);
    
    // Calculate range around current page
    const halfVisible = Math.floor(maxVisible / 2);
    let startPage = Math.max(2, currentPage - halfVisible);
    let endPage = Math.min(totalPages - 1, currentPage + halfVisible);
    
    // Adjust if we're near the start
    if (currentPage <= halfVisible + 1) {
      endPage = Math.min(totalPages - 1, maxVisible);
    }
    
    // Adjust if we're near the end
    if (currentPage >= totalPages - halfVisible) {
      startPage = Math.max(2, totalPages - maxVisible);
    }
    
    // Add ellipsis after page 1 if needed
    if (startPage > 2) {
      pageNumbers.push("ellipsis1");
    }
    
    // Add the calculated page range
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pageNumbers.push("ellipsis2");
    }
    
    // Always show last page if we have more than 1 page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  const visiblePages = getPageNumbers();
  
  return (
    <div className="flex justify-center items-center mt-6 md:mt-10 gap-1 sm:gap-1.5 md:gap-2 px-2">
      <Button
        variant="outline"
        size="icon"
        className="w-9 h-9 md:w-10 md:h-10 rounded-full shrink-0"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
      
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
        {visiblePages.map((page, index) => {
          // If page is a string, it's an ellipsis
          if (typeof page === "string") {
            return (
              <span 
                key={page} 
                className="w-6 sm:w-8 md:w-10 h-9 md:h-10 flex items-center justify-center text-muted-foreground text-xs sm:text-sm shrink-0"
              >
                ...
              </span>
            );
          }
          
          // Otherwise it's a number
          return (
            <Button
              key={index}
              variant={currentPage === page ? "default" : "outline"}
              className={`w-9 h-9 md:w-10 md:h-10 rounded-full text-xs sm:text-sm shrink-0 ${
                currentPage === page ? "bg-primary hover:bg-primary/90" : ""
              }`}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </Button>
          );
        })}
      </div>
      
      <Button
        variant="outline"
        size="icon"
        className="w-9 h-9 md:w-10 md:h-10 rounded-full shrink-0"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
    </div>
  );
}
