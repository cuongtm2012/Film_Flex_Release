#!/usr/bin/env tsx
/**
 * Ophim Movie Importer Script
 * 
 * Import movies from Ophim API into database
 * Usage: npx tsx scripts/data/import-ophim-movies.ts --page 1
 *        npx tsx scripts/data/import-ophim-movies.ts --start 1 --end 5
 */

import { db } from '../../server/db.js';
import { movies, episodes } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import {
  fetchOphimMovieList,
  fetchOphimMovieDetail,
  retryApiCall,
  RateLimiter,
  type OphimMovieListItem,
} from '../../server/services/ophim-api.js';
import {
  transformOphimMovieToDbFormat,
  validateMovieData,
  validateEpisodeData,
  getMovieStats,
} from '../../server/services/ophim-transformer.js';

// Import configuration
interface ImportConfig {
  pageStart: number;
  pageEnd: number;
  skipExisting: boolean;
  validateOnly: boolean;
  verbose: boolean;
  rateLimitMs: number;
}

// Import statistics
interface ImportStats {
  totalPages: number;
  totalMoviesProcessed: number;
  moviesImported: number;
  moviesSkipped: number;
  moviesFailed: number;
  episodesImported: number;
  startTime: number;
  endTime?: number;
  errors: Array<{ slug: string; error: string }>;
}

class OphimMovieImporter {
  private config: ImportConfig;
  private stats: ImportStats;
  private rateLimiter: RateLimiter;

  constructor(config: ImportConfig) {
    this.config = config;
    this.stats = {
      totalPages: config.pageEnd - config.pageStart + 1,
      totalMoviesProcessed: 0,
      moviesImported: 0,
      moviesSkipped: 0,
      moviesFailed: 0,
      episodesImported: 0,
      startTime: Date.now(),
      errors: [],
    };
    this.rateLimiter = new RateLimiter(config.rateLimitMs);
  }

  /**
   * Main import function
   */
  async import(): Promise<ImportStats> {
    console.log('================================');
    console.log('🎬 Ophim Movie Importer');
    console.log('================================');
    console.log(`Pages: ${this.config.pageStart} to ${this.config.pageEnd}`);
    console.log(`Skip existing: ${this.config.skipExisting}`);
    console.log(`Validate only: ${this.config.validateOnly}`);
    console.log(`Rate limit: ${this.config.rateLimitMs}ms`);
    console.log('================================\n');

    try {
      for (let page = this.config.pageStart; page <= this.config.pageEnd; page++) {
        await this.importPage(page);
      }
    } catch (error) {
      console.error('\n❌ Import process failed:', error);
      throw error;
    } finally {
      this.stats.endTime = Date.now();
      this.printSummary();
    }

    return this.stats;
  }

  /**
   * Import movies from a single page
   */
  private async importPage(page: number): Promise<void> {
    console.log(`\n📄 Processing page ${page}...`);

    try {
      // Fetch movie list with retry
      const listResponse = await this.rateLimiter.execute(() =>
        retryApiCall(() => fetchOphimMovieList(page), 3, 1000)
      );

      const movieItems = listResponse.data.items || [];
      console.log(`   Found ${movieItems.length} movies`);

      // Process each movie
      for (const movieItem of movieItems) {
        await this.importMovie(movieItem);
      }

      console.log(`   ✅ Page ${page} completed`);
    } catch (error) {
      console.error(`   ❌ Page ${page} failed:`, error);
      throw error;
    }
  }

  /**
   * Import a single movie
   */
  private async importMovie(movieItem: OphimMovieListItem): Promise<void> {
    const slug = movieItem.slug;
    const ophimUrl = `https://ophim1.com/phim/${slug}`;
    this.stats.totalMoviesProcessed++;

    if (this.config.verbose) {
      console.log(`\n   🎥 Processing: ${movieItem.name} (${slug})`);
      console.log(`      Ophim URL: ${ophimUrl}`);
    } else {
      process.stdout.write('.');
    }

    try {
      // Step 1: Check if movie already exists
      if (this.config.skipExisting) {
        const existing = await db
          .select()
          .from(movies)
          .where(eq(movies.slug, slug))
          .limit(1);

        if (existing.length > 0) {
          this.stats.moviesSkipped++;
          if (this.config.verbose) {
            console.log(`      ⏭️  Already exists, skipping`);
          }
          return;
        }
      }

      // Step 2: Fetch movie details
      const movieDetail = await this.rateLimiter.execute(() =>
        retryApiCall(() => fetchOphimMovieDetail(slug), 3, 1000)
      );

      // Step 3: Transform data
      const transformed = transformOphimMovieToDbFormat(movieDetail);

      if (this.config.verbose) {
        console.log(`      📊 Transformed: ${transformed.episodes.length} episodes from ${movieDetail.data.item.episodes?.length || 0} servers`);
      }

      // Step 4: Validate data
      const movieValidation = validateMovieData(transformed.movie);
      if (!movieValidation.valid) {
        throw new Error(`Validation failed: ${movieValidation.errors.join(', ')}`);
      }

      if (this.config.validateOnly) {
        console.log(`      ✓ Validation passed`);
        this.stats.moviesImported++;
        return;
      }

      // Step 5: Insert movie into database
      await db.insert(movies).values(transformed.movie);

      // Step 6: Insert episodes with detailed logging
      let episodesInserted = 0;
      let episodesFailed = 0;
      let episodesSkipped = 0;
      
      for (const episode of transformed.episodes) {
        const episodeValidation = validateEpisodeData(episode);
        if (episodeValidation.valid) {
          try {
            await db.insert(episodes).values(episode);
            this.stats.episodesImported++;
            episodesInserted++;
            
            if (this.config.verbose) {
              console.log(`      ✅ Episode: ${episode.name} (${episode.serverName})`);
            }
          } catch (dbError: any) {
            // Handle duplicate key errors gracefully
            if (dbError.code === '23505' || dbError.message?.includes('duplicate key')) {
              episodesSkipped++;
              if (this.config.verbose) {
                console.log(`      ⏭️  Episode ${episode.name} already exists, skipping`);
              }
            } else {
              episodesFailed++;
              console.error(`      ❌ Database error for episode ${episode.name}:`, dbError.message);
            }
          }
        } else {
          episodesFailed++;
          if (this.config.verbose) {
            console.warn(`      ⚠️  Episode validation failed:`);
            console.warn(`         Name: ${episode.name || 'MISSING'}`);
            console.warn(`         Slug: ${episode.slug || 'MISSING'}`);
            console.warn(`         Server: ${episode.serverName || 'MISSING'}`);
            console.warn(`         Embed: ${episode.linkEmbed ? 'YES' : 'NO'}`);
            console.warn(`         M3U8: ${episode.linkM3u8 ? 'YES' : 'NO'}`);
            console.warn(`         Errors: ${episodeValidation.errors.join(', ')}`);
          }
        }
      }

      this.stats.moviesImported++;

      if (this.config.verbose) {
        const stats = getMovieStats(transformed);
        console.log(`      ✅ Imported: ${episodesInserted} episodes`);
        if (episodesSkipped > 0) {
          console.log(`      ⏭️  Skipped: ${episodesSkipped} episodes (duplicates)`);
        }
        if (episodesFailed > 0) {
          console.log(`      ⚠️  Failed: ${episodesFailed} episodes`);
        }
        // Log image URLs for debugging
        if (transformed.movie.posterUrl === '/placeholder-movie.svg' || 
            transformed.movie.thumbUrl === '/placeholder-movie.svg') {
          console.log(`      ℹ️  Using placeholder image (no image from API)`);
        }
      }
    } catch (error: any) {
      this.stats.moviesFailed++;
      this.stats.errors.push({
        slug,
        error: error.message || String(error),
      });

      if (this.config.verbose) {
        console.error(`      ❌ Failed:`, error.message);
      }
    }
  }

  /**
   * Print import summary
   */
  private printSummary(): void {
    const duration = ((this.stats.endTime || Date.now()) - this.stats.startTime) / 1000;

    console.log('\n\n================================');
    console.log('📊 Import Summary');
    console.log('================================');
    console.log(`Total pages processed: ${this.stats.totalPages}`);
    console.log(`Total movies processed: ${this.stats.totalMoviesProcessed}`);
    console.log(`Movies imported: ${this.stats.moviesImported} ✅`);
    console.log(`Movies skipped: ${this.stats.moviesSkipped} ⏭️`);
    console.log(`Movies failed: ${this.stats.moviesFailed} ❌`);
    console.log(`Episodes imported: ${this.stats.episodesImported}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Speed: ${(this.stats.totalMoviesProcessed / duration).toFixed(2)} movies/s`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(({ slug, error }) => {
        console.log(`   - ${slug}: ${error}`);
      });
    }

    console.log('================================\n');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): ImportConfig {
  const args = process.argv.slice(2);
  const config: ImportConfig = {
    pageStart: 1,
    pageEnd: 1,
    skipExisting: true,
    validateOnly: false,
    verbose: false,
    rateLimitMs: 500,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--page':
      case '-p':
        const page = parseInt(nextArg, 10);
        config.pageStart = page;
        config.pageEnd = page;
        i++;
        break;

      case '--start':
      case '-s':
        config.pageStart = parseInt(nextArg, 10);
        i++;
        break;

      case '--end':
      case '-e':
        config.pageEnd = parseInt(nextArg, 10);
        i++;
        break;

      case '--no-skip':
        config.skipExisting = false;
        break;

      case '--validate-only':
        config.validateOnly = true;
        break;

      case '--verbose':
      case '-v':
        config.verbose = true;
        break;

      case '--rate-limit':
        config.rateLimitMs = parseInt(nextArg, 10);
        i++;
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;

      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          printHelp();
          process.exit(1);
        }
    }
  }

  // Validation
  if (config.pageStart < 1 || config.pageEnd < 1) {
    console.error('Error: Page numbers must be >= 1');
    process.exit(1);
  }

  if (config.pageStart > config.pageEnd) {
    console.error('Error: Start page must be <= end page');
    process.exit(1);
  }

  return config;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Ophim Movie Importer

Usage:
  npx tsx scripts/import-ophim-movies.ts [OPTIONS]

Options:
  -p, --page <number>        Import a single page (e.g., --page 1)
  -s, --start <number>       Start page for range import (e.g., --start 1)
  -e, --end <number>         End page for range import (e.g., --end 5)
  --no-skip                  Re-import existing movies (default: skip)
  --validate-only            Validate data without importing
  -v, --verbose              Show detailed output
  --rate-limit <ms>          Rate limit between API calls (default: 500ms)
  -h, --help                 Show this help message

Examples:
  # Import page 1
  npx tsx scripts/import-ophim-movies.ts --page 1

  # Import pages 1 to 5
  npx tsx scripts/import-ophim-movies.ts --start 1 --end 5

  # Re-import page 1 (including existing movies)
  npx tsx scripts/import-ophim-movies.ts --page 1 --no-skip

  # Validate only (no database changes)
  npx tsx scripts/import-ophim-movies.ts --page 1 --validate-only

  # Verbose output
  npx tsx scripts/import-ophim-movies.ts --page 1 --verbose
`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const config = parseArgs();
    const importer = new OphimMovieImporter(config);
    const stats = await importer.import();

    process.exit(stats.moviesFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main();

export { OphimMovieImporter, type ImportConfig, type ImportStats };
