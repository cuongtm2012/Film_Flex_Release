import { Request, Response, NextFunction } from 'express';
import { getFromCache, setToCache, generateCacheKey, addCacheHeaders } from '../services/cache.js';

export interface CacheOptions {
    ttl?: number; // Cache TTL in seconds (default: 300 = 5 minutes)
    keyGenerator?: (req: Request) => string; // Custom key generator
    condition?: (req: Request) => boolean; // Condition to cache (default: always cache)
}

/**
 * Cache middleware wrapper
 * Caches GET requests and serves from cache if available
 */
export function cacheMiddleware(options: CacheOptions = {}) {
    const {
        ttl = 300,
        keyGenerator,
        condition = () => true
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Check condition
        if (!condition(req)) {
            return next();
        }

        // Generate cache key
        const cacheKey = keyGenerator
            ? keyGenerator(req)
            : generateCacheKey(req.path, { ...req.query, ...req.params });

        // Try to get from cache
        const cachedData = getFromCache(cacheKey);

        if (cachedData) {
            // Add cache headers
            addCacheHeaders(res, ttl);
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedData);
        }

        // Cache miss - intercept res.json to cache the response
        const originalJson = res.json.bind(res);

        res.json = function (data: any) {
            // Only cache successful responses
            if (res.statusCode === 200 && data) {
                setToCache(cacheKey, data, ttl);
            }

            // Add cache headers
            addCacheHeaders(res, ttl);
            res.setHeader('X-Cache', 'MISS');

            return originalJson(data);
        };

        next();
    };
}

/**
 * Invalidate cache for specific patterns
 */
export function invalidateCache(pattern: string) {
    // This is a simple implementation
    // For production, consider using a more sophisticated cache invalidation strategy
    console.log(`Cache invalidation requested for pattern: ${pattern}`);
}

export default cacheMiddleware;
