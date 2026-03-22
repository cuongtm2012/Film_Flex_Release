/**
 * Movie/Category cache - Redis with in-memory fallback
 * Uses Redis when REDIS_HOST is set; falls back to in-memory Map when Redis unavailable.
 * Reduces Node.js RAM usage and persists cache across restarts.
 */

import { redisClient } from './redis-client.js';
import { config } from '../config.js';

const KEY_PREFIX = 'filmflex:cache:';
const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes

// In-memory fallback when Redis unavailable
const memoryCache = new Map<string, { data: string; expiry: number }>();
const MAX_MEMORY_ENTRIES = 500;

let redisAvailable = false;
let redisCheckDone = false;

const REDIS_PING_TIMEOUT_MS = 2000;

async function checkRedisAvailable(): Promise<boolean> {
  if (redisCheckDone) return redisAvailable;
  if (!config.redisHost) {
    redisCheckDone = true;
    redisAvailable = false;
    return false;
  }
  try {
    await Promise.race([
      redisClient.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout')), REDIS_PING_TIMEOUT_MS)
      ),
    ]);
    redisAvailable = true;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MovieCache] Using Redis');
    }
  } catch (err) {
    redisAvailable = false;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MovieCache] Redis unavailable, using in-memory fallback:', err instanceof Error ? err.message : err);
    }
  }
  redisCheckDone = true;
  return redisAvailable;
}

function fullKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

function pruneMemoryCache(): void {
  if (memoryCache.size <= MAX_MEMORY_ENTRIES) return;
  const now = Date.now();
  const toDelete: string[] = [];
  for (const [k, v] of memoryCache.entries()) {
    if (now > v.expiry) toDelete.push(k);
  }
  toDelete.forEach(k => memoryCache.delete(k));
  if (memoryCache.size > MAX_MEMORY_ENTRIES) {
    const entries = Array.from(memoryCache.entries())
      .sort(([, a], [, b]) => a.expiry - b.expiry);
    entries.slice(0, memoryCache.size - MAX_MEMORY_ENTRIES)
      .forEach(([k]) => memoryCache.delete(k));
  }
}

/**
 * Get cached value. Returns null if not found or expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const useRedis = await checkRedisAvailable();
  const fkey = fullKey(key);

  if (useRedis) {
    try {
      const raw = await redisClient.get(fkey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      // Fallback to memory on Redis error
    }
  }

  const entry = memoryCache.get(fkey);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryCache.delete(fkey);
    return null;
  }
  return JSON.parse(entry.data) as T;
}

/**
 * Set cached value with TTL.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  const fkey = fullKey(key);
  const json = JSON.stringify(value);
  const useRedis = await checkRedisAvailable();

  if (useRedis) {
    try {
      await redisClient.setex(fkey, ttlSeconds, json);
      return;
    } catch (err) {
      // Fall through to memory fallback
    }
  }

  memoryCache.set(fkey, {
    data: json,
    expiry: Date.now() + ttlSeconds * 1000,
  });
  pruneMemoryCache();
}

/**
 * Delete cached value.
 */
export async function cacheDel(key: string): Promise<void> {
  const fkey = fullKey(key);
  const useRedis = await checkRedisAvailable();

  if (useRedis) {
    try {
      await redisClient.del(fkey);
    } catch {
      // Ignore
    }
  }
  memoryCache.delete(fkey);
}

/**
 * Check if Redis is being used (for logging/debugging).
 */
export async function isUsingRedis(): Promise<boolean> {
  return checkRedisAvailable();
}
