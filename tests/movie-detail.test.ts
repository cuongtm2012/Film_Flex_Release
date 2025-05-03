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

describe('Movie Detail Functionality Tests', () => {
  // Test Case: Fetch details for a valid movie
  it('should fetch movie details for a valid slug', async () => {
    // Using a known movie slug
    const response = await request(app)
      .get('/api/movies/su-thanh-son-hai')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.item).toBeDefined();
    
    // Check that all essential movie details are present
    const movie = response.body.item;
    expect(movie.name).toBeDefined();
    expect(movie.slug).toBe('su-thanh-son-hai');
    expect(movie.description).toBeDefined();
    
    // Check for episode data if it's a series
    if (movie.type === 'tv') {
      expect(movie.episodes).toBeDefined();
      expect(Array.isArray(movie.episodes)).toBe(true);
    }
  });
  
  // Test Case: Fetch episodes for a valid series
  it('should fetch episodes for a valid TV series', async () => {
    // Using a known TV series slug
    const response = await request(app)
      .get('/api/movies/su-thanh-son-hai/episodes')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Check episode structure
    const firstEpisode = response.body.items[0];
    expect(firstEpisode.name).toBeDefined();
    expect(firstEpisode.slug).toBeDefined();
    expect(firstEpisode.link_embed).toBeDefined();
  });
  
  // Test Case: Fetch details for an invalid movie
  it('should handle invalid movie slugs gracefully', async () => {
    const response = await request(app)
      .get('/api/movies/non-existent-movie-slug')
      .expect(404);
    
    expect(response.body.status).toBe(false);
    expect(response.body.message).toBeDefined();
  });
  
  // Test Case: Fetch episodes for an invalid series
  it('should handle invalid series slugs for episodes request', async () => {
    const response = await request(app)
      .get('/api/movies/non-existent-movie-slug/episodes')
      .expect(404);
    
    expect(response.body.status).toBe(false);
    expect(response.body.message).toBeDefined();
  });
});