#!/usr/bin/env tsx
/**
 * Test different URL formats
 */

async function testUrls() {
  const filename = 'neu-the-gioi-la-san-khau-vay-hau-truong-o-dau-thumb.jpg';
  
  const urls = [
    `https://img.ophim.live/uploads/${filename}`,
    `https://img.ophim.live/${filename}`,
    `https://img.ophim.live/uploads/movies/${filename}`,
  ];

  console.log('\n🔍 Testing different URL formats...\n');

  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      console.log(`${response.ok ? '✅' : '❌'} ${response.status} - ${url}`);
    } catch (error: any) {
      console.log(`❌ Error - ${url}: ${error.message}`);
    }
  }

  process.exit(0);
}

testUrls();
