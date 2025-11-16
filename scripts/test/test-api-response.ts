#!/usr/bin/env tsx
/**
 * Test API Response
 * Check what the actual API is returning
 */

async function testApiResponse() {
  console.log('\n🔍 Testing API Response...\n');

  try {
    const response = await fetch('http://localhost:5000/api/movies/recommended');
    const data = await response.json();

    console.log('API Endpoint: /api/movies/recommended');
    console.log(`Status: ${response.status}\n`);

    if (data && Array.isArray(data) && data.length > 0) {
      const firstMovie = data[0];
      console.log('First movie in response:');
      console.log(JSON.stringify(firstMovie, null, 2));
      
      console.log('\n📸 Image URLs:');
      console.log(`   thumbUrl: ${firstMovie.thumbUrl}`);
      console.log(`   posterUrl: ${firstMovie.posterUrl}`);
      console.log(`   thumb_url: ${firstMovie.thumb_url}`);
      console.log(`   poster_url: ${firstMovie.poster_url}`);

      // Test if images are accessible
      if (firstMovie.thumbUrl || firstMovie.thumb_url) {
        const imageUrl = firstMovie.thumbUrl || firstMovie.thumb_url;
        console.log(`\n🌐 Testing image URL: ${imageUrl.substring(0, 80)}...`);
        try {
          const imgResponse = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          console.log(`   Status: ${imgResponse.status} ${imgResponse.statusText}`);
          console.log(`   Content-Type: ${imgResponse.headers.get('content-type')}`);
        } catch (error: any) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    } else {
      console.log('No movies in response');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testApiResponse();
