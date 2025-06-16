import React from "react";
import { useLocation } from "wouter";
import { Play, Calendar, Trash2, CircleSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchHistoryItem } from "@/hooks/use-watch-history";

interface WatchHistoryListProps {
  historyByDate: Record<string, WatchHistoryItem[]>;
  isLoading: boolean;
  onRemoveItem: (id: number) => void;
  onContinueWatching: (slug: string, progress: number) => void;
  removeLoading?: boolean;
  emptyStateComponent?: React.ReactNode;
}

const WatchHistoryList: React.FC<WatchHistoryListProps> = ({
  historyByDate,
  isLoading,
  onRemoveItem,
  onContinueWatching,
  removeLoading = false,
  emptyStateComponent,
}) => {
  const [, navigate] = useLocation();

  // Format minutes to hours and minutes
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, groupIndex) => (
          <div key={groupIndex} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  const historyEntries = Object.entries(historyByDate);
  if (historyEntries.length === 0) {
    return emptyStateComponent || (
      <div className="text-center p-8">
        <CircleSlash className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
        <h3 className="text-lg font-medium mb-2">No watch history found</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Your watch history will appear here once you start watching content
        </p>
        <Button onClick={() => navigate("/")}>Discover Content</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {historyEntries.map(([date, items]) => (
        <div key={date} className="space-y-4">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <h2 className="text-lg font-medium">{formatDate(new Date(date))}</h2>
          </div>
          
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-[150px] h-[200px] sm:h-[120px] relative cursor-pointer">
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/default-poster.jpg';
                      }}
                      onClick={() => navigate(`/movie/${item.slug}`)}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white" 
                        onClick={() => onContinueWatching(item.slug, item.progress)}
                      >
                        <Play className="h-8 w-8" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 
                            className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors line-clamp-2"
                            onClick={() => navigate(`/movie/${item.slug}`)}
                          >
                            {item.title}
                          </h3>
                          <Badge variant={item.type === "movie" ? "default" : "secondary"}>
                            {item.type === "movie" ? "Movie" : "TV"}
                          </Badge>
                        </div>
                        
                        {item.episodeInfo && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.episodeInfo}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                          <span>{formatTimeOfDay(item.watchedAt)}</span>
                          <Separator orientation="vertical" className="h-4" />
                          <span>{formatTime(item.duration)}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Progress value={item.progress} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground min-w-[40px]">
                              {item.progress}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(item.watchedDuration)} watched of {formatTime(item.duration)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4">
                        {item.progress < 100 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => onContinueWatching(item.slug, item.progress)}
                          >
                            <Play className="h-3 w-3" />
                            Continue
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveItem(item.id)}
                          disabled={removeLoading}
                          aria-label="Remove from history"
                          title="Remove from history"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WatchHistoryList;