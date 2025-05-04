describe('Movie Details Page', () => {
  // Sample movie slugs to test with
  const movieSlugs = [
    'tinh-yeu-dinh-menh',   // Vietnamese movie
    'doraemon-tuyen-tap-moi-nhat',  // Popular anime series
    'trai-hu-2024'  // Example movie
  ];

  it('should display movie details correctly', () => {
    // Visit movie details page
    cy.visit(`/movie/${movieSlugs[0]}`);
    
    // Check for movie title
    cy.get('h1, [data-testid="movie-title"]').should('be.visible');
    
    // Check for movie poster/image
    cy.get('[data-testid="movie-poster"], .movie-poster, img').should('be.visible');
    
    // Check for movie description
    cy.get('[data-testid="movie-description"], .movie-description')
      .should('be.visible');
      
    // Check for video player
    cy.get('iframe, [data-testid="video-player"], .video-player')
      .should('exist');
  });
  
  it('should show episodes list for series', () => {
    // Visit series details page (Doraemon is a series)
    cy.visit(`/movie/${movieSlugs[1]}`);
    
    // Check if episodes list exists
    cy.get('[data-testid="episodes-list"], .episodes-list, .episode')
      .should('be.visible');
  });
  
  it('should show recommendations section', () => {
    // Visit movie details page
    cy.visit(`/movie/${movieSlugs[2]}`);
    
    // Check for recommendations section
    cy.get('[data-testid="recommendations"], .recommendations-section')
      .should('be.visible');
      
    // Check that it contains movie cards
    cy.get('[data-testid="recommendations"] [data-testid="movie-card"], .recommendations-section .movie-card')
      .should('have.length.at.least', 1);
  });
  
  it('should allow adding comments when logged in', () => {
    // Login first
    cy.visit('/auth');
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('Cuongtm2012$');
    cy.get('button[type="submit"]').click();
    
    // Visit movie details page
    cy.visit(`/movie/${movieSlugs[0]}`);
    
    // Check if comment form exists
    cy.get('[data-testid="comment-form"], .comment-form, form')
      .should('be.visible');
      
    // Type a test comment
    cy.get('[data-testid="comment-input"], .comment-input, textarea')
      .type('This is a test comment from Cypress automation');
      
    // Submit comment
    cy.get('[data-testid="comment-submit"], .comment-submit, button[type="submit"]')
      .click();
      
    // Verify the comment appears in the list (may need adjustment based on implementation)
    cy.get('[data-testid="comments-list"], .comments-list')
      .should('contain.text', 'This is a test comment from Cypress automation');
  });
  
  it('should allow liking existing comments', () => {
    // Login if needed
    cy.visit('/auth');
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('Cuongtm2012$');
    cy.get('button[type="submit"]').click();
    
    // Visit movie details page
    cy.visit(`/movie/${movieSlugs[0]}`);
    
    // Find like button on a comment (if there are comments)
    cy.get('[data-testid="comment-like"], .like-button')
      .first()
      .then($button => {
        // Get current likes count if displayed
        const likesCountBefore = parseInt($button.text().match(/\d+/)?.[0] || '0');
        
        // Click like button
        cy.wrap($button).click();
        
        // Verify like count increased
        cy.wrap($button)
          .should('contain.text', (likesCountBefore + 1).toString());
      });
  });
});