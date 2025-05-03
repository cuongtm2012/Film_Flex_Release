import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  // Don't show pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    // Always include first page
    pages.push(1);
    
    // Add ellipsis if there are many pages before the current one
    if (currentPage > 3) {
      pages.push('...');
    }
    
    // Add one page before current if not adjacent to first or ellipsis
    if (currentPage > 2) {
      pages.push(currentPage - 1);
    }
    
    // Add current page if not first or last
    if (currentPage > 1 && currentPage < totalPages) {
      pages.push(currentPage);
    }
    
    // Add one page after current if not adjacent to last or ellipsis
    if (currentPage < totalPages - 1) {
      pages.push(currentPage + 1);
    }
    
    // Add ellipsis if there are many pages after the current one
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    // Always include last page if more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    // Remove duplicates and return
    return Array.from(new Set(pages));
  };
  
  const pageNumbers = getPageNumbers();

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {/* Previous button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      {pageNumbers.map((page, index) => {
        if (page === '...') {
          return (
            <Button
              key={`ellipsis-${index}`}
              variant="ghost"
              size="icon"
              disabled
              className="cursor-default"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          );
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            onClick={() => onPageChange(page as number)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
            className="min-w-8"
          >
            {page}
          </Button>
        );
      })}

      {/* Next button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}