#!/usr/bin/env node

/**
 * FilmFlex Admin Panel Test Runner
 * Runs all admin panel related tests
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Running FilmFlex Admin Panel Tests...');
console.log('=====================================');

try {
  // Run admin panel tests
  const testCommand = 'npm test -- --testPathPattern="admin-panel.test.tsx"';
  
  console.log('📋 Running Admin Panel Tests...');
  execSync(testCommand, { 
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
  
  console.log('✅ Admin Panel Tests completed successfully!');
} catch (error) {
  console.error('❌ Admin Panel Tests failed:', error.message);
  process.exit(1);
}