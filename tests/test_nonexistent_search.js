// Test script for non-existent search keywords

import fetch from 'node-fetch';

async function testNonExistentSearch() {
  try {
    // Test search with a non-existent keyword
    console.log('Testing search with non-existent keyword: "nonexistentmovietitle12345"');
    const response = await fetch('http://localhost:5000/api/search?q=nonexistentmovietitle12345');
    const data = await response.json();
    
    console.log(`Search results: ${data.items.length} items found`);
    console.log('Pagination info:', data.pagination);
    
    if (data.items.length === 0) {
      console.log('✅ Test passed: No results found for non-existent keyword');
    } else {
      console.log('❌ Test failed: Results found for non-existent keyword');
    }
    
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the test
testNonExistentSearch();