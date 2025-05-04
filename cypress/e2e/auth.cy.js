describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear cookies and local storage between tests
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should allow login with valid credentials', () => {
    cy.visit('/auth');
    
    // Check for login form
    cy.get('form').should('be.visible');
    
    // Fill in valid credentials
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('Cuongtm2012$');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify successful login by checking for navigation to homepage
    cy.url().should('not.include', '/auth');
    
    // Verify user profile/avatar is visible, indicating logged in state
    cy.get('[data-testid="user-avatar"], .user-avatar, .user-profile')
      .should('be.visible');
  });
  
  it('should show error with invalid credentials', () => {
    cy.visit('/auth');
    
    // Fill in invalid credentials
    cy.get('input[name="username"]').type('wronguser');
    cy.get('input[name="password"]').type('wrongpassword');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify error message appears
    cy.get('[data-testid="auth-error"], .auth-error, .error-message')
      .should('be.visible')
      .should('contain.text', 'Invalid');
    
    // URL should still include /auth
    cy.url().should('include', '/auth');
  });
  
  it('should allow logout after login', () => {
    // Login first
    cy.visit('/auth');
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('Cuongtm2012$');
    cy.get('button[type="submit"]').click();
    
    // Wait for login to complete and verify we're on the homepage
    cy.url().should('not.include', '/auth');
    
    // Logout - look for logout button (might be in dropdown/menu)
    cy.get('[data-testid="user-avatar"], .user-avatar, .user-profile').click();
    cy.get('[data-testid="logout"], .logout-button').click();
    
    // Verify logout was successful - either by checking auth page redirect or login button visibility
    cy.get('[data-testid="login-button"], .login-button')
      .should('be.visible');
  });
});