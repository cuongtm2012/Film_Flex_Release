import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EpisodeServer } from "@shared/schema";

interface ServerTabsProps {
  servers: EpisodeServer[];
  onServerSelect: (serverName: string) => void;
  isLoading?: boolean;
}

export default function ServerTabs({ servers, onServerSelect, isLoading = false }: ServerTabsProps) {
  const [activeServer, setActiveServer] = useState<string>(servers[0]?.server_name || "");
  
  const handleServerChange = (value: string) => {
    setActiveServer(value);
    onServerSelect(value);
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="border-b border-muted-foreground/30">
          <ScrollArea className="w-full">
            <div className="flex pb-px">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 w-40 bg-gray-700 rounded animate-pulse mx-1"></div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="mb-6 text-center py-4 border-b border-muted-foreground/30">
        <p className="text-muted-foreground">No servers available</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <Tabs defaultValue={activeServer} onValueChange={handleServerChange}>
        <div className="border-b border-muted-foreground/30">
          <ScrollArea className="w-full">
            <TabsList className="h-auto p-0 bg-transparent">
              {servers.map((server) => (
                <TabsTrigger
                  key={server.server_name}
                  value={server.server_name}
                  className="px-6 py-3 text-white data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-white data-[state=inactive]:text-muted-foreground"
                >
                  {server.server_name}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}
