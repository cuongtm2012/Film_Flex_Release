import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Clock, ArrowLeft, Play, Calendar, Search, Trash2, CircleSlash, BarChart4, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Type for watch history item
type WatchHistoryItem = {
  id: number;
  title: string;
  posterUrl: string;
  type: "movie" | "series";
  episodeInfo?: string;
  progress: number;
  watchedAt: Date;
  duration: number; // in minutes
  watchedDuration: number; // in minutes
};

// Mock data for watch history - in a real app, this would come from the API
const mockWatchHistory: WatchHistoryItem[] = [
  {
    id: 1,
    title: "Stranger Things",
    posterUrl: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    type: "series",
    episodeInfo: "Season 4, Episode 8",
    progress: 75,
    watchedAt: new Date(2023, 11, 20, 19, 30), // Dec 20, 2023, 7:30 PM
    duration: 60,
    watchedDuration: 45
  },
  {
    id: 2,
    title: "Dune",
    posterUrl: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    type: "movie",
    progress: 100,
    watchedAt: new Date(2023, 11, 18, 20, 0), // Dec 18, 2023, 8:00 PM
    duration: 155,
    watchedDuration: 155
  },
  {
    id: 3,
    title: "The Witcher",
    posterUrl: "https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg",
    type: "series",
    episodeInfo: "Season 2, Episode 3",
    progress: 100,
    watchedAt: new Date(2023, 11, 15, 21, 15), // Dec 15, 2023, 9:15 PM
    duration: 50,
    watchedDuration: 50
  },
  {
    id: 4,
    title: "Oppenheimer",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    type: "movie",
    progress: 40,
    watchedAt: new Date(2023, 11, 12, 19, 0), // Dec 12, 2023, 7:00 PM
    duration: 180,
    watchedDuration: 72
  },
  {
    id: 5,
    title: "The Queen's Gambit",
    posterUrl: "https://image.tmdb.org/t/p/w500/zU0htwkhNvBQdVSIKB9s6hgVeFK.jpg",
    type: "series",
    episodeInfo: "Season 1, Episode 6",
    progress: 90,
    watchedAt: new Date(2023, 11, 10, 22, 0), // Dec 10, 2023, 10:00 PM
    duration: 55,
    watchedDuration: 49
  }
];

export default function WatchHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [history, setHistory] = useState<WatchHistoryItem[]>(mockWatchHistory);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  
  // Calculate total watch time
  const totalWatchTime = history.reduce(
    (total, item) => total + item.watchedDuration,
    0
  );
  
  // Format minutes to hours and minutes
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  
  // Format date to readable string
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  
  // Format time to readable string
  const formatTimeOfDay = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };
  
  // Handle removing an item from history
  const handleRemoveFromHistory = (id: number) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    
    toast({
      title: "Removed from history",
      description: "The item has been removed from your watch history.",
    });
  };
  
  // Handle continuing to watch
  const handleContinueWatching = (id: number) => {
    const item = history.find((i) => i.id === id);
    if (item) {
      navigate(`/movie/${id}?t=${Math.floor(item.watchedDuration * 60)}`);
    }
  };
  
  // Filter and search history
  const filteredHistory = history.filter((item) => {
    const matchesSearch = searchTerm
      ? item.title.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    const matchesFilter =
      filter === "all" ||
      (filter === "movies" && item.type === "movie") ||
      (filter === "shows" && item.type === "series") ||
      (filter === "inProgress" && item.progress < 100);
    
    return matchesSearch && matchesFilter;
  });
  
  // Sort history by date
  const sortedHistory = [...filteredHistory].sort(
    (a, b) => b.watchedAt.getTime() - a.watchedAt.getTime()
  );
  
  // Group history by date
  const historyByDate = sortedHistory.reduce<Record<string, WatchHistoryItem[]>>(
    (groups, item) => {
      const date = item.watchedAt.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    },
    {}
  );
  
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

  if (!user) {
    return <div className="p-8 text-center">Loading watch history...</div>;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-1">{formatTime(totalWatchTime)}</h3>
          <p className="text-muted-foreground">Total Watch Time</p>
        </Card>
        
        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Film className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-1">{history.length}</h3>
          <p className="text-muted-foreground">Items Watched</p>
        </Card>
        
        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <BarChart4 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-1">
            {history.filter(item => item.progress === 100).length}
          </h3>
          <p className="text-muted-foreground">Completed</p>
        </Card>
      </div>
      
      {/* Filters and Search */}
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
        
        <Select
          value={filter}
          onValueChange={setFilter}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="movies">Movies Only</SelectItem>
            <SelectItem value="shows">TV Shows Only</SelectItem>
            <SelectItem value="inProgress">In Progress</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => {
            setHistory([]);
            toast({
              title: "History cleared",
              description: "Your watch history has been cleared.",
            });
          }}
        >
          <Trash2 className="h-4 w-4" />
          Clear History
        </Button>
      </div>
      
      {/* Watch History List */}
      {isLoading ? (
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sortedHistory.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(historyByDate).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <h2 className="text-lg font-medium">{formatDate(new Date(date))}</h2>
              </div>
              
              <div className="space-y-4">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-[150px] h-[100px] sm:h-auto relative">
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 sm:hidden flex items-center justify-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-white" 
                            onClick={() => handleContinueWatching(item.id)}
                          >
                            <Play className="h-8 w-8" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{item.title}</h3>
                              <Badge variant={item.type === "movie" ? "default" : "secondary"}>
                                {item.type === "movie" ? "Movie" : "TV"}
                              </Badge>
                            </div>
                            
                            {item.episodeInfo && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.episodeInfo}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>{formatTimeOfDay(item.watchedAt)}</span>
                              <Separator orientation="vertical" className="h-4" />
                              <span>{formatTime(item.duration)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            {item.progress < 100 && (
                              <Button
                                variant="outline"
                                className="gap-2 text-xs sm:text-sm"
                                onClick={() => handleContinueWatching(item.id)}
                              >
                                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                                Continue
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground"
                              onClick={() => handleRemoveFromHistory(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Progress value={item.progress} className="h-2" />
                            <span className="text-sm text-muted-foreground">
                              {item.progress}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(item.watchedDuration)} watched of {formatTime(item.duration)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          
          {sortedHistory.length > 10 && (
            <Button variant="outline" className="w-full">
              Load More
            </Button>
          )}
        </div>
      ) : searchTerm || filter !== "all" ? (
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
      ) : (
        <EmptyState />
      )}
    </div>
  );
}