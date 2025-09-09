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
  preload?: "none" | "metadata" | "auto";
  poster?: string;
}

export default function VideoPlayer({ 
  embedUrl, 
  isLoading = false, 
  onError,
  preload = "metadata",
  poster
}: VideoPlayerProps) {
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [cleanSrc, setCleanSrc] = useState<string>("");
  const [directStreamUrl, setDirectStreamUrl] = useState<string>("");
  const [useDirectPlayer, setUseDirectPlayer] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<"slow" | "fast" | "unknown">("unknown");
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
    
    try {
      // Check if the embedUrl is an iframe tag
      if (embedUrl.includes("<iframe")) {
        const srcMatch = embedUrl.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) {
          setCleanSrc(srcMatch[1]);
          
          // Extract direct stream URL if possible
          const urlParam = srcMatch[1].match(/url=([^&]+)/);
          if (urlParam && urlParam[1]) {
            try {
              const decodedUrl = decodeURIComponent(urlParam[1]);
              setDirectStreamUrl(decodedUrl);
              console.log("Direct stream URL extracted:", decodedUrl);
            } catch (e) {
              console.error("Error decoding URL:", e);
              setDirectStreamUrl(urlParam[1]);
            }
          }
        } else {
          setCleanSrc(embedUrl);
        }
      } else {
        setCleanSrc(embedUrl);
        
        // Extract direct stream URL if possible
        const urlParam = embedUrl.match(/url=([^&]+)/);
        if (urlParam && urlParam[1]) {
          try {
            const decodedUrl = decodeURIComponent(urlParam[1]);
            setDirectStreamUrl(decodedUrl);
            console.log("Direct stream URL extracted:", decodedUrl);
          } catch (e) {
            console.error("Error decoding URL:", e);
            setDirectStreamUrl(urlParam[1]);
          }
        }
      }
    } catch (error) {
      console.error("Error processing embed URL:", error);
      
      // If we encountered an error, just use the raw URL
      setCleanSrc(embedUrl);
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
  
  // Detect connection quality for adaptive preloading
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const updateConnectionInfo = () => {
          const effectiveType = connection.effectiveType;
          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            setConnectionQuality("slow");
          } else if (effectiveType === '3g' || effectiveType === '4g') {
            setConnectionQuality("fast");
          }
        };
        
        updateConnectionInfo();
        connection.addEventListener('change', updateConnectionInfo);
        
        return () => connection.removeEventListener('change', updateConnectionInfo);
      }
    }
  }, []);
  
  // Adaptive preload strategy based on connection
  const getAdaptivePreload = () => {
    if (connectionQuality === "slow") return "none";
    if (connectionQuality === "fast") return "metadata";
    return preload;
  };
  
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
      try {
        // Open direct-player.html with URL parameter
        const directPlayerUrl = `/direct-player.html?stream=${encodeURIComponent(directStreamUrl)}`;
        console.log("Opening direct player with URL:", directPlayerUrl);
        window.open(directPlayerUrl, '_blank');
        
        toast({
          title: "Direct stream opened",
          description: "The stream should start playing in a new tab.",
        });
      } catch (error) {
        console.error("Error opening direct player:", error);
        
        toast({
          title: "Error opening direct player",
          description: "Could not open the direct player. Check console for details.",
          variant: "destructive"
        });
      }
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
            {poster && (
              <img 
                src={poster} 
                alt="Video poster" 
                className="absolute inset-0 w-full h-full object-cover opacity-30"
                loading="lazy"
              />
            )}
          </div>
        )}
        
        {/* Video iframe with adaptive loading */}
        {cleanSrc && !useDirectPlayer && (
          <iframe
            ref={iframeRef}
            src={cleanSrc}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            loading={connectionQuality === "slow" ? "lazy" : "eager"}
            // Add preconnect hint for faster loading
            {...(connectionQuality === "fast" && { 
              'data-preconnect': 'dns-prefetch' 
            })}
          />
        )}
      </div>
    </div>
  );
}
