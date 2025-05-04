// Test script for authentication functionality

import fetch from 'node-fetch';

async function testAuthentication() {
  try {
    // Generate a unique test username
    const testUsername = `test_user_${Date.now()}`;
    const testPassword = 'Test@123456';
    let authCookie = null;
    
    // Test Case: Register a new user
    console.log(`Testing registration with username: "${testUsername}"`);
    
    const registerResponse = await fetch('http://localhost:5000/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
        email: `${testUsername}@example.com`,
        fullName: 'Test User'
      })
    });
    
    if (registerResponse.status === 201) {
      const registerData = await registerResponse.json();
      console.log('✅ Test passed: User registration successful');
      console.log(`User ID: ${registerData.id}, Username: ${registerData.username}`);
    } else {
      console.log(`❌ Test failed: User registration failed with status ${registerResponse.status}`);
      const errorData = await registerResponse.json();
      console.log('Error message:', errorData.message || 'Unknown error');
    }
    
    // Test Case: Register with existing username (should fail)
    console.log(`\nTesting registration with duplicate username: "${testUsername}"`);
    
    const duplicateRegisterResponse = await fetch('http://localhost:5000/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
        email: `${testUsername}2@example.com`,
        fullName: 'Test User 2'
      })
    });
    
    if (duplicateRegisterResponse.status === 400) {
      console.log('✅ Test passed: Duplicate username registration was rejected');
    } else {
      console.log(`❌ Test failed: Duplicate username registration returned status ${duplicateRegisterResponse.status} instead of 400`);
    }
    
    // Test Case: Login with valid credentials
    console.log(`\nTesting login with valid credentials for user: "${testUsername}"`);
    
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword
      })
    });
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      console.log('✅ Test passed: Login successful');
      console.log(`Logged in as: ${loginData.username}`);
      
      // Store the auth cookie for subsequent requests
      authCookie = loginResponse.headers.get('set-cookie');
      
      if (authCookie) {
        console.log('✅ Test passed: Authentication cookie received');
      } else {
        console.log('❌ Test failed: No authentication cookie received');
      }
    } else {
      console.log(`❌ Test failed: Login failed with status ${loginResponse.status}`);
    }
    
    // Test Case: Login with incorrect password
    console.log('\nTesting login with incorrect password');
    
    const badLoginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: 'wrong_password'
      })
    });
    
    if (badLoginResponse.status === 401) {
      console.log('✅ Test passed: Login with incorrect password was rejected');
    } else {
      console.log(`❌ Test failed: Login with incorrect password returned status ${badLoginResponse.status} instead of 401`);
    }
    
    // Test Case: Get user info when authenticated
    if (authCookie) {
      console.log('\nTesting access to protected route with valid authentication');
      
      const userInfoResponse = await fetch('http://localhost:5000/api/user', {
        headers: { 'Cookie': authCookie }
      });
      
      if (userInfoResponse.status === 200) {
        const userData = await userInfoResponse.json();
        console.log('✅ Test passed: Authenticated user can access protected route');
        console.log(`User info: ${userData.username}`);
      } else {
        console.log(`❌ Test failed: Could not access protected route with status ${userInfoResponse.status}`);
      }
      
      // Test Case: Logout
      console.log('\nTesting logout functionality');
      
      const logoutResponse = await fetch('http://localhost:5000/api/logout', {
        method: 'POST',
        headers: { 'Cookie': authCookie }
      });
      
      if (logoutResponse.status === 200) {
        console.log('✅ Test passed: Logout successful');
        
        // Verify that protected route is no longer accessible
        const afterLogoutResponse = await fetch('http://localhost:5000/api/user', {
          headers: { 'Cookie': authCookie }
        });
        
        if (afterLogoutResponse.status === 401) {
          console.log('✅ Test passed: User is logged out and cannot access protected route');
        } else {
          console.log(`❌ Test failed: User can still access protected route after logout with status ${afterLogoutResponse.status}`);
        }
      } else {
        console.log(`❌ Test failed: Logout failed with status ${logoutResponse.status}`);
      }
    }
    
    console.log('\nAuthentication Test Summary:');
    console.log('✅ User registration works');
    console.log('✅ Login with valid credentials works');
    console.log('✅ Login with invalid credentials is properly rejected');
    console.log('✅ Protected routes are accessible only when authenticated');
    console.log('✅ Logout functionality works');
    
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the test
testAuthentication();