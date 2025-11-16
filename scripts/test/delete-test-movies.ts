#!/usr/bin/env tsx
/**
 * Delete Test Movies Script
 * 
 * Xóa các movies đã import để test lại import script
 * Usage: npx tsx scripts/delete-test-movies.ts --slug movie-slug
 *        npx tsx scripts/delete-test-movies.ts --page 1 (xóa tất cả movies từ page 1)
 */

import { db } from '../server/db';
import { movies, episodes } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { fetchOphimMovieList } from '../server/services/ophim-api';

interface DeleteConfig {
  slugs: string[];
  page?: number;
  dryRun: boolean;
}

async function deleteMovies(config: DeleteConfig) {
  console.log('\n================================');
  console.log('🗑️  Delete Test Movies');
  console.log('================================\n');

  let slugsToDelete = config.slugs;

  // Nếu có page, fetch danh sách slugs từ API
  if (config.page) {
    console.log(`📄 Fetching movie list from page ${config.page}...`);
    try {
      const response = await fetchOphimMovieList(config.page);
      slugsToDelete = response.data.items.map(item => item.slug);
      console.log(`   Found ${slugsToDelete.length} movies\n`);
    } catch (error) {
      console.error('❌ Failed to fetch movie list:', error);
      process.exit(1);
    }
  }

  if (slugsToDelete.length === 0) {
    console.log('⚠️  No slugs to delete');
    process.exit(0);
  }

  console.log(`Slugs to delete (${slugsToDelete.length}):`);
  slugsToDelete.forEach(slug => console.log(`   - ${slug}`));
  console.log();

  if (config.dryRun) {
    console.log('🔍 DRY RUN - No actual deletion will occur\n');
  }

  let deletedMovies = 0;
  let deletedEpisodes = 0;
  let notFound = 0;

  for (const slug of slugsToDelete) {
    try {
      // Check if movie exists
      const existingMovie = await db
        .select()
        .from(movies)
        .where(eq(movies.slug, slug))
        .limit(1);

      if (existingMovie.length === 0) {
        notFound++;
        console.log(`   ⏭️  ${slug}: Not found in database`);
        continue;
      }

      if (!config.dryRun) {
        // Delete episodes first (foreign key constraint)
        const deletedEps = await db
          .delete(episodes)
          .where(eq(episodes.movieSlug, slug));

        // Delete movie
        await db
          .delete(movies)
          .where(eq(movies.slug, slug));

        deletedMovies++;
        deletedEpisodes += deletedEps.rowCount || 0;
        console.log(`   ✅ ${slug}: Deleted (${deletedEps.rowCount || 0} episodes)`);
      } else {
        // Dry run - just count episodes
        const existingEpisodes = await db
          .select()
          .from(episodes)
          .where(eq(episodes.movieSlug, slug));

        console.log(`   🔍 ${slug}: Would delete (${existingEpisodes.length} episodes)`);
        deletedMovies++;
        deletedEpisodes += existingEpisodes.length;
      }
    } catch (error: any) {
      console.error(`   ❌ ${slug}: Failed - ${error.message}`);
    }
  }

  console.log('\n================================');
  console.log('📊 Deletion Summary');
  console.log('================================');
  console.log(`Movies deleted: ${deletedMovies}`);
  console.log(`Episodes deleted: ${deletedEpisodes}`);
  console.log(`Not found: ${notFound}`);
  console.log('================================\n');

  if (config.dryRun) {
    console.log('💡 Run without --dry-run to actually delete');
  }
}

// Parse command line arguments
function parseArgs(): DeleteConfig {
  const args = process.argv.slice(2);
  const config: DeleteConfig = {
    slugs: [],
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--slug':
        if (args[i + 1]) {
          config.slugs.push(args[i + 1]);
          i++;
        }
        break;

      case '--page':
        if (args[i + 1]) {
          config.page = parseInt(args[i + 1], 10);
          i++;
        }
        break;

      case '--dry-run':
        config.dryRun = true;
        break;

      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx scripts/delete-test-movies.ts [options]

Options:
  --slug <slug>      Delete specific movie by slug (can use multiple times)
  --page <number>    Delete all movies from Ophim API page
  --dry-run          Show what would be deleted without actually deleting
  --help, -h         Show this help message

Examples:
  # Dry run - see what would be deleted from page 1
  npx tsx scripts/delete-test-movies.ts --page 1 --dry-run

  # Delete all movies from page 1
  npx tsx scripts/delete-test-movies.ts --page 1

  # Delete specific movie
  npx tsx scripts/delete-test-movies.ts --slug bang-tan

  # Delete multiple movies
  npx tsx scripts/delete-test-movies.ts --slug bang-tan --slug thanh-pho-xa-xoi
        `);
        process.exit(0);
    }
  }

  return config;
}

// Main execution
async function main() {
  try {
    const config = parseArgs();
    
    if (config.slugs.length === 0 && !config.page) {
      console.error('❌ Error: Must specify either --slug or --page');
      console.log('Run with --help for usage information');
      process.exit(1);
    }

    await deleteMovies(config);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
