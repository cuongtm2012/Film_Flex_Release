import { fetchOphimMovieDetail } from '../server/services/ophim-api';

async function debugEpisodes() {
  console.log('🔍 Debugging Ophim Episode Structure\n');

  try {
    // Test with movie we know exists
    const slug = 'gio-nam-hieu-long-toi';
    console.log(`Fetching movie: ${slug}\n`);

    const movie = await fetchOphimMovieDetail(slug);
    
    if (!movie) {
      console.log('❌ Movie not found');
      return;
    }

    console.log(`Movie: ${movie.movie.name}`);
    console.log(`Type: ${movie.movie.type}`);
    console.log(`Episodes array length: ${movie.episodes?.length || 0}\n`);

    if (movie.episodes && movie.episodes.length > 0) {
      // Check first server
      const firstServer = movie.episodes[0];
      console.log('📺 First Server:');
      console.log(`   Name: ${firstServer.server_name}`);
      console.log(`   Episodes count: ${firstServer.server_data?.length || 0}\n`);

      if (firstServer.server_data && firstServer.server_data.length > 0) {
        // Check first 3 episodes
        console.log('📋 Episode Structure:\n');
        
        for (let i = 0; i < Math.min(3, firstServer.server_data.length); i++) {
          const ep = firstServer.server_data[i];
          console.log(`Episode ${i + 1}:`);
          console.log(`   name: ${JSON.stringify(ep.name)}`);
          console.log(`   slug: ${JSON.stringify(ep.slug)}`);
          console.log(`   filename: ${JSON.stringify(ep.filename)}`);
          console.log(`   link_embed: ${ep.link_embed ? '✅ EXISTS' : '❌ MISSING'}`);
          console.log(`   link_m3u8: ${ep.link_m3u8 ? '✅ EXISTS' : '❌ MISSING'}`);
          console.log('');
        }

        // Check for missing data
        const missingName = firstServer.server_data.filter((ep: any) => !ep.name);
        const missingLinks = firstServer.server_data.filter((ep: any) => !ep.link_embed && !ep.link_m3u8);
        
        console.log('⚠️  Issues Found:');
        console.log(`   Episodes without name: ${missingName.length}`);
        console.log(`   Episodes without any video link: ${missingLinks.length}`);

        if (missingName.length > 0) {
          console.log('\n   Episodes missing name:');
          missingName.slice(0, 3).forEach((ep: any, idx: number) => {
            console.log(`      ${idx + 1}. slug: ${ep.slug}, filename: ${ep.filename}`);
          });
        }
      }
    } else {
      console.log('❌ No episodes found in API response');
    }

    // Show raw structure
    console.log('\n📦 Raw Episode Object (first one):');
    if (movie.episodes?.[0]?.server_data?.[0]) {
      console.log(JSON.stringify(movie.episodes[0].server_data[0], null, 2));
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

debugEpisodes();
