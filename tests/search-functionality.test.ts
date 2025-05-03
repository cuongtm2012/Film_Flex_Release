import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes.js';

let app: express.Express;
let server: any;

beforeAll(async () => {
  app = express();
  // Middleware
  app.use(express.json());
  
  // Routes
  server = await registerRoutes(app);
});

afterAll((done) => {
  if (server && server.close) {
    server.close(done);
  } else {
    done();
  }
});

describe('Search Functionality Tests', () => {
  // Test Case: Search movies with a valid keyword
  it('should return results for search with a valid keyword', async () => {
    const response = await request(app)
      .get('/api/search?q=sư thành sơn hải')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Check that the search result includes the expected movie
    const hasExpectedMovie = response.body.items.some((movie: any) => 
      movie.slug === 'su-thanh-son-hai'
    );
    expect(hasExpectedMovie).toBe(true);
  });
  
  // Test Case: Search movies with a non-existent keyword
  it('should handle non-existent keywords with empty results', async () => {
    const response = await request(app)
      .get('/api/search?q=nonexistentmovietitle12345')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBe(0);
  });
  
  // Test Case: Search movies with special characters or whitespace
  it('should handle special characters and trailing whitespace properly', async () => {
    const response = await request(app)
      .get('/api/search?q=sư thành sơn hải  ')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    
    // Results should match the clean version of the query
    const hasExpectedMovie = response.body.items.some((movie: any) => 
      movie.slug === 'su-thanh-son-hai'
    );
    expect(hasExpectedMovie).toBe(true);
  });
  
  // Test Case: Search suggestions
  it('should return suggestions for partial search terms', async () => {
    const response = await request(app)
      .get('/api/search/suggestions?q=sư thành')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Check that suggestions include expected movie
    const hasExpectedMovie = response.body.items.some((movie: any) => 
      movie.slug === 'su-thanh-son-hai'
    );
    expect(hasExpectedMovie).toBe(true);
  });
  
  // Test Case: Empty search terms
  it('should handle empty search terms', async () => {
    const response = await request(app)
      .get('/api/search?q=')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toEqual([]);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.totalItems).toBe(0);
  });
});