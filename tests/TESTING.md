# FilmFlex Testing Documentation

This document provides an overview of the testing infrastructure and approach used in the FilmFlex application.

## Overview

FilmFlex employs a comprehensive testing strategy that includes both API-level tests for backend functionality and component-level tests for frontend functionality. The test suite is designed to ensure that all critical features work as expected.

## Test Categories

The tests are organized into the following categories:

1. **Authentication Tests** - Verify user registration, login, and logout functionality
2. **Search Functionality Tests** - Verify movie search works with various inputs
3. **Filter Functionality Tests** - Verify category and country filtering works
4. **Movie Detail Tests** - Verify movie details, episodes, and recommendations
5. **User Watchlist Tests** - Verify adding/removing movies from watchlists
6. **Comments Tests** - Verify commenting and interaction features
7. **Admin Functionality Tests** - Verify admin-only features and permissions
8. **User Profile Tests** - Verify profile viewing and updating
9. **UI Component Tests** - Verify React components (profile image upload, etc.)
10. **End-to-End Tests** - Verify full application workflows using Cypress

## Test Files

### Comprehensive Tests
- `tests/comprehensive-tests.ts` - Single file containing all API tests
- `tests/admin-panel.test.tsx` - Admin panel component tests
- `tests/content-management.test.tsx` - Content management component tests
- `tests/profile-image-upload.test.tsx` - Profile image upload component tests
- `tests/footer.test.tsx` - Footer component tests
- `tests/my-list.test.tsx` - My List page component tests
- `tests/user-profile.test.tsx` - User profile component tests
- `tests/watch-history.test.tsx` - Watch history component tests

### Cypress End-to-End Tests
- `cypress/e2e/search.cy.js` - Tests for search functionality
- `cypress/e2e/auth.cy.js` - Tests for authentication functionality
- `cypress/e2e/movie-details.cy.js` - Tests for movie detail pages
- `cypress/e2e/watchlist.cy.js` - Tests for watchlist functionality

### Legacy Test Files
Various other test files exist in the `tests` directory that were from earlier implementations. The comprehensive tests now include all these scenarios.

## Running Tests

### All Tests
To run all tests:
```bash
./run-all-tests.sh
```

### Specific Test Suites
To run specific test suites:
```bash
# Run admin tests
./tests/run-admin-tests.sh

# Run tests with real components
./tests/run-real-tests.sh

# Run profile image upload tests
./tests/run-profile-image-tests.sh
```

### Running Cypress Tests
To run Cypress tests locally:
```bash
# Run all Cypress tests
npx cypress run

# Run Cypress tests in the UI mode
npx cypress open
```

### Running BrowserStack Tests
To run Cypress tests on BrowserStack:
```bash
# Run all tests on BrowserStack
./run-browserstack-tests.sh all

# Run specific test categories
./run-browserstack-tests.sh search
./run-browserstack-tests.sh auth
./run-browserstack-tests.sh movie-details
./run-browserstack-tests.sh watchlist
```

If you encounter a "Permission denied" error when trying to run the scripts, you may need to make them executable first:
```bash
chmod +x run-browserstack-tests.sh
chmod +x run-all-tests.sh
```

## Test Reports

Test reports are generated in the `reports` directory:
- `reports/comprehensive-test-report.html` - Main test report
- `reports/admin-test-report.html` - Admin test report
- `reports/real-tests-report.html` - Real component test report

### BrowserStack Reports
BrowserStack generates detailed test reports that are accessible through the BrowserStack dashboard. These reports include:
- Test execution status across different browsers
- Screenshots of test execution
- Console logs and network activity
- Video recordings of test runs
- Detailed error messages (if any)

## Test Implementation Details

### API Tests
API tests are implemented using Jest and directly call the API endpoints. These tests verify:
- Correct response status codes
- Response data structure
- Business logic (e.g., can't access admin endpoints without admin rights)

### Component Tests
Component tests use React Testing Library and Jest to render components and verify:
- Component rendering
- User interactions
- State changes
- UI updates

### Real Component Tests
These tests use more robust testing techniques for real components:
- Multiple ways to locate elements
- Fallback strategies for different UI implementations
- Graceful handling of edge cases
- Detailed debug logs

### End-to-End Tests
End-to-end tests use Cypress to verify the entire application flow:
- User flows like search, authentication, and movie details viewing
- Cross-browser compatibility
- Responsive design behavior
- Real-world user scenarios

## Test Configurations

### Cypress Configuration
The project uses two Cypress configuration files:
- `cypress.config.js` - Main configuration for local Cypress testing with ESM support
- `cypress.cjs.config.js` - CommonJS configuration specifically for BrowserStack integration

### BrowserStack Configuration
The BrowserStack integration is configured in:
- `browserstack.json` - Defines browsers, operating systems, and parallelization settings
- `run-browserstack-tests.sh` - Script for running tests on BrowserStack

When running BrowserStack tests, always use the `--cf browserstack.json` option to specify the BrowserStack configuration file.

## Troubleshooting

### ESM/CommonJS Compatibility Issues
The project uses ES Modules (ESM) for its main codebase, but BrowserStack requires CommonJS. If you encounter ESM/CommonJS compatibility issues:

1. Ensure you're using `cypress.cjs.config.js` for BrowserStack tests
2. Always specify the config file with `--cf browserstack.json` 
3. If you're adding new Cypress test files, use `.cy.js` extension instead of `.cy.ts`
4. If you need to import ESM modules in Cypress tests, use dynamic imports

### Browser Compatibility Issues
If tests fail on specific browsers:

1. Check the error messages in the BrowserStack dashboard
2. Verify that the browser version is supported in `browserstack.json`
3. For Safari-specific issues, ensure the test doesn't use features not supported in Safari
4. Consider adding browser-specific code with Cypress's browser detection capabilities

## Test Fixtures

- Test user credentials are defined in the test files
- Test movie data uses common movies that should exist in the database (e.g., "Stranger Things")

## Continuous Improvement

The testing strategy is continually evolving. Areas for improvement include:
- Automated visual regression testing
- Performance testing
- Expanding Cypress test coverage
- Better mocking strategies for external APIs
- CI/CD integration
- Parallel test execution for faster feedback

## Contributing Tests

When adding new features, please also add corresponding tests to maintain test coverage. Follow these guidelines:
1. API features should have tests in `comprehensive-tests.ts`
2. React components should have their own test files with RTL tests
3. End-to-end functionality should be tested with Cypress tests in the `cypress/e2e` directory
4. When adding new Cypress tests:
   - Use `.cy.js` extension for test files
   - Follow the existing patterns in other Cypress tests
   - Group related tests with descriptive `describe` blocks
   - Test both happy paths and error scenarios
5. Use the existing test categories as a guide
6. Follow the existing naming conventions
7. Test on multiple browsers using BrowserStack when applicable