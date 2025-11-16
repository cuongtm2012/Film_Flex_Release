import { db } from '../server/db';
import { movies, episodes } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';

async function testAllMovieVideos() {
  console.log('🎬 Testing All Ophim Movie Video URLs\n');

  try {
    // Get all movies
    const allMovies = await db
      .select()
      .from(movies)
      .limit(5);

    console.log(`Found ${allMovies.length} movies to test\n`);

    for (const movie of allMovies) {
      console.log('─'.repeat(70));
      console.log(`\n📽️  ${movie.name}`);
      console.log(`   Slug: ${movie.slug}`);
      console.log(`   Type: ${movie.type}\n`);

      // Get first episode for this movie
      const movieEpisodes = await db
        .select()
        .from(episodes)
        .where(eq(episodes.movieSlug, movie.slug))
        .limit(1);

      if (movieEpisodes.length === 0) {
        console.log('   ⚠️  No episodes found\n');
        continue;
      }

      const ep = movieEpisodes[0];
      
      // Test iframe embed
      if (ep.linkEmbed) {
        process.stdout.write(`   Testing iframe: `);
        try {
          const response = await fetch(ep.linkEmbed, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            console.log(`✅ ${response.status} OK`);
          } else {
            console.log(`❌ ${response.status} ${response.statusText}`);
          }
        } catch (error: any) {
          console.log(`❌ ${error.message}`);
        }
      }

      // Test HLS m3u8
      if (ep.linkM3u8) {
        process.stdout.write(`   Testing HLS:    `);
        try {
          const response = await fetch(ep.linkM3u8, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            console.log(`✅ ${response.status} OK`);
          } else {
            console.log(`❌ ${response.status} ${response.statusText}`);
          }
        } catch (error: any) {
          console.log(`❌ ${error.message}`);
        }
      }

      console.log('');
    }

    console.log('─'.repeat(70));
    console.log('\n✨ Testing complete!\n');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testAllMovieVideos();
