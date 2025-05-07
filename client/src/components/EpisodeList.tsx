import React, { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
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
  const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(false);
  
  const getSeasonGroups = () => {
    // Simple logic to group episodes by season if possible
    const seasonPattern = /s(\d+)|season\s*(\d+)/i;
    const groups: Record<string, typeof episodes> = {};
    
    episodes.forEach(episode => {
      // Try to extract season info from filename or name
      const match = episode.filename?.match(seasonPattern) || episode.name.match(seasonPattern);
      const season = match ? `Season ${parseInt(match[1] || match[2])}` : 'Season 1';
      
      if (!groups[season]) {
        groups[season] = [];
      }
      groups[season].push(episode);
    });
    
    // If only one season was detected, don't bother with grouping
    if (Object.keys(groups).length <= 1) {
      return null;
    }
    
    return groups;
  };
  
  const seasonGroups = getSeasonGroups();
  
  if (isLoading) {
    return (
      <div className="mb-6">
        <h4 className="text-lg font-bold mb-3">Episodes</h4>
        <ScrollArea className="w-full">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
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
  
  // For a large number of episodes, show collapsed by default on mobile
  const shouldCollapse = episodes.length > 12;
  
  // If we have season groups, show them as collapsible sections
  if (seasonGroups) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-bold">Episodes</h4>
          <span className="text-sm text-muted-foreground">{episodes.length} episodes</span>
        </div>
        
        <div className="space-y-4">
          {Object.entries(seasonGroups).map(([season, seasonEpisodes]) => (
            <Collapsible key={season} defaultOpen={true}>
              <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
                <h5 className="font-medium">{season}</h5>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent>
                <ScrollArea className="w-full pb-2">
                  <div className="flex flex-nowrap gap-2">
                    {seasonEpisodes.map((episode, index) => {
                      // Extract episode name or number for display
                      const episodeName = episode.name;
                      let episodeNumber = index + 1;
                      const episodeNumberMatch = episodeName.match(/\d+/);
                      if (episodeNumberMatch) {
                        episodeNumber = parseInt(episodeNumberMatch[0]);
                      }
                      
                      return (
                        <Button
                          key={episode.slug}
                          variant={activeEpisode === episode.slug ? "default" : "outline"}
                          className={`min-w-[3.5rem] md:min-w-[5rem] p-3 rounded text-center transition flex-shrink-0 touch-manipulation ${
                            activeEpisode === episode.slug ? "bg-primary hover:bg-primary/90" : "bg-muted hover:bg-primary/80"
                          }`}
                          onClick={() => onSelectEpisode(episode.slug)}
                        >
                          <span className="block font-medium">{episodeNumber}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    );
  }
  
  // For regular episode lists (no seasons), show a horizontal scrollable list
  return (
    <div className="mb-6">
      <Collapsible 
        defaultOpen={!shouldCollapse}
        className="w-full"
        onOpenChange={setIsEpisodesExpanded}
      >
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-bold">Episodes</h4>
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground mr-2">{episodes.length} episodes</span>
            {shouldCollapse && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isEpisodesExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>
        
        <CollapsibleContent className="w-full">
          <ScrollArea className="w-full">
            <div className="flex flex-nowrap gap-2 pb-2 md:grid md:grid-cols-10 md:flex-wrap">
              {episodes.map((episode, index) => {
                // Extract episode name or number for display
                const episodeName = episode.name;
                let episodeNumber = index + 1;
                const episodeNumberMatch = episodeName.match(/\d+/);
                if (episodeNumberMatch) {
                  episodeNumber = parseInt(episodeNumberMatch[0]);
                }
                
                return (
                  <Button
                    key={episode.slug}
                    variant={activeEpisode === episode.slug ? "default" : "outline"}
                    className={`min-w-[3.5rem] md:min-w-0 p-3 rounded text-center transition flex-shrink-0 touch-manipulation ${
                      activeEpisode === episode.slug ? "bg-primary hover:bg-primary/90" : "bg-muted hover:bg-primary/80"
                    }`}
                    onClick={() => onSelectEpisode(episode.slug)}
                  >
                    <span className="block font-medium">{episodeNumber}</span>
                  </Button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="md:hidden" />
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
