import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './HLSPlayer.css';

interface HLSPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
}

const HLSPlayer: React.FC<HLSPlayerProps> = ({ 
  src, 
  autoPlay = true,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup function to destroy HLS instance on unmount or URL change
    const cleanupHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    // Reset video element
    video.pause();
    video.removeAttribute('src');
    video.load();

    if (!src) {
      console.error('No video source provided');
      return cleanupHls;
    }

    try {
      // Check if HLS.js is supported
      if (Hls.isSupported()) {
        cleanupHls(); // Cleanup any existing HLS instance
        
        // Create new HLS instance with optimized settings for FilmFlex
        const hls = new Hls({
          // Buffer management - optimized for streaming movies
          maxBufferLength: 30,           // 30 seconds forward buffer
          maxMaxBufferLength: 600,       // 10 minutes max buffer
          maxBufferSize: 60 * 1000 * 1000, // 60MB buffer size
          maxBufferHole: 0.5,            // 500ms max buffer hole
          
          // Loading timeouts - increased for slower connections
          fragLoadingTimeOut: 30000,     // 30 seconds for fragment loading  
          manifestLoadingTimeOut: 30000, // 30 seconds for manifest loading
          levelLoadingTimeOut: 30000,    // 30 seconds for level loading
          
          // Retry settings - more resilient to network issues
          fragLoadingMaxRetry: 8,        // More retries for fragments
          manifestLoadingMaxRetry: 8,    // More retries for manifest
          levelLoadingMaxRetry: 8,       // More retries for levels
          fragLoadingRetryDelay: 2000,   // 2 second delay between retries
          manifestLoadingRetryDelay: 2000,
          levelLoadingRetryDelay: 2000,
          
          // Performance optimizations
          lowLatencyMode: false,         // Disable for movie streaming
          backBufferLength: 90,          // Keep 90 seconds of back buffer
          liveDurationInfinity: false,   // Not for live streams
          
          // Quality settings
          startLevel: -1,                // Auto-select initial quality
          testBandwidth: true,           // Enable bandwidth testing
          abrEwmaFastLive: 3.0,         // Faster adaptation for better quality
          abrEwmaSlowLive: 9.0,         // Slower adaptation to avoid oscillation
          
          // Network optimizations
          enableWorker: true,            // Use web workers when available
          enableSoftwareAES: true        // Software AES for encrypted content
        });

        // Store HLS instance in ref
        hlsRef.current = hls;
        
        // Load source and attach to video element
        hls.loadSource(src);
        hls.attachMedia(video);
        
        // Handle HLS events
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed, ready to play');
          if (autoPlay) {
            video.play().catch(error => {
              console.warn('Autoplay was prevented:', error);
            });
          }
        });
        
        // Error handling
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          
          if (data.fatal) {
            switch(data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal HLS error, cannot recover');
                cleanupHls();
                break;
            }
          }
        });
      } 
      // For browsers with native HLS support (Safari)
      else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Using native HLS support');
        video.src = src;
        
        video.addEventListener('loadedmetadata', () => {
          if (autoPlay) {
            video.play().catch(error => {
              console.warn('Autoplay was prevented:', error);
            });
          }
        });
      } 
      // No HLS support
      else {
        console.error('Your browser does not support HLS playback');
      }
    } catch (error) {
      console.error('Error initializing video player:', error);
    }

    // Cleanup on unmount or when src changes
    return cleanupHls;
  }, [src, autoPlay]);

  return (
    <video 
      ref={videoRef}
      className={`hls-player ${className}`}
      controls
      playsInline
    />
  );
};

export default HLSPlayer;