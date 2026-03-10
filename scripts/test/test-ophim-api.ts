#!/usr/bin/env tsx
/**
 * Test Ophim API Response
 */

import { fetchOphimMovieDetail } from '../server/services/ophim-api';
import { transformOphimMovieToDbFormat } from '../server/services/ophim-transformer';

async function testOphimApi() {
  const slug = 'neu-the-gioi-la-san-khau-vay-hau-truong-o-dau';
  
  console.log(`\n🔍 Fetching from Ophim API: ${slug}\n`);

  try {
    const response = await fetchOphimMovieDetail(slug);
    
    const movie = response.data.item;
    
    console.log(`📽️  Name: ${movie.name}`);
    console.log(`🔗 Slug: ${movie.slug}\n`);
    console.log(`📸 Raw URLs from API:`);
    console.log(`   poster_url: ${movie.poster_url}`);
    console.log(`   thumb_url:  ${movie.thumb_url}\n`);
    console.log(`🌐 CDN Domain: ${response.data.APP_DOMAIN_CDN_IMAGE}\n`);
    
    // Transform and test
    const transformed = transformOphimMovieToDbFormat(response);
    
    console.log(`📸 Transformed URLs (will be saved to DB):`);
    console.log(`   posterUrl: ${transformed.movie.posterUrl}`);
    console.log(`   thumbUrl:  ${transformed.movie.thumbUrl}\n`);
    
    // Test if URLs work
    console.log(`🌐 Testing transformed URLs...`);
    try {
      const testResponse = await fetch(transformed.movie.thumbUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      console.log(`   ${testResponse.ok ? '✅' : '❌'} ${testResponse.status} - ${transformed.movie.thumbUrl}`);
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

testOphimApi();
