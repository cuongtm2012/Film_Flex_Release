#!/usr/bin/env tsx
/**
 * Check specific movie image URLs
 */

import { db } from '../server/db';
import { movies } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkMovie() {
  const slug = 'neu-the-gioi-la-san-khau-vay-hau-truong-o-dau';
  
  console.log(`\n🔍 Checking movie: ${slug}\n`);

  try {
    const result = await db
      .select({
        slug: movies.slug,
        name: movies.name,
        posterUrl: movies.posterUrl,
        thumbUrl: movies.thumbUrl,
      })
      .from(movies)
      .where(eq(movies.slug, slug));

    if (result.length === 0) {
      console.log('❌ Movie not found in database');
      process.exit(1);
    }

    const movie = result[0];
    console.log(`📽️  Name: ${movie.name}`);
    console.log(`🔗 Slug: ${movie.slug}\n`);
    console.log(`📸 Image URLs:`);
    console.log(`   Poster: ${movie.posterUrl}`);
    console.log(`   Thumb:  ${movie.thumbUrl}\n`);

    // Test if URLs are accessible
    if (movie.posterUrl && movie.posterUrl !== '/placeholder-movie.svg') {
      console.log(`🌐 Testing poster URL...`);
      try {
        const response = await fetch(movie.posterUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}\n`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    if (movie.thumbUrl && movie.thumbUrl !== '/placeholder-movie.svg') {
      console.log(`🌐 Testing thumb URL...`);
      try {
        const response = await fetch(movie.thumbUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}\n`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkMovie();
