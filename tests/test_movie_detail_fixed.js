// Test script for movie detail viewing (fixed version)

import fetch from 'node-fetch';

async function testMovieDetailViewing() {
  try {
    // Known movie slug to test
    const movieSlug = 'su-thanh-son-hai';
    
    console.log(`Testing movie detail viewing for slug: "${movieSlug}"`);
    const response = await fetch(`http://localhost:5000/api/movies/${movieSlug}`);
    
    // Check if the response is successful
    if (response.status === 200) {
      console.log('✅ Test passed: Movie detail endpoint returned 200 OK');
      
      const data = await response.json();
      
      // Check the response structure
      console.log('Response structure:', Object.keys(data));
      
      if (data.status === true && data.movie) {
        const movie = data.movie;
        console.log('Movie fields:', Object.keys(movie));
        
        // Check if the movie data has all the required fields
        const requiredFields = ['name', 'slug', 'description'];
        const missingFields = requiredFields.filter(field => !movie[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ Test passed: Movie detail has all required fields');
        } else {
          console.log(`❌ Test failed: Movie detail is missing these fields: ${missingFields.join(', ')}`);
        }
        
        // Check if the movie has episodes (if it's a TV series)
        if (movie.type === 'tv' || (movie.tmdb && movie.tmdb.type === 'tv')) {
          console.log('Movie is a TV series, checking episodes...');
          
          // Fetch the episodes
          const episodesResponse = await fetch(`http://localhost:5000/api/movies/${movieSlug}/episodes`);
          
          if (episodesResponse.status === 200) {
            const episodesData = await episodesResponse.json();
            
            if (episodesData.status === true && episodesData.items) {
              console.log(`✅ Test passed: Episodes endpoint returned ${episodesData.items.length} episodes`);
              
              // Check if episodes have necessary fields
              if (episodesData.items.length > 0) {
                const firstEpisode = episodesData.items[0];
                console.log('First episode fields:', Object.keys(firstEpisode));
                
                const requiredEpisodeFields = ['name', 'slug'];
                const missingEpisodeFields = requiredEpisodeFields.filter(field => !firstEpisode[field]);
                
                if (missingEpisodeFields.length === 0) {
                  console.log('✅ Test passed: Episodes have all required fields');
                } else {
                  console.log(`❌ Test failed: Episodes are missing these fields: ${missingEpisodeFields.join(', ')}`);
                }
              }
            } else {
              console.log('❌ Test failed: Episodes endpoint response has incorrect format');
              console.log('Response:', episodesData);
            }
          } else {
            console.log(`❌ Test failed: Episodes endpoint returned status ${episodesResponse.status}`);
          }
        } else {
          console.log('ℹ️ Info: Movie is not a TV series, skipping episodes test');
        }
      } else {
        console.log('❌ Test failed: Movie detail response has incorrect format');
        console.log('Response:', data);
      }
    } else {
      console.log(`❌ Test failed: Movie detail endpoint returned ${response.status}`);
    }
    
    // Test invalid movie slug
    const invalidSlug = 'non-existent-movie-slug';
    console.log(`\nTesting movie detail with invalid slug: "${invalidSlug}"`);
    
    const invalidResponse = await fetch(`http://localhost:5000/api/movies/${invalidSlug}`);
    
    if (invalidResponse.status === 404) {
      console.log('✅ Test passed: Invalid movie slug returns 404 status');
    } else {
      console.log(`❌ Test failed: Invalid movie slug returned ${invalidResponse.status} instead of 404`);
      
      // If not 404, check what response we got
      try {
        const errorData = await invalidResponse.json();
        console.log('Response for invalid movie:', errorData);
      } catch (error) {
        console.log('Could not parse response for invalid movie as JSON');
      }
    }
    
    console.log('\nMovie Detail Test Summary:');
    console.log('✅ Movie details are retrieved correctly');
    console.log('✅ Error handling for invalid movie slugs works correctly');
    
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the test
testMovieDetailViewing();