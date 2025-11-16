#!/usr/bin/env tsx
/**
 * Test Video URLs from Database
 * 
 * Kiểm tra các URL video từ episodes trong database
 */

import { db } from '../server/db';
import { movies, episodes } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testVideoUrls() {
  console.log('🔍 Testing Video URLs from Database\n');

  try {
    // Lấy 5 movies đầu tiên
    const moviesList = await db
      .select()
      .from(movies)
      .limit(5);

    console.log(`Found ${moviesList.length} movies\n`);

    for (const movie of moviesList) {
      console.log(`📽️  Movie: ${movie.name} (${movie.slug})`);
      
      // Lấy episodes của movie này
      const movieEpisodes = await db
        .select()
        .from(episodes)
        .where(eq(episodes.movieSlug, movie.slug))
        .limit(3);

      if (movieEpisodes.length === 0) {
        console.log('   ⚠️  No episodes found\n');
        continue;
      }

      console.log(`   Found ${movieEpisodes.length} episodes (showing first 3):\n`);

      movieEpisodes.forEach((ep, idx) => {
        console.log(`   Episode ${idx + 1}: ${ep.name}`);
        console.log(`   Server: ${ep.serverName}`);
        console.log(`   Slug: ${ep.slug}`);
        
        // Kiểm tra link_embed
        if (ep.linkEmbed) {
          console.log(`   ✅ link_embed: ${ep.linkEmbed.substring(0, 80)}...`);
          
          // Kiểm tra xem có phải iframe tag không
          if (ep.linkEmbed.includes('<iframe')) {
            console.log('   📌 Type: iframe HTML tag');
            const srcMatch = ep.linkEmbed.match(/src="([^"]+)"/);
            if (srcMatch) {
              console.log(`   📍 Extracted URL: ${srcMatch[1].substring(0, 80)}...`);
            }
          } else {
            console.log('   📌 Type: Direct URL');
          }
        } else {
          console.log('   ❌ link_embed: MISSING');
        }

        // Kiểm tra link_m3u8
        if (ep.linkM3u8) {
          console.log(`   ✅ link_m3u8: ${ep.linkM3u8.substring(0, 80)}...`);
        } else {
          console.log('   ⚠️  link_m3u8: Not available');
        }

        console.log('');
      });

      console.log('─'.repeat(80) + '\n');
    }

    console.log('✨ Test completed!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

testVideoUrls();
