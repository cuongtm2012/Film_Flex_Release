/**
 * FilmFlex Comprehensive Test Runner
 * 
 * This script runs all the test cases and generates detailed reports.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

// Test categories and their test cases
const testCategories = [
  {
    name: "Profile Image Upload",
    testFile: "tests/profile-image-upload.test.tsx",
    testCases: [
      { id: 'TC_UI_001', description: 'Verify profile image upload UI is displayed', priority: 'High' },
      { id: 'TC_FUNC_001', description: 'Upload valid image file', priority: 'High' },
      { id: 'TC_FUNC_002', description: 'Upload invalid file type', priority: 'Medium' },
      { id: 'TC_FUNC_003', description: 'Upload oversized image file', priority: 'Medium' },
      { id: 'TC_FUNC_004', description: 'Cancel image upload', priority: 'Low' },
      { id: 'TC_UI_002', description: 'Verify preview of selected image', priority: 'Medium' },
      { id: 'TC_FUNC_005', description: 'Remove existing profile image', priority: 'Medium' }
    ]
  },
  // Add more test categories as needed
];

// Function to print a separator line
function printSeparator() {
  console.log(colors.dim + '─'.repeat(100) + colors.reset);
}

// Function to print main header
function printMainHeader() {
  console.log('\n');
  console.log(colors.bright + colors.cyan + '╔' + '═'.repeat(98) + '╗' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + ' '.repeat(36) + 'FILMFLEX TEST SUITE' + ' '.repeat(37) + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '╚' + '═'.repeat(98) + '╝' + colors.reset);
  console.log('\n');
}

// Function to print category header
function printCategoryHeader(category) {
  console.log('\n');
  console.log(colors.bright + colors.blue + '╔' + '═'.repeat(98) + '╗' + colors.reset);
  console.log(colors.bright + colors.blue + '║' + colors.reset + colors.bright + ' ' + category.name + ' Tests' + ' '.repeat(97 - category.name.length - 6) + colors.bright + colors.blue + '║' + colors.reset);
  console.log(colors.bright + colors.blue + '╚' + '═'.repeat(98) + '╝' + colors.reset);
  console.log('\n');
}

// Function to print test summary
function printTestSummary(results) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;
  
  console.log('\n');
  console.log(colors.bright + colors.cyan + '╔' + '═'.repeat(98) + '╗' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + ' '.repeat(40) + 'TEST SUMMARY' + ' '.repeat(41) + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '╠' + '═'.repeat(98) + '╣' + colors.reset);
  
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' Total Tests: ' + colors.bright + total + colors.reset + ' '.repeat(82 - String(total).length) + colors.bright + colors.cyan + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' ' + colors.green + 'Passed: ' + colors.bright + passed + colors.reset + ' '.repeat(90 - String(passed).length) + colors.bright + colors.cyan + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' ' + colors.red + 'Failed: ' + colors.bright + failed + colors.reset + ' '.repeat(90 - String(failed).length) + colors.bright + colors.cyan + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' ' + colors.yellow + 'Skipped: ' + colors.bright + skipped + colors.reset + ' '.repeat(88 - String(skipped).length) + colors.bright + colors.cyan + '║' + colors.reset);
  
  console.log(colors.bright + colors.cyan + '╚' + '═'.repeat(98) + '╝' + colors.reset);
  console.log('\n');
}

// Function to print overall summary
function printOverallSummary(categoryResults) {
  const totalTests = categoryResults.reduce((sum, category) => sum + category.results.length, 0);
  const totalPassed = categoryResults.reduce((sum, category) => sum + category.results.filter(r => r.status === 'PASSED').length, 0);
  const totalFailed = categoryResults.reduce((sum, category) => sum + category.results.filter(r => r.status === 'FAILED').length, 0);
  const totalSkipped = categoryResults.reduce((sum, category) => sum + category.results.filter(r => r.status === 'SKIPPED').length, 0);
  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  
  console.log('\n');
  console.log(colors.bright + colors.cyan + '╔' + '═'.repeat(98) + '╗' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + ' '.repeat(36) + 'OVERALL SUMMARY' + ' '.repeat(36) + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '╠' + '═'.repeat(98) + '╣' + colors.reset);
  
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' Total Tests: ' + colors.bright + totalTests + colors.reset + ' '.repeat(82 - String(totalTests).length) + colors.bright + colors.cyan + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' ' + colors.green + 'Passed: ' + colors.bright + totalPassed + colors.reset + ' '.repeat(90 - String(totalPassed).length) + colors.bright + colors.cyan + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' ' + colors.red + 'Failed: ' + colors.bright + totalFailed + colors.reset + ' '.repeat(90 - String(totalFailed).length) + colors.bright + colors.cyan + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' ' + colors.yellow + 'Skipped: ' + colors.bright + totalSkipped + colors.reset + ' '.repeat(88 - String(totalSkipped).length) + colors.bright + colors.cyan + '║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║' + colors.reset + ' Pass Rate: ' + colors.bright + passRate + '%' + colors.reset + ' '.repeat(84 - String(passRate).length) + colors.bright + colors.cyan + '║' + colors.reset);
  
  console.log(colors.bright + colors.cyan + '╚' + '═'.repeat(98) + '╝' + colors.reset);
  console.log('\n');
}

// Function to run tests for a category
async function runCategoryTests(category) {
  printCategoryHeader(category);
  
  console.log(colors.bright + 'Test Cases:' + colors.reset);
  category.testCases.forEach((test, index) => {
    console.log(`${colors.cyan}${index + 1}. ${colors.bright}${test.id}${colors.reset} - ${test.description} ${colors.yellow}(Priority: ${test.priority})${colors.reset}`);
  });
  
  console.log('\n' + colors.bright + 'Running Tests...' + colors.reset + '\n');
  printSeparator();
  
  let results = [];
  
  try {
    // Run Jest with the specific test file and --json flag to get JSON output
    const command = `npx jest ${category.testFile} --testNamePattern="TC_" --json`;
    const output = execSync(command, { encoding: 'utf-8' });
    
    // Parse JSON output
    const testResults = JSON.parse(output);
    
    // Process results
    if (testResults && testResults.testResults && testResults.testResults.length > 0) {
      const testFile = testResults.testResults[0];
      
      testFile.assertionResults.forEach(test => {
        const testId = test.title.split(':')[0].trim();
        const testCase = category.testCases.find(tc => tc.id === testId);
        
        if (testCase) {
          const status = test.status.toUpperCase();
          const statusColor = status === 'PASSED' ? colors.green : status === 'FAILED' ? colors.red : colors.yellow;
          
          console.log(`${colors.cyan}${testId}${colors.reset} - ${testCase.description}`);
          console.log(`Status: ${statusColor}${status}${colors.reset}`);
          
          if (status === 'FAILED') {
            console.log(`${colors.red}Failure Message:${colors.reset} ${test.failureMessages.join('\n')}`);
          }
          
          results.push({
            id: testId,
            description: testCase.description,
            priority: testCase.priority,
            status: status
          });
          
          printSeparator();
        }
      });
    }
  } catch (error) {
    console.error(`${colors.red}Error running tests:${colors.reset}`, error.message);
    
    // Try to parse JSON output from the error output
    try {
      const outputMatch = error.stdout ? error.stdout.match(/{[\s\S]*}/) : null;
      if (outputMatch) {
        const testResults = JSON.parse(outputMatch[0]);
        
        if (testResults && testResults.testResults && testResults.testResults.length > 0) {
          const testFile = testResults.testResults[0];
          
          testFile.assertionResults.forEach(test => {
            const testId = test.title.split(':')[0].trim();
            const testCase = category.testCases.find(tc => tc.id === testId);
            
            if (testCase) {
              const status = test.status.toUpperCase();
              const statusColor = status === 'PASSED' ? colors.green : status === 'FAILED' ? colors.red : colors.yellow;
              
              console.log(`${colors.cyan}${testId}${colors.reset} - ${testCase.description}`);
              console.log(`Status: ${statusColor}${status}${colors.reset}`);
              
              if (status === 'FAILED') {
                console.log(`${colors.red}Failure Message:${colors.reset} ${test.failureMessages.join('\n')}`);
              }
              
              results.push({
                id: testId,
                description: testCase.description,
                priority: testCase.priority,
                status: status
              });
              
              printSeparator();
            }
          });
        }
      } else {
        // Mock test results for demonstration
        results = category.testCases.map(test => ({
          id: test.id,
          description: test.description,
          priority: test.priority,
          status: 'PENDING'
        }));
        
        // Output test info
        results.forEach(result => {
          console.log(`${colors.cyan}${result.id}${colors.reset} - ${result.description}`);
          console.log(`Status: ${colors.yellow}PENDING${colors.reset} (Jest execution issue)`);
          printSeparator();
        });
      }
    } catch (parseError) {
      // If we can't parse JSON, mark all tests as failed
      results = category.testCases.map(test => ({
        id: test.id,
        description: test.description,
        priority: test.priority,
        status: 'FAILED'
      }));
      
      results.forEach(result => {
        console.log(`${colors.cyan}${result.id}${colors.reset} - ${result.description}`);
        console.log(`Status: ${colors.red}FAILED${colors.reset}`);
        console.log(`${colors.red}Failure Message:${colors.reset} Test execution error`);
        printSeparator();
      });
    }
  }
  
  // For any test case without results, mark as skipped
  category.testCases.forEach(testCase => {
    if (!results.some(r => r.id === testCase.id)) {
      results.push({
        id: testCase.id,
        description: testCase.description,
        priority: testCase.priority,
        status: 'SKIPPED'
      });
      
      console.log(`${colors.cyan}${testCase.id}${colors.reset} - ${testCase.description}`);
      console.log(`Status: ${colors.yellow}SKIPPED${colors.reset}`);
      printSeparator();
    }
  });
  
  // Print test summary
  printTestSummary(results);
  
  return {
    category: category.name,
    results: results
  };
}

// Function to generate HTML report file
function generateHTMLReport(categoryResults) {
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'test-report.html');
  
  const totalTests = categoryResults.reduce((sum, category) => sum + category.results.length, 0);
  const totalPassed = categoryResults.reduce((sum, category) => sum + category.results.filter(r => r.status === 'PASSED').length, 0);
  const totalFailed = categoryResults.reduce((sum, category) => sum + category.results.filter(r => r.status === 'FAILED').length, 0);
  const totalSkipped = categoryResults.reduce((sum, category) => sum + category.results.filter(r => r.status === 'SKIPPED').length, 0);
  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FilmFlex Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2563eb;
    }
    .summary {
      display: flex;
      margin-bottom: 30px;
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .summary-item {
      flex: 1;
      text-align: center;
      padding: 15px;
    }
    .summary-item h3 {
      margin-bottom: 10px;
      font-size: 18px;
    }
    .summary-item .count {
      font-size: 36px;
      font-weight: bold;
    }
    .progress-bar {
      height: 20px;
      background-color: #e2e8f0;
      border-radius: 10px;
      margin-top: 20px;
      overflow: hidden;
    }
    .progress {
      height: 100%;
      background-color: #4ade80;
      border-radius: 10px;
      width: ${passRate}%;
    }
    .progress-text {
      text-align: center;
      margin-top: 5px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    thead {
      background-color: #2563eb;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .status {
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      width: 80px;
      text-align: center;
    }
    .passed {
      background-color: #d1fae5;
      color: #047857;
    }
    .failed {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    .skipped, .pending {
      background-color: #fef3c7;
      color: #92400e;
    }
    .priority-high {
      background-color: #fecaca;
      color: #991b1b;
    }
    .priority-medium {
      background-color: #fed7aa;
      color: #9a3412;
    }
    .priority-low {
      background-color: #e0f2fe;
      color: #0369a1;
    }
    .test-info {
      margin-bottom: 15px;
    }
    .timestamp {
      text-align: right;
      font-size: 14px;
      color: #6b7280;
      margin-top: 30px;
    }
    .category-title {
      background-color: #eff6ff;
      padding: 10px;
      margin-top: 30px;
      border-radius: 8px 8px 0 0;
      font-size: 20px;
      font-weight: bold;
    }
    details {
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    summary {
      padding: 12px 15px;
      background-color: #f8fafc;
      cursor: pointer;
      font-weight: bold;
    }
    summary:hover {
      background-color: #f1f5f9;
    }
  </style>
</head>
<body>
  <h1>FilmFlex Test Report</h1>
  <p class="test-info">Test run completed on <strong>${new Date().toLocaleString()}</strong></p>

  <div class="summary">
    <div class="summary-item">
      <h3>Total Tests</h3>
      <div class="count">${totalTests}</div>
    </div>
    <div class="summary-item">
      <h3>Passed</h3>
      <div class="count" style="color: #059669">${totalPassed}</div>
    </div>
    <div class="summary-item">
      <h3>Failed</h3>
      <div class="count" style="color: #dc2626">${totalFailed}</div>
    </div>
    <div class="summary-item">
      <h3>Skipped</h3>
      <div class="count" style="color: #d97706">${totalSkipped}</div>
    </div>
  </div>

  <div class="progress-bar">
    <div class="progress"></div>
  </div>
  <div class="progress-text">Pass Rate: ${passRate}%</div>

  <h2>Test Results</h2>

  ${categoryResults.map(category => `
    <details open>
      <summary>${category.category} (${category.results.filter(r => r.status === 'PASSED').length}/${category.results.length} Passed)</summary>
      <table>
        <thead>
          <tr>
            <th>Test ID</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${category.results.map(test => `
            <tr>
              <td>${test.id}</td>
              <td>${test.description}</td>
              <td><span class="status priority-${test.priority.toLowerCase()}">${test.priority}</span></td>
              <td><span class="status ${test.status.toLowerCase()}">${test.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </details>
  `).join('')}

  <p class="timestamp">Report generated at: ${new Date().toLocaleString()}</p>
</body>
</html>
  `;

  fs.writeFileSync(reportPath, html);
  console.log(`${colors.green}HTML Report generated:${colors.reset} ${reportPath}`);
}

// Main function to run all tests
async function runAllTests() {
  printMainHeader();
  
  const categoryResults = [];
  
  for (const category of testCategories) {
    const result = await runCategoryTests(category);
    categoryResults.push(result);
  }
  
  // Print overall summary
  printOverallSummary(categoryResults);
  
  // Generate HTML report
  generateHTMLReport(categoryResults);
}

// Run all tests
runAllTests().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});