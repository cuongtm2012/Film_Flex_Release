import fetch from 'node-fetch';

async function testHLSFallback() {
  const slug = 'neu-the-gioi-la-san-khau-vay-hau-truong-o-dau';
  const apiUrl = `http://localhost:5000/api/movies/${slug}`;

  console.log('🎬 Testing HLS Fallback Implementation\n');
  console.log(`Fetching: ${apiUrl}\n`);

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json() as any;
    
    console.log(`Movie: ${data.movie?.name}`);
    console.log(`Type: ${data.movie?.type}\n`);
    
    if (data.episodes && data.episodes.length > 0) {
      const server = data.episodes[0];
      console.log(`Server: ${server.server_name}`);
      console.log(`Total Episodes: ${server.server_data.length}\n`);
      
      if (server.server_data[0]) {
        const ep = server.server_data[0];
        
        console.log('📺 Episode 1 Video Sources:');
        console.log('─'.repeat(60));
        console.log(`\n1️⃣ Primary (Iframe Embed):`);
        console.log(`   URL: ${ep.link_embed}`);
        
        // Test iframe embed
        console.log(`   Testing...`);
        try {
          const embedResponse = await fetch(ep.link_embed, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          const embedStatus = `${embedResponse.status} ${embedResponse.statusText}`;
          console.log(`   Status: ${embedStatus}`);
          
          if (embedResponse.status === 502) {
            console.log(`   ⚠️  Server unavailable - HLS fallback will activate`);
          } else if (embedResponse.ok) {
            console.log(`   ✅ Working - iframe will load`);
          }
        } catch (error: any) {
          console.log(`   ❌ Error: ${error.message}`);
        }

        console.log(`\n2️⃣ Fallback (HLS m3u8):`);
        console.log(`   URL: ${ep.link_m3u8 || 'N/A'}`);
        
        if (ep.link_m3u8) {
          console.log(`   Testing...`);
          try {
            const hlsResponse = await fetch(ep.link_m3u8, {
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            const hlsStatus = `${hlsResponse.status} ${hlsResponse.statusText}`;
            console.log(`   Status: ${hlsStatus}`);
            
            if (hlsResponse.status === 502) {
              console.log(`   ⚠️  Server unavailable - both sources down`);
            } else if (hlsResponse.ok) {
              console.log(`   ✅ Working - HLS fallback available`);
            }
          } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
          }
        }

        console.log('\n' + '─'.repeat(60));
        console.log('\n🔄 Fallback Logic:');
        console.log('   1. Try iframe embed first (link_embed)');
        console.log('   2. If iframe fails/times out → auto-switch to HLS');
        console.log('   3. If both fail → show error message');
        console.log('   4. User can manually switch to HLS anytime\n');

        console.log('📱 Frontend Implementation:');
        console.log('   - VideoPlayer component now supports both formats');
        console.log('   - Automatic fallback after 8 seconds');
        console.log('   - Manual "Switch to HLS" button available');
        console.log('   - Video.js handles HLS playback\n');
      }
    } else {
      console.log('❌ No episodes found!');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testHLSFallback();
