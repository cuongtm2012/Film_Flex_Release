import React, { useState, useRef, useEffect, useCallback } from 'react';

interface LazyImageProps {
  /** The source URL of the image to load */
  src: string;
  /** Alternative text for the image */
  alt: string;
  /** Optional placeholder image URL (defaults to a grey placeholder) */
  placeholder?: string;
  /** CSS classes to apply to the image */
  className?: string;
  /** Root margin for Intersection Observer (when to start loading) */
  rootMargin?: string;
  /** Threshold for Intersection Observer */
  threshold?: number;
  /** Callback fired when image starts loading */
  onStartLoad?: () => void;
  /** Callback fired when image finishes loading */
  onLoad?: () => void;
  /** Callback fired when image fails to load */
  onError?: () => void;
  /** Custom error fallback image URL */
  errorFallback?: string;
  /** Whether to show a loading spinner */
  showSpinner?: boolean;
  /** Additional styles for the container */
  style?: React.CSSProperties;
  /** Other img element props */
  [key: string]: any;
}

/**
 * LazyImage Component with Intersection Observer API
 * 
 * Features:
 * - Lazy loads images when they enter the viewport
 * - Smooth fade-in effect when images load
 * - Fallback for browsers without Intersection Observer support
 * - Placeholder support with customizable loading states
 * - Error handling with fallback images
 * - Preloading margin control via rootMargin
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  rootMargin = '50px',
  threshold = 0.1,
  onStartLoad,
  onLoad,
  onError,
  errorFallback = 'https://via.placeholder.com/300x450?text=Image+Not+Found',
  showSpinner = true,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if Intersection Observer is supported
  const isIntersectionObserverSupported = typeof window !== 'undefined' && 'IntersectionObserver' in window;

  // Intersection Observer callback
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && !isInView) {
      setIsInView(true);
      setIsLoading(true);
      onStartLoad?.();
    }
  }, [isInView, onStartLoad]);

  // Set up Intersection Observer
  useEffect(() => {
    const container = containerRef.current;
    
    if (!container) return;

    // If Intersection Observer is not supported, load immediately
    if (!isIntersectionObserverSupported) {
      setIsInView(true);
      setIsLoading(true);
      onStartLoad?.();
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observer.observe(container);

    return () => {
      observer.unobserve(container);
      observer.disconnect();
    };
  }, [handleIntersection, rootMargin, threshold, isIntersectionObserverSupported, onStartLoad]);

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image load error
  const handleImageError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  // Default placeholder - creates a subtle grey gradient
  const defaultPlaceholder = `data:image/svg+xml,%3Csvg width='300' height='450' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23374151;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23111827;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grad)'/%3E%3C/svg%3E`;

  // Determine what image source to show
  const getImageSrc = () => {
    if (!isInView) {
      return placeholder || defaultPlaceholder;
    }
    if (hasError) {
      return errorFallback;
    }
    return src;
  };

  // Combined styles for smooth animations
  const imageStyles: React.CSSProperties = {
    transition: 'opacity 0.6s ease-in-out, transform 0.3s ease-out',
    opacity: !isInView ? 0.7 : isLoaded ? 1 : 0.8,
    transform: isLoaded ? 'scale(1)' : 'scale(1.02)',
    ...style,
  };

  // Container styles for positioning
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1f2937', // fallback background
  };

  return (
    <div 
      ref={containerRef} 
      style={containerStyles}
      className={`lazy-image-container ${className}`}
    >
      <img
        ref={imgRef}
        src={getImageSrc()}
        alt={alt}
        style={imageStyles}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`
          lazy-image 
          ${isLoaded ? 'loaded' : 'loading'}
          ${hasError ? 'error' : ''}
          ${isInView ? 'in-view' : 'out-of-view'}
          w-full h-full object-cover
        `}
        {...props}
      />
      
      {/* Loading spinner overlay */}
      {showSpinner && isLoading && isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error state overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-gray-400 text-xs text-center p-2">
          <div>
            <div className="mb-1">⚠️</div>
            <div>Failed to load image</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;

// Custom hook for lazy loading (alternative approach)
export const useLazyImage = (src: string, options: { rootMargin?: string; threshold?: number } = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [options.rootMargin, options.threshold]);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => setHasError(true);

  return {
    ref,
    src: isInView ? src : undefined,
    isLoaded,
    isInView,
    hasError,
    handleLoad,
    handleError,
  };
};
