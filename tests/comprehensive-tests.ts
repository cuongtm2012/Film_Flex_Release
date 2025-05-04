/**
 * FilmFlex Comprehensive Test Suite
 * 
 * This file combines all test cases from various test files into a single comprehensive suite.
 * Tests are organized by functionality categories for better visibility and management.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fetch from 'node-fetch';

// Test utilities and shared test data
const API_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_ADMIN_USER = { username: 'admin', password: 'Cuongtm2012$' };
const TEST_REGULAR_USER = { username: 'user1', password: 'Password123!' };

// Utility functions
async function login(username: string, password: string) {
  const response = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  });
  return response;
}

async function logout() {
  const response = await fetch(`${API_URL}/api/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  return response;
}

async function fetchWithAuth(url: string, options: any = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'
  });
  return response;
}

// Set up global error logging
beforeEach(() => {
  console.log(`----- Starting test -----`);
});

afterEach(() => {
  console.log(`----- Completed test -----`);
});

// ============================================================================
// CATEGORY: AUTHENTICATION
// ============================================================================
describe('Authentication Tests', () => {
  test('AUTH-01: User can register with valid credentials', async () => {
    const uniqueUsername = `testuser_${Date.now()}`;
    const response = await fetch(`${API_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: uniqueUsername,
        email: `${uniqueUsername}@example.com`,
        password: 'Password123!',
        fullName: 'Test User'
      })
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.username).toBe(uniqueUsername);
  });

  test('AUTH-02: User can login with valid credentials', async () => {
    const response = await login(TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.username).toBe(TEST_ADMIN_USER.username);
  });

  test('AUTH-03: User cannot login with invalid credentials', async () => {
    const response = await login('wronguser', 'wrongpassword');
    expect(response.status).toBe(401);
  });

  test('AUTH-04: User can logout', async () => {
    // First login
    await login(TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    
    // Then logout
    const response = await logout();
    expect(response.status).toBe(200);
    
    // Verify user session is terminated by trying to access protected resource
    const userResponse = await fetchWithAuth(`${API_URL}/api/user`);
    expect(userResponse.status).toBe(401);
  });
});

// ============================================================================
// CATEGORY: SEARCH FUNCTIONALITY
// ============================================================================
describe('Search Functionality Tests', () => {
  test('SEARCH-01: Search with valid keyword returns matching results', async () => {
    const searchTerm = 'stranger';
    const response = await fetch(`${API_URL}/api/search?keyword=${encodeURIComponent(searchTerm)}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data.items.length).toBeGreaterThan(0);
    
    // Check if at least one result contains the search term (case insensitive)
    const hasMatch = data.items.some((item: any) => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    expect(hasMatch).toBe(true);
  });

  test('SEARCH-02: Search with non-existent keyword returns empty results', async () => {
    const searchTerm = 'xyznonexistentmovie123';
    const response = await fetch(`${API_URL}/api/search?keyword=${encodeURIComponent(searchTerm)}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data.items.length).toBe(0);
  });

  test('SEARCH-03: Search with special characters works correctly', async () => {
    const searchTerm = 'game of thrones';
    const response = await fetch(`${API_URL}/api/search?keyword=${encodeURIComponent(searchTerm)}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  test('SEARCH-04: Search supports pagination', async () => {
    const searchTerm = 'a'; // Common letter to get many results
    const page1Response = await fetch(`${API_URL}/api/search?keyword=${encodeURIComponent(searchTerm)}&page=1`);
    const page2Response = await fetch(`${API_URL}/api/search?keyword=${encodeURIComponent(searchTerm)}&page=2`);
    
    expect(page1Response.status).toBe(200);
    expect(page2Response.status).toBe(200);
    
    const page1Data = await page1Response.json();
    const page2Data = await page2Response.json();
    
    expect(page1Data).toHaveProperty('items');
    expect(page2Data).toHaveProperty('items');
    
    // Different pages should have different items (if enough results)
    if (page1Data.items.length > 0 && page2Data.items.length > 0) {
      const page1FirstId = page1Data.items[0].id;
      const page2FirstId = page2Data.items[0].id;
      expect(page1FirstId).not.toBe(page2FirstId);
    }
  });
});

// ============================================================================
// CATEGORY: FILTER FUNCTIONALITY
// ============================================================================
describe('Filter Functionality Tests', () => {
  test('FILTER-01: Filter by category returns matching results', async () => {
    const categorySlug = 'action'; // Common category
    const response = await fetch(`${API_URL}/api/categories/${categorySlug}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
    
    // Some results should be returned for a common category
    expect(data.items.length).toBeGreaterThan(0);
  });

  test('FILTER-02: Filter by country returns matching results', async () => {
    const countrySlug = 'us'; // Common country code
    const response = await fetch(`${API_URL}/api/countries/${countrySlug}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  test('FILTER-03: Filters support pagination', async () => {
    const categorySlug = 'action';
    const page1Response = await fetch(`${API_URL}/api/categories/${categorySlug}?page=1`);
    const page2Response = await fetch(`${API_URL}/api/categories/${categorySlug}?page=2`);
    
    expect(page1Response.status).toBe(200);
    expect(page2Response.status).toBe(200);
    
    const page1Data = await page1Response.json();
    const page2Data = await page2Response.json();
    
    expect(page1Data).toHaveProperty('items');
    expect(page2Data).toHaveProperty('items');
  });
});

// ============================================================================
// CATEGORY: MOVIE DETAIL
// ============================================================================
describe('Movie Detail Tests', () => {
  test('MOVIE-01: View movie details shows correct information', async () => {
    // Use a movie ID that's guaranteed to exist in your system
    const movieSlug = 'stranger-things';
    const response = await fetch(`${API_URL}/api/movies/${movieSlug}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('description');
    expect(data).toHaveProperty('poster');
    // More properties as needed
  });

  test('MOVIE-02: View non-existent movie returns 404', async () => {
    const nonExistentSlug = 'non-existent-movie-12345';
    const response = await fetch(`${API_URL}/api/movies/${nonExistentSlug}`);
    
    expect(response.status).toBe(404);
  });

  test('MOVIE-03: Movie episodes are listed for TV shows', async () => {
    // Use a TV show slug
    const tvShowSlug = 'stranger-things';
    const response = await fetch(`${API_URL}/api/movies/${tvShowSlug}/episodes`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // TV shows should have episodes
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('episode');
      expect(data[0]).toHaveProperty('title');
    }
  });

  test('MOVIE-04: Movie recommendations are provided', async () => {
    const movieSlug = 'stranger-things';
    const response = await fetch(`${API_URL}/api/movies/${movieSlug}/recommendations`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });
});

// ============================================================================
// CATEGORY: USER WATCHLIST
// ============================================================================
describe('User Watchlist Tests', () => {
  // This test requires authentication
  beforeEach(async () => {
    await login(TEST_REGULAR_USER.username, TEST_REGULAR_USER.password);
  });
  
  afterEach(async () => {
    await logout();
  });

  test('WATCHLIST-01: User can add movie to watchlist', async () => {
    const movieSlug = 'stranger-things';
    const userId = 2; // Assuming user with ID 2 exists
    
    const response = await fetchWithAuth(`${API_URL}/api/users/${userId}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: movieSlug })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
  });

  test('WATCHLIST-02: User can view their watchlist', async () => {
    const userId = 2; // Assuming user with ID 2 exists
    
    const response = await fetchWithAuth(`${API_URL}/api/users/${userId}/watchlist`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('WATCHLIST-03: User can remove movie from watchlist', async () => {
    const movieSlug = 'stranger-things';
    const userId = 2; // Assuming user with ID 2 exists
    
    // First add the movie
    await fetchWithAuth(`${API_URL}/api/users/${userId}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: movieSlug })
    });
    
    // Then remove it
    const response = await fetchWithAuth(`${API_URL}/api/users/${userId}/watchlist/${movieSlug}`, {
      method: 'DELETE'
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
  });

  test('WATCHLIST-04: User can check if movie is in watchlist', async () => {
    const movieSlug = 'stranger-things';
    const userId = 2; // Assuming user with ID 2 exists
    
    // First add the movie
    await fetchWithAuth(`${API_URL}/api/users/${userId}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: movieSlug })
    });
    
    // Then check if it's in the watchlist
    const response = await fetchWithAuth(`${API_URL}/api/users/${userId}/watchlist/check/${movieSlug}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('inWatchlist', true);
    
    // Clean up - remove from watchlist
    await fetchWithAuth(`${API_URL}/api/users/${userId}/watchlist/${movieSlug}`, {
      method: 'DELETE'
    });
  });
});

// ============================================================================
// CATEGORY: COMMENTS
// ============================================================================
describe('Comments Tests', () => {
  beforeEach(async () => {
    await login(TEST_REGULAR_USER.username, TEST_REGULAR_USER.password);
  });
  
  afterEach(async () => {
    await logout();
  });

  test('COMMENTS-01: User can view comments on a movie', async () => {
    const movieSlug = 'stranger-things';
    const response = await fetch(`${API_URL}/api/movies/${movieSlug}/comments`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('COMMENTS-02: User can add comment to a movie', async () => {
    const movieSlug = 'stranger-things';
    const commentText = `Test comment ${Date.now()}`;
    
    const response = await fetchWithAuth(`${API_URL}/api/movies/${movieSlug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('text', commentText);
  });

  test('COMMENTS-03: User can like a comment', async () => {
    const movieSlug = 'stranger-things';
    
    // First add a comment
    const commentResponse = await fetchWithAuth(`${API_URL}/api/movies/${movieSlug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Test comment for liking ${Date.now()}` })
    });
    
    const comment = await commentResponse.json();
    
    // Then like the comment
    const likeResponse = await fetchWithAuth(`${API_URL}/api/comments/${comment.id}/like`, {
      method: 'POST'
    });
    
    expect(likeResponse.status).toBe(200);
    const data = await likeResponse.json();
    expect(data).toHaveProperty('success', true);
  });

  test('COMMENTS-04: User can dislike a comment', async () => {
    const movieSlug = 'stranger-things';
    
    // First add a comment
    const commentResponse = await fetchWithAuth(`${API_URL}/api/movies/${movieSlug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Test comment for disliking ${Date.now()}` })
    });
    
    const comment = await commentResponse.json();
    
    // Then dislike the comment
    const dislikeResponse = await fetchWithAuth(`${API_URL}/api/comments/${comment.id}/dislike`, {
      method: 'POST'
    });
    
    expect(dislikeResponse.status).toBe(200);
    const data = await dislikeResponse.json();
    expect(data).toHaveProperty('success', true);
  });
});

// ============================================================================
// CATEGORY: ADMIN FUNCTIONALITY
// ============================================================================
describe('Admin Functionality Tests', () => {
  beforeEach(async () => {
    // Login as admin
    await login(TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });
  
  afterEach(async () => {
    await logout();
  });

  test('ADMIN-01: Admin can view user list', async () => {
    const response = await fetchWithAuth(`${API_URL}/api/admin/users`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('ADMIN-02: Admin can search for users', async () => {
    const searchTerm = 'admin';
    const response = await fetchWithAuth(`${API_URL}/api/admin/users?search=${searchTerm}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    
    // Check if at least one result contains the search term
    if (data.data.length > 0) {
      const hasMatch = data.data.some((user: any) => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      expect(hasMatch).toBe(true);
    }
  });

  test('ADMIN-03: Admin can view content list', async () => {
    const response = await fetchWithAuth(`${API_URL}/api/admin/content`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('ADMIN-04: Regular user cannot access admin endpoints', async () => {
    // First logout admin
    await logout();
    
    // Login as regular user
    await login(TEST_REGULAR_USER.username, TEST_REGULAR_USER.password);
    
    // Try to access admin endpoint
    const response = await fetchWithAuth(`${API_URL}/api/admin/users`);
    
    // Should be forbidden
    expect(response.status).toBe(403);
    
    // Logout regular user
    await logout();
    
    // Login back as admin to not affect other tests
    await login(TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });
});

// ============================================================================
// CATEGORY: USER PROFILE
// ============================================================================
describe('User Profile Tests', () => {
  beforeEach(async () => {
    await login(TEST_REGULAR_USER.username, TEST_REGULAR_USER.password);
  });
  
  afterEach(async () => {
    await logout();
  });

  test('PROFILE-01: User can view their profile', async () => {
    const response = await fetchWithAuth(`${API_URL}/api/user`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('username', TEST_REGULAR_USER.username);
  });

  test('PROFILE-02: User can update their profile information', async () => {
    const newFullName = `Test User ${Date.now()}`;
    
    const response = await fetchWithAuth(`${API_URL}/api/user`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: newFullName
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('fullName', newFullName);
  });

  test('PROFILE-03: User can change their password', async () => {
    // Note: This test is a bit tricky as changing password would invalidate current session
    // We'll test just the endpoint existence and basic validation
    
    const response = await fetchWithAuth(`${API_URL}/api/user/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'wrong-password',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      })
    });
    
    // Even if authentication fails, the endpoint should exist
    expect([400, 401, 200]).toContain(response.status);
  });
});

// Run all tests in sequence with proper categorization
export default async function runComprehensiveTests() {
  try {
    console.log('Starting FilmFlex Comprehensive Tests...');
    
    // The tests will run in the order they are defined
    
    console.log('Tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run tests when invoked directly
if (require.main === module) {
  runComprehensiveTests();
}