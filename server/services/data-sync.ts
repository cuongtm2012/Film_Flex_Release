import { ElasticsearchService } from './elasticsearch.js';
import { storage } from '../storage.js';
import cron from 'node-cron';
import { watchlistNotificationService } from './watchlistNotificationService.js';

export interface SyncOptions {
  batchSize?: number;
  enableScheduledSync?: boolean;
  syncInterval?: string; // cron expression
}

export class DataSyncService {
  private elasticsearchService: ElasticsearchService;
  private options: SyncOptions;
  private isFullSyncRunning = false;
  private lastSyncTime: Date | null = null;

  constructor(elasticsearchService: ElasticsearchService, options: SyncOptions = {}) {
    this.elasticsearchService = elasticsearchService;
    this.options = {
      batchSize: 100,
      enableScheduledSync: true,
      syncInterval: '0 2 * * *', // Daily at 2 AM
      ...options
    };
  }

  async initialize(): Promise<void> {
    console.log('Initializing Data Sync Service...');

    // Schedule automatic sync if enabled
    if (this.options.enableScheduledSync) {
      this.scheduleSync();
    }

    // Perform initial incremental sync
    await this.incrementalSync();
  }

  private scheduleSync(): void {
    console.log(`Scheduling automatic sync with interval: ${this.options.syncInterval}`);

    cron.schedule(this.options.syncInterval!, async () => {
      console.log('Starting scheduled sync...');
      try {
        await this.incrementalSync();
        console.log('Scheduled sync completed successfully');
      } catch (error) {
        console.error('Scheduled sync failed:', error);
      }
    });
  }

  async fullSync(): Promise<{ movies: number; episodes: number; errors: string[] }> {
    if (this.isFullSyncRunning) {
      throw new Error('Full sync is already running');
    }

    this.isFullSyncRunning = true;
    const errors: string[] = [];
    let movieCount = 0;
    let episodeCount = 0;

    try {
      console.log('Starting full sync...');

      // Reindex to clear existing data
      await this.elasticsearchService.reindex();

      // Sync movies in batches
      let page = 1;
      let hasMoreMovies = true;

      while (hasMoreMovies) {
        try {
          const movieBatch = await storage.getMovies(page, this.options.batchSize!);

          if (movieBatch.data.length === 0) {
            hasMoreMovies = false;
            break;
          }

          // Index movie batch
          await this.elasticsearchService.indexMovies(movieBatch.data);
          movieCount += movieBatch.data.length;

          console.log(`Synced ${movieCount} movies so far...`);
          page++;

          // Add small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          const errorMsg = `Failed to sync movie batch ${page}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          page++;
        }
      }

      // Sync episodes in batches
      console.log('Starting episode sync...');
      const allMovies = await storage.getAllMovieSlugs();

      for (const movieSlug of allMovies) {
        try {
          const episodes = await storage.getEpisodesByMovieSlug(movieSlug);

          if (episodes.length > 0) {
            await this.elasticsearchService.indexEpisodes(episodes);
            episodeCount += episodes.length;
          }

          if (episodeCount % 1000 === 0) {
            console.log(`Synced ${episodeCount} episodes so far...`);
          }

          // Add small delay
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          const errorMsg = `Failed to sync episodes for movie ${movieSlug}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      this.lastSyncTime = new Date();
      console.log(`Full sync completed. Movies: ${movieCount}, Episodes: ${episodeCount}, Errors: ${errors.length}`);

      return { movies: movieCount, episodes: episodeCount, errors };
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    } finally {
      this.isFullSyncRunning = false;
    }
  }

  async incrementalSync(): Promise<{ movies: number; episodes: number; errors: string[] }> {
    const errors: string[] = [];
    let movieCount = 0;
    let episodeCount = 0;

    try {
      console.log('Starting incremental sync...');

      // Get last sync time or default to 24 hours ago
      const since = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Sync recently modified movies
      const recentMovies = await storage.getMoviesModifiedSince(since);

      if (recentMovies.length > 0) {
        console.log(`Found ${recentMovies.length} movies to sync`);

        // Index in batches
        for (let i = 0; i < recentMovies.length; i += this.options.batchSize!) {
          const batch = recentMovies.slice(i, i + this.options.batchSize!);

          try {
            await this.elasticsearchService.indexMovies(batch);
            movieCount += batch.length;
          } catch (error) {
            const errorMsg = `Failed to sync movie batch: ${error}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }

        // Sync episodes for these movies
        for (const movie of recentMovies) {
          try {
            const episodes = await storage.getEpisodesByMovieSlug(movie.slug);

            if (episodes.length > 0) {
              await this.elasticsearchService.indexEpisodes(episodes);
              episodeCount += episodes.length;
            }

            // Check for new episodes and notify watchers
            await watchlistNotificationService.checkAndNotify(movie.slug);

          } catch (error) {
            const errorMsg = `Failed to sync episodes for movie ${movie.slug}: ${error}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      this.lastSyncTime = new Date();
      console.log(`Incremental sync completed. Movies: ${movieCount}, Episodes: ${episodeCount}, Errors: ${errors.length}`);

      return { movies: movieCount, episodes: episodeCount, errors };
    } catch (error) {
      console.error('Incremental sync failed:', error);
      throw error;
    }
  }

  async syncSingleMovie(movieSlug: string): Promise<void> {
    try {
      const movie = await storage.getMovieBySlug(movieSlug);
      if (!movie) {
        throw new Error(`Movie not found: ${movieSlug}`);
      }

      // Index movie
      await this.elasticsearchService.indexMovie(movie);

      // Index episodes
      const episodes = await storage.getEpisodesByMovieSlug(movieSlug);
      if (episodes.length > 0) {
        await this.elasticsearchService.indexEpisodes(episodes);
      }

      console.log(`Successfully synced movie: ${movieSlug}`);
    } catch (error) {
      console.error(`Failed to sync movie ${movieSlug}:`, error);
      throw error;
    }
  }

  async deleteSyncedMovie(movieSlug: string): Promise<void> {
    try {
      await this.elasticsearchService.deleteMovie(movieSlug);
      console.log(`Successfully deleted movie from index: ${movieSlug}`);
    } catch (error) {
      console.error(`Failed to delete movie from index ${movieSlug}:`, error);
      throw error;
    }
  }

  async getSyncStatus(): Promise<{
    isFullSyncRunning: boolean;
    lastSyncTime: Date | null;
    elasticsearchHealth: any;
  }> {
    const health = await this.elasticsearchService.getHealth();

    return {
      isFullSyncRunning: this.isFullSyncRunning,
      lastSyncTime: this.lastSyncTime,
      elasticsearchHealth: health
    };
  }

  // Webhook handler for real-time sync
  async handleDataChange(type: 'movie' | 'episode', action: 'create' | 'update' | 'delete', data: any): Promise<void> {
    try {
      if (type === 'movie') {
        switch (action) {
          case 'create':
          case 'update':
            await this.syncSingleMovie(data.slug);
            break;
          case 'delete':
            await this.deleteSyncedMovie(data.slug);
            break;
        }
      } else if (type === 'episode') {
        switch (action) {
          case 'create':
          case 'update':
            await this.elasticsearchService.indexEpisode(data);
            break;
          case 'delete':
            await this.elasticsearchService.deleteEpisode(data.slug);
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to handle data change:`, error);
      throw error;
    }
  }

  async validateSync(): Promise<{
    dbMovieCount: number;
    esMovieCount: number;
    dbEpisodeCount: number;
    esEpisodeCount: number;
    isInSync: boolean;
  }> {
    try {
      // Get counts from database
      const [dbMovies, dbEpisodes] = await Promise.all([
        storage.getMovieCount(),
        storage.getEpisodeCount()
      ]);

      // Get counts from Elasticsearch
      const [esMovies, esEpisodes] = await Promise.all([
        this.elasticsearchService.getHealth(),
        this.elasticsearchService.getHealth()
      ]);

      const esMovieCount = esMovies.indexes?.indices?.movies?.total?.docs?.count || 0;
      const esEpisodeCount = esEpisodes.indexes?.indices?.episodes?.total?.docs?.count || 0;

      const isInSync = dbMovies === esMovieCount && dbEpisodes === esEpisodeCount;

      return {
        dbMovieCount: dbMovies,
        esMovieCount: esMovieCount,
        dbEpisodeCount: dbEpisodes,
        esEpisodeCount: esEpisodeCount,
        isInSync
      };
    } catch (error) {
      console.error('Failed to validate sync:', error);
      throw error;
    }
  }
}

// Install node-cron if not already installed
export function createDataSyncService(elasticsearchService: ElasticsearchService, options?: SyncOptions): DataSyncService {
  return new DataSyncService(elasticsearchService, options);
}