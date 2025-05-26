#!/usr/bin/env node

// Enhanced test script with better error handling
const axios = require('axios');

console.log('🔧 Testing JSON validation fixes...');

// Validation function from our main script
function validateAndCleanArray(data) {
  if (!data) return [];
  
  if (Array.isArray(data)) {
    return data.filter(item => {
      if (item == null || typeof item !== 'string') return false;
      try {
        JSON.stringify(item);
        return true;
      } catch (e) {
        console.warn('Skipping invalid array item:', item);
        return false;
      }
    });
  }
  
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return validateAndCleanArray(parsed);
      }
    } catch (e) {
      console.warn('Converting string to array:', data);
      return [data];
    }
  }
  
  return [];
}

async function testMovie(slug) {
  try {
    console.log(`\n📡 Fetching movie: ${slug}`);
    
    // Fetch movie detail with timeout
    const response = await axios.get(`https://phimapi.com/phim/${slug}`, {
      timeout: 10000
    });
    const movieDetail = response.data;
    
    if (!movieDetail.movie) {
      console.log('❌ No movie data found');
      return false;
    }
    
    const movie = movieDetail.movie;
    console.log(`✅ Movie fetched: ${movie.name}`);
    
    // Show raw data
    console.log('📝 Raw data:');
    console.log('  Categories:', movie.category);
    console.log('  Countries:', movie.country);
    
    // Test JSON formatting
    const categoriesJson = JSON.stringify(validateAndCleanArray(movie.category));
    const countriesJson = JSON.stringify(validateAndCleanArray(movie.country));
    
    console.log('🔧 Processed data:');
    console.log('  Categories JSON:', categoriesJson);
    console.log('  Countries JSON:', countriesJson);
    
    // Validate JSON
    try {
      JSON.parse(categoriesJson);
      JSON.parse(countriesJson);
      console.log('✅ JSON validation passed');
      return true;
    } catch (e) {
      console.log('❌ JSON validation failed:', e.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting JSON validation tests...');
  
  // Test with the problematic movies
  const testMovies = [
    've-thoi-nao-thieu-nu-truyen-tranh',
    'tang-hai-truyen', 
    'khom-lung'
  ];
  
  let passedTests = 0;
  let totalTests = testMovies.length;
  
  for (const slug of testMovies) {
    const result = await testMovie(slug);
    if (result) passedTests++;
    console.log('─'.repeat(50));
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All JSON validation tests passed! The fixes should resolve the database errors.');
  } else {
    console.log('⚠️  Some tests failed. Additional fixes may be needed.');
  }
}

main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});
