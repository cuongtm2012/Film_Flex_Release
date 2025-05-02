import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";

interface VideoPlayerProps {
  embedUrl: string;
  isLoading?: boolean;
  onError?: (error: Error) => void;
}

export default function VideoPlayer({ embedUrl, isLoading = false, onError }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  // Hide controls after inactivity
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timer);
      setShowControls(true);
      
      timer = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };
    
    document.addEventListener('mousemove', resetTimer);
    
    const container = playerContainerRef.current;
    if (container) {
      container.addEventListener('click', resetTimer);
    }
    
    resetTimer();
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousemove', resetTimer);
      if (container) {
        container.removeEventListener('click', resetTimer);
      }
    };
  }, [isPlaying]);
  
  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsPlayerLoaded(true);
    setIsPlaying(true);
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
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      playerContainerRef.current.requestFullscreen();
    }
  };
  
  if (isLoading) {
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
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
      className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6"
    >
      {/* Loading state */}
      {!isPlayerLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}
      
      {/* Main video iframe */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full border-0"
        allowFullScreen
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{ display: isPlayerLoaded ? 'block' : 'none' }}
      />
      
      {/* Control bar at the bottom - only captures clicks on the actual controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Gradient background for better visibility */}
        <div className="absolute inset-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
        
        {/* Controls container - these are the only elements that capture pointer events */}
        <div className="relative z-10">
          {/* Progress Bar */}
          <div className="w-full mb-4 cursor-pointer rounded-full overflow-hidden">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={(values) => setCurrentTime(values[0])}
              className="cursor-pointer"
            />
          </div>
          
          {/* Control buttons */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:text-primary transition"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:text-primary transition"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={(values) => {
                    setVolume(values[0]);
                    setIsMuted(values[0] === 0);
                  }}
                  className="w-20"
                />
              </div>
              
              <div className="text-white text-sm">
                <span>{formatTime(currentTime)}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-muted-foreground">{formatTime(duration)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="text-white hover:text-primary transition">
                <Settings className="h-5 w-5" />
              </button>
              <button 
                onClick={toggleFullscreen}
                className="text-white hover:text-primary transition"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
