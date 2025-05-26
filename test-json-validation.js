#!/usr/bin/env node

// Quick test script to validate JSON formatting fixes
const axios = require('axios');
const { Pool } = require('pg');

// Load environment
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

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
    console.log(`Testing movie: ${slug}`);
    
    // Fetch movie detail
    const response = await axios.get(`https://phimapi.com/phim/${slug}`);
    const movieDetail = response.data;
    
    if (!movieDetail.movie) {
      console.log('No movie data found');
      return;
    }
    
    const movie = movieDetail.movie;
    
    // Test JSON formatting
    const categoriesJson = JSON.stringify(validateAndCleanArray(movie.category));
    const countriesJson = JSON.stringify(validateAndCleanArray(movie.country));
    
    console.log('Raw categories:', movie.category);
    console.log('Cleaned categories JSON:', categoriesJson);
    console.log('Raw countries:', movie.country);  
    console.log('Cleaned countries JSON:', countriesJson);
    
    // Validate JSON
    try {
      JSON.parse(categoriesJson);
      JSON.parse(countriesJson);
      console.log('✅ JSON validation passed');
      
      // Test database insert
      const testInsert = {
        text: 'INSERT INTO movies (slug, name, categories, countries) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO UPDATE SET categories = $3, countries = $4',
        values: [movie.slug, movie.name, categoriesJson, countriesJson]
      };
      
      await pool.query(testInsert);
      console.log('✅ Database insert successful');
      
    } catch (e) {
      console.log('❌ JSON validation failed:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function main() {
  // Test with the problematic movies
  const testMovies = [
    've-thoi-nao-thieu-nu-truyen-tranh',
    'tang-hai-truyen', 
    'khom-lung'
  ];
  
  for (const slug of testMovies) {
    await testMovie(slug);
    console.log('---');
  }
  
  await pool.end();
}

main().catch(console.error);
