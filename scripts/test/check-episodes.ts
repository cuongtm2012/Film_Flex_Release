#!/usr/bin/env tsx
/**
 * Check Episodes for a Movie
 */

import { db } from '../server/db';
import { movies, episodes } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkEpisodes() {
  const slug = 'neu-the-gioi-la-san-khau-vay-hau-truong-o-dau';
  
  console.log(`\n🔍 Checking episodes for: ${slug}\n`);

  try {
    // Get movie info
    const movie = await db
      .select()
      .from(movies)
      .where(eq(movies.slug, slug))
      .limit(1);

    if (movie.length === 0) {
      console.log('❌ Movie not found');
      process.exit(1);
    }

    console.log(`📽️  Movie: ${movie[0].name}`);
    console.log(`📺 Type: ${movie[0].type}`);
    console.log(`📊 Episodes: ${movie[0].episodeCurrent} / ${movie[0].episodeTotal}\n`);

    // Get episodes
    const eps = await db
      .select()
      .from(episodes)
      .where(eq(episodes.movieSlug, slug))
      .limit(10);

    if (eps.length === 0) {
      console.log('❌ No episodes found');
      process.exit(1);
    }

    console.log(`Found ${eps.length} episodes (showing first 10):\n`);

    eps.forEach((ep, index) => {
      console.log(`${index + 1}. Episode: ${ep.name}`);
      console.log(`   Server: ${ep.serverName}`);
      console.log(`   Slug: ${ep.slug}`);
      console.log(`   Link Embed: ${ep.linkEmbed}`);
      console.log(`   Link M3U8: ${ep.linkM3u8 || 'N/A'}`);
      console.log(`   Filename: ${ep.filename}`);
      console.log();
    });

    // Test first episode URLs
    const firstEp = eps[0];
    console.log(`🌐 Testing first episode URLs...\n`);

    if (firstEp.linkEmbed) {
      console.log(`📺 Link Embed: ${firstEp.linkEmbed}`);
      try {
        const response = await fetch(firstEp.linkEmbed, { 
          method: 'HEAD', 
          signal: AbortSignal.timeout(5000),
          redirect: 'follow'
        });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      console.log();
    }

    if (firstEp.linkM3u8) {
      console.log(`📺 Link M3U8: ${firstEp.linkM3u8}`);
      try {
        const response = await fetch(firstEp.linkM3u8, { 
          method: 'HEAD', 
          signal: AbortSignal.timeout(5000),
          redirect: 'follow'
        });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      console.log();
    }

    // Check how to play
    console.log(`\n💡 How to play:`);
    console.log(`\nOption 1: Use Link Embed (iframe)`);
    console.log(`<iframe src="${firstEp.linkEmbed}" allowfullscreen></iframe>\n`);
    
    if (firstEp.linkM3u8) {
      console.log(`Option 2: Use Link M3U8 (HLS player required)`);
      console.log(`Video.js or HLS.js required for M3U8 format\n`);
      console.log(`Example with Video.js:`);
      console.log(`<video id="player" class="video-js" controls>`);
      console.log(`  <source src="${firstEp.linkM3u8}" type="application/x-mpegURL">`);
      console.log(`</video>\n`);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

checkEpisodes();
