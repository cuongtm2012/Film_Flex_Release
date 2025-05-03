// Test script for special characters in search keywords

import fetch from 'node-fetch';

async function testSpecialCharactersSearch() {
  try {
    // Test array of search terms with special characters and spaces
    const testTerms = [
      'sư thành*sơn hải',   // With asterisk
      'sư thành & sơn hải', // With ampersand
      'sư thành   sơn hải', // With multiple spaces
      '  sư thành sơn hải', // With leading spaces
      '(sư thành sơn hải)'  // With parentheses
    ];
    
    let allTestsPassed = true;
    
    for (const term of testTerms) {
      console.log(`\nTesting search with special characters: "${term}"`);
      
      // Encode the search term for URL
      const encodedTerm = encodeURIComponent(term);
      const response = await fetch(`http://localhost:5000/api/search?q=${encodedTerm}`);
      const data = await response.json();
      
      console.log(`Search results: ${data.items.length} items found`);
      
      if (data.status === true) {
        console.log('✅ Test passed: Search endpoint handled special characters properly');
        
        // Check if the expected movie is found (for our example, su-thanh-son-hai should be found)
        if (data.items.length > 0) {
          const foundExpectedMovie = data.items.some(movie => movie.slug === 'su-thanh-son-hai');
          if (foundExpectedMovie) {
            console.log('✅ Test passed: The expected movie was found despite special characters');
          } else {
            console.log('❓ Note: No expected movie was found, but the API handled the request correctly');
            allTestsPassed = false;
          }
        }
      } else {
        console.log('❌ Test failed: Search endpoint returned an error for special characters');
        allTestsPassed = false;
      }
    }
    
    console.log('\nSpecial Characters Search Test Summary:');
    if (allTestsPassed) {
      console.log('✅ All tests passed: Search functionality handles special characters properly');
    } else {
      console.log('❌ Some tests failed: Search functionality has issues with special characters');
    }
    
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the test
testSpecialCharactersSearch();