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

## Test Reports

Test reports are generated in the `reports` directory:
- `reports/comprehensive-test-report.html` - Main test report
- `reports/admin-test-report.html` - Admin test report
- `reports/real-tests-report.html` - Real component test report

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

## Test Fixtures

- Test user credentials are defined in the test files
- Test movie data uses common movies that should exist in the database (e.g., "Stranger Things")

## Continuous Improvement

The testing strategy is continually evolving. Areas for improvement include:
- Automated visual regression testing
- Performance testing
- End-to-end tests using Cypress or Playwright
- Better mocking strategies for external APIs
- CI/CD integration

## Contributing Tests

When adding new features, please also add corresponding tests to maintain test coverage. Follow these guidelines:
1. API features should have tests in `comprehensive-tests.ts`
2. React components should have their own test files with RTL tests
3. Use the existing test categories as a guide
4. Follow the existing naming conventions