import { storage } from '../storage';
import { db } from '../db';

export class WatchlistNotificationService {
    /**
     * Check if movie has new episodes and notify watchers
     * Called during data sync for each updated movie
     */
    async checkAndNotify(movieSlug: string): Promise<void> {
        try {
            // Get current episodes
            const episodes = await storage.getEpisodesByMovieSlug(movieSlug);
            const currentCount = episodes.length;

            if (currentCount === 0) {
                return; // No episodes yet
            }

            const latestEpisode = episodes[episodes.length - 1];

            // Get snapshot using raw SQL
            const snapshotQuery = await db.execute(
                `SELECT * FROM watchlist_episode_snapshots WHERE movie_slug = $1 LIMIT 1`,
                [movieSlug]
            );

            const snapshot = snapshotQuery.rows[0];
            const previousCount = snapshot?.episode_count || 0;
            const previousEpisodeSlug = snapshot?.last_episode_slug;

            // Check if there are new episodes
            const hasNewEpisodes = currentCount > previousCount ||
                (latestEpisode && latestEpisode.slug !== previousEpisodeSlug);

            if (hasNewEpisodes) {
                const newEpisodeCount = currentCount - previousCount;

                // Get movie details
                const movie = await storage.getMovieBySlug(movieSlug);
                if (!movie) return;

                // Get all users watching this movie
                const watchlistQuery = await db.execute(
                    `SELECT user_id FROM watchlist WHERE movie_slug = $1`,
                    [movieSlug]
                );

                const watchers = watchlistQuery.rows;

                if (watchers.length === 0) {
                    console.log(`No watchers for ${movieSlug}, skipping notifications`);
                } else {
                    // Create notifications for each watcher
                    for (const watcher of watchers) {
                        await db.execute(
                            `INSERT INTO notifications (user_id, type, title, message, data, movie_id, is_read, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                            [
                                watcher.user_id,
                                'new_episode',
                                '🎬 New Episode Available!',
                                `${newEpisodeCount} new episode${newEpisodeCount > 1 ? 's' : ''} added to "${movie.name}"`,
                                JSON.stringify({
                                    movieSlug,
                                    movieName: movie.name,
                                    newEpisodeCount,
                                    totalEpisodes: currentCount
                                }),
                                movie.id,
                                false
                            ]
                        );
                    }

                    console.log(`✅ Created ${watchers.length} notifications for new episodes in ${movie.name}`);
                }
            }

            // Update or insert snapshot
            await db.execute(
                `INSERT INTO watchlist_episode_snapshots (movie_slug, episode_count, last_episode_slug, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (movie_slug) DO UPDATE
         SET episode_count = $2,
             last_episode_slug = $3,
             updated_at = NOW()`,
                [movieSlug, currentCount, latestEpisode?.slug || null]
            );

        } catch (error) {
            console.error(`Failed to check notifications for ${movieSlug}:`, error);
        }
    }

    /**
     * Initialize snapshot when movie is added to watchlist
     */
    async initializeSnapshot(movieSlug: string): Promise<void> {
        try {
            const episodes = await storage.getEpisodesByMovieSlug(movieSlug);
            const currentCount = episodes.length;
            const latestEpisode = episodes[episodes.length - 1];

            await db.execute(
                `INSERT INTO watchlist_episode_snapshots (movie_slug, episode_count, last_episode_slug, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (movie_slug) DO NOTHING`,
                [movieSlug, currentCount, latestEpisode?.slug || null]
            );

            console.log(`Initialized episode snapshot for ${movieSlug}: ${currentCount} episodes`);
        } catch (error) {
            console.error(`Failed to initialize snapshot for ${movieSlug}:`, error);
        }
    }
}

export const watchlistNotificationService = new WatchlistNotificationService();
