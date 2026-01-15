import { getDeepSeek } from '../config/deepseek.js';
import { storage } from '../storage.js';
import type { Movie } from '@shared/schema';

interface RecommendationResult {
    recommendations: Movie[];
    reasons: string[];
    aiPowered: boolean;
    processingTime: number;
}

/**
 * Get AI-powered personalized movie recommendations
 * Based on user's watch history and preferences
 */
export async function getAIRecommendations(
    userId: number,
    limit: number = 10
): Promise<RecommendationResult> {
    const startTime = Date.now();

    try {
        // 1. Get user's watchlist (movies they want to watch)
        const watchlist = await storage.getWatchlist(userId, 1, 20);

        // 2. Get available movies to recommend from
        const allMovies = await storage.getMovies(1, 500, 'latest');

        if (allMovies.data.length === 0) {
            return {
                recommendations: [],
                reasons: [],
                aiPowered: false,
                processingTime: Date.now() - startTime
            };
        }

        // 3. Build user context from watchlist
        const watchlistMovies = (watchlist?.data || []).map((w: any) => w.movie?.name || '').filter(Boolean);

        // Get genres from watchlist movies
        const preferredGenres = new Set<string>();
        (watchlist?.data || []).forEach((w: any) => {
            if (w.movie?.categories) {
                w.movie.categories.forEach((cat: any) => {
                    preferredGenres.add(cat.name || cat);
                });
            }
        });

        const userContext = `
User's Watchlist (wants to watch): ${watchlistMovies.slice(0, 10).join(', ') || 'None'}
Preferred Genres: ${Array.from(preferredGenres).join(', ') || 'Not determined yet'}
    `.trim();

        // 4. Build movie list for AI
        const movieList = allMovies.data
            .filter(m => !watchlistMovies.includes(m.name)) // Exclude already in watchlist
            .slice(0, 200) // Limit to 200 for better performance
            .map((m, i) => {
                const genres = Array.isArray(m.categories)
                    ? m.categories.map((c: any) => c.name || c).join(', ')
                    : '';
                return `${i + 1}. ${m.name} (${genres})`;
            })
            .join('\n');

        // 6. Build prompt for DeepSeek
        const prompt = `You are a movie recommendation expert. Based on this user's viewing preferences:

${userContext}

From these available movies, recommend the top ${limit} movies this user would most enjoy:
${movieList}

Consider:
- Similar genres to what they've watched
- Movies in their watchlist indicate their interests
- Variety (don't recommend only one genre)
- Quality and popularity

Return a JSON object with:
{
  "recommendations": [
    {
      "index": 5,
      "reason": "Based on your love for action movies"
    },
    ...
  ]
}

Return ONLY the JSON object, no other text.`;

        // 7. Get DeepSeek client and call API
        const deepseek = await getDeepSeek();
        if (!deepseek) {
            throw new Error('DeepSeek API key not configured');
        }

        const response = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4, // Balanced creativity and consistency
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });

        // 8. Parse response
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Empty response from DeepSeek');
        }

        const parsed = JSON.parse(content);
        const recs = parsed.recommendations || [];

        // 9. Map to actual movies
        const movieData = allMovies.data.filter(m => !watchlistMovies.includes(m.name)).slice(0, 200);
        const recommendations = recs
            .map((rec: any) => ({
                movie: movieData[rec.index - 1],
                reason: rec.reason
            }))
            .filter((r: any) => r.movie !== undefined)
            .slice(0, limit);

        console.log(`[AI Recommendations] User ${userId} -> ${recommendations.length} recommendations in ${Date.now() - startTime}ms`);

        return {
            recommendations: recommendations.map((r: any) => r.movie),
            reasons: recommendations.map((r: any) => r.reason),
            aiPowered: true,
            processingTime: Date.now() - startTime
        };

    } catch (error) {
        console.error('[AI Recommendations] Error:', error);

        // Fallback to traditional recommendations
        const fallback = await storage.getRecommendedMovies(1, limit);

        return {
            recommendations: fallback.data,
            reasons: Array(fallback.data.length).fill('Popular recommendation'),
            aiPowered: false,
            processingTime: Date.now() - startTime
        };
    }
}

/**
 * Cache for AI recommendations
 * Key: userId, Value: { results, timestamp }
 */
const recommendationsCache = new Map<number, { results: RecommendationResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function cachedAIRecommendations(
    userId: number,
    limit: number = 10
): Promise<RecommendationResult> {
    const cached = recommendationsCache.get(userId);

    // Return cached result if fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[AI Recommendations] Cache hit for user ${userId}`);
        return { ...cached.results, processingTime: 0 };
    }

    // Perform new recommendation
    const results = await getAIRecommendations(userId, limit);

    // Cache the results
    recommendationsCache.set(userId, {
        results,
        timestamp: Date.now()
    });

    // Clean old cache entries
    if (recommendationsCache.size > 1000) {
        const oldestKey = Array.from(recommendationsCache.keys())[0];
        recommendationsCache.delete(oldestKey);
    }

    return results;
}
