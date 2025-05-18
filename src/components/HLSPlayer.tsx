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
        
        // Create new HLS instance with optimized settings
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          lowLatencyMode: false,
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 20000,
          levelLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          manifestLoadingRetryDelay: 1000,
          levelLoadingRetryDelay: 1000
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