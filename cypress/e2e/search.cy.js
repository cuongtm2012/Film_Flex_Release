describe('Search Functionality', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should show search input in the header', () => {
    // Verify the search input is visible
    cy.get('input[type="search"], [data-testid="search-input"]')
      .should('be.visible');
  });

  it('should show movies that start with the search term first', () => {
    // Search for a specific term
    cy.search('Tình yêu');
    
    // Wait for search results to load
    cy.wait(2000);
    
    // Get all movie titles
    cy.get('.movie-grid .movie-card h3, [data-testid="movie-title"]')
      .then(($titles) => {
        // Check if at least one movie with "Tình yêu" exists
        const titleTexts = Array.from($titles).map(el => el.textContent.toLowerCase());
        const hasTinhYeuTitle = titleTexts.some(text => text.includes('tình yêu'));
        
        // Verify we found at least one match
        expect(hasTinhYeuTitle).to.be.true;
        
        // Verify a movie starting with "Tình yêu" is near the top of results (in first 3 results)
        const firstThreeTitles = titleTexts.slice(0, 3);
        const hasTinhYeuAtStart = firstThreeTitles.some(text => 
          text.startsWith('tình yêu') || text.startsWith('tinh yeu')
        );
        
        // This assertion depends on the search algorithm working correctly
        // If the test fails, it may need adjustment based on actual search behavior
        expect(hasTinhYeuAtStart).to.be.true;
      });
  });

  it('should show "no results" message for non-existent movies', () => {
    // Search for a term unlikely to exist
    cy.search('xzxzxnonexistentzxzxz');
    
    // Wait for search results
    cy.wait(2000);
    
    // Verify "no results" message appears
    cy.get('[data-testid="no-results"], .no-results-message')
      .should('be.visible')
      .should('contain.text', 'No results');
  });
  
  it('should update search suggestions as user types', () => {
    // Get the search input
    const searchInput = cy.get('input[type="search"], [data-testid="search-input"]');
    
    // Type a partial search term
    searchInput.type('dorae');
    
    // Wait for suggestions to appear
    cy.wait(1000);
    
    // Verify suggestions contain relevant results (e.g., Doraemon)
    cy.get('[data-testid="search-suggestions"], .search-suggestions')
      .should('be.visible')
      .should('contain.text', 'Doraemon');
  });
});