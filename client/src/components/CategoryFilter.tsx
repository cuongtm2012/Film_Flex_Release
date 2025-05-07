import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Filter, SlidersHorizontal } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (categorySlug: string) => void;
  isLoading?: boolean;
  onSortToggle?: () => void;
}

export default function CategoryFilter({ 
  categories, 
  selectedCategory,
  onSelectCategory,
  isLoading = false,
  onSortToggle
}: CategoryFilterProps) {
  const [isSticky, setIsSticky] = useState(false);
  
  // Handle scroll to apply sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      // Make sticky after hero section (adjust value as needed)
      setIsSticky(offset > 400);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Default categories based on the actual API format according to the data provided
  const defaultCategories = [
    { id: "all", name: "All", slug: "all" },
    { id: "hanh-dong", name: "Hành Động", slug: "hanh-dong" },
    { id: "hai-huoc", name: "Hài Hước", slug: "hai-huoc" },
    { id: "tinh-cam", name: "Tình Cảm", slug: "tinh-cam" },
    { id: "co-trang", name: "Cổ Trang", slug: "co-trang" },
    { id: "tam-ly", name: "Tâm Lý", slug: "tam-ly" },
    { id: "than-thoai", name: "Thần Thoại", slug: "than-thoai" },
    { id: "chien-tranh", name: "Chiến Tranh", slug: "chien-tranh" },
    { id: "hinh-su", name: "Hình Sự", slug: "hinh-su" },
    { id: "kinh-di", name: "Kinh Dị", slug: "kinh-di" },
    { id: "vien-tuong", name: "Viễn Tưởng", slug: "vien-tuong" },
    { id: "phieu-luu", name: "Phiêu Lưu", slug: "phieu-luu" }
  ];

  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  const stickyClasses = isSticky 
    ? "fixed top-0 left-0 right-0 z-40 bg-black/95 shadow-md backdrop-blur-sm transition-all duration-300 ease-in-out py-3 border-b border-gray-800" 
    : "py-6";

  if (isLoading) {
    return (
      <>
        <section className={`${stickyClasses} container mx-auto px-4`}>
          <div className="flex items-center justify-between mb-4">
            <div className="h-7 w-40 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-5 w-24 bg-gray-700 rounded animate-pulse"></div>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="h-10 w-24 bg-gray-700 rounded-full animate-pulse"></div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
        
        {/* Phantom spacer for loading state */}
        {isSticky && <div className="h-24 md:h-32 container mx-auto px-4"></div>}
      </>
    );
  }

  return (
    <>
      <section className={`${stickyClasses} container mx-auto px-4`}>
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-bold">Browse by Category</h2>
          
          <div className="flex items-center gap-2">
            {onSortToggle && (
              <Button 
                onClick={onSortToggle}
                variant="outline" 
                size="sm"
                className="flex items-center gap-1 rounded-full text-sm px-4 py-1 md:hidden border border-gray-600"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Sort</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-white transition hidden md:flex"
            >
              <span>See All</span>
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2">
            {displayCategories.map((category) => (
              <Button
                key={category.id}
                variant="outline"
                className={`category-pill whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition touch-manipulation ${
                  selectedCategory === category.slug 
                    ? "bg-primary text-white border-primary" 
                    : "bg-muted hover:bg-primary/80 border border-gray-700"
                }`}
                onClick={() => onSelectCategory(category.slug)}
              >
                {category.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
      
      {/* Phantom spacer that appears when filter becomes sticky - moved outside the sticky section */}
      {isSticky && <div className="h-24 md:h-32 container mx-auto px-4"></div>}
    </>
  );
}
