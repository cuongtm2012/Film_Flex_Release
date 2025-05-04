import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Test user credentials
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test123!',
};

const adminUser = {
  username: 'admin',
  password: 'Cuongtm2012$',
};

let authCookie = '';

// Utility function for sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('FilmFlex Comprehensive Tests', () => {
  // Authentication Tests
  describe('Authentication', () => {
    let userId: number;

    test('Register new user', async () => {
      try {
        // First try to delete if exists
        try {
          await axiosInstance.post('/api/users/delete-test-user', { username: testUser.username });
        } catch (error) {
          // Ignore errors here
        }

        const response = await axiosInstance.post('/api/users/register', testUser);
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data.username).toBe(testUser.username);
        userId = response.data.id;
      } catch (error: any) {
        console.error('Register error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Login with user credentials', async () => {
      try {
        const response = await axiosInstance.post('/api/login', {
          username: testUser.username,
          password: testUser.password,
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data.username).toBe(testUser.username);
        
        // Save cookies for future requests
        if (response.headers['set-cookie']) {
          authCookie = response.headers['set-cookie'][0];
        }
      } catch (error: any) {
        console.error('Login error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Get current user info', async () => {
      try {
        const response = await axiosInstance.get('/api/user', {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data.username).toBe(testUser.username);
      } catch (error: any) {
        console.error('Get user error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Logout user', async () => {
      try {
        const response = await axiosInstance.post('/api/logout', {}, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        
        // Clear cookie
        authCookie = '';
      } catch (error: any) {
        console.error('Logout error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Login as admin', async () => {
      try {
        const response = await axiosInstance.post('/api/login', adminUser);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data.username).toBe(adminUser.username);
        expect(response.data.role).toBe('admin');
        
        // Save cookies for future requests
        if (response.headers['set-cookie']) {
          authCookie = response.headers['set-cookie'][0];
        }
      } catch (error: any) {
        console.error('Admin login error:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  // Movies API Tests
  describe('Movies API', () => {
    test('Fetch movie list', async () => {
      try {
        const response = await axiosInstance.get('/api/movies');
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('items');
        expect(response.data.items).toBeInstanceOf(Array);
        expect(response.data.items.length).toBeGreaterThan(0);
      } catch (error: any) {
        console.error('Fetch movies error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Fetch movie details', async () => {
      try {
        // First get a movie slug from the list
        const moviesResponse = await axiosInstance.get('/api/movies');
        const firstMovieSlug = moviesResponse.data.items[0].slug;
        
        const response = await axiosInstance.get(`/api/movies/${firstMovieSlug}`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('title');
        expect(response.data).toHaveProperty('slug');
        expect(response.data.slug).toBe(firstMovieSlug);
      } catch (error: any) {
        console.error('Fetch movie details error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Search for movies', async () => {
      try {
        const searchTerm = 'stranger';
        const response = await axiosInstance.get(`/api/search?keyword=${searchTerm}`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('items');
        expect(response.data.items).toBeInstanceOf(Array);
        
        // Check that search results are relevant
        if (response.data.items.length > 0) {
          const titleContainsSearchTerm = response.data.items.some(
            (movie: any) => movie.title.toLowerCase().includes(searchTerm)
          );
          expect(titleContainsSearchTerm).toBe(true);
        }
      } catch (error: any) {
        console.error('Search movies error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Fetch movies by category', async () => {
      try {
        const categorySlug = 'hanh-dong'; // Action category
        const response = await axiosInstance.get(`/api/categories/${categorySlug}`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('items');
        expect(response.data.items).toBeInstanceOf(Array);
        expect(response.data.items.length).toBeGreaterThan(0);
      } catch (error: any) {
        console.error('Fetch by category error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Fetch movie episodes', async () => {
      try {
        // Get a TV show (likely to have episodes)
        const moviesResponse = await axiosInstance.get('/api/movies');
        // Find a TV show in the first few items
        let tvShow = null;
        for (const movie of moviesResponse.data.items.slice(0, 10)) {
          if (movie.tmdb?.type === 'tv') {
            tvShow = movie;
            break;
          }
        }
        
        if (tvShow) {
          const response = await axiosInstance.get(`/api/movies/${tvShow.slug}/episodes`);
          expect(response.status).toBe(200);
          expect(response.data).toBeInstanceOf(Array);
          // Not all shows might have episodes in our database
          if (response.data.length > 0) {
            expect(response.data[0]).toHaveProperty('name');
            expect(response.data[0]).toHaveProperty('episode');
          }
        } else {
          console.warn('No TV shows found to test episodes API');
        }
      } catch (error: any) {
        console.error('Fetch episodes error:', error.response?.data || error.message);
        throw error;
      }
    });
    
    test('Fetch movie recommendations', async () => {
      try {
        // First get a movie slug from the list
        const moviesResponse = await axiosInstance.get('/api/movies');
        const firstMovieSlug = moviesResponse.data.items[0].slug;
        
        const response = await axiosInstance.get(`/api/movies/${firstMovieSlug}/recommendations`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('items');
        expect(response.data.items).toBeInstanceOf(Array);
      } catch (error: any) {
        console.error('Fetch recommendations error:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  // User Watchlist Tests
  describe('User Watchlist', () => {
    let userId: number;
    let movieSlug: string;

    beforeAll(async () => {
      // Login as test user
      try {
        const loginResponse = await axiosInstance.post('/api/login', {
          username: testUser.username,
          password: testUser.password,
        });
        userId = loginResponse.data.id;
        
        // Save cookies for future requests
        if (loginResponse.headers['set-cookie']) {
          authCookie = loginResponse.headers['set-cookie'][0];
        }
        
        // Get a movie to add to watchlist
        const moviesResponse = await axiosInstance.get('/api/movies');
        movieSlug = moviesResponse.data.items[0].slug;
      } catch (error: any) {
        console.error('Setup error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Add movie to watchlist', async () => {
      try {
        const response = await axiosInstance.post(`/api/users/${userId}/watchlist`, {
          movieSlug: movieSlug
        }, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(201);
      } catch (error: any) {
        console.error('Add to watchlist error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Check if movie is in watchlist', async () => {
      try {
        const response = await axiosInstance.get(`/api/users/${userId}/watchlist/check/${movieSlug}`, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('inWatchlist');
        expect(response.data.inWatchlist).toBe(true);
      } catch (error: any) {
        console.error('Check watchlist error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Get user watchlist', async () => {
      try {
        const response = await axiosInstance.get(`/api/users/${userId}/watchlist`, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data.length).toBeGreaterThan(0);
        
        // Check if our added movie is in the watchlist
        const foundMovie = response.data.find((item: any) => item.slug === movieSlug);
        expect(foundMovie).toBeTruthy();
      } catch (error: any) {
        console.error('Get watchlist error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Remove movie from watchlist', async () => {
      try {
        const response = await axiosInstance.delete(`/api/users/${userId}/watchlist/${movieSlug}`, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        
        // Verify it was removed
        const checkResponse = await axiosInstance.get(`/api/users/${userId}/watchlist/check/${movieSlug}`, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(checkResponse.data.inWatchlist).toBe(false);
      } catch (error: any) {
        console.error('Remove from watchlist error:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  // Comments Tests
  describe('Comments', () => {
    let movieSlug: string;
    let commentId: number;

    beforeAll(async () => {
      // Make sure we're logged in as test user
      try {
        const loginResponse = await axiosInstance.post('/api/login', {
          username: testUser.username,
          password: testUser.password,
        });
        
        // Save cookies for future requests
        if (loginResponse.headers['set-cookie']) {
          authCookie = loginResponse.headers['set-cookie'][0];
        }
        
        // Get a movie to comment on
        const moviesResponse = await axiosInstance.get('/api/movies');
        movieSlug = moviesResponse.data.items[0].slug;
      } catch (error: any) {
        console.error('Setup error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Add comment to a movie', async () => {
      try {
        const commentText = `Test comment ${Date.now()}`;
        const response = await axiosInstance.post(`/api/movies/${movieSlug}/comments`, {
          text: commentText
        }, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data.text).toBe(commentText);
        commentId = response.data.id;
      } catch (error: any) {
        console.error('Add comment error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Get comments for a movie', async () => {
      try {
        const response = await axiosInstance.get(`/api/movies/${movieSlug}/comments`);
        expect(response.status).toBe(200);
        expect(response.data).toBeInstanceOf(Array);
        
        // Find our comment
        const foundComment = response.data.find((comment: any) => comment.id === commentId);
        expect(foundComment).toBeTruthy();
      } catch (error: any) {
        console.error('Get comments error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Like a comment', async () => {
      try {
        const response = await axiosInstance.post(`/api/comments/${commentId}/like`, {}, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('likes');
        expect(response.data.likes).toBeGreaterThan(0);
      } catch (error: any) {
        console.error('Like comment error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Dislike a comment', async () => {
      try {
        const response = await axiosInstance.post(`/api/comments/${commentId}/dislike`, {}, {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('dislikes');
        expect(response.data.dislikes).toBeGreaterThan(0);
      } catch (error: any) {
        console.error('Dislike comment error:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  // Admin-only features test
  describe('Admin Features', () => {
    beforeAll(async () => {
      // Login as admin
      try {
        const loginResponse = await axiosInstance.post('/api/login', adminUser);
        
        // Save cookies for future requests
        if (loginResponse.headers['set-cookie']) {
          authCookie = loginResponse.headers['set-cookie'][0];
        }
      } catch (error: any) {
        console.error('Admin login error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Access admin dashboard', async () => {
      try {
        const response = await axiosInstance.get('/api/admin/dashboard', {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('stats');
      } catch (error: any) {
        console.error('Admin dashboard error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Get user list (admin only)', async () => {
      try {
        const response = await axiosInstance.get('/api/admin/users', {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data.length).toBeGreaterThan(0);
      } catch (error: any) {
        console.error('Get users error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('Get system logs (admin only)', async () => {
      try {
        const response = await axiosInstance.get('/api/admin/logs', {
          headers: authCookie ? { Cookie: authCookie } : {},
        });
        expect(response.status).toBe(200);
        expect(response.data).toBeInstanceOf(Array);
      } catch (error: any) {
        console.error('Get logs error:', error.response?.data || error.message);
        throw error;
      }
    });
  });
});