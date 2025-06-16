#!/usr/bin/env node

/**
 * FilmFlex Comprehensive Test Runner
 * Runs all API and integration tests
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 FilmFlex Comprehensive Test Runner');
console.log('====================================');

const API_URL = process.env.API_URL || 'http://localhost:5000';
console.log(`Using API URL: ${API_URL}`);

try {
  // Run comprehensive API tests
  console.log('📋 Running API Tests...');
  execSync('npm test -- --testPathPattern="comprehensive-tests.ts"', { 
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
  
  // Run filter functionality tests
  console.log('📋 Running Filter Tests...');
  execSync('npm test -- --testPathPattern="filter-functionality.test.ts"', { 
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
  
  // Generate test report
  console.log('📊 Generating test report...');
  const reportDir = join(__dirname, '..', 'reports');
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = join(reportDir, 'comprehensive-test-report.html');
  const reportContent = `
<!DOCTYPE html>
<html>
<head>
    <title>FilmFlex Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { color: #2563eb; }
        .success { color: #16a34a; }
        .error { color: #dc2626; }
    </style>
</head>
<body>
    <h1 class="header">FilmFlex Comprehensive Test Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    <p>API URL: ${API_URL}</p>
    <div class="success">✅ Comprehensive tests completed</div>
</body>
</html>`;
  
  writeFileSync(reportPath, reportContent);
  console.log(`📈 Report generated at: ${reportPath}`);
  
  console.log('✅ Comprehensive tests completed successfully!');
} catch (error) {
  console.error('❌ Comprehensive tests failed:', error.message);
  process.exit(1);
}