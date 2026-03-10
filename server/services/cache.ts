import NodeCache from 'node-cache';

// Create cache instance with 5 minutes TTL
const movieCache = new NodeCache({
    stdTTL: 300, // 5 minutes
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false, // Don't clone data for better performance
});

/**
 * Generate cache key from request parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    return `${prefix}:${sortedParams}`;
}

/**
 * Get data from cache
 */
export function getFromCache<T>(key: string): T | undefined {
    return movieCache.get<T>(key);
}

/**
 * Set data to cache
 */
export function setToCache<T>(key: string, data: T, ttl?: number): boolean {
    return movieCache.set(key, data, ttl || 300);
}

/**
 * Delete specific cache key
 */
export function deleteFromCache(key: string): number {
    return movieCache.del(key);
}

/**
 * Clear all cache
 */
export function clearCache(): void {
    movieCache.flushAll();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    return movieCache.getStats();
}

/**
 * Middleware to add cache-control headers
 */
export function addCacheHeaders(res: any, maxAge: number = 300) {
    res.set({
        'Cache-Control': `public, max-age=${maxAge}`,
        'Vary': 'Accept-Encoding',
    });
}

export default movieCache;
