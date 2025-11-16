#!/usr/bin/env tsx
/**
 * Validate Image URLs
 * Check if image URLs in database are accessible
 */

import { db } from '../server/db';
import { movies } from '@shared/schema';

async function validateImageUrls() {
  console.log('\n🔍 Validating Image URLs...\n');

  try {
    const result = await db
      .select({
        slug: movies.slug,
        name: movies.name,
        posterUrl: movies.posterUrl,
        thumbUrl: movies.thumbUrl,
      })
      .from(movies)
      .limit(10);

    if (result.length === 0) {
      console.log('No movies found in database');
      return;
    }

    console.log(`Testing ${result.length} movies...\n`);

    let successCount = 0;
    let failCount = 0;
    let placeholderCount = 0;

    for (const movie of result) {
      const posterUrl = movie.posterUrl;
      const thumbUrl = movie.thumbUrl;

      console.log(`📽️  ${movie.name.substring(0, 40)}...`);

      // Check poster
      if (posterUrl === '/placeholder-movie.svg') {
        console.log(`   Poster: PLACEHOLDER`);
        placeholderCount++;
      } else if (posterUrl) {
        try {
          const response = await fetch(posterUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          if (response.ok) {
            console.log(`   Poster: ✅ ${response.status} (${posterUrl.substring(0, 60)}...)`);
            successCount++;
          } else {
            console.log(`   Poster: ❌ ${response.status} ${response.statusText}`);
            failCount++;
          }
        } catch (error: any) {
          console.log(`   Poster: ❌ ${error.message}`);
          failCount++;
        }
      }

      // Check thumb
      if (thumbUrl === '/placeholder-movie.svg') {
        console.log(`   Thumb:  PLACEHOLDER`);
      } else if (thumbUrl) {
        try {
          const response = await fetch(thumbUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          if (response.ok) {
            console.log(`   Thumb:  ✅ ${response.status}`);
            successCount++;
          } else {
            console.log(`   Thumb:  ❌ ${response.status} ${response.statusText}`);
            failCount++;
          }
        } catch (error: any) {
          console.log(`   Thumb:  ❌ ${error.message}`);
          failCount++;
        }
      }

      console.log();
    }

    console.log('\n================================');
    console.log('📊 Summary');
    console.log('================================');
    console.log(`✅ Accessible: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`🖼️  Placeholder: ${placeholderCount}`);
    console.log('================================\n');

    if (failCount > 0) {
      console.log('⚠️  Some images are not accessible!');
      console.log('   Possible causes:');
      console.log('   - CDN blocking requests');
      console.log('   - CORS issues');
      console.log('   - Images deleted from source');
      console.log('   - Network connectivity\n');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

validateImageUrls();
