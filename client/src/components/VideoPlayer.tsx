import React, { useState, useRef, useEffect } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface VideoPlayerProps {
  embedUrl: string;
  isLoading?: boolean;
  onError?: (error: Error) => void;
  autoFocus?: boolean;
}

export default function VideoPlayer({ embedUrl, isLoading = false, onError }: VideoPlayerProps) {
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [cleanSrc, setCleanSrc] = useState<string>("");
  const [directStreamUrl, setDirectStreamUrl] = useState<string>("");
  const [useDirectPlayer, setUseDirectPlayer] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const loadTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Extract clean src URL from the embedUrl
  useEffect(() => {
    if (!embedUrl) {
      setCleanSrc("");
      setDirectStreamUrl("");
      return;
    }
    
    // Check if the embedUrl is an iframe tag
    if (embedUrl.includes("<iframe")) {
      const srcMatch = embedUrl.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        setCleanSrc(srcMatch[1]);
        
        // Extract direct stream URL if possible
        const urlParam = srcMatch[1].match(/url=([^&]+)/);
        if (urlParam && urlParam[1]) {
          setDirectStreamUrl(decodeURIComponent(urlParam[1]));
        }
      } else {
        setCleanSrc(embedUrl);
      }
    } else {
      setCleanSrc(embedUrl);
      
      // Extract direct stream URL if possible
      const urlParam = embedUrl.match(/url=([^&]+)/);
      if (urlParam && urlParam[1]) {
        setDirectStreamUrl(decodeURIComponent(urlParam[1]));
      }
    }
  }, [embedUrl]);

  // Set up a timeout to detect if the player is taking too long to load
  useEffect(() => {
    if (cleanSrc && !isPlayerLoaded) {
      loadTimeout.current = setTimeout(() => {
        if (!isPlayerLoaded) {
          // Player taking too long, suggest direct stream
          toast({
            title: "Player loading slowly",
            description: "You can try the direct stream option below for faster playback.",
            duration: 10000,
          });
        }
      }, 10000);
    }
    
    return () => {
      if (loadTimeout.current) {
        clearTimeout(loadTimeout.current);
      }
    };
  }, [cleanSrc, isPlayerLoaded]);
  
  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsPlayerLoaded(true);
    if (loadTimeout.current) {
      clearTimeout(loadTimeout.current);
    }
  };
  
  // Handle iframe error
  const handleIframeError = () => {
    if (onError) {
      onError(new Error("Failed to load video player"));
    }
    
    toast({
      title: "Player error",
      description: "Could not load the embedded player. Try the direct stream option.",
      variant: "destructive",
      duration: 10000,
    });
    
    // Auto switch to direct player if available
    if (directStreamUrl) {
      setUseDirectPlayer(true);
    }
  };
  
  // Handle direct play
  const handleDirectPlay = () => {
    if (directStreamUrl) {
      // Open direct-player.html with URL parameter
      window.open(`/direct-player.html?stream=${encodeURIComponent(directStreamUrl)}`, '_blank');
      
      toast({
        title: "Direct stream opened",
        description: "If you have a compatible player extension, the stream should start playing.",
      });
    } else {
      toast({
        title: "No direct stream available",
        description: "Unable to extract direct stream URL from this source.",
        variant: "destructive"
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={playerContainerRef}
        className="relative aspect-video bg-black rounded-lg overflow-hidden"
      >
        {/* Loading state */}
        {!isPlayerLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        )}
        
        {/* Video iframe with native controls */}
        {cleanSrc && !useDirectPlayer && (
          <iframe
            ref={iframeRef}
            src={cleanSrc}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            loading="eager"
            importance="high"
          />
        )}
      </div>
      
      {/* Direct play button */}
      {directStreamUrl && (
        <div className="mt-2 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDirectPlay}
            className="flex items-center gap-1.5"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Direct Play (.m3u8)</span>
          </Button>
        </div>
      )}
    </div>
  );
}
