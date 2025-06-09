import React from 'react';
import LazyImage from './LazyImage';

interface LazyMoviePosterProps {
  /** Movie poster URL */
  src: string;
  /** Movie name for alt text */
  movieName: string;
  /** Optional fallback poster URL */
  fallbackSrc?: string;
  /** CSS classes to apply */
  className?: string;
  /** Aspect ratio for the poster (default: 2/3 for movie posters) */
  aspectRatio?: string;
  /** Size variant for different poster sizes */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show loading effects */
  showLoadingEffects?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether the poster is clickable */
  clickable?: boolean;
}

/**
 * LazyMoviePoster - Specialized component for movie poster lazy loading
 * Optimized for movie poster aspect ratios and common use cases
 */
const LazyMoviePoster: React.FC<LazyMoviePosterProps> = ({
  src,
  movieName,
  fallbackSrc,
  className = '',
  aspectRatio = '2/3',
  size = 'md',
  showLoadingEffects = true,
  onClick,
  clickable = !!onClick,
  ...props
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'w-24 h-36',      // 96x144px
    md: 'w-32 h-48',      // 128x192px  
    lg: 'w-48 h-72',      // 192x288px
    xl: 'w-64 h-96',      // 256x384px
  };

  // Create a high-quality movie poster placeholder
  const createPosterPlaceholder = () => {
    return `data:image/svg+xml,%3Csvg width='300' height='450' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='movieGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%232563eb;stop-opacity:0.8' /%3E%3Cstop offset='50%25' style='stop-color:%231e40af;stop-opacity:0.6' /%3E%3Cstop offset='100%25' style='stop-color:%23111827;stop-opacity:0.9' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23movieGrad)'/%3E%3Ctext x='50%25' y='45%25' text-anchor='middle' fill='%23ffffff' font-size='14' font-family='Arial, sans-serif' opacity='0.6'%3E🎬%3C/text%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' fill='%23ffffff' font-size='10' font-family='Arial, sans-serif' opacity='0.5'%3ELoading...%3C/text%3E%3C/svg%3E`;
  };

  // Default error fallback for movie posters
  const defaultErrorFallback = `data:image/svg+xml,%3Csvg width='300' height='450' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23374151'/%3E%3Ctext x='50%25' y='45%25' text-anchor='middle' fill='%23ffffff' font-size='14' font-family='Arial, sans-serif'%3E🎭%3C/text%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' fill='%23ffffff' font-size='8' font-family='Arial, sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E`;

  const containerClasses = `
    movie-poster-container
    relative 
    rounded-lg 
    overflow-hidden 
    shadow-lg
    ${clickable ? 'cursor-pointer hover:shadow-xl transition-shadow duration-300' : ''}
    ${sizeClasses[size]}
    ${className}
  `;

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={containerClasses}
      onClick={handleClick}
      style={{ aspectRatio }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      <LazyImage
        src={src}
        alt={`${movieName} poster`}
        placeholder={createPosterPlaceholder()}
        errorFallback={fallbackSrc || defaultErrorFallback}
        className="w-full h-full object-cover"
        rootMargin="100px" // Start loading when poster is 100px away from viewport
        threshold={0.05}
        showSpinner={showLoadingEffects}
        {...props}
      />
      
      {/* Hover overlay for clickable posters */}
      {clickable && (
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="text-white text-center">
            <div className="text-2xl mb-1">▶️</div>
            <div className="text-xs">View Details</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyMoviePoster;
