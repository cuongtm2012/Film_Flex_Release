import { fetchOphimMovieList, fetchOphimMovieDetail } from '../server/services/ophim-api';

async function debugOphimAPI() {
  console.log('🔍 Debugging Ophim API Response Structure\n');

  try {
    // Fetch first page
    console.log('📄 Fetching page 1...');
    const listResponse = await fetchOphimMovieList(1);
    
    if (!listResponse.data.items || listResponse.data.items.length === 0) {
      console.log('❌ No movies found on page 1');
      return;
    }

    const firstMovie = listResponse.data.items[0];
    console.log(`\n✅ Found ${listResponse.data.items.length} movies`);
    console.log(`\n📽️  First movie: ${firstMovie.name}`);
    console.log(`   Slug: ${firstMovie.slug}`);
    console.log(`   Ophim URL: https://ophim1.com/phim/${firstMovie.slug}`);

    // Fetch movie details
    console.log(`\n📡 Fetching movie details for: ${firstMovie.slug}...`);
    const detailResponse = await fetchOphimMovieDetail(firstMovie.slug);
    const movie = detailResponse.data.item;

    console.log('\n' + '='.repeat(70));
    console.log('📊 MOVIE DETAIL STRUCTURE');
    console.log('='.repeat(70));
    
    console.log('\n🎬 Basic Info:');
    console.log(`   Name: ${movie.name}`);
    console.log(`   Origin Name: ${movie.origin_name}`);
    console.log(`   Type: ${movie.type}`);
    console.log(`   Status: ${movie.status}`);
    console.log(`   Year: ${movie.year}`);
    console.log(`   Quality: ${movie.quality}`);
    console.log(`   Language: ${movie.lang}`);

    console.log('\n🖼️  Images:');
    console.log(`   Poster: ${movie.poster_url}`);
    console.log(`   Thumb: ${movie.thumb_url}`);
    console.log(`   CDN: ${detailResponse.data.APP_DOMAIN_CDN_IMAGE}`);

    console.log('\n📺 Episodes:');
    if (movie.episodes && movie.episodes.length > 0) {
      console.log(`   Total servers: ${movie.episodes.length}`);
      
      movie.episodes.forEach((server: any, idx: number) => {
        console.log(`\n   Server ${idx + 1}: ${server.server_name}`);
        console.log(`   Total episodes: ${server.server_data.length}`);
        
        if (server.server_data.length > 0) {
          const ep = server.server_data[0];
          console.log('\n   First Episode Structure:');
          console.log(`   ${JSON.stringify(ep, null, 6)}`);
          
          console.log('\n   Episode Fields:');
          console.log(`      name: ${ep.name || 'MISSING ❌'}`);
          console.log(`      slug: ${ep.slug || 'MISSING ❌'}`);
          console.log(`      filename: ${ep.filename || 'MISSING ❌'}`);
          console.log(`      link_embed: ${ep.link_embed || 'MISSING ❌'}`);
          console.log(`      link_m3u8: ${ep.link_m3u8 || 'MISSING ❌'}`);

          // Check if all episodes have name
          const episodesWithoutName = server.server_data.filter((e: any) => !e.name);
          if (episodesWithoutName.length > 0) {
            console.log(`\n   ⚠️  ${episodesWithoutName.length}/${server.server_data.length} episodes MISSING 'name' field!`);
          } else {
            console.log(`\n   ✅ All ${server.server_data.length} episodes have 'name' field`);
          }

          // Check video links
          const episodesWithoutLinks = server.server_data.filter((e: any) => !e.link_embed && !e.link_m3u8);
          if (episodesWithoutLinks.length > 0) {
            console.log(`   ⚠️  ${episodesWithoutLinks.length}/${server.server_data.length} episodes MISSING video links!`);
          } else {
            console.log(`   ✅ All episodes have at least one video link`);
          }
        }
      });
    } else {
      console.log('   ❌ No episodes found!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 RECOMMENDATIONS:');
    
    // Check common issues
    const server = movie.episodes[0];
    const firstEp = server.server_data[0];
    
    if (!firstEp.name) {
      console.log('   ⚠️  Episodes are MISSING "name" field');
      console.log('   → Need to generate name from slug or index');
    }
    
    if (!firstEp.link_embed && !firstEp.link_m3u8) {
      console.log('   ⚠️  Episodes are MISSING video links');
      console.log('   → This movie cannot be played');
    }

    console.log('\n✨ Debug complete!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

debugOphimAPI();
