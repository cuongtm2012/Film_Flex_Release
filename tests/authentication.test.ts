import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes.js';

let app: express.Express;
let server: any;
const testUsername = `test_user_${Date.now()}`;
const testPassword = 'Test@123456';
let authCookie: string;

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

describe('Authentication Functionality Tests', () => {
  // Test Case: Register a new user
  it('should register a new user successfully', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        username: testUsername,
        password: testPassword,
        email: `${testUsername}@example.com`,
        fullName: 'Test User'
      })
      .expect(201);
    
    expect(response.body.id).toBeDefined();
    expect(response.body.username).toBe(testUsername);
    expect(response.body.role).toBe('user'); // Default role should be 'user'
    expect(response.body.status).toBe('active'); // Default status should be 'active'
  });
  
  // Test Case: Register with existing username
  it('should reject registration with existing username', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        username: testUsername,
        password: testPassword,
        email: `${testUsername}2@example.com`,
        fullName: 'Test User 2'
      })
      .expect(400);
    
    expect(response.body.status).toBe(false);
    expect(response.body.message).toBeDefined();
  });
  
  // Test Case: Login with valid credentials
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        username: testUsername,
        password: testPassword
      })
      .expect(200);
    
    expect(response.body.id).toBeDefined();
    expect(response.body.username).toBe(testUsername);
    
    // Store the auth cookie for subsequent requests
    authCookie = response.headers['set-cookie'][0];
  });
  
  // Test Case: Login with invalid credentials
  it('should reject login with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        username: testUsername,
        password: 'wrong_password'
      })
      .expect(401);
    
    expect(response.body.status).toBe(false);
    expect(response.body.message).toBeDefined();
  });
  
  // Test Case: Get current user info when authenticated
  it('should return user info when authenticated', async () => {
    const response = await request(app)
      .get('/api/user')
      .set('Cookie', authCookie)
      .expect(200);
    
    expect(response.body.id).toBeDefined();
    expect(response.body.username).toBe(testUsername);
  });
  
  // Test Case: Get current user info when not authenticated
  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/user')
      .expect(401);
    
    expect(response.body.message).toBe('Not authenticated');
  });
  
  // Test Case: Logout
  it('should logout successfully', async () => {
    const response = await request(app)
      .post('/api/logout')
      .set('Cookie', authCookie)
      .expect(200);
    
    // After logout, user endpoint should return 401
    const userResponse = await request(app)
      .get('/api/user')
      .set('Cookie', authCookie)
      .expect(401);
    
    expect(userResponse.body.message).toBe('Not authenticated');
  });
});