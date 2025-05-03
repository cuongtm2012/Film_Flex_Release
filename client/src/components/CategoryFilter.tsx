import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
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
}

export default function CategoryFilter({ 
  categories, 
  selectedCategory,
  onSelectCategory,
  isLoading = false 
}: CategoryFilterProps) {
  // Default categories based on API compatibility - phimapi.com has specific category slugs
  const defaultCategories = [
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

  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  if (isLoading) {
    return (
      <section className="py-6 container mx-auto px-4">
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
    );
  }

  return (
    <section className="py-6 container mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Browse by Category</h2>
        <Button variant="ghost" className="text-muted-foreground hover:text-white transition">
          <span>See All</span>
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2">
          {displayCategories.map((category) => (
            <Button
              key={category.id}
              variant="outline"
              className={`category-pill whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedCategory === category.slug ? "bg-primary text-white" : "bg-muted hover:bg-primary/80"
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
  );
}
