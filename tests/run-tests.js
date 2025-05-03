// Main test runner
import { testSearch } from './api/search.js';
import { testAuthentication } from './api/auth.js';
import { testMovieDetailViewing } from './api/movie-detail.js';
import { testFilterFunctionality } from './api/filter.js';

/**
 * Log a section header with consistent formatting
 */
function logTestSection(section) {
  console.log('\n\n==============================================');
  console.log(`RUNNING TEST SECTION: ${section}`);
  console.log('==============================================\n');
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('====== FILMFLEX TEST SUITE ======');
  console.log('Starting test run at:', new Date().toLocaleString());
  console.log('================================\n');
  
  try {
    // Run API Tests
    logTestSection('API - SEARCH');
    await testSearch();
    
    logTestSection('API - AUTHENTICATION');
    await testAuthentication();
    
    logTestSection('API - MOVIE DETAIL');
    await testMovieDetailViewing();
    
    logTestSection('API - FILTER FUNCTIONALITY');
    await testFilterFunctionality();
    
    // Add other test sections here as they are implemented
    
    console.log('\n\n====== TEST RUN COMPLETE ======');
    console.log('Tests completed at:', new Date().toLocaleString());
    console.log('================================');
  } catch (error) {
    console.error('Unexpected error running tests:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runAllTests();
}

export { runAllTests };