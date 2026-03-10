import { useState } from "react";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { ArrowLeft, Search, Trash2, CircleSlash, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import WatchHistoryStats from "@/components/WatchHistoryStats";
import WatchHistoryList from "@/components/WatchHistoryList";

export default function WatchHistoryPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  // Use the watch history hook
  const {
    history,
    isLoading,
    isError,
    error,
    removeFromHistory,
    clearAllHistory,
    totalWatchTime,
    totalItems,
    completedItems,
    getFilteredHistory,
    getHistoryByDate,
    isEmpty,
  } = useWatchHistory();

  // Handle continuing to watch
  const handleContinueWatching = (slug: string, progress: number) => {
    const timeInSeconds = Math.floor((progress / 100) * 120 * 60); // Convert to seconds
    navigate(`/movie/${slug}?t=${timeInSeconds}`);
  };

  // Handle removing an item from history
  const handleRemoveFromHistory = (id: number) => {
    removeFromHistory.mutate(id);
  };

  // Handle clearing all history
  const handleClearHistory = () => {
    clearAllHistory.mutate();
  };

  // Filter and search history
  const filteredHistory = getFilteredHistory(searchTerm, filter);
  const historyByDate = getHistoryByDate(filteredHistory);

  // Empty state component
  const EmptyState = () => (
    <div className="text-center p-8">
      <Clock className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
      <h3 className="text-lg font-medium mb-2">No watch history yet</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Your watch history will appear here once you start watching movies and shows
      </p>
      <Button onClick={() => navigate("/")}>Discover Content</Button>
    </div>
  );

  // No results state component
  const NoResultsState = () => (
    <div className="text-center p-8">
      <CircleSlash className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
      <h3 className="text-lg font-medium mb-2">No results found</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Try adjusting your search or filter to find what you're looking for
      </p>
      <Button 
        variant="outline" 
        onClick={() => {
          setSearchTerm("");
          setFilter("all");
        }}
      >
        Clear Filters
      </Button>
    </div>
  );

  // Error state
  if (isError && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertDescription>
            {error?.message || "There was a problem loading your watch history. Please try again later."}
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          className="mr-4"
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Button>
        <h1 className="text-3xl font-bold">Watch History</h1>
      </div>
      
      {/* Watch Stats */}
      <WatchHistoryStats
        totalWatchTime={totalWatchTime}
        totalItems={totalItems}
        completedItems={completedItems}
        isLoading={isLoading}
      />
      
      {/* Show filters and search only if there's history or active filters */}
      {(!isEmpty || searchTerm || filter !== "all") && (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search watch history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="movies">Movies Only</SelectItem>
              <SelectItem value="shows">TV Shows Only</SelectItem>
              <SelectItem value="inProgress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          {!isEmpty && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleClearHistory}
              disabled={clearAllHistory.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Clear History
            </Button>
          )}
        </div>
      )}
      
      {/* Watch History List */}
      <WatchHistoryList
        historyByDate={historyByDate}
        isLoading={isLoading}
        onRemoveItem={handleRemoveFromHistory}
        onContinueWatching={handleContinueWatching}
        removeLoading={removeFromHistory.isPending}
        emptyStateComponent={
          isEmpty ? <EmptyState /> : 
          (filteredHistory.length === 0 && (searchTerm || filter !== "all")) ? <NoResultsState /> : 
          undefined
        }
      />
    </div>
  );
}