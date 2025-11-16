#!/usr/bin/env tsx
/**
 * Check Image URLs in Database
 * Verify what image URLs are actually stored
 */

import { db } from '../server/db';
import { movies } from '@shared/schema';

async function checkImageUrls() {
  console.log('\n🔍 Checking Image URLs in Database...\n');

  try {
    const result = await db
      .select({
        slug: movies.slug,
        name: movies.name,
        posterUrl: movies.posterUrl,
        thumbUrl: movies.thumbUrl,
      })
      .from(movies)
      .limit(5);

    if (result.length === 0) {
      console.log('No movies found in database');
      return;
    }

    console.log(`Found ${result.length} recent movies:\n`);

    result.forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.name} (${movie.slug})`);
      console.log(`   Poster: ${movie.posterUrl}`);
      console.log(`   Thumb:  ${movie.thumbUrl}`);
      console.log();
    });

    // Check for placeholder usage
    const placeholderCount = result.filter(
      m => m.posterUrl === '/placeholder-movie.svg' || 
           m.thumbUrl === '/placeholder-movie.svg'
    ).length;

    if (placeholderCount > 0) {
      console.log(`⚠️  ${placeholderCount} movies using placeholder image`);
    }

    // Check URL patterns
    const cdnCount = result.filter(
      m => m.posterUrl?.includes('ophim.live') || 
           m.thumbUrl?.includes('ophim.live')
    ).length;

    if (cdnCount > 0) {
      console.log(`✅ ${cdnCount} movies using Ophim CDN images`);
    }

    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkImageUrls();
