import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Loader2, AlertCircle, Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, Settings, PictureInPicture,
  Repeat, Subtitles, AudioLines, Gauge, SkipForward, SkipBack
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { logger } from "@/lib/logger";

interface HLSVideoPlayerProps {
  m3u8Url: string;
  isLoading?: boolean;
  onError?: (error: Error) => void;
  autoplay?: boolean;
  loop?: boolean;
  subtitles?: SubtitleTrack[];
  audioTracks?: AudioTrack[];
}

interface SubtitleTrack {
  label: string;
  src: string;
  srclang: string;
  kind?: string;
}

interface AudioTrack {
  label: string;
  lang: string;
}

export default function HLSVideoPlayer({
  m3u8Url,
  isLoading = false,
  onError,
  autoplay = false,
  loop = false,
  subtitles = [],
  audioTracks = []
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [playerError, setPlayerError] = useState<string>("");
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [qualities, setQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoopEnabled, setIsLoopEnabled] = useState(loop);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(0);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [previewPosition, setPreviewPosition] = useState<number>(0);
  const [currentBitrate, setCurrentBitrate] = useState<number>(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize HLS player
  useEffect(() => {
    if (!m3u8Url || !videoRef.current) return;

    const video = videoRef.current;

    // CRITICAL: Reset all states for fresh initialization
    logger.info("Initializing HLS player for URL:", m3u8Url);
    setIsPlayerReady(false);
    setIsPlaying(false);
    setIsBuffering(true);
    setDuration(0);
    setCurrentTime(0);
    setPlayerError("");

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
      });

      hlsRef.current = hls;

      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        logger.info("HLS manifest parsed", {
          levels: data.levels.length,
          duration: video.duration
        });
        // Don't set isPlayerReady yet - wait for loadedmetadata

        // Extract quality levels
        const qualityLevels = data.levels.map((level) =>
          `${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`
        );
        setQualities(qualityLevels);
        setCurrentQuality(hls.currentLevel);

        // Don't autoplay yet - wait for video to be ready
      });

      // CRITICAL: Track when first fragment is loaded (duration should be available)
      hls.on(Hls.Events.FRAG_LOADED, (_event, _data) => {
        const videoDuration = video.duration;
        const videoReady = video.readyState;

        logger.info("Fragment loaded - video state:", {
          duration: videoDuration,
          readyState: videoReady,
          currentPlayerReady: isPlayerReady
        });

        if (videoDuration && !isNaN(videoDuration) && isFinite(videoDuration)) {
          setDuration(videoDuration);

          // Mark player as ready when we have valid duration and metadata
          if (videoReady >= 1) {
            logger.info("Setting player ready - first fragment loaded with metadata");
            setIsPlayerReady(true);
            setIsBuffering(false);

            // Try autoplay now if enabled
            if (autoplay) {
              setTimeout(() => {
                video.play().catch(err => {
                  logger.warn("Autoplay failed:", err);
                });
              }, 100);
            }
          }
        }
      });

      // Track buffer updates
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (video.duration && video.duration !== duration && !isNaN(video.duration)) {
          setDuration(video.duration);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentQuality(data.level);
        if (data.level >= 0 && hls.levels[data.level]) {
          setCurrentBitrate(hls.levels[data.level].bitrate);
        }

        // Recheck duration after level switch
        if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
          setDuration(video.duration);
        }
      }); hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              logger.error("Fatal network error", data);
              setPlayerError("Network error. Please check your connection.");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              logger.error("Fatal media error", data);
              setPlayerError("Media error. Trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              logger.error("Fatal error", data);
              setPlayerError("Cannot load video. Please try another server.");
              hls.destroy();
              break;
          }

          if (onError) {
            onError(new Error(data.type));
          }
        }
      });

      return () => {
        logger.info("Cleaning up HLS player");
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        // Reset states
        setIsPlayerReady(false);
        setIsPlaying(false);
        setIsBuffering(false);
      };
    }
    // Native HLS support (Safari)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = m3u8Url;

      const handleLoadedMetadata = () => {
        logger.info("Native HLS - metadata loaded");
        setIsPlayerReady(true);
        setIsBuffering(false);
        if (autoplay) {
          video.play().catch(err => logger.warn("Autoplay failed:", err));
        }
      };

      const handleError = () => {
        logger.error("Native HLS error");
        setPlayerError("Cannot load video. Please try another server.");
        if (onError) {
          onError(new Error("Video load error"));
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
      };
    } else {
      setPlayerError("Your browser does not support HLS playback.");
    }
  }, [m3u8Url, autoplay, onError]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // CRITICAL: Only update timeline when video has enough data to play
      if (video.readyState < 3) { // HAVE_FUTURE_DATA = 3
        logger.warn("Timeline update skipped - readyState too low:", video.readyState);
        return;
      }

      const newTime = video.currentTime;
      const newDuration = video.duration;

      // Force update even if value seems same (React batching issue)
      setCurrentTime(newTime);

      // Update duration if it changed
      if (newDuration && newDuration !== duration && !isNaN(newDuration) && isFinite(newDuration)) {
        setDuration(newDuration);
        logger.info("Duration updated via timeupdate:", newDuration);
      }

      // Update buffered
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered(bufferedEnd);
      }

      // Debug log every 5 seconds to verify timeline is updating
      if (Math.floor(newTime) % 5 === 0 && Math.floor(newTime) !== Math.floor(currentTime)) {
        logger.info("Timeline update:", {
          currentTime: newTime.toFixed(2),
          duration: newDuration?.toFixed(2),
          progress: ((newTime / newDuration) * 100).toFixed(1) + '%',
          readyState: video.readyState
        });
      }
    };

    const handleDurationChange = () => {
      const newDuration = video.duration;
      if (newDuration && !isNaN(newDuration) && isFinite(newDuration)) {
        setDuration(newDuration);
        logger.info("Duration changed event:", newDuration);
      }
    };

    // CRITICAL: 'play' event fires when play() is called, but video might not be playing yet
    const handlePlay = () => {
      logger.info("Play event fired - video.paused:", video.paused, "readyState:", video.readyState);
      setIsPlaying(true);
      setIsBuffering(false);
    };

    // CRITICAL: 'playing' event fires when video actually starts playing (after buffering)
    const handlePlaying = () => {
      logger.info("Playing event fired - video is actually playing now");
      setIsPlaying(true);
      setIsBuffering(false);
      setIsSeeking(false);
    };

    const handlePause = () => {
      logger.warn("Pause event fired - Stack trace:", new Error().stack);
      logger.info("Video state on pause:", {
        paused: video.paused,
        currentTime: video.currentTime,
        readyState: video.readyState
      });
      setIsPlaying(false);
    };

    // Video is buffering/loading
    const handleWaiting = () => {
      logger.info("Waiting event fired - video is buffering");
      setIsBuffering(true);
    };

    // Video can start playing
    const handleCanPlay = () => {
      logger.info("CanPlay event fired - readyState:", video.readyState);
      setIsBuffering(false);
    };

    // Video has enough data to play through
    const handleCanPlayThrough = () => {
      logger.info("CanPlayThrough event fired");
      setIsBuffering(false);
    };

    // Seeking started
    const handleSeeking = () => {
      logger.info("Seeking event fired");
      setIsSeeking(true);
      setIsBuffering(true);
    };

    // Seeking completed
    const handleSeeked = () => {
      logger.info("Seeked event fired");
      setIsSeeking(false);
      setIsBuffering(false);
    };

    // Video stalled (network issues)
    const handleStalled = () => {
      logger.warn("Stalled event fired - network issues");
      setIsBuffering(true);
    };

    // Video suspended (browser stopped fetching)
    const handleSuspended = () => {
      logger.info("Suspended event fired");
    };

    // Loading started
    const handleLoadStart = () => {
      logger.info("LoadStart event fired");
      setIsBuffering(true);
    };

    // Metadata loaded - CRITICAL for timeline initialization
    const handleLoadedMetadata = () => {
      const metadataDuration = video.duration;
      logger.info("LoadedMetadata event fired - duration:", metadataDuration);

      // Set duration immediately when metadata is available
      if (metadataDuration && !isNaN(metadataDuration) && isFinite(metadataDuration)) {
        setDuration(metadataDuration);
        logger.info("Duration set from metadata:", metadataDuration);
      }
    };

    // Data loaded
    const handleLoadedData = () => {
      logger.info("LoadedData event fired - readyState:", video.readyState);
      setIsBuffering(false);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleEnded = () => {
      logger.info("Ended event fired");
      if (isLoopEnabled) {
        video.currentTime = 0;
        video.play();
      } else {
        setIsPlaying(false);
      }
    };

    // Error handling
    const handleError = () => {
      logger.error("Video error event fired:", video.error);
      setIsPlaying(false);
      setIsBuffering(false);
    };

    // Add all event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('suspended', handleSuspended);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Set loop attribute
    video.loop = isLoopEnabled;

    // Log initial state
    logger.info("Video element state:", {
      paused: video.paused,
      readyState: video.readyState,
      duration: video.duration,
      currentTime: video.currentTime
    });

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('suspended', handleSuspended);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [isLoopEnabled]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // PiP event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      // Prevent default for space and arrow keys when video is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      if (isInputFocused) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          skipBackward();
          break;
        case 'arrowright':
          e.preventDefault();
          skipForward();
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange([Math.min(volume + 0.1, 1)]);
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange([Math.max(volume - 0.1, 0)]);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          if (document.pictureInPictureEnabled) {
            togglePiP();
          }
          break;
        case 'l':
          e.preventDefault();
          toggleLoop();
          break;
        case 'c':
          e.preventDefault();
          if (subtitles.length > 0) {
            const nextSubtitle = currentSubtitle + 1;
            changeSubtitle(nextSubtitle >= subtitles.length ? -1 : nextSubtitle);
          }
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(!showKeyboardHelp);
          break;
        case '>':
          e.preventDefault();
          changePlaybackRate(Math.min(playbackRate + 0.25, 2));
          break;
        case '<':
          e.preventDefault();
          changePlaybackRate(Math.max(playbackRate - 0.25, 0.25));
          break;
        default:
          // Number keys for seeking
          if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const percent = parseInt(e.key) / 10;
            videoRef.current.currentTime = duration * percent;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, volume, currentSubtitle, subtitles.length, duration, playbackRate, showKeyboardHelp]);

  // Auto-hide controls
  const resetControlsTimeout = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Player controls
  const togglePlay = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    try {
      if (video.paused) {
        logger.info("Attempting to play video - current state:", {
          paused: video.paused,
          readyState: video.readyState,
          networkState: video.networkState,
          duration: video.duration,
          currentTime: video.currentTime
        });

        // Show buffering indicator if not ready, but don't block play
        if (video.readyState < 2) { // HAVE_CURRENT_DATA
          logger.warn("Video not fully ready, readyState:", video.readyState);
          setIsBuffering(true);
        }

        // Force hide play button immediately on user click
        setIsPlaying(true);
        setIsBuffering(false);

        const playPromise = video.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              logger.info("Play promise resolved - video state:", {
                paused: video.paused,
                currentTime: video.currentTime,
                readyState: video.readyState
              });
              // Redundantly set again to ensure state is correct
              setIsPlaying(true);
              setIsBuffering(false);
            })
            .catch(error => {
              logger.error("Play promise rejected:", error);
              setIsPlaying(false);
              setIsBuffering(false);

              // Common autoplay restriction error
              if (error.name === 'NotAllowedError') {
                logger.warn("Autoplay blocked by browser - user interaction required");
              }
            });
        }
      } else {
        logger.info("Pausing video");
        video.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      logger.error("Toggle play error:", error);
      setIsPlaying(false);
      setIsBuffering(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0];
      if (value[0] > 0 && isMuted) {
        videoRef.current.muted = false;
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return;

    const video = videoRef.current;

    // CRITICAL: Only allow seeking when video has metadata
    if (video.readyState < 1) { // HAVE_METADATA
      logger.warn("Cannot seek - video metadata not loaded yet");
      return;
    }

    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const seekTime = pos * duration;

    logger.info("Seeking to:", {
      position: (pos * 100).toFixed(1) + '%',
      time: seekTime.toFixed(2),
      duration: duration.toFixed(2)
    });

    video.currentTime = seekTime;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;

    try {
      if (isPiPActive) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      logger.error("PiP error:", error);
    }
  };

  const toggleLoop = () => {
    setIsLoopEnabled(!isLoopEnabled);
    if (videoRef.current) {
      videoRef.current.loop = !isLoopEnabled;
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.currentTime + 10,
        duration
      );
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        videoRef.current.currentTime - 10,
        0
      );
    }
  };

  const changeSubtitle = (index: number) => {
    if (!videoRef.current) return;

    const tracks = videoRef.current.textTracks;

    // Disable all tracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = 'hidden';
    }

    // Enable selected track
    if (index >= 0 && index < tracks.length) {
      tracks[index].mode = 'showing';
      setCurrentSubtitle(index);
    } else {
      setCurrentSubtitle(-1);
    }

    setShowSubtitlesMenu(false);
  };

  const changeAudioTrack = (index: number) => {
    if (hlsRef.current && hlsRef.current.audioTracks.length > 0) {
      hlsRef.current.audioTrack = index;
      setCurrentAudioTrack(index);
      setShowAudioMenu(false);
    }
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;

    setPreviewTime(time);
    setPreviewPosition(e.clientX - rect.left);
  };

  const handleProgressLeave = () => {
    setPreviewTime(null);
  };

  const changeQuality = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
    }
  };

  if (isLoading || !m3u8Url) {
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
            {playerError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercentage = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full bg-black rounded-lg overflow-hidden group"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        onClick={togglePlay}
        playsInline
        autoPlay={autoplay}
        muted={autoplay} // Muted for autoplay to work in most browsers
      >
        {/* Subtitles */}
        {subtitles.map((subtitle, index) => (
          <track
            key={index}
            kind={subtitle.kind || "subtitles"}
            src={subtitle.src}
            srcLang={subtitle.srclang}
            label={subtitle.label}
            default={index === 0}
          />
        ))}
      </video>

      {/* Loading/Buffering overlay */}
      {(isBuffering || !isPlayerReady) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          <span className="ml-3 text-white text-sm">
            {!isPlayerReady ? 'Loading player...' : isSeeking ? 'Seeking...' : 'Buffering...'}
          </span>
        </div>
      )}

      {/* Play overlay when paused - CRITICAL: Only show when truly paused and not buffering */}
      {!isPlaying && isPlayerReady && !isBuffering && !isSeeking && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10 animate-fadeIn"
          onClick={(e) => {
            e.stopPropagation();
            logger.info("Play button clicked - States:", { isPlaying, isPlayerReady, isBuffering, isSeeking });
            togglePlay();
          }}
        >
          <div className="w-20 h-20 rounded-full bg-red-500/90 hover:bg-red-600 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg shadow-red-500/50">
            <Play className="h-10 w-10 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Loop indicator (top right) */}
      {isLoopEnabled && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
          <Repeat className="h-4 w-4 text-blue-400" />
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {showKeyboardHelp && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-bold">Keyboard Shortcuts</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKeyboardHelp(false)}
                className="text-white hover:bg-white/20"
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-400 mb-2">Playback</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Space / K</span>
                  <span>Play/Pause</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">← →</span>
                  <span>Seek -10s / +10s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">0-9</span>
                  <span>Seek to 0%-90%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">&lt; &gt;</span>
                  <span>Speed -/+</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">L</span>
                  <span>Toggle Loop</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-blue-400 mb-2">Audio & Display</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">↑ ↓</span>
                  <span>Volume Up/Down</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">M</span>
                  <span>Mute/Unmute</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">F</span>
                  <span>Fullscreen</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">P</span>
                  <span>Picture-in-Picture</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">C</span>
                  <span>Cycle Subtitles</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-700 text-center">
              <span className="text-zinc-400 text-sm">Press <kbd className="px-2 py-1 bg-zinc-800 rounded">?</kbd> to toggle this help</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
      >
        {/* Progress bar with preview */}
        <div className="relative mb-3">
          {/* Preview tooltip */}
          {previewTime !== null && (
            <div
              className="absolute bottom-full mb-2 bg-black/90 text-white px-2 py-1 rounded text-sm pointer-events-none"
              style={{ left: `${previewPosition}px`, transform: 'translateX(-50%)' }}
            >
              {formatTime(previewTime)}
            </div>
          )}

          <div
            ref={progressBarRef}
            className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/progress hover:h-2 transition-all"
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={handleProgressLeave}
          >
            {/* Buffered */}
            <div
              className="absolute h-1.5 group-hover/progress:h-2 bg-white/30 rounded-full transition-all"
              style={{ width: `${bufferedPercentage}%` }}
            />
            {/* Progress */}
            <div
              className="relative h-1.5 group-hover/progress:h-2 bg-blue-500 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            {/* Skip Backward - Hidden on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex h-8 w-8 text-white hover:bg-white/20"
              onClick={skipBackward}
              title="Rewind 10s"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            {/* Skip Forward - Hidden on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex h-8 w-8 text-white hover:bg-white/20"
              onClick={skipForward}
              title="Forward 10s"
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 group/volume">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>

              <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>
            </div>

            <span className="text-white text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback speed - Hidden on mobile */}
            <div className="relative group/speed hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white hover:bg-white/20 text-xs font-medium"
              >
                {playbackRate}x
              </Button>

              <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-md p-2 min-w-[100px] opacity-0 invisible group-hover/speed:opacity-100 group-hover/speed:visible transition-all">
                <div className="text-white text-xs font-semibold mb-2 px-2">Speed</div>
                <div className="space-y-1">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                    <button
                      key={rate}
                      className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors ${playbackRate === rate ? 'bg-blue-500 text-white' : 'text-white/80'
                        }`}
                      onClick={() => changePlaybackRate(rate)}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtitles - Hidden on mobile */}
            {subtitles.length > 0 && (
              <div className="relative group/subtitles hidden sm:block">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 text-white hover:bg-white/20 ${currentSubtitle >= 0 ? 'bg-white/20' : ''}`}
                  onClick={() => setShowSubtitlesMenu(!showSubtitlesMenu)}
                >
                  <Subtitles className="h-5 w-5" />
                </Button>

                {showSubtitlesMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-md p-2 min-w-[150px]">
                    <div className="text-white text-xs font-semibold mb-2 px-2">Subtitles</div>
                    <div className="space-y-1">
                      <button
                        className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors ${currentSubtitle === -1 ? 'bg-blue-500 text-white' : 'text-white/80'
                          }`}
                        onClick={() => changeSubtitle(-1)}
                      >
                        Off
                      </button>
                      {subtitles.map((subtitle, index) => (
                        <button
                          key={index}
                          className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors ${currentSubtitle === index ? 'bg-blue-500 text-white' : 'text-white/80'
                            }`}
                          onClick={() => changeSubtitle(index)}
                        >
                          {subtitle.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio tracks - Hidden on mobile */}
            {hlsRef.current?.audioTracks && hlsRef.current.audioTracks.length > 1 && (
              <div className="relative group/audio hidden sm:block">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setShowAudioMenu(!showAudioMenu)}
                >
                  <AudioLines className="h-5 w-5" />
                </Button>

                {showAudioMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-md p-2 min-w-[150px]">
                    <div className="text-white text-xs font-semibold mb-2 px-2">Audio</div>
                    <div className="space-y-1">
                      {Array.from(hlsRef.current.audioTracks).map((track, index) => (
                        <button
                          key={index}
                          className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors ${currentAudioTrack === index ? 'bg-blue-500 text-white' : 'text-white/80'
                            }`}
                          onClick={() => changeAudioTrack(index)}
                        >
                          {track.name || `Audio ${index + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quality - Hidden on mobile */}
            {qualities.length > 1 && (
              <div className="relative group/quality hidden sm:block">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                >
                  <Settings className="h-5 w-5" />
                </Button>

                {showSettingsMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-md p-2 min-w-[180px]">
                    <div className="text-white text-xs font-semibold mb-2 px-2">Quality</div>
                    <div className="space-y-1">
                      <button
                        className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors ${currentQuality === -1 ? 'bg-blue-500 text-white' : 'text-white/80'
                          }`}
                        onClick={() => changeQuality(-1)}
                      >
                        Auto
                      </button>
                      {qualities.map((quality, index) => (
                        <button
                          key={index}
                          className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors ${currentQuality === index ? 'bg-blue-500 text-white' : 'text-white/80'
                            }`}
                          onClick={() => changeQuality(index)}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loop - Hidden on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className={`hidden sm:flex h-8 w-8 text-white hover:bg-white/20 ${isLoopEnabled ? 'bg-white/20' : ''}`}
              onClick={toggleLoop}
              title={isLoopEnabled ? "Disable loop" : "Enable loop"}
            >
              <Repeat className="h-5 w-5" />
            </Button>

            {/* PiP - Hidden on mobile */}
            {document.pictureInPictureEnabled && (
              <Button
                variant="ghost"
                size="icon"
                className={`hidden sm:flex h-8 w-8 text-white hover:bg-white/20 ${isPiPActive ? 'bg-white/20' : ''}`}
                onClick={togglePiP}
                title="Picture-in-Picture"
              >
                <PictureInPicture className="h-5 w-5" />
              </Button>
            )}

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
