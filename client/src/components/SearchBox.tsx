import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Loader2, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

// Define Movie type for use in this component
interface Movie {
  slug: string;
  name: string;
  thumbUrl?: string;
  year?: number;
  quality?: string;
}

interface SearchBoxProps {
  placeholder?: string;
  className?: string;
  variant?: "default" | "navbar" | "inline";
  autoFocus?: boolean;
  maxWidth?: string;
  onSearch?: (searchTerm: string) => void;
}

export default function SearchBox({
  placeholder = "Search...",
  className,
  variant = "default",
  autoFocus = false,
  maxWidth = "320px",
  onSearch
}: SearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  // Fetch suggestions
  const {
    data: suggestions,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["/api/search/suggestions", { q: debouncedSearchTerm }],
    enabled: debouncedSearchTerm.length >= 2,
  });

  // Close popover on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Open popover when we have search term
  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedSearchTerm]);

  // Handle search submission
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (searchTerm.trim()) {
      setIsOpen(false);
      
      if (onSearch) {
        onSearch(searchTerm);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      }
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (movie: Movie) => {
    setIsOpen(false);
    setSearchTerm("");
    navigate(`/movie/${movie.slug}`);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Determine component styles based on variant
  const getContainerClass = () => {
    switch (variant) {
      case "navbar":
        return "relative group";
      case "inline":
        return "relative";
      default:
        return "relative";
    }
  };

  const getInputClass = () => {
    switch (variant) {
      case "navbar":
        return cn(
          "bg-black/60 border border-muted/30 text-white rounded px-4 py-1 w-32 md:w-64 focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300",
          className
        );
      case "inline":
        return cn("w-full bg-muted", className);
      default:
        return cn("w-full", className);
    }
  };

  return (
    <div className={getContainerClass()} style={{ maxWidth }}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative w-full">
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={getInputClass()}
                autoFocus={autoFocus}
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground h-8 w-8"
                  onClick={handleClearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-8 w-8"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0 w-[var(--radix-popover-trigger-width)] max-h-[300px] overflow-y-auto" 
          align="start"
          side="bottom"
        >
          <Command>
            <CommandList>
              {isLoading && (
                <div className="py-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                </div>
              )}
              
              {isError && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Error loading suggestions</p>
                </div>
              )}
              
              {!isLoading && !isError && suggestions?.items && (
                <>
                  <CommandEmpty>No results found</CommandEmpty>
                  <CommandGroup heading="Movies & TV Shows">
                    {suggestions.items.map((movie) => (
                      <CommandItem
                        key={movie.slug}
                        onSelect={() => handleSelectSuggestion(movie)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          {movie.thumbUrl && (
                            <img 
                              src={movie.thumbUrl} 
                              alt={movie.name} 
                              className="h-10 w-7 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{movie.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {movie.year || 'Unknown'} • {movie.quality || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}