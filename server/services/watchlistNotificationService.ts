import { storage } from '../storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';

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

            // Get snapshot using sql template
            const snapshotQuery = await db.execute(
                sql`SELECT * FROM watchlist_episode_snapshots WHERE movie_slug = ${movieSlug} LIMIT 1`
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
                    sql`SELECT user_id FROM watchlist WHERE movie_slug = ${movieSlug}`
                );

                const watchers = watchlistQuery.rows;

                if (watchers.length === 0) {
                    console.log(`No watchers for ${movieSlug}, skipping notifications`);
                } else {
                    // Create notifications for each watcher
                    for (const watcher of watchers) {
                        const notificationData = JSON.stringify({
                            movieSlug,
                            movieName: movie.name,
                            newEpisodeCount,
                            totalEpisodes: currentCount
                        });

                        await db.execute(
                            sql`INSERT INTO notifications (user_id, type, title, message, data, movie_id, is_read, created_at)
                  VALUES (${watcher.user_id}, ${'new_episode'}, ${'🎬 New Episode Available!'},
                          ${`${newEpisodeCount} new episode${newEpisodeCount > 1 ? 's' : ''} added to "${movie.name}"`},
                          ${notificationData}, ${movie.id}, ${false}, NOW())`
                        );
                    }

                    console.log(`✅ Created ${watchers.length} notifications for new episodes in ${movie.name}`);
                }
            }

            // Update or insert snapshot
            await db.execute(
                sql`INSERT INTO watchlist_episode_snapshots (movie_slug, episode_count, last_episode_slug, updated_at)
            VALUES (${movieSlug}, ${currentCount}, ${latestEpisode?.slug || null}, NOW())
            ON CONFLICT (movie_slug) DO UPDATE
            SET episode_count = ${currentCount},
                last_episode_slug = ${latestEpisode?.slug || null},
                updated_at = NOW()`
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
                sql`INSERT INTO watchlist_episode_snapshots (movie_slug, episode_count, last_episode_slug, updated_at)
            VALUES (${movieSlug}, ${currentCount}, ${latestEpisode?.slug || null}, NOW())
            ON CONFLICT (movie_slug) DO NOTHING`
            );

            console.log(`Initialized episode snapshot for ${movieSlug}: ${currentCount} episodes`);
        } catch (error) {
            console.error(`Failed to initialize snapshot for ${movieSlug}:`, error);
        }
    }
}

export const watchlistNotificationService = new WatchlistNotificationService();
