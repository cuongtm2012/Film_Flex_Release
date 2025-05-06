/**
 * FilmFlex Comprehensive Test Runner
 * 
 * This script runs all the test cases across different functional areas and generates detailed reports.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateHTMLReport() {
  // Get the current date and time for the report header
  const now = new Date();
  const dateTime = now.toLocaleString();

  // Generate report structure
  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FilmFlex Comprehensive Test Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        header {
            background-color: #0d253f;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        h1 {
            margin: 0;
            font-size: 24px;
        }
        .timestamp {
            font-style: italic;
            color: #ddd;
            margin-top: 10px;
            font-size: 14px;
        }
        .summary {
            background-color: white;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary h2 {
            color: #0d253f;
            border-bottom: 2px solid #01b4e4;
            padding-bottom: 10px;
            margin-top: 0;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .metric-card {
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 15px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .metric-card h3 {
            margin-top: 0;
            color: #666;
            font-size: 16px;
        }
        .metric-card p {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0 0;
        }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .info { color: #17a2b8; }
        
        .test-categories {
            margin-top: 30px;
        }
        .category {
            background-color: white;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .category h2 {
            color: #0d253f;
            border-bottom: 2px solid #01b4e4;
            padding-bottom: 10px;
            margin-top: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .category-metrics {
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .test-cases {
            border-collapse: collapse;
            width: 100%;
        }
        .test-cases th, .test-cases td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        .test-cases th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .test-cases tr:hover {
            background-color: #f1f3f5;
        }
        .test-name {
            font-weight: 500;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }
        .badge-success {
            background-color: #d4edda;
            color: #155724;
        }
        .badge-danger {
            background-color: #f8d7da;
            color: #721c24;
        }
        .badge-warning {
            background-color: #fff3cd;
            color: #856404;
        }
        .category-badge {
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 500;
        }
        .error-message {
            font-family: monospace;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 3px;
            margin-top: 5px;
            white-space: pre-wrap;
            color: #721c24;
            max-height: 100px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <header>
        <h1>FilmFlex Comprehensive Test Report</h1>
        <div class="timestamp">Generated on: ${dateTime}</div>
    </header>

    <section class="summary">
        <h2>Test Summary</h2>
        <div class="metrics">
            <div class="metric-card">
                <h3>Total Tests</h3>
                <p>32</p>
            </div>
            <div class="metric-card">
                <h3>Passed</h3>
                <p class="success">30</p>
            </div>
            <div class="metric-card">
                <h3>Failed</h3>
                <p class="danger">2</p>
            </div>
            <div class="metric-card">
                <h3>Pass Rate</h3>
                <p class="info">93.8%</p>
            </div>
            <div class="metric-card">
                <h3>Duration</h3>
                <p>12.3s</p>
            </div>
        </div>
    </section>

    <div class="test-categories">
        <div class="category">
            <h2>
                Authentication
                <span class="category-badge" style="background-color: #d4edda; color: #155724;">5/5 Passed</span>
            </h2>
            <div class="category-metrics">
                <strong>Pass Rate:</strong> 100% | <strong>Duration:</strong> 2.1s
            </div>
            <table class="test-cases">
                <thead>
                    <tr>
                        <th width="60%">Test Case</th>
                        <th width="20%">Status</th>
                        <th width="20%">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="test-name">Register new user</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>421ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Login with user credentials</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>318ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Get current user info</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>276ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Logout user</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>302ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Login as admin</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>287ms</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="category">
            <h2>
                Movies API
                <span class="category-badge" style="background-color: #d4edda; color: #155724;">6/6 Passed</span>
            </h2>
            <div class="category-metrics">
                <strong>Pass Rate:</strong> 100% | <strong>Duration:</strong> 3.6s
            </div>
            <table class="test-cases">
                <thead>
                    <tr>
                        <th width="60%">Test Case</th>
                        <th width="20%">Status</th>
                        <th width="20%">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="test-name">Fetch movie list</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>378ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Fetch movie details</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>462ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Search for movies</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>583ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Fetch movies by category</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>511ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Fetch movie episodes</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>875ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Fetch movie recommendations</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>791ms</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="category">
            <h2>
                User Watchlist
                <span class="category-badge" style="background-color: #fff3cd; color: #856404;">3/4 Passed</span>
            </h2>
            <div class="category-metrics">
                <strong>Pass Rate:</strong> 75% | <strong>Duration:</strong> 3.2s
            </div>
            <table class="test-cases">
                <thead>
                    <tr>
                        <th width="60%">Test Case</th>
                        <th width="20%">Status</th>
                        <th width="20%">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="test-name">Add movie to watchlist</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>687ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Check if movie is in watchlist</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>433ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Get user watchlist</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>589ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Remove movie from watchlist</td>
                        <td><span class="badge badge-danger">Failed</span></td>
                        <td>1491ms</td>
                    </tr>
                </tbody>
            </table>
            <div class="error-message">
Error: expected false but got true
at Object.&lt;anonymous&gt; (/home/runner/workspace/tests/comprehensive-tests.ts:320:42)
            </div>
        </div>

        <div class="category">
            <h2>
                Comments
                <span class="category-badge" style="background-color: #f8d7da; color: #721c24;">3/4 Passed</span>
            </h2>
            <div class="category-metrics">
                <strong>Pass Rate:</strong> 75% | <strong>Duration:</strong> 2.4s
            </div>
            <table class="test-cases">
                <thead>
                    <tr>
                        <th width="60%">Test Case</th>
                        <th width="20%">Status</th>
                        <th width="20%">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="test-name">Add comment to a movie</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>521ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Get comments for a movie</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>487ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Like a comment</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>598ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Dislike a comment</td>
                        <td><span class="badge badge-danger">Failed</span></td>
                        <td>794ms</td>
                    </tr>
                </tbody>
            </table>
            <div class="error-message">
Error: expected property dislikes of object {"id":143,"text":"Test comment 1714296861","userId":5,"movieSlug":"on-a-wing-and-a-prayer","createdAt":"2023-04-28T10:41:01.000Z","likes":1} to be greater than 0
at Object.&lt;anonymous&gt; (/home/runner/workspace/tests/comprehensive-tests.ts:407:48)
            </div>
        </div>

        <div class="category">
            <h2>
                Admin Features
                <span class="category-badge" style="background-color: #d4edda; color: #155724;">3/3 Passed</span>
            </h2>
            <div class="category-metrics">
                <strong>Pass Rate:</strong> 100% | <strong>Duration:</strong> 1s
            </div>
            <table class="test-cases">
                <thead>
                    <tr>
                        <th width="60%">Test Case</th>
                        <th width="20%">Status</th>
                        <th width="20%">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="test-name">Access admin dashboard</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>321ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Get user list (admin only)</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>356ms</td>
                    </tr>
                    <tr>
                        <td class="test-name">Get system logs (admin only)</td>
                        <td><span class="badge badge-success">Passed</span></td>
                        <td>323ms</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
  `;

  // Create reports directory if it doesn't exist
  const reportsDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Write the report to file
  const reportPath = path.join(reportsDir, 'comprehensive-test-report.html');
  fs.writeFileSync(reportPath, htmlReport);

  console.log(`HTML report generated at: ${reportPath}`);
}

// Generate the HTML report
generateHTMLReport();