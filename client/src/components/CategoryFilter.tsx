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
  // Default categories if none are provided - based on requirements
  const defaultCategories = [
    { id: "all", name: "All", slug: "all" },
    { id: "action", name: "Action", slug: "action" },
    { id: "western", name: "Western", slug: "western" },
    { id: "kids", name: "Kids", slug: "kids" },
    { id: "history", name: "History", slug: "history" },
    { id: "costume-drama", name: "Costume Drama", slug: "costume-drama" },
    { id: "war", name: "War", slug: "war" },
    { id: "sci-fi", name: "Sci-Fi", slug: "sci-fi" },
    { id: "horror", name: "Horror", slug: "horror" },
    { id: "documentary", name: "Documentary", slug: "documentary" },
    { id: "mystery", name: "Mystery", slug: "mystery" },
    { id: "adult", name: "Adult", slug: "adult" },
    { id: "romance", name: "Romance", slug: "romance" },
    { id: "psychological", name: "Psychological", slug: "psychological" },
    { id: "sports", name: "Sports", slug: "sports" },
    { id: "adventure", name: "Adventure", slug: "adventure" },
    { id: "music", name: "Music", slug: "music" },
    { id: "family", name: "Family", slug: "family" },
    { id: "school", name: "School", slug: "school" },
    { id: "comedy", name: "Comedy", slug: "comedy" },
    { id: "crime", name: "Crime", slug: "crime" },
    { id: "martial-arts", name: "Martial Arts", slug: "martial-arts" },
    { id: "science", name: "Science", slug: "science" },
    { id: "mythology", name: "Mythology", slug: "mythology" },
    { id: "drama", name: "Drama", slug: "drama" },
    { id: "classic", name: "Classic", slug: "classic" }
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
