#!/usr/bin/env tsx
/**
 * Video Player Test Script
 * 
 * Test video URLs from database and check their availability
 */

import { db } from '../server/db';
import { movies, episodes } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testVideoPlayer() {
  console.log('🎬 Testing Video Player URLs\n');
  console.log('='.repeat(70));

  try {
    // Get a sample movie with episodes
    const movieList = await db
      .select()
      .from(movies)
      .limit(5);

    console.log(`\n📊 Found ${movieList.length} movies in database\n`);

    for (const movie of movieList) {
      console.log(`\n🎥 Movie: ${movie.name} (${movie.slug})`);
      console.log(`   Type: ${movie.type}`);
      console.log(`   Status: ${movie.status}`);

      // Get episodes for this movie
      const movieEpisodes = await db
        .select()
        .from(episodes)
        .where(eq(episodes.movieSlug, movie.slug))
        .limit(3);

      console.log(`   Episodes: ${movieEpisodes.length}`);

      if (movieEpisodes.length > 0) {
        console.log('\n   📺 Episode Details:');
        movieEpisodes.forEach((ep, idx) => {
          console.log(`\n   Episode ${idx + 1}: ${ep.name} (${ep.serverName})`);
          console.log(`   ├─ Slug: ${ep.slug}`);
          console.log(`   ├─ Embed URL: ${ep.linkEmbed || 'MISSING ❌'}`);
          console.log(`   └─ M3U8 URL: ${ep.linkM3u8 || 'MISSING ❌'}`);

          // Check URL format
          if (ep.linkEmbed) {
            const isValidUrl = ep.linkEmbed.startsWith('http');
            console.log(`      Embed Valid: ${isValidUrl ? '✅' : '❌'}`);
            
            // Check if it's iframe tag or direct URL
            if (ep.linkEmbed.includes('<iframe')) {
              console.log(`      Format: iframe tag (needs extraction)`);
              const srcMatch = ep.linkEmbed.match(/src="([^"]+)"/);
              if (srcMatch) {
                console.log(`      Extracted URL: ${srcMatch[1]}`);
              }
            } else {
              console.log(`      Format: direct URL`);
            }

            // Check domain
            try {
              const url = new URL(ep.linkEmbed.includes('<iframe') 
                ? ep.linkEmbed.match(/src="([^"]+)"/)?.[1] || ''
                : ep.linkEmbed
              );
              console.log(`      Domain: ${url.hostname}`);
              
              // Check if domain is in CSP
              const knownDomains = [
                'player.phimapi.com',
                'vip.opstream12.com',
                'vip.opstream17.com',
                'vip.opstream90.com'
              ];
              const isKnownDomain = knownDomains.some(d => url.hostname.includes(d));
              console.log(`      In CSP whitelist: ${isKnownDomain ? '✅' : '⚠️  May need CSP update'}`);
            } catch (e) {
              console.log(`      ⚠️  Invalid URL format`);
            }
          }

          if (ep.linkM3u8) {
            const isValidUrl = ep.linkM3u8.startsWith('http');
            console.log(`      M3U8 Valid: ${isValidUrl ? '✅' : '❌'}`);
            console.log(`      M3U8 Format: ${ep.linkM3u8.endsWith('.m3u8') ? '✅' : '⚠️  Not .m3u8'}`);
          }
        });
      } else {
        console.log('   ⚠️  No episodes found');
      }

      console.log('\n' + '-'.repeat(70));
    }

    console.log('\n\n✅ Test completed!\n');
    console.log('📋 Next Steps:');
    console.log('1. Check if embed URLs are accessible from browser');
    console.log('2. Verify domains are in CSP whitelist');
    console.log('3. Test video playback in localhost');
    console.log('4. Check browser console for CORS/CSP errors\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

testVideoPlayer();
