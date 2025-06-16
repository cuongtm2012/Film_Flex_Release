#!/usr/bin/env node

/**
 * FilmFlex Real Component Test Runner
 * Runs all real component tests (footer, my-list, watch-history, user-profile)
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Running FilmFlex Real Component Tests...');
console.log('==========================================');

try {
  // Run the main component tests
  const testCommand = 'npm test -- --testPathPattern="(footer|my-list|watch-history|user-profile).test"';
  
  console.log('📋 Running Component Tests...');
  execSync(testCommand, { 
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
  
  console.log('✅ Real component tests completed!');
  console.log('Check console output above for detailed results.');
} catch (error) {
  console.error('❌ Real component tests failed:', error.message);
  process.exit(1);
}