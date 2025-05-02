import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoPlayerProps {
  embedUrl: string;
  isLoading?: boolean;
  onError?: (error: Error) => void;
}

export default function VideoPlayer({ embedUrl, isLoading = false, onError }: VideoPlayerProps) {
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [cleanSrc, setCleanSrc] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  // Extract clean src URL from the embedUrl
  // This handles the case where the API returns a full iframe tag
  useEffect(() => {
    if (!embedUrl) {
      setCleanSrc("");
      return;
    }
    
    // Check if the embedUrl is an iframe tag
    if (embedUrl.includes("<iframe")) {
      const srcMatch = embedUrl.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        setCleanSrc(srcMatch[1]);
      } else {
        setCleanSrc(embedUrl);
      }
    } else {
      setCleanSrc(embedUrl);
    }
  }, [embedUrl]);
  
  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsPlayerLoaded(true);
  };
  
  // Handle iframe error
  const handleIframeError = () => {
    if (onError) {
      onError(new Error("Failed to load video player"));
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
      {cleanSrc && (
        <iframe
          ref={iframeRef}
          src={cleanSrc}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
}
