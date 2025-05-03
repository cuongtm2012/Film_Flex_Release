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

describe('Search API', () => {
  it('should return results for search with diacritical marks', async () => {
    const response = await request(app)
      .get('/api/search?q=sư thành sơn hải')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    
    // We should have at least one result for this search
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Check that the search result includes the expected movie
    const hasExpectedMovie = response.body.items.some((movie: any) => 
      movie.slug === 'su-thanh-son-hai'
    );
    expect(hasExpectedMovie).toBe(true);
  });
  
  it('should handle empty search terms', async () => {
    const response = await request(app)
      .get('/api/search?q=')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toEqual([]);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.totalItems).toBe(0);
  });
  
  it('should handle search with trailing spaces', async () => {
    const response = await request(app)
      .get('/api/search?q=sư thành sơn hải  ')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
  });
});

describe('Search Suggestions API', () => {
  it('should return suggestions for partial search terms', async () => {
    const response = await request(app)
      .get('/api/search/suggestions?q=sư thành')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
  });
  
  it('should handle empty suggestion queries', async () => {
    const response = await request(app)
      .get('/api/search/suggestions?q=')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toEqual([]);
  });
});