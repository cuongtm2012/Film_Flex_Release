import { getDeepSeek } from '../config/deepseek.js';
import { storage } from '../storage.js';
import type { Movie } from '@shared/schema';

interface SemanticSearchResult {
    movies: Movie[];
    aiPowered: boolean;
    query: string;
    processingTime: number;
}

/**
 * AI-powered semantic search using DeepSeek
 * Understands natural language queries like:
 * - "phim giống Inception" 
 * - "phim hài về chó"
 * - "phim buồn như Titanic"
 */
export async function semanticSearch(
    query: string,
    limit: number = 20
): Promise<SemanticSearchResult> {
    const startTime = Date.now();

    try {
        // 1. Get available movies (limit to recent/popular for better performance)
        const allMovies = await storage.getMovies(1, 500, 'latest');

        if (allMovies.data.length === 0) {
            return {
                movies: [],
                aiPowered: false,
                query,
                processingTime: Date.now() - startTime
            };
        }

        // 2. Build prompt for DeepSeek
        const movieList = allMovies.data
            .map((m, i) => {
                const genres = Array.isArray(m.categories)
                    ? m.categories.map((c: any) => c.name || c).join(', ')
                    : '';
                const desc = m.description?.substring(0, 150) || 'No description';
                return `${i + 1}. ${m.name} (${genres}) - ${desc}`;
            })
            .join('\n');

        const prompt = `User is searching for: "${query}"

Available movies:
${movieList}

Based on the search query, analyze and return the indices of the ${limit} most relevant movies.

Consider:
- Similar themes, plot, or story elements
- Matching or related genres
- Similar mood, tone, or atmosphere
- Mentioned actors, directors, or franchises
- Semantic meaning beyond exact keyword matches

Return ONLY a JSON object with an array of indices (1-based):
{"indices": [1, 5, 12, ...]}`;

        // 3. Call DeepSeek for semantic understanding
        const deepseek = await getDeepSeek();
        if (!deepseek) {
            throw new Error('DeepSeek API key not configured');
        }

        const response = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2, // Low for consistent search results
            max_tokens: 300,
            response_format: { type: 'json_object' }
        });

        // 4. Parse response
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Empty response from DeepSeek');
        }

        const parsed = JSON.parse(content);
        const indices = parsed.indices || [];

        // 5. Map indices to movies
        const results = indices
            .map((idx: number) => allMovies.data[idx - 1])
            .filter((movie: Movie | undefined): movie is Movie => movie !== undefined)
            .slice(0, limit);

        console.log(`[AI Search] Query: "${query}" -> ${results.length} results in ${Date.now() - startTime}ms`);

        return {
            movies: results,
            aiPowered: true,
            query,
            processingTime: Date.now() - startTime
        };

    } catch (error) {
        console.error('[AI Search] Error:', error);

        // Fallback to traditional search
        const fallback = await storage.searchMovies(query, query, 1, limit);

        return {
            movies: fallback.data,
            aiPowered: false,
            query,
            processingTime: Date.now() - startTime
        };
    }
}

/**
 * Cache for AI search results
 * Key: query string, Value: { results, timestamp }
 */
const searchCache = new Map<string, { results: SemanticSearchResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export async function cachedSemanticSearch(
    query: string,
    limit: number = 20
): Promise<SemanticSearchResult> {
    const cacheKey = `${query.toLowerCase()}_${limit}`;
    const cached = searchCache.get(cacheKey);

    // Return cached result if fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[AI Search] Cache hit for: "${query}"`);
        return { ...cached.results, processingTime: 0 };
    }

    // Perform new search
    const results = await semanticSearch(query, limit);

    // Cache the results
    searchCache.set(cacheKey, {
        results,
        timestamp: Date.now()
    });

    // Clean old cache entries (simple cleanup)
    if (searchCache.size > 100) {
        const oldestKey = Array.from(searchCache.keys())[0];
        searchCache.delete(oldestKey);
    }

    return results;
}
