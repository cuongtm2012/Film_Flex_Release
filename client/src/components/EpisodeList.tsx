import React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { EpisodeServer } from "@shared/schema";

interface EpisodeListProps {
  episodes: { name: string; slug: string; filename: string }[];
  activeEpisode: string;
  onSelectEpisode: (episodeSlug: string) => void;
  isLoading?: boolean;
}

export default function EpisodeList({
  episodes,
  activeEpisode,
  onSelectEpisode,
  isLoading = false,
}: EpisodeListProps) {
  if (isLoading) {
    return (
      <div className="mb-6">
        <h4 className="text-lg font-bold mb-3">Episodes</h4>
        <ScrollArea className="w-full">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  if (!episodes || episodes.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h4 className="text-lg font-bold mb-3">Episodes</h4>
      <ScrollArea className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {episodes.map((episode, index) => {
            // Extract episode name or number for display
            const episodeName = episode.name;
            // Check if name contains text like "Tập 1", extract "1"
            let episodeNumber = index + 1;
            const episodeNumberMatch = episodeName.match(/\d+/);
            if (episodeNumberMatch) {
              episodeNumber = parseInt(episodeNumberMatch[0]);
            }
            
            return (
              <Button
                key={episode.slug}
                variant={activeEpisode === episode.slug ? "default" : "outline"}
                className={`p-3 rounded text-center transition ${
                  activeEpisode === episode.slug ? "bg-primary hover:bg-primary/90" : "bg-muted hover:bg-primary/80"
                }`}
                onClick={() => onSelectEpisode(episode.slug)}
              >
                <span className="block font-medium">Ep {episodeNumber}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {episode.filename?.substring(0, 10) || episodeName}
                </span>
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
