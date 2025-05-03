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

describe('Filter Functionality Tests', () => {
  // Test Case: Filter movies by genre/category
  it('should filter movies by genre/category', async () => {
    // Using a known category: "Hành động" (Action)
    const response = await request(app)
      .get('/api/categories/hanh-dong')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    
    // There should be some action movies in the database
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Verify pagination information is provided
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.totalItems).toBeGreaterThan(0);
  });
  
  // Test Case: Filter movies by country
  it('should filter movies by country', async () => {
    // Using a known country: "Trung Quốc" (China)
    const response = await request(app)
      .get('/api/countries/trung-quoc')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    
    // There should be some Chinese movies in the database
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Verify pagination information is provided
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.totalItems).toBeGreaterThan(0);
  });
  
  // Test Case: Invalid or non-existent category
  it('should handle non-existent category gracefully', async () => {
    const response = await request(app)
      .get('/api/categories/non-existent-category')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    
    // There should be no movies for a non-existent category
    expect(response.body.items.length).toBe(0);
    
    // Verify pagination information is provided
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.totalItems).toBe(0);
  });
  
  // Test Case: Invalid or non-existent country
  it('should handle non-existent country gracefully', async () => {
    const response = await request(app)
      .get('/api/countries/non-existent-country')
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    
    // There should be no movies for a non-existent country
    expect(response.body.items.length).toBe(0);
    
    // Verify pagination information is provided
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.totalItems).toBe(0);
  });
  
  // Test Case: Pagination for filtered results
  it('should paginate filtered results correctly', async () => {
    // First page of action movies
    const firstPageResponse = await request(app)
      .get('/api/categories/hanh-dong?page=1&limit=10')
      .expect(200);
    
    // Second page of action movies
    const secondPageResponse = await request(app)
      .get('/api/categories/hanh-dong?page=2&limit=10')
      .expect(200);
    
    expect(firstPageResponse.body.status).toBe(true);
    expect(secondPageResponse.body.status).toBe(true);
    
    // Both pages should have items
    expect(firstPageResponse.body.items.length).toBeGreaterThan(0);
    expect(secondPageResponse.body.items.length).toBeGreaterThan(0);
    
    // Items on page 1 and page 2 should be different
    const firstPageIds = firstPageResponse.body.items.map((item: any) => item._id);
    const secondPageIds = secondPageResponse.body.items.map((item: any) => item._id);
    
    // No items should appear on both pages
    const overlappingIds = firstPageIds.filter((id: string) => secondPageIds.includes(id));
    expect(overlappingIds.length).toBe(0);
    
    // Pagination data should be consistent
    expect(firstPageResponse.body.pagination.currentPage).toBe(1);
    expect(secondPageResponse.body.pagination.currentPage).toBe(2);
    expect(firstPageResponse.body.pagination.totalItems).toBe(secondPageResponse.body.pagination.totalItems);
  });
});