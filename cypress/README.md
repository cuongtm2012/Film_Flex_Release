# FilmFlex Cypress Testing with BrowserStack

This folder contains Cypress tests for the FilmFlex streaming platform, configured to run on BrowserStack.

## Directory Structure

- `e2e/` - Contains test files organized by feature
- `fixtures/` - Contains test data (users, movies)
- `support/` - Contains helper functions and custom commands

## Test Files

1. **search.cy.js** - Tests for the search functionality
   - Verifies search results prioritize titles starting with search term
   - Tests "no results" message for non-existent movies
   - Tests search suggestions as user types

2. **auth.cy.js** - Tests for authentication
   - Tests login with valid credentials
   - Tests error handling with invalid credentials
   - Tests logout functionality

3. **movie-details.cy.js** - Tests for the movie details page
   - Verifies movie information display
   - Tests episode list for series
   - Tests recommendations section
   - Tests comment functionality

4. **watchlist.cy.js** - Tests for watchlist functionality
   - Tests adding movies to watchlist
   - Tests viewing watchlist
   - Tests removing movies from watchlist

## Running Tests

You can run the tests using the BrowserStack integration:

```bash
# Run all tests
./run-browserstack-tests.sh all

# Run specific test suite
./run-browserstack-tests.sh search
./run-browserstack-tests.sh auth
./run-browserstack-tests.sh movie-details
./run-browserstack-tests.sh watchlist
```

## BrowserStack Configuration

Tests are configured to run on multiple browsers:
- Chrome (latest, latest-1) on Windows 10
- Firefox (latest) on Windows 10
- Edge (latest) on Windows 10
- Safari (15.6) on macOS Monterey

The configuration is in `browserstack.json` at the project root.

## Custom Commands

Custom Cypress commands are defined in `support/commands.js`:

- `cy.login(username, password)` - Helper to log in
- `cy.search(searchTerm)` - Helper to perform a search
- `cy.movieShouldExist(movieTitle)` - Verify a movie exists in results
- `cy.addToWatchlist(movieSlug)` - Add a movie to watchlist
- `cy.verifyToast(message)` - Verify a toast notification