// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- This is a login command --
Cypress.Commands.add('login', (username, password) => {
  // Visit the auth page
  cy.visit('/auth');
  
  // Fill in the login form
  cy.get('input[name="username"]').type(username);
  cy.get('input[name="password"]').type(password);
  
  // Submit the form
  cy.get('button[type="submit"]').click();
  
  // Wait for the login to complete and verify the user is logged in
  cy.url().should('not.include', '/auth');
  
  // Return to the homepage
  cy.visit('/');
});

// -- Command to perform a search --
Cypress.Commands.add('search', (searchTerm) => {
  // Find the search input and type the search term
  cy.get('input[type="search"], [data-testid="search-input"]').clear().type(searchTerm);
  
  // Find and click search button or press enter to search
  cy.get('button[type="submit"], [data-testid="search-submit"]').click();
});

// -- Command to verify a movie exists in the grid --
Cypress.Commands.add('movieShouldExist', (movieTitle) => {
  cy.get('.movie-grid .movie-card h3, [data-testid="movie-card"] h3')
    .contains(movieTitle, { matchCase: false })
    .should('exist');
});

// -- Command to add a movie to watchlist --
Cypress.Commands.add('addToWatchlist', (movieSlug) => {
  cy.visit(`/movie/${movieSlug}`);
  cy.get('[data-testid="add-to-watchlist"], .watchlist-button')
    .click();
});

// -- Command to verify a toast notification is visible --
Cypress.Commands.add('verifyToast', (message) => {
  cy.get('[data-testid="toast-message"], .toast')
    .contains(message, { matchCase: false })
    .should('be.visible');
});