// Filter API tests

import fetch from 'node-fetch';

/**
 * Test filter functionality
 * This test covers:
 * 1. Filtering movies by category
 * 2. Filtering movies by country
 * 3. Handling non-existent category/country
 * 4. Testing pagination with filters
 */
async function testFilterFunctionality() {
  console.log('\n=== Testing Filter API ===');
  
  try {
    // 1. Test filtering by category
    console.log('\n1. Testing filtering by category...');
    const categorySlug = 'hanh-dong';
    const response1 = await fetch(`http://localhost:5000/api/categories/${categorySlug}`);
    
    console.log(`Status code: ${response1.status}`);
    
    if (response1.status === 200) {
      const data1 = await response1.json();
      console.log('✅ Test passed: Category filtering works');
      console.log(`Results found: ${data1.items.length}`);
      
      if (data1.items.length > 0) {
        console.log(`First result: ${data1.items[0].name} (${data1.items[0].slug})`);
        
        // Verify pagination info
        if (data1.pagination) {
          console.log(`Pagination info: Page ${data1.pagination.currentPage} of ${data1.pagination.totalPages}, showing ${data1.items.length} of ${data1.pagination.totalItems} items`);
        } else {
          console.log('❌ Missing pagination information');
        }
      } else {
        console.log('❌ No results found for category filter');
      }
    } else {
      console.log('❌ Test failed: Could not filter by category');
    }
    
    // 2. Test filtering by country
    console.log('\n2. Testing filtering by country...');
    const countrySlug = 'trung-quoc';
    const response2 = await fetch(`http://localhost:5000/api/countries/${countrySlug}`);
    
    console.log(`Status code: ${response2.status}`);
    
    if (response2.status === 200) {
      const data2 = await response2.json();
      console.log('✅ Test passed: Country filtering works');
      console.log(`Results found: ${data2.items.length}`);
      
      if (data2.items.length > 0) {
        console.log(`First result: ${data2.items[0].name} (${data2.items[0].slug})`);
        
        // Verify pagination info
        if (data2.pagination) {
          console.log(`Pagination info: Page ${data2.pagination.currentPage} of ${data2.pagination.totalPages}, showing ${data2.items.length} of ${data2.pagination.totalItems} items`);
        } else {
          console.log('❌ Missing pagination information');
        }
      } else {
        console.log('❌ No results found for country filter');
      }
    } else {
      console.log('❌ Test failed: Could not filter by country');
    }
    
    // 3. Test handling non-existent category
    console.log('\n3. Testing handling of non-existent category...');
    const fakeCategory = 'non-existent-category-12345';
    const response3 = await fetch(`http://localhost:5000/api/categories/${fakeCategory}`);
    
    console.log(`Status code: ${response3.status}`);
    
    if (response3.status === 200) {
      const data3 = await response3.json();
      console.log(`Results found: ${data3.items.length}`);
      
      if (data3.items.length === 0) {
        console.log('✅ Test passed: Non-existent category returns empty results');
      } else {
        console.log('❌ Test failed: Non-existent category returned results');
      }
    } else if (response3.status === 404) {
      console.log('✅ Test passed: Non-existent category returns 404');
    } else {
      console.log(`❌ Test failed: Unexpected status code ${response3.status} for non-existent category`);
    }
    
    // 4. Test pagination with filters
    console.log('\n4. Testing pagination with filters...');
    const page2Response = await fetch(`http://localhost:5000/api/categories/${categorySlug}?page=2`);
    
    console.log(`Status code: ${page2Response.status}`);
    
    if (page2Response.status === 200) {
      const page2Data = await page2Response.json();
      console.log('✅ Test passed: Pagination with filters works');
      console.log(`Results found: ${page2Data.items.length}`);
      
      if (page2Data.pagination && page2Data.pagination.currentPage === 2) {
        console.log('✅ Correct page returned');
        
        // Check if page 2 items are different from page 1
        const page1Response = await fetch(`http://localhost:5000/api/categories/${categorySlug}?page=1`);
        const page1Data = await page1Response.json();
        
        if (page1Data.items.length > 0 && page2Data.items.length > 0) {
          const page1FirstItem = page1Data.items[0].slug;
          const page2FirstItem = page2Data.items[0].slug;
          
          if (page1FirstItem !== page2FirstItem) {
            console.log('✅ Page 2 contains different items from page 1');
          } else {
            console.log('❌ Page 2 returns the same first item as page 1');
          }
        }
      } else {
        console.log('❌ Incorrect page returned or missing pagination information');
      }
    } else {
      console.log('❌ Test failed: Could not paginate with filters');
    }
    
  } catch (error) {
    console.error('Unexpected error during filter tests:', error);
  }
  
  console.log('\n=== Filter API Tests Completed ===');
}

// Run the tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testFilterFunctionality();
}

export { testFilterFunctionality };