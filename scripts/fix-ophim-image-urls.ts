#!/usr/bin/env tsx
/**
 * Fix Image URLs for Ophim Movies
 * 
 * Update incorrect URLs to correct format:
 * FROM: https://img.ophim.live/uploads/{filename}
 * TO:   https://img.ophim.live/uploads/movies/{filename}
 */

import { db } from '../server/db';
import { movies } from '@shared/schema';
import { like, sql } from 'drizzle-orm';

async function fixImageUrls() {
  console.log('\n🔧 Fixing Ophim Image URLs...\n');

  try {
    // Find movies with incorrect Ophim URLs
    const incorrectMovies = await db
      .select({
        id: movies.id,
        slug: movies.slug,
        name: movies.name,
        posterUrl: movies.posterUrl,
        thumbUrl: movies.thumbUrl,
      })
      .from(movies)
      .where(
        sql`${movies.posterUrl} LIKE 'https://img.ophim.live/uploads/%' 
            AND ${movies.posterUrl} NOT LIKE 'https://img.ophim.live/uploads/movies/%'`
      );

    console.log(`Found ${incorrectMovies.length} movies with incorrect URLs\n`);

    if (incorrectMovies.length === 0) {
      console.log('✅ All URLs are already correct!');
      process.exit(0);
    }

    let fixed = 0;
    let failed = 0;

    for (const movie of incorrectMovies) {
      try {
        // Extract filename from old URL
        const posterFilename = movie.posterUrl?.replace('https://img.ophim.live/uploads/', '');
        const thumbFilename = movie.thumbUrl?.replace('https://img.ophim.live/uploads/', '');

        // Create new URLs
        const newPosterUrl = posterFilename 
          ? `https://img.ophim.live/uploads/movies/${posterFilename}`
          : movie.posterUrl;
        
        const newThumbUrl = thumbFilename
          ? `https://img.ophim.live/uploads/movies/${thumbFilename}`
          : movie.thumbUrl;

        // Update database
        await db
          .update(movies)
          .set({
            posterUrl: newPosterUrl,
            thumbUrl: newThumbUrl,
          })
          .where(sql`${movies.id} = ${movie.id}`);

        console.log(`✅ ${movie.slug}`);
        console.log(`   Old: ${movie.thumbUrl?.substring(0, 70)}...`);
        console.log(`   New: ${newThumbUrl?.substring(0, 70)}...`);
        fixed++;

      } catch (error: any) {
        console.error(`❌ Failed to fix ${movie.slug}: ${error.message}`);
        failed++;
      }
    }

    console.log('\n================================');
    console.log('📊 Summary');
    console.log('================================');
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('================================\n');

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

fixImageUrls();
