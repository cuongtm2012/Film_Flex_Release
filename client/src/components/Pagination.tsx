import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const pageNumbers = [];
    
    // Always show first page
    pageNumbers.push(1);
    
    // Create an array of page numbers we should show
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // If we're at the start, show more pages after
    if (currentPage < 3) {
      endPage = Math.min(totalPages - 1, 4);
    }
    
    // If we're at the end, show more pages before
    if (currentPage > totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
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
    <div className="flex justify-center items-center mt-6 md:mt-10 gap-1.5 md:gap-2 flex-wrap px-2">
      <Button
        variant="outline"
        size="icon"
        className="w-9 h-9 md:w-10 md:h-10 rounded-full shrink-0"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
      
      {visiblePages.map((page, index) => {
        // If page is a string, it's an ellipsis
        if (typeof page === "string") {
          return (
            <span key={page} className="w-8 h-9 md:w-10 md:h-10 flex items-center justify-center text-muted-foreground text-sm">
              ...
            </span>
          );
        }
        
        // Otherwise it's a number
        return (
          <Button
            key={index}
            variant={currentPage === page ? "default" : "outline"}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-full text-sm shrink-0 ${
              currentPage === page ? "bg-primary hover:bg-primary/90" : ""
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        );
      })}
      
      <Button
        variant="outline"
        size="icon"
        className="w-9 h-9 md:w-10 md:h-10 rounded-full shrink-0"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
    </div>
  );
}
