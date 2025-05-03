import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes.js';

let app: express.Express;
let server: any;

// Test accounts for different roles
const adminCredentials = { username: 'admin', password: 'Cuongtm2012$' };
let adminCookie: string;

// User for testing moderator roles
const moderatorUsername = `test_mod_${Date.now()}`;
const moderatorPassword = 'Test@123456';
let moderatorCookie: string;

// User for testing content creator roles
const creatorUsername = `test_creator_${Date.now()}`;
const creatorPassword = 'Test@123456';
let creatorCookie: string;

// User for testing normal user roles
const userUsername = `test_user_${Date.now()}`;
const userPassword = 'Test@123456';
let userCookie: string;

beforeAll(async () => {
  app = express();
  // Middleware
  app.use(express.json());
  
  // Routes
  server = await registerRoutes(app);

  // Login as admin
  const adminLoginResponse = await request(app)
    .post('/api/login')
    .send(adminCredentials);
  
  adminCookie = adminLoginResponse.headers['set-cookie'][0];
  
  // Create test users with different roles
  // 1. Create a moderator
  const modResponse = await request(app)
    .post('/api/admin/users')
    .set('Cookie', adminCookie)
    .send({
      username: moderatorUsername,
      password: moderatorPassword,
      email: `${moderatorUsername}@example.com`,
      fullName: 'Test Moderator',
      role: 'moderator',
      status: 'active'
    });
  
  // Login as moderator
  const modLoginResponse = await request(app)
    .post('/api/login')
    .send({
      username: moderatorUsername,
      password: moderatorPassword
    });
  
  moderatorCookie = modLoginResponse.headers['set-cookie'][0];
  
  // 2. Create a content creator
  const creatorResponse = await request(app)
    .post('/api/admin/users')
    .set('Cookie', adminCookie)
    .send({
      username: creatorUsername,
      password: creatorPassword,
      email: `${creatorUsername}@example.com`,
      fullName: 'Test Creator',
      role: 'content_creator',
      status: 'active'
    });
  
  // Login as content creator
  const creatorLoginResponse = await request(app)
    .post('/api/login')
    .send({
      username: creatorUsername,
      password: creatorPassword
    });
  
  creatorCookie = creatorLoginResponse.headers['set-cookie'][0];
  
  // 3. Create a normal user
  const userResponse = await request(app)
    .post('/api/users/register')
    .send({
      username: userUsername,
      password: userPassword,
      email: `${userUsername}@example.com`,
      fullName: 'Test User'
    });
  
  // Login as normal user
  const userLoginResponse = await request(app)
    .post('/api/login')
    .send({
      username: userUsername,
      password: userPassword
    });
  
  userCookie = userLoginResponse.headers['set-cookie'][0];
});

afterAll((done) => {
  if (server && server.close) {
    server.close(done);
  } else {
    done();
  }
});

describe('User Roles and Permissions Tests', () => {
  // Test Case: Admin can access admin dashboard
  it('should allow admin to access admin dashboard', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', adminCookie)
      .expect(200);
    
    expect(response.body.status).toBe(true);
  });
  
  // Test Case: Admin can manage users
  it('should allow admin to view all users', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', adminCookie)
      .expect(200);
    
    expect(response.body.status).toBe(true);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
  });
  
  // Test Case: Admin can create a user
  it('should allow admin to create a new user', async () => {
    const newUsername = `new_user_${Date.now()}`;
    const response = await request(app)
      .post('/api/admin/users')
      .set('Cookie', adminCookie)
      .send({
        username: newUsername,
        password: 'Test@123456',
        email: `${newUsername}@example.com`,
        fullName: 'New Test User',
        role: 'user',
        status: 'active'
      })
      .expect(201);
    
    expect(response.body.status).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.username).toBe(newUsername);
  });
  
  // Test Case: Moderator permissions
  it('should allow moderator to access moderator features', async () => {
    const response = await request(app)
      .get('/api/moderator/dashboard')
      .set('Cookie', moderatorCookie)
      .expect(200);
    
    expect(response.body.status).toBe(true);
  });
  
  // Test Case: Moderator cannot access admin-only features
  it('should deny moderator access to admin-only features', async () => {
    const response = await request(app)
      .post('/api/admin/users')
      .set('Cookie', moderatorCookie)
      .send({
        username: `denied_user_${Date.now()}`,
        password: 'Test@123456',
        email: 'denied@example.com',
        fullName: 'Denied User',
        role: 'user',
        status: 'active'
      })
      .expect(403);
    
    expect(response.body.status).toBe(false);
    expect(response.body.message).toBeDefined();
  });
  
  // Test Case: Content creator permissions
  it('should allow content creator to manage their own content', async () => {
    const response = await request(app)
      .get('/api/creator/dashboard')
      .set('Cookie', creatorCookie)
      .expect(200);
    
    expect(response.body.status).toBe(true);
  });
  
  // Test Case: Normal user access restrictions
  it('should deny normal user access to admin dashboard', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', userCookie)
      .expect(403);
    
    expect(response.body.status).toBe(false);
    expect(response.body.message).toBeDefined();
  });
  
  // Test Case: Normal user can access user features
  it('should allow normal user to access user features', async () => {
    const response = await request(app)
      .get('/api/user')
      .set('Cookie', userCookie)
      .expect(200);
    
    expect(response.body.id).toBeDefined();
    expect(response.body.username).toBe(userUsername);
  });
});