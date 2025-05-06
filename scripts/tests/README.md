# FilmFlex Testing Guide

This document provides instructions for running tests for the FilmFlex application.

## Table of Contents

- [Test Hierarchy](#test-hierarchy)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [Test Reports](#test-reports)
- [Writing New Tests](#writing-new-tests)
- [Troubleshooting](#troubleshooting)

## Test Hierarchy

FilmFlex uses a comprehensive testing strategy with multiple types of tests:

```
tests/
├── unit/         # Unit tests for individual components
├── integration/  # Integration tests across components
├── api/          # API endpoint tests
├── e2e/          # End-to-end tests with Cypress
└── visual/       # Visual regression tests
```

## Running Tests

### Running All Tests

The simplest way to run all tests:

```bash
# Using the run_tests.sh script
./scripts/tests/run_tests.sh

# Or with npm
npm run test
```

### Running Specific Tests

To run specific types of tests:

```bash
# Run admin panel tests
node scripts/tests/run-admin-tests.js

# Run profile image tests
node scripts/tests/test-profile-image.js

# Run real tests against actual components
node scripts/tests/run-real-tests.js
```

### Comprehensive Test Runner

For a detailed test report across all functional areas:

```bash
node scripts/tests/comprehensive-test-runner.js
```

This generates an HTML report with detailed results for each test category.

## Test Types

### Unit and Integration Tests

Basic unit and integration tests can be run with:

```bash
npm run test:unit
npm run test:integration
```

### E2E Tests with Cypress

FilmFlex uses Cypress for end-to-end testing:

```bash
# Run Cypress tests locally
npm run cypress:open

# Run Cypress tests headlessly
npm run cypress:run

# Run Cypress tests on BrowserStack
npm run browserstack
```

## Test Reports

After running tests, reports are generated in the `reports/` directory:

- `reports/test-results.html`: Comprehensive test results
- `reports/profile-image-tests.html`: Profile image upload test results
- `reports/admin-tests.html`: Admin panel test results

## Writing New Tests

When adding new features, follow these guidelines for writing tests:

1. Add unit tests for new components in `tests/unit/`
2. Add integration tests for component interactions in `tests/integration/`
3. Add E2E tests in Cypress for user flows in `cypress/e2e/`

### Test File Naming Conventions

- Unit tests: `ComponentName.test.js`
- Integration tests: `feature-name.integration.test.js`
- E2E tests: `feature-name.cy.js`

## Troubleshooting

### Tests Failing Due to Database Issues

If tests fail due to database connection issues:

1. Verify database connection:
   ```bash
   ./deploy.sh --db-status
   ```

2. Reset the test database:
   ```bash
   npm run test:reset-db
   ```

### Browser Compatibility Issues

If E2E tests fail on certain browsers:

1. Run tests on BrowserStack to check compatibility:
   ```bash
   npm run browserstack
   ```

2. Check the BrowserStack reports in `results/browserstack/`