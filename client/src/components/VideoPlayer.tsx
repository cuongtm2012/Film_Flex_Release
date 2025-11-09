import { useState, useRef, useEffect } from "react";
import { Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import videojs from "video.js";
import "video.js/dist/video-js.css";

interface VideoPlayerProps {
  embedUrl: string;
  hlsUrl?: string; // m3u8 URL for fallback
  isLoading?: boolean;
  onError?: (error: Error) => void;
  autoFocus?: boolean;
  preload?: "none" | "metadata" | "auto";
  poster?: string;
}

export default function VideoPlayer({ 
  embedUrl,
  hlsUrl,
  isLoading = false, 
  onError,
  preload = "metadata",
  poster
}: VideoPlayerProps) {
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [cleanSrc, setCleanSrc] = useState<string>("");
  const [useHlsPlayer, setUseHlsPlayer] = useState(false);
  const [playerError, setPlayerError] = useState<string>("");
  const [iframeLoadAttempts, setIframeLoadAttempts] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<"slow" | "fast" | "unknown">("unknown");
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const loadTimeout = useRef<NodeJS.Timeout | null>(null);
  const iframeCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Extract clean src URL from the embedUrl
  useEffect(() => {
    if (!embedUrl) {
      setCleanSrc("");
      return;
    }
    
    try {
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

      // Auto-detect problematic sources and prefer HLS
      const isOpstream = embedUrl.includes('opstream');
      if (isOpstream && hlsUrl && !useHlsPlayer) {
        logger.info('Detected Opstream source, will prefer HLS fallback');
      }
    } catch (error) {
      logger.error("Error processing embed URL:", error);
      setCleanSrc(embedUrl);
    }
  }, [embedUrl, hlsUrl, useHlsPlayer]);

  // Initialize Video.js player for HLS
  useEffect(() => {
    if (!useHlsPlayer || !hlsUrl || !videoRef.current) return;

    // Initialize player
    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: getAdaptivePreload(),
      fluid: true,
      responsive: true,
      poster: poster,
      html5: {
        vhs: {
          overrideNative: true
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false
      }
    });

    playerRef.current = player;

    // Set HLS source
    player.src({
      src: hlsUrl,
      type: 'application/x-mpegURL'
    });

    player.on('ready', () => {
      logger.info('HLS player ready');
      setIsPlayerLoaded(true);
    });

    player.on('error', () => {
      const error = player.error();
      logger.error('HLS player error:', error);
      setPlayerError(`HLS playback error: ${error?.message || 'Unknown error'}`);
      
      if (onError) {
        onError(new Error(error?.message || 'HLS playback failed'));
      }
    });

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [useHlsPlayer, hlsUrl, poster, onError]);

  // Check iframe health and fallback to HLS if needed
  useEffect(() => {
    if (!cleanSrc || useHlsPlayer) return;

    let attempts = 0;
    const maxAttempts = 2; // Reduced for faster fallback

    // Immediately switch to HLS if we know iframe might fail
    // Check if URL is from known problematic sources
    const isProbablyDown = cleanSrc.includes('opstream90.com');
    
    if (isProbablyDown && hlsUrl) {
      // Try iframe first but with shorter timeout
      loadTimeout.current = setTimeout(() => {
        if (!isPlayerLoaded) {
          logger.warn('Iframe not loaded, switching to HLS fallback');
          toast({
            title: "Using HLS player",
            description: "Loading alternative video format for better compatibility.",
          });
          setUseHlsPlayer(true);
        }
      }, 3000); // Reduced from 8s to 3s
    } else {
      // Standard timeout for other sources
      loadTimeout.current = setTimeout(() => {
        if (!isPlayerLoaded && hlsUrl) {
          logger.warn('Iframe taking too long to load, trying HLS fallback');
          toast({
            title: "Switching to HLS player",
            description: "Iframe player not responding, using alternative player.",
          });
          setUseHlsPlayer(true);
        }
      }, 8000);
    }

    // Periodic check for iframe errors
    iframeCheckInterval.current = setInterval(() => {
      attempts++;
      
      if (attempts >= maxAttempts && !isPlayerLoaded && hlsUrl) {
        logger.warn('Iframe failed to load after multiple checks, switching to HLS');
        clearInterval(iframeCheckInterval.current!);
        setUseHlsPlayer(true);
      }
    }, 2000); // Reduced from 3s to 2s

    return () => {
      if (loadTimeout.current) {
        clearTimeout(loadTimeout.current);
      }
      if (iframeCheckInterval.current) {
        clearInterval(iframeCheckInterval.current);
      }
    };
  }, [cleanSrc, isPlayerLoaded, hlsUrl, useHlsPlayer]);
  
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
    setPlayerError("");
    if (loadTimeout.current) {
      clearTimeout(loadTimeout.current);
    }
    if (iframeCheckInterval.current) {
      clearInterval(iframeCheckInterval.current);
    }
  };
  
  // Handle iframe error - fallback to HLS
  const handleIframeError = () => {
    logger.error('Iframe failed to load');
    setIframeLoadAttempts(prev => prev + 1);
    
    if (hlsUrl && iframeLoadAttempts < 2) {
      // Try HLS fallback
      toast({
        title: "Switching to HLS player",
        description: "Iframe player failed, trying alternative format.",
      });
      setUseHlsPlayer(true);
    } else if (!hlsUrl) {
      setPlayerError("Video player failed to load and no alternative source available.");
      
      if (onError) {
        onError(new Error("Failed to load video player"));
      }
      
      toast({
        title: "Player error",
        description: "Could not load the video player.",
        variant: "destructive",
      });
    }
  };
  
  // Manual switch to HLS
  const handleSwitchToHLS = () => {
    if (hlsUrl) {
      logger.info('Manually switching to HLS player');
      setUseHlsPlayer(true);
      setIsPlayerLoaded(false);
    } else {
      toast({
        title: "No HLS source available",
        description: "This video doesn't have an alternative streaming format.",
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
        {!isPlayerLoaded && !playerError && !useHlsPlayer && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground mb-2">Loading video player...</p>
            {hlsUrl && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSwitchToHLS}
                className="text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Try HLS Player Instead
              </Button>
            )}
            {poster && (
              <img 
                src={poster} 
                alt="Video poster" 
                className="absolute inset-0 w-full h-full object-cover opacity-30 -z-10"
                loading="lazy"
              />
            )}
          </div>
        )}

        {/* Error state */}
        {playerError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10 p-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{playerError}</AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Iframe player (default) */}
        {cleanSrc && !useHlsPlayer && (
          <iframe
            ref={iframeRef}
            src={cleanSrc}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            loading={connectionQuality === "slow" ? "lazy" : "eager"}
          />
        )}

        {/* HLS player (fallback) */}
        {useHlsPlayer && hlsUrl && (
          <div data-vjs-player className="w-full h-full">
            <video
              ref={videoRef}
              className="video-js vjs-big-play-centered vjs-16-9"
              playsInline
            />
          </div>
        )}
      </div>

      {/* Player controls */}
      {hlsUrl && !useHlsPlayer && isPlayerLoaded && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwitchToHLS}
            className="text-xs"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Switch to HLS Player
          </Button>
        </div>
      )}

      {useHlsPlayer && (
        <div className="mt-2 flex justify-center">
          <p className="text-xs text-muted-foreground">
            Using HLS player (alternative format)
          </p>
        </div>
      )}
    </div>
  );
}
