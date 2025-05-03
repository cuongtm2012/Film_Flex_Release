import React, { useState, useRef, useEffect } from "react";
import { Loader2, Maximize, Minimize, Clock, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VideoPlayerProps {
  embedUrl: string;
  isLoading?: boolean;
  onError?: (error: Error) => void;
  duration?: string;
}

export default function VideoPlayer({ embedUrl, isLoading = false, onError, duration = "N/A" }: VideoPlayerProps) {
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [cleanSrc, setCleanSrc] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [isControlsVisible, setIsControlsVisible] = useState(true);
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
  
  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (isPlayerLoaded) {
      const timer = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isPlayerLoaded, currentTime]);
  
  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsPlayerLoaded(true);
    // Start simulating playback time for demo purposes
    // In a real player, this would come from the video element's timeupdate event
    startFakeTimeUpdate();
  };
  
  // Simulate time updates for demo purposes
  const startFakeTimeUpdate = () => {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds += 1;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setCurrentTime(
        `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
      );
    }, 1000);
    
    // Clear interval on component unmount
    return () => clearInterval(interval);
  };
  
  // Handle iframe error
  const handleIframeError = () => {
    if (onError) {
      onError(new Error("Failed to load video player"));
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
    
    setIsFullscreen(!isFullscreen);
  };
  
  // Enter picture-in-picture mode
  const enterPictureInPicture = async () => {
    if (!iframeRef.current) return;
    
    try {
      // Note: PiP might not work directly with iframes due to cross-origin restrictions
      // This is a placeholder for the functionality
      // In a real implementation, we would need to use the native video element
      alert("Picture-in-Picture mode is not supported with embedded players due to security restrictions.");
    } catch (error) {
      console.error("Failed to enter picture-in-picture mode:", error);
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
      className="relative aspect-video bg-black rounded-lg overflow-hidden group"
      onMouseMove={() => setIsControlsVisible(true)}
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
      
      {/* Custom controls overlay - visible on hover or when controls are active */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300 ${
          isControlsVisible || !isPlayerLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Time display */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2 text-white">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {currentTime} / {duration}
            </span>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:bg-white/20"
                    onClick={enterPictureInPicture}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Picture-in-Picture</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Progress bar (dummy for illustration) */}
        <div className="w-full h-1 bg-gray-600 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${isPlayerLoaded ? '30%' : '0%'}` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
