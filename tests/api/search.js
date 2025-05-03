// Search API tests

import fetch from 'node-fetch';

/**
 * Test search functionality
 * This test covers:
 * 1. Searching with a valid keyword
 * 2. Searching with a non-existent keyword
 * 3. Searching with special characters and whitespace
 * 4. Getting search suggestions
 */
async function testSearch() {
  console.log('\n=== Testing Search API ===');
  
  try {
    // 1. Test search with valid keyword
    console.log('\n1. Testing search with valid keyword...');
    const validKeyword = 'sư thành sơn hải';
    const response1 = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(validKeyword)}`);
    const data1 = await response1.json();
    
    console.log(`Status code: ${response1.status}`);
    console.log(`Results found: ${data1.items.length}`);
    
    if (data1.items.length > 0) {
      console.log('✅ Test passed: Valid keyword search returns results');
      console.log(`First result: ${data1.items[0].name} (${data1.items[0].slug})`);
      
      // Check if the expected movie is in the results
      const expectedSlug = 'su-thanh-son-hai';
      const foundExpectedMovie = data1.items.some(movie => movie.slug === expectedSlug);
      
      if (foundExpectedMovie) {
        console.log(`✅ Expected movie "${expectedSlug}" found in search results`);
      } else {
        console.log(`❌ Expected movie "${expectedSlug}" not found in search results`);
      }
    } else {
      console.log('❌ Test failed: No results found for valid keyword search');
    }
    
    // 2. Test search with non-existent keyword
    console.log('\n2. Testing search with non-existent keyword...');
    const nonExistentKeyword = 'nonexistentmovietitle12345';
    const response2 = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(nonExistentKeyword)}`);
    const data2 = await response2.json();
    
    console.log(`Status code: ${response2.status}`);
    console.log(`Results found: ${data2.items.length}`);
    
    if (data2.items.length === 0) {
      console.log('✅ Test passed: Non-existent keyword search returns no results');
    } else {
      console.log('❌ Test failed: Non-existent keyword search returned results');
    }
    
    // 3. Test search with special characters and whitespace
    console.log('\n3. Testing search with special characters and whitespace...');
    const specialCharsKeyword = '  sư thành sơn hải  ';
    const response3 = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(specialCharsKeyword)}`);
    const data3 = await response3.json();
    
    console.log(`Status code: ${response3.status}`);
    console.log(`Results found: ${data3.items.length}`);
    
    if (data3.items.length > 0) {
      console.log('✅ Test passed: Search with special characters and whitespace returns results');
      console.log(`First result: ${data3.items[0].name} (${data3.items[0].slug})`);
    } else {
      console.log('❌ Test failed: No results found for search with special characters and whitespace');
    }
    
    // 4. Test search suggestions
    console.log('\n4. Testing search suggestions...');
    const partialKeyword = 'sư thành';
    const response4 = await fetch(`http://localhost:5000/api/search/suggestions?q=${encodeURIComponent(partialKeyword)}`);
    const data4 = await response4.json();
    
    console.log(`Status code: ${response4.status}`);
    console.log(`Suggestions found: ${data4.items.length}`);
    
    if (data4.items.length > 0) {
      console.log('✅ Test passed: Search suggestions returns results');
      console.log(`First suggestion: ${data4.items[0].name} (${data4.items[0].slug})`);
    } else {
      console.log('❌ Test failed: No results found for search suggestions');
    }
    
  } catch (error) {
    console.error('Unexpected error during search tests:', error);
  }
  
  console.log('\n=== Search API Tests Completed ===');
}

// Run the tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testSearch();
}

export { testSearch };