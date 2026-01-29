/**
 * Route Preloading Utilities
 * Preload critical routes on user interaction for faster navigation
 */

// Preload functions for critical routes
export const preloadHome = () => import("@/pages/Home");
export const preloadMovieDetail = () => import("@/pages/MovieDetail");
export const preloadSearch = () => import("@/pages/SearchPage");
export const preloadAuth = () => import("@/pages/auth-page");
export const preloadMovies = () => import("@/pages/MoviesPage");
export const preloadProfile = () => import("@/pages/ProfilePage");

/**
 * Preload routes based on user interaction patterns
 * Call this on hover/mouseenter for faster perceived performance
 */
export function preloadRoute(routeName: string) {
  switch (routeName) {
    case 'home':
      return preloadHome();
    case 'movie-detail':
      return preloadMovieDetail();
    case 'search':
      return preloadSearch();
    case 'auth':
      return preloadAuth();
    case 'movies':
      return preloadMovies();
    case 'profile':
      return preloadProfile();
    default:
      return Promise.resolve();
  }
}

/**
 * Preload critical routes after initial render
 * Call this after the app has mounted to prefetch important pages
 */
export function preloadCriticalRoutes() {
  // Only preload on fast connections to save bandwidth
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
      return; // Skip preloading on slow connections
    }
  }

  // Preload most commonly accessed pages
  requestIdleCallback(() => {
    preloadMovies();
    preloadSearch();
    preloadMovieDetail();
  }, { timeout: 2000 });
}

/**
 * Request idle callback polyfill for browsers that don't support it
 */
const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: Function, options?: { timeout?: number }) => {
        const start = Date.now();
        return setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
          });
        }, options?.timeout || 1);
      };
