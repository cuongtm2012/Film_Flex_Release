describe('Watchlist Functionality', () => {
  beforeEach(() => {
    // Login before each test since watchlist requires authentication
    cy.visit('/auth');
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('Cuongtm2012$');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/auth');
  });

  it('should allow adding movies to watchlist', () => {
    // Visit a movie details page
    cy.visit('/movie/trai-hu-2024');
    
    // Find and click the "Add to Watchlist" button
    // First check if it's not already in watchlist
    cy.get('body').then(($body) => {
      const inWatchlist = $body.text().includes('Remove from Watchlist');
      
      if (inWatchlist) {
        // Remove from watchlist first to test adding
        cy.get('[data-testid="remove-from-watchlist"], .remove-from-watchlist, button:contains("Remove from Watchlist")')
          .click();
          
        // Wait for the removal to process
        cy.wait(1000);
      }
      
      // Now add to watchlist
      cy.get('[data-testid="add-to-watchlist"], .add-to-watchlist, button:contains("Add to Watchlist")')
        .click();
        
      // Verify successful toast/notification
      cy.get('[data-testid="toast"], .toast')
        .should('be.visible')
        .should('contain.text', 'added to watchlist');
    });
  });

  it('should display added movies in My List page', () => {
    // First add a movie to watchlist
    cy.visit('/movie/tinh-yeu-dinh-menh');
    
    // Check if it's not already in watchlist and add it
    cy.get('body').then(($body) => {
      const inWatchlist = $body.text().includes('Remove from Watchlist');
      
      if (!inWatchlist) {
        cy.get('[data-testid="add-to-watchlist"], .add-to-watchlist, button:contains("Add to Watchlist")')
          .click();
          
        // Wait for the addition to process
        cy.wait(1000);
      }
    });
    
    // Visit the My List page
    cy.visit('/my-list');
    
    // Verify the page has loaded properly
    cy.get('h1, .page-title').should('contain.text', 'My List');
    
    // Check that the movie appears in the list
    cy.get('[data-testid="movie-card"], .movie-card')
      .should('have.length.at.least', 1);
      
    // Verify the specific movie we added is in the list
    cy.get('[data-testid="movie-card"] h3, .movie-card h3')
      .should('contain.text', 'Tình Yêu Định Mệnh');
  });

  it('should allow removing movies from watchlist', () => {
    // Visit My List page
    cy.visit('/my-list');
    
    // Check if there are any movies in the list
    cy.get('body').then(($body) => {
      const hasMovies = $body.find('[data-testid="movie-card"], .movie-card').length > 0;
      
      if (hasMovies) {
        // Click remove button on the first movie
        cy.get('[data-testid="remove-from-watchlist"], .remove-button')
          .first()
          .click();
          
        // Verify toast notification
        cy.get('[data-testid="toast"], .toast')
          .should('be.visible')
          .should('contain.text', 'removed');
          
        // Verify the movie is removed or the list is updated
        cy.get('body').should(($bodyAfter) => {
          expect($bodyAfter.find('[data-testid="movie-card"], .movie-card').length).to.be.lessThan($body.find('[data-testid="movie-card"], .movie-card').length);
        });
      } else {
        // If no movies in watchlist, add one first then remove it
        cy.visit('/movie/doraemon-tuyen-tap-moi-nhat');
        cy.get('[data-testid="add-to-watchlist"], .add-to-watchlist, button:contains("Add to Watchlist")')
          .click();
        cy.wait(1000);
        
        // Go back to My List page
        cy.visit('/my-list');
        
        // Remove the newly added movie
        cy.get('[data-testid="remove-from-watchlist"], .remove-button')
          .click();
          
        // Verify toast notification
        cy.get('[data-testid="toast"], .toast')
          .should('be.visible')
          .should('contain.text', 'removed');
      }
    });
  });
});