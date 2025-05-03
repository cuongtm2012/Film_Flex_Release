// Simple script to test the search functionality manually

import fetch from 'node-fetch';

async function testSearch() {
  try {
    // Test search with diacritical marks
    console.log('Testing search with diacritical marks: "sư thành sơn hải"');
    const response1 = await fetch('http://localhost:5000/api/search?q=sư thành sơn hải');
    const data1 = await response1.json();
    
    console.log(`Search results: ${data1.items.length} items found`);
    if (data1.items.length > 0) {
      console.log('First result:', data1.items[0].slug);
    }
    
    // Test search with trailing spaces
    console.log('\nTesting search with trailing spaces: "sư thành sơn hải  "');
    const response2 = await fetch('http://localhost:5000/api/search?q=sư thành sơn hải  ');
    const data2 = await response2.json();
    
    console.log(`Search results: ${data2.items.length} items found`);
    if (data2.items.length > 0) {
      console.log('First result:', data2.items[0].slug);
    }
    
    // Test search suggestions
    console.log('\nTesting search suggestions: "sư thành"');
    const response3 = await fetch('http://localhost:5000/api/search/suggestions?q=sư thành');
    const data3 = await response3.json();
    
    console.log(`Suggestions: ${data3.items.length} items found`);
    if (data3.items.length > 0) {
      console.log('First suggestion:', data3.items[0].slug);
    }
    
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the tests
testSearch();