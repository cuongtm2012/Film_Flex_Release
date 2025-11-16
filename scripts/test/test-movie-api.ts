import fetch from 'node-fetch';

async function testVideoUrl(url: string) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
  } catch (error: any) {
    console.log(`  Error: ${error.message}`);
  }
}

async function testMovieAPI() {
  const slug = 'neu-the-gioi-la-san-khau-vay-hau-truong-o-dau';
  const apiUrl = `http://localhost:5000/api/movies/${slug}`;

  console.log(`Testing API: ${apiUrl}\n`);

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json() as any;
    
    console.log('Movie:', data.movie?.name);
    console.log('Type:', data.movie?.type);
    console.log('Episodes count:', data.movie?.current_episode);
    console.log('\n--- Episodes Structure ---');
    
    if (data.episodes && data.episodes.length > 0) {
      console.log(`Total servers: ${data.episodes.length}`);
      
      for (const [idx, server] of data.episodes.entries()) {
        console.log(`\nServer ${idx + 1}: ${server.server_name}`);
        console.log(`Episodes in this server: ${server.server_data.length}`);
        
        // Show first episode details
        if (server.server_data[0]) {
          const ep = server.server_data[0];
          console.log('\nFirst Episode:');
          console.log(`  Name: ${ep.name}`);
          console.log(`  Slug: ${ep.slug}`);
          console.log(`  Link Embed: ${ep.link_embed}`);
          console.log(`  Link M3U8: ${ep.link_m3u8 || 'N/A'}`);
          
          // Test video URL
          console.log('\n  Testing Link Embed...');
          await testVideoUrl(ep.link_embed);
        }
      }
    } else {
      console.log('❌ No episodes found!');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testMovieAPI();
