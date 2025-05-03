// Movie Detail API tests

import fetch from 'node-fetch';

/**
 * Test movie detail viewing
 * This test covers:
 * 1. Fetching a specific movie by slug
 * 2. Fetching episodes for a specific movie
 * 3. Handling non-existent movie slug
 */
async function testMovieDetailViewing() {
  console.log('\n=== Testing Movie Detail API ===');
  
  try {
    // 1. Test fetching a specific movie
    console.log('\n1. Testing fetching a specific movie...');
    const movieSlug = 'su-thanh-son-hai';
    const response1 = await fetch(`http://localhost:5000/api/movies/${movieSlug}`);
    
    console.log(`Status code: ${response1.status}`);
    
    if (response1.status === 200) {
      const data1 = await response1.json();
      console.log('✅ Test passed: Movie details fetched successfully');
      console.log(`Movie name: ${data1.movie.name}`);
      console.log(`Movie original name: ${data1.movie.origin_name}`);
      
      // Check for required fields
      const requiredFields = ['name', 'origin_name', 'poster_url', 'thumb_url', 'description', 'status'];
      const missingFields = requiredFields.filter(field => !data1.movie[field]);
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields are present');
      } else {
        console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // 2. Test fetching episodes for the movie
      console.log('\n2. Testing fetching episodes for the movie...');
      const response2 = await fetch(`http://localhost:5000/api/movies/${movieSlug}/episodes`);
      
      console.log(`Status code: ${response2.status}`);
      
      if (response2.status === 200) {
        const data2 = await response2.json();
        console.log('✅ Test passed: Episodes fetched successfully');
        
        // Handle different response formats
        const episodes = data2.items || data2.episodes || [];
        const episodeCount = Array.isArray(episodes) ? episodes.length : 0;
        
        console.log(`Episodes found: ${episodeCount}`);
        
        if (episodeCount > 0) {
          const firstEpisode = episodes[0];
          console.log(`First episode name: ${firstEpisode.name || 'Unnamed'}`);
          console.log(`First episode embed link: ${firstEpisode.link_embed ? 'Present' : 'Missing'}`);
          
          // Check episode fields
          const episodeRequiredFields = ['name', 'slug', 'link_embed'];
          const missingEpisodeFields = episodeRequiredFields.filter(field => !firstEpisode[field]);
          
          if (missingEpisodeFields.length === 0) {
            console.log('✅ All required episode fields are present');
          } else {
            console.log(`❌ Missing required episode fields: ${missingEpisodeFields.join(', ')}`);
          }
        } else {
          console.log('❌ No episodes found for the movie');
        }
      } else {
        console.log('❌ Test failed: Could not fetch episodes');
      }
    } else {
      console.log('❌ Test failed: Could not fetch movie details');
    }
    
    // 3. Test handling non-existent movie slug
    console.log('\n3. Testing handling of non-existent movie slug...');
    const fakeSlug = 'non-existent-movie-slug-12345';
    const response3 = await fetch(`http://localhost:5000/api/movies/${fakeSlug}`);
    
    console.log(`Status code: ${response3.status}`);
    
    if (response3.status === 404) {
      console.log('✅ Test passed: Non-existent movie returns 404');
    } else {
      console.log('❌ Test failed: Non-existent movie did not return 404');
      if (response3.status === 200) {
        const data3 = await response3.json();
        console.log(`Instead returned: ${JSON.stringify(data3)}`);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error during movie detail tests:', error);
  }
  
  console.log('\n=== Movie Detail API Tests Completed ===');
}

// Run the tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testMovieDetailViewing();
}

export { testMovieDetailViewing };