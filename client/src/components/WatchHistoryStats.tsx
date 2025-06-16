import React from "react";
import { Clock, Film, BarChart4 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WatchHistoryStatsProps {
  totalWatchTime: number;
  totalItems: number;
  completedItems: number;
  isLoading?: boolean;
}

const WatchHistoryStats: React.FC<WatchHistoryStatsProps> = ({
  totalWatchTime,
  totalItems,
  completedItems,
  isLoading = false,
}) => {
  // Format minutes to hours and minutes
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-6 flex flex-col items-center justify-center">
            <Skeleton className="w-16 h-16 rounded-full mb-4" />
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-4 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
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
        <h3 className="text-2xl font-bold mb-1">{totalItems}</h3>
        <p className="text-muted-foreground">Items Watched</p>
      </Card>
      
      <Card className="p-6 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <BarChart4 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-1">{completedItems}</h3>
        <p className="text-muted-foreground">Completed</p>
      </Card>
    </div>
  );
};

export default WatchHistoryStats;