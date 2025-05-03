/**
 * Test utility functions for FilmFlex test suite
 */

// Common test utilities
export const TEST_BASE_URL = 'http://localhost:5000';

/**
 * Convert milliseconds to a human-readable time format
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Generate test credentials with a timestamp to avoid conflicts
 */
export function generateTestCredentials() {
  const timestamp = Date.now();
  return {
    username: `test_user_${timestamp}`,
    password: 'Test@123456',
    email: `test_user_${timestamp}@example.com`,
    fullName: 'Test User'
  };
}

/**
 * Create a test report with success/failure counts
 */
export function generateTestReport(tests) {
  const total = tests.length;
  const passed = tests.filter(t => t.passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;
  
  return {
    total,
    passed,
    failed,
    passRate,
    summary: `PASS: ${passed}/${total} (${passRate}%)`
  };
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function multiple times until it succeeds or reaches max attempts
 */
export async function retry(fn, { maxAttempts = 3, delay = 1000 } = {}) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Format a test result for readable console output
 */
export function formatTestResult(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASSED' : 'FAILED';
  const detailsText = details ? ` - ${details}` : '';
  
  return `${icon} [${status}] ${name}${detailsText}`;
}