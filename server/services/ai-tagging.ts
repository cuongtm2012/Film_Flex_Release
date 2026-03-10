import { getDeepSeek } from '../config/deepseek.js';
import type { Movie } from '@shared/schema';

export interface MovieTags {
    genres: string[];
    mood: string;
    themes: string[];
    contentWarnings: string[];
    targetAudience: string;
    seoDescription: string;
}

/**
 * Auto-tag a movie using AI
 */
export async function autoTagMovie(movie: {
    name: string;
    description: string;
    originName?: string;
}): Promise<MovieTags> {
    try {
        const prompt = `Analyze this movie and provide detailed tags for better discoverability:

Title: ${movie.name}
${movie.originName ? `Original Title: ${movie.originName}` : ''}
Description: ${movie.description}

Provide comprehensive tags:
1. Genres: List all applicable genres (e.g., action, drama, comedy, thriller, sci-fi, romance, horror, fantasy, mystery)
2. Mood: Overall emotional tone (e.g., dark, uplifting, suspenseful, heartwarming, intense, lighthearted)
3. Themes: Main themes explored (e.g., revenge, love, coming-of-age, survival, family, friendship, betrayal)
4. Content Warnings: Any sensitive content (e.g., violence, strong language, sexual content, drug use) - leave empty if family-friendly
5. Target Audience: Who would enjoy this (e.g., family, teens, adults, mature audiences)
6. SEO Description: Compelling 150-character description for search engines

Return as JSON:
{
  "genres": ["genre1", "genre2"],
  "mood": "mood",
  "themes": ["theme1", "theme2"],
  "contentWarnings": ["warning1"] or [],
  "targetAudience": "audience",
  "seoDescription": "description"
}`;

        const deepseek = await getDeepSeek();
        if (!deepseek) {
            throw new Error('DeepSeek API key not configured');
        }

        const response = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3, // Low for consistent tagging
            max_tokens: 500,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Empty response from DeepSeek');
        }

        const tags = JSON.parse(content);

        console.log(`[AI Tagging] Tagged: ${movie.name}`);

        return {
            genres: tags.genres || [],
            mood: tags.mood || 'neutral',
            themes: tags.themes || [],
            contentWarnings: tags.contentWarnings || [],
            targetAudience: tags.targetAudience || 'general',
            seoDescription: tags.seoDescription || movie.description.substring(0, 150)
        };

    } catch (error) {
        console.error('[AI Tagging] Error:', error);

        // Return basic tags as fallback
        return {
            genres: [],
            mood: 'neutral',
            themes: [],
            contentWarnings: [],
            targetAudience: 'general',
            seoDescription: movie.description.substring(0, 150)
        };
    }
}

/**
 * Batch tag multiple movies
 */
export async function batchTagMovies(
    movies: Array<{ id: number; name: string; description: string; originName?: string }>,
    onProgress?: (current: number, total: number) => void
): Promise<Map<number, MovieTags>> {
    const results = new Map<number, MovieTags>();

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];

        try {
            const tags = await autoTagMovie({
                name: movie.name,
                description: movie.description,
                originName: movie.originName
            });

            results.set(movie.id, tags);

            if (onProgress) {
                onProgress(i + 1, movies.length);
            }

            // Rate limit: 1 request per second to avoid API throttling
            if (i < movies.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            console.error(`[AI Tagging] Failed to tag movie ${movie.id}:`, error);
            // Continue with next movie
        }
    }

    return results;
}
