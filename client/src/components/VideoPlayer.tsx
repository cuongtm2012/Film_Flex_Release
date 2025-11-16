import { useState, useRef, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/lib/logger";

interface VideoPlayerProps {
  embedUrl: string;
  isLoading?: boolean;
  onError?: (error: Error) => void;
}

export default function VideoPlayer({ 
  embedUrl,
  isLoading = false, 
  onError
}: VideoPlayerProps) {
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [cleanSrc, setCleanSrc] = useState<string>("");
  const [playerError, setPlayerError] = useState<string>("");
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (!embedUrl) {
      setCleanSrc("");
      return;
    }
    
    try {
      // Extract src from iframe tag if present, otherwise use direct URL
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
      
      setIsPlayerLoaded(false);
      setPlayerError("");
    } catch (error) {
      logger.error("Error processing embed URL:", error);
      setCleanSrc(embedUrl);
    }
  }, [embedUrl]);

  const handleIframeLoad = () => {
    setIsPlayerLoaded(true);
    logger.info("Video player loaded successfully");
  };

  const handleIframeError = () => {
    const errorMessage = "Failed to load video player";
    setPlayerError(errorMessage);
    logger.error("Video player failed to load");
    
    if (onError) {
      onError(new Error(errorMessage));
    }
  };

  if (isLoading || !cleanSrc) {
    return (
      <div className="relative aspect-video w-full bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        <span className="ml-3 text-zinc-400">Loading player...</span>
      </div>
    );
  }

  if (playerError) {
    return (
      <div className="relative aspect-video w-full bg-zinc-900 rounded-lg overflow-hidden">
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {playerError}. Please try another server.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-zinc-900 rounded-lg overflow-hidden">
      {!isPlayerLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={cleanSrc}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="eager"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  );
}
