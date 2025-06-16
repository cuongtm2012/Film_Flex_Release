import { useState } from "react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import WatchlistGrid from "@/components/WatchlistGrid";

export default function MyListPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");

  // Use the watchlist hook
  const {
    watchlistData,
    isLoading,
    isError,
    error,
    removeFromWatchlist,
    toggleWatched,
    getFilteredMovies,
  } = useWatchlist();

  // Handle removing movie from watchlist
  const handleRemoveFromWatchlist = (movieSlug: string) => {
    removeFromWatchlist.mutate(movieSlug);
  };

  // Handle toggling watched status
  const handleToggleWatched = (movieSlug: string, isWatched: boolean) => {
    toggleWatched.mutate({ movieSlug, isWatched });
  };

  // Get filtered movies based on active tab
  const filteredMovies = getFilteredMovies(activeTab as "all" | "watched" | "unwatched");

  // Error state
  if (isError && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertDescription>
            {error?.message || "There was a problem loading your watchlist. Please try again later."}
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">My List</h1>
        <div className="text-sm text-muted-foreground">
          {watchlistData.length} item{watchlistData.length !== 1 ? 's' : ''} in your watchlist
        </div>
      </div>

      <Separator className="mb-6" />

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">
            All ({watchlistData.length})
          </TabsTrigger>
          <TabsTrigger value="unwatched">
            Unwatched ({getFilteredMovies("unwatched").length})
          </TabsTrigger>
          <TabsTrigger value="watched">
            Watched ({getFilteredMovies("watched").length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} forceMount>
          <WatchlistGrid
            movies={filteredMovies}
            isLoading={isLoading}
            onRemoveMovie={handleRemoveFromWatchlist}
            onToggleWatched={handleToggleWatched}
            removeLoading={removeFromWatchlist.isPending}
            toggleLoading={toggleWatched.isPending}
            showWatchedToggle={true}
            emptyMessage={`Your ${activeTab === "all" ? "watchlist" : activeTab + " list"} is empty`}
            emptyDescription={`You haven't added any movies to your ${activeTab === "all" ? "list" : activeTab + " list"} yet.`}
            compact={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}