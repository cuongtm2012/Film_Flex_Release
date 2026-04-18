/**
 * Redis Client for Token Caching
 * Used for email verification tokens and other temporary data
 */

import Redis from 'ioredis';
import { config } from '../config.js';

const redisOptions = {
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
};

// Create Redis client (prefer REDIS_URL in production/cloud environments)
export const redisClient = config.redisUrl
    ? new Redis(config.redisUrl, redisOptions)
    : new Redis({
        host: config.redisHost,
        port: config.redisPort || 6379,
        password: config.redisPassword || undefined,
        ...redisOptions,
    });

// Handle connection events
redisClient.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Redis client connected');
    }
});

redisClient.on('error', (err) => {
    console.error('❌ Redis client error:', err);
});

redisClient.on('ready', () => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Redis client ready');
    }
});

/**
 * Store verification token in Redis
 * @param token - Verification token
 * @param userId - User ID to associate with token
 * @param ttl - Time to live in seconds (default: 24 hours)
 */
export async function storeVerificationToken(
    token: string,
    userId: number,
    ttl: number = 86400 // 24 hours
): Promise<boolean> {
    try {
        await redisClient.setex(`verify:${token}`, ttl, userId.toString());
        return true;
    } catch (error) {
        console.error('Error storing verification token:', error);
        return false;
    }
}

/**
 * Get user ID from verification token
 * @param token - Verification token
 * @returns User ID or null if token not found/expired
 */
export async function getVerificationToken(token: string): Promise<number | null> {
    try {
        const userId = await redisClient.get(`verify:${token}`);
        return userId ? parseInt(userId) : null;
    } catch (error) {
        console.error('Error getting verification token:', error);
        return null;
    }
}

/**
 * Delete verification token from Redis
 * @param token - Verification token
 */
export async function deleteVerificationToken(token: string): Promise<boolean> {
    try {
        await redisClient.del(`verify:${token}`);
        return true;
    } catch (error) {
        console.error('Error deleting verification token:', error);
        return false;
    }
}

export default redisClient;
